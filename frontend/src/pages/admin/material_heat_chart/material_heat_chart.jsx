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
import { Plus, Trash2, Type, ArrowLeft, FileText } from "lucide-react"
import { DataTable } from "@/components/shared/DataTable"

// ─── helpers ────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000"

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message || "Request failed")
  return json
}

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
  const columns = [
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
  ]

  const fetchData = useCallback(async ({ page, limit, search }) => {
    const params = new URLSearchParams({ page, limit, ...(search ? { search } : {}) })
    const res = await apiFetch(`/api/mhc/list?${params}`)
    return { data: res.data, meta: res.meta }
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Material Heat Charts</h1>
          <p className="text-muted-foreground">View and manage all material heat charts.</p>
        </div>
        <Button onClick={onCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Create Material Heat Chart
        </Button>
      </div>
      <DataTable columns={columns} fetchData={fetchData} />
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

  // Fetch jobs on mount
  useEffect(() => {
    apiFetch("/api/dcc/get-jobs?limit=200")
      .then((res) => setJobs(res.data || []))
      .catch(() => setJobs([]))
      .finally(() => setJobsLoading(false))
  }, [])

  // Handle MSN selection → auto-fill
  const handleJobSelect = (jobId) => {
    setSelectedJobId(jobId)
    const job = jobs.find((j) => j.id === jobId)
    if (!job) return
    setAutoFill({
      client: job.customer?.customer_name || "",
      poNo: job.po?.po_number || "",
      projectId: job.project_id || "",
      equipmentName: job.equipement_name || "",
      tagNo: job.tag_number || "",
      code: job.code || "",
    })
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
        r.id === id
          ? { ...r, isHeading: !r.isHeading, headingText: r.isHeading ? "" : r.headingText }
          : r
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
      heading_text: row.isHeading ? row.headingText : null,
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
      await apiFetch("/api/mhc/create", { method: "POST", body: JSON.stringify(payload) })
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
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold mb-1">Create Material Heat Chart</h1>
          <p className="text-muted-foreground">Fill in the details and add material rows.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Section 1: Basic Information ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* MSN / Job Number */}
            <div className="space-y-2">
              <Label>MSN / JOB NO.:</Label>
              <Select value={selectedJobId} onValueChange={handleJobSelect} disabled={jobsLoading}>
                <SelectTrigger className="w-full">
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
              { label: "CLIENT:", value: autoFill.client },
              { label: "PO. NO.:", value: autoFill.poNo },
              { label: "PROJECT ID:", value: autoFill.projectId },
              { label: "EQUIPMENT NAME:", value: autoFill.equipmentName },
              { label: "TAG NO.:", value: autoFill.tagNo },
              { label: "CODE:", value: autoFill.code },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-2">
                <Label>{label}</Label>
                <Input value={value} readOnly className="bg-muted" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Equipment Details ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Equipment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shrenoDrgNo">SHRENO DRG. NO.:</Label>
              <Input
                id="shrenoDrgNo"
                name="shrenoDrgNo"
                value={formData.shrenoDrgNo}
                onChange={handleFormChange}
                placeholder="Enter SHRENO DRG. No."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerDrgNo">CUSTOMER DRG. NO.:</Label>
              <Input
                id="customerDrgNo"
                name="customerDrgNo"
                value={formData.customerDrgNo}
                onChange={handleFormChange}
                placeholder="Enter Customer DRG No."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspectionBy">INSPECTION BY:</Label>
              <Input
                id="inspectionBy"
                name="inspectionBy"
                value={formData.inspectionBy}
                onChange={handleFormChange}
                placeholder="Enter Inspection By"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: Material Heat Chart Details ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Material Heat Chart Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
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
                    ].map((h) => (
                      <th key={h} className="text-left p-2 font-medium text-xs whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) =>
                    row.isHeading ? (
                      // ── Heading Row ──
                      <tr key={row.id} className="border-b bg-muted/30">
                        <td colSpan={9} className="p-2">
                          <Input
                            type="text"
                            value={row.headingText}
                            onChange={(e) => handleRowChange(row.id, "headingText", e.target.value)}
                            placeholder="Enter heading text…"
                            className="font-semibold"
                          />
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              title="Add row under this heading"
                              onClick={() => addRowAfterHeading(row.id)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
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
                      <tr key={row.id} className="border-b">
                        {[
                          { field: "itemNo", placeholder: "Item No." },
                          { field: "description", placeholder: "Description" },
                          { field: "size", placeholder: "Size" },
                          { field: "materialSpecification", placeholder: "Material Spec" },
                          { field: "quantityUnit", placeholder: "Qty / Unit" },
                          { field: "heatNo", placeholder: "Heat No." },
                          { field: "mtrNo", placeholder: "MTR No." },
                          { field: "manufacturerName", placeholder: "Manufacturer" },
                          { field: "remarks", placeholder: "Remarks" },
                        ].map(({ field, placeholder }) => (
                          <td key={field} className="p-2">
                            <Input
                              type="text"
                              value={row[field]}
                              onChange={(e) => handleRowChange(row.id, field, e.target.value)}
                              placeholder={placeholder}
                              className="text-xs min-w-[80px]"
                            />
                          </td>
                        ))}
                        <td className="p-2">
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              title="Convert to heading"
                              onClick={() => toggleHeading(row.id)}
                            >
                              <Type className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
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

            <Button type="button" variant="outline" onClick={addRow} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Row
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
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
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
