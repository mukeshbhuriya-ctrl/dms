-- CreateTable
CREATE TABLE "company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "empid" TEXT NOT NULL,
    "mobile" TEXT,
    "password" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "department" TEXT,
    "designation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "siteadmin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "siteadmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_short_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_location" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "location_name" TEXT NOT NULL,
    "customer_number_as_per_sap" TEXT NOT NULL,
    "gst_number" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "po" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "customer_location_id" TEXT NOT NULL,
    "po_number" TEXT NOT NULL,
    "po_date" TIMESTAMP(3) NOT NULL,
    "po_doc_url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "po_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "po_communication_matrix" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "po_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "po_communication_matrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "customer_location_id" TEXT NOT NULL,
    "po_id" TEXT NOT NULL,
    "job_number" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "equipement_name" TEXT NOT NULL,
    "tag_number" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_type" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_master" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "document_number" TEXT NOT NULL,
    "document_name" TEXT NOT NULL,
    "document_type_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "single_document" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "customer_location_id" TEXT NOT NULL,
    "po_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "shreno_doc_no" TEXT,
    "shreno_reference_no" TEXT,
    "client_doc_no" TEXT,
    "client_reference_no" TEXT,
    "upload_due_days" INTEGER,
    "response_due_days" INTEGER,
    "user_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',

    CONSTRAINT "single_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_group" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_document" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "customer_location_id" TEXT NOT NULL,
    "po_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "shreno_doc_no" TEXT,
    "shreno_reference_no" TEXT,
    "client_doc_no" TEXT,
    "client_reference_no" TEXT,
    "upload_due_days" INTEGER,
    "response_due_days" INTEGER,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_document_pkey" PRIMARY KEY ("id")
);

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
    "data_json" JSONB,
    "s1_status" TEXT NOT NULL DEFAULT 'pending',
    "s1_data" JSONB,
    "s1_prod_eng_id" TEXT,
    "s1_qc_eng_id" TEXT,
    "s1_submitted_at" TIMESTAMP(3),
    "s1_approved_at" TIMESTAMP(3),
    "s1_rejected_at" TIMESTAMP(3),
    "s2_status" TEXT NOT NULL DEFAULT 'pending',
    "s2_data" JSONB,
    "s2_prod_eng_id" TEXT,
    "s2_qc_eng_id" TEXT,
    "s2_submitted_at" TIMESTAMP(3),
    "s2_approved_at" TIMESTAMP(3),
    "s2_rejected_at" TIMESTAMP(3),
    "s3_status" TEXT NOT NULL DEFAULT 'pending',
    "s3_data" JSONB,
    "s3_prod_eng_id" TEXT,
    "s3_qc_eng_id" TEXT,
    "s3_submitted_at" TIMESTAMP(3),
    "s3_approved_at" TIMESTAMP(3),
    "s3_rejected_at" TIMESTAMP(3),
    "s4_status" TEXT NOT NULL DEFAULT 'pending',
    "s4_data" JSONB,
    "s4_prod_eng_id" TEXT,
    "s4_qc_eng_id" TEXT,
    "s4_submitted_at" TIMESTAMP(3),
    "s4_approved_at" TIMESTAMP(3),
    "s4_rejected_at" TIMESTAMP(3),
    "s5_status" TEXT NOT NULL DEFAULT 'pending',
    "s5_data" JSONB,
    "s5_prod_eng_id" TEXT,
    "s5_qc_eng_id" TEXT,
    "s5_submitted_at" TIMESTAMP(3),
    "s5_approved_at" TIMESTAMP(3),
    "s5_rejected_at" TIMESTAMP(3),
    "s6_status" TEXT NOT NULL DEFAULT 'pending',
    "s6_data" JSONB,
    "s6_prod_eng_id" TEXT,
    "s6_qc_eng_id" TEXT,
    "s6_submitted_at" TIMESTAMP(3),
    "s6_approved_at" TIMESTAMP(3),
    "s6_rejected_at" TIMESTAMP(3),
    "s7_status" TEXT NOT NULL DEFAULT 'pending',
    "s7_data" JSONB,
    "s7_prod_eng_id" TEXT,
    "s7_qc_eng_id" TEXT,
    "s7_submitted_at" TIMESTAMP(3),
    "s7_approved_at" TIMESTAMP(3),
    "s7_rejected_at" TIMESTAMP(3),
    "s8_status" TEXT NOT NULL DEFAULT 'pending',
    "s8_data" JSONB,
    "s8_prod_eng_id" TEXT,
    "s8_qc_eng_id" TEXT,
    "s8_submitted_at" TIMESTAMP(3),
    "s8_approved_at" TIMESTAMP(3),
    "s8_rejected_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weld_joint_inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_version" (
    "id" TEXT NOT NULL,
    "single_document_id" TEXT,
    "group_document_id" TEXT,
    "version_no" INTEGER NOT NULL,
    "file_url" TEXT NOT NULL,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Uploaded',
    "uploaded_by" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transmission" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "transmission_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "customer_location_id" TEXT NOT NULL,
    "po_id" TEXT NOT NULL,
    "zip_url" TEXT,
    "password" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "client_status" TEXT NOT NULL DEFAULT 'Pending',
    "client_remarks" TEXT,
    "created_by" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transmission_document" (
    "id" TEXT NOT NULL,
    "transmission_id" TEXT NOT NULL,
    "single_document_id" TEXT,
    "group_document_id" TEXT,
    "version_id" TEXT NOT NULL,

    CONSTRAINT "transmission_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_heat_chart" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "msn" TEXT NOT NULL,
    "serial_no" INTEGER NOT NULL,
    "report_no" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "po_no" TEXT NOT NULL,
    "project_id" TEXT,
    "equipment_name" TEXT,
    "tag_no" TEXT,
    "code" TEXT,
    "shreno_drg_no" TEXT,
    "customer_drg_no" TEXT,
    "inspection_by" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_heat_chart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_heat_chart_item" (
    "id" TEXT NOT NULL,
    "mhc_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_heading" BOOLEAN NOT NULL DEFAULT false,
    "heading_text" TEXT,
    "parent_heading_id" TEXT,
    "item_no" TEXT,
    "description" TEXT,
    "size" TEXT,
    "material_spec" TEXT,
    "quantity_unit" TEXT,
    "heat_no" TEXT,
    "mtr_no" TEXT,
    "manufacturer" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_heat_chart_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dish_end_inspection_report" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "msn" TEXT NOT NULL,
    "report_no" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "po_no" TEXT NOT NULL,
    "project_id" TEXT,
    "equipment_name" TEXT,
    "tag_no" TEXT,
    "code" TEXT,
    "drg_no" TEXT,
    "insp_agency" TEXT,
    "quality_engineer_id" TEXT,
    "vendor_dish_end_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "approver_remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dish_end_inspection_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dish_end_inspection_item" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "sr_no" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "as_per_drg" TEXT,
    "actual" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dish_end_inspection_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dish_end_inspection_instrument" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "name" TEXT,
    "id_no" TEXT,
    "due_date" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dish_end_inspection_instrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_inspection_report" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "msn" TEXT NOT NULL,
    "report_no" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "po_no" TEXT NOT NULL,
    "project_id" TEXT,
    "equipment_name" TEXT,
    "tag_no" TEXT,
    "code" TEXT,
    "drg_no" TEXT,
    "quality_engineer_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "approver_remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "final_inspection_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_inspection_detail" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "sr_no" INTEGER NOT NULL,
    "description" TEXT,
    "required" TEXT,
    "actual" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "final_inspection_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_inspection_nozzle" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "sr_no" INTEGER NOT NULL,
    "nozzle_mark" TEXT,
    "orientation" TEXT,
    "size" TEXT,
    "location" TEXT,
    "elevation_approved" TEXT,
    "projection_approved" TEXT,
    "elevation_actual" TEXT,
    "projection_actual" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "final_inspection_nozzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_inspection_part" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "sr_no" INTEGER NOT NULL,
    "part_no" TEXT,
    "description" TEXT,
    "orientation_approved" TEXT,
    "elevation_approved" TEXT,
    "projection_approved" TEXT,
    "elevation_actual" TEXT,
    "projection_actual" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "final_inspection_part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_inspection_instrument" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "name" TEXT,
    "id_no" TEXT,
    "due_date" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "final_inspection_instrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_inspection_remark" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "sr_no" INTEGER NOT NULL,
    "text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "final_inspection_remark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dcr" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "dcr_no" TEXT NOT NULL,
    "drg_no" TEXT NOT NULL,
    "equ_no" TEXT NOT NULL,
    "inspect_by" TEXT NOT NULL,
    "design_engineer_id" TEXT NOT NULL,
    "quality_engineer_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dcr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dcr_change_request" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "dcr_id" TEXT NOT NULL,
    "item_part_no" TEXT NOT NULL,
    "chnage_from" TEXT NOT NULL,
    "chnage_to" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dcr_change_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dcr_status" (
    "id" TEXT NOT NULL,
    "dcr_id" TEXT NOT NULL,
    "design_engineer_status" TEXT NOT NULL DEFAULT 'pending',
    "design_engineer_remarks" TEXT,
    "quality_engineer_status" TEXT NOT NULL DEFAULT 'pending',
    "quality_engineer_remarks" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dcr_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfq_register" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "serial_no" INTEGER NOT NULL,
    "quotation_no" TEXT NOT NULL,
    "client_ref" TEXT,
    "rfq_type" TEXT,
    "client_name" TEXT,
    "consultancy" TEXT,
    "contact_person" TEXT,
    "mode_of_enquiry" TEXT,
    "enq_date" TIMESTAMP(3),
    "target_date" TIMESTAMP(3),
    "actual_submission_date" TIMESTAMP(3),
    "time_taken" TEXT,
    "mediator" TEXT,
    "estimator" TEXT,
    "shreno_status" TEXT NOT NULL DEFAULT 'Quoted',
    "client_status" TEXT DEFAULT 'Under Review',
    "remark" TEXT,
    "made_by" TEXT,
    "created_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfq_register_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfq_register_item" (
    "id" TEXT NOT NULL,
    "rfq_id" TEXT NOT NULL,
    "sr_no" INTEGER NOT NULL,
    "enq_description" TEXT,
    "equip_qty" INTEGER,
    "rev" TEXT,
    "total_value" DOUBLE PRECISION,
    "po_no" TEXT,
    "po_date" TIMESTAMP(3),
    "po_value" DOUBLE PRECISION,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfq_register_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfq_lookup" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfq_lookup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hydrostatic_test_report" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "msn" TEXT NOT NULL,
    "serial_no" INTEGER NOT NULL,
    "report_no" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "po_no" TEXT NOT NULL,
    "project_id" TEXT,
    "equipment_name" TEXT,
    "tag_no" TEXT,
    "code" TEXT,
    "shreno_drg_no" TEXT,
    "customer_drg_no" TEXT,
    "construction_code" TEXT,
    "chlorine_content" TEXT,
    "inspection_agency" TEXT,
    "test_position" TEXT,
    "procedure_no" TEXT,
    "test_medium" TEXT,
    "metal_temp" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hydrostatic_test_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hydrostatic_test_item" (
    "id" TEXT NOT NULL,
    "hydro_report_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "particulars" TEXT,
    "mawp_int_ext" TEXT,
    "required_test_pressure" TEXT,
    "actual_test_pressure" TEXT,
    "pg1_range" TEXT,
    "pg1_id_no" TEXT,
    "pg1_calib_date" TEXT,
    "pg1_due_date" TEXT,
    "pg2_range" TEXT,
    "pg2_id_no" TEXT,
    "pg2_calib_date" TEXT,
    "pg2_due_date" TEXT,
    "holding_time" TEXT,
    "test_result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hydrostatic_test_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hydrostatic_test_remark" (
    "id" TEXT NOT NULL,
    "hydro_report_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hydrostatic_test_remark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_assurance_plan" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "msn" TEXT NOT NULL,
    "report_no" TEXT NOT NULL,
    "client" TEXT,
    "po_no" TEXT,
    "po_date" TEXT,
    "project_id" TEXT,
    "equipment_name" TEXT,
    "tag_no" TEXT,
    "code" TEXT,
    "shreno_drg_no" TEXT,
    "customer_drg_no" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "dynamic_columns" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_assurance_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_assurance_plan_item" (
    "id" TEXT NOT NULL,
    "qap_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "sr_no" TEXT,
    "is_heading" BOOLEAN NOT NULL DEFAULT false,
    "is_root" BOOLEAN NOT NULL DEFAULT false,
    "heading_text" TEXT,
    "parent_header_id" TEXT,
    "activity" TEXT,
    "type_method_check" TEXT,
    "extent" TEXT,
    "acceptance_criteria" TEXT,
    "reference_documents" TEXT,
    "verifying_document" TEXT,
    "shreno" TEXT,
    "client_tpia" TEXT,
    "remark" TEXT,
    "dynamic_values" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_assurance_plan_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ncr" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "msn" TEXT NOT NULL,
    "ncr_no" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "client" TEXT,
    "po_no" TEXT,
    "project_id" TEXT,
    "tag_no" TEXT,
    "drg_no" TEXT,
    "rev_no" TEXT,
    "description_non_conformance" TEXT,
    "ncr_raised_at" TEXT,
    "ncr_raised_by" TEXT,
    "ncr_date" TIMESTAMP(3),
    "proposed_resolution" TEXT,
    "resolution_by" TEXT,
    "resolution_date" TIMESTAMP(3),
    "target_engineer_id" TEXT,
    "target_head_design_id" TEXT,
    "target_head_welding_id" TEXT,
    "target_head_quality_id" TEXT,
    "resolution_approval" JSONB,
    "acceptance_date" TIMESTAMP(3),
    "design_review_status" TEXT DEFAULT 'PENDING',
    "head_design_comments" TEXT,
    "welding_review_status" TEXT DEFAULT 'PENDING',
    "head_welding_comments" TEXT,
    "quality_review_status" TEXT DEFAULT 'PENDING',
    "head_quality_comments" TEXT,
    "corrective_action_verified_by" TEXT,
    "corrective_action_comments" TEXT,
    "corrective_action_date" TIMESTAMP(3),
    "verified_by_qce_id" TEXT,
    "disposition" TEXT,
    "verified_by_head_quality_id" TEXT,
    "disposition_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "current_stage" INTEGER NOT NULL DEFAULT 1,
    "ncr_status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ncr_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "department_company_id_name_key" ON "department"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_empid_key" ON "user"("empid");

-- CreateIndex
CREATE UNIQUE INDEX "user_mobile_key" ON "user"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "siteadmin_email_key" ON "siteadmin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "weld_joint_inspection_weld_joint_id_key" ON "weld_joint_inspection"("weld_joint_id");

-- CreateIndex
CREATE UNIQUE INDEX "transmission_transmission_number_key" ON "transmission"("transmission_number");

-- CreateIndex
CREATE UNIQUE INDEX "rfq_lookup_company_id_type_name_key" ON "rfq_lookup"("company_id", "type", "name");

-- AddForeignKey
ALTER TABLE "department" ADD CONSTRAINT "department_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role" ADD CONSTRAINT "role_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_department_fkey" FOREIGN KEY ("department") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_location" ADD CONSTRAINT "customer_location_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_location" ADD CONSTRAINT "customer_location_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po" ADD CONSTRAINT "po_customer_location_id_fkey" FOREIGN KEY ("customer_location_id") REFERENCES "customer_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po" ADD CONSTRAINT "po_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po" ADD CONSTRAINT "po_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po_communication_matrix" ADD CONSTRAINT "po_communication_matrix_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po_communication_matrix" ADD CONSTRAINT "po_communication_matrix_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "po"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_customer_location_id_fkey" FOREIGN KEY ("customer_location_id") REFERENCES "customer_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "po"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_type" ADD CONSTRAINT "document_type_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_master" ADD CONSTRAINT "document_master_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_master" ADD CONSTRAINT "document_master_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "single_document" ADD CONSTRAINT "single_document_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "single_document" ADD CONSTRAINT "single_document_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "document_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "single_document" ADD CONSTRAINT "single_document_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "single_document" ADD CONSTRAINT "single_document_customer_location_id_fkey" FOREIGN KEY ("customer_location_id") REFERENCES "customer_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "single_document" ADD CONSTRAINT "single_document_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "po"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "single_document" ADD CONSTRAINT "single_document_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "single_document" ADD CONSTRAINT "single_document_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group" ADD CONSTRAINT "group_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_group" ADD CONSTRAINT "job_group_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_group" ADD CONSTRAINT "job_group_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_group" ADD CONSTRAINT "job_group_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_document" ADD CONSTRAINT "group_document_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_document" ADD CONSTRAINT "group_document_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_document" ADD CONSTRAINT "group_document_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "document_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_document" ADD CONSTRAINT "group_document_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_document" ADD CONSTRAINT "group_document_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_document" ADD CONSTRAINT "group_document_customer_location_id_fkey" FOREIGN KEY ("customer_location_id") REFERENCES "customer_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_document" ADD CONSTRAINT "group_document_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "po"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "document_version" ADD CONSTRAINT "document_version_single_document_id_fkey" FOREIGN KEY ("single_document_id") REFERENCES "single_document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_version" ADD CONSTRAINT "document_version_group_document_id_fkey" FOREIGN KEY ("group_document_id") REFERENCES "group_document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_version" ADD CONSTRAINT "document_version_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transmission" ADD CONSTRAINT "transmission_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transmission" ADD CONSTRAINT "transmission_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transmission" ADD CONSTRAINT "transmission_customer_location_id_fkey" FOREIGN KEY ("customer_location_id") REFERENCES "customer_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transmission" ADD CONSTRAINT "transmission_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "po"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transmission" ADD CONSTRAINT "transmission_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transmission_document" ADD CONSTRAINT "transmission_document_transmission_id_fkey" FOREIGN KEY ("transmission_id") REFERENCES "transmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transmission_document" ADD CONSTRAINT "transmission_document_single_document_id_fkey" FOREIGN KEY ("single_document_id") REFERENCES "single_document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transmission_document" ADD CONSTRAINT "transmission_document_group_document_id_fkey" FOREIGN KEY ("group_document_id") REFERENCES "group_document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transmission_document" ADD CONSTRAINT "transmission_document_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "document_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_heat_chart" ADD CONSTRAINT "material_heat_chart_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_heat_chart" ADD CONSTRAINT "material_heat_chart_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_heat_chart_item" ADD CONSTRAINT "material_heat_chart_item_mhc_id_fkey" FOREIGN KEY ("mhc_id") REFERENCES "material_heat_chart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_end_inspection_report" ADD CONSTRAINT "dish_end_inspection_report_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_end_inspection_report" ADD CONSTRAINT "dish_end_inspection_report_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_end_inspection_report" ADD CONSTRAINT "dish_end_inspection_report_quality_engineer_id_fkey" FOREIGN KEY ("quality_engineer_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_end_inspection_item" ADD CONSTRAINT "dish_end_inspection_item_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "dish_end_inspection_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_end_inspection_instrument" ADD CONSTRAINT "dish_end_inspection_instrument_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "dish_end_inspection_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_inspection_report" ADD CONSTRAINT "final_inspection_report_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_inspection_report" ADD CONSTRAINT "final_inspection_report_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_inspection_report" ADD CONSTRAINT "final_inspection_report_quality_engineer_id_fkey" FOREIGN KEY ("quality_engineer_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_inspection_detail" ADD CONSTRAINT "final_inspection_detail_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "final_inspection_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_inspection_nozzle" ADD CONSTRAINT "final_inspection_nozzle_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "final_inspection_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_inspection_part" ADD CONSTRAINT "final_inspection_part_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "final_inspection_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_inspection_instrument" ADD CONSTRAINT "final_inspection_instrument_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "final_inspection_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_inspection_remark" ADD CONSTRAINT "final_inspection_remark_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "final_inspection_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dcr" ADD CONSTRAINT "dcr_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dcr" ADD CONSTRAINT "dcr_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dcr" ADD CONSTRAINT "dcr_design_engineer_id_fkey" FOREIGN KEY ("design_engineer_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dcr" ADD CONSTRAINT "dcr_quality_engineer_id_fkey" FOREIGN KEY ("quality_engineer_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dcr_change_request" ADD CONSTRAINT "dcr_change_request_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dcr_change_request" ADD CONSTRAINT "dcr_change_request_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dcr_change_request" ADD CONSTRAINT "dcr_change_request_dcr_id_fkey" FOREIGN KEY ("dcr_id") REFERENCES "dcr"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dcr_status" ADD CONSTRAINT "dcr_status_dcr_id_fkey" FOREIGN KEY ("dcr_id") REFERENCES "dcr"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_register" ADD CONSTRAINT "rfq_register_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_register" ADD CONSTRAINT "rfq_register_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_register_item" ADD CONSTRAINT "rfq_register_item_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "rfq_register"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_lookup" ADD CONSTRAINT "rfq_lookup_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hydrostatic_test_report" ADD CONSTRAINT "hydrostatic_test_report_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hydrostatic_test_report" ADD CONSTRAINT "hydrostatic_test_report_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hydrostatic_test_item" ADD CONSTRAINT "hydrostatic_test_item_hydro_report_id_fkey" FOREIGN KEY ("hydro_report_id") REFERENCES "hydrostatic_test_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hydrostatic_test_remark" ADD CONSTRAINT "hydrostatic_test_remark_hydro_report_id_fkey" FOREIGN KEY ("hydro_report_id") REFERENCES "hydrostatic_test_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_assurance_plan" ADD CONSTRAINT "quality_assurance_plan_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_assurance_plan" ADD CONSTRAINT "quality_assurance_plan_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_assurance_plan_item" ADD CONSTRAINT "quality_assurance_plan_item_qap_id_fkey" FOREIGN KEY ("qap_id") REFERENCES "quality_assurance_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_ncr_raised_by_fkey" FOREIGN KEY ("ncr_raised_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_ncr_raised_at_fkey" FOREIGN KEY ("ncr_raised_at") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_resolution_by_fkey" FOREIGN KEY ("resolution_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_target_engineer_id_fkey" FOREIGN KEY ("target_engineer_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_target_head_design_id_fkey" FOREIGN KEY ("target_head_design_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_target_head_welding_id_fkey" FOREIGN KEY ("target_head_welding_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_target_head_quality_id_fkey" FOREIGN KEY ("target_head_quality_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_corrective_action_verified_by_fkey" FOREIGN KEY ("corrective_action_verified_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_verified_by_qce_id_fkey" FOREIGN KEY ("verified_by_qce_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_verified_by_head_quality_id_fkey" FOREIGN KEY ("verified_by_head_quality_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
