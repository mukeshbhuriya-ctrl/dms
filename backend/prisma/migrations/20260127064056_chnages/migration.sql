/*
  Warnings:

  - Added the required column `email` to the `po_communication_matrix` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `po_communication_matrix` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `po_communication_matrix` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "po_communication_matrix" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL;
