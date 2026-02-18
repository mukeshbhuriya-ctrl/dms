// Export all DMS pages from a single entry point
export { default as AssignDocument } from "./assign_document"
export { default as CreateJob } from "./create_job"
export { default as CreatePO } from "./create_po"
export { default as CreateTransmission } from "./create_transmission"
export { default as DocumentApprover } from "./document_apprver"
export { default as DocumentMaster } from "./document_master"
export { default as SendDocumentToClient } from "./send_document_to_client"
export { default as ClientApprovalStatus } from "./client_approval_status"


// Export customer pages
export { default as CreateCustomer } from "./customer/create_customer"
export { default as CreateLocation } from "./customer/create_location"
