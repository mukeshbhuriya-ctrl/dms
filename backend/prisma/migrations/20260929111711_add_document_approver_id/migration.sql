-- AlterTable
ALTER TABLE "group_document" ADD COLUMN     "document_approver_id" TEXT;

-- AddForeignKey
ALTER TABLE "group_document" ADD CONSTRAINT "group_document_document_approver_id_fkey" FOREIGN KEY ("document_approver_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
