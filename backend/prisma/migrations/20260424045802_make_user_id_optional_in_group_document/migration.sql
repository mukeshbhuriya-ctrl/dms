-- DropForeignKey
ALTER TABLE "group_document" DROP CONSTRAINT "group_document_user_id_fkey";

-- AlterTable
ALTER TABLE "group_document" ALTER COLUMN "user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "group_document" ADD CONSTRAINT "group_document_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
