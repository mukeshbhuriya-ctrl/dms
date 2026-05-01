import { useState, useEffect, useCallback, useMemo, Fragment } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"

import { SidebarTrigger } from "@/components/ui/sidebar"
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
import { Plus, Trash2, ArrowLeft, Eye, Edit, CheckCircle, XCircle, Download } from "lucide-react"
import ProDataTable from "@/components/shared/ProDataTable"
import { toast } from 'react-toastify'
import { useAuth } from "@/context/AuthContext"

const toUrlKey = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

// ─── List View ───────────────────────────────────────────────────────────────
function ListView({ onCreateClick, onEditClick, onViewClick }) {
  const { user, roles } = useAuth()
  const isAdmin = roles?.includes("ADMIN");
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Cascading Filters State
  const [activeFilters, setActiveFilters] = useState({ records: [] });
  const [columnFilters, setColumnFilters] = useState({});

  const fetchActiveFilters = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/inspection-report/final/get-filters");
      if (res.success) setActiveFilters(res.data);
    } catch (err) {
      console.error("Error fetching active filters:", err);
    }
  }, []);

  useEffect(() => {
    fetchActiveFilters();
  }, [fetchActiveFilters, refreshTrigger]);

  const activeClientOptions = useMemo(() => {
    let filtered = activeFilters.records || [];
    if (columnFilters.po_no) {
      const selected = Array.isArray(columnFilters.po_no) ? columnFilters.po_no : [columnFilters.po_no.toString()];
      filtered = filtered.filter(c => selected.includes(c.po_no?.toString()));
    }
    if (columnFilters.msn) {
      const selected = Array.isArray(columnFilters.msn) ? columnFilters.msn : [columnFilters.msn.toString()];
      filtered = filtered.filter(c => selected.includes(c.msn?.toString()));
    }
    const clients = [...new Set(filtered.map(c => c.client))].filter(Boolean).sort();
    return clients.map(c => ({ label: c, value: c }));
  }, [activeFilters.records, columnFilters.po_no, columnFilters.msn]);

  const activePoOptions = useMemo(() => {
    let filtered = activeFilters.records || [];
    if (columnFilters.client) {
      const selected = Array.isArray(columnFilters.client) ? columnFilters.client : [columnFilters.client.toString()];
      filtered = filtered.filter(c => selected.includes(c.client?.toString()));
    }
    if (columnFilters.msn) {
      const selected = Array.isArray(columnFilters.msn) ? columnFilters.msn : [columnFilters.msn.toString()];
      filtered = filtered.filter(c => selected.includes(c.msn?.toString()));
    }
    const pos = [...new Set(filtered.map(c => c.po_no))].filter(Boolean).sort();
    return pos.map(p => ({ label: p, value: p }));
  }, [activeFilters.records, columnFilters.client, columnFilters.msn]);

  const activeMsnOptions = useMemo(() => {
    let filtered = activeFilters.records || [];
    if (columnFilters.client) {
      const selected = Array.isArray(columnFilters.client) ? columnFilters.client : [columnFilters.client.toString()];
      filtered = filtered.filter(c => selected.includes(c.client?.toString()));
    }
    if (columnFilters.po_no) {
      const selected = Array.isArray(columnFilters.po_no) ? columnFilters.po_no : [columnFilters.po_no.toString()];
      filtered = filtered.filter(c => selected.includes(c.po_no?.toString()));
    }
    const msns = [...new Set(filtered.map(c => c.msn))].filter(Boolean).sort();
    return msns.map(m => ({ label: m, value: m }));
  }, [activeFilters.records, columnFilters.client, columnFilters.po_no]);

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
      const res = await apiClient.put(`/api/inspection-report/final/update-status/${docForReview.id}`, {
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
    const s = status?.trim()?.toLowerCase() || "pending"
    switch (s) {
      case "approved":
        return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 shadow-sm border border-green-200">Approved</span>
      case "rejected":
        return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 shadow-sm border border-red-200">Rejected</span>
      case "pending":
        return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800 shadow-sm border border-yellow-200">Pending</span>
      case "draft":
        return <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 shadow-sm border border-blue-200">Draft</span>
      default:
        return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800 shadow-sm border border-gray-200">{status || "Pending"}</span>
    }
  }

  const handleDownload = async (id) => {
    try {
      const filename = `FIR_${id}.pdf`;
      await exportApi.download(
        `/api/inspection-report/final/${id}/download`,
        filename,
        {},
        { contentType: 'application/pdf' }
      );
    } catch (err) {
      console.error(err)
      toast.error(err.message || "Failed to download PDF")
    }
  }

  const columns = useMemo(() => [
    { header: "Report No.", accessorKey: "report_no" },
    { 
      header: "Client", 
      accessorKey: "client",
      filterType: "select",
      isMulti: true,
      filterOptions: activeClientOptions
    },
    { 
      header: "PO No", 
      accessorKey: "po_no",
      filterType: "select",
      isMulti: true,
      filterOptions: activePoOptions
    },
    { 
      header: "Job Number", 
      accessorKey: "msn",
      filterType: "select",
      isMulti: true,
      filterOptions: activeMsnOptions
    },
    { header: "Project ID", accessorKey: "project_id" },
    { header: "Equipment", accessorKey: "equipment_name" },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row) => getStatusBadge(row.status),
    },
    {
      header: "Created",
      accessorKey: "createdAt",
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => {
        const isAssignedPE = row.production_engineer_id === user?.id
        const isQE = roles?.includes("QE") || roles?.includes("QC_ENGINEER") || roles?.includes("QC")
        const status = row.status?.trim()?.toLowerCase()
        const canReview = !isQE && (isAssignedPE || isAdmin) && status !== "approved" && status !== "rejected"

        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewClick(row)}
              title="View">
              <Eye className="h-4 w-4 mr-2" /> View
            </Button>
            {isAdmin || isQE ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditClick(row)}
                disabled={row.status?.trim()?.toLowerCase() === "approved"}
                title={row.status?.trim()?.toLowerCase() === "approved" ? "Cannot edit approved report" : "Edit"}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </Button>
            ) : (
              row.status?.trim()?.toLowerCase() !== "approved" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditClick(row)}
                  title="Review">
                  <CheckCircle className="h-4 w-4 mr-2" /> Review
                </Button>
              )
            )}
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
            {(status === "approved" || isAdmin || isAssignedPE) && (
              <Button
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => handleDownload(row.id)}
                title="Download">
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
            )}
          </div>
        )
      },
    },
  ], [activeClientOptions, activePoOptions, activeMsnOptions, isAdmin, roles, user, onViewClick, onEditClick])

  const fetchData = useCallback(async (params) => {
    const queryParams = { ...params };
    if (queryParams.columnFilters) {
      queryParams.columnFilters = JSON.stringify(queryParams.columnFilters);
    }
    const res = await apiClient.get(`/api/inspection-report/final/list`, queryParams)
    return { data: res.data, meta: res.meta }
  }, [])

  const handleExport = async () => {
    try {
      await exportApi.exportFinalInspection();
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Final Inspection Export failed:", error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Final Dimension Inspection Reports</h1>
          <p className="text-muted-foreground">View and manage all Final Dimension Inspection Reports.</p>
        </div>
      </div>

      <ProDataTable
        columns={columns}
        fetchData={fetchData}
        onExport={handleExport}
        onAdd={onCreateClick}
        columnFilters={columnFilters}
        onFilterChange={(newFilters) => setColumnFilters(prev => ({ ...prev, ...newFilters }))}
        refreshKey={refreshTrigger}
        globalSearchPlaceholder="Search report no, job, client..."
      />

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
    </div>
  )
}

