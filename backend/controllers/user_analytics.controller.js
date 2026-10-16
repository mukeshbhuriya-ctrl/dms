const userAnalyticsService = require('#services/user_analytics.service.js');

class UserAnalyticsController {
  async getOverview(req, res) {
    try {
      const company_id = req.user.company_id;
      const data = await userAnalyticsService.getOverviewMetrics(company_id, req.query);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('[UserAnalyticsController.getOverview] Error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch user overview analytics', error: error.message });
    }
  }

  async getTrends(req, res) {
    try {
      const company_id = req.user.company_id;
      const data = await userAnalyticsService.getTrendSeries(company_id, req.query);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('[UserAnalyticsController.getTrends] Error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch user activity trends', error: error.message });
    }
  }

  async getDepartments(req, res) {
    try {
      const company_id = req.user.company_id;
      const data = await userAnalyticsService.getDepartmentBreakdown(company_id, req.query);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('[UserAnalyticsController.getDepartments] Error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch department engagement breakdown', error: error.message });
    }
  }

  async getInactivity(req, res) {
    try {
      const company_id = req.user.company_id;
      const data = await userAnalyticsService.getInactivityAgeing(company_id, req.query);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('[UserAnalyticsController.getInactivity] Error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch inactivity ageing analysis', error: error.message });
    }
  }

  async getLogins(req, res) {
    try {
      const company_id = req.user.company_id;
      const data = await userAnalyticsService.getLoginActivityRecords(company_id, req.query);
      return res.status(200).json({ success: true, ...data });
    } catch (error) {
      console.error('[UserAnalyticsController.getLogins] Error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch user login activity records', error: error.message });
    }
  }

  async getProductivity(req, res) {
    try {
      const company_id = req.user.company_id;
      const data = await userAnalyticsService.getUserProductivityRecords(company_id, req.query);
      return res.status(200).json({ success: true, ...data });
    } catch (error) {
      console.error('[UserAnalyticsController.getProductivity] Error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch user productivity records', error: error.message });
    }
  }

  async exportLogins(req, res) {
    try {
      const company_id = req.user.company_id;
      const buffer = await userAnalyticsService.exportLoginsToExcel(company_id, req.query, req.user);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="User_Login_Activity_${new Date().toISOString().slice(0, 10)}.xlsx"`);
      return res.send(buffer);
    } catch (error) {
      console.error('[UserAnalyticsController.exportLogins] Error:', error);
      return res.status(500).json({ success: false, message: 'Failed to export login activity', error: error.message });
    }
  }

  async exportInactivity(req, res) {
    try {
      const company_id = req.user.company_id;
      const buffer = await userAnalyticsService.exportInactivityToExcel(company_id, req.query, req.user);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="User_Inactivity_Ageing_Roster_${new Date().toISOString().slice(0, 10)}.xlsx"`);
      return res.send(buffer);
    } catch (error) {
      console.error('[UserAnalyticsController.exportInactivity] Error:', error);
      return res.status(500).json({ success: false, message: 'Failed to export inactivity roster', error: error.message });
    }
  }
}

module.exports = new UserAnalyticsController();
