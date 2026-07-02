-- AlterTable
ALTER TABLE "instruments_master" ADD COLUMN     "created_by" TEXT;

-- AddForeignKey
ALTER TABLE "instruments_master" ADD CONSTRAINT "instruments_master_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
