/*
  Warnings:

  - A unique constraint covering the columns `[company_id,serial_no]` on the table `document_master` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[company_id,document_number]` on the table `document_master` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "document_master_company_id_serial_no_key" ON "document_master"("company_id", "serial_no");

-- CreateIndex
CREATE UNIQUE INDEX "document_master_company_id_document_number_key" ON "document_master"("company_id", "document_number");
