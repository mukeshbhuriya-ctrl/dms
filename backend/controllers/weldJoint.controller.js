const weldJointService = require('../services/weldJoint.service.js');
const pdfGenerator = require('#utils/pdfGenerator');
const pdfGeneratorCD = require('#utils/pdfGeneratorCD');
const pdfGeneratorF = require('#utils/pdfGeneratorF');
const prisma = require('#prisma');
const { extractStageData } = require('../utils/weldJointData');
const { getCompanyInfo } = require('../utils/companyInfo');
const WELD_STAGES_CONFIG = require('../config/weldStagesConfig');

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
        const getStagesForJoint = (jt, j) => {
            const config = WELD_STAGES_CONFIG[jt] || [];
            return config
                .filter(stage => {
                    if (!stage.condition) return true;
                    return !!j[stage.condition];
                })
                .map(stage => stage.id);
        };

        if (stage === 'all') {
            const allStagesData = {};
            const config = WELD_STAGES_CONFIG[jt] || [];
            
            await Promise.all(config.map(async (stageObj) => {
                const sKey = stageObj.id;
                const sPrefix = sKey.replace('stage', 's');
                const isRequired = !stageObj.condition || !!joint[stageObj.condition];
                const hasStatus = !!insp[`${sPrefix}_status`];

                if (isRequired || hasStatus || sKey === 'stage1') {
                    const sData = await extractStageData(insp, plan, job, joint, sKey, categoryKey);
                    allStagesData[sKey] = { ...sData, label: stageObj.label };
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
        const stageConfig = (WELD_STAGES_CONFIG[jt] || []).find(s => s.id === stage);
        const sData = await extractStageData(insp, plan, job, joint, stage, categoryKey);
        const reportData = { ...sData, label: stageConfig?.label };

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
        const { page, limit, search, status, sortBy, sortOrder, client, po, job, cat, msn } = req.query;
 
        const result = await weldJointService.findAll(company_id, {
            page,
            limit,
            search,
            status,
            sortBy,
            sortOrder,
            client,
            po,
            job,
            cat,
            msn
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

async function getStageConfig(req, res) {
    try {
        const config = weldJointService.getStageConfig();
        res.status(200).json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('Get stage config error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

async function getWeldJointPlans(req, res) {
    try {
        const company_id = req.user.company_id;
        const { page = 1, limit = 50, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

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

async function getWeldJointActiveFilters(req, res) {
    try {
        const company_id = req.user.company_id;
        const filters = await weldJointService.getActiveFilters(company_id);
        res.status(200).json({ success: true, data: filters });
    } catch (error) {
        console.error('Get weld joint filters error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = {
    getWeldJoints,
    getWeldJointActiveFilters,
    updateStageStatus,
    reviewStageStatus,
    getWeldJointPlans,
    generateStageReport,
    getStageConfig
};
