-- DropForeignKey
ALTER TABLE "document_version" DROP CONSTRAINT "document_version_uploaded_by_fkey";

-- AlterTable
ALTER TABLE "document_version" ALTER COLUMN "uploaded_by" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "document_version" ADD CONSTRAINT "document_version_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
