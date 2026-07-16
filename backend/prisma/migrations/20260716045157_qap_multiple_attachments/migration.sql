/*
  Warnings:

  - You are about to drop the column `attachments` on the `quality_assurance_plan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "quality_assurance_plan" DROP COLUMN "attachments";

-- CreateTable
CREATE TABLE "quality_assurance_plan_attachment" (
    "id" TEXT NOT NULL,
    "qap_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_assurance_plan_attachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "quality_assurance_plan_attachment" ADD CONSTRAINT "quality_assurance_plan_attachment_qap_id_fkey" FOREIGN KEY ("qap_id") REFERENCES "quality_assurance_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
