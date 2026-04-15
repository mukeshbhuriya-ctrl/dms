-- AddForeignKey
ALTER TABLE "weld_joint_stage" ADD CONSTRAINT "weld_joint_stage_prod_eng_id_fkey" FOREIGN KEY ("prod_eng_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weld_joint_stage" ADD CONSTRAINT "weld_joint_stage_qc_eng_id_fkey" FOREIGN KEY ("qc_eng_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
