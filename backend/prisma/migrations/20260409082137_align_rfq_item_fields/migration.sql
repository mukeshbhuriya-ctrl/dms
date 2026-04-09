/*
  Warnings:

  - You are about to drop the column `po_date` on the `rfq_register_item` table. All the data in the column will be lost.
  - You are about to drop the column `po_no` on the `rfq_register_item` table. All the data in the column will be lost.
  - You are about to drop the column `po_value` on the `rfq_register_item` table. All the data in the column will be lost.
  - You are about to drop the column `remarks` on the `rfq_register_item` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "rfq_register_item" DROP COLUMN "po_date",
DROP COLUMN "po_no",
DROP COLUMN "po_value",
DROP COLUMN "remarks";
