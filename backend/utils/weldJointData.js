const prisma = require('./prisma');

/**
 * Extracts and structures data for a specific stage of a welding joint.
 * 
 * @param {Object} insp - The weld_joint_inspection record.
 * @param {Object} plan - The weld_joint_plan record.
 * @param {Object} job - The job record associated with the plan.
 * @param {Object} joint - The weld_joint record.
 * @param {String} stageKey - The stage key (e.g., 'stage1').
 * @param {String} categoryKey - The category key ('ab' or 'cd').
 * @returns {Promise<Object>} Structured data for the PDF generator.
 */
const extractStageData = async (insp, plan, job, joint, stageKey, categoryKey) => {
    const sPrefix = stageKey.replace('stage', 's');
    const dataKey = `${sPrefix}_data`;
    const rawData = insp[dataKey];

    let stageData = {};
    if (rawData) {
        try {
            const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
            // Check nested structure: { ab: { s1: ... } } vs { s1: ... }
            if (parsed[categoryKey] && parsed[categoryKey][sPrefix]) {
                stageData = parsed[categoryKey][sPrefix];
            } else if (parsed[categoryKey]) {
                stageData = parsed[categoryKey]; // Fallback if direct under category
            } else {
                stageData = parsed; // Fallback if flat or legacy
            }
        } catch (e) {
            console.error(`Error parsing ${dataKey}:`, e);
        }
    }

    // Basic Information (Default from Plan/Job)
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
        inspAgency: 'TPIA',
        reportNo: `R/${plan.serial_no || '000'}/${joint.joint_no || '000'}/${sPrefix.replace('s', '')}`,
        jointNo: joint.joint_no || '-'
    };

    // Override Basic Info from data_json if available
    if (insp.data_json) {
        try {
            const rawBasic = typeof insp.data_json === 'string' ? JSON.parse(insp.data_json) : insp.data_json;
            const savedBasic = rawBasic?.[categoryKey] || {};
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
        } catch (e) {
            console.error("Error parsing data_json:", e);
        }
    }

    // Approval / Status Info from DB Columns
    let qcDate = '';
    if (insp[`${sPrefix}_approved_at`]) {
        qcDate = new Date(insp[`${sPrefix}_approved_at`]).toLocaleDateString();
    }

    let prodDate = '';
    if (insp[`${sPrefix}_submitted_at`]) {
        prodDate = new Date(insp[`${sPrefix}_submitted_at`]).toLocaleDateString();
    }

    // Fetch User Names if IDs are present
    let qcEngineerName = '';
    const qcEngId = insp[`${sPrefix}_qc_eng_id`];
    if (qcEngId) {
        try {
            const qcUser = await prisma.user.findUnique({ where: { id: qcEngId }, select: { name: true } });
            if (qcUser) qcEngineerName = qcUser.name;
        } catch (e) { console.error("Error fetching QC User", e); }
    }

    let productionEngineerName = stageData.productionEngineerName || '';
    const prodEngId = insp[`${sPrefix}_prod_eng_id`];
    if (!productionEngineerName && prodEngId) {
        try {
            const prodUser = await prisma.user.findUnique({ where: { id: prodEngId }, select: { name: true } });
            if (prodUser) productionEngineerName = prodUser.name;
        } catch (e) { console.error("Error fetching Prod User", e); }
    }

    return {
        ...basicInfo,
        stageKey,
        jointType: joint.joint_type, // Pass joint type for template selection
        categoryKey,

        // Common Data
        productionEngineerName,
        submissionDate: stageData.submissionDate || prodDate,
        qcEngineerName,
        qcDate,
        qcStatus: insp[`${sPrefix}_status`] || 'pending',

        // Stage 1 - A/B
        inspectionRows: stageData.inspectionRows || [],

        // Stage 1 - C/D Specifics
        materialIdMarks: stageData.materialIdMarks || '',
        nozzleNumber: stageData.nozzleNumber || '',
        tackWelder: stageData.tackWelder || '',
        visualInspection: stageData.visualInspection || '',
        lSeamRt: stageData.lSeamRt || '',
        nozzleSize: stageData.nozzleSize || '',
        totalLength: stageData.totalLength || '',
        date: stageData.date || '', // Date in C/D form

        // Stage 3 Specifics
        welderNo: stageData.welderNo || '',
        weldingProcess: stageData.weldingProcess || '',

        // Stage 4 Specifics
        ndtEngineerId: stageData.assignedNdtEngineerId || stageData.assignedQcEngineerId || '',
    };
};

module.exports = {
    extractStageData
};
