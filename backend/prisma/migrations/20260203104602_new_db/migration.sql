-- CreateTable
CREATE TABLE "weld_joint_plan" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "shreno_drg_no" TEXT NOT NULL,
    "customer_drg_no" TEXT,
    "code_of_construction" TEXT NOT NULL,
    "weld_plan_no" TEXT NOT NULL,
    "serial_no" INTEGER NOT NULL,
    "created_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weld_joint_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weld_joint" (
    "id" TEXT NOT NULL,
    "weld_joint_plan_id" TEXT NOT NULL,
    "joint_no" TEXT NOT NULL,
    "joint_type" TEXT NOT NULL,
    "joint_description" TEXT NOT NULL,
    "base_metal_thickness_p1" TEXT,
    "base_metal_thickness_p2" TEXT,
    "base_metal_spec_p1" TEXT,
    "base_metal_spec_p2" TEXT,
    "consumable" TEXT,
    "wps_pqr_no" TEXT,
    "process" TEXT,
    "impact_test" TEXT,
    "back_chip_req" BOOLEAN,
    "pwht" BOOLEAN,
    "rt" BOOLEAN,
    "pt" BOOLEAN,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weld_joint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weld_joint_inspection" (
    "id" TEXT NOT NULL,
    "weld_joint_id" TEXT NOT NULL,
    "s1_status" TEXT NOT NULL DEFAULT 'pending',
    "s1_data" JSONB,
    "s1_prod_eng_id" TEXT,
    "s1_qc_eng_id" TEXT,
    "s1_completed_at" TIMESTAMP(3),
    "s2_status" TEXT NOT NULL DEFAULT 'pending',
    "s2_prod_eng_id" TEXT,
    "s2_qc_eng_id" TEXT,
    "s2_completed_at" TIMESTAMP(3),
    "s3_status" TEXT NOT NULL DEFAULT 'pending',
    "s3_welder_no" TEXT,
    "s3_prod_eng_id" TEXT,
    "s3_qc_eng_id" TEXT,
    "s3_completed_at" TIMESTAMP(3),
    "s4_status" TEXT NOT NULL DEFAULT 'pending',
    "s4_prod_eng_id" TEXT,
    "s4_ndt_eng_id" TEXT,
    "s4_completed_at" TIMESTAMP(3),
    "s5_status" TEXT NOT NULL DEFAULT 'pending',
    "s5_prod_eng_id" TEXT,
    "s5_ndt_eng_id" TEXT,
    "s5_completed_at" TIMESTAMP(3),
    "s6_status" TEXT NOT NULL DEFAULT 'pending',
    "s6_prod_eng_id" TEXT,
    "s6_qc_eng_id" TEXT,
    "s6_post_rt_status" TEXT,
    "s6_post_pt_status" TEXT,
    "s6_completed_at" TIMESTAMP(3),
    "s7_status" TEXT NOT NULL DEFAULT 'pending',
    "s7_data" JSONB,
    "s7_completed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weld_joint_inspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weld_joint_inspection_weld_joint_id_key" ON "weld_joint_inspection"("weld_joint_id");

-- AddForeignKey
ALTER TABLE "weld_joint_plan" ADD CONSTRAINT "weld_joint_plan_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weld_joint_plan" ADD CONSTRAINT "weld_joint_plan_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weld_joint_plan" ADD CONSTRAINT "weld_joint_plan_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weld_joint" ADD CONSTRAINT "weld_joint_weld_joint_plan_id_fkey" FOREIGN KEY ("weld_joint_plan_id") REFERENCES "weld_joint_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weld_joint_inspection" ADD CONSTRAINT "weld_joint_inspection_weld_joint_id_fkey" FOREIGN KEY ("weld_joint_id") REFERENCES "weld_joint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
