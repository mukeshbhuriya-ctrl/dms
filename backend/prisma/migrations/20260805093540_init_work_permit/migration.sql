-- CreateTable
CREATE TABLE "work_permit" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "permit_no" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "active_stage" INTEGER NOT NULL DEFAULT 1,
    "issuer_department_id" TEXT,
    "location" TEXT NOT NULL,
    "job_no" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contractor_name" TEXT,
    "contractor_supervisor" TEXT,
    "early_acceptor_name" TEXT,
    "nature_of_jobs" TEXT[],
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "surrounding_checked" TEXT,
    "cleaned" TEXT,
    "change_control" TEXT,
    "mechanical_isolation" TEXT,
    "electrical_isolation" TEXT,
    "loto_equipment_1_id" TEXT,
    "loto_equipment_2_id" TEXT,
    "approver_comments" TEXT,
    "is_approver_declared" BOOLEAN NOT NULL DEFAULT false,
    "safety_recommendations" TEXT,
    "is_safety_declared" BOOLEAN NOT NULL DEFAULT false,
    "pending_with_user_id" TEXT,
    "pending_with_group_id" TEXT,
    "issuer_id" TEXT NOT NULL,
    "issuer_group_id" TEXT,
    "issued_at" TIMESTAMP(3),
    "electrical_supervisor_id" TEXT,
    "electrical_group_id" TEXT,
    "electrical_verified_at" TIMESTAMP(3),
    "acceptor_id" TEXT,
    "acceptor_group_id" TEXT,
    "accepted_at" TIMESTAMP(3),
    "approver_id" TEXT,
    "approver_group_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "safety_officer_id" TEXT,
    "safety_officer_group_id" TEXT,
    "safety_verified_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_permit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_permit_history" (
    "id" TEXT NOT NULL,
    "work_permit_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "acted_by_id" TEXT NOT NULL,
    "acted_by_group_id" TEXT,
    "target_user_id" TEXT,
    "target_group_id" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_permit_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_permit_key_person" (
    "id" TEXT NOT NULL,
    "work_permit_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT,

    CONSTRAINT "work_permit_key_person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_permit_safety_measure" (
    "id" TEXT NOT NULL,
    "work_permit_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "measure_name" TEXT NOT NULL,
    "is_checked" BOOLEAN,
    "value" TEXT,

    CONSTRAINT "work_permit_safety_measure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_permit_gas_test" (
    "id" TEXT NOT NULL,
    "work_permit_id" TEXT NOT NULL,
    "tester_name" TEXT NOT NULL,
    "o2_level" DOUBLE PRECISION NOT NULL,
    "test_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_permit_gas_test_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_permit_permit_no_key" ON "work_permit"("permit_no");

-- AddForeignKey
ALTER TABLE "work_permit" ADD CONSTRAINT "work_permit_issuer_department_id_fkey" FOREIGN KEY ("issuer_department_id") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit" ADD CONSTRAINT "work_permit_issuer_id_fkey" FOREIGN KEY ("issuer_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit" ADD CONSTRAINT "work_permit_issuer_group_id_fkey" FOREIGN KEY ("issuer_group_id") REFERENCES "employee_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit" ADD CONSTRAINT "work_permit_electrical_supervisor_id_fkey" FOREIGN KEY ("electrical_supervisor_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit" ADD CONSTRAINT "work_permit_electrical_group_id_fkey" FOREIGN KEY ("electrical_group_id") REFERENCES "employee_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit" ADD CONSTRAINT "work_permit_acceptor_id_fkey" FOREIGN KEY ("acceptor_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit" ADD CONSTRAINT "work_permit_acceptor_group_id_fkey" FOREIGN KEY ("acceptor_group_id") REFERENCES "employee_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit" ADD CONSTRAINT "work_permit_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit" ADD CONSTRAINT "work_permit_approver_group_id_fkey" FOREIGN KEY ("approver_group_id") REFERENCES "employee_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit" ADD CONSTRAINT "work_permit_safety_officer_id_fkey" FOREIGN KEY ("safety_officer_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit" ADD CONSTRAINT "work_permit_safety_officer_group_id_fkey" FOREIGN KEY ("safety_officer_group_id") REFERENCES "employee_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit" ADD CONSTRAINT "work_permit_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_history" ADD CONSTRAINT "work_permit_history_work_permit_id_fkey" FOREIGN KEY ("work_permit_id") REFERENCES "work_permit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_history" ADD CONSTRAINT "work_permit_history_acted_by_id_fkey" FOREIGN KEY ("acted_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_key_person" ADD CONSTRAINT "work_permit_key_person_work_permit_id_fkey" FOREIGN KEY ("work_permit_id") REFERENCES "work_permit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_safety_measure" ADD CONSTRAINT "work_permit_safety_measure_work_permit_id_fkey" FOREIGN KEY ("work_permit_id") REFERENCES "work_permit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_permit_gas_test" ADD CONSTRAINT "work_permit_gas_test_work_permit_id_fkey" FOREIGN KEY ("work_permit_id") REFERENCES "work_permit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
