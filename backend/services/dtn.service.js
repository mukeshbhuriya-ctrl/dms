const fs = require('fs');
const path = require('path');
const prisma = require('#prisma');

class DtnService {
    /**
     * Get documents related to a list of Job IDs
     * Path: job_group -> group -> group_document -> document_master
     */
    async getDocumentsByJobIds(companyId, jobIds) {
        if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
            return [];
        }

        const groupDocs = await prisma.group_document.findMany({
            where: {
                company_id: companyId,
                group: {
                    job_group: {
                        some: {
                            job_id: { in: jobIds }
                        }
                    }
                }
            },
            select: {
                id: true,
                document_id: true,
                shreno_doc_no: true,
                client_doc_no: true,
                document: {
                    select: {
                        id: true,
                        document_number: true,
                        document_name: true
                    }
                }
            }
        });

        const uniqueDocs = [];
        const seenDocNumbers = new Set();

        groupDocs.forEach(gd => {
            const docNum = gd.document?.document_number;
            if (docNum && !seenDocNumbers.has(docNum)) {
                seenDocNumbers.add(docNum);
                uniqueDocs.push({
                    document_master_id: gd.document.id,
                    system_doc_id: gd.document.document_number,
                    document_name: gd.document.document_name,
                    shreno_doc_no: gd.shreno_doc_no || '',
                    client_doc_no: gd.client_doc_no || ''
                });
            }
        });

