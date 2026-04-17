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

        // 1. Fetch group documents through the Job -> JobGroup -> Group relationship
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
                shreno_doc_no: true,
                client_doc_no: true,
                document: {
                    select: {
                        document_number: true,
                        document_name: true
                    }
                }
            }
        });

        // 2. Ensure uniqueness (a document might be assigned to multiple jobs via different groups)
        const uniqueDocs = [];
        const seenDocNumbers = new Set();

        groupDocs.forEach(gd => {
            const docNum = gd.document?.document_number;
            if (docNum && !seenDocNumbers.has(docNum)) {
                seenDocNumbers.add(docNum);
                uniqueDocs.push({
                    id: gd.id,
                    system_doc_id: gd.document.document_number,
                    document_name: gd.document.document_name,
                    shreno_doc_no: gd.shreno_doc_no || '',
                    client_doc_no: gd.client_doc_no || ''
                });
            }
        });

        return uniqueDocs;
    }
}

module.exports = new DtnService();
