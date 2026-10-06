const prisma = require('#prisma');

class MhcService {
    /**
     * List material heat charts with pagination and search
     */
    async list(company_id, params = {}, user = null) {
        const {
            page = 1,
            limit = 10,
            search = '',
            sortBy = 'updatedAt',
            sortOrder = 'desc'
        } = params;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const where = {
            company_id,
            is_deleted: false
        };

        if (search) {
            where.OR = [
                { msn: { contains: search, mode: 'insensitive' } },
                { client: { contains: search, mode: 'insensitive' } },
                { po_no: { contains: search, mode: 'insensitive' } },
                { report_no: { contains: search, mode: 'insensitive' } },
            ];
        }

        const cFilters = params.columnFilters || {};
        if (cFilters.msn) where.msn = this._processFilter(cFilters.msn);
        if (cFilters.client) where.client = this._processFilter(cFilters.client);
        if (cFilters.po_no) where.po_no = this._processFilter(cFilters.po_no);
        if (cFilters.status) where.status = this._processFilter(cFilters.status);

        if (cFilters.is_active) {
            const activeStatus = Array.isArray(cFilters.is_active) ? cFilters.is_active : cFilters.is_active.split(',').map(v => v.trim());
            if (activeStatus.length === 1) {
                where.is_active = activeStatus[0] === 'true';
            }
        }

        if (cFilters.date) {
            const dateValues = Array.isArray(cFilters.date) ? cFilters.date : cFilters.date.split(',').map(v => v.trim());
            if (dateValues.includes('today')) {
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);
                where.updatedAt = { gte: startOfToday };
            }
        }

        // Role-based visibility
        if (user && (user.roles || user.role)) {
            const userRoles = user.roles || user.role;
            const roles = Array.isArray(userRoles) ? userRoles : [userRoles];
            const isPE = roles.includes('PRODUCTION_ENGINEER');
            const isQE = roles.includes('QC_ENGINEER') || roles.includes('QUALITY_ENGINEER');
            const isAdmin = roles.includes('ADMIN');

            if (isPE && !isAdmin && !isQE) {
                // Production Engineers should not see Draft MHCs
                if (where.status) {
                    where.AND = [
                        { status: where.status },
                        { status: { not: 'Draft' } }
                    ];
                    delete where.status;
                } else {
                    where.status = { not: 'Draft' };
                }
            }
        }