        return uniqueDocs;
    }

    /**
     * Create a new Drawing Transmittal
     */
    async createTransmittal(companyId, userId, data) {
        const {
            ref_no,
            date,
            customer_id,
            customer_location_id,
            client_name,
            po_id,
            po_number,
            project_id,
            equipment_name,
            tag_no,
            code,
            issued_to, // { hm: true, ... }
            issued_for, // { reference: true, ... }
            status, // Draft, Pending
            jobIds, // Array
            items // Array [{ doc_no_title, rev, copies, deps: { HM: true, ... } }]
        } = data;

        return await prisma.$transaction(async (tx) => {
            // 1. Create Header
            const dtn = await tx.drawing_transmittal.create({
                data: {
                    company_id: companyId,
                    created_by: userId,
                    ref_no,
                    date: date ? new Date(date) : new Date(),
                    customer_id,
                    customer_location_id,
                    client_name,
                    po_id,
                    po_number,
                    project_id,
                    equipment_name,
                    tag_no,
                    code,
                    // Map Issued To
                    to_hm: !!issued_to?.hm,
                    to_hq: !!issued_to?.hq,
                    to_hmf: !!issued_to?.hmf,
                    to_hpl: !!issued_to?.hpl,
                    to_hst: !!issued_to?.hst,
                    to_hpc: !!issued_to?.hpc,
                    to_ppd: !!issued_to?.ppd,
                    status: status || "Draft",
                    // Map Issued For
                    for_reference: !!issued_for?.reference,
                    for_planning: !!issued_for?.planning,
                    for_construction: !!issued_for?.construction,
                    for_manufacturing: !!issued_for?.manufacturing,
                    for_outsourcing: !!issued_for?.outsourcing,
                    for_procurement: !!issued_for?.procurement,
                }
            });

            // 2. Link Jobs
            if (jobIds && jobIds.length > 0) {
                await tx.drawing_transmittal_job.createMany({
                    data: jobIds.map(job_id => ({
                        dtn_id: dtn.id,
                        job_id
                    }))
                });
            }

            // 3. Create Items
            if (items && items.length > 0) {
                await tx.drawing_transmittal_item.createMany({
                    data: items.map(item => ({
                        dtn_id: dtn.id,
                        sr_no: item.srNo,
                        doc_no_title: item.docNo,
                        document_master_id: item.document_master_id,
                        rev: String(item.rev),
                        copies: String(item.copies),
                        // Map Distribution matrix
                        dist_hm: !!item.deps?.HM,
                        dist_hq: !!item.deps?.HQ,
                        dist_hmf: !!item.deps?.HMF,
                        dist_hpl: !!item.deps?.HPL,
                        dist_hst: !!item.deps?.HST,
                        dist_hpc: !!item.deps?.HPC,
                        dist_ppd: !!item.deps?.PPD,
                    }))
                });
            }

            return dtn;
        });
    }

    /**
     * Update an existing Drawing Transmittal
     */
    async updateTransmittal(companyId, id, data) {
        const {
            ref_no,
            date,
            customer_id,
            customer_location_id,
            client_name,
            po_id,
            po_number,
            project_id,
            equipment_name,
            tag_no,
            code,
            issued_to,
            issued_for,
            status,
            jobIds,
            items
        } = data;

        return await prisma.$transaction(async (tx) => {
            // 1. Update Header
            const dtn = await tx.drawing_transmittal.update({
                where: { id, company_id: companyId },
                data: {
                    ref_no,
                    date: date ? new Date(date) : undefined,
                    customer_id,
                    customer_location_id,
                    client_name,
                    po_id,
                    po_number,
                    project_id,
                    equipment_name,
                    tag_no,
                    code,
                    to_hm: !!issued_to?.hm,
                    to_hq: !!issued_to?.hq,
                    to_hmf: !!issued_to?.hmf,
                    to_hpl: !!issued_to?.hpl,
                    to_hst: !!issued_to?.hst,
                    to_hpc: !!issued_to?.hpc,
                    to_ppd: !!issued_to?.ppd,
                    status: status || "Draft",
                    for_reference: !!issued_for?.reference,
                    for_planning: !!issued_for?.planning,
                    for_construction: !!issued_for?.construction,
                    for_manufacturing: !!issued_for?.manufacturing,
                    for_outsourcing: !!issued_for?.outsourcing,
                    for_procurement: !!issued_for?.procurement,
                }
            });

            // 2. Refresh Jobs
            await tx.drawing_transmittal_job.deleteMany({ where: { dtn_id: id } });
            if (jobIds && jobIds.length > 0) {
                await tx.drawing_transmittal_job.createMany({
                    data: jobIds.map(job_id => ({ dtn_id: id, job_id }))
                });
            }

            // 3. Refresh Items
            await tx.drawing_transmittal_item.deleteMany({ where: { dtn_id: id } });
            if (items && items.length > 0) {
                await tx.drawing_transmittal_item.createMany({
                    data: items.map(item => ({
                        dtn_id: id,
                        sr_no: item.srNo,
                        doc_no_title: item.docNo,
                        document_master_id: item.document_master_id,
                        rev: String(item.rev),
                        copies: String(item.copies),
                        dist_hm: !!item.deps?.HM,
                        dist_hq: !!item.deps?.HQ,
                        dist_hmf: !!item.deps?.HMF,
                        dist_hpl: !!item.deps?.HPL,
                        dist_hst: !!item.deps?.HST,
                        dist_hpc: !!item.deps?.HPC,
                        dist_ppd: !!item.deps?.PPD,
                    }))
                });
            }

            return dtn;
        });
    }

    /**
     * Get Transmittal by ID
     */
    async getTransmittalById(companyId, id) {
        const dtn = await prisma.drawing_transmittal.findFirst({
            where: { id, company_id: companyId },
            include: {
                jobs: { include: { job: true } },
                items: {
                    include: {
                        document: {
                            include: {
                                drawing_versions: {
                                    where: { is_active: true },
                                    take: 1,
                                    orderBy: { version_no: 'desc' }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!dtn) return null;

        // Recostruct objects for frontend
        const ROOT_DIR = process.env.ROOT_DIR || 'C:/dms-data';

        return {
            ...dtn,
            issued_to: {
                hm: dtn.to_hm,
                hq: dtn.to_hq,
                hmf: dtn.to_hmf,
                hpl: dtn.to_hpl,
                hst: dtn.to_hst,
                hpc: dtn.to_hpc,
                ppd: dtn.to_ppd
            },
            issued_for: {
                reference: dtn.for_reference,
                planning: dtn.for_planning,
                construction: dtn.for_construction,
                manufacturing: dtn.for_manufacturing,
                outsourcing: dtn.for_outsourcing,
                procurement: dtn.for_procurement
            },
            jobIds: dtn.jobs.map(j => j.job_id),
            distributionRows: dtn.items.map(item => {
                const latestVersion = item.document?.drawing_versions?.[0];
                let hasPhysicalFile = false;
                
                if (latestVersion && latestVersion.file_path) {
                    const absPath = path.join(ROOT_DIR, latestVersion.file_path);
                    hasPhysicalFile = fs.existsSync(absPath);
                }

                return {
                    id: item.id,
                    srNo: item.sr_no,
                    docNo: item.doc_no_title,
                    rev: item.rev,
                    copies: item.copies,
                    document_master_id: item.document_master_id,
                    has_file: hasPhysicalFile,
                    deps: {
                        HM: item.dist_hm,
                        HQ: item.dist_hq,
                        HMF: item.dist_hmf,
                        HPL: item.dist_hpl,
                        HST: item.dist_hst,
                        HPC: item.dist_hpc,
                        PPD: item.dist_ppd
                    }
                };
            })
        };
    }

    /**
     * List Transmittals
     */
    async listTransmittals(companyId) {
        return await prisma.drawing_transmittal.findMany({
            where: { company_id: companyId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                ref_no: true,
                date: true,
                client_name: true,
                po_number: true,
                status: true,
                createdAt: true,
                jobs: {
                    select: {
                        job: { select: { job_number: true } }
                    }
                }
            }
        });
    }
    /**
     * Get the next available Reference Number
     */
    async getNextRefNo(companyId) {
        const lastRef = await prisma.drawing_transmittal.findFirst({
            where: { company_id: companyId },
            orderBy: { createdAt: 'desc' },
            select: { ref_no: true }
        });

        if (!lastRef || !lastRef.ref_no) {
            return "SHR/DGN/001";
        }

        const parts = lastRef.ref_no.split('/');
        if (parts.length < 3) return "SHR/DGN/001"; // Fallback if format is strange

        const lastNumStr = parts[parts.length - 1];
        const lastNum = parseInt(lastNumStr);

        if (isNaN(lastNum)) return "SHR/DGN/001";

        const nextNum = (lastNum + 1).toString().padStart(3, '0');
        return `SHR/DGN/${nextNum}`;
    }
}

module.exports = new DtnService();
