const prisma = require('#prisma');
const notificationService = require('./notification.service');
const auditLogService = require('./auditLog.service');

class WorkPermitService {

  // -------------------------------------------------------------
  // HELPER: Audit Logging
  // -------------------------------------------------------------
  async logHistory(permitId, action, actedById, actedByGroupId, targetUserId, targetGroupId, comments) {
    await prisma.work_permit_history.create({
      data: {
        work_permit_id: permitId,
        action,
        acted_by_id: actedById,
        acted_by_group_id: actedByGroupId,
        target_user_id: targetUserId,
        target_group_id: targetGroupId,
        comments
      }
    });
  }

  // -------------------------------------------------------------
  // CRUD & FETCH OPERATIONS
  // -------------------------------------------------------------

  async getAllPermits(companyId, filters = {}) {
    const { page, limit, search, ...dbFilters } = filters;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const whereClause = {
      company_id: companyId,
      is_deleted: false,
      ...dbFilters
    };

    if (search) {
      whereClause.OR = [
        { permit_no: { contains: search } },
        { location: { contains: search } },
        { job_no: { contains: search } }
      ];
    }

    const [data, totalCount] = await Promise.all([
      prisma.work_permit.findMany({
        where: whereClause,
        include: {
          issuer: { select: { id: true, name: true, empid: true } },
          issuer_department: { select: { id: true, name: true } },
          electrical_supervisor: { select: { id: true, name: true } },
          acceptor: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } },
          safety_officer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limitNum
      }),
      prisma.work_permit.count({ where: whereClause })
    ]);

