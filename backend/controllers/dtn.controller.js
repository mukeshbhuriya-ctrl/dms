const path = require('path');
const prisma = require('#prisma');
const DtnService = require('../services/dtn.service');
const MasterListPdfGenerator = require('../utils/masterListPdfGenerator');
const DtnNotePdfGenerator = require('../utils/dtnNotePdfGenerator');
const { getCompanyInfo } = require('../utils/companyInfo');

class DtnController {
    /**
     * Get unique documents related to specified Job IDs
     */
    async getDocumentsByJobs(req, res) {
        try {
            const { company_id } = req.user;
            const { jobIds } = req.query;

            if (!jobIds) {
                return res.status(400).json({ success: false, message: 'jobIds query parameter is required' });
            }

            const jobIdsArray = typeof jobIds === 'string' ? jobIds.split(',') : jobIds;
            const documents = await DtnService.getDocumentsByJobIds(company_id, jobIdsArray);

            res.status(200).json({ success: true, message: 'Documents fetched successfully', data: documents });
        } catch (error) {
            console.error('getDocumentsByJobs error:', error);
            res.status(500).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    /**
     * Create a new transmittal
     */
    async create(req, res) {
        try {
            const { company_id, userid } = req.user;
            const data = req.body;

            const dtn = await DtnService.createTransmittal(company_id, userid, data);

            res.status(201).json({ success: true, message: 'Transmittal generated successfully', data: dtn });
        } catch (error) {
            console.error('createTransmittal error:', error);
            res.status(500).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    /**
     * Update an existing transmittal
     */
    async update(req, res) {
        try {
            const { company_id } = req.user;
            const { id } = req.params;
            const data = req.body;

            const dtn = await DtnService.updateTransmittal(company_id, id, data);

            res.status(200).json({ success: true, message: 'Transmittal updated successfully', data: dtn });
        } catch (error) {
            console.error('updateTransmittal error:', error);
            res.status(500).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    /**
     * List all transmittals
     */
    async list(req, res) {
        try {
            const { company_id } = req.user;
            const dtns = await DtnService.listTransmittals(company_id);

            // Format for Frontend table
            const formattedDtns = dtns.map(d => ({
                id: d.id,
                ref_no: d.ref_no,
                customer: d.client_name,
                job_no: d.jobs.map(j => j.job.job_number).join(', '),
                date: d.date,
                status: d.status
            }));

            res.status(200).json({ 
                success: true, 
                data: formattedDtns,
                meta: {
                    total: dtns.length,
                    page: 1,
                    totalPages: 1
                }
            });
        } catch (error) {
            console.error('listTransmittals error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    /**
     * Get Next Reference Number
     */
    async getNextRef(req, res) {
        try {
            const { company_id } = req.user;
            const nextRef = await DtnService.getNextRefNo(company_id);
            res.status(200).json({ success: true, data: nextRef });
        } catch (error) {
            console.error('getNextRef error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async getById(req, res) {
        try {
            const { company_id } = req.user;
            const { id } = req.params;

            const dtn = await DtnService.getTransmittalById(company_id, id);

            if (!dtn) {
                return res.status(404).json({ success: false, message: 'Transmittal not found' });
            }

            res.status(200).json({ success: true, data: dtn });
        } catch (error) {
            console.error('getTransmittalById error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    /**
     * List unique jobs with DTNs
     */
    async listMasterSummaries(req, res) {
        try {
            const { company_id } = req.user;
            const { search } = req.query;
            const summaries = await DtnService.listJobSummariesWithDtns(company_id, search);
            res.status(200).json({ 
                success: true, 
                data: summaries,
                meta: {
                    total: summaries.length,
                    page: 1,
                    totalPages: 1
                }
            });
        } catch (error) {
            console.error('listMasterSummaries error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    /**
     * Get Master Details for a specific job
     */
    async getJobMasterDetails(req, res) {
        try {
            const { company_id } = req.user;
            const { jobId } = req.params;
            const { search } = req.query;
            const details = await DtnService.getDrawingMasterByJob(company_id, jobId, search);
            res.status(200).json({ success: true, data: details });
        } catch (error) {
            console.error('getJobMasterDetails error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
    /**
     * Download Master List PDF
     */
    async downloadMasterPdf(req, res) {
        try {
            const { company_id } = req.user;
            const { jobId } = req.params;
            const { search } = req.query;

            // 1. Fetch Drawing Data
            const drawings = await DtnService.getDrawingMasterByJob(company_id, jobId, search);

            // 2. Fetch Job/PO Header Info
            const job = await DtnService.getJobHeaderInfo(jobId);

            if (!job) {
                return res.status(404).json({ success: false, message: 'Job details not found' });
            }

            const headerInfo = {
                po_number: job.po?.po_number,
                po_date: job.po?.po_date,
                msn: `${job.job_number} (${job.equipement_name || ''})`.toUpperCase()
            };

            // 3. Set Headers for Download
            res.setHeader('Content-Type', 'application/pdf');
            // filename should be safe
            const filename = `MasterList_${job.job_number.replace(/[^a-z0-9]/gi, '_')}.pdf`;
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

            // 4. Fetch company branding
            const companyInfo = await getCompanyInfo(company_id);

            // 5. Generate
            MasterListPdfGenerator.generatePDF(drawings, res, headerInfo, companyInfo);

        } catch (error) {
            console.error('downloadMasterPdf error:', error);
            res.status(500).send('Error generating PDF report');
        }
    }

    /**
     * Download Drawing Transmittal Note PDF
     */
    async downloadDtnNotePdf(req, res) {
        try {
            const { company_id } = req.user;
            const { id } = req.params;

            // 1. Fetch DTN with items and jobs
            const dtn = await DtnService.getTransmittalById(company_id, id);

            if (!dtn) {
                return res.status(404).json({ success: false, message: 'Transmittal details not found' });
            }

            // 2. Fetch PO Date (not in DTN record)
            let poDate = '-';
            if (dtn.po_id) {
                const po = await prisma.po.findUnique({ where: { id: dtn.po_id } });
                if (po?.po_date) poDate = new Date(po.po_date).toLocaleDateString('en-GB').replace(/\//g, '-');
            }

            // 3. Format header data
            // Combine all job numbers for the MSN field
            const jobNums = (dtn.jobs || []).map(j => j.job?.job_number).filter(Boolean);
            const msn = `${jobNums.join('-')} (${dtn.equipment_name || ''})`.toUpperCase();

            const pdfData = {
                ...dtn,
                po_date: poDate,
                msn: msn
            };

            // 4. Set Headers for Preview/Download
            res.setHeader('Content-Type', 'application/pdf');
            const filename = `Transmittal_${dtn.ref_no.replace(/[^a-z0-9]/gi, '_')}.pdf`;
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

            // 5. Fetch company branding
            const companyInfo = await getCompanyInfo(company_id);

            // 6. Generate
            DtnNotePdfGenerator.generatePDF(pdfData, res, companyInfo);

        } catch (error) {
            console.error('downloadDtnNotePdf error:', error);
            res.status(500).send('Error generating transmittal note');
        }
    }
}

module.exports = new DtnController();
