const weldJointService = require('../services/weldJoint.service.js');
const pdfGenerator = require('#utils/pdfGenerator');
const prisma = require('#prisma');

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

        let inspectionRows = [];
        let productionEngineerName = '';
        let submissionDate = '';
        let qcEngineerName = '';
        let qcDate = '';
        let qcStatus = '';

        const categoryKey = (joint.joint_type === 'C' || joint.joint_type === 'D') ? 'cd' : 'ab';

        let stageData = {};
        // Mapping stage to data field e.g. s1_data

        if (insp.s1_data) {
            try {
                const raw = typeof insp.s1_data === 'string' ? JSON.parse(insp.s1_data) : insp.s1_data;
                // Support nested { ab: { s1: ... } }
                if (raw[categoryKey] && raw[categoryKey].s1) {
                    stageData = raw[categoryKey].s1;
                } else if (raw[categoryKey]) {
                    stageData = raw[categoryKey]; // Legacy
                } else {
                    stageData = raw; // Legacy flat
                }
            } catch (e) { console.error("Parse s1_data error", e); }
        }

        if (stageData.inspectionRows) inspectionRows = stageData.inspectionRows;
        if (stageData.productionEngineerName) productionEngineerName = stageData.productionEngineerName;
        if (stageData.submissionDate) submissionDate = stageData.submissionDate;

        if (insp.s1_qc_eng_id) {
            const qcUser = await prisma.user.findUnique({ where: { id: insp.s1_qc_eng_id }, select: { name: true } });
            if (qcUser) qcEngineerName = qcUser.name;
        }

        if (insp.s1_approved_at) qcDate = new Date(insp.s1_approved_at).toLocaleDateString();
        qcStatus = insp.s1_status;

        let basicInfo = {
            msn: plan.serial_no?.toString() || '-',
            client: job.customer?.customer_name || '-',
            poNo: (job.po && job.po.po_number) ? job.po.po_number : (job.po_number || '-'),
            tagNo: job.tag_number || '-',
            equipment: job.equipement_name || '-',
            projectsId: job.project_id || '-',
            lindeDrgNo: plan.shreno_drg_no || '-',
            drgNo: plan.customer_drg_no || '-',
            code: job.code || '-',
            inspAgency: 'TPIA', // Default or fetch if available
            reportNo: `R/${plan.serial_no || '000'}/${joint.joint_no}/1`,
            jointNo: joint.joint_no
        };

        if (insp.data_json) {
            try {
                const rawBasic = typeof insp.data_json === 'string' ? JSON.parse(insp.data_json) : insp.data_json;
                const savedBasic = rawBasic?.[categoryKey] || {};
                // Override with saved data if available
                if (savedBasic.msn) basicInfo.msn = savedBasic.msn;
                if (savedBasic.client) basicInfo.client = savedBasic.client;
                if (savedBasic.poNo) basicInfo.poNo = savedBasic.poNo;
                if (savedBasic.tagNo) basicInfo.tagNo = savedBasic.tagNo;
                if (savedBasic.equipment) basicInfo.equipment = savedBasic.equipment;
                if (savedBasic.projectsId) basicInfo.projectsId = savedBasic.projectsId;
                if (savedBasic.lindeDrgNo) basicInfo.lindeDrgNo = savedBasic.lindeDrgNo;
                if (savedBasic.drgNo) basicInfo.drgNo = savedBasic.drgNo;
                if (savedBasic.code) basicInfo.code = savedBasic.code;
                if (savedBasic.inspAgency) basicInfo.inspAgency = savedBasic.inspAgency;
            } catch (e) { }
        }

        const reportData = {
            ...basicInfo,
            inspectionRows,
            productionEngineerName,
            submissionDate,
            qcEngineerName,
            qcDate,
            qcStatus
        };

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Stage1_${joint.joint_no}.pdf`);

        pdfGenerator.generateStage1Report(reportData, res);

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
