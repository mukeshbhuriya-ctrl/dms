const prisma = require('#prisma');
const RfqService = require('./rfq.service');

function toStatusMap(rows = [], key = 'status') {
    return rows.reduce((acc, row) => {
        const raw = row?.[key];
        const label = (typeof raw === 'string' && raw.trim() !== '') ? raw.toUpperCase() : 'UNKNOWN';
        acc[label] = row._count?._all || 0;
        return acc;
    }, {});
}

function sumMapValues(map = {}) {
    return Object.values(map).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

function pickCount(map = {}, keys = []) {
    return keys.reduce((sum, key) => sum + (Number(map?.[key] || 0)), 0);
}

function deriveModuleHealth({ total = 0, approved = 0, pending = 0, rejected = 0, open = 0, draft = 0, sent = 0 }) {
    if (!total) return 'Not Started';
    if (rejected > 0) return 'Attention Required';
    if (open > 0) return 'Open Issues';
    if (pending > 0) return 'In Review';
    if (draft > 0 && approved === 0 && sent === 0) return 'Draft Stage';
    if (approved === total || sent === total) return 'Healthy';
    return 'Active';
}

function healthTone(status) {
    if (status === 'Attention Required' || status === 'Open Issues') return 'critical';
    if (status === 'In Review' || status === 'Draft Stage' || status === 'Active') return 'warning';
    if (status === 'Healthy') return 'healthy';
    return 'idle';
}

function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

function buildDateSeries(days) {
    const today = startOfDay(new Date());
    const start = new Date(today);
    start.setDate(start.getDate() - (days - 1));

    const labels = [];
    const lookup = {};
    for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        labels.push(key);
        lookup[key] = i;
    }

    return {
        labels,
        startDate: start,
        endDate: endOfDay(today),
        indexByDateKey: lookup,
    };
}

function bucketByDate(items, labels, indexByDateKey, field = 'createdAt') {
    const values = new Array(labels.length).fill(0);

    for (const item of items) {
        const raw = item?.[field];
        if (!raw) continue;
        const key = new Date(raw).toISOString().slice(0, 10);
        const idx = indexByDateKey[key];
        if (idx !== undefined) values[idx] += 1;
    }

    return values;
}

