-- DropIndex
DROP INDEX "document_master_company_id_document_number_key";

-- DropIndex
DROP INDEX "document_master_company_id_serial_no_key";

-- AlterTable
ALTER TABLE "dish_end_inspection_report" ADD COLUMN     "created_by" TEXT;

-- AlterTable
ALTER TABLE "final_inspection_report" ADD COLUMN     "created_by" TEXT;

-- AddForeignKey
ALTER TABLE "dish_end_inspection_report" ADD CONSTRAINT "dish_end_inspection_report_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_inspection_report" ADD CONSTRAINT "final_inspection_report_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
