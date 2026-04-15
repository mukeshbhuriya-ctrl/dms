-- DropIndex
DROP INDEX "weld_joint_stage_weld_joint_id_stage_name_key";

-- AlterTable
ALTER TABLE "weld_joint_stage" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "weld_joint_stage_weld_joint_id_stage_name_idx" ON "weld_joint_stage"("weld_joint_id", "stage_name");
