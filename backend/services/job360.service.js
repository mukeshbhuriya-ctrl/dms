const prisma = require('#prisma');

class Job360Service {
    async getSnapshot(company_id, job_id) {
        // 1. Fetch Job Identity & Metadata
        const job = await prisma.job.findFirst({
            where: { id: job_id, company_id },
            include: {
                customer: true,
                customer_location: true,
                po: true
            }
        });

        if (!job) {
            throw new Error("Job not found or access denied.");
        }

        // We launch parallel queries for all modules related to this job.
        const [
            // DMS Documents
            singleDocs,
            groupDocs,
            // DTN
            dtnJobs,
            recentDtns,
            // WPJ
            weldJointsRaw,
            weldStages,
            weldPlans,
            // Exceptions
            ncrStatusRaw,
            dcrStatusRaw,
            // Marketing
            rfqsRaw,
            // Quality Metrics
            mhcRaw,
            qapRaw,
            hydroRaw,
            dishEndRaw,
            finalInspRaw,
            // NCR latest to show
            latestNcr,
            recentNcrs,
            recentDcrs,
            recentWeldPlans,
            // Quality Records
            mhcRecords,
            hydroRecords,
            dishEndRecords,
            finalInspRecords,
            qapRecords
        ] = await Promise.all([
            // DMS: Single Docs
            prisma.single_document.groupBy({
                by: ['status'],
                where: { job_id, company_id },
                _count: { _all: true }
            }),
            // DMS: Group Docs (via job_group)
            prisma.group_document.groupBy({
                by: ['status'],
                where: { 
                    company_id,
                    group: { job_group: { some: { job_id } } }
                },
                _count: { _all: true }
            }),
            
            // DTN
            prisma.drawing_transmittal_job.findMany({
                where: { job_id },
                include: {
                    dtn: true
                }
            }),
            prisma.drawing_transmittal_job.findMany({
                where: { job_id },
                include: {
                    dtn: { include: { items: true } }
                },
                orderBy: { dtn: { date: 'desc' } },
                take: 5
            }),

            // WPJ
            prisma.weld_joint.count({
                where: { weld_joint_plan: { job_id, company_id } }
            }),
            prisma.weld_joint_stage.groupBy({
                by: ['stage_name', 'status'],
                where: { is_active: true, weld_joint: { weld_joint_plan: { job_id, company_id } } },
                _count: { _all: true }
            }),
            prisma.weld_joint_plan.count({
                where: { job_id, company_id }
            }),
            
            // NCR
            prisma.ncr.groupBy({
                by: ['status'],
                where: { job_id, company_id },
                _count: { _all: true }
            }),
            
            // DCR
            prisma.dcr.findMany({
                where: { job_id, company_id },
                include: {
                    dcr_status: { orderBy: { createdAt: 'desc' }, take: 1 }
                }
            }),
            
            // RFQ - Matched on PO Number roughly
            job.po ? prisma.rfq_register.findMany({
                where: { company_id, po_no: job.po.po_number },
                orderBy: { createdAt: 'desc' },
                take: 1
            }) : Promise.resolve([]),
            
            // MHC
            prisma.material_heat_chart.groupBy({
                by: ['status'],
                where: { job_id, company_id },
                _count: { _all: true }
            }),
            
            // QAP
            prisma.quality_assurance_plan.groupBy({
                by: ['status'],
                where: { job_id, company_id },
                _count: { _all: true }
            }),
            
            // Hydro
            prisma.hydrostatic_test_report.groupBy({
                by: ['status'],
                where: { job_id, company_id },
                _count: { _all: true }
            }),
            
            // Dish End
            prisma.dish_end_inspection_report.groupBy({
                by: ['status'],
                where: { job_id, company_id },
                _count: { _all: true }
            }),
            
            // Final Insp
            prisma.final_inspection_report.groupBy({
                by: ['status'],
                where: { job_id, company_id },
                _count: { _all: true }
            }),
            
            // Last Raised NCR
            prisma.ncr.findFirst({
                where: { job_id, company_id },
                orderBy: { createdAt: 'desc' },
                select: { ncr_no: true, current_stage: true }
            }),
            prisma.ncr.findMany({
                where: { job_id, company_id },
                orderBy: { createdAt: 'desc' },
                take: 5
            }),
            prisma.dcr.findMany({
                where: { job_id, company_id },
                include: {
                    dcr_status: { orderBy: { createdAt: 'desc' }, take: 1 }
                },
                orderBy: { createdAt: 'desc' },
                take: 5
            }),
            prisma.weld_joint_plan.findMany({
                where: { job_id, company_id },
                orderBy: { createdAt: 'desc' },
                take: 5
            }),
            // Quality Deep Dive
            prisma.material_heat_chart.findMany({
                where: { job_id, company_id },
                orderBy: { createdAt: 'desc' },
                take: 5
            }),
            prisma.hydrostatic_test_report.findMany({
                where: { job_id, company_id },
                orderBy: { createdAt: 'desc' },
                take: 5
            }),
            prisma.dish_end_inspection_report.findMany({
                where: { job_id, company_id },
                orderBy: { createdAt: 'desc' },
                take: 5
            }),
            prisma.final_inspection_report.findMany({
                where: { job_id, company_id },
                orderBy: { createdAt: 'desc' },
                take: 5
            }),
            prisma.quality_assurance_plan.findMany({
                where: { job_id, company_id },
                orderBy: { createdAt: 'desc' },
                take: 5
            })
        ]);

        // Process DMS
        const dmsCounts = { total: 0, pending: 0, uploaded: 0, approved: 0, rejected: 0 };
        const mergeDMS = (rows) => {
            rows.forEach(r => {
                const s = String(r.status).toLowerCase();
                const count = r._count._all;
                dmsCounts.total += count;
                if (s.includes('pending')) dmsCounts.pending += count;
                else if (s.includes('upload')) dmsCounts.uploaded += count;
                else if (s.includes('approv')) dmsCounts.approved += count;
                else if (s.includes('reject')) dmsCounts.rejected += count;
            });
        };
        mergeDMS(singleDocs);
        mergeDMS(groupDocs);

        // Process DTN
        const dtnCounts = { total: dtnJobs.length, draft: 0, sent: 0 };
        dtnJobs.forEach(dj => {
            if (dj.dtn?.status?.toLowerCase() === 'draft') dtnCounts.draft++;
            else dtnCounts.sent++;
        });
        
        const recentTransmittals = recentDtns.filter(dj => dj.dtn).map(dj => {
            const issuedFor = [];
            if (dj.dtn.for_reference) issuedFor.push("Reference");
            if (dj.dtn.for_planning) issuedFor.push("Planning");
            if (dj.dtn.for_construction) issuedFor.push("Construction");
            if (dj.dtn.for_manufacturing) issuedFor.push("Manufacturing");
            if (dj.dtn.for_outsourcing) issuedFor.push("Outsourcing");
            if (dj.dtn.for_procurement) issuedFor.push("Procurement");

            return {
                id: dj.dtn.id,
                ref_no: dj.dtn.ref_no,
                date: dj.dtn.date,
                status: dj.dtn.status,
                itemsCount: dj.dtn.items?.length || 0,
                intents: issuedFor
            };
        });

        // Process WPJ
        const wpjCounts = {
            plans: weldPlans,
            totalJoints: weldJointsRaw,
            s1: { total: 0, completed: 0 },
            s2: { total: 0, completed: 0 },
            s3: { total: 0, completed: 0 }
        };
        weldStages.forEach(stg => {
            const sn = stg.stage_name.toLowerCase();
            const status = stg.status.toLowerCase();
            const c = stg._count._all;
            if (wpjCounts[sn]) {
                wpjCounts[sn].total += c;
                if (status === 'approved') wpjCounts[sn].completed += c;
            }
        });

        // Process Exceptions
        const ncrCounts = { open: 0, closed: 0, total: 0, latestText: null };
        ncrStatusRaw.forEach(n => {
            const c = n._count._all;
            ncrCounts.total += c;
            if (n.status === 'CLOSED') ncrCounts.closed += c;
            else ncrCounts.open += c;
        });
        if (latestNcr && ncrCounts.total > 0) {
            ncrCounts.latestText = `${latestNcr.ncr_no} (Stage ${latestNcr.current_stage})`;
        }

        const dcrCounts = { pending: 0, approved: 0, total: dcrStatusRaw.length };
        dcrStatusRaw.forEach(d => {
            const st = d.dcr_status[0]?.status?.toUpperCase();
            if (st === 'APPROVED') dcrCounts.approved++;
            else dcrCounts.pending++;
        });

        // Unified Recent Lists
        const processedNcrs = recentNcrs.map(n => ({
            id: n.id,
            no: n.ncr_no,
            status: n.status,
            stage: n.current_stage,
            date: n.createdAt
        }));

        const processedDcrs = recentDcrs.map(d => ({
            id: d.id,
            no: d.dcr_no,
            status: d.dcr_status[0]?.status || 'PENDING',
            date: d.createdAt
        }));

        const processedWeldPlans = recentWeldPlans.map(wp => ({
            id: wp.id,
            no: wp.weld_plan_no,
            drg: wp.shreno_drg_no,
            date: wp.createdAt
        }));

        // Flatten Quality reports for a unified timeline
        const qualityTimeline = [
            ...mhcRecords.map(r => ({ type: 'MHC', no: r.report_no, status: r.status, date: r.createdAt })),
            ...hydroRecords.map(r => ({ type: 'HYDRO', no: r.report_no, status: r.status, date: r.createdAt })),
            ...dishEndRecords.map(r => ({ type: 'DISH END', no: r.report_no, status: r.status, date: r.createdAt })),
            ...finalInspRecords.map(r => ({ type: 'FINAL INSP', no: r.report_no, status: r.status, date: r.createdAt })),
            ...qapRecords.map(r => ({ type: 'QAP', no: r.ref_no || r.id.split('-')[0], status: r.status, date: r.createdAt }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

        // Process RFQ
        const rfq = rfqsRaw.length > 0 ? rfqsRaw[0] : null;

        // Process Quality specific grouping function
        const getQualStatus = (rows) => {
            if (!rows || rows.length === 0) return { status: 'NOT INITIATED', count: 0 };
            const total = rows.reduce((s, r) => s + r._count._all, 0);
            
            const stats = rows.map(r => r.status.toUpperCase());
            let overall = 'IN REVIEW';
            if (stats.includes('REJECTED')) overall = 'REJECTED';
            else if (stats.includes('DRAFT')) overall = 'DRAFT PHASE';
            else if (stats.includes('PENDING')) overall = 'PENDING APPROVAL';
            else if (stats.every(s => s === 'APPROVED')) overall = 'APPROVED';

            return { status: overall, count: total };
        };

        return {
            job: {
                id: job.id,
                customerName: job.customer?.customer_name || 'N/A',
                poNumber: job.po?.po_number || 'N/A',
                poDate: job.po?.po_date || null,
                projectId: job.project_id || 'N/A',
                equipmentName: job.equipement_name || 'N/A',
                tagNo: job.tag_number || 'N/A',
                code: job.code || 'N/A'
            },
            dms: dmsCounts,
            dtn: { ...dtnCounts, recentTransmittals },
            wpj: { ...wpjCounts, recentPlans: processedWeldPlans },
            exceptions: { ncr: ncrCounts, dcr: dcrCounts, recentNcrs: processedNcrs, recentDcrs: processedDcrs },
            rfq: rfq ? {
                id: rfq.id,
                enqDate: rfq.enq_date,
                clientStatus: rfq.client_status,
                shrenoStatus: rfq.shreno_status,
                quotedValue: rfq.total_value || rfq.po_value || 0,
                rfqNo: rfq.rfq_no || 'N/A'
            } : null,
            quality: {
                mhc: getQualStatus(mhcRaw),
                qap: getQualStatus(qapRaw),
                hydro: getQualStatus(hydroRaw),
                dishEnd: getQualStatus(dishEndRaw),
                finalInsp: getQualStatus(finalInspRaw),
                timeline: qualityTimeline
            }
        };
    }
}

module.exports = new Job360Service();
