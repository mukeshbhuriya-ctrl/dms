const prisma = require('#prisma');

class QualityProductionDashboardController {
  async getKPIs(req, res) {
    try {
      const company_id = req.user.company_id;

      // Helper to fetch standardized stats for a table with a 'status' column
      const fetchModuleStats = async (modelName, statusMapping = {}, hasActiveFields = true, hasDrafts = true) => {
        const whereClause = { company_id };
        if (hasActiveFields) {
          whereClause.is_active = true;
          whereClause.is_deleted = false;
        }

        // Apply draft visibility logic if the module supports drafts
        if (hasDrafts) {
          const userId = req.user.userid || req.user.id;
          whereClause.OR = [
              { status: { not: 'Draft' } },
              { AND: [{ status: 'Draft' }, { created_by: userId }] }
          ];
        }

        const records = await prisma[modelName].groupBy({
          by: ['status'],
          where: whereClause,
          _count: { _all: true }
        });

        // ------------------ NEW LOGIC FOR TODAY ------------------
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const todayWhereClause = { ...whereClause, updatedAt: { gte: startOfToday } };
        
        const todayRecords = await prisma[modelName].groupBy({
          by: ['status'],
          where: todayWhereClause,
          _count: { _all: true }
        });
        // ---------------------------------------------------------

        const stats = { total: 0, approved: 0, pending: 0, rejected: 0, draft: 0, today_total: 0, today_approved: 0, today_pending: 0, today_rejected: 0, today_draft: 0 };
        
        const mapStats = (recordsArray, isToday = false) => {
           recordsArray.forEach(record => {
             const count = record._count._all;
             if (isToday) stats.today_total += count;
             else stats.total += count;
             
             let rawStatus = (record.status || '').toLowerCase().trim();
             // Override mapping if provided (e.g. mhc uses 'offered' instead of 'pending')
             if (statusMapping[rawStatus]) {
                rawStatus = statusMapping[rawStatus];
             }

             if (rawStatus === 'approved' || rawStatus === 'published' || rawStatus === 'cleared') {
               if (isToday) stats.today_approved += count;
               else stats.approved += count;
             } else if (rawStatus === 'pending' || rawStatus === 'offered' || rawStatus === 'submitted') {
               if (isToday) stats.today_pending += count;
               else stats.pending += count;
             } else if (rawStatus === 'rejected') {
               if (isToday) stats.today_rejected += count;
               else stats.rejected += count;
             } else if (rawStatus === 'draft') {
               if (isToday) stats.today_draft += count;
               else stats.draft += count;
             } else {
                // Fallback for unknown statuses, put them in pending
                if (isToday) stats.today_pending += count;
                else stats.pending += count;
             }
           });
        };

        mapStats(records, false);
        mapStats(todayRecords, true);

        return stats;
      };

      // 1. MHC
      const mhc = await fetchModuleStats('material_heat_chart', { 'offered': 'pending' }, true, false);

      // 2. QAP
      const qap = await fetchModuleStats('quality_assurance_plan', { 'published': 'approved' }, false, false);

      // 3. Hydrostatic Test
      const hydrostatic = await fetchModuleStats('hydrostatic_test_report', {}, true, false);

      // 4. Dish End Inspection
      const dish_end = await fetchModuleStats('dish_end_inspection_report');

      // 5. Tube Bundle Inspection
      const tube_bundle = await fetchModuleStats('tube_bundle_inspection_report');

      // 6. Final Inspection
      const final_inspection = await fetchModuleStats('final_inspection_report');

      // 7. Tube Sheet Inspection
      const tube_sheet = await fetchModuleStats('tube_sheet_inspection_report');


      // 8. Welding Metrics
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const total_plans = await prisma.weld_joint_plan.count({
        where: { company_id, is_active: true, is_deleted: false }
      });
      const today_total_plans = await prisma.weld_joint_plan.count({
        where: { company_id, is_active: true, is_deleted: false, updatedAt: { gte: startOfToday } }
      });

      const total_joints = await prisma.weld_joint.count({
        where: { weld_joint_plan: { company_id, is_active: true, is_deleted: false } }
      });
      const today_total_joints = await prisma.weld_joint.count({
        where: { weld_joint_plan: { company_id, is_active: true, is_deleted: false }, updatedAt: { gte: startOfToday } }
      });

      // Joint stages (Traveler/Reports)
      const stageRecords = await prisma.weld_joint_stage.groupBy({
         by: ['status'],
         where: { weld_joint: { weld_joint_plan: { company_id, is_active: true, is_deleted: false } }, is_active: true },
         _count: { _all: true }
      });
      const todayStageRecords = await prisma.weld_joint_stage.groupBy({
         by: ['status'],
         where: { weld_joint: { weld_joint_plan: { company_id, is_active: true, is_deleted: false } }, is_active: true, updatedAt: { gte: startOfToday } },
         _count: { _all: true }
      });

      let open_stages = 0;
      let completed_reports = 0;
      let today_open_stages = 0;
      let today_completed_reports = 0;

      stageRecords.forEach(record => {
         const status = (record.status || '').toLowerCase().trim();
         if (status === 'approved') completed_reports += record._count._all;
         else open_stages += record._count._all;
      });
      todayStageRecords.forEach(record => {
         const status = (record.status || '').toLowerCase().trim();
         if (status === 'approved') today_completed_reports += record._count._all;
         else today_open_stages += record._count._all;
      });

      const welding = {
        total_plans, today_total_plans,
        total_joints, today_total_joints,
        open_stages, today_open_stages,
        completed_reports, today_completed_reports
      };

      res.status(200).json({
        success: true,
        data: {
          mhc,
          qap,
          hydrostatic,
          dish_end,
          tube_bundle,
          final_inspection,
          tube_sheet,
          welding
        }
      });

    } catch (error) {
      console.error('Quality Production Dashboard Error:', error);
      res.status(500).json({ success: false, message: error.message, stack: error.stack });
    }
  }
}

module.exports = new QualityProductionDashboardController();
