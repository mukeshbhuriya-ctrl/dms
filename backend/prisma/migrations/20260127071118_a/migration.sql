/*
  Warnings:

  - You are about to drop the column `document_type` on the `document_master` table. All the data in the column will be lost.
  - Added the required column `document_type_id` to the `document_master` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "document_master" DROP COLUMN "document_type",
ADD COLUMN     "document_type_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "document_type" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_type_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "document_type" ADD CONSTRAINT "document_type_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_master" ADD CONSTRAINT "document_master_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