        const [total, data] = await prisma.$transaction([
            prisma.material_heat_chart.count({ where }),
            prisma.material_heat_chart.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    production_group: { select: { id: true, name: true } },
                    qc_group: { select: { id: true, name: true } },
                    production_engineer: { select: { id: true, name: true, empid: true } },
                    qc_engineer: { select: { id: true, name: true, empid: true } },
                    _count: {
                        select: {
                            items: {
                                where: { is_current: true }
                            }
                        }
                    }
                }
            }),
        ]);

        return {
            data,
            meta: {
                total,
                page: Number(page),
                limit: take,
                totalPages: Math.ceil(total / take),
            },
        };
    }

    async getFilters(company_id, user = null) {
        const where = {
            company_id,
            is_deleted: false
        };

        if (user && user.roles) {
            const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
            const isPE = roles.includes('PRODUCTION_ENGINEER');
            const isQE = roles.includes('QUALITY_ENGINEER');
            const isAdmin = roles.includes('ADMIN');

            if (isPE && !isAdmin && !isQE) {
                where.status = { not: 'Draft' };
            }
        }

        const rawData = await prisma.material_heat_chart.findMany({
            where,
            select: { msn: true, client: true, po_no: true, status: true, is_active: true }
        });
        const records = [];
        const seen = new Set();
        for (const item of rawData) {
            const key = `${item.msn}|${item.client}|${item.po_no}|${item.status}|${item.is_active}`;
            if (!seen.has(key)) { seen.add(key); records.push(item); }
        }
        return { records };
    }

    async toggleStatus(company_id, id) {
        const mhc = await prisma.material_heat_chart.findFirst({
            where: { id, company_id },
            select: { is_active: true }
        });
        if (!mhc) throw new Error('Material Heat Chart not found');

        return await prisma.material_heat_chart.update({
            where: { id },
            data: { is_active: !mhc.is_active }
        });
    }

    async archive(company_id, id) {
        const mhc = await prisma.material_heat_chart.findFirst({ where: { id, company_id } });
        if (!mhc) throw new Error('Material Heat Chart not found');

        return await prisma.material_heat_chart.update({
            where: { id },
            data: { is_deleted: true }
        });
    }

    _processFilter(value) {
        if (!value) return undefined;
        if (Array.isArray(value)) {
            if (value.length === 0) return undefined;
            return { in: value.map(v => v.toString()) };
        }
        if (typeof value === 'string' && value.trim() === '') return undefined;
        return { contains: value.toString(), mode: 'insensitive' };
    }

    /**
     * QC Initiate MHC (Stage 1)
     */
    async initiate(company_id, body, creator_id) {
        const {
            job_id,
            shreno_drg_no,
            customer_drg_no,
            inspection_by,
            project_id,
            code,
            production_group_id,
            production_engineer_id,
            qc_group_id,
            items = [],
        } = body;

        if (!job_id) throw new Error('job_id is required');

        // Fetch job with relations to extract basic info
        const job = await prisma.job.findFirst({
            where: { id: job_id, company_id },
            include: {
                customer: { select: { customer_name: true } },
                po: { select: { po_number: true } },
            },
        });

        if (!job) throw new Error('Job not found');

        return await prisma.$transaction(async (tx) => {
            // Calculate next serial_no for this job
            const lastMhc = await tx.material_heat_chart.findFirst({
                where: { company_id },
                orderBy: { serial_no: 'desc' },
                select: { serial_no: true }
            });

            const nextSerialNo = lastMhc ? lastMhc.serial_no + 1 : 1;
            const paddedSerial = String(nextSerialNo).padStart(4, '0');
            const reportNo = `SHR/${job.job_number}/MHC/${paddedSerial}`;

            // Create header record
            const header = await tx.material_heat_chart.create({
                data: {
                    company_id,
                    job_id,
                    serial_no: nextSerialNo,
                    report_no: reportNo,
                    msn: job.job_number,
                    client: job.customer?.customer_name || '',
                    po_no: job.po?.po_number || '',
                    project_id: project_id || null,
                    equipment_name: job.equipement_name || null,
                    tag_no: job.tag_number || null,
                    code: code || null,
                    shreno_drg_no: shreno_drg_no || null,
                    customer_drg_no: customer_drg_no || null,
                    inspection_by: inspection_by || null,
                    status: body.status || 'Initiated',
                    production_group_id: production_group_id || null,
                    production_engineer_id: production_engineer_id || null,
                    qc_group_id: qc_group_id || null,
                    qc_engineer_id: null,
                    submitted_at: new Date(),
                },
            });

            // Create item rows
            if (items.length > 0) {
                const itemsToCreate = [];
                let currentHeadingText = null;

                items.forEach((item, idx) => {
                    if (item.is_heading) {
                        currentHeadingText = item.heading_text || item.itemNo || item.item_no || "HEADING";
                    }

                    itemsToCreate.push({
                        mhc_id: header.id,
                        sort_order: idx,
                        is_heading: item.is_heading || false,
                        heading_text: item.is_heading ? currentHeadingText : (item.heading_text || currentHeadingText),
                        parent_heading_id: item.parent_heading_id ? String(item.parent_heading_id) : null,
                        item_no: item.itemNo || item.item_no || null,
                        description: item.description || null,
                        size: item.size || null,
                        material_spec: item.materialSpecification || item.material_spec || null,
                        quantity_unit: item.quantityUnit || item.quantity_unit || null,
                        heat_no: item.heatNo || item.heat_no || null,
                        grn_app_ap_no: item.grnAppApNo || item.grn_app_ap_no || null,
                        mtr_no: item.mtrNo || item.mtr_no || null,
                        manufacturer: item.manufacturerName || item.manufacturer || null,
                        remarks: item.remarks || null,
                        version: 1,
                        is_current: true,
                        action_by_id: creator_id,
                        production_engineer_id: null, // STRICT RULE 1: Never insert on initiate
                        qc_engineer_id: null          // STRICT RULE 1: Never insert on initiate
                    });
                });

                if (itemsToCreate.length > 0) {
                    await tx.material_heat_chart_item.createMany({ data: itemsToCreate });
                }
            }

            // Return with items
            return tx.material_heat_chart.findUnique({
                where: { id: header.id },
                include: {
                    items: {
                        where: { is_current: true },
                        orderBy: { sort_order: 'asc' }
                    },
                    production_group: { select: { id: true, name: true } },
                    qc_group: { select: { id: true, name: true } },
                    production_engineer: { select: { id: true, name: true, empid: true } },
                    qc_engineer: { select: { id: true, name: true, empid: true } },
                },
            });
        });
    }

    /**
     * PROD Offer MHC (Stage 2)
     * Updates Heat/GRN data for specific items
     */
    async offer(company_id, id, body, user_id) {
        const { items = [] } = body;

        const existing = await prisma.material_heat_chart.findFirst({
            where: { id, company_id }
        });

        if (!existing) throw new Error('Material Heat Chart not found');

        return await prisma.$transaction(async (tx) => {
            for (const item of items) {
                // Try to find by ID first, then fallback to sort_order
                let targetId = item.id;

                if (!targetId && item.sort_order !== undefined) {
                    const found = await tx.material_heat_chart_item.findFirst({
                        where: { mhc_id: id, sort_order: item.sort_order, is_current: true },
                        select: { id: true }
                    });
                    if (found) targetId = found.id;
                }

                if (!targetId) continue;

                // Fetch current item state for versioning and locking check
                const currentItem = await tx.material_heat_chart_item.findUnique({
                    where: { id: targetId }
                });

                if (!currentItem || currentItem.qc_status === 'Approved') continue;

                const newHeatNo = item.heat_no || item.heatNo || null;
                const newGrnAppApNo = item.grn_app_ap_no || item.grnAppApNo || null;
                const newRemarks = item.remarks || null;
                const newMtrNo = item.mtr_no || null;
                const newManufacturer = item.manufacturer || null;

                const oldHeatNo = currentItem.heat_no || null;
                const oldGrn = currentItem.grn_app_ap_no || null;
                const oldRemarks = currentItem.remarks || null;
                const oldMtrNo = currentItem.mtr_no || null;
                const oldManufacturer = currentItem.manufacturer || null;

                const prodChanged = newHeatNo !== oldHeatNo || 
                                    newGrnAppApNo !== oldGrn ||
                                    ((newHeatNo || newGrnAppApNo) && !currentItem.production_engineer_id);
                const anyChanged = prodChanged || newRemarks !== oldRemarks || newMtrNo !== oldMtrNo || newManufacturer !== oldManufacturer || !currentItem.production_engineer_id;

                // CRITICAL FIX: If no fields were changed by the user, DO NOT touch this item.
                // This ensures rejected items keep their original QC names and remarks if untouched.
                if (!anyChanged) continue;

                // VERSIONING LOGIC: If item was previously Rejected, archive it and create new version
                if (currentItem.qc_status === 'Rejected') {
                    // 1. Archive rejected version (this preserves the old qc_remarks in history)
                    await tx.material_heat_chart_item.update({
                        where: { id: targetId },
                        data: { is_current: false }
                    });

                    // 2. Create new version for correction (clearing qc_remarks for a fresh review)
                    await tx.material_heat_chart_item.create({
                        data: {
                            mhc_id: id,
                            sort_order: item.sort_order ?? currentItem.sort_order,
                            is_heading: currentItem.is_heading,
                            heading_text: currentItem.heading_text,
                            parent_heading_id: currentItem.parent_heading_id,
                            item_no: currentItem.item_no,
                            description: currentItem.description,
                            size: currentItem.size,
                            material_spec: currentItem.material_spec,
                            quantity_unit: currentItem.quantity_unit,
                            heat_no: newHeatNo,
                            grn_app_ap_no: newGrnAppApNo,
                            mtr_no: newMtrNo,
                            manufacturer: newManufacturer,
                            remarks: newRemarks,
                            qc_status: 'Pending', // Reset to pending for QC re-review
                            qc_remarks: null,     // CLEAR REMARKS: Fresh start for QC
                            qc_engineer_id: null, // CLEAR QC ENGINEER: Fresh start for QC
                            qc_date: null,        // CLEAR QC DATE
                            version: currentItem.version + 1,
                            is_current: true,
                            parent_item_id: currentItem.parent_item_id || currentItem.id,
                            production_engineer_id: prodChanged ? user_id : currentItem.production_engineer_id,
                            production_date: prodChanged ? new Date() : currentItem.production_date,
                            action_by_id: user_id
                        }
                    });
                } else {
                    // Standard update for Pending/Initiated items
                    await tx.material_heat_chart_item.update({
                        where: { id: targetId },
                        data: {
                            heat_no: newHeatNo,
                            grn_app_ap_no: newGrnAppApNo,
                            qc_status: 'Pending',
                            qc_remarks: null, // CLEAR REMARKS: Ensure no stale data
                            qc_engineer_id: null, // CLEAR QC ENGINEER: Fresh start
                            qc_date: null,
                            remarks: newRemarks,
                            mtr_no: newMtrNo,
                            manufacturer: newManufacturer,
                            production_engineer_id: prodChanged ? user_id : currentItem.production_engineer_id,
                            production_date: prodChanged ? new Date() : currentItem.production_date,
                            action_by_id: user_id
                        }
                    });
                }
            }

            return await tx.material_heat_chart.update({
                where: { id },
                data: {
                    status: 'Offered',
                    production_engineer_id: user_id,
                    submitted_at: new Date()
                },
                include: {
                    items: {
                        where: { is_current: true },
                        orderBy: { sort_order: 'asc' }
                    }
                }
            });
        });
    }

    /**
     * QC Finalize MHC (Stage 3)
     * Updates MTR/Manufacturer and approves the report
     */
    async finalize(company_id, id, body, user_id) {
        const { items = [], approver_remarks } = body;

        const existing = await prisma.material_heat_chart.findFirst({
            where: { id, company_id }
        });

        if (!existing) throw new Error('Material Heat Chart not found');

        return await prisma.$transaction(async (tx) => {
            for (const item of items) {
                if (!item.id) continue;

                // Fetch current item state to prevent overwriting approved data
                const currentItem = await tx.material_heat_chart_item.findUnique({
                    where: { id: item.id }
                });

                if (!currentItem) continue;

                const newMtrNo = item.mtr_no || null;
                const newManufacturer = item.manufacturer || null;
                const newRemarks = item.remarks || null;
                const newQcStatus = item.qc_status || 'Approved';
                const newQcRemarks = item.qc_remarks || null;
                const newHeatNo = item.heat_no || null;
                const newGrnAppApNo = item.grn_app_ap_no || null;

                const oldMtrNo = currentItem.mtr_no || null;
                const oldManufacturer = currentItem.manufacturer || null;
                const oldRemarks = currentItem.remarks || null;
                const oldQcStatus = currentItem.qc_status || 'Pending';
                const oldQcRemarks = currentItem.qc_remarks || null;
                const oldHeatNo = currentItem.heat_no || null;
                const oldGrn = currentItem.grn_app_ap_no || null;

                const qcChanged = newMtrNo !== oldMtrNo || 
                                   newManufacturer !== oldManufacturer || 
                                   newRemarks !== oldRemarks || 
                                   newQcStatus !== oldQcStatus || 
                                   newQcRemarks !== oldQcRemarks ||
                                   newHeatNo !== oldHeatNo ||
                                   newGrnAppApNo !== oldGrn ||
                                   (newQcStatus !== 'Pending' && !currentItem.qc_engineer_id);

                const prodChanged = newHeatNo !== oldHeatNo || newGrnAppApNo !== oldGrn || ((newHeatNo || newGrnAppApNo) && !currentItem.production_engineer_id);

                await tx.material_heat_chart_item.update({
                    where: { id: item.id },
                    data: {
                        mtr_no: newMtrNo,
                        manufacturer: newManufacturer,
                        remarks: newRemarks,
                        heat_no: newHeatNo,
                        grn_app_ap_no: newGrnAppApNo,
                        qc_status: newQcStatus,
                        qc_remarks: newQcRemarks,
                        qc_engineer_id: qcChanged ? user_id : currentItem.qc_engineer_id,
                        qc_date: qcChanged ? new Date() : currentItem.qc_date,
                        action_by_id: qcChanged ? user_id : currentItem.action_by_id,
                        ...(prodChanged ? {
                            production_engineer_id: user_id,
                            production_date: new Date()
                        } : {})
                    }
                });
            }

            // Verify ALL items are approved before finalizing
            const allItems = await tx.material_heat_chart_item.findMany({
                where: { mhc_id: id, is_current: true }
            });

            const unapprovedItems = allItems.filter(i => !i.is_heading && i.qc_status !== 'Approved');
            if (unapprovedItems.length > 0) {
                throw new Error(`Cannot finalize: ${unapprovedItems.length} items are not yet approved by QC.`);
            }

            return await tx.material_heat_chart.update({
                where: { id },
                data: {
                    status: 'Approved',
                    qc_engineer_id: user_id,
                    approved_at: new Date(),
                    approver_remarks: approver_remarks || null
                },
                include: {
                    items: {
                        where: { is_current: true },
                        orderBy: { sort_order: 'asc' }
                    }
                }
            });
        });
    }

    /**
     * QC Save Review Decisions (Granular)
     */
    async saveReview(company_id, id, body, user_id) {
        const { items = [], approver_remarks } = body;

        const existing = await prisma.material_heat_chart.findFirst({
            where: { id, company_id }
        });

        if (!existing) throw new Error('Material Heat Chart not found');

        return await prisma.$transaction(async (tx) => {
            let hasRejections = false;

            for (const item of items) {
                if (!item.id) continue;

                // Fetch current item state to prevent overwriting approved data
                const currentItem = await tx.material_heat_chart_item.findUnique({
                    where: { id: item.id }
                });

                if (!currentItem) continue;

                const status = item.qc_status || 'Pending';
                if (status === 'Rejected') hasRejections = true;
                const newMtrNo = item.mtr_no || null;
                const newManufacturer = item.manufacturer || null;
                const newRemarks = item.remarks || null;
                const newQcRemarks = item.qc_remarks || null;
                const newHeatNo = item.heat_no || null;
                const newGrnAppApNo = item.grn_app_ap_no || null;

                const oldMtrNo = currentItem.mtr_no || null;
                const oldManufacturer = currentItem.manufacturer || null;
                const oldRemarks = currentItem.remarks || null;
                const oldQcStatus = currentItem.qc_status || 'Pending';
                const oldQcRemarks = currentItem.qc_remarks || null;
                const oldHeatNo = currentItem.heat_no || null;
                const oldGrn = currentItem.grn_app_ap_no || null;

                const qcChanged = newMtrNo !== oldMtrNo || 
                                   newManufacturer !== oldManufacturer || 
                                   newRemarks !== oldRemarks || 
                                   status !== oldQcStatus || 
                                   newQcRemarks !== oldQcRemarks ||
                                   newHeatNo !== oldHeatNo ||
                                   newGrnAppApNo !== oldGrn ||
                                   (status !== 'Pending' && !currentItem.qc_engineer_id);

                const prodChanged = newHeatNo !== oldHeatNo || newGrnAppApNo !== oldGrn || ((newHeatNo || newGrnAppApNo) && !currentItem.production_engineer_id);

                // Business Rule: A Pending item should NEVER have a QC stamp, even if draft remarks were entered.
                const shouldClearQcStamp = status === 'Pending';

                await tx.material_heat_chart_item.update({
                    where: { id: item.id },
                    data: {
                        qc_status: status,
                        qc_remarks: newQcRemarks,
                        mtr_no: newMtrNo,
                        manufacturer: newManufacturer,
                        remarks: newRemarks,
                        heat_no: newHeatNo,
                        grn_app_ap_no: newGrnAppApNo,
                        qc_engineer_id: shouldClearQcStamp ? null : (qcChanged ? user_id : currentItem.qc_engineer_id),
                        qc_date: shouldClearQcStamp ? null : (qcChanged ? new Date() : currentItem.qc_date),
                        action_by_id: qcChanged ? user_id : currentItem.action_by_id,
                        ...(prodChanged ? {
                            production_engineer_id: user_id,
                            production_date: new Date()
                        } : {})
                    }
                });
            }

            // If there are rejections, set the overall status to Rejected to alert Production
            // Otherwise keep it Offered so QC can continue reviewing or Finalize later
            const newStatus = hasRejections ? 'Rejected' : 'Offered';

            return await tx.material_heat_chart.update({
                where: { id },
                data: {
                    status: newStatus,
                    qc_engineer_id: user_id,
                    rejected_at: hasRejections ? new Date() : undefined,
                    approver_remarks: approver_remarks || null
                },
                include: {
                    items: {
                        where: { is_current: true },
                        orderBy: { sort_order: 'asc' }
                    }
                }
            });
        });
    }

    /**
     * QC Reject Item (Selective Versioning)
     * Archives current item and creates a new version for PROD to re-offer
     */
    async rejectItem(company_id, mhc_id, item_id, remarks, user_id) {
        return await prisma.$transaction(async (tx) => {
            const currentItem = await tx.material_heat_chart_item.findUnique({
                where: { id: item_id }
            });

            if (!currentItem) throw new Error('Item not found');

            // Archive current
            await tx.material_heat_chart_item.update({
                where: { id: item_id },
                data: { is_current: false }
            });

            // Create new version
            const newVersion = await tx.material_heat_chart_item.create({
                data: {
                    mhc_id,
                    sort_order: currentItem.sort_order,
                    is_heading: currentItem.is_heading,
                    heading_text: currentItem.heading_text,
                    parent_heading_id: currentItem.parent_heading_id,
                    item_no: currentItem.item_no,
                    description: currentItem.description,
                    size: currentItem.size,
                    material_spec: currentItem.material_spec,
                    quantity_unit: currentItem.quantity_unit,
                    // Keep QC fields but reset PROD fields for correction
                    heat_no: null,
                    grn_app_ap_no: null,
                    remarks: remarks || null,
                    version: currentItem.version + 1,
                    is_current: true,
                    parent_item_id: currentItem.parent_item_id || currentItem.id,
                    action_by_id: user_id
                }
            });

            // Set report back to REJECTED (overall)
            await tx.material_heat_chart.update({
                where: { id: mhc_id },
                data: { status: 'Rejected', rejected_at: new Date(), approver_remarks: remarks }
            });

            return newVersion;
        });
    }

    /**
     * Request Revision (Post-Approval)
     * Archives approved item and creates a new version for editing
     */
    async requestRevision(company_id, mhc_id, item_id, remarks, user_id) {
        return await prisma.$transaction(async (tx) => {
            const currentItem = await tx.material_heat_chart_item.findUnique({
                where: { id: item_id }
            });

            if (!currentItem) throw new Error('Item not found');
            if (!currentItem.is_current) throw new Error('Can only revise the current version');

            // Archive current
            await tx.material_heat_chart_item.update({
                where: { id: item_id },
                data: { is_current: false }
            });

            // Create new version (resetting all fields for full re-evaluation if needed, or keep them)
            const newVersion = await tx.material_heat_chart_item.create({
                data: {
                    mhc_id,
                    sort_order: currentItem.sort_order,
                    is_heading: currentItem.is_heading,
                    heading_text: currentItem.heading_text,
                    parent_heading_id: currentItem.parent_heading_id,
                    item_no: currentItem.item_no,
                    description: currentItem.description,
                    size: currentItem.size,
                    material_spec: currentItem.material_spec,
                    quantity_unit: currentItem.quantity_unit,
                    heat_no: currentItem.heat_no,
                    grn_app_ap_no: currentItem.grn_app_ap_no,
                    mtr_no: currentItem.mtr_no,
                    manufacturer: currentItem.manufacturer,
                    remarks: remarks || currentItem.remarks,
                    version: currentItem.version + 1,
                    is_current: true,
                    parent_item_id: currentItem.parent_item_id || currentItem.id,
                    action_by_id: user_id
                }
            });

            // Set report back to REJECTED or INITIATED to allow editing
            await tx.material_heat_chart.update({
                where: { id: mhc_id },
                data: { status: 'Rejected', approver_remarks: `Revision Requested: ${remarks}` }
            });

            return newVersion;
        });
    }

    /**
     * Bulk create MHC records from Excel grouped data
     */
    async bulkCreate(company_id, reports, creator_id) {
        if (!Array.isArray(reports) || reports.length === 0) throw new Error('No report data provided');

        const results = [];
        for (const report of reports) {
            try {
                // Determine job_id from msn if not provided
                if (!report.job_id && report.msn) {
                    const job = await prisma.job.findFirst({
                        where: { job_number: String(report.msn), company_id },
                        select: { id: true }
                    });
                    if (job) report.job_id = job.id;
                }

                if (report.job_id) {
                    // Strict Validation: Production Engineer is required for MHC reports
                    if (!report.production_engineer_id) {
                        console.log(`[MhcService] Skipping report for Job ${report.msn}: Production Engineer ID is required.`);
                        continue;
                    }

                    // Auto-resolve Production Group
                    const prodGroup = await prisma.user_employee_group.findFirst({
                        where: {
                            user_id: report.production_engineer_id,
                            employee_group: { group_type: "PRODUCTION" }
                        },
                        select: { employee_group_id: true }
                    });
                    if (prodGroup) {
                        report.production_group_id = prodGroup.employee_group_id;
                    }

                    // Auto-resolve QC Group for the uploader
                    const qcGroup = await prisma.user_employee_group.findFirst({
                        where: {
                            user_id: creator_id,
                            employee_group: { group_type: "QUALITY" }
                        },
                        select: { employee_group_id: true }
                    });
                    if (qcGroup) {
                        report.qc_group_id = qcGroup.employee_group_id;
                    }

                    // Deduplication: Check if an active report with same Job and Shreno Drawing Number already exists
                    if (report.shreno_drg_no) {
                        const existing = await prisma.material_heat_chart.findFirst({
                            where: {
                                job_id: report.job_id,
                                shreno_drg_no: String(report.shreno_drg_no).trim(),
                                company_id,
                                is_deleted: false
                            },
                            select: { id: true }
                        });
                        if (existing) {
                            console.log(`[MhcService] MHC already exists for Job ${report.msn} and Drawing ${report.shreno_drg_no}. Checking for new items to append.`);
                            
                            // 1. Fetch existing items for this MHC
                            const existingItems = await prisma.material_heat_chart_item.findMany({
                                where: { mhc_id: existing.id, is_current: true },
                                select: { item_no: true, description: true, size: true, is_heading: true, heading_text: true, sort_order: true }
                            });

                            // 2. Filter out items from report.items that are already in existingItems
                            const newItemsToInsert = (report.items || []).filter(incomingItem => {
                                const isDuplicate = existingItems.some(exItem => {
                                    if (exItem.is_heading && incomingItem.is_heading) {
                                        return String(exItem.heading_text || "").trim().toLowerCase() === String(incomingItem.heading_text || "").trim().toLowerCase();
                                    } else if (!exItem.is_heading && !incomingItem.is_heading) {
                                        return String(exItem.item_no || "").trim().toLowerCase() === String(incomingItem.item_no || "").trim().toLowerCase() &&
                                               String(exItem.description || "").trim().toLowerCase() === String(incomingItem.description || "").trim().toLowerCase() &&
                                               String(exItem.size || "").trim().toLowerCase() === String(incomingItem.size || "").trim().toLowerCase();
                                    }
                                    return false;
                                });
                                return !isDuplicate;
                            });

                            // 3. Insert new items if any
                            if (newItemsToInsert.length > 0) {
                                const maxSortOrder = existingItems.length > 0 ? Math.max(...existingItems.map(i => i.sort_order || 0)) : 0;
                                await prisma.material_heat_chart_item.createMany({
                                    data: newItemsToInsert.map((item, index) => ({
                                        mhc_id: existing.id,
                                        is_heading: item.is_heading || false,
                                        heading_text: item.heading_text || null,
                                        item_no: item.item_no || null,
                                        description: item.description || null,
                                        material_spec: item.materialSpecification || null,
                                        size: item.size || null,
                                        quantity_unit: item.quantityUnit || null,
                                        qc_status: "Pending",
                                        version: 1,
                                        is_current: true,
                                        sort_order: maxSortOrder + index + 1
                                    }))
                                });

                                await prisma.material_heat_chart.update({
                                    where: { id: existing.id },
                                    data: { updatedAt: new Date() }
                                });

                                console.log(`[MhcService] Appended ${newItemsToInsert.length} new items to existing MHC ${existing.id}`);
                                results.push({ id: existing.id, appended: newItemsToInsert.length, action: "appended" });
                            } else {
                                console.log(`[MhcService] No new items found to append.`);
                            }
                            continue;
                        }
                    }

                    const created = await this.initiate(company_id, report, creator_id);
                    results.push(created);
                }
            } catch (err) {
                console.error(`[MhcService] Failed to create bulk report for MSN ${report.msn}:`, err);
                // Continue with others
            }
        }
        return results;
    }

    /**
     * Update an existing MHC record
     */
    async update(company_id, id, body, user_id) {
        const {
            shreno_drg_no,
            customer_drg_no,
            inspection_by,
            project_id,
            code,
            tag_no,
            production_group_id,
            production_engineer_id,
            qc_group_id,
            qc_engineer_id,
            status,
            items = [],
        } = body;

        const existing = await prisma.material_heat_chart.findFirst({
            where: { id, company_id }
        });

        if (!existing) throw new Error('Material Heat Chart not found');
        if (existing.status === 'Approved') throw new Error('Cannot edit an approved report');

        return await prisma.$transaction(async (tx) => {
            // Update header
            const updatedHeader = await tx.material_heat_chart.update({
                where: { id },
                data: {
                    shreno_drg_no,
                    customer_drg_no,
                    inspection_by,
                    project_id,
                    code,
                    tag_no,
                    production_group_id: production_group_id !== undefined ? production_group_id : existing.production_group_id,
                    production_engineer_id,
                    qc_group_id: qc_group_id !== undefined ? qc_group_id : existing.qc_group_id,
                    qc_engineer_id,
                    status: status || existing.status,
                    submitted_at: (status === 'Initiated' && existing.status === 'Draft') ? new Date() : existing.submitted_at,
                }
            });

            // Handle items: Smart Sync
            if (items.length > 0) {
                const existingItems = await tx.material_heat_chart_item.findMany({
                    where: { mhc_id: id, is_current: true }
                });

                const existingMap = new Map(existingItems.map(i => [i.id, i]));
                const incomingIds = new Set(items.filter(i => i.id).map(i => i.id));

                // 1. Delete items that are NOT in incoming list and NOT Approved
                await tx.material_heat_chart_item.deleteMany({
                    where: {
                        mhc_id: id,
                        is_current: true,
                        id: { notIn: Array.from(incomingIds) },
                        qc_status: { not: 'Approved' }
                    }
                });

                // 2. Process incoming items
                let currentHeadingText = null;
                for (const [idx, item] of items.entries()) {
                    const isHeading = item.isHeading || item.is_heading || false;
                    if (isHeading) {
                        currentHeadingText = item.heading_text || item.itemNo || item.item_no || "HEADING";
                    }

                    const isPending = (item.qcStatus || item.qc_status || 'Pending').toUpperCase() === 'PENDING';

                    const data = {
                        sort_order: idx,
                        is_heading: isHeading,
                        heading_text: isHeading ? currentHeadingText : (item.heading_text || currentHeadingText),
                        parent_heading_id: item.parent_heading_id ? String(item.parent_heading_id) : null,
                        item_no: item.itemNo || item.item_no || null,
                        description: item.description || null,
                        size: item.size || null,
                        material_spec: item.materialSpecification || item.material_spec || null,
                        quantity_unit: item.quantityUnit || item.quantity_unit || null,
                        heat_no: item.heatNo || item.heat_no || null,
                        grn_app_ap_no: item.grnAppApNo || item.grn_app_ap_no || null,
                        mtr_no: item.mtrNo || item.mtr_no || null,
                        manufacturer: item.manufacturerName || item.manufacturer || null,
                        remarks: item.remarks || null,
                        qc_status: item.qcStatus || item.qc_status || 'Pending',
                        qc_remarks: isPending ? null : (item.qcRemarks || item.qc_remarks || null),
                    };

                    if (item.id && existingMap.has(item.id)) {
                        // Update existing (unless Approved)
                        const current = existingMap.get(item.id);
                        if (current.qc_status !== 'Approved') {
                            const oldHeatNo = current.heat_no || null;
                            const oldGrn = current.grn_app_ap_no || null;
                            const prodChanged = (data.heat_no || null) !== oldHeatNo || 
                                                (data.grn_app_ap_no || null) !== oldGrn ||
                                                ((data.heat_no || data.grn_app_ap_no) && !current.production_engineer_id);
                            if (prodChanged && user_id) {
                                data.action_by_id = user_id;
                            }
                            
                            const oldMtrNo = current.mtr_no || null;
                            const oldManufacturer = current.manufacturer || null;
                            const oldRemarks = current.remarks || null;
                            const oldQcStatus = current.qc_status || 'Pending';
                            const oldQcRemarks = current.qc_remarks || null;

                            const qcChanged = (data.mtr_no || null) !== oldMtrNo || 
                                              (data.manufacturer || null) !== oldManufacturer || 
                                              (data.remarks || null) !== oldRemarks || 
                                              (data.qc_status || 'Pending') !== oldQcStatus || 
                                              (data.qc_remarks || null) !== oldQcRemarks;
                            if (qcChanged && user_id) {
                                data.action_by_id = user_id;
                            }

                            await tx.material_heat_chart_item.update({
                                where: { id: item.id },
                                data
                            });
                        }
                    } else {
                        // Create new
                        if (user_id) {
                            data.action_by_id = user_id;
                            data.production_engineer_id = null;
                            data.qc_engineer_id = null;
                        }
                        await tx.material_heat_chart_item.create({
                            data: {
                                ...data,
                                mhc_id: id,
                                version: 1,
                                is_current: true
                            }
                        });
                    }
                }
            }

            return tx.material_heat_chart.findUnique({
                where: { id },
                include: {
                    items: { orderBy: { sort_order: 'asc' } },
                    production_engineer: { select: { id: true, name: true, empid: true } },
                    qc_engineer: { select: { id: true, name: true, empid: true } },
                }
            });
        });
    }

    /**
     * Update status (Approve/Reject)
     */
    async updateStatus(company_id, id, { status, remarks, user_id }) {
        const existing = await prisma.material_heat_chart.findFirst({
            where: { id, company_id }
        });

        if (!existing) throw new Error('Material Heat Chart not found');

        const data = { status };
        if (status === 'Approved') {
            data.approved_at = new Date();
            data.approver_remarks = remarks || null;
        } else if (status === 'Rejected') {
            data.rejected_at = new Date();
            data.approver_remarks = remarks;
        }

        return await prisma.material_heat_chart.update({
            where: { id },
            data,
            include: {
                production_engineer: { select: { id: true, name: true, empid: true } },
                qc_engineer: { select: { id: true, name: true, empid: true } },
            }
        });
    }

    /**
     * Get a single MHC record with items
     */
    async getById(company_id, id, includeHistory = false) {
        const mhc = await prisma.material_heat_chart.findFirst({
            where: { id, company_id },
            include: {
                items: {
                    where: includeHistory ? {} : { is_current: true },
                    orderBy: { sort_order: 'asc' },
                    include: {
                        prod_engineer: { select: { name: true } },
                        qc_reviewer: { select: { name: true } }
                    }
                },
                production_group: { select: { id: true, name: true } },
                qc_group: { select: { id: true, name: true } },
                production_engineer: { select: { id: true, name: true, empid: true } },
                qc_engineer: { select: { id: true, name: true, empid: true } },
                job: {
                    include: {
                        po: true,
                        customer: true
                    }
                }
            },
        });

        if (!mhc) throw new Error('Material Heat Chart not found');
        return mhc;
    }

    /**
     * Get all items from approved MHCs for a specific job
     */
    async getApprovedItemsByJob(company_id, job_id) {
        if (!job_id) throw new Error('job_id is required');

        const approvedCharts = await prisma.material_heat_chart.findMany({
            where: {
                company_id,
                job_id,
                status: 'Approved'
            },
            include: {
                items: {
                    orderBy: { sort_order: 'asc' }
                }
            }
        });

        const allItems = approvedCharts.flatMap(chart =>
            chart.items.map(item => ({
                ...item,
                mhc_report_no: chart.report_no
            }))
        );

        return allItems;
    }

    async getApprovedItemsByMsn(company_id, msn) {
        if (!msn) throw new Error('msn is required');

        const approvedCharts = await prisma.material_heat_chart.findMany({
            where: {
                company_id,
                msn: String(msn),
                status: 'Approved'
            },
            include: {
                items: {
                    orderBy: { sort_order: 'asc' }
                }
            }
        });

        const allItems = approvedCharts.flatMap(chart =>
            chart.items.map(item => ({
                ...item,
                mhc_report_no: chart.report_no
            }))
        );

        return allItems;
    }

    /**
     * Request a full MHC revision
     */
    async requestMhcRevision(company_id, mhc_id, remarks, user_id) {
        return await prisma.$transaction(async (tx) => {
            const mhc = await tx.material_heat_chart.findUnique({
                where: { id: mhc_id }
            });
            if (!mhc) throw new Error('Material Heat Chart not found');
            if (mhc.status !== 'Approved') throw new Error('Can only request revision on Approved MHCs');

            return await tx.material_heat_chart.update({
                where: { id: mhc_id },
                data: {
                    status: 'Revision_Requested',
                    approver_remarks: remarks
                }
            });
        });
    }

    /**
     * Approve full MHC revision request
     */
    async approveMhcRevision(company_id, mhc_id, user_id) {
        return await prisma.$transaction(async (tx) => {
            const mhc = await tx.material_heat_chart.findUnique({
                where: { id: mhc_id },
                include: { items: true } // Fetch items to clone them
            });
            if (!mhc) throw new Error('Material Heat Chart not found');
            if (mhc.status !== 'Revision_Requested') throw new Error('No revision request pending');

            // 1. Mark old report as inactive and rejected
            await tx.material_heat_chart.update({
                where: { id: mhc_id },
                data: {
                    status: 'Rejected',
                    is_active: false,
                    rejected_at: new Date()
                }
            });

            // 2. Clone the header
            const { id: old_id, created_at, updated_at, approved_at, rejected_at, is_active, ...mhcData } = mhc;
            delete mhcData.items; // Remove items from the data object to create header first
            
            // Generate a new UUID for the clone
            const { v4: uuidv4 } = require('uuid');
            const newMhcId = uuidv4();

            const clonedMhc = await tx.material_heat_chart.create({
                data: {
                    ...mhcData,
                    id: newMhcId,
                    status: 'Initiated',
                    revision: mhc.revision + 1,
                    approver_remarks: null
                }
            });

            // 3. Clone items
            const itemsData = mhc.items.map(item => {
                const { id, mhc_id: oldMhcId, created_at, updated_at, ...itemData } = item;
                return {
                    ...itemData,
                    mhc_id: newMhcId
                };
            });

            if (itemsData.length > 0) {
                await tx.material_heat_chart_item.createMany({
                    data: itemsData
                });
            }

            return clonedMhc;
        });
    }

    /**
     * Deny full MHC revision request
     */
    async denyMhcRevision(company_id, mhc_id, user_id) {
        return await prisma.$transaction(async (tx) => {
            const mhc = await tx.material_heat_chart.findUnique({
                where: { id: mhc_id }
            });
            if (!mhc) throw new Error('Material Heat Chart not found');
            if (mhc.status !== 'Revision_Requested') throw new Error('No revision request pending');

            return await tx.material_heat_chart.update({
                where: { id: mhc_id },
                data: {
                    status: 'Approved',
                    approver_remarks: null
                }
            });
        });
    }

    /**
     * Get the next report number for a specific job
     */
    async getNextReportNo(company_id, job_id) {
        if (!job_id) throw new Error('job_id is required');

        const job = await prisma.job.findFirst({
            where: { id: job_id, company_id },
        });

        if (!job) throw new Error('Job not found');

        const lastMhc = await prisma.material_heat_chart.findFirst({
            where: { company_id },
            orderBy: { serial_no: 'desc' },
            select: { serial_no: true }
        });

        const nextSerialNo = lastMhc ? lastMhc.serial_no + 1 : 1;
        const paddedSerial = String(nextSerialNo).padStart(4, '0');
        const reportNo = `SHR/${job.job_number}/MHC/${paddedSerial}`;

        return { next_report_no: reportNo, next_serial_no: nextSerialNo };
    }

    /**
     * Get item history by item ID
     */
    async getItemHistory(company_id, item_id) {
        const item = await prisma.material_heat_chart_item.findFirst({
            where: { id: item_id },
            select: { parent_item_id: true, id: true }
        });

        if (!item) throw new Error('Item not found');

        const parentId = item.parent_item_id || item.id;

        return await prisma.material_heat_chart_item.findMany({
            where: {
                OR: [
                    { id: parentId },
                    { parent_item_id: parentId }
                ]
            },
            orderBy: { version: 'asc' },
            include: {
                prod_engineer: { select: { name: true, empid: true } },
                qc_reviewer: { select: { name: true, empid: true } },
                action_by: { select: { name: true, empid: true } }
            }
        });
    }
}

module.exports = new MhcService();
