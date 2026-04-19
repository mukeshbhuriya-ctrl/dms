-- CreateTable
CREATE TABLE "drawing_transmittal" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "ref_no" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_id" TEXT,
    "customer_location_id" TEXT,
    "po_id" TEXT,
    "client_name" TEXT,
    "po_number" TEXT,
    "project_id" TEXT,
    "equipment_name" TEXT,
    "tag_no" TEXT,
    "code" TEXT,
    "to_hm" BOOLEAN NOT NULL DEFAULT false,
    "to_hq" BOOLEAN NOT NULL DEFAULT false,
    "to_hmf" BOOLEAN NOT NULL DEFAULT false,
    "to_hpl" BOOLEAN NOT NULL DEFAULT false,
    "to_hst" BOOLEAN NOT NULL DEFAULT false,
    "to_hpc" BOOLEAN NOT NULL DEFAULT false,
    "to_ppd" BOOLEAN NOT NULL DEFAULT false,
    "for_reference" BOOLEAN NOT NULL DEFAULT false,
    "for_planning" BOOLEAN NOT NULL DEFAULT false,
    "for_construction" BOOLEAN NOT NULL DEFAULT false,
    "for_manufacturing" BOOLEAN NOT NULL DEFAULT false,
    "for_outsourcing" BOOLEAN NOT NULL DEFAULT false,
    "for_procurement" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "created_by" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drawing_transmittal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drawing_transmittal_job" (
    "id" TEXT NOT NULL,
    "dtn_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,

    CONSTRAINT "drawing_transmittal_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drawing_transmittal_item" (
    "id" TEXT NOT NULL,
    "dtn_id" TEXT NOT NULL,
    "sr_no" TEXT NOT NULL,
    "doc_no_title" TEXT NOT NULL,
    "document_master_id" TEXT,
    "rev" TEXT,
    "copies" TEXT,
    "dist_hm" BOOLEAN NOT NULL DEFAULT false,
    "dist_hq" BOOLEAN NOT NULL DEFAULT false,
    "dist_hmf" BOOLEAN NOT NULL DEFAULT false,
    "dist_hpl" BOOLEAN NOT NULL DEFAULT false,
    "dist_hst" BOOLEAN NOT NULL DEFAULT false,
    "dist_hpc" BOOLEAN NOT NULL DEFAULT false,
    "dist_ppd" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "drawing_transmittal_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drawing_transmittal_ref_no_key" ON "drawing_transmittal"("ref_no");

-- CreateIndex
CREATE UNIQUE INDEX "drawing_transmittal_job_dtn_id_job_id_key" ON "drawing_transmittal_job"("dtn_id", "job_id");

-- AddForeignKey
ALTER TABLE "drawing_transmittal" ADD CONSTRAINT "drawing_transmittal_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drawing_transmittal" ADD CONSTRAINT "drawing_transmittal_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drawing_transmittal_job" ADD CONSTRAINT "drawing_transmittal_job_dtn_id_fkey" FOREIGN KEY ("dtn_id") REFERENCES "drawing_transmittal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drawing_transmittal_job" ADD CONSTRAINT "drawing_transmittal_job_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drawing_transmittal_item" ADD CONSTRAINT "drawing_transmittal_item_dtn_id_fkey" FOREIGN KEY ("dtn_id") REFERENCES "drawing_transmittal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drawing_transmittal_item" ADD CONSTRAINT "drawing_transmittal_item_document_master_id_fkey" FOREIGN KEY ("document_master_id") REFERENCES "document_master"("id") ON DELETE SET NULL ON UPDATE CASCADE;
