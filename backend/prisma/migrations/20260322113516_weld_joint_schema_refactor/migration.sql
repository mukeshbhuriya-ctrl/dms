/*
  Warnings:

  - You are about to drop the `weld_joint_inspection` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "weld_joint_inspection" DROP CONSTRAINT "weld_joint_inspection_weld_joint_id_fkey";

-- DropTable
DROP TABLE "weld_joint_inspection";

-- CreateTable
CREATE TABLE "weld_joint_report_info" (
    "id" TEXT NOT NULL,
    "weld_joint_id" TEXT NOT NULL,
    "report_no" TEXT,
    "tag_no" TEXT,
    "equipment" TEXT,
    "projects_id" TEXT,
    "linde_drg_no" TEXT,
    "drg_no" TEXT,
    "code" TEXT,
    "insp_agency" TEXT,

    CONSTRAINT "weld_joint_report_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weld_joint_stage" (
    "id" TEXT NOT NULL,
    "weld_joint_id" TEXT NOT NULL,
    "stage_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "prod_eng_id" TEXT,
    "qc_eng_id" TEXT,
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weld_joint_stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weld_joint_stage_data" (
    "id" TEXT NOT NULL,
    "weld_joint_stage_id" TEXT NOT NULL,
    "material_id_marks" TEXT,
    "nozzle_number" TEXT,
    "tack_welder" TEXT,
    "visual_inspection" TEXT,
    "l_seam_rt" TEXT,
    "nozzle_size" TEXT,
    "total_length" TEXT,
    "welder_number" TEXT,
    "overlay_pt" TEXT,
    "opening_size" TEXT,
    "orientation" TEXT,
    "elevation" TEXT,
    "edge_preparation" TEXT,
    "material_id" TEXT,
    "l_seam_ndt" TEXT,
    "cleaning" TEXT,
    "groove_angle" TEXT,
    "root_face" TEXT,
    "root_gap" TEXT,
    "projection" TEXT,
    "pcd_hole" TEXT,
    "rf_pad" TEXT,
    "fillet_size" TEXT,
    "welding_process" TEXT,
    "rf_pad_pneumatic" TEXT,
    "post_rt_status" TEXT,
    "post_pt_status" TEXT,
    "date" TEXT,
    "assigned_ndt_engineer_id" TEXT,

    CONSTRAINT "weld_joint_stage_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weld_joint_stage_row" (
    "id" TEXT NOT NULL,
    "weld_joint_stage_id" TEXT NOT NULL,
    "sr_no" INTEGER NOT NULL,
    "row_name" TEXT NOT NULL,
    "row_value" TEXT,

    CONSTRAINT "weld_joint_stage_row_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weld_joint_report_info_weld_joint_id_key" ON "weld_joint_report_info"("weld_joint_id");

-- CreateIndex
CREATE UNIQUE INDEX "weld_joint_stage_weld_joint_id_stage_name_key" ON "weld_joint_stage"("weld_joint_id", "stage_name");

-- CreateIndex
CREATE UNIQUE INDEX "weld_joint_stage_data_weld_joint_stage_id_key" ON "weld_joint_stage_data"("weld_joint_stage_id");

-- AddForeignKey
ALTER TABLE "weld_joint_report_info" ADD CONSTRAINT "weld_joint_report_info_weld_joint_id_fkey" FOREIGN KEY ("weld_joint_id") REFERENCES "weld_joint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weld_joint_stage" ADD CONSTRAINT "weld_joint_stage_weld_joint_id_fkey" FOREIGN KEY ("weld_joint_id") REFERENCES "weld_joint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weld_joint_stage_data" ADD CONSTRAINT "weld_joint_stage_data_weld_joint_stage_id_fkey" FOREIGN KEY ("weld_joint_stage_id") REFERENCES "weld_joint_stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weld_joint_stage_row" ADD CONSTRAINT "weld_joint_stage_row_weld_joint_stage_id_fkey" FOREIGN KEY ("weld_joint_stage_id") REFERENCES "weld_joint_stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
