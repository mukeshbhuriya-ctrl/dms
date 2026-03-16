import { useState, useEffect, useCallback } from "react"
import { AdminSidebar } from "@/components"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Plus, Trash2, Type, ArrowLeft, FileText, Eye } from "lucide-react"
import { DataTable } from "@/components/shared/DataTable"

import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"

function emptyRow(id) {
  return {
    id,
    itemNo: "",
    description: "",
    size: "",
    materialSpecification: "",
    quantityUnit: "",
    heatNo: "",
    mtrNo: "",
    manufacturerName: "",
    remarks: "",
    isHeading: false,
    headingText: "",
    parentHeadingId: null,
  }
}

// ─── List View ───────────────────────────────────────────────────────────────
function ListView({ onCreateClick }) {
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isViewLoading, setIsViewLoading] = useState(false)
  const [error, setError] = useState("")

  const handleViewClick = async (id) => {
    setIsViewLoading(true)
    setError("")
    try {
      const res = await apiClient.get(`/api/mhc/${id}`)
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleViewClick(row.id)}
          title="View">
          <Eye className="h-4 w-4" /> View
        </Button>
      ),
    },
  ]

  const fetchData = useCallback(async ({ page, limit, search }) => {
    const params = new URLSearchParams({ page, limit, ...(search ? { search } : {}) })
    const res = await apiClient.get(`/api/mhc/list`, Object.fromEntries(params))
    return { data: res.data, meta: res.meta }
  }, [])

  const [refreshKey, setRefreshKey] = useState(0);

  const handleExport = async () => {
    try {
      await exportApi.exportMHC();
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("MHC Export failed:", error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Material Heat Charts</h1>
          <p className="text-muted-foreground">View and manage all material heat charts.</p>
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

      <DataTable 
        columns={columns} 
        fetchData={fetchData} 
        onExport={handleExport}
      />

      {/* View Details Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[95vw] w-full max-h-[95vh] overflow-y-auto p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-center">Material Heat Chart Details</DialogTitle>
            <DialogDescription className="text-center">
              Complete details of the selected Material Heat Chart.
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-6">
              {/* Basic Info */}
              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-y-6 gap-x-4 text-sm border border-border p-6 bg-white rounded-xl shadow-sm">
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">MSN / JOB NO:</span>
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
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">INSPECTION BY:</span>
                  <span className="font-medium">{selectedRecord.inspection_by || "-"}</span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full border-collapse text-xs text-left">
                  <thead>
                    <tr className="bg-[#f4f4f5] border-b border-border">
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">HEADING</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">ITEM NO./PART NO.</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">DESCRIPTION</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">SIZE</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider whitespace-normal">MATERIAL SPECIFICATION</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">QUANTITY / UNIT</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider whitespace-normal">HEAT NO. / CAST NO. / PLATE NO.</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">MTR NO.</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">MANUFACTURER NAME</th>
                      <th className="p-3 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">REMARKS NCR/DCR</th>
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

                      let currentHeading = "";
                      const rows = [];

                      selectedRecord.items.forEach((row) => {
                        if (row.is_heading) {
                          currentHeading = row.heading_text || row.item_no || "HEADING";
                        }

                        rows.push(
                          <tr key={row.id} className={row.is_heading ? "bg-[#f4f4f5] border-b border-border font-bold shadow-[inset_0_1px_0_0_#e4e4e7]" : "hover:bg-muted/30 border-b border-border last:border-0"}>
                            <td className={`border-r border-border p-3 align-top font-medium ${!row.is_heading ? 'text-muted-foreground' : ''}`}>{currentHeading || "-"}</td>
                            <td className="border-r border-border p-3 align-top font-medium">{row.item_no || "-"}</td>
                            <td className="border-r border-border p-3 align-top">{row.description || "-"}</td>
                            <td className="border-r border-border p-3 align-top">{row.size || "-"}</td>
                            <td className="border-r border-border p-3 align-top">{row.material_spec || "-"}</td>
                            <td className="border-r border-border p-3 align-top">{row.quantity_unit || "-"}</td>
                            <td className="border-r border-border p-3 align-top">{row.heat_no || "-"}</td>
                            <td className="border-r border-border p-3 align-top">{row.mtr_no || "-"}</td>
                            <td className="border-r border-border p-3 align-top">{row.manufacturer || "-"}</td>
                            <td className="p-3 align-top">{row.remarks || "-"}</td>
                          </tr>
                        );
                      });

                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Create View ─────────────────────────────────────────────────────────────
function CreateView({ onBack, onSuccess }) {
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
  })

  // Equipment Details
  const [formData, setFormData] = useState({
    shrenoDrgNo: "",
    customerDrgNo: "",
    inspectionBy: "",
  })

  // Table rows
  const [tableRows, setTableRows] = useState([emptyRow(1)])

  // Submit state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    apiClient.get("/api/common/jobs?limit=200")
      .then((res) => setJobs(res.data || []))
      .catch(() => setJobs([]))
      .finally(() => setJobsLoading(false))
  }, [])

  // Handle MSN selection → auto-fill from job details API
  const handleJobSelect = async (jobId) => {
    setSelectedJobId(jobId)
    setAutoFill((prev) => ({ ...prev, reportNo: "Loading...", client: "Loading..." }))

    let nextReportNo = ""
    try {
      const res = await apiClient.get(`/api/mhc/next-report-no/${jobId}`)
      if (res.success && res.data?.next_report_no) {
        nextReportNo = res.data.next_report_no
      }
    } catch (err) {
      console.error("Failed to fetch next report number:", err)
      nextReportNo = "Auto-generated on Submit"
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
      })
    }
  }

  // Form field change
  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Row helpers
  const handleRowChange = (id, field, value) =>
    setTableRows((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)))

  const nextId = () => Math.max(...tableRows.map((r) => r.id), 0) + 1

  const addRow = () => setTableRows((rows) => [...rows, emptyRow(nextId())])

  const addRowAfterHeading = (headingId) => {
    const newRow = { ...emptyRow(nextId()), parentHeadingId: headingId }
    const idx = tableRows.findIndex((r) => r.id === headingId)
    let insertAt = idx + 1
    for (let i = idx + 1; i < tableRows.length; i++) {
      if (tableRows[i].isHeading) break
      insertAt = i + 1
    }
    const updated = [...tableRows]
    updated.splice(insertAt, 0, newRow)
    setTableRows(updated)
  }

  const toggleHeading = (id) =>
    setTableRows((rows) =>
      rows.map((r) =>
        r.id === id ? { ...r, isHeading: !r.isHeading, headingText: r.isHeading ? "" : (r.headingText || r.itemNo) } : r
      )
    )

  const removeRow = (id) => {
    if (tableRows.length <= 1) return
    setTableRows((rows) => rows.filter((r) => r.id !== id))
  }

  // Submit
  const handleSubmit = async () => {
    setError("")
    if (!selectedJobId) { setError("Please select a Job / MSN."); return }

    const items = tableRows.map((row, idx) => ({
      sort_order: idx,
      is_heading: row.isHeading,
      heading_text: row.isHeading ? (row.headingText || row.itemNo || "HEADING") : null,
      parent_heading_id: row.parentHeadingId || null,
      item_no: row.itemNo || null,
      description: row.description || null,
      size: row.size || null,
      material_spec: row.materialSpecification || null,
      quantity_unit: row.quantityUnit || null,
      heat_no: row.heatNo || null,
      mtr_no: row.mtrNo || null,
      manufacturer: row.manufacturerName || null,
      remarks: row.remarks || null,
    }))

    const payload = {
      job_id: selectedJobId,
      shreno_drg_no: formData.shrenoDrgNo || null,
      customer_drg_no: formData.customerDrgNo || null,
      inspection_by: formData.inspectionBy || null,
      items,
    }

    try {
      setSubmitting(true)
      await apiClient.post("/api/mhc/create", payload)
      onSuccess()
    } catch (err) {
      setError(err.message || "Failed to create Material Heat Chart.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Create Material Heat Chart</h1>
          <p className="text-muted-foreground">Fill in the details and add material rows.</p>
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
          <CardTitle className="text-base font-semibold">Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* MSN / Job Number */}
            <div className="space-y-2">
              <Label className="uppercase text-xs font-semibold text-muted-foreground">MSN / JOB NO.:</Label>
              <Select value={selectedJobId} onValueChange={handleJobSelect} disabled={jobsLoading}>
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

            {/* Auto-filled fields */}
            {[
              { label: "REPORT NO.:", value: autoFill.reportNo },
              { label: "CLIENT:", value: autoFill.client },
              { label: "PO. NO.:", value: autoFill.poNo },
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

      {/* ── Section 2: Equipment Details ── */}
      <Card className="mb-6 rounded-xl shadow-sm border border-muted-foreground/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Equipment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="shrenoDrgNo" className="uppercase text-xs font-semibold text-muted-foreground">SHRENO DRG. NO.:</Label>
              <Input
                id="shrenoDrgNo"
                name="shrenoDrgNo"
                value={formData.shrenoDrgNo}
                onChange={handleFormChange}
                placeholder="Enter SHRENO DRG. No."
                className="h-9"
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
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspectionBy" className="uppercase text-xs font-semibold text-muted-foreground">INSPECTION BY:</Label>
              <Input
                id="inspectionBy"
                name="inspectionBy"
                value={formData.inspectionBy}
                onChange={handleFormChange}
                placeholder="Enter Inspection By"
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: Material Heat Chart Details ── */}
      <Card className="mb-6 rounded-xl shadow-sm border border-muted-foreground/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Material Heat Chart Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground">
                    {[
                      "ITEM NO./PART NO.",
                      "DESCRIPTION",
                      "SIZE",
                      "MATERIAL SPECIFICATION",
                      "QUANTITY / UNIT",
                      "HEAT NO. / CAST NO. / PLATE NO.",
                      "MTR NO.",
                      "MANUFACTURER NAME",
                      "REMARKS NCR/DCR",
                      "Action",
                    ].map((h, i) => (
                      <th
                        key={h}
                        className={`text-left p-3 font-semibold text-[11px] uppercase tracking-wider whitespace-normal min-w-[120px] ${i === 0 ? "sticky left-0 bg-[#f4f4f5] z-20 shadow-[1px_0_0_0_#e4e4e7]" : ""
                          }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="h-4"></tr> {/* Spacing between header and inputs */}
                  {tableRows.map((row) =>
                    row.isHeading ? (
                      // ── Heading Row ──
                      <tr key={row.id} className="bg-[#f4f4f5] border-b border-t border-muted-foreground/20">
                        <td colSpan={9} className="p-2 align-top sticky left-0 z-10 bg-[#f4f4f5] shadow-[1px_0_0_0_#e4e4e7]">
                          <Input
                            type="text"
                            value={row.headingText}
                            onChange={(e) => handleRowChange(row.id, "headingText", e.target.value)}
                            placeholder="Enter heading text…"
                            className="font-bold h-10 border-muted-foreground/30 shadow-none focus-visible:ring-1 bg-white/50"
                          />
                        </td>
                        <td className="p-2 align-top bg-[#f4f4f5]">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 border-muted-foreground/30 shadow-none hover:text-foreground text-primary bg-primary/10 border-primary/20"
                              title="Remove heading format"
                              onClick={() => toggleHeading(row.id)}
                            >
                              <Type className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 border-muted-foreground/30 shadow-none text-muted-foreground hover:text-foreground"
                              title="Add row under this heading"
                              onClick={() => addRowAfterHeading(row.id)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 border-muted-foreground/30 shadow-none text-muted-foreground hover:text-destructive"
                              onClick={() => removeRow(row.id)}
                              disabled={tableRows.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      // ── Data Row ──
                      <tr key={row.id}>
                        {[
                          { field: "itemNo", placeholder: "Item No" },
                          { field: "description", placeholder: "Description" },
                          { field: "size", placeholder: "Size" },
                          { field: "materialSpecification", placeholder: "Material Spec" },
                          { field: "quantityUnit", placeholder: "Quantity" },
                          { field: "heatNo", placeholder: "Heat No" },
                          { field: "mtrNo", placeholder: "MTR No" },
                          { field: "manufacturerName", placeholder: "Manufacturer" },
                          { field: "remarks", placeholder: "Remarks" },
                        ].map(({ field, placeholder }, i) => (
                          <td
                            key={field}
                            className={`p-2 align-top ${i === 0 ? "sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#e4e4e7]" : ""
                              }`}
                          >
                            <Input
                              type="text"
                              value={row[field]}
                              onChange={(e) => handleRowChange(row.id, field, e.target.value)}
                              placeholder={placeholder}
                              className="text-[13px] min-w-[120px] h-10 border-muted-foreground/30 shadow-none focus-visible:ring-1"
                            />
                          </td>
                        ))}
                        <td className="p-2 align-top bg-white">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 border-muted-foreground/30 shadow-none text-muted-foreground hover:text-foreground"
                              title="Convert to heading"
                              onClick={() => toggleHeading(row.id)}
                            >
                              <Type className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 border-muted-foreground/30 shadow-none text-muted-foreground hover:text-foreground"
                              title="Add sub-row"
                              onClick={() => addRowAfterHeading(row.id)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 border-muted-foreground/30 shadow-none text-muted-foreground hover:text-destructive"
                              onClick={() => removeRow(row.id)}
                              disabled={tableRows.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-muted/50 mt-4">
              <Button type="button" variant="outline" onClick={addRow} className="w-auto h-9 text-[13px] px-4 rounded-xl border-muted-foreground/30 shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>
            </div>
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
function MaterialHeatChart() {
  const [view, setView] = useState("list") // "list" | "create"
  const [successMsg, setSuccessMsg] = useState("")

  const handleSuccess = () => {
    setSuccessMsg("Material Heat Chart created successfully!")
    setView("list")
    setTimeout(() => setSuccessMsg(""), 4000)
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
              <ListView onCreateClick={() => setView("create")} />
            ) : (
              <CreateView onBack={() => setView("list")} onSuccess={handleSuccess} />
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default MaterialHeatChart
