const prisma = require('#prisma');

const EMPTY_BUCKETS = {
    draft: 0,
    pending: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    open: 0,
    closed: 0,
    sent: 0,
    uploaded: 0,
    commented: 0,
    other: 0,
};

function countValue(row) {
    if (typeof row?._count?._all === 'number') return row._count._all;
    return 0;
}

function toBucket(status) {
    const normalized = String(status || '').trim().toLowerCase();
    if (!normalized) return 'other';
    if (normalized.includes('draft') || normalized === 'created') return 'draft';
    if (normalized.includes('upload')) return 'uploaded';
    if (normalized.includes('submit')) return 'submitted';
    if (normalized.includes('approv')) return 'approved';
    if (normalized.includes('reject')) return 'rejected';
    if (normalized.includes('comment')) return 'commented';
    if (normalized.includes('close')) return 'closed';
    if (normalized.includes('open')) return 'open';
    if (normalized.includes('sent') || normalized.includes('distribut')) return 'sent';
    if (
        normalized.includes('pending') ||
        normalized.includes('review') ||
        normalized.includes('under') ||
        normalized.includes('hold')
    ) {
        return 'pending';
    }
    return 'other';
}

function buildBuckets(rows = []) {
    const buckets = { ...EMPTY_BUCKETS };
    rows.forEach((row) => {
        const bucket = toBucket(row.status);
        buckets[bucket] += countValue(row);
    });
    return buckets;
}

function buildBucketsFromValues(values = []) {
    const buckets = { ...EMPTY_BUCKETS };
    values.forEach((value) => {
        buckets[toBucket(value)] += 1;
    });
    return buckets;
}

function sumBuckets(buckets = {}) {
    return Object.values(buckets).reduce((total, value) => total + (Number(value) || 0), 0);
}

function deriveHealthStatus(buckets = {}) {
    const total = sumBuckets(buckets);
    if (total === 0) return 'Not Initiated';
    if (buckets.rejected > 0) return 'Attention Required';
    if (buckets.open > 0) return 'Open Issues';
    if (buckets.pending > 0 || buckets.submitted > 0 || buckets.commented > 0) return 'In Review';
    if (buckets.draft > 0 && buckets.approved === 0 && buckets.sent === 0) return 'Draft Stage';
    if (buckets.approved === total || buckets.closed === total || buckets.sent === total) return 'Completed';
    if (buckets.approved > 0 || buckets.closed > 0 || buckets.sent > 0) return 'In Progress';
    return 'Active';
}

function percentage(part, total) {
    if (!total) return 0;
    return Math.round((part / total) * 100);
}

function buildQualityModule(rows = [], reports = [], label) {
    const buckets = buildBuckets(rows);
    const total = sumBuckets(buckets);
    return {
        key: label,
        total,
        status: deriveHealthStatus(buckets),
        counts: buckets,
        approvedPercent: percentage(buckets.approved, total),
        recent: reports.map((report) => ({
            id: report.id,
            no: report.report_no || report.ref_no || report.id.split('-')[0],
            status: report.status,
            date: report.createdAt,
        })),
    };
}

