const CommonService = require('../services/common.service');

class CommonController {

    async getCustomers(req, res) {
        try {
            const { company_id } = req.user;
            const { search } = req.query;
            const data = await CommonService.getCustomers(company_id, search);
            res.status(200).json({ success: true, message: "Customers fetched successfully", data });
        } catch (error) {
            console.error("CommonController.getCustomers Error:", error);
            res.status(500).json({ success: false, message: "Failed to fetch customers", error: error.message });
        }
    }

    async getLocations(req, res) {
        try {
            const { company_id } = req.user;
            const { search, customer_id } = req.query;
            const data = await CommonService.getLocations(company_id, search, customer_id);
            res.status(200).json({ success: true, message: "Locations fetched successfully", data });
        } catch (error) {
            console.error("CommonController.getLocations Error:", error);
            res.status(500).json({ success: false, message: "Failed to fetch locations", error: error.message });
        }
    }

    async getPos(req, res) {
        try {
            const { company_id } = req.user;
            const { search } = req.query;
            const data = await CommonService.getPos(company_id, search);
            res.status(200).json({ success: true, message: "POs fetched successfully", data });
        } catch (error) {
            console.error("CommonController.getPos Error:", error);
            res.status(500).json({ success: false, message: "Failed to fetch POs", error: error.message });
        }
    }

    async getJobs(req, res) {
        try {
            const { company_id } = req.user;
            const { search } = req.query;
            const data = await CommonService.getJobs(company_id, search);
            res.status(200).json({ success: true, message: "Jobs fetched successfully", data });
        } catch (error) {
            console.error("CommonController.getJobs Error:", error);
            res.status(500).json({ success: false, message: "Failed to fetch jobs", error: error.message });
        }
    }
    async getJobDetails(req, res) {
        try {
            const { company_id } = req.user;
            const { id } = req.params;
            const data = await CommonService.getJobDetails(company_id, id);

            if (!data) {
                return res.status(404).json({ success: false, message: "Job not found" });
            }

            res.status(200).json({ success: true, message: "Job details fetched successfully", data });
        } catch (error) {
            console.error("CommonController.getJobDetails Error:", error);
            res.status(500).json({ success: false, message: "Failed to fetch job details", error: error.message });
        }
    }
}

module.exports = new CommonController();
