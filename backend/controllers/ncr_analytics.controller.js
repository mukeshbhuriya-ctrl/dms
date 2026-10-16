const ncrAnalyticsService = require('../services/ncr_analytics.service.js');

class NcrAnalyticsController {
  async getOverview(req, res) {
    try {
      const company_id = req.user.company_id;
      const data = await ncrAnalyticsService.getMonthWiseOverview(company_id, req.query);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('[NcrAnalyticsController.getOverview] Error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch NCR monthly analytics overview', error: error.message });
    }
  }

  async getRecords(req, res) {
    try {
      const company_id = req.user.company_id;
      const result = await ncrAnalyticsService.getNcrRecords(company_id, req.query);
      return res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        meta: result.pagination,
      });
    } catch (error) {
      console.error('[NcrAnalyticsController.getRecords] Error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch NCR monthly records', error: error.message });
    }
  }

  async exportNcr(req, res) {
    try {
      const company_id = req.user.company_id;
      const buffer = await ncrAnalyticsService.exportNcrToExcel(company_id, req.query, req.user);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Month_Wise_NCR_Register_${new Date().toISOString().slice(0, 10)}.xlsx"`);
      return res.send(buffer);
    } catch (error) {
      console.error('[NcrAnalyticsController.exportNcr] Error:', error);
      return res.status(500).json({ success: false, message: 'Failed to export NCR records', error: error.message });
    }
  }
}

module.exports = new NcrAnalyticsController();
