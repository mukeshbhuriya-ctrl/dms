import DcrApprovalPage from "./approval_page"

function QualityEngineerDCRApproval() {
  return (
    <DcrApprovalPage
      title="Quality Engineer DCR Approval"
      listApi="/api/dcr/approval/get-dcr-quality-engineer"
      updateApi="/api/dcr/approval/update-quality-engineer-status"
      statusField="quality_engineer_status"
      remarksField="quality_engineer_remarks"
    />
  )
}

export default QualityEngineerDCRApproval
