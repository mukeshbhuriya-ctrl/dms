const prisma = require('#prisma');

class QualityProductionDashboardController {
  async getKPIs(req, res) {
    try {
      const company_id = req.user.company_id;

      // Helper to fetch standardized stats for a table with a 'status' column
      const fetchModuleStats = async (modelName, statusMapping = {}, hasActiveFields = true) => {
        const whereClause = { company_id };
        if (hasActiveFields) {
          whereClause.is_active = true;
          whereClause.is_deleted = false;
        }

        const records = await prisma[modelName].groupBy({
          by: ['status'],
          where: whereClause,
          _count: { _all: true }
        });

        const stats = { total: 0, approved: 0, pending: 0, rejected: 0, draft: 0 };
        
        records.forEach(record => {
          const count = record._count._all;
          stats.total += count;
          
          let rawStatus = (record.status || '').toLowerCase().trim();
          // Override mapping if provided (e.g. mhc uses 'offered' instead of 'pending')
          if (statusMapping[rawStatus]) {
             rawStatus = statusMapping[rawStatus];
          }

          if (rawStatus === 'approved' || rawStatus === 'published' || rawStatus === 'cleared') {
            stats.approved += count;
          } else if (rawStatus === 'pending' || rawStatus === 'offered' || rawStatus === 'submitted') {
            stats.pending += count;
          } else if (rawStatus === 'rejected') {
            stats.rejected += count;
          } else if (rawStatus === 'draft') {
            stats.draft += count;
          } else {
             // Fallback for unknown statuses, put them in pending
             stats.pending += count;
          }
        });

        return stats;
      };

      // 1. MHC
      const mhc = await fetchModuleStats('material_heat_chart', { 'offered': 'pending' });

      // 2. QAP
      const qap = await fetchModuleStats('quality_assurance_plan', { 'published': 'approved' }, false);

      // 3. Hydrostatic Test
      const hydrostatic = await fetchModuleStats('hydrostatic_test_report');

      // 4. Dish End Inspection
      const dish_end = await fetchModuleStats('dish_end_inspection_report');

      // 5. Tube Bundle Inspection
      const tube_bundle = await fetchModuleStats('tube_bundle_inspection_report');

      // 6. Final Inspection
      const final_inspection = await fetchModuleStats('final_inspection_report');

      // 7. Tube Sheet Inspection (No status column according to schema, just total count)
      const tube_sheet_total = await prisma.tube_sheet_inspection_report.count({
        where: { company_id, is_active: true, is_deleted: false }
      });
      const tube_sheet = { total: tube_sheet_total, approved: 0, pending: 0, rejected: 0 };


      // 8. Welding Metrics
      const total_plans = await prisma.weld_joint_plan.count({
        where: { company_id, is_active: true, is_deleted: false }
      });

      const total_joints = await prisma.weld_joint.count({
        where: { weld_joint_plan: { company_id, is_active: true, is_deleted: false } }
      });

      // Joint stages (Traveler/Reports)
      const stageRecords = await prisma.weld_joint_stage.groupBy({
         by: ['status'],
         where: { weld_joint: { weld_joint_plan: { company_id, is_active: true, is_deleted: false } }, is_active: true },
         _count: { _all: true }
      });

      let open_stages = 0;
      let completed_reports = 0;

      stageRecords.forEach(record => {
         const status = (record.status || '').toLowerCase().trim();
         if (status === 'approved') {
            completed_reports += record._count._all;
         } else {
            // pending, submitted, rejected count as open/actionable
            open_stages += record._count._all;
         }
      });

      const welding = {
        total_plans,
        total_joints,
        open_stages,
        completed_reports
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
