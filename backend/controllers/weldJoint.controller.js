const weldJointService = require('../services/weldJoint.service.js');
const pdfGenerator = require('#utils/pdfGenerator');
const pdfGeneratorCD = require('#utils/pdfGeneratorCD');
const pdfGeneratorF = require('#utils/pdfGeneratorF');
const travelerPdfGenerator = require('../utils/travelerPdfGenerator');
const prisma = require('#prisma');
const Audit = require('#utils/audit.js');
const { extractStageData } = require('../utils/weldJointData');
const { getCompanyInfo } = require('../utils/companyInfo');
const WELD_STAGES_CONFIG = require('../config/weldStagesConfig');

/**
 * Generate Stage Report PDF API
 */
async function generateStageReport(req, res) {
    try {
        const { jointId, stage } = req.params;
        const customJointIds = req.query.jointIds ? req.query.jointIds.split(',') : null;

        let joints;
        if (customJointIds && customJointIds.length > 0) {
            joints = await weldJointService.getJointGroupByIds(customJointIds);
        } else {
            joints = await weldJointService.getJointGroupWithInspection(jointId);
        }

        const companyInfo = await getCompanyInfo(req.user.company_id);

        if (!joints || joints.length === 0) {
            return res.status(404).json({ success: false, message: 'Weld Joint not found' });
        }

        const targetJoint = customJointIds ? joints[0] : (joints.find(j => j.id === jointId) || joints[0]);
        const insp = targetJoint.weld_joint_inspection || {};
        const jt = targetJoint.joint_type ? targetJoint.joint_type.toUpperCase() : 'A';
        const categoryKey = jt.toLowerCase();
        const jointTypeGroup = ['C', 'D'].includes(jt) ? 'cd' : (jt === 'F' ? 'f' : 'ab');

        if (stage === 'all') {
            const allStagesData = {};
            const config = WELD_STAGES_CONFIG[jt] || [];
            
            await Promise.all(config.map(async (stageObj) => {
                if (stageObj.condition && !targetJoint[stageObj.condition]) return;

                const sKey = stageObj.id;
                const sPrefix = sKey.replace('stage', 's');
                const isApproved = insp[`${sPrefix}_status`] === 'approved';
                const isBaseStage = sKey === 'stage1';

                if (isApproved || isBaseStage) {
                    const stageDataArray = [];
                    for (const j of joints) {
                        const jInsp = j.weld_joint_inspection || {};
                        const jPlan = j.weld_joint_plan || {};
                        const jJob = jPlan.job || {};
                        const sData = await extractStageData(jInsp, jPlan, jJob, j, sKey, categoryKey);
                        stageDataArray.push(sData);
                    }
                    allStagesData[sKey] = { joints: stageDataArray, label: stageObj.label };
                }
            }));

            const dateTime = new Date().toISOString().replace(/:/g, '-').split('.')[0];
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Complete_Report_${targetJoint.joint_no}_${dateTime}.pdf`);

            if (jointTypeGroup === 'cd') {
                pdfGeneratorCD.generateReport(allStagesData, res, companyInfo);
            } else if (jointTypeGroup === 'f') {
                pdfGeneratorF.generateReport(allStagesData, res, companyInfo);
            } else {
                pdfGenerator.generateCompleteReport(allStagesData, res, companyInfo);
            }
            return;
        }

        const stageConfig = (WELD_STAGES_CONFIG[jt] || []).find(s => s.id === stage);
        const stageDataArray = [];
        for (const j of joints) {
            const jInsp = j.weld_joint_inspection || {};
            const jPlan = j.weld_joint_plan || {};
            const jJob = jPlan.job || {};
            const sData = await extractStageData(jInsp, jPlan, jJob, j, stage, categoryKey);
            stageDataArray.push(sData);
        }
        
        const reportData = { joints: stageDataArray, label: stageConfig?.label };

        const dateTime = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${stage}_${targetJoint.joint_no}_${dateTime}.pdf`);

        if (jointTypeGroup === 'cd') {
            pdfGeneratorCD.generateReport({ [stage]: reportData }, res, companyInfo);
        } else if (jointTypeGroup === 'f') {
            pdfGeneratorF.generateReport({ [stage]: reportData }, res, companyInfo);
        } else {
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
        const { 
            page, limit, search, status, sortBy, sortOrder, 
            client, po, job, cat, msn, columnFilters, weldPlanNo, date
        } = req.query;
 
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
            msn,
            columnFilters,
            weldPlanNo,
            date
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
        const { 
            page = 1, limit = 50, search = '', sortBy = 'createdAt', sortOrder = 'desc',
            columnFilters 
        } = req.query;

        const result = await weldJointService.getWeldJointPlans(company_id, {
            page,
            limit,
            search,
            sortBy,
            sortOrder,
            columnFilters
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

async function getCumulativeData(req, res) {
    try {
        const { jointId } = req.params;
        const joint = await weldJointService.getWeldJointWithInspection(jointId);

        if (!joint) {
            return res.status(404).json({ success: false, message: 'Weld Joint not found' });
        }

        const jt = joint.joint_type ? joint.joint_type.toUpperCase() : 'A';
        const config = WELD_STAGES_CONFIG[jt] || [];
        const insp = joint.weld_joint_inspection || {};

        // Build approved stages list
        const approvedStages = config
            .filter(stageObj => {
                // Skip if the stage requirement is disabled for this joint
                if (stageObj.condition && !joint[stageObj.condition]) return false;

                // Check condition (e.g. back_chip_req, pwht, rt, pt)
                const sPrefix = stageObj.id.replace('stage', 's');
                return insp[`${sPrefix}_status`] === 'approved' || stageObj.id === 'stage1';
            })
            .map(stageObj => ({
                id: stageObj.id,
                label: stageObj.label,
                component: stageObj.component
            }));

        res.status(200).json({
            success: true,
            data: {
                joint,
                approvedStages,
                category: jt
            }
        });
    } catch (error) {
        console.error('Get cumulative data error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

/**
 * Dedicated API to fetch standardized Report No
 */
async function getReportNo(req, res) {
    try {
        const { jointId } = req.params;
        const reportNo = await weldJointService.getReportNo(jointId);

        if (!reportNo) {
            return res.status(404).json({ success: false, message: 'Weld Joint not found' });
        }

        res.json({ success: true, reportNo });
    } catch (error) {
        console.error('Get Report No Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

/**
 * Get full activity trail for a weld joint
 */
async function getJointTrail(req, res) {
    try {
        const { jointId } = req.params;
        const trail = await weldJointService.getJointTrail(jointId);

        res.json({
            success: true,
            data: trail
        });
    } catch (error) {
        console.error('Get Joint Trail error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

async function togglePlanStatus(req, res) {
    try {
        const result = await weldJointService.togglePlanStatus(req.user.company_id, req.params.id);
        
        Audit.insert({
            req,
            company_id: req.user.company_id,
            user_id: req.user.userid || req.user.id,
            action: result.is_active ? 'activated' : 'deactivated',
            module: 'Weld Joint Plan',
            description: `${result.is_active ? 'Activated' : 'Deactivated'} Weld Joint Plan "${result.weld_plan_no || req.params.id}"`,
            metadata: { target_weld_joint_plan_id: result.id, is_active: result.is_active },
        });

        res.status(200).json({ 
            success: true, 
            message: `Weld Joint Plan ${result.is_active ? 'activated' : 'deactivated'} successfully`,
            data: result 
        });
    } catch (error) {
        console.error('Weld Joint Plan toggleStatus error:', error);
        const status = error.message.includes('not found') ? 404 : 400;
        res.status(status).json({ success: false, message: error.message || 'Internal server error' });
    }
}

async function archivePlan(req, res) {
    try {
        const result = await weldJointService.archivePlan(req.user.company_id, req.params.id);
        
        Audit.insert({
            req,
            company_id: req.user.company_id,
            user_id: req.user.userid || req.user.id,
            action: 'deleted',
            module: 'Weld Joint Plan',
            description: `Archived Weld Joint Plan "${result.weld_plan_no || req.params.id}"`,
            metadata: { target_weld_joint_plan_id: result.id },
        });

        res.status(200).json({ success: true, message: 'Weld Joint Plan archived successfully' });
    } catch (error) {
        console.error('Weld Joint Plan archive error:', error);
        const status = error.message.includes('not found') ? 404 : 400;
        res.status(status).json({ success: false, message: error.message || 'Internal server error' });
    }
}

async function getTravelerSummary(req, res) {
    try {
        const company_id = req.user.company_id;
        const result = await weldJointService.getTravelerSummary(company_id, req.query);

        res.status(200).json({
            success: true,
            message: 'Traveler summary fetched successfully',
            data: result.data,
            meta: result.meta
        });
    } catch (error) {
        console.error('Get traveler summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}

async function downloadTravelerSummaryPdf(req, res) {
    try {
        const company_id = req.user.company_id;
        
        // Fetch all data without pagination by setting a very high limit
        const queryParams = { ...req.query, limit: 10000, page: 1 };
        const result = await weldJointService.getTravelerSummary(company_id, queryParams);

        const data = {
            joints: result.data || []
        };

        const filename = `Traveler_Welding_NDE_Summary.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        travelerPdfGenerator.generatePDF(data, res);
    } catch (error) {
        console.error('Download traveler summary pdf error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }
}

const getQualityMetricsReport = async (req, res) => {
    try {
        const { company_id } = req.user;
        const { type, plan_id } = req.query; // type = 'FTR' or 'NFTR'

        let rejectedJointsWhere = {
            weld_joint_plan: { company_id }
        };
        if (plan_id) {
            rejectedJointsWhere.weld_joint_plan.id = plan_id;
        }
        rejectedJointsWhere.weld_joint_stages = {
            some: {
                OR: [
                    { status: 'rejected' },
                    { rejected_at: { not: null } }
                ]
            }
        };

        const rejectedJoints = await prisma.weld_joint.findMany({
            where: rejectedJointsWhere,
            select: { id: true }
        });
        const rejectedJointIds = rejectedJoints.map(j => j.id);

        let whereClause = { weld_joint: { weld_joint_plan: { company_id } } };
        
        if (plan_id) {
            whereClause.weld_joint.weld_joint_plan.id = plan_id;
        }

        if (type === 'FTR') {
            whereClause.weld_joint.id = { notIn: rejectedJointIds };
            whereClause.status = 'approved';
        } else if (type === 'NFTR') {
            whereClause.weld_joint.id = { in: rejectedJointIds };
        } else {
            return res.status(400).json({ success: false, message: 'Invalid report type' });
        }

        const stages = await prisma.weld_joint_stage.findMany({
            where: whereClause,
            include: {
                weld_joint: {
                    include: {
                        weld_joint_plan: { select: { weld_plan_no: true, job: { select: { job_number: true } } } }
                    }
                },
                production_engineer: { select: { name: true } },
                qc_engineer: { select: { name: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });

        const formattedData = stages.map(s => ({
            'Job No': s.weld_joint?.weld_joint_plan?.job?.job_number || '',
            'Plan No': s.weld_joint?.weld_joint_plan?.weld_plan_no || '',
            'Joint No': s.weld_joint?.joint_no || '',
            'Category': s.weld_joint?.joint_category || '',
            'Stage Name': s.stage_name,
            'Status': s.status,
            'Production Engineer': s.production_engineer?.name || '',
            'QC Engineer': s.qc_engineer?.name || '',
            'Submitted At': s.submitted_at,
            'Approved At': s.approved_at,
            'Rejected At': s.rejected_at,
            'Remarks': s.remarks || ''
        }));

        res.status(200).json({
            success: true,
            data: formattedData
        });
    } catch (error) {
        console.error('Error generating quality metrics report:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    getWeldJoints,
    getWeldJointActiveFilters,
    updateStageStatus,
    reviewStageStatus,
    getWeldJointPlans,
    generateStageReport,
    getStageConfig,
    getCumulativeData,
    getReportNo,
    getJointTrail,
    togglePlanStatus,
    archivePlan,
    getTravelerSummary,
    downloadTravelerSummaryPdf,
    getQualityMetricsReport
};
