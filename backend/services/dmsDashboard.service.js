const prisma = require('#prisma');
const ExcelGenerator = require('#utils/excelGenerator.js');

class DmsDashboardService {
    /**
     * Normalizes start and end dates from options or defaults to the last 6 months.
     */
    _parseDateRange(options = {}) {
        const now = new Date();
        let start;
        let end;

        if (options.startDate) {
            start = new Date(options.startDate);
            start.setHours(0, 0, 0, 0);
        } else {
            // Default to past 6 months
            start = new Date(now);
            start.setMonth(start.getMonth() - 5);
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
        }

        if (options.endDate) {
            end = new Date(options.endDate);
            end.setHours(23, 59, 59, 999);
        } else {
            end = new Date(now);
            end.setHours(23, 59, 59, 999);
        }

        return { start, end };
    }

    /**
     * Maps a group_document and its versions into an analytical SLA record.
     */
    _mapDocumentRecord(doc, now = new Date()) {
        const assignedAt = new Date(doc.createdAt);
        const uploadDueDays = (doc.upload_due_days !== null && doc.upload_due_days !== undefined) 
            ? Number(doc.upload_due_days) 
            : null;

        const plannedDeadline = uploadDueDays !== null
            ? new Date(assignedAt.getTime() + uploadDueDays * 24 * 60 * 60 * 1000)
            : null;

        // Find latest uploaded version (status != 'Pending')
        const versions = Array.isArray(doc.versions) ? doc.versions : [];
        const uploadedVersions = versions.filter(v => v.status !== 'Pending' && v.file_url);
        
        // Sort by version_no desc, then createdAt desc
        uploadedVersions.sort((a, b) => (b.version_no ?? 0) - (a.version_no ?? 0));
        const latestUploadedVersion = uploadedVersions[0] || null;

        const jobNumbers = doc.group?.job_group?.map(jg => jg.job?.job_number).filter(Boolean) || [];
        const jobNumber = jobNumbers.join(', ') || 'N/A';
        const customerName = doc.customer?.customer_name || 'N/A';
        const customerShortName = doc.customer?.customer_short_name || customerName;

        let isUploaded = false;
        let versionNo = 0;
        let uploadedAt = null;
        let uploaderName = doc.user?.name || 'Unassigned';
        let uploaderEmpId = doc.user?.empid || '';
        let fileUrl = '';
        let fileName = '';
        let slaStatus = 'PENDING_ON_TRACK';
        let slaLabel = 'Pending';
        let varianceDays = 0;

        if (latestUploadedVersion) {
            isUploaded = true;
            versionNo = latestUploadedVersion.version_no ?? 0;
            uploadedAt = new Date(latestUploadedVersion.updatedAt || latestUploadedVersion.createdAt);
            uploaderName = latestUploadedVersion.uploader?.name || doc.user?.name || 'N/A';
            uploaderEmpId = latestUploadedVersion.uploader?.empid || doc.user?.empid || '';
            fileUrl = latestUploadedVersion.file_url || '';
            fileName = latestUploadedVersion.original_filename || '';

            if (uploadDueDays === null || !plannedDeadline) {
                slaStatus = 'ON_TIME';
                slaLabel = 'Uploaded (No SLA)';
                varianceDays = 0;
            } else {
                const deadlineEndOfDay = new Date(plannedDeadline);
                deadlineEndOfDay.setHours(23, 59, 59, 999);
                const diffMs = uploadedAt.getTime() - deadlineEndOfDay.getTime();

                if (diffMs <= 0) {
                    slaStatus = 'ON_TIME';
                    const daysEarly = Math.floor(Math.abs(diffMs) / (24 * 60 * 60 * 1000));
                    slaLabel = daysEarly === 0 ? 'On-Time (On Deadline)' : `On-Time (${daysEarly}d early)`;
                    varianceDays = -daysEarly;
                } else {
                    slaStatus = 'DELAYED';
                    const daysLate = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
                    slaLabel = `Delayed (${daysLate}d late)`;
                    varianceDays = daysLate;
                }
            }
        } else {
            // Not uploaded yet
            isUploaded = false;
            versionNo = 0;
            uploadedAt = null;

            if (uploadDueDays === null || !plannedDeadline) {
                slaStatus = 'PENDING_ON_TRACK';
                slaLabel = 'Pending (No SLA)';
                varianceDays = 0;
            } else {
                const deadlineEndOfDay = new Date(plannedDeadline);
                deadlineEndOfDay.setHours(23, 59, 59, 999);
                const diffMs = now.getTime() - deadlineEndOfDay.getTime();

                if (diffMs <= 0) {
                    slaStatus = 'PENDING_ON_TRACK';
                    const daysRemaining = Math.ceil(Math.abs(diffMs) / (24 * 60 * 60 * 1000));
                    slaLabel = daysRemaining === 0 ? 'Due Today' : `Due in ${daysRemaining}d`;
                    varianceDays = -daysRemaining;
                } else {
                    slaStatus = 'PENDING_OVERDUE';
                    const daysOverdue = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
                    slaLabel = `Overdue by ${daysOverdue}d`;
                    varianceDays = daysOverdue;
                }
            }
        }

        const effectiveDate = uploadedAt || assignedAt;
        const monthKey = effectiveDate.toISOString().slice(0, 7); // e.g. "2026-03"
        const monthLabel = effectiveDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });

        return {
            id: doc.id,
            documentId: doc.document_id,
            documentNumber: doc.document?.document_number || 'N/A',
            documentName: doc.document?.document_name || 'N/A',
            jobNumber,
            jobNumbers,
            customerName,
            customerShortName,
            poNumber: doc.po?.po_number || 'N/A',
            uploaderName,
            uploaderEmpId,
            assignedAt,
            uploadDueDays,
            plannedDeadline,
            isUploaded,
            versionNo,
            uploadedAt,
            fileName,
            fileUrl,
            slaStatus,
            slaLabel,
            varianceDays,
            currentWorkflowStatus: doc.status || 'Pending',
            monthKey,
            monthLabel,
        };
    }

    /**
     * Query group_document and relations with company isolation.
     */
    async _fetchCompanyDocuments(company_id) {
        return await prisma.group_document.findMany({
            where: {
                company_id,
                is_deleted: false,
            },
            include: {
                document: {
                    select: {
                        id: true,
                        document_number: true,
                        document_name: true,
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        empid: true,
                        email: true,
                    }
                },
                customer: {
                    select: {
                        id: true,
                        customer_name: true,
                        customer_short_name: true,
                    }
                },
                po: {
                    select: {
                        id: true,
                        po_number: true,
                    }
                },
                group: {
                    include: {
                        job_group: {
                            include: {
                                job: {
                                    select: {
                                        id: true,
                                        job_number: true,
                                    }
                                }
                            }
                        }
                    }
                },
                versions: {
                    orderBy: { version_no: 'desc' },
                    include: {
                        uploader: {
                            select: {
                                id: true,
                                name: true,
                                empid: true,
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Computes High-Level Analytics & Month-Wise / Date-Wise Aggregations.
     */
    async getUploadAnalytics(company_id, options = {}) {
        const { start, end } = this._parseDateRange(options);
        const now = new Date();

        const rawDocs = await this._fetchCompanyDocuments(company_id);
        const mappedRecords = rawDocs.map(doc => this._mapDocumentRecord(doc, now));

        // Filter within selected date window
        const windowRecords = mappedRecords.filter(rec => {
            const dateToTest = rec.isUploaded ? rec.uploadedAt : rec.assignedAt;
            if (!dateToTest) return false;
            return dateToTest >= start && dateToTest <= end;
        });

        // Compute Summary KPIs
        const totalUploaded = windowRecords.filter(r => r.isUploaded).length;
        const onTimeUploaded = windowRecords.filter(r => r.isUploaded && r.slaStatus === 'ON_TIME').length;
        const delayedUploaded = windowRecords.filter(r => r.isUploaded && r.slaStatus === 'DELAYED').length;
        const pendingOnTrack = windowRecords.filter(r => !r.isUploaded && r.slaStatus === 'PENDING_ON_TRACK').length;
        const pendingOverdue = windowRecords.filter(r => !r.isUploaded && r.slaStatus === 'PENDING_OVERDUE').length;
        const totalPending = pendingOnTrack + pendingOverdue;

        const onTimeRate = totalUploaded > 0 
            ? Number(((onTimeUploaded / totalUploaded) * 100).toFixed(1)) 
            : 0;

        // Average delay in days for late uploads
        const delayedList = windowRecords.filter(r => r.isUploaded && r.slaStatus === 'DELAYED');
        const avgDelayDays = delayedList.length > 0
            ? Number((delayedList.reduce((sum, r) => sum + r.varianceDays, 0) / delayedList.length).toFixed(1))
            : 0;

        // Build continuous month list across [start, end]
        const monthsList = [];
        const cur = new Date(start.getFullYear(), start.getMonth(), 1);
        const stop = new Date(end.getFullYear(), end.getMonth(), 1);

        while (cur <= stop) {
            const key = cur.toISOString().slice(0, 7);
            const label = cur.toLocaleString('en-US', { month: 'short', year: 'numeric' });
            monthsList.push({ key, label });
            cur.setMonth(cur.getMonth() + 1);
        }

        // Aggregate by month for the chart
        const monthlyMap = {};
        monthsList.forEach(m => {
            monthlyMap[m.key] = {
                month: m.key,
                label: m.label,
                totalUploads: 0,
                onTimeUploads: 0,
                delayedUploads: 0,
                pendingAssigned: 0,
                onTimeRate: 0,
            };
        });

        windowRecords.forEach(r => {
            if (monthlyMap[r.monthKey]) {
                if (r.isUploaded) {
                    monthlyMap[r.monthKey].totalUploads += 1;
                    if (r.slaStatus === 'ON_TIME') {
                        monthlyMap[r.monthKey].onTimeUploads += 1;
                    } else if (r.slaStatus === 'DELAYED') {
                        monthlyMap[r.monthKey].delayedUploads += 1;
                    }
                } else {
                    monthlyMap[r.monthKey].pendingAssigned += 1;
                }
            }
        });

        const monthlySeries = Object.values(monthlyMap).map(m => {
            const rate = m.totalUploads > 0 
                ? Number(((m.onTimeUploads / m.totalUploads) * 100).toFixed(1))
                : 0;
            return {
                ...m,
                onTimeRate: rate,
            };
        });

        // Top Jobs by Uploads
        const jobCounts = {};
        windowRecords.filter(r => r.isUploaded).forEach(r => {
            const j = r.jobNumber || 'N/A';
            jobCounts[j] = (jobCounts[j] || 0) + 1;
        });
        const topJobs = Object.entries(jobCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([job, count]) => ({ job, count }));

        // Top Uploaders / Assignees by Compliance
        const uploaderStats = {};
        windowRecords.forEach(r => {
            const u = r.uploaderName || 'Unassigned';
            if (!uploaderStats[u]) {
                uploaderStats[u] = { name: u, empId: r.uploaderEmpId, total: 0, uploaded: 0, onTime: 0, delayed: 0, overdue: 0 };
            }
            uploaderStats[u].total += 1;
            if (r.isUploaded) {
                uploaderStats[u].uploaded += 1;
                if (r.slaStatus === 'ON_TIME') uploaderStats[u].onTime += 1;
                if (r.slaStatus === 'DELAYED') uploaderStats[u].delayed += 1;
            } else if (r.slaStatus === 'PENDING_OVERDUE') {
                uploaderStats[u].overdue += 1;
            }
        });

        const topUploaders = Object.values(uploaderStats)
            .map(u => ({
                ...u,
                complianceRate: u.uploaded > 0 ? Number(((u.onTime / u.uploaded) * 100).toFixed(1)) : 0
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        return {
            dateRange: {
                start: start.toISOString(),
                end: end.toISOString(),
                displayLabel: `${start.toLocaleDateString('en-GB')} - ${end.toLocaleDateString('en-GB')}`
            },
            summary: {
                totalDocuments: windowRecords.length,
                totalUploaded,
                onTimeUploaded,
                delayedUploaded,
                pendingOnTrack,
                pendingOverdue,
                totalPending,
                onTimeRate,
                avgDelayDays,
            },
            monthlySeries,
            breakdown: {
                topJobs,
                topUploaders,
                slaDistribution: [
                    { name: 'On-Time Uploads', count: onTimeUploaded, color: '#10b981' },
                    { name: 'Delayed Uploads', count: delayedUploaded, color: '#ef4444' },
                    { name: 'Pending (On-Track)', count: pendingOnTrack, color: '#f59e0b' },
                    { name: 'Pending (Overdue)', count: pendingOverdue, color: '#dc2626' },
                ]
            }
        };
    }

    /**
     * Fetch paginated and filterable upload records for ProDataTable.
     */
    async getUploadRecords(company_id, options = {}) {
        const { start, end } = this._parseDateRange(options);
        const now = new Date();

        const rawDocs = await this._fetchCompanyDocuments(company_id);
        let records = rawDocs.map(doc => this._mapDocumentRecord(doc, now));

        // Date range filter
        records = records.filter(rec => {
            const dateToTest = rec.isUploaded ? rec.uploadedAt : rec.assignedAt;
            if (!dateToTest) return false;
            return dateToTest >= start && dateToTest <= end;
        });

        // Month filter (if user clicked a specific month bar)
        if (options.month) {
            records = records.filter(r => r.monthKey === options.month);
        }

        // Status Filter (from clickable KPI card)
        if (options.statusFilter && options.statusFilter !== 'ALL') {
            const filter = String(options.statusFilter).toUpperCase();
            if (filter === 'ON_TIME') {
                records = records.filter(r => r.slaStatus === 'ON_TIME');
            } else if (filter === 'DELAYED') {
                records = records.filter(r => r.slaStatus === 'DELAYED');
            } else if (filter === 'PENDING_ON_TRACK') {
                records = records.filter(r => r.slaStatus === 'PENDING_ON_TRACK');
            } else if (filter === 'PENDING_OVERDUE') {
                records = records.filter(r => r.slaStatus === 'PENDING_OVERDUE');
            } else if (filter === 'UPLOADED') {
                records = records.filter(r => r.isUploaded);
            } else if (filter === 'PENDING') {
                records = records.filter(r => !r.isUploaded);
            }
        }

        // Global search
        if (options.search && typeof options.search === 'string' && options.search.trim() !== '') {
            const term = options.search.toLowerCase().trim();
            records = records.filter(r =>
                r.documentNumber.toLowerCase().includes(term) ||
                r.documentName.toLowerCase().includes(term) ||
                r.jobNumber.toLowerCase().includes(term) ||
                r.customerName.toLowerCase().includes(term) ||
                r.uploaderName.toLowerCase().includes(term) ||
                r.poNumber.toLowerCase().includes(term)
            );
        }

        // Sorting
        const sortBy = options.sortBy || 'uploadedAt';
        const sortOrder = options.sortOrder === 'asc' ? 1 : -1;

        records.sort((a, b) => {
            let valA = a[sortBy];
            let valB = b[sortBy];

            if (valA instanceof Date) valA = valA.getTime();
            if (valB instanceof Date) valB = valB.getTime();

            if (valA === valB) return 0;
            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;

            return valA > valB ? sortOrder : -sortOrder;
        });

        // Pagination
        const totalRecords = records.length;
        const page = Math.max(1, parseInt(options.page || 1, 10));
        const pageSize = Math.max(1, parseInt(options.limit || options.pageSize || 10, 10));
        const totalPages = Math.ceil(totalRecords / pageSize);
        const startIndex = (page - 1) * pageSize;
        const paginatedData = records.slice(startIndex, startIndex + pageSize);

        return {
            data: paginatedData,
            meta: {
                total: totalRecords,
                totalPages: totalPages || 1,
                page,
                limit: pageSize,
            },
            totalRecords,
            totalPages: totalPages || 1,
            currentPage: page,
            pageSize,
        };
    }

    /**
     * Generates an Excel report of the upload records.
     */
    async exportUploadRecords(company_id, options = {}) {
        const result = await this.getUploadRecords(company_id, {
            ...options,
            page: 1,
            pageSize: 100000, // Export all matching
        });

        const rows = result.data.map((r, idx) => ({
            sr_no: idx + 1,
            document_number: r.documentNumber,
            document_name: r.documentName,
            version: `v${r.versionNo}`,
            job_numbers: r.jobNumber,
            customer: r.customerName,
            po_number: r.poNumber,
            assigned_uploader: r.uploaderName,
            assigned_at: r.assignedAt ? r.assignedAt.toISOString().slice(0, 10) : 'N/A',
            sla_days: r.uploadDueDays !== null ? `${r.uploadDueDays} Days` : 'N/A',
            planned_deadline: r.plannedDeadline ? r.plannedDeadline.toISOString().slice(0, 10) : 'N/A',
            actual_upload_date: r.uploadedAt ? r.uploadedAt.toISOString().slice(0, 10) : 'Pending',
            sla_status: r.slaStatus,
            sla_details: r.slaLabel,
            variance_days: r.varianceDays !== 0 ? `${r.varianceDays > 0 ? `+${r.varianceDays}` : r.varianceDays} Days` : '0',
            workflow_status: r.currentWorkflowStatus,
        }));

        const columns = [
            { header: 'Sr No', key: 'sr_no', width: 8 },
            { header: 'Document Number', key: 'document_number', width: 22 },
            { header: 'Document Name', key: 'document_name', width: 32 },
            { header: 'Version', key: 'version', width: 10 },
            { header: 'Job Number', key: 'job_numbers', width: 22 },
            { header: 'Customer', key: 'customer', width: 26 },
            { header: 'PO Number', key: 'po_number', width: 18 },
            { header: 'Assigned Engineer', key: 'assigned_uploader', width: 24 },
            { header: 'Assigned Date', key: 'assigned_at', width: 15 },
            { header: 'SLA Days', key: 'sla_days', width: 12 },
            { header: 'Planned Deadline', key: 'planned_deadline', width: 16 },
            { header: 'Actual Upload Date', key: 'actual_upload_date', width: 18 },
            { header: 'SLA Status', key: 'sla_status', width: 18 },
            { header: 'SLA Evaluation', key: 'sla_details', width: 24 },
            { header: 'Variance (Days)', key: 'variance_days', width: 15 },
            { header: 'Workflow Status', key: 'workflow_status', width: 18 },
        ];

        return await ExcelGenerator.generateReport([
            {
                name: 'DMS Upload Tracking',
                columns,
                data: rows,
            }
        ]);
    }
}

module.exports = new DmsDashboardService();
