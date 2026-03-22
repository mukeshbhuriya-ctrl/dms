const weldJointService = require('../services/weldJoint.service.js');
const pdfGenerator = require('#utils/pdfGenerator');
const pdfGeneratorCD = require('#utils/pdfGeneratorCD');
const pdfGeneratorF = require('#utils/pdfGeneratorF');
const prisma = require('#prisma');
const { extractStageData } = require('../utils/weldJointData');

/**
 * Generate Stage Report PDF API
 */
async function generateStageReport(req, res) {
    try {
        const { jointId, stage } = req.params;

        // Fetch Joint Details with Inspection Data reconstructed functionally
        const joint = await weldJointService.getWeldJointWithInspection(jointId);

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

        // Stage list per category: must match pdfGeneratorCD's stageOrder logic
        // C: stage1, 2, 7, 8 (no nozzle/set-up stages - skips 3-6)
        // D: all 8 stages
        // F: stage1-4
        // A/B: stage1-7 (no stage8)
        const stagesByCategory = {
            'c': ['stage1', 'stage2', 'stage7', 'stage8'],
            'd': ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6', 'stage7', 'stage8'],
            'f': ['stage1', 'stage2', 'stage3', 'stage4'],
            'a': ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6', 'stage7'],
            'b': ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6', 'stage7'],
        };

        if (stage === 'all') {
            const allStagesData = {};
            const stages = stagesByCategory[categoryKey] || stagesByCategory['a'];

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
                pdfGeneratorCD.generateReport(allStagesData, res);
            } else if (jointTypeGroup === 'f') {
                pdfGeneratorF.generateReport(allStagesData, res);
            } else {
                pdfGenerator.generateCompleteReport(allStagesData, res);
            }
            return;
        }

        // Single Stage Report
        const reportData = await extractStageData(insp, plan, job, joint, stage, categoryKey);

        const dateTime = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${stage}_${joint.joint_no}_${dateTime}.pdf`);

        if (stage === 'stage1') {
            pdfGenerator.generateStage1Report(reportData, res);
        } else {
            // Fallback or generic for single download if needed
            pdfGenerator.generateCompleteReport({ [stage]: reportData }, res);
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