// ─── Create / Edit / View View ──────────────────────────────────────────────
function FormView({ onBack, onSuccess, editId = null, isView = false }) {
  const location = useLocation()
  const [recordId, setRecordId] = useState(null)
  
  const normalizeUser = (user) => {
    const id = String(user?.id || "")
    const name = String(user?.name || user?.full_name || user?.email || "User")
    const empid = String(user?.empid || user?.employeeId || "")
    return {
      id,
      name,
      empid,
      displayName: empid ? `${name} (${empid})` : `${name}`,
    }
  }

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })

  // Header section
  const [msn, setMsn] = useState("")
  const [reportNo, setReportNo] = useState("")
  const [client, setClient] = useState("")
  const [poNo, setPoNo] = useState("")
  const [equipment, setEquipment] = useState("")
  const [code, setCode] = useState("")

  const [formData, setFormData] = useState({
    tagNo: "",
    drgNo: "",
    project_id: "",
  })

  const [productionEngineer, setProductionEngineer] = useState("")
  
  // Table Rows State
  const initialTable1Rows = [{ id: 1, srNo: 1, description: "", required: "", actual: "", remarks: "" }]
  const [table1Rows, setTable1Rows] = useState(initialTable1Rows)

  const initialTable2Rows = [{ id: 1, srNo: 1, nozzleMark: "", orientation: "", size: "", location: "", elevationApproved: "", projectionApproved: "", elevationActual: "", projectionActual: "" }]
  const [table2Rows, setTable2Rows] = useState(initialTable2Rows)

  const initialTable3Rows = [{ id: 1, srNo: 1, partNo: "", description: "", orientationApproved: "", elevationApproved: "", projectionApproved: "", elevationActual: "", projectionActual: "" }]
  const [table3Rows, setTable3Rows] = useState(initialTable3Rows)

  const initialRemarks = [
    { id: 1, text: "All dimensions are in mm unless otherwise specified." },
    { id: 2, text: "All other dimensions are checked as per approved drawing and found satisfactory." },
    { id: 3, text: "Abbreviation: TL: Tan Line, CL: Center Line, GF: Gasket face, FF: Flange face, VOD: Vessel Outside Diameter, VCL: Vessel center line, OD: Outside diameter, TTL : Top tan line, BTL: Bottom tan line, QTY.: Quantity, I/S: Inside, O/S: Outside, NCL:Nozzle center line, BWL: Bottom Weld line, TWL: Top weld line, APD: As Per Drawing" },
    { id: 4, text: "Visual inspection was carried out from both the inside and outside, and the condition was found to be satisfactory." },
  ]
  const [remarks, setRemarks] = useState(initialRemarks)
  const [instrumentRows, setInstrumentRows] = useState([{ id: 1, name: "", idNo: "", dueDate: "" }])

  const [msnOptions, setMsnOptions] = useState([])
  const [productionEngineers, setProductionEngineers] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [userRole, setUserRole] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const authData = localStorage.getItem("user_auth")
    if (authData) {
      try {
        const parsed = JSON.parse(authData)
        const roles = parsed?.payload?.roles || parsed?.payload?.user?.roles || []
        const roleNames = roles.map(r => (typeof r === 'object' && r.name) ? r.name : r)
        if (roleNames.some(r => ['QC_ENGINEER', 'ADMIN', 'QC'].includes(r))) {
          setUserRole('QC')
        } else if (roleNames.some(r => ['PRODUCTION_ENGINEER'].includes(r))) {
          setUserRole('PROD')
        }
      } catch (e) {
        console.error("Error parsing auth data", e)
      }
    }
  }, [])

  useEffect(() => {
    apiClient.get("/api/common/jobs?limit=200")
      .then((res) => { if (res.success) setMsnOptions(res.data) })
      .catch((err) => console.error("Failed to fetch jobs:", err))

    apiClient.get("/api/users/by-role/PRODUCTION_ENGINEER")
      .then((res) => { if (res.success) setProductionEngineers(res.data) })
      .catch((err) => console.error("Failed to fetch production engineers:", err))
  }, [])

  const applyDataToForm = useCallback((data) => {
    setRecordId(data.id)
    setMsn(data.job_id || "")
    setReportNo(data.report_no || "")
    setEquipment(data.equipment_name || "")
    setCode(data.code || "")
    setClient(data.client || "")
    setPoNo(data.po_no || "")
    setFormData({
      tagNo: data.tag_no || "",
      drgNo: data.drg_no || "",
      project_id: data.project_id || "",
    })
    setProductionEngineer(data.production_engineer_id || "")

    if (data.details && data.details.length > 0) {
      setTable1Rows(data.details.map((item, i) => ({
        id: i + 1, srNo: item.sr_no || (i + 1), description: item.description || "", required: item.required || "", actual: item.actual || "", remarks: item.remarks || ""
      })))
    }
    if (data.nozzles && data.nozzles.length > 0) {
      setTable2Rows(data.nozzles.map((nz, i) => ({
        id: i + 1, srNo: nz.sr_no || (i + 1), nozzleMark: nz.nozzle_mark || "", orientation: nz.orientation || "", size: nz.size || "", location: nz.location || "", elevationApproved: nz.elevation_approved || "", projectionApproved: nz.projection_approved || "", elevationActual: nz.elevation_actual || "", projectionActual: nz.projection_actual || ""
      })))
    }
    if (data.parts && data.parts.length > 0) {
      setTable3Rows(data.parts.map((pt, i) => ({
        id: i + 1, srNo: pt.sr_no || (i + 1), partNo: pt.part_no || "", description: pt.description || "", orientationApproved: pt.orientation_approved || "", elevationApproved: pt.elevation_approved || "", projectionApproved: pt.projection_approved || "", elevationActual: pt.elevation_actual || "", projectionActual: pt.projection_actual || ""
      })))
    }
    if (data.instruments && data.instruments.length > 0) {
      setInstrumentRows(data.instruments.map((inst, i) => ({
        id: i + 1, name: inst.name || "", idNo: inst.id_no || "", dueDate: inst.due_date || ""
      })))
    }
    if (data.remarks && data.remarks.length > 0) {
      setRemarks(data.remarks.map((rem, i) => ({ id: i + 1, text: rem.text || "" })))
    }
  }, [])

  useEffect(() => {
    if (editId && msnOptions.length > 0) {
      const fetchRecord = async () => {
        setIsLoading(true)
        try {
          const reportState = location.state?.report
          let finalId = reportState?.id || editId

          if (!reportState?.id) {
            const decoded = decodeURIComponent(editId)
            const response = await apiClient.get("/api/inspection-report/final/list", { search: decoded, limit: 10 })
            const matched = response?.data?.find(p => toUrlKey(p.report_no) === editId || p.report_no === decoded)
            if (matched) finalId = matched.id
          }

          const res = await apiClient.get(`/api/inspection-report/final/${finalId}`)
          if (res.success && res.data) applyDataToForm(res.data)
          else toast.error("Report not found")
        } catch (err) {
          toast.error("Error loading record")
        } finally {
          setIsLoading(false)
        }
      }
      fetchRecord()
    }
  }, [editId, msnOptions, applyDataToForm, location.state])

  const handleMsnChange = async (value) => {
    setMsn(value)
    if (editId) return
    setReportNo("Loading...")
    const selectedMsn = msnOptions.find((option) => option.id === value)
    setClient(selectedMsn?.customer?.customer_name || "")
    setPoNo(selectedMsn?.po?.po_number || "")
    setFormData((prev) => ({ ...prev, tagNo: selectedMsn?.tag_number || "", project_id: selectedMsn?.project_id || "", }))
    setEquipment(selectedMsn?.equipement_name || "")
    setCode(selectedMsn?.code || "")

    try {
      const res = await apiClient.get(`/api/inspection-report/final/next-report-no/${value}`)
      setReportNo(res.success && res.data?.next_report_no ? res.data.next_report_no : "Auto-generated on Submit")
    } catch (err) {
      setReportNo("Auto-generated on Submit")
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleTable1RowChange = (id, field, value) => setTable1Rows(prev => prev.map((row) => row.id === id ? { ...row, [field]: value } : row))
  const handleTable2RowChange = (id, field, value) => setTable2Rows(prev => prev.map((row) => row.id === id ? { ...row, [field]: value } : row))
  const handleTable3RowChange = (id, field, value) => setTable3Rows(prev => prev.map((row) => row.id === id ? { ...row, [field]: value } : row))
  const handleInstrumentRowChange = (id, field, value) => setInstrumentRows(prev => prev.map((row) => row.id === id ? { ...row, [field]: value } : row))
  const handleRemarkChange = (id, value) => setRemarks(prev => prev.map((remark) => remark.id === id ? { ...remark, text: value } : remark))

  const addTable1Row = () => setTable1Rows(prev => [...prev, { id: Math.max(...prev.map(r => r.id), 0) + 1, srNo: prev.length + 1, description: "", required: "", actual: "", remarks: "" }])
  const addTable2Row = () => setTable2Rows(prev => [...prev, { id: Math.max(...prev.map(r => r.id), 0) + 1, srNo: prev.length + 1, nozzleMark: "", orientation: "", size: "", location: "", elevationApproved: "", projectionApproved: "", elevationActual: "", projectionActual: "" }])
  const addTable3Row = () => setTable3Rows(prev => [...prev, { id: Math.max(...prev.map(r => r.id), 0) + 1, srNo: prev.length + 1, partNo: "", description: "", orientationApproved: "", elevationApproved: "", projectionApproved: "", elevationActual: "", projectionActual: "" }])
  const addInstrumentRow = () => setInstrumentRows(prev => [...prev, { id: Math.max(...prev.map(r => r.id), 0) + 1, name: "", idNo: "", dueDate: "" }])
  const addRemark = () => setRemarks(prev => [...prev, { id: Math.max(...prev.map(r => r.id), 0) + 1, text: "" }])

  const removeTable1Row = (id) => table1Rows.length > 1 && setTable1Rows(prev => prev.filter(r => r.id !== id))
  const removeTable2Row = (id) => table2Rows.length > 1 && setTable2Rows(prev => prev.filter(r => r.id !== id))
  const removeTable3Row = (id) => table3Rows.length > 1 && setTable3Rows(prev => prev.filter(r => r.id !== id))
  const removeInstrumentRow = (id) => instrumentRows.length > 1 && setInstrumentRows(prev => prev.filter(r => r.id !== id))
  const removeRemark = (id) => remarks.length > 1 && setRemarks(prev => prev.filter(r => r.id !== id))

  const handleSubmit = async (newStatus = "draft") => {
    if (!msn) { toast.error("Please select an MSN"); return; }
    const selectedJob = msnOptions.find(opt => String(opt.id) === String(msn));
    const msnJobNumber = selectedJob?.job_number || (reportNo !== "Auto-generated on Submit" ? reportNo.split('/')[1] : "");

    const payload = {
      job_id: msn, msn: msnJobNumber, client, po_no: poNo, equipment_name: equipment, code,
      project_id: formData.project_id, tag_no: formData.tagNo, drg_no: formData.drgNo,
      production_engineer_id: productionEngineer, status: newStatus,
      details: table1Rows.filter(r => r.description?.trim()).map(r => ({ sr_no: r.srNo, description: r.description, required: r.required, actual: r.actual, remarks: r.remarks })),
      nozzles: table2Rows.filter(r => r.nozzleMark?.trim()).map(r => ({ sr_no: r.srNo, nozzle_mark: r.nozzleMark, orientation: r.orientation, size: r.size, location: r.location, elevation_approved: r.elevationApproved, projection_approved: r.projectionApproved, elevation_actual: r.elevationActual, projection_actual: r.projectionActual })),
      parts: table3Rows.filter(r => r.partNo?.trim()).map(r => ({ sr_no: r.srNo, part_no: r.partNo, description: r.description, orientation_approved: r.orientationApproved, elevation_approved: r.elevationApproved, projection_approved: r.projectionApproved, elevation_actual: r.elevationActual, projection_actual: r.projectionActual })),
      instruments: instrumentRows.filter(r => r.name?.trim()).map(r => ({ name: r.name, id_no: r.idNo, due_date: r.dueDate })),
      remarks: remarks.filter(r => r.text?.trim()).map((r, i) => ({ sr_no: i + 1, text: r.text }))
    };

    try {
      setSubmitting(true);
      let res = editId && recordId ? await apiClient.put(`/api/inspection-report/final/update/${recordId}`, payload) : await apiClient.post("/api/inspection-report/final/create", payload);
      if (res.success) { toast.success(editId ? "Report updated!" : "Report created!"); onSuccess(); }
      else { toast.error(res.message || "Failed to save report"); }
    } catch (err) { toast.error(err.message || "Failed to save report"); }
    finally { setSubmitting(false); }
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">{isView ? "View" : editId ? "Edit" : "Create"} Final Dimension Inspection</h1>
          <p className="text-muted-foreground">{isView ? "Review report details." : editId ? "Update report details." : "Create new report."}</p>
        </div>
        <Button variant="outline" onClick={onBack} className="h-9"><ArrowLeft className="h-4 w-4 mr-2" /> Back to List</Button>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Report Information</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="msn">MSN / JOB NO:</Label>
              <Select value={msn} onValueChange={handleMsnChange} disabled={userRole === 'PROD' || isView}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select MSN" /></SelectTrigger>
                <SelectContent>{msnOptions.map((opt) => (<SelectItem key={opt.id} value={opt.id}>{opt.job_number}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label htmlFor="reportNo">REPORT NO.:</Label><Input id="reportNo" type="text" value={reportNo} readOnly className="bg-muted font-bold" /></div>
            <div className="space-y-2"><Label htmlFor="client">CLIENT:</Label><Input id="client" type="text" value={client} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label htmlFor="poNo">PO NO:</Label><Input id="poNo" type="text" value={poNo} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label htmlFor="equipment">EQUIPMENT:</Label><Input id="equipment" type="text" value={equipment} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label htmlFor="code">CODE:</Label><Input id="code" type="text" value={code} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label htmlFor="project_id">PROJECT ID:</Label><Input id="project_id" name="project_id" type="text" value={formData.project_id} onChange={handleInputChange} readOnly={userRole === 'PROD' || isView} className={(userRole === 'PROD' || isView) ? "bg-muted" : ""} /></div>
            <div className="space-y-2"><Label htmlFor="tagNo">TAG NO:</Label><Input id="tagNo" name="tagNo" type="text" value={formData.tagNo} onChange={handleInputChange} readOnly={userRole === 'PROD' || isView} className={(userRole === 'PROD' || isView) ? "bg-muted" : ""} /></div>
            <div className="space-y-2"><Label htmlFor="drgNo">DRG NO:</Label><Input id="drgNo" name="drgNo" type="text" value={formData.drgNo} onChange={handleInputChange} readOnly={userRole === 'PROD' || isView} className={(userRole === 'PROD' || isView) ? "bg-muted" : ""} /></div>
          </div>
        </CardContent>
      </Card>

      {/* Table 1 - Inspection Details */}
      <Card className="mb-6 w-full overflow-hidden">
        <CardHeader><CardTitle>Inspection Details</CardTitle></CardHeader>
        <CardContent className="p-6 flex flex-col gap-4 w-full">
          <div className="rounded-md border overflow-y-auto max-h-[500px]">
            <Table className="min-w-[800px]">
              <TableHeader><TableRow><TableHead>DESCRIPTION</TableHead><TableHead>REQUIRED</TableHead><TableHead>ACTUAL</TableHead><TableHead>REMARKS</TableHead>{!isView && <TableHead className="w-[100px]">Actions</TableHead>}</TableRow></TableHeader>
              <TableBody>
                {table1Rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><Input type="text" value={row.description} onChange={(e) => handleTable1RowChange(row.id, "description", e.target.value)} readOnly={userRole === 'PROD' || isView} className={(userRole === 'PROD' || isView) ? "bg-muted text-xs" : "text-xs"} /></TableCell>
                    <TableCell><Input type="text" value={row.required} onChange={(e) => handleTable1RowChange(row.id, "required", e.target.value)} readOnly={userRole === 'PROD' || isView} className={(userRole === 'PROD' || isView) ? "bg-muted text-xs" : "text-xs"} /></TableCell>
                    <TableCell><Input type="text" value={row.actual} onChange={(e) => handleTable1RowChange(row.id, "actual", e.target.value)} readOnly={userRole === 'QC' || isView} className={(userRole === 'QC' || isView) ? "bg-muted text-xs" : "text-xs"} /></TableCell>
                    <TableCell><Input type="text" value={row.remarks} onChange={(e) => handleTable1RowChange(row.id, "remarks", e.target.value)} readOnly={userRole === 'QC' || isView} className={(userRole === 'QC' || isView) ? "bg-muted text-xs" : "text-xs"} /></TableCell>
                    {!isView && <TableCell><Button type="button" variant="ghost" size="sm" onClick={() => removeTable1Row(row.id)} disabled={table1Rows.length === 1 || userRole === 'PROD'}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!isView && <Button type="button" variant="outline" onClick={addTable1Row} className="w-full sm:w-auto" disabled={userRole === 'PROD'}><Plus className="h-4 w-4 mr-2" />Add Row</Button>}
        </CardContent>
      </Card>

      {/* Table 2 - Nozzle Details */}
      <Card className="mb-6 w-full overflow-hidden">
        <CardHeader><CardTitle>Nozzle Details</CardTitle></CardHeader>
        <CardContent className="p-6 flex flex-col gap-4 w-full">
          <div className="rounded-md border overflow-y-auto max-h-[500px]">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow><TableHead></TableHead><TableHead colSpan={3} className="text-center">DIMENSION AS PER APPROVED DRAWING</TableHead><TableHead></TableHead><TableHead colSpan={2} className="text-center border-l">DIMENSION AT ACTUAL</TableHead>{!isView && <TableHead></TableHead>}</TableRow>
                <TableRow><TableHead>MARK</TableHead><TableHead>ORIENTATION</TableHead><TableHead>SIZE</TableHead><TableHead>LOCATION</TableHead><TableHead>ELEVATION</TableHead><TableHead>PROJECTION</TableHead><TableHead className="border-l">ELEVATION</TableHead><TableHead>PROJECTION</TableHead>{!isView && <TableHead></TableHead>}</TableRow>
              </TableHeader>
              <TableBody>
                {table2Rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><Input type="text" value={row.nozzleMark} onChange={(e) => handleTable2RowChange(row.id, "nozzleMark", e.target.value)} readOnly={userRole === 'PROD' || isView} className="text-xs" /></TableCell>
                    <TableCell><Input type="text" value={row.orientation} onChange={(e) => handleTable2RowChange(row.id, "orientation", e.target.value)} readOnly={userRole === 'PROD' || isView} className="text-xs" /></TableCell>
                    <TableCell><Input type="text" value={row.size} onChange={(e) => handleTable2RowChange(row.id, "size", e.target.value)} readOnly={userRole === 'PROD' || isView} className="text-xs" /></TableCell>
                    <TableCell><Input type="text" value={row.location} onChange={(e) => handleTable2RowChange(row.id, "location", e.target.value)} readOnly={userRole === 'PROD' || isView} className="text-xs" /></TableCell>
                    <TableCell><Input type="text" value={row.elevationApproved} onChange={(e) => handleTable2RowChange(row.id, "elevationApproved", e.target.value)} readOnly={userRole === 'PROD' || isView} className="text-xs" /></TableCell>
                    <TableCell><Input type="text" value={row.projectionApproved} onChange={(e) => handleTable2RowChange(row.id, "projectionApproved", e.target.value)} readOnly={userRole === 'PROD' || isView} className="text-xs" /></TableCell>
                    <TableCell className="border-l"><Input type="text" value={row.elevationActual} onChange={(e) => handleTable2RowChange(row.id, "elevationActual", e.target.value)} readOnly={userRole === 'QC' || isView} className="text-xs bg-blue-50/30" /></TableCell>
                    <TableCell><Input type="text" value={row.projectionActual} onChange={(e) => handleTable2RowChange(row.id, "projectionActual", e.target.value)} readOnly={userRole === 'QC' || isView} className="text-xs bg-blue-50/30" /></TableCell>
                    {!isView && <TableCell><Button type="button" variant="ghost" size="sm" onClick={() => removeTable2Row(row.id)} disabled={table2Rows.length === 1 || userRole === 'PROD'}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!isView && <Button type="button" variant="outline" onClick={addTable2Row} className="w-full sm:w-auto" disabled={userRole === 'PROD'}><Plus className="h-4 w-4 mr-2" />Add Row</Button>}
        </CardContent>
      </Card>

      {/* Remarks Section */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Remarks</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {remarks.map((remark, index) => (
              <div key={remark.id} className="flex gap-2 items-start">
                <span className="pt-2 text-xs font-bold">{index + 1}.</span>
                <Textarea value={remark.text} onChange={(e) => handleRemarkChange(remark.id, e.target.value)} readOnly={userRole === 'PROD' || isView} className="min-h-[60px] text-xs" />
                {!isView && <Button type="button" variant="ghost" size="sm" onClick={() => removeRemark(remark.id)} disabled={remarks.length === 1 || userRole === 'PROD'}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              </div>
            ))}
            {!isView && <Button type="button" variant="outline" onClick={addRemark} disabled={userRole === 'PROD'}><Plus className="h-4 w-4 mr-2" />Add Remark</Button>}
          </div>
        </CardContent>
      </Card>

      {/* Instrument Calibration Details */}
      <Card className="mb-6 w-full overflow-hidden">
        <CardHeader><CardTitle>Instrument Calibration Details</CardTitle></CardHeader>
        <CardContent className="p-6 flex flex-col gap-4 w-full">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>NAME</TableHead><TableHead>ID NO. / SR NO.</TableHead><TableHead>DUE DATE</TableHead>{!isView && <TableHead>Actions</TableHead>}</TableRow></TableHeader>
              <TableBody>
                {instrumentRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><Input type="text" value={row.name} onChange={(e) => handleInstrumentRowChange(row.id, "name", e.target.value)} readOnly={userRole === 'PROD' || isView} className="text-xs" /></TableCell>
                    <TableCell><Input type="text" value={row.idNo} onChange={(e) => handleInstrumentRowChange(row.id, "idNo", e.target.value)} readOnly={userRole === 'PROD' || isView} className="text-xs" /></TableCell>
                    <TableCell><Input type="date" value={row.dueDate} onChange={(e) => handleInstrumentRowChange(row.id, "dueDate", e.target.value)} readOnly={userRole === 'PROD' || isView} className="text-xs" /></TableCell>
                    {!isView && <TableCell><Button type="button" variant="ghost" size="sm" onClick={() => removeInstrumentRow(row.id)} disabled={instrumentRows.length === 1 || userRole === 'PROD'}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!isView && <Button type="button" variant="outline" onClick={addInstrumentRow} className="mt-2" disabled={userRole === 'PROD'}><Plus className="h-4 w-4 mr-2" />Add Row</Button>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Production Engineer Assignment</CardTitle></CardHeader>
        <CardContent>
          <Select value={productionEngineer} onValueChange={setProductionEngineer} disabled={userRole === 'PROD' || isView}>
            <SelectTrigger className="w-[300px]"><SelectValue placeholder="Select Production Engineer" /></SelectTrigger>
            <SelectContent>{productionEngineers.map((engineer) => { const normalized = normalizeUser(engineer); return (<SelectItem key={normalized.id} value={normalized.id}>{normalized.displayName}</SelectItem>); })}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 mt-8 mb-4">
        <Button variant="outline" onClick={onBack}>{isView ? "Close" : "Cancel"}</Button>
        {!isView && <Button onClick={() => handleSubmit("draft")} disabled={submitting || userRole === 'PROD'}>{submitting ? "Saving..." : (editId ? "Update Report" : "Save & Submit Report")}</Button>}
      </div>
    </div>
  )
}

// ─── Main Component Wrapper ───────────────────────────────────────────
export default function FinalInspectionReports() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: routeId } = useParams()
  const mode = useMemo(() => {
    if (location.pathname.includes("/create")) return "create"
    if (location.pathname.includes("/edit")) return "edit"
    if (location.pathname.includes("/view")) return "view"
    return "list"
  }, [location.pathname])

  const handleSuccess = () => navigate("/final-inspection/list")

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
      <main className="flex-1 overflow-auto p-6 flex flex-col">
        <div className="flex-1 flex flex-col w-full">
          {mode === "list" ? (
            <ListView
              onCreateClick={() => navigate("/final-inspection/create")}
              onEditClick={(row) => navigate(`/final-inspection/edit/${toUrlKey(row.report_no)}`, { state: { report: { id: row.id, label: row.report_no } } })}
              onViewClick={(row) => navigate(`/final-inspection/view/${toUrlKey(row.report_no)}`, { state: { report: { id: row.id, label: row.report_no } } })}
            />
          ) : (
            <FormView
              onBack={() => navigate("/final-inspection/list")}
              onSuccess={handleSuccess}
              editId={routeId}
              isView={mode === "view"}
            />
          )}
        </div>
      </main>
    </>
  )
}
