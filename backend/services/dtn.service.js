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
            status, // Draft, Uploaded
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
            status, // Draft, Uploaded
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
    async listTransmittals(companyId, params = {}) {
        const { search = "", page = 1, limit = 50 } = params;
        const columnFilters = typeof params.columnFilters === 'string' ? JSON.parse(params.columnFilters) : (params.columnFilters || {});

        const where = { company_id: companyId };

        if (search) {
            where.OR = [
                { ref_no: { contains: search, mode: 'insensitive' } },
                { client_name: { contains: search, mode: 'insensitive' } },
                { po_number: { contains: search, mode: 'insensitive' } },
                { jobs: { some: { job: { job_number: { contains: search, mode: 'insensitive' } } } } }
            ];
        }

        if (columnFilters.customer) {
            where.client_name = { in: Array.isArray(columnFilters.customer) ? columnFilters.customer : [columnFilters.customer] };
        }
        if (columnFilters.po) {
            where.po_number = { in: Array.isArray(columnFilters.po) ? columnFilters.po : [columnFilters.po] };
        }
        if (columnFilters.job_no) {
            where.jobs = { some: { job: { job_number: { in: Array.isArray(columnFilters.job_no) ? columnFilters.job_no : [columnFilters.job_no] } } } };
        }
        if (columnFilters.status) {
            where.status = { in: Array.isArray(columnFilters.status) ? columnFilters.status : [columnFilters.status] };
        }

        const skip = (page - 1) * limit;

        const [total, dtns] = await prisma.$transaction([
            prisma.drawing_transmittal.count({ where }),
            prisma.drawing_transmittal.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    jobs: { include: { job: { select: { job_number: true } } } }
                }
            })
        ]);

        return { total, dtns };
    }

    async getDtnFilters(companyId) {
        const transmittals = await prisma.drawing_transmittal.findMany({
            where: { company_id: companyId },
            include: {
                jobs: { include: { job: { select: { job_number: true } } } }
            }
        });

        const records = [];
        transmittals.forEach(t => {
            const clientName = t.client_name || 'N/A';
            const poNum = t.po_number || 'N/A';
            const status = t.status || 'Draft';
            
            if (t.jobs && t.jobs.length > 0) {
                t.jobs.forEach(gj => {
                    records.push({
                        customer: clientName,
                        po: poNum,
                        job_no: gj.job?.job_number || 'N/A',
                        status: status
                    });
                });
            } else {
                records.push({
                    customer: clientName,
                    po: poNum,
                    job_no: 'N/A',
                    status: status
                });
            }
        });

        return { records };
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

    /**
     * List unique Job Summary combinations for those that have at least one DTN created
     */
    async listJobSummariesWithDtns(companyId, params = {}) {
        const { search = "" } = params;
        const columnFilters = params.columnFilters || {};

        const transmittals = await prisma.drawing_transmittal.findMany({
            where: { company_id: companyId },
            include: {
                jobs: {
                    include: { job: { select: { id: true, job_number: true } } }
                }
            }
        });

        const summaries = [];
        const seen = new Set();
        const searchLower = search?.toLowerCase();

        transmittals.forEach(t => {
            t.jobs.forEach(gj => {
                const jobNum = gj.job?.job_number;
                if (!jobNum) return;

                const clientName = t.client_name || 'N/A';
                const poNum = t.po_number || 'N/A';

                // 1. Global Search Filter
                if (searchLower) {
                    const matchesSearch = 
                        clientName.toLowerCase().includes(searchLower) ||
                        poNum.toLowerCase().includes(searchLower) ||
                        jobNum.toLowerCase().includes(searchLower);
                    
                    if (!matchesSearch) return;
                }

                // 2. Column Based Filters
                if (columnFilters.customer && !this._processArrayFilter(columnFilters.customer, clientName)) return;
                if (columnFilters.po && !this._processArrayFilter(columnFilters.po, poNum)) return;
                if (columnFilters.job_number && !this._processArrayFilter(columnFilters.job_number, jobNum)) return;

                const key = `${clientName}-${poNum}-${jobNum}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    summaries.push({
                        id: gj.job.id, // Important: ProDataTable uses 'id' for selection
                        customer: clientName,
                        po: poNum,
                        job_number: jobNum,
                        job_id: gj.job.id,
                        customer_id: t.customer_id,
                        po_id: t.po_id
                    });
                }
            });
        });

        return summaries;
    }

    async getMasterFilters(companyId) {
        const summaries = await this.listJobSummariesWithDtns(companyId, {});
        // Return unique combinations as records for cascading
        return { records: summaries };
    }

    _processArrayFilter(filterValues, actualValue) {
        if (!filterValues || !Array.isArray(filterValues) || filterValues.length === 0) return true;
        return filterValues.map(v => v.toString()).includes(actualValue?.toString());
    }

    /**
     * Get Master Drawing List for a specific Job
     */
    async getDrawingMasterByJob(companyId, jobId, search = "") {
        // 1. Find all transmittal items for this job
        const items = await prisma.drawing_transmittal_item.findMany({
            where: {
                dtn: {
                    company_id: companyId,
                    jobs: { some: { job_id: jobId } }
                },
                // Apply search filter if provided
                OR: search ? [
                    { document: { document_number: { contains: search, mode: 'insensitive' } } },
                    { document: { document_name: { contains: search, mode: 'insensitive' } } }
                ] : undefined
            },
            include: {
                document: { select: { id: true, document_number: true, document_name: true } }
            },
            orderBy: { dtn: { createdAt: 'desc' } }
        });

        // 2. Fetch Job-specific drawing aliases (Shreno Doc Nos)
        // Note: For large datasets, we could pre-fetch these only once or filter them too.
        // But for now, we'll keep the bridge active for the filtered items.
        const groupDocs = await prisma.group_document.findMany({
            where: {
                company_id: companyId,
                group: { job_group: { some: { job_id: jobId } } }
            },
            select: {
                document_id: true,
                shreno_doc_no: true
            }
        });

        // 3. Map document IDs to Shreno Doc Nos for fallback matching
        const shrenoMap = new Map();
        groupDocs.forEach(gd => {
            if (gd.document_id && gd.shreno_doc_no) {
                if (!shrenoMap.has(gd.document_id)) shrenoMap.set(gd.document_id, new Set());
                shrenoMap.get(gd.document_id).add(gd.shreno_doc_no);
            }
        });

        // 4. Fetch all DCRs for this job
        const dcrs = await prisma.dcr.findMany({
            where: { job_id: jobId, company_id: companyId },
            orderBy: { createdAt: 'asc' }
        });

        // 5. Group into unique documents and handle DCR mapping
        const docMap = new Map();

        items.forEach(item => {
            if (!item.document) return;
            const docId = item.document_master_id;
            
            if (!docMap.has(docId)) {
                const systemDocNo = item.document.document_number;
                const shrenoNos = shrenoMap.get(docId) || new Set();

                // Find all DCRs that match either the System Doc No or any Shreno Doc No for this drawing
                const matchingDcrs = dcrs.filter(d => 
                    d.drg_no === systemDocNo || shrenoNos.has(d.drg_no)
                ).map(d => d.dcr_no);

                docMap.set(docId, {
                    id: docId,
                    drgNo: systemDocNo,
                    shreno_doc_no: Array.from(shrenoNos)[0] || systemDocNo,
                    docName: item.document.document_name,
                    rev: item.rev,
                    sheets: [],
                    remark: "",
                    dcrs: [...new Set(matchingDcrs)] // Unique DCR numbers
                });
            }
        });

        return Array.from(docMap.values());
    }
    async getJobHeaderInfo(jobId) {
        return await prisma.job.findUnique({
            where: { id: jobId },
            include: { 
                po: {
                    select: {
                        po_number: true,
                        po_date: true
                    }
                }
            }
        });
    }
}

module.exports = new DtnService();