class AdminDashboardService {
    async getOverview(company_id) {
        const [
            totalCustomers,
            totalLocations,
            totalPos,
            totalJobs,
            totalUsers,
            totalDepartments,
            totalQcGroups,
            totalDocumentMasters,
            totalSingleDocuments,
            totalGroupDocuments,
            totalSingleDocumentVersions,
            totalGroupDocumentVersions,
            totalTransmissions,
            totalTransmissionDocuments,
            totalDrawingTransmittals,
            totalDrawingVersions,
            totalWeldPlans,
            totalWeldJoints,
            totalWeldStages,
            totalMhc,
            totalQap,
            totalHydro,
            totalDishEnd,
            totalFinalInspection,
            totalNcr,
            totalDcr,
            totalRfq,
            totalEstimators,
            totalMediators,
            singleDocumentStatusRows,
            groupDocumentStatusRows,
            singleDocumentVersionStatusRows,
            groupDocumentVersionStatusRows,
            transmissionStatusRows,
            transmissionClientStatusRows,
            transmissionDocumentClientStatusRows,
            drawingTransmittalStatusRows,
            weldStageStatusRows,
            mhcStatusRows,
            qapStatusRows,
            hydroStatusRows,
            dishEndStatusRows,
            finalInspectionStatusRows,
            ncrStatusRows,
            ncrWorkflowRows,
            rfqClientStatusRows,
            rfqShrenoStatusRows,
            recentJobs,
            recentTransmissions,
            recentDrawingTransmittals,
            recentNcr,
            recentDcr,
            recentMhc,
            recentQap,
            recentHydro,
            recentDishEnd,
            recentFinalInspection,
        ] = await Promise.all([
            prisma.customer.count({ where: { company_id } }),
            prisma.customer_location.count({ where: { company_id } }),
            prisma.po.count({ where: { company_id } }),
            prisma.job.count({ where: { company_id } }),
            prisma.user.count({ where: { company_id } }),
            prisma.department.count({ where: { company_id } }),
            prisma.qc_group.count({ where: { company_id } }),

            prisma.document_master.count({ where: { company_id } }),
            prisma.single_document.count({ where: { company_id } }),
            prisma.group_document.count({ where: { company_id } }),
            prisma.document_version.count({ where: { single_document: { company_id } } }),
            prisma.document_version.count({ where: { group_document: { company_id } } }),
            prisma.transmission.count({ where: { company_id } }),
            prisma.transmission_document.count({ where: { transmission: { company_id } } }),

            prisma.drawing_transmittal.count({ where: { company_id } }),
            prisma.drawing_version.count({ where: { document: { company_id } } }),

            prisma.weld_joint_plan.count({ where: { company_id } }),
            prisma.weld_joint.count({ where: { weld_joint_plan: { company_id } } }),
            prisma.weld_joint_stage.count({ where: { weld_joint: { weld_joint_plan: { company_id } } } }),

            prisma.material_heat_chart.count({ where: { company_id } }),
            prisma.quality_assurance_plan.count({ where: { company_id } }),
            prisma.hydrostatic_test_report.count({ where: { company_id } }),
            prisma.dish_end_inspection_report.count({ where: { company_id } }),
            prisma.final_inspection_report.count({ where: { company_id } }),

            prisma.ncr.count({ where: { company_id } }),
            prisma.dcr.count({ where: { company_id } }),
            prisma.rfq_register.count({ where: { company_id } }),
            prisma.estimator.count({ where: { company_id } }),
            prisma.mediator.count({ where: { company_id } }),

            prisma.single_document.groupBy({ by: ['status'], where: { company_id }, _count: { _all: true } }),
            prisma.group_document.groupBy({ by: ['status'], where: { company_id }, _count: { _all: true } }),
            prisma.document_version.groupBy({ by: ['status'], where: { single_document: { company_id } }, _count: { _all: true } }),
            prisma.document_version.groupBy({ by: ['status'], where: { group_document: { company_id } }, _count: { _all: true } }),
            prisma.transmission.groupBy({ by: ['status'], where: { company_id }, _count: { _all: true } }),
            prisma.transmission.groupBy({ by: ['client_status'], where: { company_id }, _count: { _all: true } }),
            prisma.transmission_document.groupBy({ by: ['client_status'], where: { transmission: { company_id } }, _count: { _all: true } }),
            prisma.drawing_transmittal.groupBy({ by: ['status'], where: { company_id }, _count: { _all: true } }),
            prisma.weld_joint_stage.groupBy({ by: ['status'], where: { weld_joint: { weld_joint_plan: { company_id } } }, _count: { _all: true } }),
            prisma.material_heat_chart.groupBy({ by: ['status'], where: { company_id }, _count: { _all: true } }),
            prisma.quality_assurance_plan.groupBy({ by: ['status'], where: { company_id }, _count: { _all: true } }),
            prisma.hydrostatic_test_report.groupBy({ by: ['status'], where: { company_id }, _count: { _all: true } }),
            prisma.dish_end_inspection_report.groupBy({ by: ['status'], where: { company_id }, _count: { _all: true } }),
            prisma.final_inspection_report.groupBy({ by: ['status'], where: { company_id }, _count: { _all: true } }),
            prisma.ncr.groupBy({ by: ['status'], where: { company_id }, _count: { _all: true } }),
            prisma.ncr.groupBy({ by: ['ncr_status'], where: { company_id }, _count: { _all: true } }),
            prisma.rfq_register.groupBy({ by: ['client_status'], where: { company_id }, _count: { _all: true } }),
            prisma.rfq_register.groupBy({ by: ['shreno_status'], where: { company_id }, _count: { _all: true } }),
            prisma.job.findMany({
                where: { company_id },
                orderBy: { createdAt: 'desc' },
                take: 6,
                include: {
                    customer: { select: { customer_name: true } },
                    po: { select: { po_number: true } },
                    _count: {
                        select: {
                            single_document: true,
                            weld_joint_plans: true,
                            material_heat_charts: true,
                            quality_assurance_plans: true,
                            hydrostatic_test_reports: true,
                            dish_end_inspection_reports: true,
                            final_inspection_reports: true,
                            ncr: true,
                            dcr: true,
                            drawing_transmittal_jobs: true,
                        },
                    },
                },
            }),
            prisma.transmission.findMany({
                where: { company_id },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    transmission_number: true,
                    status: true,
                    client_status: true,
                    createdAt: true,
                },
            }),
            prisma.drawing_transmittal.findMany({
                where: { company_id },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    ref_no: true,
                    status: true,
                    createdAt: true,
                },
            }),
            prisma.ncr.findMany({
                where: { company_id },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    ncr_no: true,
                    msn: true,
                    status: true,
                    ncr_status: true,
                    createdAt: true,
                },
            }),
            prisma.dcr.findMany({
                where: { company_id },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    dcr_no: true,
                    job: { select: { job_number: true } },
                    createdAt: true,
                    dcr_status: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        select: { status: true },
                    },
                },
            }),
            prisma.material_heat_chart.findMany({
                where: { company_id },
                orderBy: { createdAt: 'desc' },
                take: 3,
                select: { id: true, report_no: true, status: true, createdAt: true, job: { select: { job_number: true } } },
            }),
            prisma.quality_assurance_plan.findMany({
                where: { company_id },
                orderBy: { createdAt: 'desc' },
                take: 3,
                select: { id: true, report_no: true, status: true, createdAt: true, job: { select: { job_number: true } } },
            }),
            prisma.hydrostatic_test_report.findMany({
                where: { company_id },
                orderBy: { createdAt: 'desc' },
                take: 3,
                select: { id: true, report_no: true, status: true, createdAt: true, job: { select: { job_number: true } } },
            }),
            prisma.dish_end_inspection_report.findMany({
                where: { company_id },
                orderBy: { createdAt: 'desc' },
                take: 3,
                select: { id: true, report_no: true, status: true, createdAt: true, job: { select: { job_number: true } } },
            }),
            prisma.final_inspection_report.findMany({
                where: { company_id },
                orderBy: { createdAt: 'desc' },
                take: 3,
                select: { id: true, report_no: true, status: true, createdAt: true, job: { select: { job_number: true } } },
            }),
        ]);

        const activeWeldStages = await prisma.weld_joint_stage.count({
            where: {
                is_active: true,
                weld_joint: { weld_joint_plan: { company_id } }
            }
        });

        const latestDcrStatuses = await prisma.dcr.findMany({
            where: { company_id },
            select: {
                dcr_status: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        status: true,
                        design_engineer_status: true,
                        quality_engineer_status: true
                    }
                }
            }
        });

        const dcrStatus = latestDcrStatuses.reduce((acc, item) => {
            const latest = item.dcr_status[0];
            const overall = latest?.status ? String(latest.status).toUpperCase() : 'PENDING';
            acc.overall[overall] = (acc.overall[overall] || 0) + 1;

            const design = latest?.design_engineer_status ? String(latest.design_engineer_status).toUpperCase() : 'PENDING';
            acc.design[design] = (acc.design[design] || 0) + 1;

            const quality = latest?.quality_engineer_status ? String(latest.quality_engineer_status).toUpperCase() : 'PENDING';
            acc.quality[quality] = (acc.quality[quality] || 0) + 1;
            return acc;
        }, { overall: {}, design: {}, quality: {} });

        const rfqFinancials = await RfqService.getDashboardStats(company_id);
        const singleAssignmentStatus = toStatusMap(singleDocumentStatusRows);
        const groupAssignmentStatus = toStatusMap(groupDocumentStatusRows);
        const assignmentStatus = Object.entries({
            ...singleAssignmentStatus,
            ...groupAssignmentStatus,
        }).reduce((acc, [key]) => {
            acc[key] = (singleAssignmentStatus[key] || 0) + (groupAssignmentStatus[key] || 0);
            return acc;
        }, {});

        const singleVersionStatus = toStatusMap(singleDocumentVersionStatusRows);
        const groupVersionStatus = toStatusMap(groupDocumentVersionStatusRows);
        const versionStatus = Object.entries({
            ...singleVersionStatus,
            ...groupVersionStatus,
        }).reduce((acc, [key]) => {
            acc[key] = (singleVersionStatus[key] || 0) + (groupVersionStatus[key] || 0);
            return acc;
        }, {});

        const transmissionStatus = toStatusMap(transmissionStatusRows);
        const transmissionClientStatus = toStatusMap(transmissionClientStatusRows, 'client_status');
        const transmissionDocumentClientStatus = toStatusMap(transmissionDocumentClientStatusRows, 'client_status');
        const drawingTransmittalStatus = toStatusMap(drawingTransmittalStatusRows);
        const weldStageStatus = toStatusMap(weldStageStatusRows);
        const mhcStatus = toStatusMap(mhcStatusRows);
        const qapStatus = toStatusMap(qapStatusRows);
        const hydroStatus = toStatusMap(hydroStatusRows);
        const dishEndStatus = toStatusMap(dishEndStatusRows);
        const finalInspectionStatus = toStatusMap(finalInspectionStatusRows);
        const ncrStatus = toStatusMap(ncrStatusRows);
        const ncrWorkflow = toStatusMap(ncrWorkflowRows, 'ncr_status');
        const rfqClientStatus = toStatusMap(rfqClientStatusRows, 'client_status');
        const rfqShrenoStatus = toStatusMap(rfqShrenoStatusRows, 'shreno_status');

        const totalAssignedDocuments = totalSingleDocuments + totalGroupDocuments;
        const totalDocumentVersions = totalSingleDocumentVersions + totalGroupDocumentVersions;
        const totalQualityReports = totalMhc + totalQap + totalHydro + totalDishEnd + totalFinalInspection;
        const openExceptions = pickCount(ncrStatus, ['OPEN']) + pickCount(dcrStatus.overall, ['PENDING', 'DRAFT', 'SUBMITTED']);
        const pendingApprovals =
            pickCount(versionStatus, ['UPLOADED', 'PENDING', 'PENDING FOR APPROVAL']) +
            pickCount(transmissionDocumentClientStatus, ['PENDING', 'COMMENTED']) +
            pickCount(dcrStatus.overall, ['PENDING']) +
            pickCount(ncrWorkflow, ['PENDING', 'DRAFT']) +
            pickCount(mhcStatus, ['PENDING', 'DRAFT']) +
            pickCount(qapStatus, ['PENDING', 'DRAFT']) +
            pickCount(hydroStatus, ['PENDING', 'DRAFT']) +
            pickCount(dishEndStatus, ['PENDING', 'DRAFT']) +
            pickCount(finalInspectionStatus, ['PENDING', 'DRAFT']);

        const moduleHealth = [
            {
                key: 'dms',
                title: 'DMS',
                route: '/dcc/documents',
                total: totalAssignedDocuments,
                pending: pickCount(assignmentStatus, ['PENDING', 'UPLOADED', 'PENDING FOR APPROVAL']),
                approved: pickCount(assignmentStatus, ['APPROVED']),
                rejected: pickCount(assignmentStatus, ['REJECTED']),
                status: deriveModuleHealth({
                    total: totalAssignedDocuments,
                    pending: pickCount(assignmentStatus, ['PENDING', 'UPLOADED', 'PENDING FOR APPROVAL']),
                    approved: pickCount(assignmentStatus, ['APPROVED']),
                    rejected: pickCount(assignmentStatus, ['REJECTED']),
                }),
            },
            {
                key: 'transmissions',
                title: 'Transmissions',
                route: '/dcc/client-approval-status',
                total: totalTransmissions,
                pending: pickCount(transmissionClientStatus, ['PENDING']),
                approved: pickCount(transmissionClientStatus, ['APPROVED']),
                rejected: pickCount(transmissionClientStatus, ['REJECTED']),
                status: deriveModuleHealth({
                    total: totalTransmissions,
                    pending: pickCount(transmissionClientStatus, ['PENDING', 'COMMENTED']),
                    approved: pickCount(transmissionClientStatus, ['APPROVED']),
                    rejected: pickCount(transmissionClientStatus, ['REJECTED']),
                    sent: pickCount(transmissionStatus, ['SENT']),
                }),
            },
            {
                key: 'dtn',
                title: 'Drawing Transmittal',
                route: '/dtn/drawing-transmittal',
                total: totalDrawingTransmittals,
                pending: pickCount(drawingTransmittalStatus, ['DRAFT']),
                approved: pickCount(drawingTransmittalStatus, ['SENT', 'DISTRIBUTED']),
                rejected: 0,
                status: deriveModuleHealth({
                    total: totalDrawingTransmittals,
                    draft: pickCount(drawingTransmittalStatus, ['DRAFT']),
                    sent: pickCount(drawingTransmittalStatus, ['SENT', 'DISTRIBUTED']),
                }),
            },
            {
                key: 'weld',
                title: 'Welding Pipeline',
                route: '/view-weldingjoints',
                total: totalWeldStages,
                pending: pickCount(weldStageStatus, ['PENDING', 'SUBMITTED']),
                approved: pickCount(weldStageStatus, ['APPROVED']),
                rejected: pickCount(weldStageStatus, ['REJECTED']),
                status: deriveModuleHealth({
                    total: totalWeldStages,
                    pending: pickCount(weldStageStatus, ['PENDING', 'SUBMITTED']),
                    approved: pickCount(weldStageStatus, ['APPROVED']),
                    rejected: pickCount(weldStageStatus, ['REJECTED']),
                }),
            },
            {
                key: 'quality',
                title: 'Quality',
                route: '/material-heat-chart',
                total: totalQualityReports,
                pending:
                    pickCount(mhcStatus, ['PENDING', 'DRAFT']) +
                    pickCount(qapStatus, ['PENDING', 'DRAFT']) +
                    pickCount(hydroStatus, ['PENDING', 'DRAFT']) +
                    pickCount(dishEndStatus, ['PENDING', 'DRAFT']) +
                    pickCount(finalInspectionStatus, ['PENDING', 'DRAFT']),
                approved:
                    pickCount(mhcStatus, ['APPROVED']) +
                    pickCount(qapStatus, ['APPROVED']) +
                    pickCount(hydroStatus, ['APPROVED']) +
                    pickCount(dishEndStatus, ['APPROVED']) +
                    pickCount(finalInspectionStatus, ['APPROVED']),
                rejected:
                    pickCount(mhcStatus, ['REJECTED']) +
                    pickCount(qapStatus, ['REJECTED']) +
                    pickCount(hydroStatus, ['REJECTED']) +
                    pickCount(dishEndStatus, ['REJECTED']) +
                    pickCount(finalInspectionStatus, ['REJECTED']),
                status: deriveModuleHealth({
                    total: totalQualityReports,
                    pending:
                        pickCount(mhcStatus, ['PENDING', 'DRAFT']) +
                        pickCount(qapStatus, ['PENDING', 'DRAFT']) +
                        pickCount(hydroStatus, ['PENDING', 'DRAFT']) +
                        pickCount(dishEndStatus, ['PENDING', 'DRAFT']) +
                        pickCount(finalInspectionStatus, ['PENDING', 'DRAFT']),
                    approved:
                        pickCount(mhcStatus, ['APPROVED']) +
                        pickCount(qapStatus, ['APPROVED']) +
                        pickCount(hydroStatus, ['APPROVED']) +
                        pickCount(dishEndStatus, ['APPROVED']) +
                        pickCount(finalInspectionStatus, ['APPROVED']),
                    rejected:
                        pickCount(mhcStatus, ['REJECTED']) +
                        pickCount(qapStatus, ['REJECTED']) +
                        pickCount(hydroStatus, ['REJECTED']) +
                        pickCount(dishEndStatus, ['REJECTED']) +
                        pickCount(finalInspectionStatus, ['REJECTED']),
                }),
            },
            {
                key: 'exceptions',
                title: 'NCR / DCR',
                route: '/ncr/create-ncr',
                total: totalNcr + totalDcr,
                pending: pickCount(dcrStatus.overall, ['PENDING', 'DRAFT']) + pickCount(ncrWorkflow, ['PENDING', 'DRAFT']),
                approved: pickCount(dcrStatus.overall, ['APPROVED']) + pickCount(ncrStatus, ['CLOSED']),
                rejected: 0,
                status: deriveModuleHealth({
                    total: totalNcr + totalDcr,
                    pending: pickCount(dcrStatus.overall, ['PENDING', 'DRAFT']) + pickCount(ncrWorkflow, ['PENDING', 'DRAFT']),
                    approved: pickCount(dcrStatus.overall, ['APPROVED']) + pickCount(ncrStatus, ['CLOSED']),
                    open: pickCount(ncrStatus, ['OPEN']),
                }),
            },
            {
                key: 'rfq',
                title: 'RFQ',
                route: '/marketing/rfq-register',
                total: totalRfq,
                pending: pickCount(rfqClientStatus, ['UNDER REVIEW', 'PENDING']),
                approved: pickCount(rfqShrenoStatus, ['WON', 'ORDER RECEIVED']),
                rejected: 0,
                status: deriveModuleHealth({
                    total: totalRfq,
                    pending: pickCount(rfqClientStatus, ['UNDER REVIEW', 'PENDING']),
                    approved: pickCount(rfqShrenoStatus, ['WON', 'ORDER RECEIVED']),
                }),
            },
        ].map((item) => ({
            ...item,
            tone: healthTone(item.status),
        }));

        const modulesWithActivity = moduleHealth.filter((item) => item.total > 0).length;
        const recentActivity = [
            ...recentTransmissions.map((item) => ({
                id: `transmission-${item.id}`,
                module: 'Transmissions',
                title: item.transmission_number,
                subtitle: `Internal ${item.status} / Client ${item.client_status}`,
                status: item.client_status || item.status,
                date: item.createdAt,
                route: '/dcc/client-approval-status',
            })),
            ...recentDrawingTransmittals.map((item) => ({
                id: `dtn-${item.id}`,
                module: 'DTN',
                title: item.ref_no,
                subtitle: 'Drawing transmittal created',
                status: item.status,
                date: item.createdAt,
                route: '/dtn/drawing-transmittal',
            })),
            ...recentNcr.map((item) => ({
                id: `ncr-${item.id}`,
                module: 'NCR',
                title: item.ncr_no,
                subtitle: `Job ${item.msn}`,
                status: item.ncr_status || item.status,
                date: item.createdAt,
                route: '/ncr/create-ncr',
            })),
            ...recentDcr.map((item) => ({
                id: `dcr-${item.id}`,
                module: 'DCR',
                title: item.dcr_no,
                subtitle: `Job ${item.job?.job_number || 'N/A'}`,
                status: item.dcr_status?.[0]?.status || 'PENDING',
                date: item.createdAt,
                route: '/dcr/dcr-request',
            })),
            ...recentMhc.map((item) => ({
                id: `mhc-${item.id}`,
                module: 'MHC',
                title: item.report_no,
                subtitle: `Job ${item.job?.job_number || 'N/A'}`,
                status: item.status,
                date: item.createdAt,
                route: '/material-heat-chart',
            })),
            ...recentQap.map((item) => ({
                id: `qap-${item.id}`,
                module: 'QAP',
                title: item.report_no,
                subtitle: `Job ${item.job?.job_number || 'N/A'}`,
                status: item.status,
                date: item.createdAt,
                route: '/create-qarp',
            })),
            ...recentHydro.map((item) => ({
                id: `hydro-${item.id}`,
                module: 'Hydro',
                title: item.report_no,
                subtitle: `Job ${item.job?.job_number || 'N/A'}`,
                status: item.status,
                date: item.createdAt,
                route: '/hydrostatic-pressure-test',
            })),
            ...recentDishEnd.map((item) => ({
                id: `dish-${item.id}`,
                module: 'Dish End',
                title: item.report_no,
                subtitle: `Job ${item.job?.job_number || 'N/A'}`,
                status: item.status,
                date: item.createdAt,
                route: '/inspections/dish-end',
            })),
            ...recentFinalInspection.map((item) => ({
                id: `final-${item.id}`,
                module: 'Final Inspection',
                title: item.report_no,
                subtitle: `Job ${item.job?.job_number || 'N/A'}`,
                status: item.status,
                date: item.createdAt,
                route: '/inspections/final',
            })),
        ]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 12);

        return {
            generatedAt: new Date().toISOString(),
            totals: {
                customers: totalCustomers,
                locations: totalLocations,
                pos: totalPos,
                jobs: totalJobs,
                users: totalUsers,
                departments: totalDepartments,
                qcGroups: totalQcGroups,
            },
            executive: {
                modulesTracked: moduleHealth.length,
                modulesWithActivity,
                pendingApprovals,
                openExceptions,
                totalWorkflowRecords:
                    totalAssignedDocuments +
                    totalDocumentVersions +
                    totalTransmissions +
                    totalDrawingTransmittals +
                    totalWeldStages +
                    totalQualityReports +
                    totalNcr +
                    totalDcr,
            },
            dms: {
                documentMasters: totalDocumentMasters,
                assignedDocuments: totalAssignedDocuments,
                documentVersions: totalDocumentVersions,
                transmissions: totalTransmissions,
                transmissionDocuments: totalTransmissionDocuments,
                singleDocuments: totalSingleDocuments,
                groupDocuments: totalGroupDocuments,
                assignmentStatus,
                versionStatus,
                transmissionStatus,
                transmissionClientStatus,
                transmissionDocumentClientStatus,
            },
            dtn: {
                drawingTransmittals: totalDrawingTransmittals,
                drawingVersions: totalDrawingVersions,
                drawingTransmittalStatus,
            },
            weld: {
                weldPlans: totalWeldPlans,
                weldJoints: totalWeldJoints,
                weldStages: totalWeldStages,
                activeWeldStages,
                stageStatus: weldStageStatus,
            },
            quality: {
                mhcReports: totalMhc,
                qapReports: totalQap,
                hydroReports: totalHydro,
                dishEndReports: totalDishEnd,
                finalInspectionReports: totalFinalInspection,
                mhcStatus,
                qapStatus,
                hydroStatus,
                dishEndStatus,
                finalInspectionStatus,
            },
            ncr: {
                total: totalNcr,
                status: ncrStatus,
                workflow: ncrWorkflow,
            },
            dcr: {
                total: totalDcr,
                latestStatus: dcrStatus,
            },
            rfq: {
                total: totalRfq,
                estimators: totalEstimators,
                mediators: totalMediators,
                clientStatus: rfqClientStatus,
                shrenoStatus: rfqShrenoStatus,
                financials: rfqFinancials?.financials || {
                    totalQuoted: 0,
                    orderReceivedValue: 0,
                    winPercentage: '0.00'
                }
            },
            moduleHealth,
            portfolio: {
                recentJobs: recentJobs.map((job) => ({
                    id: job.id,
                    jobNumber: job.job_number,
                    customerName: job.customer?.customer_name || 'N/A',
                    poNumber: job.po?.po_number || 'N/A',
                    equipmentName: job.equipement_name || 'N/A',
                    createdAt: job.createdAt,
                    activityCount:
                        (job._count?.single_document || 0) +
                        (job._count?.weld_joint_plans || 0) +
                        (job._count?.material_heat_charts || 0) +
                        (job._count?.quality_assurance_plans || 0) +
                        (job._count?.hydrostatic_test_reports || 0) +
                        (job._count?.dish_end_inspection_reports || 0) +
                        (job._count?.final_inspection_reports || 0) +
                        (job._count?.ncr || 0) +
                        (job._count?.dcr || 0) +
                        (job._count?.drawing_transmittal_jobs || 0),
                })),
            },
            recentActivity,
        };
    }

    async getAlerts(company_id, options = {}) {
        const now = new Date();
        const stalledDays = Number(options.stalledDays || 7);
        const stalledThreshold = new Date(now);
        stalledThreshold.setDate(stalledThreshold.getDate() - stalledDays);

        const pendingUploadDocs = await prisma.group_document.findMany({
            where: {
                company_id,
                status: 'Pending',
                upload_due_days: { not: null },
            },
            include: {
                document: { select: { document_number: true, document_name: true } },
                user: { select: { name: true, empid: true } },
                group: {
                    include: {
                        job_group: { include: { job: { select: { job_number: true } } } }
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        const overdueUpload = pendingUploadDocs
            .map((doc) => {
                const dueAt = new Date(doc.createdAt);
                dueAt.setDate(dueAt.getDate() + Number(doc.upload_due_days || 0));
                return { doc, dueAt };
            })
            .filter((item) => item.dueAt < now)
            .map(({ doc, dueAt }) => ({
                id: doc.id,
                documentNumber: doc.document?.document_number || 'N/A',
                documentName: doc.document?.document_name || 'N/A',
                owner: doc.user?.name || 'N/A',
                ownerEmpId: doc.user?.empid || 'N/A',
                jobNumber: doc.group?.job_group?.map((jg) => jg.job?.job_number).filter(Boolean).join(', ') || 'N/A',
                dueAt,
                delayedDays: Math.max(1, Math.floor((now.getTime() - dueAt.getTime()) / (1000 * 60 * 60 * 24))),
            }))
            .sort((a, b) => b.delayedDays - a.delayedDays);

        const pendingResponseDocs = await prisma.group_document.findMany({
            where: {
                company_id,
                status: { in: ['Pending for Approval', 'Uploaded'] },
                response_due_days: { not: null },
            },
            include: {
                document: { select: { document_number: true, document_name: true } },
                versions: {
                    where: { status: { not: 'Pending' } },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                group: {
                    include: {
                        job_group: { include: { job: { select: { job_number: true } } } }
                    }
                }
            },
            orderBy: { updatedAt: 'asc' }
        });

        const overdueResponse = pendingResponseDocs
            .map((doc) => {
                const latestVersion = doc.versions?.[0];
                if (!latestVersion) return null;
                const dueAt = new Date(latestVersion.createdAt);
                dueAt.setDate(dueAt.getDate() + Number(doc.response_due_days || 0));
                if (dueAt >= now) return null;

                return {
                    id: doc.id,
                    documentNumber: doc.document?.document_number || 'N/A',
                    documentName: doc.document?.document_name || 'N/A',
                    jobNumber: doc.group?.job_group?.map((jg) => jg.job?.job_number).filter(Boolean).join(', ') || 'N/A',
                    dueAt,
                    delayedDays: Math.max(1, Math.floor((now.getTime() - dueAt.getTime()) / (1000 * 60 * 60 * 24))),
                };
            })
            .filter(Boolean)
            .sort((a, b) => b.delayedDays - a.delayedDays);

        const stalledNcr = await prisma.ncr.findMany({
            where: {
                company_id,
                status: { not: 'CLOSED' },
                updatedAt: { lt: stalledThreshold },
            },
            select: {
                id: true,
                ncr_no: true,
                msn: true,
                ncr_status: true,
                current_stage: true,
                updatedAt: true,
            },
            orderBy: { updatedAt: 'asc' },
            take: 50
        });

        const stalledWeldStages = await prisma.weld_joint_stage.findMany({
            where: {
                is_active: true,
                status: { in: ['pending', 'submitted'] },
                updatedAt: { lt: stalledThreshold },
                weld_joint: {
                    weld_joint_plan: { company_id }
                }
            },
            select: {
                id: true,
                stage_name: true,
                status: true,
                updatedAt: true,
                weld_joint: {
                    select: {
                        id: true,
                        joint_no: true,
                        weld_joint_plan: {
                            select: {
                                job: { select: { job_number: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { updatedAt: 'asc' },
            take: 50
        });

        const stalledTransmissions = await prisma.transmission.findMany({
            where: {
                company_id,
                status: 'Sent',
                client_status: 'Pending',
                updatedAt: { lt: stalledThreshold },
            },
            select: {
                id: true,
                transmission_number: true,
                client_status: true,
                status: true,
                updatedAt: true,
            },
            orderBy: { updatedAt: 'asc' },
            take: 50
        });

        return {
            generatedAt: new Date().toISOString(),
            rules: {
                stalledDays,
                overdueUploadRule: 'Pending documents older than upload_due_days',
                overdueResponseRule: 'Uploaded/Pending-for-approval documents older than response_due_days from last upload',
            },
            summary: {
                overdueUploadCount: overdueUpload.length,
                overdueResponseCount: overdueResponse.length,
                stalledNcrCount: stalledNcr.length,
                stalledWeldStageCount: stalledWeldStages.length,
                stalledTransmissionCount: stalledTransmissions.length,
            },
            details: {
                overdueUploadTop: overdueUpload.slice(0, 20),
                overdueResponseTop: overdueResponse.slice(0, 20),
                stalledNcrTop: stalledNcr.map((item) => ({
                    id: item.id,
                    ncrNo: item.ncr_no,
                    jobNumber: item.msn,
                    workflowStatus: item.ncr_status,
                    currentStage: item.current_stage,
                    lastUpdatedAt: item.updatedAt,
                    stalledDays: Math.max(1, Math.floor((now.getTime() - new Date(item.updatedAt).getTime()) / (1000 * 60 * 60 * 24))),
                })),
                stalledWeldStageTop: stalledWeldStages.map((item) => ({
                    id: item.id,
                    jointId: item.weld_joint?.id,
                    jointNo: item.weld_joint?.joint_no || 'N/A',
                    jobNumber: item.weld_joint?.weld_joint_plan?.job?.job_number || 'N/A',
                    stage: item.stage_name,
                    status: item.status,
                    lastUpdatedAt: item.updatedAt,
                    stalledDays: Math.max(1, Math.floor((now.getTime() - new Date(item.updatedAt).getTime()) / (1000 * 60 * 60 * 24))),
                })),
                stalledTransmissionTop: stalledTransmissions.map((item) => ({
                    id: item.id,
                    transmissionNumber: item.transmission_number,
                    status: item.status,
                    clientStatus: item.client_status,
                    lastUpdatedAt: item.updatedAt,
                    stalledDays: Math.max(1, Math.floor((now.getTime() - new Date(item.updatedAt).getTime()) / (1000 * 60 * 60 * 24))),
                })),
            }
        };
    }

    async getTrends(company_id, options = {}) {
        const daysRaw = Number(options.days || 30);
        const days = [7, 30, 90].includes(daysRaw) ? daysRaw : 30;
        const { labels, startDate, endDate, indexByDateKey } = buildDateSeries(days);

        const rangeWhere = { gte: startDate, lte: endDate };

        const [
            dmsAssignments,
            dmsUploads,
            dmsTransmissions,
            dtnTransmittals,
            weldStages,
            ncr,
            dcr,
            rfq,
            mhc,
            qap,
            hydro,
            dishEnd,
            finalInspection,
        ] = await Promise.all([
            prisma.group_document.findMany({ where: { company_id, createdAt: rangeWhere }, select: { createdAt: true } }),
            prisma.document_version.findMany({ where: { group_document: { company_id }, createdAt: rangeWhere }, select: { createdAt: true } }),
            prisma.transmission.findMany({ where: { company_id, createdAt: rangeWhere }, select: { createdAt: true } }),
            prisma.drawing_transmittal.findMany({ where: { company_id, createdAt: rangeWhere }, select: { createdAt: true } }),
            prisma.weld_joint_stage.findMany({
                where: {
                    weld_joint: { weld_joint_plan: { company_id } },
                    createdAt: rangeWhere,
                },
                select: { createdAt: true }
            }),
            prisma.ncr.findMany({ where: { company_id, createdAt: rangeWhere }, select: { createdAt: true } }),
            prisma.dcr.findMany({ where: { company_id, createdAt: rangeWhere }, select: { createdAt: true } }),
            prisma.rfq_register.findMany({ where: { company_id, createdAt: rangeWhere }, select: { createdAt: true } }),
            prisma.material_heat_chart.findMany({ where: { company_id, createdAt: rangeWhere }, select: { createdAt: true } }),
            prisma.quality_assurance_plan.findMany({ where: { company_id, createdAt: rangeWhere }, select: { createdAt: true } }),
            prisma.hydrostatic_test_report.findMany({ where: { company_id, createdAt: rangeWhere }, select: { createdAt: true } }),
            prisma.dish_end_inspection_report.findMany({ where: { company_id, createdAt: rangeWhere }, select: { createdAt: true } }),
            prisma.final_inspection_report.findMany({ where: { company_id, createdAt: rangeWhere }, select: { createdAt: true } }),
        ]);

        const qualityCombined = [
            ...mhc,
            ...qap,
            ...hydro,
            ...dishEnd,
            ...finalInspection,
        ];

        const series = {
            dmsAssignments: bucketByDate(dmsAssignments, labels, indexByDateKey),
            dmsUploads: bucketByDate(dmsUploads, labels, indexByDateKey),
            dmsTransmissions: bucketByDate(dmsTransmissions, labels, indexByDateKey),
            dtnTransmittals: bucketByDate(dtnTransmittals, labels, indexByDateKey),
            weldStageUpdates: bucketByDate(weldStages, labels, indexByDateKey),
            ncrCreated: bucketByDate(ncr, labels, indexByDateKey),
            dcrCreated: bucketByDate(dcr, labels, indexByDateKey),
            rfqCreated: bucketByDate(rfq, labels, indexByDateKey),
            qualityReports: bucketByDate(qualityCombined, labels, indexByDateKey),
        };

        const totals = Object.keys(series).reduce((acc, key) => {
            acc[key] = series[key].reduce((sum, item) => sum + item, 0);
            return acc;
        }, {});

        return {
            generatedAt: new Date().toISOString(),
            windowDays: days,
            labels,
            series,
            totals,
        };
    }
}

module.exports = new AdminDashboardService();
