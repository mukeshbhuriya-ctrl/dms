const prisma = require('#prisma');

class PreventiveMaintenanceService {
  /**
   * Get all PM Plans (paginated)
   */
  async getPlans({ company_id, page = 1, limit = 10, search = '' }) {
    const skip = (page - 1) * limit;
    const where = {
      company_id,
      is_deleted: false,
      ...(search && {
        OR: [
          { year: { contains: search, mode: 'insensitive' } },
          { doc_no: { contains: search, mode: 'insensitive' } },
        ]
      })
    };

    const [plans, total] = await Promise.all([
      prisma.preventive_maintenance_plan.findMany({
        where,
        skip: limit === 'all' ? undefined : skip,
        take: limit === 'all' ? undefined : parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          approved_by: { select: { name: true } },
          signers: {
            include: { user: { select: { name: true } } }
          }
        }
      }),
      prisma.preventive_maintenance_plan.count({ where })
    ]);

    // Calculate progress for each plan based on events
    const plansWithProgress = await Promise.all(plans.map(async (plan) => {
      const totalEvents = await prisma.preventive_maintenance_event.count({
        where: { schedule: { plan_id: plan.id } }
      });
      const doneEvents = await prisma.preventive_maintenance_event.count({
        where: { schedule: { plan_id: plan.id }, status: 'DONE' }
      });
      return {
        ...plan,
        progress: totalEvents > 0 ? Math.round((doneEvents / totalEvents) * 100) : 0,
        preparedByNames: plan.signers.map(p => p.user.name).join('/'),
      };
    }));