    return {
      data,
      meta: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    };
  }

  async getPermitById(permitId, companyId) {
    const permit = await prisma.work_permit.findFirst({
      where: { id: permitId, company_id: companyId, is_deleted: false },
      include: {
        issuer: { select: { id: true, name: true, empid: true } },
        issuer_department: { select: { id: true, name: true } },
        electrical_supervisor: { select: { id: true, name: true } },
        acceptor: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
        safety_officer: { select: { id: true, name: true } },
        key_persons: true,
        safety_measures: true,
        gas_tests: true,
        history: {
          include: {
            acted_by: { select: { name: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    
    if (!permit) throw new Error("Work permit not found.");
    return permit;
  }

  // -------------------------------------------------------------
  // STAGE 1: INITIATE PERMIT
  // -------------------------------------------------------------
  async initiatePermit(companyId, userId, payload) {
    // Generate unique permit number
    const count = await prisma.work_permit.count({ where: { company_id: companyId } });
    const permitNo = `WP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Note: Business Rule - Issuer cannot be the Approver for the same permit. 
    // Handled in Stage 4 where Approver is selected, but good to remember.

    const permit = await prisma.work_permit.create({
      data: {
        company_id: companyId,
        permit_no: permitNo,
        status: "PENDING_ELECTRICAL",
        active_stage: 2,

        // Basic Info
        issuer_department_id: payload.issuer_department_id,
        location: payload.location,
        job_no: payload.job_no,
        description: payload.description,
        contractor_name: payload.contractor_name,
        contractor_supervisor: payload.contractor_supervisor,
        early_acceptor_name: payload.early_acceptor_name,
        nature_of_jobs: payload.nature_of_jobs || [],
        valid_from: payload.valid_from ? new Date(payload.valid_from) : null,
        valid_to: payload.valid_to ? new Date(payload.valid_to) : null,

        // Initiator Measures
        surrounding_checked: payload.surrounding_checked,
        cleaned: payload.cleaned,
        change_control: payload.change_control,
        mechanical_isolation: payload.mechanical_isolation,
        electrical_isolation: payload.electrical_isolation,

        // Workflow state
        issuer_id: userId,
        issuer_group_id: payload.issuer_group_id,
        issued_at: new Date(),
        pending_with_group_id: payload.target_electrical_group_id, // Routes to electrical group
        electrical_group_id: payload.target_electrical_group_id, // Save it permanently here

        // Related records
        key_persons: {
          create: payload.key_persons?.map(kp => ({ name: kp.name, designation: kp.designation })) || []
        },
        safety_measures: {
          create: payload.safety_measures?.map(sm => ({
            category: "Issuer",
            measure_name: sm.measure_name,
            is_checked: sm.is_checked,
            value: sm.value
          })) || []
        }
      }
    });

    await this.logHistory(permit.id, "ISSUED", userId, payload.issuer_group_id, null, payload.target_electrical_group_id, "Permit initiated and sent for Electrical Isolation");

    return permit;
  }

  // -------------------------------------------------------------
  // STAGE 1: UPDATE INITIATED PERMIT (Correction)
  // -------------------------------------------------------------
  async updateStage1(permitId, userId, payload) {
    const permit = await this.getPermitById(permitId, payload.company_id);
    
    // Only allow update if it hasn't been completely approved (Stage 5)
    if (permit.status === "APPROVED") throw new Error("Cannot update a fully approved permit.");

    const updated = await prisma.work_permit.update({
      where: { id: permitId },
      data: {
        issuer_department_id: payload.issuer_department_id || undefined,
        location: payload.location,
        job_no: payload.job_no,
        description: payload.description,
        contractor_name: payload.contractor_name,
        contractor_supervisor: payload.contractor_supervisor,
        early_acceptor_name: payload.early_acceptor_name,
        nature_of_jobs: payload.nature_of_jobs || [],
        valid_to: payload.valid_to ? new Date(payload.valid_to) : null,
        
        surrounding_checked: payload.surrounding_checked,
        cleaned: payload.cleaned,
        change_control: payload.change_control,
        mechanical_isolation: payload.mechanical_isolation,
        electrical_isolation: payload.electrical_isolation,
        
        issuer_group_id: payload.issuer_group_id,
        electrical_group_id: payload.target_electrical_group_id,
        pending_with_group_id: permit.active_stage === 2 ? payload.target_electrical_group_id : undefined,

        key_persons: {
          deleteMany: {},
          create: payload.key_persons?.map(kp => ({ name: kp.name, designation: kp.designation })) || []
        },
        safety_measures: {
          deleteMany: { category: "Issuer" },
          create: payload.safety_measures?.map(sm => ({
            category: "Issuer",
            measure_name: sm.measure_name,
            is_checked: sm.is_checked,
            value: sm.value
          })) || []
        }
      }
    });

    await this.logHistory(permitId, "UPDATED", userId, null, null, null, "Initiator updated Stage 1 data.");
    return updated;
  }

  // -------------------------------------------------------------
  // STAGE 2: ELECTRICAL REVIEW
  // -------------------------------------------------------------
  async submitElectricalReview(permitId, userId, payload) {
    const permit = await this.getPermitById(permitId, payload.company_id);
    if (permit.status !== "PENDING_ELECTRICAL") throw new Error("Permit is not pending electrical review.");

    const updated = await prisma.work_permit.update({
      where: { id: permitId },
      data: {
        status: "PENDING_ACCEPTANCE",
        active_stage: 3,
        
        electrical_supervisor_id: userId,
        electrical_group_id: payload.electrical_group_id,
        electrical_verified_at: new Date(),
        
        loto_equipment_1_id: payload.loto_equipment_1_id,
        loto_equipment_2_id: payload.loto_equipment_2_id,

        pending_with_group_id: payload.target_acceptor_group_id, // Routes to Acceptor

        safety_measures: {
          create: payload.electrical_measures?.map(sm => ({
            category: "Electrical",
            measure_name: sm.measure_name,
            value: sm.value
          })) || []
        }
      }
    });

    await this.logHistory(permit.id, "ELECTRICAL_VERIFIED", userId, payload.electrical_group_id, null, payload.target_acceptor_group_id, "Electrical isolation verified.");
    return updated;
  }

  // -------------------------------------------------------------
  // STAGE 3: ACCEPTOR REVIEW
  // -------------------------------------------------------------
  async submitAcceptorReview(permitId, userId, payload) {
    const permit = await this.getPermitById(permitId, payload.company_id);
    if (permit.status !== "PENDING_ACCEPTANCE") throw new Error("Permit is not pending acceptance.");

    const updated = await prisma.work_permit.update({
      where: { id: permitId },
      data: {
        status: "PENDING_APPROVAL",
        active_stage: 4,

        acceptor_id: userId,
        acceptor_group_id: payload.acceptor_group_id,
        accepted_at: new Date(),

        pending_with_user_id: payload.target_approver_id, // Routes explicitly to Approver User
        approver_id: payload.target_approver_id, // Save it permanently here
        pending_with_group_id: null, // Clear group routing to ensure specific user gets it

        safety_measures: {
          create: payload.acceptor_measures?.map(sm => ({
            category: "Acceptor",
            measure_name: sm.measure_name,
            is_checked: sm.is_checked,
            value: sm.value
          })) || []
        },
        gas_tests: {
          create: payload.gas_tests?.map(gt => ({
            tester_name: gt.tester_name,
            o2_level: parseFloat(gt.o2_level),
            test_time: new Date(gt.test_time)
          })) || []
        }
      }
    });

    await this.logHistory(permit.id, "ACCEPTED", userId, payload.acceptor_group_id, payload.target_approver_id, null, "Permit conditions accepted and gas tests recorded.");
    return updated;
  }

  // -------------------------------------------------------------
  // STAGE 4: APPROVER DECISION (Approve or Forward)
  // -------------------------------------------------------------
  async approvePermit(permitId, userId, payload) {
    const permit = await this.getPermitById(permitId, payload.company_id);
    if (permit.status !== "PENDING_APPROVAL") throw new Error("Permit is not pending approval.");
    
    // Business Rule Enforcement: Issuer cannot be the Approver
    if (permit.issuer_id === userId) {
        throw new Error("Conflict of Interest: The Permit Issuer cannot also act as the Permit Approver for the same permit.");
    }

    if (payload.action === 'FORWARD') {
      // Forwarding logic
      const updated = await prisma.work_permit.update({
        where: { id: permitId },
        data: {
          pending_with_user_id: payload.forward_to_user_id,
          approver_comments: payload.approver_comments
        }
      });
      await this.logHistory(permit.id, "FORWARDED", userId, payload.approver_group_id, payload.forward_to_user_id, null, `Forwarded: ${payload.approver_comments || 'No comment'}`);
      return updated;
    } 
    
    // Approval logic
    const updated = await prisma.work_permit.update({
      where: { id: permitId },
      data: {
        status: "PENDING_SAFETY",
        active_stage: 5,
        
        approver_id: userId,
        approver_group_id: payload.approver_group_id,
        approved_at: new Date(),
        
        is_approver_declared: payload.is_approver_declared,
        approver_comments: payload.approver_comments,

        pending_with_user_id: payload.target_safety_id,
        safety_officer_id: payload.target_safety_id,
      }
    });

    await this.logHistory(permit.id, "APPROVED", userId, payload.approver_group_id, payload.target_safety_id, null, "Permit Authorized.");
    return updated;
  }

  // -------------------------------------------------------------
  // STAGE 5: SAFETY CLEARANCE
  // -------------------------------------------------------------
  async safetyApprove(permitId, userId, payload) {
    const permit = await this.getPermitById(permitId, payload.company_id);
    if (permit.status !== "PENDING_SAFETY") throw new Error("Permit is not pending safety clearance.");

    const updated = await prisma.work_permit.update({
      where: { id: permitId },
      data: {
        status: "APPROVED", // Final state
        active_stage: 6,
        
        safety_officer_id: userId,
        safety_officer_group_id: payload.safety_officer_group_id,
        safety_verified_at: new Date(),
        activated_at: new Date(),

        safety_recommendations: payload.safety_recommendations,
        is_safety_declared: payload.is_safety_declared,
        
        pending_with_user_id: null,
        pending_with_group_id: null
      }
    });

    await this.logHistory(permit.id, "SAFETY_CLEARED", userId, payload.safety_officer_group_id, null, null, "Safety clearance granted. Permit is active.");
    return updated;
  }
}

module.exports = new WorkPermitService();
