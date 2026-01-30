/*
  Warnings:

  - Added the required column `customer_id` to the `group_document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customer_location_id` to the `group_document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `po_id` to the `group_document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customer_id` to the `single_document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customer_location_id` to the `single_document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `po_id` to the `single_document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "group_document" ADD COLUMN     "customer_id" TEXT NOT NULL,
ADD COLUMN     "customer_location_id" TEXT NOT NULL,
ADD COLUMN     "po_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "single_document" ADD COLUMN     "customer_id" TEXT NOT NULL,
ADD COLUMN     "customer_location_id" TEXT NOT NULL,
ADD COLUMN     "po_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "single_document" ADD CONSTRAINT "single_document_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "single_document" ADD CONSTRAINT "single_document_customer_location_id_fkey" FOREIGN KEY ("customer_location_id") REFERENCES "customer_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "single_document" ADD CONSTRAINT "single_document_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "po"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_document" ADD CONSTRAINT "group_document_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_document" ADD CONSTRAINT "group_document_customer_location_id_fkey" FOREIGN KEY ("customer_location_id") REFERENCES "customer_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_document" ADD CONSTRAINT "group_document_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "po"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
