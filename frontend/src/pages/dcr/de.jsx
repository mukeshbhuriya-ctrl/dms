import DcrApprovalPage from "./approval_page"

function DesignEngineerDCRApproval() {
  return (
    <DcrApprovalPage
      title="Design Engineer DCR Approval"
      listApi="/api/dcr/approval/get-dcr-design-engineer"
      updateApi="/api/dcr/approval/update-design-engineer-status"
      statusField="design_engineer_status"
      remarksField="design_engineer_remarks"
    />
  )
}

export default DesignEngineerDCRApproval
