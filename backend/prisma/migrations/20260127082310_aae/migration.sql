/*
  Warnings:

  - Added the required column `user_id` to the `group_document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `single_document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "group_document" ADD COLUMN     "client_doc_no" TEXT,
ADD COLUMN     "client_reference_no" TEXT,
ADD COLUMN     "reponce_due_days" INTEGER,
ADD COLUMN     "shreno_doc_no" TEXT,
ADD COLUMN     "shreno_reference_no" TEXT,
ADD COLUMN     "upload_due_days" INTEGER,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "single_document" ADD COLUMN     "client_doc_no" TEXT,
ADD COLUMN     "client_reference_no" TEXT,
ADD COLUMN     "reponce_due_days" INTEGER,
ADD COLUMN     "shreno_doc_no" TEXT,
ADD COLUMN     "shreno_reference_no" TEXT,
ADD COLUMN     "upload_due_days" INTEGER,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "single_document" ADD CONSTRAINT "single_document_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_document" ADD CONSTRAINT "group_document_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
