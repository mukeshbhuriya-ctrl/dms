const weldJointService = require('../services/weldJoint.service.js');
const pdfGenerator = require('#utils/pdfGenerator');
const pdfGeneratorCD = require('#utils/pdfGeneratorCD');
const pdfGeneratorF = require('#utils/pdfGeneratorF');
const prisma = require('#prisma');
const { extractStageData } = require('../utils/weldJointData');
const { getCompanyInfo } = require('../utils/companyInfo');

/**
 * Generate Stage Report PDF API
 */
async function generateStageReport(req, res) {
    try {
        const { jointId, stage } = req.params;

        // Fetch Joint Details with Inspection Data reconstructed functionally
        const joint = await weldJointService.getWeldJointWithInspection(jointId);
        const companyInfo = await getCompanyInfo(req.user.company_id);

        if (!joint) {
            return res.status(404).json({ success: false, message: 'Weld Joint not found' });
        }

        const insp = joint.weld_joint_inspection || {};
        const plan = joint.weld_joint_plan || {};
        const job = plan.job || {};
        const jt = joint.joint_type ? joint.joint_type.toUpperCase() : 'A';

        // Data lookup key: individual key stored in JSON (a, b, c, d, f)
        const categoryKey = jt.toLowerCase();

        // PDF template group: determines which generator and stage template to use
        const jointTypeGroup = ['C', 'D'].includes(jt) ? 'cd' : (jt === 'F' ? 'f' : 'ab');

        // Dynamic stage list per category based on joint's boolean flags
        // Skipped stages (backchip/pwht/rt/pt = false) are excluded from PDF
        const getStagesForJoint = (catKey, j) => {
            if (catKey === 'c') {
                const stages = ['stage1'];
                if (j.back_chip_req) {
                    stages.push('stage2', 'stage3'); // S2=BC, S3=WV
                } else {
                    stages.push('stage2'); // S2=WV
                }
                if (j.pwht && j.rt) stages.push('stage7');
                if (j.pwht && j.pt) stages.push('stage8');
                return stages;
            }
            if (catKey === 'd') {
                const stages = ['stage1'];
                if (j.back_chip_req) {
                    // S2=BC, S3=NO, S4=NS, S5=Insp, S6=RF, S7=Pneumatic
                    stages.push('stage2', 'stage3', 'stage4', 'stage5', 'stage6', 'stage7');
                    if (j.pwht && j.rt) stages.push('stage8');
                    if (j.pwht && j.pt) stages.push('stage9');
                } else {
                    // S2=NO, S3=NS, S4=Insp, S5=RF, S6=Pneumatic
                    stages.push('stage2', 'stage3', 'stage4', 'stage5', 'stage6');
                    if (j.pwht && j.rt) stages.push('stage7');
                    if (j.pwht && j.pt) stages.push('stage8');
                }
                return stages;
            }
            if (catKey === 'f') {
                const stages = ['stage1', 'stage2'];
                if (j.pwht && j.rt) stages.push('stage3');
                if (j.pwht && j.pt) stages.push('stage4');
                return stages;
            }
            // A/B
            const stages = ['stage1'];
            if (j.back_chip_req) {
                stages.push('stage2', 'stage3'); // stage2=backchip, stage3=weld visual
            } else {
                stages.push('stage2'); // stage2=weld visual (backchip skipped)
            }
            if (j.rt) stages.push('stage4');
            if (j.pt) stages.push('stage5');
            if (j.pwht) stages.push('stage6', 'stage7');
            return stages;
        };

        if (stage === 'all') {
            const allStagesData = {};
            const stages = getStagesForJoint(categoryKey, joint);

            await Promise.all(stages.map(async (sKey) => {
                const sPrefix = sKey.replace('stage', 's');
                // Only include if status exists (meaning stage was started) or it's stage 1 (always)
                if (insp[`${sPrefix}_status`] || sKey === 'stage1') {
                    allStagesData[sKey] = await extractStageData(insp, plan, job, joint, sKey, categoryKey);
                }
            }));

            const dateTime = new Date().toISOString().replace(/:/g, '-').split('.')[0];
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Complete_Report_${joint.joint_no}_${dateTime}.pdf`);

            if (jointTypeGroup === 'cd') {
                pdfGeneratorCD.generateReport(allStagesData, res, companyInfo);
            } else if (jointTypeGroup === 'f') {
                pdfGeneratorF.generateReport(allStagesData, res, companyInfo);
            } else {
                pdfGenerator.generateCompleteReport(allStagesData, res, companyInfo);
            }
            return;
        }

        // Single Stage Report
        const reportData = await extractStageData(insp, plan, job, joint, stage, categoryKey);

        const dateTime = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${stage}_${joint.joint_no}_${dateTime}.pdf`);

        if (stage === 'stage1') {
            pdfGenerator.generateStage1Report(reportData, res, companyInfo);
        } else {
            // Fallback or generic for single download if needed
            pdfGenerator.generateCompleteReport({ [stage]: reportData }, res, companyInfo);
        }

    } catch (error) {
        console.error('Generate Stage Report Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error generating report' });
    }
}

async function getWeldJoints(req, res) {
    try {
        const company_id = req.user.company_id;
        const { page, limit, search, status, sortBy, sortOrder } = req.query;

        const result = await weldJointService.findAll(company_id, {
            page,
            limit,
            search,
            status,
            sortBy,
            sortOrder
        }, {
            userId: req.user.userid || req.user.id,
            roles: req.user.role
        });

        res.status(200).json({
            success: true,
            message: 'Weld Joints fetched successfully',
            data: result.data,
            meta: result.meta
        });
    } catch (error) {
        console.error('Get weld joints error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

async function updateStageStatus(req, res) {
    try {
        const result = await weldJointService.updateStatus(req.body);
        res.status(200).json({ success: true, message: 'Stage status updated successfully', data: result });
    } catch (error) {
        console.error('Update stage status error:', error);
        res.status(error.message === 'Missing required fields' || error.message === 'Invalid stage' ? 400 : 500).json({
            success: false,
            message: error.message || 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

async function reviewStageStatus(req, res) {
    try {
        const result = await weldJointService.reviewStatus(req.body);
        res.status(200).json({ success: true, message: 'Stage status reviewed successfully', data: result });
    } catch (error) {
        console.error('Review stage status error:', error);
        res.status(error.message === 'Missing required fields' || error.message === 'Invalid stage' ? 400 : 500).json({
            success: false,
            message: error.message || 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

async function getWeldJointPlans(req, res) {
    try {
        const company_id = req.user.company_id;
        const { page, limit, search, sortBy, sortOrder } = req.query;

        const result = await weldJointService.getWeldJointPlans(company_id, {
            page,
            limit,
            search,
            sortBy,
            sortOrder
        });

        res.status(200).json({
            success: true,
            message: 'Weld Joint Plans fetched successfully',
            data: result.data,
            meta: result.meta
        });
    } catch (error) {
        console.error('Get weld joint plans error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

module.exports = {
    getWeldJoints,
    updateStageStatus,
    reviewStageStatus,
    getWeldJointPlans,
    generateStageReport
};
