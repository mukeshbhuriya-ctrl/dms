const AuditLogService = require('#services/auditLog.service.js');

/**
 * AuditLog Controller — Handles HTTP requests for the Audit Log Management module.
 */
class AuditLogController {

  /**
   * GET /api/admin/audit-logs
   * Paginated, filterable list of audit log entries.
   */
  async getLogs(req, res) {
    try {
      const { company_id } = req.user;
      const {
        page = 1,
        limit = 20,
        search = '',
        module,
        action,
        user_id,
        status_code,
        dateFrom,
        dateTo,
      } = req.query;

      const filters = {};
      if (module) filters.module = typeof module === 'string' ? module.split(',') : module;
      if (action) filters.action = typeof action === 'string' ? action.split(',') : action;
      if (user_id) filters.user_id = user_id;
      if (status_code) filters.status_code = status_code;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;

      const result = await AuditLogService.findAll({
        company_id,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        search,
        filters,
      });

      res.status(200).json({
        success: true,
        message: 'Audit logs fetched successfully',
        ...result,
      });
    } catch (error) {
      console.error('AuditLogController.getLogs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch audit logs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * GET /api/admin/audit-logs/filters
   * Returns available filter options (modules, users, actions).
   */
  async getFilterOptions(req, res) {
    try {
      const { company_id } = req.user;
      const options = await AuditLogService.getFilterOptions(company_id);

      res.status(200).json({
        success: true,
        message: 'Audit log filter options fetched successfully',
        data: options,
      });
    } catch (error) {
      console.error('AuditLogController.getFilterOptions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch filter options',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * GET /api/admin/audit-logs/export
   * Export filtered audit logs as an Excel (.xlsx) download.
   */
  async exportLogs(req, res) {
    try {
      const { company_id } = req.user;
      const { search = '', module, action, user_id, status_code, dateFrom, dateTo } = req.query;

      const filters = {};
      if (module) filters.module = typeof module === 'string' ? module.split(',') : module;
      if (action) filters.action = typeof action === 'string' ? action.split(',') : action;
      if (user_id) filters.user_id = user_id;
      if (status_code) filters.status_code = status_code;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;

      const buffer = await AuditLogService.exportToExcel({ company_id, search, filters });

      const fileName = `Audit_Logs_${new Date().toISOString().split('T')[0]}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error('AuditLogController.exportLogs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export audit logs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
}

module.exports = new AuditLogController();
