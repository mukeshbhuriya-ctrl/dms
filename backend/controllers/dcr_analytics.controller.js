const dcrAnalyticsService = require('../services/dcr_analytics.service.js');

class DcrAnalyticsController {
  async getOverview(req, res) {
    try {
      const company_id = req.user.company_id;
      const data = await dcrAnalyticsService.getMonthWiseOverview(company_id, req.query);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('[DcrAnalyticsController.getOverview] Error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch DCR monthly analytics overview', error: error.message });
    }
  }

  async getRecords(req, res) {
    try {
      const company_id = req.user.company_id;
      const result = await dcrAnalyticsService.getDcrRecords(company_id, req.query);
      return res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        meta: result.pagination,
      });
    } catch (error) {
      console.error('[DcrAnalyticsController.getRecords] Error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch DCR monthly records', error: error.message });
    }
  }

  async exportDcr(req, res) {
    try {
      const company_id = req.user.company_id;
      const buffer = await dcrAnalyticsService.exportDcrToExcel(company_id, req.query, req.user);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Month_Wise_DCR_Register_${new Date().toISOString().slice(0, 10)}.xlsx"`);
      return res.send(buffer);
    } catch (error) {
      console.error('[DcrAnalyticsController.exportDcr] Error:', error);
      return res.status(500).json({ success: false, message: 'Failed to export DCR records', error: error.message });
    }
  }
}

module.exports = new DcrAnalyticsController();
