/*
  Warnings:

  - You are about to drop the column `assigned_qc_group_id` on the `weld_joint_stage` table. All the data in the column will be lost.
  - You are about to drop the column `prod_eng_id` on the `weld_joint_stage` table. All the data in the column will be lost.
  - You are about to drop the column `qc_eng_id` on the `weld_joint_stage` table. All the data in the column will be lost.
  - You are about to drop the `qc_group` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_qc_group` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "qc_group" DROP CONSTRAINT "qc_group_company_id_fkey";

-- DropForeignKey
ALTER TABLE "user_qc_group" DROP CONSTRAINT "user_qc_group_qc_group_id_fkey";

-- DropForeignKey
ALTER TABLE "user_qc_group" DROP CONSTRAINT "user_qc_group_user_id_fkey";

-- DropForeignKey
ALTER TABLE "weld_joint_stage" DROP CONSTRAINT "weld_joint_stage_assigned_qc_group_id_fkey";

-- DropForeignKey
ALTER TABLE "weld_joint_stage" DROP CONSTRAINT "weld_joint_stage_prod_eng_id_fkey";

-- DropForeignKey
ALTER TABLE "weld_joint_stage" DROP CONSTRAINT "weld_joint_stage_qc_eng_id_fkey";

-- AlterTable
ALTER TABLE "weld_joint_stage" DROP COLUMN "assigned_qc_group_id",
DROP COLUMN "prod_eng_id",
DROP COLUMN "qc_eng_id",
ADD COLUMN     "production_engineer_id" TEXT,
ADD COLUMN     "production_group_id" TEXT,
ADD COLUMN     "qc_engineer_id" TEXT,
ADD COLUMN     "qc_group_id" TEXT;

-- DropTable
DROP TABLE "qc_group";

-- DropTable
DROP TABLE "user_qc_group";

-- AddForeignKey
ALTER TABLE "weld_joint_stage" ADD CONSTRAINT "weld_joint_stage_production_engineer_id_fkey" FOREIGN KEY ("production_engineer_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weld_joint_stage" ADD CONSTRAINT "weld_joint_stage_qc_engineer_id_fkey" FOREIGN KEY ("qc_engineer_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weld_joint_stage" ADD CONSTRAINT "weld_joint_stage_production_group_id_fkey" FOREIGN KEY ("production_group_id") REFERENCES "employee_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weld_joint_stage" ADD CONSTRAINT "weld_joint_stage_qc_group_id_fkey" FOREIGN KEY ("qc_group_id") REFERENCES "employee_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
