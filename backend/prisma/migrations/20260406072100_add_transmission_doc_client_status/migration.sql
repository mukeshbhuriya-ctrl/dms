-- AlterTable
ALTER TABLE "transmission_document" ADD COLUMN     "client_remarks" TEXT,
ADD COLUMN     "client_status" TEXT NOT NULL DEFAULT 'Pending';
