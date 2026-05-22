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
            
            // Refined lookup: handles sPrefix nested under categoryKey or 'cd'
            const catKeys = [categoryKey];
            if (['c', 'd'].includes(categoryKey)) catKeys.push('cd');
            
            let found = false;
            for (const ck of catKeys) {
                if (parsed[ck] && parsed[ck][sPrefix]) {
                    stageData = parsed[ck][sPrefix];
                    found = true;
                    break;
                }
            }

            if (!found) {
                if (parsed[categoryKey]) {
                    stageData = parsed[categoryKey];
                } else if (parsed['cd'] && ['c', 'd'].includes(categoryKey)) {
                    stageData = parsed['cd'];
                } else {
                    stageData = parsed;
                }
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
        reportNo: `SHR/${job.job_number || '000'}/${plan.serial_no || '000'}`,
        jointNo: joint.joint_no || '-'
    };

    // Override Basic Info from data_json if available
    if (insp.data_json) {
        try {
            const rawBasic = typeof insp.data_json === 'string' ? JSON.parse(insp.data_json) : insp.data_json;
            const savedBasic = rawBasic?.[categoryKey] || {};
            if (savedBasic.msn || savedBasic.msnNumber) basicInfo.msn = savedBasic.msn || savedBasic.msnNumber;
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
    const qcEngId = insp[`${sPrefix}_qc_engineer_id`];
    if (qcEngId) {
        try {
            const qcUser = await prisma.user.findUnique({ where: { id: qcEngId }, select: { name: true } });
            if (qcUser) qcEngineerName = qcUser.name;
        } catch (e) { console.error("Error fetching QC User", e); }
    }

    let productionEngineerName = stageData.productionEngineerName || '';
    const prodEngId = insp[`${sPrefix}_production_engineer_id`];
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

        // Stage 1 - A/B: inspection rows table
        inspectionRows: stageData.inspectionRows || [],

        // Stage 1 - C/D/F Specifics
        materialIdMarks: stageData.materialIdMarks || '',
        nozzleNumber: stageData.nozzleNumber || '',
        tackWelder: stageData.tackWelder || '',
        visualInspection: stageData.visualInspection || '',
        lSeamRt: stageData.lSeamRt || '',
        nozzleSize: stageData.nozzleSize || '',
        totalLength: stageData.totalLength || '',
        date: stageData.date || '',

        // Stage 2 - Welding Details (Back chip / Weld Visual)
        welderNumber: stageData.welderNumber || stageData.welderNo || '',
        overlayPt: stageData.overlayPt || '',

        // Stage 3 - A/B Weld Visual Inspection
        welderNo: stageData.welderNo || stageData.welderNumber || '',
        weldingProcess: stageData.weldingProcess || '',

        // Stage 3 - C/D Nozzle Opening
        openingSize: stageData.openingSize || '',
        orientation: stageData.orientation || '',
        elevation: stageData.elevation || '',
        edgePreparation: stageData.edgePreparation || '',

        // Stage 4 - C/D Nozzle Set-Up
        materialId: stageData.materialId || '',
        lSeamNdt: stageData.lSeamNdt || '',
        cleaning: stageData.cleaning || '',
        grooveAngle: stageData.grooveAngle || '',
        rootFace: stageData.rootFace || '',
        rootGap: stageData.rootGap || '',
        projection: stageData.projection || '',
        pcdHole: stageData.pcdHole || '',
        rfPad: stageData.rfPad || '',

        // Stage 5 - Inspection after full Welding
        filletSize: stageData.filletSize || '',

        // Stage 6 - RF Pad
        rfPadPneumatic: stageData.rfPadPneumatic || '',

        // Stage 7/8 - PWHT/NDT
        postRtStatus: stageData.postRtStatus || 'NA',
        postPtStatus: stageData.postPtStatus || 'NA',

        // NDT Engineer
        ndtEngineerId: stageData.assignedNdtEngineerId || stageData.assignedQcEngineerId || '',

        // Joint flags (from joint record directly)
        backChipReq: joint.back_chip_req || false,
        pwht: joint.pwht || false,
        rt: joint.rt || false,
        pt: joint.pt || false,
        rtStatus: stageData.rtStatus || '',
        rtRemark: stageData.rtRemark || '',
        rawData: stageData
    };
};

module.exports = {
    extractStageData
};
