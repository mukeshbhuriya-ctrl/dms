const weldJointService = require('../services/weldJoint.service.js');
const pdfGenerator = require('#utils/pdfGenerator');
const pdfGeneratorCD = require('#utils/pdfGeneratorCD');
const prisma = require('#prisma');
const { extractStageData } = require('../utils/weldJointData');

/**
 * Generate Stage Report PDF API
 */
async function generateStageReport(req, res) {
    try {
        const { jointId, stage } = req.params;

        // Fetch Joint Details with Inspection Data
        const joint = await prisma.weld_joint.findUnique({
            where: { id: jointId },
            include: {
                weld_joint_plan: {
                    include: {
                        job: {
                            select: {
                                job_number: true,
                                project_id: true,
                                equipement_name: true,
                                tag_number: true,
                                code: true,
                                customer: { select: { customer_name: true } },
                                po: { select: { po_number: true } }
                            }
                        }
                    }
                },
                weld_joint_inspection: true
            }
        });

        if (!joint) {
            return res.status(404).json({ success: false, message: 'Weld Joint not found' });
        }

        const insp = joint.weld_joint_inspection || {};
        const plan = joint.weld_joint_plan || {};
        const job = plan.job || {};
        const categoryKey = (joint.joint_type === 'C' || joint.joint_type === 'D') ? 'cd' : 'ab';

        if (stage === 'all') {
            const allStagesData = {};
            // Determine relevant stages based on category? 
            // User requested "complete joint category" so typically A/B has 1-6, C/D has 1-8 etc.
            // We'll iterate 1-8 and check if data exists or status is not null.
            const stages = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6', 'stage7', 'stage8'];

            await Promise.all(stages.map(async (sKey) => {
                const sPrefix = sKey.replace('stage', 's');
                // Only include if status exists (meaning started) or if it's stage 1 (always)
                if (insp[`${sPrefix}_status`] || sKey === 'stage1') {
                    allStagesData[sKey] = await extractStageData(insp, plan, job, joint, sKey, categoryKey);
                }
            }));

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Complete_Report_${joint.joint_no}.pdf`);

            if (categoryKey === 'cd') {
                pdfGeneratorCD.generateReport(allStagesData, res);
            } else {
                pdfGenerator.generateCompleteReport(allStagesData, res);
            }
            return;
        }

        // Single Stage Report
        const reportData = await extractStageData(insp, plan, job, joint, stage, categoryKey);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${stage}_${joint.joint_no}.pdf`);

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
