const prisma = require('#prisma');

class ApprovalCenterService {
    async getAllRequests(company_id) {
        if (!company_id) {
            throw new Error('Company ID is required');
        }

        const allRequests = [];

        // 1. Material Heat Chart (Offered/Approved/Rejected items)
        try {
            const mhcItems = await prisma.material_heat_chart_item.findMany({
                where: {
                    qc_status: { in: ['Pending', 'Approved', 'Rejected'] },
                    mhc: { company_id: company_id, status: { in: ['OFFERED', 'APPROVED', 'REJECTED'] } }
                },
                include: {
                    mhc: {
                        select: { report_no: true, id: true, updatedAt: true }
                    }
                }
            });

            mhcItems.forEach(item => {
                allRequests.push({
                    id: `mhc_${item.id}`,
                    module: 'Material Heat Chart',
                    reference_no: item.mhc.report_no || 'Unknown',
                    description: `Item ${item.item_no || ''} requires QC review`,
                    status: item.qc_status,
                    requested_at: item.mhc.updatedAt,
                    action_url: '/material-heat-chart',
                    action_params: { id: item.mhc.id }
                });
            });
        } catch (e) {
            console.error('Error fetching MHC requests:', e);
        }

        // 2. Weld Joint Stages (All active stages)
        try {
            const weldStages = await prisma.weld_joint_stage.findMany({
                where: {
                    status: { in: ['pending', 'approved', 'rejected'] },
                    is_active: true,
                    weld_joint: {
                        weld_joint_plan: { company_id: company_id }
                    }
                },
                include: {
                    weld_joint: {
                        include: {
                            weld_joint_plan: true
                        }
                    },
                    prod_eng: { select: { name: true } }
                }
            });

            weldStages.forEach(stage => {
                allRequests.push({
                    id: `weld_${stage.id}`,
                    module: 'Weld Joint',
                    reference_no: stage.weld_joint.joint_no || 'Unknown',
                    description: `Stage: ${stage.stage_name} submitted by ${stage.prod_eng?.name || 'Production'}`,
                    status: stage.status.charAt(0).toUpperCase() + stage.status.slice(1),
                    requested_at: stage.createdAt,
                    action_url: '/view-weldingjoints',
                    action_params: { joint_id: stage.weld_joint.id }
                });
            });
        } catch (e) {
            console.error('Error fetching Weld Joint requests:', e);
        }

        // 3. Document Transmission (Client review)
        try {
            const transmissions = await prisma.transmission.findMany({
                where: {
                    client_status: { in: ['Pending', 'Approved', 'Rejected', 'Commented'] },
                    company_id: company_id
                },
                include: {
                    po: { select: { po_number: true } }
                }
            });

            transmissions.forEach(trans => {
                allRequests.push({
                    id: `trans_${trans.id}`,
                    module: 'Transmission',
                    reference_no: trans.transmission_number || 'Unknown',
                    description: `Client review for PO ${trans.po?.po_number || 'Unknown'}`,
                    status: trans.client_status,
                    requested_at: trans.createdAt,
                    action_url: '/dtn/list',
                    action_params: {} 
                });
            });
        } catch (e) {
            console.error('Error fetching Transmission requests:', e);
        }

        // 4. Job QAP
        try {
            const qaps = await prisma.quality_assurance_plan.findMany({
                where: {
                    status: { in: ['Pending', 'Approved', 'Rejected'] },
                    company_id: company_id
                },
                include: {
                    job: { select: { job_number: true } }
                }
            });

            qaps.forEach(qap => {
                allRequests.push({
                    id: `qap_${qap.id}`,
                    module: 'Quality Assurance Plan',
                    reference_no: qap.report_no || 'Unknown',
                    description: `Review for Job ${qap.job?.job_number || 'Unknown'}`,
                    status: qap.status,
                    requested_at: qap.createdAt, 
                    action_url: '/create-qarp',
                    action_params: { id: qap.id }
                });
            });
        } catch (e) {
            console.error('Error fetching QAP requests:', e);
        }

        // 5. Non-Conformance Reports
        try {
            const ncrs = await prisma.ncr.findMany({
                where: {
                    company_id: company_id,
                    ncr_status: { not: 'draft' }
                }
            });

            ncrs.forEach(ncr => {
                // Determine a consolidated status for NCR
                let consolidatedStatus = 'Pending';
                if (ncr.ncr_status === 'CLOSED') consolidatedStatus = 'Approved';
                
                allRequests.push({
                    id: `ncr_${ncr.id}`,
                    module: 'Non-Conformance Report (NCR)',
                    reference_no: ncr.ncr_no || 'Unknown',
                    description: `Cross-functional reviews`,
                    status: consolidatedStatus,
                    requested_at: ncr.createdAt,
                    action_url: '/ncr-approval',
                    action_params: { id: ncr.id }
                });
            });
        } catch (e) {
            console.error('Error fetching NCR requests:', e);
        }

        // 6. Design Change Requests
        try {
            const dcrStatuses = await prisma.dcr_status.findMany({
                where: {
                    dcr: { company_id: company_id }
                },
                include: {
                    dcr: { select: { id: true, dcr_no: true } }
                }
            });

            dcrStatuses.forEach(status => {
                allRequests.push({
                    id: `dcr_${status.id}`,
                    module: 'Design Change Request (DCR)',
                    reference_no: status.dcr.dcr_no || 'Unknown',
                    description: `Engineering reviews`,
                    status: status.status || 'Pending',
                    requested_at: status.createdAt,
                    action_url: '/dcr-approval',
                    action_params: { id: status.dcr.id }
                });
            });
        } catch (e) {
            console.error('Error fetching DCR requests:', e);
        }
        
        // 7. Request for Quotation (RFQ)
        try {
            const rfqs = await prisma.rfq_register.findMany({
                where: {
                    client_status: { in: ['Under Review', 'Approved', 'Rejected'] },
                    company_id: company_id
                }
            });

            rfqs.forEach(rfq => {
                allRequests.push({
                    id: `rfq_${rfq.id}`,
                    module: 'Quotation (RFQ)',
                    reference_no: rfq.quotation_no || 'Unknown',
                    description: `Client quote review`,
                    status: rfq.client_status === 'Under Review' ? 'Pending' : rfq.client_status,
                    requested_at: rfq.updatedAt,
                    action_url: '/rfq',
                    action_params: {} 
                });
            });
        } catch (e) {
            console.error('Error fetching RFQ requests:', e);
        }

        // Sort by requested_at descending (newest first)
        allRequests.sort((a, b) => {
            return new Date(b.requested_at) - new Date(a.requested_at);
        });

        return allRequests;
    }
}

module.exports = new ApprovalCenterService();
