-- AlterTable
ALTER TABLE "weld_joint_stage" ADD COLUMN     "assigned_qc_group_id" TEXT;

-- AddForeignKey
ALTER TABLE "weld_joint_stage" ADD CONSTRAINT "weld_joint_stage_assigned_qc_group_id_fkey" FOREIGN KEY ("assigned_qc_group_id") REFERENCES "qc_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
