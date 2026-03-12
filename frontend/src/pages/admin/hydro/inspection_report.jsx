import { useState, useEffect, useCallback } from "react"
import apiClient from "@/api/api.client"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Trash2, ArrowLeft, FileText, Eye, Edit, CheckCircle, XCircle, Download } from "lucide-react"
import { DataTable } from "@/components/shared/DataTable"
import { toast } from 'react-toastify'
import { useAuth } from "@/context/AuthContext"

// ─── List View ───────────────────────────────────────────────────────────────
function ListView({ onCreateClick, onEditClick }) {
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isViewLoading, setIsViewLoading] = useState(false)
  const [error, setError] = useState("")

  const { user, roles } = useAuth()
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Review Dialog State
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [docForReview, setDocForReview] = useState(null)
  const [reviewStatus, setReviewStatus] = useState("")
  const [reviewRemarks, setReviewRemarks] = useState("")
  const [isReviewing, setIsReviewing] = useState(false)

  const handleReviewClick = (row, status) => {
    setDocForReview(row)
    setReviewStatus(status)
    setReviewRemarks("")
    setReviewDialogOpen(true)
  }

  const submitReview = async () => {
    if (!docForReview) return
    if (reviewStatus === "Rejected" && !reviewRemarks.trim()) {
      toast.error("Remarks are required for rejection.")
      return
    }

    setIsReviewing(true)
    try {
      const res = await apiClient.put(`/api/inspection-report/update-status/${docForReview.id}`, {
        status: reviewStatus,
        remarks: reviewRemarks
      })
      if (res.success) {
        toast.success(`Report ${reviewStatus} successfully`)
        setReviewDialogOpen(false)
        setRefreshTrigger(prev => prev + 1)
      } else {
        toast.error(res.message || "Failed to submit review")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to submit review")
    } finally {
      setIsReviewing(false)
    }
  }

  const getStatusBadge = (status) => {
    const s = status || "Pending"
    switch (s) {
      case "Approved":
        return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Approved</span>
      case "Rejected":
        return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Rejected</span>
      case "Pending":
        return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">Pending</span>
      default:
        return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">{s}</span>
    }
  }

  const handleViewClick = async (id) => {
    setIsViewLoading(true)
    setError("")
    try {
      const res = await apiClient.get(`/api/inspection-report/${id}`)
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

  const handleDownload = async (id, reportNo) => {
    try {
      const response = await apiClient.get(`/api/inspection-report/${id}/download`, {}, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data || response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DISH_END_${reportNo.replace(/\//g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download report');
    }
  };

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
      header: "Status",
      accessorKey: "status",
      cell: (row) => getStatusBadge(row.status),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => {
        const isAssignedQE = row.quality_engineer_id === user?.id
        const isQE = roles?.includes("QE") || roles?.includes("QUALITY_ENGINEER")
        const canReview = (isQE || isAssignedQE) && row.status !== "Approved" && row.status !== "Rejected"

        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewClick(row.id)}
              title="View">
              <Eye className="h-4 w-4 mr-2" /> View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditClick(row.id)}
              title="Edit">
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
            {canReview && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 border-green-200"
                  onClick={() => handleReviewClick(row, "Approved")}
                  title="Approve">
                  <CheckCircle className="h-4 w-4 mr-2" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-red-200"
                  onClick={() => handleReviewClick(row, "Rejected")}
                  title="Reject">
                  <XCircle className="h-4 w-4 mr-2" /> Reject
                </Button>
              </>
            )}
            {row.status === "Approved" && (
              <Button
                variant="outline"
                size="sm"
                className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
                onClick={() => handleDownload(row.id, row.report_no)}
                title="Download PDF">
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  const fetchData = useCallback(async ({ page, limit, search }) => {
    const params = new URLSearchParams({ page, limit, ...(search ? { search } : {}) })
    const res = await apiClient.get(`/api/inspection-report/list`, Object.fromEntries(params))
    return { data: res.data, meta: res.meta }
  }, [refreshTrigger])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Dish End Inspection Reports</h1>
          <p className="text-muted-foreground">View and manage all dish end inspection reports.</p>
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

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{reviewStatus} Report</DialogTitle>
            <DialogDescription>
              {docForReview && `Are you sure you want to ${reviewStatus.toLowerCase()} report ${docForReview.report_no}?`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="remarks">Remarks {reviewStatus === "Rejected" && <span className="text-destructive">*</span>}</Label>
              <Input
                id="remarks"
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder="Enter remarks..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={submitReview}
              disabled={isReviewing || (reviewStatus === "Rejected" && !reviewRemarks.trim())}
              variant={reviewStatus === "Rejected" ? "destructive" : "default"}
            >
              Confirm {reviewStatus}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Details Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[95vw] w-full max-h-[95vh] overflow-y-auto p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-center">Dish End Inspection Report Details</DialogTitle>
            <DialogDescription className="text-center">
              Complete details of the selected Dish End Inspection Report.
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-6">
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
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">DRG NO:</span>
                  <span className="font-medium">{selectedRecord.drg_no || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">INSP AGENCY:</span>
                  <span className="font-medium">{selectedRecord.insp_agency || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">REPORT NO:</span>
                  <span className="font-medium">{selectedRecord.report_no || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">QUALITY ENGINEER:</span>
                  <span className="font-medium">{selectedRecord.quality_engineer?.name || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">VENDOR DISH END NO:</span>
                  <span className="font-medium">{selectedRecord.vendor_dish_end_number || "-"}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full border-collapse text-xs text-left">
                  <thead>
                    <tr className="bg-[#f4f4f5] border-b border-border">
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">SR NO.</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">DESCRIPTION</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">AS PER DRG.</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">
                        <div className="flex flex-col gap-1">
                          <span>ACTUAL</span>
                          <span className="text-muted-foreground font-normal">{selectedRecord.vendor_dish_end_number || "Vendor Dish End Number"}</span>
                        </div>
                      </th>
                      <th className="p-3 font-bold text-[11px] uppercase tracking-wider">REMARKS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!selectedRecord.items || selectedRecord.items.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="border border-border p-4 text-center">
                          No items added.
                        </td>
                      </tr>
                    ) : (
                      selectedRecord.items.map((row) => (
                        <tr key={row.id} className="hover:bg-muted/30 border-b border-border last:border-0">
                          <td className="border-r border-border p-3 align-top font-medium">{row.sr_no || "-"}</td>
                          <td className="border-r border-border p-3 align-top">{row.description || "-"}</td>
                          <td className="border-r border-border p-3 align-top">{row.as_per_drg || "-"}</td>
                          <td className="border-r border-border p-3 align-top">{row.actual || "-"}</td>
                          <td className="p-3 align-top">{row.remarks || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Instruments Table */}
              {selectedRecord.instruments && selectedRecord.instruments.length > 0 && (
                <div className="overflow-x-auto rounded-md border border-border mt-6">
                  <h3 className="p-3 font-bold text-sm bg-muted/40 border-b border-border">Instrument Calibration Details</h3>
                  <table className="w-full border-collapse text-xs text-left">
                    <thead>
                      <tr className="bg-[#f4f4f5] border-b border-border">
                        <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">NAME</th>
                        <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">ID NO. / SR NO.</th>
                        <th className="p-3 font-bold text-[11px] uppercase tracking-wider">DUE DATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRecord.instruments.map((row) => (
                        <tr key={row.id} className="hover:bg-muted/30 border-b border-border last:border-0">
                          <td className="border-r border-border p-3 align-top font-medium">{row.name || "-"}</td>
                          <td className="border-r border-border p-3 align-top">{row.id_no || "-"}</td>
                          <td className="p-3 align-top">{row.due_date || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Create / Edit View ──────────────────────────────────────────────────────
function CreateView({ onBack, onSuccess, editId = null }) {
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })

  // First section - Dropdowns
  const [msn, setMsn] = useState("")
  const [reportNo, setReportNo] = useState("")
  const [client, setClient] = useState("")
  const [poNo, setPoNo] = useState("")
  const [equipment, setEquipment] = useState("")
  const [code, setCode] = useState("")
  const [vendorDishEndNo, setVendorDishEndNo] = useState("")

  // User input fields
  const [formData, setFormData] = useState({
    tagNo: "",
    drgNo: "",
    inspAgency: "",
  })

  // Description options for the table
  const descriptionOptions = [
    "OD",
    "OVALITY (Maximum)",
    "OUTSIDE CIRCUMFERANCE",
    "CROWN RADIUS (C.R)",
    "KNUCKLE RADIUS (K.R)",
    "STRAIGHT FACE",
    "DISH HEIGHT including SF",
    "NOMINAL THICKNESS",
    "MIN. THICKNESS",
    "CENTER HOLE",
    "Maximum OVER CROWNING",
    "Maximum UNDER CROWNING",
    "EDGE PREPARATION (Single \"V\" / DOUBLE \"V\")",
    "HEAT TREATMENT (YES/NO)",
    "MARKING",
    "VISUAL INSPECTION",
    "FORMING PROCESS",
    "NDT (LPT/MT)",
    "NDT (RT) (YES/NO)",
    "TEMPELATE VERIFICATION - INTERNAL",
    "TEMPELATE VERIFICATION - External (YES/NO)",
  ]

  // Main table rows
  const [tableRows, setTableRows] = useState(
    descriptionOptions.map((desc, index) => ({
      id: index + 1,
      srNo: index + 1,
      description: desc,
      asPerDrg: "",
      actual: "",
      remarks: "",
    }))
  )

  // Instrument Calibration Details table
  const [instrumentRows, setInstrumentRows] = useState([
    { id: 1, name: "", idNo: "", dueDate: "" },
  ])

  // Quality Engineer
  const [qualityEngineer, setQualityEngineer] = useState("")

  // API state
  const [msnOptions, setMsnOptions] = useState([])
  const [qualityEngineers, setQualityEngineers] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    apiClient.get("/api/common/jobs?limit=200")
      .then((res) => { if (res.success) setMsnOptions(res.data) })
      .catch((err) => console.error("Failed to fetch jobs:", err))

    apiClient.get("/api/common/qc-engineers")
      .then((res) => { if (res.success) setQualityEngineers(res.data) })
      .catch((err) => console.error("Failed to fetch QC engineers:", err))
  }, [])

  useEffect(() => {
    // If we have an editId, fetch the existing report details
    if (editId && msnOptions.length > 0) {
      apiClient.get(`/api/inspection-report/${editId}`)
        .then((res) => {
          if (res.success && res.data) {
            const data = res.data
            // Match MSN option by job_id
            setMsn(data.job_id || "")
            setReportNo(data.report_no || "")
            setEquipment(data.equipment_name || "")
            setCode(data.code || "")
            setClient(data.client || "")
            setPoNo(data.po_no || "")
            setVendorDishEndNo(data.vendor_dish_end_number || "")

            setFormData({
              tagNo: data.tag_no || "",
              drgNo: data.drg_no || "",
              inspAgency: data.insp_agency || "",
            })

            setQualityEngineer(data.quality_engineer_id || "")

            if (data.items && data.items.length > 0) {
              setTableRows(data.items.map((item, i) => ({
                id: i + 1,
                srNo: item.sr_no || (i + 1),
                description: item.description || "",
                asPerDrg: item.as_per_drg || "",
                actual: item.actual || "",
                remarks: item.remarks || ""
              })))
            }

            if (data.instruments && data.instruments.length > 0) {
              setInstrumentRows(data.instruments.map((inst, i) => ({
                id: i + 1,
                name: inst.name || "",
                idNo: inst.id_no || "",
                dueDate: inst.due_date || ""
              })))
            }
          }
        })
        .catch((err) => console.error("Failed to fetch report details:", err))
    }
  }, [editId, msnOptions])

  const handleMsnChange = async (value) => {
    setMsn(value)

    // Only auto-fetch if we are not editing, or if editing and we change the MSN
    if (!editId) {
      setReportNo("Loading...")
    }

    const selectedMsn = msnOptions.find((option) => option.id === value)

    setEquipment(selectedMsn?.equipement_name || "")
    setCode(selectedMsn?.code || "")
    setClient(selectedMsn?.customer?.customer_name || "")
    setPoNo(selectedMsn?.po?.po_number || "")

    if (!editId) {
      try {
        const res = await apiClient.get(`/api/inspection-report/next-report-no/${value}`)
        if (res.success && res.data?.next_report_no) {
          setReportNo(res.data.next_report_no)
        } else {
          setReportNo("Auto-generated on Submit")
        }
      } catch (err) {
        console.error("Failed to fetch next report number:", err)
        setReportNo("Auto-generated on Submit")
      }
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleRowChange = (id, field, value) => {
    setTableRows(
      tableRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    )
  }

  const handleInstrumentRowChange = (id, field, value) => {
    setInstrumentRows(
      instrumentRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    )
  }

  const addInstrumentRow = () => {
    const newId = Math.max(...instrumentRows.map((row) => row.id), 0) + 1
    setInstrumentRows([...instrumentRows, { id: newId, name: "", idNo: "", dueDate: "" }])
  }

  const removeInstrumentRow = (id) => {
    if (instrumentRows.length > 1) {
      setInstrumentRows(instrumentRows.filter((row) => row.id !== id))
    }
  }

  const handleSubmit = async () => {
    if (!msn) {
      toast.error("Please select an MSN")
      return
    }

    const payload = {
      job_id: msn,
      msn: msnOptions.find(opt => opt.id === msn)?.job_number || "",
      client,
      po_no: poNo,
      equipment_name: equipment,
      tag_no: formData.tagNo,
      code,
      drg_no: formData.drgNo,
      insp_agency: formData.inspAgency,
      quality_engineer_id: qualityEngineer,
      vendor_dish_end_number: vendorDishEndNo,
      items: tableRows.map(r => ({
        sr_no: parseInt(r.srNo, 10),
        description: r.description,
        as_per_drg: r.asPerDrg,
        actual: r.actual,
        remarks: r.remarks
      })),
      instruments: instrumentRows.filter(r => r.name || r.idNo || r.dueDate).map(r => ({
        name: r.name,
        id_no: r.idNo,
        due_date: r.dueDate
      }))
    }

    try {
      setSubmitting(true)
      let res;
      if (editId) {
        res = await apiClient.put(`/api/inspection-report/update/${editId}`, payload)
      } else {
        res = await apiClient.post("/api/inspection-report/create", payload)
      }

      if (res.success) {
        toast.success(editId ? "Dish End Inspection Report updated successfully!" : "Dish End Inspection Report created successfully!")
        onSuccess()
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message || "Failed to save report")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">{editId ? "Edit" : "Create"} Dish End Inspection Report</h1>
          <p className="text-muted-foreground">{editId ? "Update the details for this dish end inspection." : "Fill in the details for a new dish end inspection."}</p>
        </div>
        <Button variant="outline" onClick={onBack} className="h-9">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="msn">MSN:</Label>
              <Select value={msn} onValueChange={handleMsnChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select MSN" />
                </SelectTrigger>
                <SelectContent>
                  {msnOptions.map((msnOption) => (
                    <SelectItem key={msnOption.id} value={msnOption.id}>
                      {msnOption.job_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportNo">REPORT NO.:</Label>
              <Input
                id="reportNo"
                type="text"
                value={reportNo}
                readOnly
                className="bg-muted text-xs font-semibold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment">EQUIPMENT:</Label>
              <Input
                id="equipment"
                type="text"
                value={equipment}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">CODE:</Label>
              <Input
                id="code"
                type="text"
                value={code}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">CLIENT:</Label>
              <Input
                id="client"
                type="text"
                value={client}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="poNo">P.O. NO.:</Label>
              <Input
                id="poNo"
                type="text"
                value={poNo}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date:</Label>
              <Input
                id="date"
                type="text"
                value={today}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Equipment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tagNo">TAG NO.:</Label>
              <Input
                id="tagNo"
                name="tagNo"
                type="text"
                value={formData.tagNo}
                onChange={handleInputChange}
                placeholder="Enter TAG NO."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="drgNo">DRG. NO.:</Label>
              <Input
                id="drgNo"
                name="drgNo"
                type="text"
                value={formData.drgNo}
                onChange={handleInputChange}
                placeholder="Enter DRG. NO."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspAgency">INSP. AGENCY:</Label>
              <Input
                id="inspAgency"
                name="inspAgency"
                type="text"
                value={formData.inspAgency}
                onChange={handleInputChange}
                placeholder="Enter INSP. AGENCY"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Inspection Details</CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex flex-col gap-4 w-full">
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow className="bg-blue-100">
                  <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300 w-16 text-center">
                    SR NO.
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300">
                    DESCRIPTION
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300">
                    AS PER DRG.
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300">
                    <div className="flex flex-col gap-2">
                      <span>ACTUAL</span>
                      <Input
                        type="text"
                        value={vendorDishEndNo}
                        onChange={(e) => setVendorDishEndNo(e.target.value)}
                        placeholder="Vendor Dish End Number"
                        className="text-xs border-0 focus-visible:ring-0 bg-white"
                      />
                    </div>
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300">
                    REMARKS
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="p-2 border border-gray-300 text-center">
                      <div className="text-sm font-medium">{row.srNo}</div>
                    </TableCell>
                    <TableCell className="p-2 border border-gray-300">
                      <div className="text-sm">{row.description}</div>
                    </TableCell>
                    <TableCell className="p-2 border border-gray-300">
                      <Input
                        type="text"
                        value={row.asPerDrg}
                        onChange={(e) => handleRowChange(row.id, "asPerDrg", e.target.value)}
                        placeholder="As Per DRG"
                        className="w-full text-xs border-0 focus-visible:ring-0"
                      />
                    </TableCell>
                    <TableCell className="p-2 border border-gray-300">
                      <Input
                        type="text"
                        value={row.actual}
                        onChange={(e) => handleRowChange(row.id, "actual", e.target.value)}
                        placeholder="Actual"
                        className="w-full text-xs border-0 focus-visible:ring-0"
                      />
                    </TableCell>
                    <TableCell className="p-2 border border-gray-300">
                      <Input
                        type="text"
                        value={row.remarks}
                        onChange={(e) => handleRowChange(row.id, "remarks", e.target.value)}
                        placeholder="Remarks"
                        className="w-full text-xs border-0 focus-visible:ring-0"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Instrument Calibration Details</CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex flex-col gap-4 w-full">
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="p-2 text-xs font-bold uppercase">NAME</TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">ID NO. / SR NO.</TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">DUE DATE</TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instrumentRows.length > 0 ? (
                  instrumentRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.name}
                          onChange={(e) => handleInstrumentRowChange(row.id, "name", e.target.value)}
                          placeholder="Name"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.idNo}
                          onChange={(e) => handleInstrumentRowChange(row.id, "idNo", e.target.value)}
                          placeholder="ID No. / SR No."
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={row.dueDate}
                          onChange={(e) => handleInstrumentRowChange(row.id, "dueDate", e.target.value)}
                          placeholder="Due Date"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeInstrumentRow(row.id)}
                          disabled={instrumentRows.length === 1}
                          title="Remove Row"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No instrument calibration details added.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <Button type="button" variant="outline" onClick={addInstrumentRow} className="w-full sm:w-auto mt-2">
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quality Engineer Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qualityEngineer">Quality Engineer:</Label>
              <Select value={qualityEngineer} onValueChange={setQualityEngineer}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Quality Engineer" />
                </SelectTrigger>
                <SelectContent>
                  {qualityEngineers.map((engineer) => (
                    <SelectItem key={engineer.id} value={engineer.id}>
                      <div className="flex flex-col">
                        <span>{engineer.name}</span>
                        <span className="text-xs text-muted-foreground">{engineer.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 mt-6">
        <Button onClick={onBack} variant="outline" disabled={submitting}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving..." : "Submit Report"}
        </Button>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
function InspectionReport() {
  const [view, setView] = useState("list") // "list" | "create" | "edit"
  const [editId, setEditId] = useState(null)

  const handleSuccess = () => {
    setView("list")
    setEditId(null)
  }

  const handleEdit = (id) => {
    setEditId(id)
    setView("edit")
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
            {view === "list" ? (
              <ListView
                onCreateClick={() => {
                  setEditId(null)
                  setView("create")
                }}
                onEditClick={handleEdit}
              />
            ) : (
              <CreateView
                onBack={() => {
                  setView("list")
                  setEditId(null)
                }}
                onSuccess={handleSuccess}
                editId={editId}
              />
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default InspectionReport
