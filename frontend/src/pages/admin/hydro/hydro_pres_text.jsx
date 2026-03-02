import { useState, useEffect, useCallback, Fragment } from "react"
import { AdminSidebar } from "@/components"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Trash2, ArrowLeft, Eye, Edit, FileText } from "lucide-react"
import { DataTable } from "@/components/shared/DataTable"
import apiClient from "@/api/api.client"

function emptyRow(id) {
  return {
    id,
    particulars: "",
    mawp_int_ext: "",
    required_test_pressure: "",
    actual_test_pressure: "",
    holding_time: "",
    test_result: "",
    pg1_range: "",
    pg1_id_no: "",
    pg1_calib_date: "",
    pg1_due_date: "",
    pg2_range: "",
    pg2_id_no: "",
    pg2_calib_date: "",
    pg2_due_date: "",
  }
}

// ─── List View ───────────────────────────────────────────────────────────────
function ListView({ onCreateClick, onEditClick }) {
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isViewLoading, setIsViewLoading] = useState(false)
  const [error, setError] = useState("")

  const handleViewClick = async (id) => {
    setIsViewLoading(true)
    setError("")
    try {
      const res = await apiClient.get(`/api/hydro-test/${id}`)
      if (res.success) {
        setSelectedRecord(res.data)
        setIsViewOpen(true)
      } else {
        setError("Failed to fetch details")
      }
    } catch (err) {
      setError("Error fetching details")
      console.error(err)
    } finally {
      setIsViewLoading(false)
    }
  }

  const columns = [
    { header: "Report No.", accessorKey: "report_no" },
    { header: "MSN", accessorKey: "msn" },
    { header: "Client", accessorKey: "client" },
    { header: "PO No.", accessorKey: "po_no" },
    { header: "Project ID", accessorKey: "project_id" },
    { header: "Equipment", accessorKey: "equipment_name" },
    {
      header: "Created",
      accessorKey: "createdAt",
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewClick(row.id)}
            title="View">
            <Eye className="h-4 w-4" /> View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditClick(row.id)}
            title="Edit">
            <Edit className="h-4 w-4" /> Edit
          </Button>
        </div>
      ),
    },
  ]

  const fetchData = useCallback(async ({ page, limit, search }) => {
    const params = new URLSearchParams({ page, limit, ...(search ? { search } : {}) })
    const res = await apiClient.get(`/api/hydro-test/list?${params.toString()}`)
    return { data: res.data, meta: res.meta }
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Hydrostatic Pressure Test Reports</h1>
          <p className="text-muted-foreground">View and manage all hydrostatic pressure test reports.</p>
        </div>
        <Button onClick={onCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Create
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <DataTable columns={columns} fetchData={fetchData} />

      {/* View Details Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[95vw] w-full max-h-[95vh] overflow-y-auto p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-center">Hydrostatic Pressure Test Report Details</DialogTitle>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-y-6 gap-x-4 text-sm border border-border p-6 bg-white rounded-xl shadow-sm">
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">MSN Number:</span>
                  <span className="font-medium">{selectedRecord.msn || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">CLIENT:</span>
                  <span className="font-medium">{selectedRecord.client || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">PO NO:</span>
                  <span className="font-medium">{selectedRecord.po_no || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">PROJECT ID:</span>
                  <span className="font-medium">{selectedRecord.project_id || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">EQUIPMENT:</span>
                  <span className="font-medium">{selectedRecord.equipment_name || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">TAG NO:</span>
                  <span className="font-medium">{selectedRecord.tag_no || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">CODE:</span>
                  <span className="font-medium">{selectedRecord.code || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">SHRENO DRG NO:</span>
                  <span className="font-medium">{selectedRecord.shreno_drg_no || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">CUSTOMER DRG NO:</span>
                  <span className="font-medium">{selectedRecord.customer_drg_no || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">REPORT NO:</span>
                  <span className="font-medium">{selectedRecord.report_no || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">CONSTRUCTION CODE:</span>
                  <span className="font-medium">{selectedRecord.construction_code || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">CHLORINE CONTENT:</span>
                  <span className="font-medium">{selectedRecord.chlorine_content || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">INSPECTION AGENCY:</span>
                  <span className="font-medium">{selectedRecord.inspection_agency || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">TEST POSITION:</span>
                  <span className="font-medium">{selectedRecord.test_position || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">PROCEDURE NO.:</span>
                  <span className="font-medium">{selectedRecord.procedure_no || "-"}</span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full border-collapse text-xs text-left">
                  <thead>
                    <tr>
                      <th className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase whitespace-nowrap" rowSpan={2}>
                        PARTICULARS
                      </th>
                      <th className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase whitespace-nowrap" rowSpan={2}>
                        MAWP INT. / EXT.<br />PSI (g)
                      </th>
                      <th className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase whitespace-nowrap" rowSpan={2}>
                        REQUIRED TEST PRESSURE<br />PSI (Kg/Cm2) (g)
                      </th>
                      <th className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase whitespace-nowrap" rowSpan={2}>
                        ACTUAL TEST PRESSURE<br />Kg/Cm2 (g)
                      </th>
                      <th colSpan="4" className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase text-center whitespace-nowrap">
                        PRESSURE GAUGE DETAIL
                      </th>
                      <th className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase whitespace-nowrap" rowSpan={2}>
                        HOLDING TIME
                      </th>
                      <th className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase whitespace-nowrap" rowSpan={2}>
                        TEST RESULT
                      </th>
                    </tr>
                    <tr>
                      <th className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase whitespace-nowrap">
                        RANGE<br />(Kg/Cm2) (g)
                      </th>
                      <th className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase whitespace-nowrap">
                        I.D No.
                      </th>
                      <th className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase whitespace-nowrap">
                        DATE OF<br />CALIBRATION
                      </th>
                      <th className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase whitespace-nowrap">
                        DATE OF DUE
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      if (!selectedRecord.items || selectedRecord.items.length === 0) {
                        return (
                          <tr>
                            <td colSpan={10} className="border border-border p-4 text-center">
                              No items added.
                            </td>
                          </tr>
                        );
                      }

                      return selectedRecord.items.map((row) => (
                        <Fragment key={row.id}>
                          <tr className="hover:bg-muted/30">
                            <td className="border border-border p-2 align-top" rowSpan={2}>{row.particulars || "-"}</td>
                            <td className="border border-border p-2 align-top" rowSpan={2}>{row.mawp_int_ext || "-"}</td>
                            <td className="border border-border p-2 align-top" rowSpan={2}>{row.required_test_pressure || "-"}</td>
                            <td className="border border-border p-2 align-top" rowSpan={2}>{row.actual_test_pressure || "-"}</td>
                            <td className="border border-border p-2 align-top">{row.pg1_range || "-"}</td>
                            <td className="border border-border p-2 align-top">{row.pg1_id_no || "-"}</td>
                            <td className="border border-border p-2 align-top">{row.pg1_calib_date || "-"}</td>
                            <td className="border border-border p-2 align-top">{row.pg1_due_date || "-"}</td>
                            <td className="border border-border p-2 align-top" rowSpan={2}>{row.holding_time || "-"}</td>
                            <td className="border border-border p-2 align-top" rowSpan={2}>{row.test_result || "-"}</td>
                          </tr>
                          <tr className="hover:bg-muted/30">
                            <td className="border border-border p-2 align-top">{row.pg2_range || "-"}</td>
                            <td className="border border-border p-2 align-top">{row.pg2_id_no || "-"}</td>
                            <td className="border border-border p-2 align-top">{row.pg2_calib_date || "-"}</td>
                            <td className="border border-border p-2 align-top">{row.pg2_due_date || "-"}</td>
                          </tr>
                        </Fragment>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Remarks */}
              {selectedRecord.remarks && selectedRecord.remarks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-sm">Remarks:</h3>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {selectedRecord.remarks.map((r) => (
                      <li key={r.id}>{r.text}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}


// ─── Create/Edit View ─────────────────────────────────────────────────────────────
function FormView({ onBack, onSuccess, isEdit, editId }) {
  // Jobs list for MSN dropdown
  const [jobs, setJobs] = useState([])
  const [jobsLoading, setJobsLoading] = useState(true)

  // Basic Info (auto-filled from selected job)
  const [selectedJobId, setSelectedJobId] = useState("")
  const [autoFill, setAutoFill] = useState({
    reportNo: "",
    client: "",
    poNo: "",
    projectId: "",
    equipmentName: "",
    tagNo: "",
    code: "",
    msn: "", // Added MSN here
  })

  // Equipment Details
  const [formData, setFormData] = useState({
    shrenoDrgNo: "",
    customerDrgNo: "",
    constructionCode: "",
    chlorineContent: "",
    inspectionAgency: "",
    testPosition: "",
    procedureNo: "",
  })

  // Table rows
  const [tableRows, setTableRows] = useState([emptyRow(1)])

  // Remarks
  const [remarks, setRemarks] = useState([
    { id: 1, text: "NO PRESSURE DROP OR VISIBLE DEFORMATION OBSERVED DURING THE HOLDING TIME. NO LEAKAGE OBSERVED FROM ANY WELDED JOINTS.\nWITNESS FINAL EXTERNAL INSPECTION OF EQUIPMENT AT HYDROSTATIC PRESSURE DIVIDED BY 1.3 & CLOSED VISUAL INSPECTION CARRIED OUT - SATISFACTORY" }
  ])

  // Submit state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Fetch Jobs list
  useEffect(() => {
    apiClient.get("/api/common/jobs?limit=200")
      .then((res) => setJobs(res.data || []))
      .catch(() => setJobs([]))
      .finally(() => setJobsLoading(false))
  }, [])

  // Load existing data if edit mode
  useEffect(() => {
    if (isEdit && editId) {
      setSubmitting(true)
      apiClient.get(`/api/hydro-test/${editId}`)
        .then((res) => {
          if (res.success && res.data) {
            const data = res.data
            setSelectedJobId(data.job_id)
            setAutoFill({
              reportNo: data.report_no || "",
              client: data.client || "",
              poNo: data.po_no || "",
              projectId: data.project_id || "",
              equipmentName: data.equipment_name || "",
              tagNo: data.tag_no || "",
              code: data.code || "",
              msn: data.msn || "",
            })
            setFormData({
              shrenoDrgNo: data.shreno_drg_no || "",
              customerDrgNo: data.customer_drg_no || "",
              constructionCode: data.construction_code || "",
              chlorineContent: data.chlorine_content || "",
              inspectionAgency: data.inspection_agency || "",
              testPosition: data.test_position || "",
              procedureNo: data.procedure_no || "",
            })

            if (data.items && data.items.length > 0) {
              setTableRows(data.items.map((item, idx) => ({
                id: item.id || idx + 1,
                particulars: item.particulars || "",
                mawp_int_ext: item.mawp_int_ext || "",
                required_test_pressure: item.required_test_pressure || "",
                actual_test_pressure: item.actual_test_pressure || "",
                holding_time: item.holding_time || "",
                test_result: item.test_result || "",
                pg1_range: item.pg1_range || "",
                pg1_id_no: item.pg1_id_no || "",
                pg1_calib_date: item.pg1_calib_date || "",
                pg1_due_date: item.pg1_due_date || "",
                pg2_range: item.pg2_range || "",
                pg2_id_no: item.pg2_id_no || "",
                pg2_calib_date: item.pg2_calib_date || "",
                pg2_due_date: item.pg2_due_date || "",
              })))
            } else {
              setTableRows([emptyRow(1)])
            }

            if (data.remarks && data.remarks.length > 0) {
              setRemarks(data.remarks.map((r, idx) => ({ id: r.id || idx + 1, text: r.text || "" })))
            }

          } else {
            setError("Failed to load existing record")
          }
        })
        .catch((err) => {
          setError("Error loading existing record")
          console.error(err)
        })
        .finally(() => {
          setSubmitting(false)
        })
    }
  }, [isEdit, editId])


  // Handle MSN selection → auto-fill from job details API (only on create)
  const handleJobSelect = async (jobId) => {
    setSelectedJobId(jobId)
    if (isEdit) return; // Do not overwrite autoFill during edit just by selecting

    setAutoFill((prev) => ({ ...prev, reportNo: "Loading...", client: "Loading..." }))

    let nextReportNo = ""
    try {
      const res = await apiClient.get(`/api/hydro-test/next-report-no/${jobId}`)
      if (res.success && res.data?.next_report_no) {
        nextReportNo = res.data.next_report_no
      }
    } catch (err) {
      console.error("Failed to fetch next report number:", err)
      nextReportNo = "Auto-generated"
    }

    try {
      const jobRes = await apiClient.get(`/api/common/jobs/${jobId}`)
      if (jobRes.success && jobRes.data) {
        const job = jobRes.data
        setAutoFill({
          reportNo: nextReportNo,
          client: job.customer?.customer_name || "",
          poNo: job.po?.po_number || "",
          projectId: job.project_id || "",
          equipmentName: job.equipement_name || "",
          tagNo: job.tag_number || "",
          code: job.code || "",
          msn: job.job_number || "",
        })
      }
    } catch (err) {
      console.error("Failed to fetch job details:", err)
      setAutoFill({
        reportNo: nextReportNo,
        client: "",
        poNo: "",
        projectId: "",
        equipmentName: "",
        tagNo: "",
        code: "",
        msn: "",
      })
    }
  }

  // Form field change
  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Row helpers
  const handleRowChange = (id, field, value) => {
    setTableRows((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const nextId = () => Math.max(...tableRows.map((r) => r.id), 0) + 1
  const addRow = () => setTableRows((rows) => [...rows, emptyRow(nextId())])
  const removeRow = (id) => {
    if (tableRows.length <= 1) return
    setTableRows((rows) => rows.filter((r) => r.id !== id))
  }

  // Remark helpers
  const nextRemarkId = () => Math.max(...remarks.map((r) => r.id), 0) + 1
  const addRemark = () => setRemarks((rem) => [...rem, { id: nextRemarkId(), text: "" }])
  const updateRemark = (id, text) => setRemarks((rem) => rem.map((r) => r.id === id ? { ...r, text } : r))
  const removeRemark = (id) => {
    if (remarks.length <= 1) return
    setRemarks((rem) => rem.filter((r) => r.id !== id))
  }


  // Submit
  const handleSubmit = async () => {
    setError("")
    if (!selectedJobId) { setError("Please select a Job / MSN."); return }

    const items = tableRows.map((row, idx) => ({
      sort_order: idx,
      particulars: row.particulars,
      mawp_int_ext: row.mawp_int_ext,
      required_test_pressure: row.required_test_pressure,
      actual_test_pressure: row.actual_test_pressure,
      pg1_range: row.pg1_range,
      pg1_id_no: row.pg1_id_no,
      pg1_calib_date: row.pg1_calib_date,
      pg1_due_date: row.pg1_due_date,
      pg2_range: row.pg2_range,
      pg2_id_no: row.pg2_id_no,
      pg2_calib_date: row.pg2_calib_date,
      pg2_due_date: row.pg2_due_date,
      holding_time: row.holding_time,
      test_result: row.test_result,
    }))

    const remarksToSubmit = remarks.map((r, idx) => ({ sort_order: idx, text: r.text }))

    const payload = {
      job_id: selectedJobId,
      shreno_drg_no: formData.shrenoDrgNo,
      customer_drg_no: formData.customerDrgNo,
      construction_code: formData.constructionCode,
      chlorine_content: formData.chlorineContent,
      inspection_agency: formData.inspectionAgency,
      test_position: formData.testPosition,
      procedure_no: formData.procedureNo,
      items,
      remarks: remarksToSubmit,
    }

    try {
      setSubmitting(true)
      if (isEdit && editId) {
        await apiClient.put(`/api/hydro-test/update/${editId}`, payload)
      } else {
        await apiClient.post("/api/hydro-test/create", payload)
      }
      onSuccess(isEdit)
    } catch (err) {
      setError(err.message || `Failed to ${isEdit ? "update" : "create"} Hydrostatic Pressure Test Report.`)
    } finally {
      setSubmitting(false)
    }
  }

  // Get today's date
  const today = new Date().toLocaleDateString('en-GB')

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">{isEdit ? "Edit" : "Create"} Hydrostatic Pressure Test Report</h1>
          <p className="text-muted-foreground">{isEdit ? "Edit the" : "Fill in the"} details for the hydrostatic pressure test report.</p>
        </div>
        <Button variant="outline" onClick={onBack} className="h-9">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Section 1: Basic Information ── */}
      <Card className="mb-6 rounded-xl shadow-sm border border-muted-foreground/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Report Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* MSN / Job Number */}
            <div className="space-y-2">
              <Label className="uppercase text-xs font-semibold text-muted-foreground">MSN Number:</Label>
              <Select value={selectedJobId} onValueChange={handleJobSelect} disabled={jobsLoading || isEdit}>
                <SelectTrigger className="w-full bg-white h-9">
                  <SelectValue placeholder={jobsLoading ? "Loading jobs…" : "Select MSN"} />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.job_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="uppercase text-xs font-semibold text-muted-foreground">TODAY'S DATE:</Label>
              <Input value={today} readOnly className="bg-muted/50 h-9 border-muted" />
            </div>

            {/* Auto-filled fields */}
            {[
              { label: "REPORT NO.:", value: autoFill.reportNo },
              { label: "P.O. NO.:", value: autoFill.poNo },
              { label: "CLIENT NAME:", value: autoFill.client },
              { label: "PROJECT ID:", value: autoFill.projectId },
              { label: "EQUIPMENT NAME:", value: autoFill.equipmentName },
              { label: "TAG NO.:", value: autoFill.tagNo },
              { label: "CODE:", value: autoFill.code },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-2">
                <Label className="uppercase text-xs font-semibold text-muted-foreground">{label}</Label>
                <Input value={value} readOnly className="bg-muted/50 h-9 border-muted" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Test Details ── */}
      <Card className="mb-6 rounded-xl shadow-sm border border-muted-foreground/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Test Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label htmlFor="shrenoDrgNo" className="uppercase text-xs font-semibold text-muted-foreground">SHRENO DRG. NO.:</Label>
              <Input
                id="shrenoDrgNo"
                name="shrenoDrgNo"
                value={formData.shrenoDrgNo}
                onChange={handleFormChange}
                placeholder="Enter SHRENO DRG. No."
                className="h-9 focus-visible:ring-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerDrgNo" className="uppercase text-xs font-semibold text-muted-foreground">CUSTOMER DRG. NO.:</Label>
              <Input
                id="customerDrgNo"
                name="customerDrgNo"
                value={formData.customerDrgNo}
                onChange={handleFormChange}
                placeholder="Enter Customer DRG No."
                className="h-9 focus-visible:ring-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="constructionCode" className="uppercase text-xs font-semibold text-muted-foreground">CONSTRUCTION CODE:</Label>
              <Input
                id="constructionCode"
                name="constructionCode"
                value={formData.constructionCode}
                onChange={handleFormChange}
                placeholder="Enter CONSTRUCTION CODE"
                className="h-9 focus-visible:ring-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chlorineContent" className="uppercase text-xs font-semibold text-muted-foreground">CHLORINE CONTENT:</Label>
              <Input
                id="chlorineContent"
                name="chlorineContent"
                value={formData.chlorineContent}
                onChange={handleFormChange}
                placeholder="Enter CHLORINE CONTENT"
                className="h-9 focus-visible:ring-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspectionAgency" className="uppercase text-xs font-semibold text-muted-foreground">INSPECTION AGENCY:</Label>
              <Input
                id="inspectionAgency"
                name="inspectionAgency"
                value={formData.inspectionAgency}
                onChange={handleFormChange}
                placeholder="Enter INSPECTION AGENCY"
                className="h-9 focus-visible:ring-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="testPosition" className="uppercase text-xs font-semibold text-muted-foreground">TEST POSITION:</Label>
              <Input
                id="testPosition"
                name="testPosition"
                value={formData.testPosition}
                onChange={handleFormChange}
                placeholder="Enter TEST POSITION"
                className="h-9 focus-visible:ring-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="procedureNo" className="uppercase text-xs font-semibold text-muted-foreground">PROCEDURE NO.:</Label>
              <Input
                id="procedureNo"
                name="procedureNo"
                value={formData.procedureNo}
                onChange={handleFormChange}
                placeholder="Enter PROCEDURE NO."
                className="h-9 focus-visible:ring-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: Pressure Test Details (Table) ── */}
      <Card className="mb-6 rounded-xl shadow-sm border border-muted-foreground/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Pressure Test Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr>
                    <th className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase whitespace-nowrap min-w-[150px]" rowSpan={2}>
                      PARTICULARS
                    </th>
                    <th className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase whitespace-nowrap min-w-[100px]" rowSpan={2}>
                      MAWP INT. / EXT.<br />PSI (g)
                    </th>
                    <th className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase whitespace-nowrap min-w-[120px]" rowSpan={2}>
                      REQUIRED TEST PRESSURE<br />PSI (Kg/Cm2) (g)
                    </th>
                    <th className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase whitespace-nowrap min-w-[120px]" rowSpan={2}>
                      ACTUAL TEST PRESSURE<br />Kg/Cm2 (g)
                    </th>
                    <th colSpan="4" className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase text-center whitespace-nowrap">
                      PRESSURE GAUGE DETAIL
                    </th>
                    <th className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase whitespace-nowrap min-w-[100px]" rowSpan={2}>
                      HOLDING TIME
                    </th>
                    <th className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase whitespace-nowrap min-w-[120px]" rowSpan={2}>
                      TEST RESULT
                    </th>
                    <th className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase whitespace-nowrap min-w-[60px]" rowSpan={2}>
                      Action
                    </th>
                  </tr>
                  <tr>
                    <th className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase whitespace-nowrap min-w-[80px]">
                      RANGE<br />(Kg/Cm2) (g)
                    </th>
                    <th className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase whitespace-nowrap min-w-[80px]">
                      I.D No.
                    </th>
                    <th className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase whitespace-nowrap min-w-[100px]">
                      DATE OF<br />CALIBRATION
                    </th>
                    <th className="border border-border p-2 bg-[#f4f4f5] font-bold text-[11px] uppercase whitespace-nowrap min-w-[100px]">
                      DATE OF DUE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <Fragment key={row.id}>
                      <tr className="border-b">
                        <td className="border border-border p-1 align-top" rowSpan={2}>
                          <Textarea
                            value={row.particulars}
                            onChange={(e) => handleRowChange(row.id, "particulars", e.target.value)}
                            placeholder="Particulars"
                            className="w-full text-xs min-h-[80px] border-0 focus-visible:ring-1 resize-y"
                          />
                        </td>
                        <td className="border border-border p-1 align-top" rowSpan={2}>
                          <Input
                            type="text"
                            value={row.mawp_int_ext}
                            onChange={(e) => handleRowChange(row.id, "mawp_int_ext", e.target.value)}
                            placeholder="MAWP"
                            className="w-full text-xs h-full min-h-[80px] border-0 focus-visible:ring-1"
                          />
                        </td>
                        <td className="border border-border p-1 align-top" rowSpan={2}>
                          <Input
                            type="text"
                            value={row.required_test_pressure}
                            onChange={(e) => handleRowChange(row.id, "required_test_pressure", e.target.value)}
                            placeholder="Required"
                            className="w-full text-xs h-full min-h-[80px] border-0 focus-visible:ring-1"
                          />
                        </td>
                        <td className="border border-border p-1 align-top" rowSpan={2}>
                          <Input
                            type="text"
                            value={row.actual_test_pressure}
                            onChange={(e) => handleRowChange(row.id, "actual_test_pressure", e.target.value)}
                            placeholder="Actual"
                            className="w-full text-xs h-full min-h-[80px] border-0 focus-visible:ring-1"
                          />
                        </td>
                        {/* Gauge 1 */}
                        <td className="border border-border p-1 align-top">
                          <Input
                            type="text"
                            value={row.pg1_range}
                            onChange={(e) => handleRowChange(row.id, "pg1_range", e.target.value)}
                            placeholder="Range"
                            className="w-full text-xs border-0 focus-visible:ring-1 h-9"
                          />
                        </td>
                        <td className="border border-border p-1 align-top">
                          <Input
                            type="text"
                            value={row.pg1_id_no}
                            onChange={(e) => handleRowChange(row.id, "pg1_id_no", e.target.value)}
                            placeholder="I.D No."
                            className="w-full text-xs border-0 focus-visible:ring-1 h-9"
                          />
                        </td>
                        <td className="border border-border p-1 align-top">
                          <Input
                            type="date"
                            value={row.pg1_calib_date}
                            onChange={(e) => handleRowChange(row.id, "pg1_calib_date", e.target.value)}
                            placeholder="Calib Date"
                            className="w-full text-xs border-0 focus-visible:ring-1 h-9"
                          />
                        </td>
                        <td className="border border-border p-1 align-top">
                          <Input
                            type="date"
                            value={row.pg1_due_date}
                            onChange={(e) => handleRowChange(row.id, "pg1_due_date", e.target.value)}
                            placeholder="Due Date"
                            className="w-full text-xs border-0 focus-visible:ring-1 h-9"
                          />
                        </td>

                        <td className="border border-border p-1 align-top" rowSpan={2}>
                          <Input
                            type="time"
                            value={row.holding_time}
                            onChange={(e) => handleRowChange(row.id, "holding_time", e.target.value)}
                            placeholder="Holding Time"
                            className="w-full text-xs h-full min-h-[80px] border-0 focus-visible:ring-1"
                          />
                        </td>
                        <td className="border border-border p-1 align-top" rowSpan={2}>
                          <Input
                            type="text"
                            value={row.test_result}
                            onChange={(e) => handleRowChange(row.id, "test_result", e.target.value)}
                            placeholder="Result"
                            className="w-full text-xs h-full min-h-[80px] border-0 focus-visible:ring-1"
                          />
                        </td>
                        <td className="border border-border p-2 align-middle text-center" rowSpan={2}>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeRow(row.id)}
                            disabled={tableRows.length === 1}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                      {/* Gauge 2 */}
                      <tr className="border-b">
                        <td className="border border-border p-1 align-top">
                          <Input
                            type="text"
                            value={row.pg2_range}
                            onChange={(e) => handleRowChange(row.id, "pg2_range", e.target.value)}
                            placeholder="Range"
                            className="w-full text-xs border-0 focus-visible:ring-1 h-9"
                          />
                        </td>
                        <td className="border border-border p-1 align-top">
                          <Input
                            type="text"
                            value={row.pg2_id_no}
                            onChange={(e) => handleRowChange(row.id, "pg2_id_no", e.target.value)}
                            placeholder="I.D No."
                            className="w-full text-xs border-0 focus-visible:ring-1 h-9"
                          />
                        </td>
                        <td className="border border-border p-1 align-top">
                          <Input
                            type="date"
                            value={row.pg2_calib_date}
                            onChange={(e) => handleRowChange(row.id, "pg2_calib_date", e.target.value)}
                            placeholder="Calib Date"
                            className="w-full text-xs border-0 focus-visible:ring-1 h-9"
                          />
                        </td>
                        <td className="border border-border p-1 align-top">
                          <Input
                            type="date"
                            value={row.pg2_due_date}
                            onChange={(e) => handleRowChange(row.id, "pg2_due_date", e.target.value)}
                            placeholder="Due Date"
                            className="w-full text-xs border-0 focus-visible:ring-1 h-9"
                          />
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 mt-4">
              <Button type="button" variant="outline" onClick={addRow} className="w-auto h-9 text-[13px] px-4 rounded-xl border-muted-foreground/30 shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 4: Remarks ── */}
      <Card className="mb-6 rounded-xl shadow-sm border border-muted-foreground/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Remarks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {remarks.map((remark) => (
              <div key={remark.id} className="flex gap-4 items-start">
                <Textarea
                  value={remark.text}
                  onChange={(e) => updateRemark(remark.id, e.target.value)}
                  placeholder="Enter remark"
                  className="min-h-[60px] flex-1 text-sm focus-visible:ring-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeRemark(remark.id)}
                  disabled={remarks.length === 1}
                  className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addRemark} className="w-auto h-9 text-[13px] px-4 rounded-xl border-muted-foreground/30 shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Remark
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Footer Buttons ── */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving…" : "Submit"}
        </Button>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
function HydroPresText() {
  const [view, setView] = useState("list") // "list" | "create" | "edit"
  const [editId, setEditId] = useState(null)
  const [successMsg, setSuccessMsg] = useState("")

  const handleSuccess = (isEdit = false) => {
    setSuccessMsg(`Hydrostatic Pressure Test Report ${isEdit ? "updated" : "created"} successfully!`)
    setView("list")
    setEditId(null)
    setTimeout(() => setSuccessMsg(""), 4000)
  }

  const handleEdit = (id) => {
    setEditId(id)
    setView("edit")
  }

  const handleCreate = () => {
    setEditId(null)
    setView("create")
  }

  const handleBack = () => {
    setView("list")
    setEditId(null)
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-auto p-6 flex flex-col">
          <div className="flex-1 flex flex-col w-full">
            {successMsg && (
              <div className="mb-4 rounded-md border border-green-500 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {successMsg}
              </div>
            )}

            {view === "list" ? (
              <ListView onCreateClick={handleCreate} onEditClick={handleEdit} />
            ) : (
              <FormView onBack={handleBack} onSuccess={handleSuccess} isEdit={view === "edit"} editId={editId} />
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default HydroPresText
