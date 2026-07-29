-- CreateTable
CREATE TABLE "maintenance_memo" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "memo_no" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shift" TEXT NOT NULL,
    "inform_by_id" TEXT,
    "inform_to_id" TEXT,
    "production_group_id" TEXT,
    "maintenance_group_id" TEXT,
    "machine_id" TEXT,
    "machine_name" TEXT,
    "fault" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "action_taken" TEXT,
    "attended_by_id" TEXT,
    "activity_type" TEXT,
    "material_consumed" BOOLEAN NOT NULL DEFAULT false,
    "received_time" TIMESTAMP(3),
    "attended_time" TIMESTAMP(3),
    "completion_time" TIMESTAMP(3),
    "completion_date" TIMESTAMP(3),
    "man_hrs_technician" DOUBLE PRECISION,
    "man_hrs_management" DOUBLE PRECISION,
    "total_man_hrs" DOUBLE PRECISION,
    "breakdown_hrs" DOUBLE PRECISION,
    "maintenance_remarks" TEXT,
    "production_remarks" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_memo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_memo_attachment" (
    "id" TEXT NOT NULL,
    "memo_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT,
    "file_size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_memo_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "maintenance_memo_company_id_memo_no_idx" ON "maintenance_memo"("company_id", "memo_no");

-- AddForeignKey
ALTER TABLE "maintenance_memo" ADD CONSTRAINT "maintenance_memo_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_memo" ADD CONSTRAINT "maintenance_memo_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machine_master"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_memo" ADD CONSTRAINT "maintenance_memo_inform_by_id_fkey" FOREIGN KEY ("inform_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_memo" ADD CONSTRAINT "maintenance_memo_inform_to_id_fkey" FOREIGN KEY ("inform_to_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_memo" ADD CONSTRAINT "maintenance_memo_attended_by_id_fkey" FOREIGN KEY ("attended_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_memo" ADD CONSTRAINT "maintenance_memo_production_group_id_fkey" FOREIGN KEY ("production_group_id") REFERENCES "employee_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_memo" ADD CONSTRAINT "maintenance_memo_maintenance_group_id_fkey" FOREIGN KEY ("maintenance_group_id") REFERENCES "employee_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_memo_attachment" ADD CONSTRAINT "maintenance_memo_attachment_memo_id_fkey" FOREIGN KEY ("memo_id") REFERENCES "maintenance_memo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
