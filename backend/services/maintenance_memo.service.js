const prisma = require('#prisma');
const fs = require('fs');
const path = require('path');
const storageUtils = require('../utils/storage.utils');

class MaintenanceMemoService {
    /**
     * Generate the next Memo Number (e.g. MEM-001)
     */
    async generateMemoNo(company_id) {
        const lastMemo = await prisma.maintenance_memo.findFirst({
            where: { company_id },
            orderBy: { createdAt: 'desc' },
            select: { memo_no: true }
        });

        let lastNumber = 0;
        if (lastMemo && lastMemo.memo_no) {
            const match = lastMemo.memo_no.match(/\d+$/);
            if (match) {
                lastNumber = parseInt(match[0], 10);
            }
        }
        
        const nextNumber = lastNumber + 1;
        return `SHR/MM/${nextNumber.toString().padStart(2, '0')}`;
    }

    /**
     * Fetch paginated list of memos
     */
    async getMemos(company_id, { page = 1, limit = 10, search = '', status = '' }) {
        const skip = (page - 1) * limit;

        const where = {
            company_id,
            is_deleted: false,
            ...(status && { status })
        };

        if (search) {
            where.OR = [
                { memo_no: { contains: search, mode: 'insensitive' } },
                { machine_name: { contains: search, mode: 'insensitive' } },
                { fault: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [data, total] = await Promise.all([
            prisma.maintenance_memo.findMany({
                where,
                skip: parseInt(skip),
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
                include: {
                    machine: { select: { machine_number: true, machine_name: true } },
                    creator: { select: { id: true, name: true, empid: true } },
                    assigned_to: { select: { id: true, name: true, empid: true } },
                    attended_by_user: { select: { id: true, name: true, empid: true } },
                    production_group: { select: { id: true, name: true } },
                    maintenance_group: { select: { id: true, name: true } }
                }
            }),
            prisma.maintenance_memo.count({ where })
        ]);

        return {
            data,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Fetch a single memo by ID
     */
    async getMemoById(id, company_id) {
        const memo = await prisma.maintenance_memo.findFirst({
            where: { id, company_id, is_deleted: false },
            include: {
                machine: true,
                creator: { select: { id: true, name: true, empid: true } },
                assigned_to: { select: { id: true, name: true, empid: true } },
                attended_by_user: { select: { id: true, name: true, empid: true } },
                production_group: { select: { id: true, name: true } },
                maintenance_group: { select: { id: true, name: true } },
                attachments: true
            }
        });

        if (!memo) {
            throw new Error('Maintenance memo not found');
        }

        // Dynamically inject full file_url
        if (memo.attachments) {
            memo.attachments.forEach(att => {
                att.file_url = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/maintenance/files/${att.file_url}`;
            });
        }

        return memo;
    }

    /**
     * Initiate a new Memo (Stage 1)
     */
    async initiateMemo(company_id, user_id, data, files = []) {
        const memo_no = await this.generateMemoNo(company_id);
        
        // If status is OPEN, mark submitted_at
        const isSubmitting = data.status === 'OPEN';

        const newMemo = await prisma.maintenance_memo.create({
            data: {
                company_id,
                memo_no,
                date: new Date(data.date),
                shift: data.shift,
                inform_by_id: user_id, // Creator is the current user
                inform_to_id: data.inform_to_id || null,
                production_group_id: data.production_group_id || null,
                maintenance_group_id: data.maintenance_group_id || null,
                machine_id: data.machine_id || null,
                machine_name: data.machine_name || null,
                fault: data.fault || null,
                status: data.status || 'DRAFT',
                submitted_at: isSubmitting ? new Date() : null
            }
        });

        // Handle file uploads
        if (files && files.length > 0) {
            const uploadDir = storageUtils.getMaintenanceMemoDir();
            const attachmentRecords = [];
            for (const file of files) {
                const destinationPath = path.join(uploadDir, file.filename);

                // Move file from temp upload dir to MAINTENANCE_MEMO subdir
                if (fs.existsSync(file.path)) {
                    fs.renameSync(file.path, destinationPath);
                }

                attachmentRecords.push({
                    memo_id: newMemo.id,
                    file_path: storageUtils.getRelativePath(destinationPath),
                    file_url: file.filename,
                    original_filename: file.originalname,
                    mime_type: file.mimetype,
                    file_size: file.size
                });
            }

            await prisma.maintenance_memo_attachment.createMany({
                data: attachmentRecords
            });
        }

        return newMemo;
    }

    /**
     * Update an existing memo (Stage 1 edits)
     */
    async updateMemo(id, company_id, data, files = []) {
        const existing = await this.getMemoById(id, company_id);

        const isSubmitting = data.status === 'OPEN' && existing.status === 'DRAFT';
        const submitted_at = isSubmitting ? new Date() : existing.submitted_at;

        const updated = await prisma.maintenance_memo.update({
            where: { id },
            data: {
                date: data.date ? new Date(data.date) : existing.date,
                shift: data.shift !== undefined ? (data.shift || null) : existing.shift,
                inform_to_id: data.inform_to_id !== undefined ? (data.inform_to_id || null) : existing.inform_to_id,
                production_group_id: data.production_group_id !== undefined ? (data.production_group_id || null) : existing.production_group_id,
                maintenance_group_id: data.maintenance_group_id !== undefined ? (data.maintenance_group_id || null) : existing.maintenance_group_id,
                machine_id: data.machine_id !== undefined ? (data.machine_id || null) : existing.machine_id,
                machine_name: data.machine_name !== undefined ? (data.machine_name || null) : existing.machine_name,
                fault: data.fault !== undefined ? (data.fault || null) : existing.fault,
                status: data.status || existing.status,
                submitted_at
            }
        });

        // Handle deleted attachments
        let deletedIds = [];
        if (data.deletedAttachmentIds) {
            try {
                deletedIds = typeof data.deletedAttachmentIds === 'string' 
                    ? JSON.parse(data.deletedAttachmentIds) 
                    : data.deletedAttachmentIds;
            } catch (e) {
                console.error("Failed to parse deletedAttachmentIds", e);
            }
        }

        if (deletedIds && deletedIds.length > 0) {
            await prisma.maintenance_memo_attachment.deleteMany({
                where: {
                    id: { in: deletedIds },
                    memo_id: id
                }
            });
        }

        // Handle new file uploads
        if (files && files.length > 0) {
            const uploadDir = storageUtils.getMaintenanceMemoDir();
            const attachmentRecords = [];
            for (const file of files) {
                const destinationPath = path.join(uploadDir, file.filename);

                // Move file from temp upload dir to MAINTENANCE_MEMO subdir
                if (fs.existsSync(file.path)) {
                    fs.renameSync(file.path, destinationPath);
                }

                attachmentRecords.push({
                    memo_id: id,
                    file_path: storageUtils.getRelativePath(destinationPath),
                    file_url: file.filename,
                    original_filename: file.originalname,
                    mime_type: file.mimetype,
                    file_size: file.size
                });
            }

            await prisma.maintenance_memo_attachment.createMany({
                data: attachmentRecords
            });
        }

        return updated;
    }

    /**
     * Resolve Memo (Stage 2 - Maintenance)
     */
    async resolveMemo(id, company_id, data) {
        const existing = await this.getMemoById(id, company_id);

        const updated = await prisma.maintenance_memo.update({
            where: { id },
            data: {
                action_taken: data.action_taken !== undefined ? data.action_taken : existing.action_taken,
                attended_by_id: data.attended_by_id !== undefined ? data.attended_by_id : existing.attended_by_id,
                activity_type: data.activity_type !== undefined ? data.activity_type : existing.activity_type,
                material_consumed: data.material_consumed !== undefined ? data.material_consumed : existing.material_consumed,
                received_time: data.received_time ? new Date(data.received_time) : existing.received_time,
                attended_time: data.attended_time ? new Date(data.attended_time) : existing.attended_time,
                completion_time: data.completion_time ? new Date(data.completion_time) : existing.completion_time,
                completion_date: data.completion_date ? new Date(data.completion_date) : existing.completion_date,
                man_hrs_technician: data.man_hrs_technician !== undefined && data.man_hrs_technician !== '' ? parseFloat(data.man_hrs_technician) : existing.man_hrs_technician,
                man_hrs_management: data.man_hrs_management !== undefined && data.man_hrs_management !== '' ? parseFloat(data.man_hrs_management) : existing.man_hrs_management,
                total_man_hrs: data.total_man_hrs !== undefined && data.total_man_hrs !== '' ? parseFloat(data.total_man_hrs) : existing.total_man_hrs,
                breakdown_hrs: data.breakdown_hrs !== undefined && data.breakdown_hrs !== '' ? parseFloat(data.breakdown_hrs) : existing.breakdown_hrs,
                maintenance_remarks: data.maintenance_remarks !== undefined ? data.maintenance_remarks : existing.maintenance_remarks,
                status: data.status || existing.status
            }
        });

        return updated;
    }

    /**
     * Verify Memo (Stage 3 - Production)
     */
    async verifyMemo(id, company_id, data) {
        const existing = await this.getMemoById(id, company_id);

        const updated = await prisma.maintenance_memo.update({
            where: { id },
            data: {
                production_remarks: data.production_remarks !== undefined ? data.production_remarks : existing.production_remarks
            }
        });

        return updated;
    }
}

module.exports = new MaintenanceMemoService();
