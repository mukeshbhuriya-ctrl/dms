-- AlterTable
ALTER TABLE "quality_assurance_plan" ADD COLUMN     "attachments" JSONB,
ADD COLUMN     "qap_type" TEXT NOT NULL DEFAULT 'INTERNAL';
