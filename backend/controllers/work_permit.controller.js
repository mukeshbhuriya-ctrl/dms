const workPermitService = require('../services/work_permit.service');

class WorkPermitController {
  
  async getAllPermits(req, res, next) {
    try {
      const companyId = req.user.company_id;
      const permits = await workPermitService.getAllPermits(companyId, req.query);
      res.status(200).json({
        success: true,
        message: "Permits fetched successfully",
        data: permits.data,
        meta: permits.meta
      });
    } catch (error) {
      next(error);
    }
  }

  async getPermitById(req, res, next) {
    try {
      const { id } = req.params;
      const companyId = req.user.company_id;
      const permit = await workPermitService.getPermitById(id, companyId);
      res.status(200).json({
        success: true,
        message: "Permit fetched successfully",
        data: permit
      });
    } catch (error) {
      next(error);
    }
  }

  async initiatePermit(req, res, next) {
    try {
      const companyId = req.user.company_id;
      const userId = req.user.userid || req.user.id;
      const permit = await workPermitService.initiatePermit(companyId, userId, req.body);
      res.status(201).json({
        success: true,
        message: "Permit initiated successfully",
        data: permit
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStage1(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userid || req.user.id;
      const payload = { ...req.body, company_id: req.user.company_id };
      const permit = await workPermitService.updateStage1(id, userId, payload);
      res.status(200).json({
        success: true,
        message: "Stage 1 data updated successfully",
        data: permit
      });
    } catch (error) {
      next(error);
    }
  }

  async submitElectricalReview(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userid || req.user.id;
      const payload = { ...req.body, company_id: req.user.company_id };
      const permit = await workPermitService.submitElectricalReview(id, userId, payload);
      res.status(200).json({
        success: true,
        message: "Electrical review submitted successfully",
        data: permit
      });
    } catch (error) {
      next(error);
    }
  }

  async submitAcceptorReview(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userid || req.user.id;
      const payload = { ...req.body, company_id: req.user.company_id };
      const permit = await workPermitService.submitAcceptorReview(id, userId, payload);
      res.status(200).json({
        success: true,
        message: "Acceptor review submitted successfully",
        data: permit
      });
    } catch (error) {
      next(error);
    }
  }

  async approvePermit(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userid || req.user.id;
      const payload = { ...req.body, company_id: req.user.company_id };
      const permit = await workPermitService.approvePermit(id, userId, payload);
      const message = payload.action === 'FORWARD' ? "Permit forwarded successfully" : "Permit approved successfully";
      res.status(200).json({
        success: true,
        message: message,
        data: permit
      });
    } catch (error) {
      next(error);
    }
  }

  async safetyApprove(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userid || req.user.id;
      const payload = { ...req.body, company_id: req.user.company_id };
      const permit = await workPermitService.safetyApprove(id, userId, payload);
      res.status(200).json({
        success: true,
        message: "Safety clearance granted successfully",
        data: permit
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WorkPermitController();
