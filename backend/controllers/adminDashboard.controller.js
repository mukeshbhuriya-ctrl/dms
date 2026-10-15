const AdminDashboardService = require('#services/adminDashboard.service.js');
const NotificationService = require('#services/notification.service.js');
const DmsDashboardService = require('#services/dmsDashboard.service.js');

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
            const { company_id, userid } = req.user;
            const { stalledDays } = req.query;
            const data = await AdminDashboardService.getAlerts(company_id, { stalledDays });

            // Keep notification inbox in sync with latest alert summary.
            await NotificationService.syncAlertNotifications({
                user_id: userid,
                company_id,
                alertsSummary: data?.summary || {},
            });

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

    async getDmsUploadAnalytics(req, res) {
        try {
            const { company_id } = req.user;
            const { startDate, endDate } = req.query;
            const data = await DmsDashboardService.getUploadAnalytics(company_id, { startDate, endDate });

            res.status(200).json({
                success: true,
                message: 'DMS upload analytics fetched successfully',
                data,
            });
        } catch (error) {
            console.error('AdminDashboardController.getDmsUploadAnalytics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch DMS upload analytics',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }

    async getDmsUploadRecords(req, res) {
        try {
            const { company_id } = req.user;
            const { startDate, endDate, statusFilter, month, search, page, pageSize, limit, sortBy, sortOrder } = req.query;
            const result = await DmsDashboardService.getUploadRecords(company_id, {
                startDate,
                endDate,
                statusFilter,
                month,
                search,
                page,
                pageSize: limit || pageSize,
                limit: limit || pageSize,
                sortBy,
                sortOrder,
            });

            res.status(200).json({
                success: true,
                message: 'DMS upload records fetched successfully',
                data: result.data,
                meta: result.meta,
                totalRecords: result.totalRecords,
                totalPages: result.totalPages,
                currentPage: result.currentPage,
            });
        } catch (error) {
            console.error('AdminDashboardController.getDmsUploadRecords error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch DMS upload records',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }

    async exportDmsUploadRecords(req, res) {
        try {
            const { company_id } = req.user;
            const { startDate, endDate, statusFilter, month, search, sortBy, sortOrder } = req.query;
            const buffer = await DmsDashboardService.exportUploadRecords(company_id, {
                startDate,
                endDate,
                statusFilter,
                month,
                search,
                sortBy,
                sortOrder,
            });

            const timestamp = new Date().toISOString().slice(0, 10);
            const filename = `DMS_Upload_Tracking_${timestamp}.xlsx`;

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', buffer.length);

            return res.send(buffer);
        } catch (error) {
            console.error('AdminDashboardController.exportDmsUploadRecords error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export DMS upload records',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }
}

module.exports = new AdminDashboardController();

