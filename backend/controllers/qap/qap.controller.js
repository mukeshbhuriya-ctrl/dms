const QapService = require("../../services/qap/qap.service");

class QapController {
    async getAll(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const filters = {
                company_id: req.user.company_id,
                status: req.query.status,
                search: req.query.search,
            };

            const { qaps, total } = await QapService.findMany(filters, skip, limit);

            res.status(200).json({
                qaps,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            console.error("Error fetching QAPs:", error);
            res.status(500).json({ error: error.message });
        }
    }

    async getById(req, res) {
        try {
            const { id } = req.params;
            const qap = await QapService.findFirst(id);

            if (!qap) {
                return res.status(404).json({ error: "QAP not found" });
            }

            // Authorization check
            if (qap.company_id !== req.user.company_id) {
                return res.status(403).json({ error: "Unauthorized access to this QAP" });
            }

            res.status(200).json(qap);
        } catch (error) {
            console.error("Error fetching QAP:", error);
            res.status(500).json({ error: error.message });
        }
    }

    async getNextDocumentNo(req, res) {
        try {
            const { jobId } = req.params;
            const docNo = await QapService.getNextDocumentNo(jobId);
            res.status(200).json({ document_no: docNo });
        } catch (error) {
            console.error("Error getting next QAP document no:", error);
            res.status(500).json({ error: error.message });
        }
    }

    async create(req, res) {
        try {
            const data = {
                ...req.body,
                company_id: req.user.company_id,
            };

            const qap = await QapService.create(data);
            res.status(201).json(qap);
        } catch (error) {
            console.error("Error creating QAP:", error);
            res.status(500).json({ error: error.message });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            // Verification check before proceeding
            const existing = await QapService.findFirst(id);
            if (!existing || existing.company_id !== req.user.company_id) {
                return res.status(403).json({ error: "Unauthorized or not found" });
            }

            const qap = await QapService.update(id, req.body);
            res.status(200).json(qap);
        } catch (error) {
            console.error("Error updating QAP:", error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new QapController();
