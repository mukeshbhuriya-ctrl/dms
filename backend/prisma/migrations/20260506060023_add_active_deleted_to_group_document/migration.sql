-- AlterTable
ALTER TABLE "group_document" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;