class Job360Service {
    async getSnapshot(company_id, job_id) {
        const job = await prisma.job.findFirst({
            where: { id: job_id, company_id },
            include: {
                customer: true,
                customer_location: true,
                po: true,
            },
        });

        if (!job) {
            throw new Error('Job not found or access denied.');
        }

        const linkedDocuments = await prisma.document_master.findMany({
            where: {
                company_id,
                OR: [
                    { single_document: { some: { company_id, job_id } } },
                    {
                        group_document: {
                            some: {
                                company_id,
                                group: { job_group: { some: { job_id } } },
                            },
                        },
                    },
                ],
            },
            select: {
                id: true,
                document_number: true,
                document_name: true,
            },
        });

        const linkedDocumentIds = linkedDocuments.map((doc) => doc.id);
        const linkedDocumentFilter = linkedDocumentIds.length > 0
            ? { in: linkedDocumentIds }
            : { in: ['__none__'] };

        const transmissionJobFilter = {
            OR: [
                { single_document: { job_id, company_id } },
                { group_document: { company_id, group: { job_group: { some: { job_id } } } } },
            ],
        };

        const drawingDocumentFilter = {
            company_id,
            OR: [
                { single_document: { some: { company_id, job_id } } },
                {
                    group_document: {
                        some: {
                            company_id,
                            group: { job_group: { some: { job_id } } },
                        },
                    },
                },
            ],
        };

        const [
            singleDocs,
            groupDocs,
            recentDocVersions,
            transmissionCount,
            transmissions,
            transmissionStatuses,
            transmissionDocumentsByStatus,
            transmissionDocumentCount,
            recentDtns,
            dtnJobs,
            drawingVersions,
            drawingVersionCount,
            drawingActivities,
            drawingActivityCount,
            weldPlans,
            recentWeldPlans,
            weldJointsCount,
            weldStageSummary,
            mhcGrouped,
            mhcRecent,
            hydroGrouped,
            hydroRecent,
            dishEndGrouped,
            dishEndRecent,
            finalInspectionGrouped,
            finalInspectionRecent,
            qapGrouped,
            qapRecent,
            ncrGrouped,
            recentNcrs,
            dcrRecords,
            recentDcrs,
            rfqsRaw,
        ] = await Promise.all([
            prisma.single_document.groupBy({
                by: ['status'],
                where: { company_id, job_id },
                _count: { _all: true },
            }),
            prisma.group_document.groupBy({
                by: ['status'],
                where: {
                    company_id,
                    group: { job_group: { some: { job_id } } },
                },
                _count: { _all: true },
            }),
            prisma.document_version.findMany({
                where: {
                    OR: [
                        { single_document: { company_id, job_id } },
                        { group_document: { company_id, group: { job_group: { some: { job_id } } } } },
                    ],
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: {
                    single_document: {
                        include: {
                            document: { select: { document_number: true, document_name: true } },
                        },
                    },
                    group_document: {
                        include: {
                            document: { select: { document_number: true, document_name: true } },
                        },
                    },
                },
            }),
            prisma.transmission.count({
                where: {
                    company_id,
                    documents: { some: transmissionJobFilter },
                },
            }),
            prisma.transmission.findMany({
                where: {
                    company_id,
                    documents: { some: transmissionJobFilter },
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: {
                    documents: {
                        where: transmissionJobFilter,
                        select: { id: true, client_status: true },
                    },
                },
            }),
            prisma.transmission.groupBy({
                by: ['status'],
                where: {
                    company_id,
                    documents: { some: transmissionJobFilter },
                },
                _count: { _all: true },
            }),
            prisma.transmission_document.groupBy({
                by: ['client_status'],
                where: transmissionJobFilter,
                _count: { _all: true },
            }),
            prisma.transmission_document.count({
                where: transmissionJobFilter,
            }),
            prisma.drawing_transmittal_job.findMany({
                where: { job_id },
                include: {
                    dtn: { include: { items: true } },
                },
                orderBy: { dtn: { date: 'desc' } },
                take: 5,
            }),
            prisma.drawing_transmittal_job.findMany({
                where: { job_id },
                include: { dtn: true },
            }),
            prisma.drawing_version.findMany({
                where: {
                    document_master_id: linkedDocumentFilter,
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: {
                    document: {
                        select: {
                            document_number: true,
                            document_name: true,
                        },
                    },
                },
            }),
            prisma.drawing_version.count({
                where: {
                    document_master_id: linkedDocumentFilter,
                },
            }),
            prisma.drawing_activity.findMany({
                where: {
                    document: drawingDocumentFilter,
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: {
                    document: {
                        select: {
                            document_number: true,
                            document_name: true,
                        },
                    },
                },
            }),
            prisma.drawing_activity.count({
                where: {
                    document: drawingDocumentFilter,
                },
            }),
            prisma.weld_joint_plan.count({
                where: { company_id, job_id },
            }),
            prisma.weld_joint_plan.findMany({
                where: { company_id, job_id },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            prisma.weld_joint.count({
                where: { weld_joint_plan: { company_id, job_id } },
            }),
            prisma.weld_joint_stage.groupBy({
                by: ['stage_name', 'status'],
                where: {
                    is_active: true,
                    weld_joint: { weld_joint_plan: { company_id, job_id } },
                },
                _count: { _all: true },
            }),
            prisma.material_heat_chart.groupBy({
                by: ['status'],
                where: { company_id, job_id },
                _count: { _all: true },
            }),
            prisma.material_heat_chart.findMany({
                where: { company_id, job_id },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            prisma.hydrostatic_test_report.groupBy({
                by: ['status'],
                where: { company_id, job_id },
                _count: { _all: true },
            }),
            prisma.hydrostatic_test_report.findMany({
                where: { company_id, job_id },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            prisma.dish_end_inspection_report.groupBy({
                by: ['status'],
                where: { company_id, job_id },
                _count: { _all: true },
            }),
            prisma.dish_end_inspection_report.findMany({
                where: { company_id, job_id },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            prisma.final_inspection_report.groupBy({
                by: ['status'],
                where: { company_id, job_id },
                _count: { _all: true },
            }),
            prisma.final_inspection_report.findMany({
                where: { company_id, job_id },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            prisma.quality_assurance_plan.groupBy({
                by: ['status'],
                where: { company_id, job_id },
                _count: { _all: true },
            }),
            prisma.quality_assurance_plan.findMany({
                where: { company_id, job_id },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            prisma.ncr.groupBy({
                by: ['status'],
                where: { company_id, job_id },
                _count: { _all: true },
            }),
            prisma.ncr.findMany({
                where: { company_id, job_id },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    ncr_no: true,
                    status: true,
                    current_stage: true,
                    ncr_status: true,
                    createdAt: true,
                },
            }),
            prisma.dcr.findMany({
                where: { company_id, job_id },
                include: {
                    dcr_status: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                    },
                },
            }),
            prisma.dcr.findMany({
                where: { company_id, job_id },
                include: {
                    dcr_status: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            job.po
                ? prisma.rfq_register.findMany({
                    where: { company_id, po_no: job.po.po_number },
                    include: { items: true },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                })
                : Promise.resolve([]),
        ]);

        const dmsSingleBuckets = buildBuckets(singleDocs);
        const dmsGroupBuckets = buildBuckets(groupDocs);
        const dmsCounts = {
            pending: dmsSingleBuckets.pending + dmsGroupBuckets.pending,
            uploaded: dmsSingleBuckets.uploaded + dmsGroupBuckets.uploaded,
            approved: dmsSingleBuckets.approved + dmsGroupBuckets.approved,
            rejected: dmsSingleBuckets.rejected + dmsGroupBuckets.rejected,
            draft: dmsSingleBuckets.draft + dmsGroupBuckets.draft,
        };
        dmsCounts.total = Object.values(dmsCounts).reduce((sum, value) => sum + value, 0);
        const dmsStatusBuckets = {
            draft: dmsCounts.draft,
            pending: dmsCounts.pending,
            uploaded: dmsCounts.uploaded,
            approved: dmsCounts.approved,
            rejected: dmsCounts.rejected,
            submitted: 0,
            open: 0,
            closed: 0,
            sent: 0,
            commented: 0,
            other: 0,
        };

        const transmissionClientBuckets = buildBuckets(
            transmissionDocumentsByStatus.map((row) => ({
                status: row.client_status,
                _count: row._count,
            }))
        );
        const transmissionSummaryBuckets = buildBuckets(transmissionStatuses);
        const transmissionTotalDocs = transmissionDocumentCount;

        const dtnBuckets = buildBucketsFromValues(dtnJobs.map((entry) => entry.dtn?.status));
        const recentTransmittals = recentDtns
            .filter((entry) => entry.dtn)
            .map((entry) => {
                const dtn = entry.dtn;
                const intents = [];
                if (dtn.for_reference) intents.push('Reference');
                if (dtn.for_planning) intents.push('Planning');
                if (dtn.for_construction) intents.push('Construction');
                if (dtn.for_manufacturing) intents.push('Manufacturing');
                if (dtn.for_outsourcing) intents.push('Outsourcing');
                if (dtn.for_procurement) intents.push('Procurement');

                return {
                    id: dtn.id,
                    refNo: dtn.ref_no,
                    date: dtn.date,
                    status: dtn.status,
                    itemsCount: dtn.items?.length || 0,
                    intents,
                };
            });

        const wpjStages = {
            s1: { total: 0, approved: 0, pending: 0, rejected: 0, submitted: 0 },
            s2: { total: 0, approved: 0, pending: 0, rejected: 0, submitted: 0 },
            s3: { total: 0, approved: 0, pending: 0, rejected: 0, submitted: 0 },
        };

        weldStageSummary.forEach((row) => {
            const stage = String(row.stage_name || '').toLowerCase();
            if (!wpjStages[stage]) return;
            const bucket = toBucket(row.status);
            wpjStages[stage].total += countValue(row);
            if (typeof wpjStages[stage][bucket] === 'number') {
                wpjStages[stage][bucket] += countValue(row);
            }
        });

        const dcrLatestStatuses = dcrRecords.map((record) => record.dcr_status[0]?.status || 'PENDING');
        const dcrBuckets = buildBucketsFromValues(dcrLatestStatuses);
        const ncrBuckets = buildBuckets(ncrGrouped);

        const qualityTimeline = [
            ...mhcRecent.map((report) => ({ type: 'MHC', no: report.report_no, status: report.status, date: report.createdAt })),
            ...qapRecent.map((report) => ({ type: 'QAP', no: report.report_no, status: report.status, date: report.createdAt })),
            ...hydroRecent.map((report) => ({ type: 'HYDRO', no: report.report_no, status: report.status, date: report.createdAt })),
            ...dishEndRecent.map((report) => ({ type: 'DISH END', no: report.report_no, status: report.status, date: report.createdAt })),
            ...finalInspectionRecent.map((report) => ({ type: 'FINAL INSP', no: report.report_no, status: report.status, date: report.createdAt })),
        ]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);

        const rfq = rfqsRaw[0] || null;
        const rfqItemCount = rfq?.items?.length || 0;
        const rfqQuotedValue = rfq
            ? (rfq.items || []).reduce((sum, item) => sum + (item.total_value || 0), 0) || rfq.po_value || 0
            : 0;
        const rfqBuckets = buildBucketsFromValues(
            [rfq?.shreno_status, rfq?.client_status].filter(Boolean)
        );

        const modules = {
            dms: {
                status: deriveHealthStatus(dmsStatusBuckets),
                total: dmsCounts.total,
                completionPercent: percentage(dmsCounts.approved + dmsCounts.uploaded, dmsCounts.total),
                counts: dmsCounts,
                recentUploads: recentDocVersions.map((version) => {
                    const sourceDocument = version.single_document?.document || version.group_document?.document;
                    return {
                        id: version.id,
                        documentNo: sourceDocument?.document_number || 'Document',
                        documentName: sourceDocument?.document_name || 'Linked document',
                        versionNo: version.version_no,
                        status: version.status,
                        date: version.createdAt,
                    };
                }),
            },
            transmissions: {
                status: deriveHealthStatus({
                    ...transmissionSummaryBuckets,
                    approved: transmissionClientBuckets.approved,
                    rejected: transmissionClientBuckets.rejected,
                    pending: transmissionClientBuckets.pending,
                    commented: transmissionClientBuckets.commented,
                }),
                total: transmissionCount,
                totalDocuments: transmissionTotalDocs,
                counts: {
                    draft: transmissionSummaryBuckets.draft,
                    pending: transmissionSummaryBuckets.pending,
                    sent: transmissionSummaryBuckets.sent,
                    approved: transmissionClientBuckets.approved,
                    rejected: transmissionClientBuckets.rejected,
                    commented: transmissionClientBuckets.commented,
                },
                recent: transmissions.map((transmission) => ({
                    id: transmission.id,
                    no: transmission.transmission_number,
                    status: transmission.status,
                    clientStatus: transmission.client_status,
                    documents: transmission.documents?.length || 0,
                    date: transmission.createdAt,
                })),
            },
            dtn: {
                status: deriveHealthStatus(dtnBuckets),
                total: dtnJobs.length,
                counts: {
                    draft: dtnBuckets.draft,
                    sent: dtnBuckets.sent,
                },
                recent: recentTransmittals,
            },
            drawingMaster: {
                status: linkedDocuments.length === 0
                    ? 'Not Initiated'
                    : drawingVersions.length > 0 || drawingActivities.length > 0
                        ? 'Active'
                        : 'Linked',
                total: linkedDocuments.length,
                counts: {
                    linkedDocuments: linkedDocuments.length,
                    revisions: drawingVersionCount,
                    activities: drawingActivityCount,
                },
                recentRevisions: drawingVersions.map((version) => ({
                    id: version.id,
                    documentNo: version.document?.document_number || 'Drawing',
                    documentName: version.document?.document_name || 'Linked drawing',
                    versionNo: version.version_no,
                    date: version.createdAt,
                })),
                recentActivities: drawingActivities.map((activity) => ({
                    id: activity.id,
                    action: activity.action,
                    documentNo: activity.document?.document_number || 'Drawing',
                    documentName: activity.document?.document_name || 'Linked drawing',
                    date: activity.createdAt,
                })),
            },
            wpj: {
                status: weldJointsCount === 0
                    ? 'Not Initiated'
                    : (wpjStages.s3.approved === weldJointsCount ? 'Completed' : 'In Progress'),
                plans: weldPlans,
                totalJoints: weldJointsCount,
                stages: wpjStages,
                recentPlans: recentWeldPlans.map((plan) => ({
                    id: plan.id,
                    no: plan.weld_plan_no,
                    drg: plan.shreno_drg_no,
                    code: plan.code_of_construction,
                    date: plan.createdAt,
                })),
            },
            mhc: buildQualityModule(mhcGrouped, mhcRecent, 'MHC'),
            qap: buildQualityModule(qapGrouped, qapRecent, 'QAP'),
            hydro: buildQualityModule(hydroGrouped, hydroRecent, 'HYDRO'),
            dishEnd: buildQualityModule(dishEndGrouped, dishEndRecent, 'DISH END'),
            finalInspection: buildQualityModule(finalInspectionGrouped, finalInspectionRecent, 'FINAL INSP'),
            dcr: {
                status: deriveHealthStatus(dcrBuckets),
                total: dcrRecords.length,
                counts: dcrBuckets,
                recent: recentDcrs.map((record) => ({
                    id: record.id,
                    no: record.dcr_no,
                    drgNo: record.drg_no,
                    status: record.dcr_status[0]?.status || 'PENDING',
                    date: record.createdAt,
                })),
            },
            ncr: {
                status: deriveHealthStatus(ncrBuckets),
                total: sumBuckets(ncrBuckets),
                counts: ncrBuckets,
                recent: recentNcrs.map((record) => ({
                    id: record.id,
                    no: record.ncr_no,
                    status: record.status,
                    workflowStatus: record.ncr_status,
                    stage: record.current_stage,
                    date: record.createdAt,
                })),
            },
            rfq: rfq
                ? {
                    status: deriveHealthStatus(rfqBuckets),
                    total: 1,
                    counts: {
                        quotedItems: rfqItemCount,
                        quotedValue: rfqQuotedValue,
                    },
                    record: {
                        id: rfq.id,
                        quotationNo: rfq.quotation_no,
                        enqDate: rfq.enq_date,
                        targetDate: rfq.target_date,
                        shrenoStatus: rfq.shreno_status,
                        clientStatus: rfq.client_status,
                        poValue: rfq.po_value || 0,
                        quotedValue: rfqQuotedValue,
                    },
                }
                : {
                    status: 'Not Linked',
                    total: 0,
                    counts: { quotedItems: 0, quotedValue: 0 },
                    record: null,
                },
            qualityTimeline,
        };

        const moduleStatuses = [
            modules.dms.status,
            modules.transmissions.status,
            modules.dtn.status,
            modules.drawingMaster.status,
            modules.wpj.status,
            modules.mhc.status,
            modules.qap.status,
            modules.hydro.status,
            modules.dishEnd.status,
            modules.finalInspection.status,
            modules.dcr.status,
            modules.ncr.status,
            modules.rfq.status,
        ];

        const attentionModules = moduleStatuses.filter((status) =>
            ['Attention Required', 'Open Issues', 'In Review'].includes(status)
        ).length;
        const completedModules = moduleStatuses.filter((status) =>
            ['Completed', 'Approved'].includes(status)
        ).length;

        return {
            job: {
                id: job.id,
                jobNumber: job.job_number,
                customerName: job.customer?.customer_name || 'N/A',
                customerLocation: job.customer_location?.location_name || 'N/A',
                poNumber: job.po?.po_number || 'N/A',
                poDate: job.po?.po_date || null,
                projectId: job.project_id || 'N/A',
                equipmentName: job.equipement_name || 'N/A',
                tagNo: job.tag_number || 'N/A',
                code: job.code || 'N/A',
            },
            overview: {
                totalModules: moduleStatuses.length,
                completedModules,
                attentionModules,
                linkedDrawings: linkedDocuments.length,
                totalQualityReports:
                    modules.mhc.total +
                    modules.qap.total +
                    modules.hydro.total +
                    modules.dishEnd.total +
                    modules.finalInspection.total,
            },
            modules,
        };
    }
}

module.exports = new Job360Service();
