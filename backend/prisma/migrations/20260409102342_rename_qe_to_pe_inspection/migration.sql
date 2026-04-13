/*
  Warnings:

  - You are about to drop the column `quality_engineer_id` on the `dish_end_inspection_report` table. All the data in the column will be lost.
  - You are about to drop the column `quality_engineer_id` on the `final_inspection_report` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "dish_end_inspection_report" DROP CONSTRAINT "dish_end_inspection_report_quality_engineer_id_fkey";

-- DropForeignKey
ALTER TABLE "final_inspection_report" DROP CONSTRAINT "final_inspection_report_quality_engineer_id_fkey";

-- AlterTable
ALTER TABLE "dish_end_inspection_report" DROP COLUMN "quality_engineer_id",
ADD COLUMN     "production_engineer_id" TEXT;

-- AlterTable
ALTER TABLE "final_inspection_report" DROP COLUMN "quality_engineer_id",
ADD COLUMN     "production_engineer_id" TEXT;

-- AddForeignKey
ALTER TABLE "dish_end_inspection_report" ADD CONSTRAINT "dish_end_inspection_report_production_engineer_id_fkey" FOREIGN KEY ("production_engineer_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_inspection_report" ADD CONSTRAINT "final_inspection_report_production_engineer_id_fkey" FOREIGN KEY ("production_engineer_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
