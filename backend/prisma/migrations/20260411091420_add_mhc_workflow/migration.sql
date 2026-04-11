-- AlterTable
ALTER TABLE "material_heat_chart" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approver_remarks" TEXT,
ADD COLUMN     "production_engineer_id" TEXT,
ADD COLUMN     "qc_engineer_id" TEXT,
ADD COLUMN     "rejected_at" TIMESTAMP(3),
ADD COLUMN     "submitted_at" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'Pending';

-- AlterTable
ALTER TABLE "material_heat_chart_item" ADD COLUMN     "grn_app_ap_no" TEXT;

-- AddForeignKey
ALTER TABLE "material_heat_chart" ADD CONSTRAINT "material_heat_chart_production_engineer_id_fkey" FOREIGN KEY ("production_engineer_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_heat_chart" ADD CONSTRAINT "material_heat_chart_qc_engineer_id_fkey" FOREIGN KEY ("qc_engineer_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
