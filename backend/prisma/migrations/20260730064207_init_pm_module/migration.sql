-- CreateTable
CREATE TABLE "preventive_maintenance_plan" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "doc_no" TEXT,
    "rev_no" TEXT,
    "rev_date" TIMESTAMP(3),
    "frequency" TEXT NOT NULL DEFAULT 'QUARTERLY',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT,

    CONSTRAINT "preventive_maintenance_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preventive_maintenance_plan_preparers" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "signed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preventive_maintenance_plan_preparers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preventive_maintenance_schedule" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "machine_id" TEXT NOT NULL,
    "companyId" TEXT,

    CONSTRAINT "preventive_maintenance_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preventive_maintenance_event" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "event_label" TEXT NOT NULL,
    "plan_date" TIMESTAMP(3),
    "done_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "preventive_maintenance_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "preventive_maintenance_plan_preparers_plan_id_user_id_key" ON "preventive_maintenance_plan_preparers"("plan_id", "user_id");

-- AddForeignKey
ALTER TABLE "preventive_maintenance_plan" ADD CONSTRAINT "preventive_maintenance_plan_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenance_plan" ADD CONSTRAINT "preventive_maintenance_plan_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenance_plan" ADD CONSTRAINT "preventive_maintenance_plan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenance_plan_preparers" ADD CONSTRAINT "preventive_maintenance_plan_preparers_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "preventive_maintenance_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenance_plan_preparers" ADD CONSTRAINT "preventive_maintenance_plan_preparers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenance_schedule" ADD CONSTRAINT "preventive_maintenance_schedule_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "preventive_maintenance_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenance_schedule" ADD CONSTRAINT "preventive_maintenance_schedule_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machine_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenance_schedule" ADD CONSTRAINT "preventive_maintenance_schedule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenance_event" ADD CONSTRAINT "preventive_maintenance_event_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "preventive_maintenance_schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
