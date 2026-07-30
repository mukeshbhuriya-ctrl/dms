const pmService = require('../services/preventive_maintenance.service');

class PreventiveMaintenanceController {
  
  getPlans = async (req, res) => {
    try {
      const { page, limit, search } = req.query;
      const result = await pmService.getPlans({
        company_id: req.user.company_id,
        page: page ? parseInt(page) : 1,
        limit: limit || 10,
        search
      });
      res.status(200).json({ success: true, ...result, message: 'Plans fetched successfully' });
    } catch (error) {
      console.error('getPlans error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getPlanById = async (req, res) => {
    try {
      const plan = await pmService.getPlanById(req.params.id, req.user.company_id);
      res.status(200).json({ success: true, data: plan, message: 'Plan fetched successfully' });
    } catch (error) {
      console.error('getPlanById error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  savePlan = async (req, res) => {
    try {
      const plan = await pmService.savePlan(req.user.company_id, req.user.userid, req.body);
      res.status(200).json({ success: true, data: plan, message: 'Plan saved successfully' });
    } catch (error) {
      console.error('savePlan error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  
  archivePlan = async (req, res) => {
    try {
      await pmService.archivePlan(req.params.id, req.user.company_id);
      res.status(200).json({ success: true, message: 'Plan archived successfully' });
    } catch (error) {
      console.error('archivePlan error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  
  
  rejectPlan = async (req, res) => {
    try {
      const plan = await pmService.rejectPlan(req.params.id, req.user.company_id, req.user.userid);
      res.status(200).json({ success: true, data: plan, message: 'Plan rejected successfully' });
    } catch (error) {
      console.error('rejectPlan error:', error);
      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({ success: false, message: error.message });
    }
  };

  approvePlan = async (req, res) => {
    try {
      const plan = await pmService.approvePlan(req.params.id, req.user.company_id, req.user.userid);
      res.status(200).json({ success: true, data: plan, message: 'Plan approved successfully' });
    } catch (error) {
      console.error('approvePlan error:', error);
      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({ success: false, message: error.message });
    }
  };

  togglePlanStatus = async (req, res) => {
    try {
      const plan = await pmService.togglePlanStatus(req.params.id, req.user.company_id);
      res.status(200).json({ success: true, data: plan, message: 'Plan status toggled successfully' });
    } catch (error) {
      console.error('togglePlanStatus error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  clonePlan = async (req, res) => {
    try {
      const { old_plan_id, new_year } = req.body;
      if (!old_plan_id || !new_year) throw new Error('Old plan ID and new year are required');
      const plan = await pmService.clonePlan(req.user.company_id, req.user.userid, old_plan_id, new_year);
      res.status(200).json({ success: true, data: plan, message: 'Plan cloned successfully' });
    } catch (error) {
      console.error('clonePlan error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };
}

module.exports = new PreventiveMaintenanceController();
