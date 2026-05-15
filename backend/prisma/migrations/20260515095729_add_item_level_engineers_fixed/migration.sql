-- AlterTable
ALTER TABLE "material_heat_chart_item" ADD COLUMN     "production_engineer_id" TEXT,
ADD COLUMN     "qc_engineer_id" TEXT;

-- AddForeignKey
ALTER TABLE "material_heat_chart_item" ADD CONSTRAINT "material_heat_chart_item_action_by_id_fkey" FOREIGN KEY ("action_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_heat_chart_item" ADD CONSTRAINT "material_heat_chart_item_production_engineer_id_fkey" FOREIGN KEY ("production_engineer_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_heat_chart_item" ADD CONSTRAINT "material_heat_chart_item_qc_engineer_id_fkey" FOREIGN KEY ("qc_engineer_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
