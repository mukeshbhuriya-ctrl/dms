const AdminDashboardService = require('#services/adminDashboard.service.js');

class AdminDashboardController {
    async getOverview(req, res) {
        try {
            const { company_id } = req.user;
            const data = await AdminDashboardService.getOverview(company_id);

            res.status(200).json({
                success: true,
                message: 'Admin dashboard overview fetched successfully',
                data,
            });
        } catch (error) {
            console.error('AdminDashboardController.getOverview error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch admin dashboard overview',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }

    async getAlerts(req, res) {
        try {
            const { company_id } = req.user;
            const { stalledDays } = req.query;
            const data = await AdminDashboardService.getAlerts(company_id, { stalledDays });

            res.status(200).json({
                success: true,
                message: 'Admin dashboard alerts fetched successfully',
                data,
            });
        } catch (error) {
            console.error('AdminDashboardController.getAlerts error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch admin dashboard alerts',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }

    async getTrends(req, res) {
        try {
            const { company_id } = req.user;
            const { days } = req.query;
            const data = await AdminDashboardService.getTrends(company_id, { days });

            res.status(200).json({
                success: true,
                message: 'Admin dashboard trends fetched successfully',
                data,
            });
        } catch (error) {
            console.error('AdminDashboardController.getTrends error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch admin dashboard trends',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }
}

module.exports = new AdminDashboardController();
