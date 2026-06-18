-- CreateTable
CREATE TABLE "tube_bundle_inspection_report" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "inspection_type" TEXT,
    "job_id" TEXT NOT NULL,
    "client" TEXT,
    "po_no" TEXT,
    "equipment_name" TEXT,
    "tag_no" TEXT,
    "code" TEXT,
    "drg_no" TEXT,
    "insp_agency" TEXT,
    "qap_clause" TEXT,
    "report_no" TEXT,
    "status" TEXT,
    "production_group_id" TEXT,
    "production_engineer_id" TEXT,
    "qc_group_id" TEXT,
    "qc_engineer_id" TEXT,
    "created_by" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tube_bundle_inspection_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tube_bundle_inspection_item" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "sr_no" INTEGER,
    "description" TEXT,
    "as_per_drg" TEXT,
    "actual_dimension" TEXT,
    "remarks" TEXT,

    CONSTRAINT "tube_bundle_inspection_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tube_bundle_inspection_instrument" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "instrument_id" TEXT,
    "name" TEXT,
    "id_no" TEXT,
    "due_date" TEXT,

    CONSTRAINT "tube_bundle_inspection_instrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tube_bundle_inspection_remark" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "text" TEXT,

    CONSTRAINT "tube_bundle_inspection_remark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tube_bundle_inspection_item_report_id_idx" ON "tube_bundle_inspection_item"("report_id");

-- CreateIndex
CREATE INDEX "tube_bundle_inspection_instrument_report_id_idx" ON "tube_bundle_inspection_instrument"("report_id");

-- CreateIndex
CREATE INDEX "tube_bundle_inspection_remark_report_id_idx" ON "tube_bundle_inspection_remark"("report_id");

-- AddForeignKey
ALTER TABLE "tube_bundle_inspection_report" ADD CONSTRAINT "tube_bundle_inspection_report_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tube_bundle_inspection_report" ADD CONSTRAINT "tube_bundle_inspection_report_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tube_bundle_inspection_report" ADD CONSTRAINT "tube_bundle_inspection_report_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tube_bundle_inspection_report" ADD CONSTRAINT "tube_bundle_inspection_report_production_group_id_fkey" FOREIGN KEY ("production_group_id") REFERENCES "employee_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tube_bundle_inspection_report" ADD CONSTRAINT "tube_bundle_inspection_report_qc_group_id_fkey" FOREIGN KEY ("qc_group_id") REFERENCES "employee_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tube_bundle_inspection_report" ADD CONSTRAINT "tube_bundle_inspection_report_production_engineer_id_fkey" FOREIGN KEY ("production_engineer_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tube_bundle_inspection_report" ADD CONSTRAINT "tube_bundle_inspection_report_qc_engineer_id_fkey" FOREIGN KEY ("qc_engineer_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tube_bundle_inspection_item" ADD CONSTRAINT "tube_bundle_inspection_item_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "tube_bundle_inspection_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tube_bundle_inspection_instrument" ADD CONSTRAINT "tube_bundle_inspection_instrument_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "tube_bundle_inspection_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tube_bundle_inspection_instrument" ADD CONSTRAINT "tube_bundle_inspection_instrument_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "instruments_master"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tube_bundle_inspection_remark" ADD CONSTRAINT "tube_bundle_inspection_remark_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "tube_bundle_inspection_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