    return {
      data: plansWithProgress,
      meta: {
        total,
        page: parseInt(page),
        limit: limit === 'all' ? total : parseInt(limit),
        totalPages: limit === 'all' ? 1 : Math.ceil(total / parseInt(limit))
      }
    };
  }

  /**
   * Get single PM Plan with full schedule details
   */
  async getPlanById(plan_id, company_id) {
    const plan = await prisma.preventive_maintenance_plan.findFirst({
      where: { id: plan_id, company_id },
      include: {
        signers: { include: { user: { select: { id: true, name: true } } } },
        schedules: {
          include: {
            machine: { select: { id: true, machine_name: true, machine_number: true } },
            events: {
              orderBy: { event_label: 'asc' }
            }
          }
        }
      }
    });

    if (!plan) throw new Error('Plan not found');
    return plan;
  }

  /**
   * Create or Update PM Plan
   */
  async savePlan(company_id, user_id, planData) {
    const { id, year, doc_no, rev_no, rev_date, frequency, status, preparer_ids, approved_by_id, schedules } = planData;

    if (!preparer_ids || preparer_ids.length === 0) {
      throw new Error("At least one preparer must be assigned to the schedule.");
    }
    if (!approved_by_id) {
      throw new Error("An approver must be assigned to the schedule.");
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Create or Update Master Plan
      let plan;
      if (id) {
        plan = await tx.preventive_maintenance_plan.update({
          where: { id },
          data: { year, doc_no, rev_no, rev_date: rev_date ? new Date(rev_date) : null, frequency, status, approved_by_id }
        });
      } else {
        plan = await tx.preventive_maintenance_plan.create({
          data: { company_id, year, doc_no, rev_no, rev_date: rev_date ? new Date(rev_date) : null, frequency, status, approved_by_id }
        });
      }

      // 2. Update Signers
      if (preparer_ids && preparer_ids.length > 0) {
        // Delete existing
        await tx.preventive_maintenance_plan_signer.deleteMany({ where: { plan_id: plan.id } });
        // Create new
        await tx.preventive_maintenance_plan_signer.createMany({
          data: preparer_ids.map(uid => ({
            plan_id: plan.id,
            user_id: uid,
            signed_at: new Date()
          }))
        });
      }

      // 3. Process Schedules (Machine Rows)
      if (schedules && schedules.length > 0) {
        // For simplicity in this demo, we can just delete all existing schedules and recreate them
        // In a strict prod environment, we would do a diff to preserve event IDs.
        await tx.preventive_maintenance_schedule.deleteMany({ where: { plan_id: plan.id } });

        for (const sched of schedules) {
          const newSched = await tx.preventive_maintenance_schedule.create({
            data: {
              plan_id: plan.id,
              machine_id: sched.machineId,
            }
          });

          // Create Events
          if (sched.events && sched.events.length > 0) {
            await tx.preventive_maintenance_event.createMany({
              data: sched.events.map(ev => ({
                schedule_id: newSched.id,
                event_label: ev.label || ev.key,
                plan_date: ev.planDate ? new Date(ev.planDate) : null,
                done_date: ev.doneDate ? new Date(ev.doneDate) : null,
                status: ev.status || 'PENDING'
              }))
            });
          }
        }
      }

      return plan;
    });
  }

  /**
   * Clone previous year plan to new year
   */
  
  async archivePlan(plan_id, company_id) {
    return await prisma.preventive_maintenance_plan.update({
      where: { id: plan_id, company_id },
      data: { is_deleted: true }
    });
  }

  
  
  async rejectPlan(plan_id, company_id, user_id) {
    const plan = await prisma.preventive_maintenance_plan.findFirst({
      where: { id: plan_id, company_id }
    });
    if (!plan) throw new Error("Plan not found");
    if (plan.status !== 'PENDING') throw new Error("Only PENDING plans can be rejected");
    if (plan.approved_by_id !== user_id) throw new Error("Unauthorized: Only the designated approver can reject this plan");
    
    return await prisma.preventive_maintenance_plan.update({
      where: { id: plan_id },
      data: { status: 'DRAFT' }
    });
  }

  async approvePlan(plan_id, company_id, user_id) {
    const plan = await prisma.preventive_maintenance_plan.findFirst({
      where: { id: plan_id, company_id }
    });
    if (!plan) throw new Error("Plan not found");
    if (plan.status !== 'PENDING') throw new Error("Only PENDING plans can be approved");
    if (plan.approved_by_id !== user_id) throw new Error("Unauthorized: Only the designated approver can approve this plan");
    
    return await prisma.preventive_maintenance_plan.update({
      where: { id: plan_id },
      data: { status: 'APPROVED', approved_at: new Date() }
    });
  }

  async togglePlanStatus(plan_id, company_id) {
    const plan = await prisma.preventive_maintenance_plan.findFirst({
      where: { id: plan_id, company_id }
    });
    if (!plan) throw new Error("Plan not found");
    return await prisma.preventive_maintenance_plan.update({
      where: { id: plan_id },
      data: { is_active: !plan.is_active }
    });
  }

  async clonePlan(company_id, user_id, old_plan_id, new_year) {
    const oldPlan = await this.getPlanById(old_plan_id, company_id);
    if (!oldPlan) throw new Error("Source plan not found");

    return await prisma.$transaction(async (tx) => {
      // 1. Create new master plan
      const newPlan = await tx.preventive_maintenance_plan.create({
        data: {
          company_id,
          year: new_year,
          doc_no: oldPlan.doc_no,
          rev_no: (parseInt(oldPlan.rev_no || 0) + 1).toString(),
          rev_date: new Date(),
          frequency: oldPlan.frequency,
          status: 'DRAFT'
        }
      });

      // 2. Clone Signers
      const oldSigners = oldPlan.signers.map(p => ({
        plan_id: newPlan.id,
        user_id: p.user_id,
        signed_at: new Date()
      }));
      if (oldSigners.length > 0) {
        await tx.preventive_maintenance_plan_signer.createMany({ data: oldSigners });
      }

      // 3. Clone Schedules and Events (+365 days)
      for (const sched of oldPlan.schedules) {
        const newSched = await tx.preventive_maintenance_schedule.create({
          data: { plan_id: newPlan.id, machine_id: sched.machine_id }
        });

        const newEvents = sched.events.map(ev => {
          let newPlanDate = null;
          if (ev.plan_date) {
            newPlanDate = new Date(ev.plan_date);
            newPlanDate.setFullYear(newPlanDate.getFullYear() + 1);
          }
          return {
            schedule_id: newSched.id,
            event_label: ev.event_label,
            plan_date: newPlanDate,
            done_date: null, // Wipe done date
            status: 'PENDING'
          };
        });

        if (newEvents.length > 0) {
          await tx.preventive_maintenance_event.createMany({ data: newEvents });
        }
      }

      return newPlan;
    });
  }
}

module.exports = new PreventiveMaintenanceService();
