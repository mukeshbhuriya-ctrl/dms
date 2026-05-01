import { useState, useEffect, useCallback, useMemo, Fragment } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"

import { SidebarTrigger } from "@/components/ui/sidebar"
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
      const res = await apiClient.get("/api/inspection-report/get-filters");
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
    const s = status?.trim()?.toLowerCase() || "pending"
    switch (s) {
      case "approved":
        return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 shadow-sm border border-green-200">Approved</span>
      case "rejected":
        return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 shadow-sm border border-red-200">Rejected</span>
      case "pending":
        return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800 shadow-sm border border-yellow-200">Pending</span>
      default:
        return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800 shadow-sm border border-gray-200">{status || "Pending"}</span>
    }
  }

  const handleDownload = async (id, reportNo) => {
    try {
      const filename = `DISH_END_${reportNo.replace(/\//g, '_')}.pdf`;
      await exportApi.download(
        `/api/inspection-report/${id}/download`,
        filename,
        {},
        { contentType: 'application/pdf' }
      );
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download report');
    }
  };

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
  ], [activeClientOptions, activePoOptions, activeMsnOptions, isAdmin, roles, user, onViewClick, onEditClick])

  const fetchData = useCallback(async (params) => {
    const queryParams = { ...params };
    if (queryParams.columnFilters) {
      queryParams.columnFilters = JSON.stringify(queryParams.columnFilters);
    }
    const res = await apiClient.get(`/api/inspection-report/list`, queryParams)
    return { data: res.data, meta: res.meta }
  }, [])

  const handleExport = async () => {
    try {
      await exportApi.exportDishEnd();
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Dish End Export failed:", error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Dish End Inspection Reports</h1>
          <p className="text-muted-foreground">View and manage all dish end inspection reports.</p>
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

  const [userRole, setUserRole] = useState("")

  // Detect user role
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
    "SPIN HOLE",
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

  const [instrumentRows, setInstrumentRows] = useState([
    { id: 1, name: "", idNo: "", dueDate: "" },
  ])

  const [productionEngineer, setProductionEngineer] = useState("")
  const [msnOptions, setMsnOptions] = useState([])
  const [productionEngineers, setProductionEngineers] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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
    setVendorDishEndNo(data.vendor_dish_end_number || "")

    setFormData({
      tagNo: data.tag_no || "",
      drgNo: data.drg_no || "",
      inspAgency: data.insp_agency || "",
    })
    setProductionEngineer(data.production_engineer_id || "")

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
  }, [])

  useEffect(() => {
    if (editId && msnOptions.length > 0) {
      const fetchRecord = async () => {
        setIsLoading(true)
        try {
          const reportState = location.state?.report
          let finalId = reportState?.id || editId

          // Resolve slug if needed
          if (!reportState?.id) {
            const decoded = decodeURIComponent(editId)
            const response = await apiClient.get("/api/inspection-report/list", { search: decoded, limit: 10 })
            const matched = response?.data?.find(p => toUrlKey(p.report_no) === editId || p.report_no === decoded)
            if (matched) finalId = matched.id
          }

          const res = await apiClient.get(`/api/inspection-report/${finalId}`)
          if (res.success && res.data) applyDataToForm(res.data)
          else toast.error("Report not found")
        } catch (err) {
          console.error(err)
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
    setEquipment(selectedMsn?.equipement_name || "")
    setCode(selectedMsn?.code || "")
    setClient(selectedMsn?.customer?.customer_name || "")
    setPoNo(selectedMsn?.po?.po_number || "")

    try {
      const res = await apiClient.get(`/api/inspection-report/next-report-no/${value}`)
      if (res.success && res.data?.next_report_no) {
        setReportNo(res.data.next_report_no)
      } else {
        setReportNo("Auto-generated on Submit")
      }
    } catch (err) {
      setReportNo("Auto-generated on Submit")
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

  const handleSubmit = async (status = "draft") => {
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
      production_engineer_id: productionEngineer,
      vendor_dish_end_number: vendorDishEndNo,
      status: status,
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
      if (editId && recordId) {
        res = await apiClient.put(`/api/inspection-report/update/${recordId}`, payload)
      } else {
        res = await apiClient.post("/api/inspection-report/create", payload)
      }

      if (res.success) {
        toast.success(editId ? "Report updated successfully!" : "Report created successfully!")
        onSuccess()
      }
    } catch (err) {
      toast.error(err.message || "Failed to save report")
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) return <div className="p-8 text-center">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">{isView ? "View" : editId ? "Edit" : "Create"} Dish End Inspection Report</h1>
          <p className="text-muted-foreground">{isView ? "Review details." : editId ? "Update the details for this dish end inspection." : "Fill in the details for a new dish end inspection."}</p>
        </div>
        <Button variant="outline" onClick={onBack} className="h-9">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="msn">MSN:</Label>
              <Select value={msn} onValueChange={handleMsnChange} disabled={userRole === 'PROD' || isView}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select MSN" /></SelectTrigger>
                <SelectContent>{msnOptions.map((msnOption) => (<SelectItem key={msnOption.id} value={msnOption.id}>{msnOption.job_number}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportNo">REPORT NO.:</Label>
              <Input id="reportNo" type="text" value={reportNo} readOnly className="bg-muted text-xs font-semibold" />
            </div>
            <div className="space-y-2"><Label htmlFor="equipment">EQUIPMENT:</Label><Input id="equipment" type="text" value={equipment} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label htmlFor="code">CODE:</Label><Input id="code" type="text" value={code} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label htmlFor="client">CLIENT:</Label><Input id="client" type="text" value={client} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label htmlFor="poNo">P.O. NO.:</Label><Input id="poNo" type="text" value={poNo} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label htmlFor="date">Date:</Label><Input id="date" type="text" value={today} disabled className="bg-muted" /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader><CardTitle>Equipment Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2"><Label htmlFor="tagNo">TAG NO.:</Label><Input id="tagNo" name="tagNo" type="text" value={formData.tagNo} onChange={handleInputChange} readOnly={userRole === 'PROD' || isView} className={(userRole === 'PROD' || isView) ? "bg-muted text-xs" : "text-xs"} placeholder="Enter TAG NO." /></div>
            <div className="space-y-2"><Label htmlFor="drgNo">DRG. NO.:</Label><Input id="drgNo" name="drgNo" type="text" value={formData.drgNo} onChange={handleInputChange} readOnly={userRole === 'PROD' || isView} className={(userRole === 'PROD' || isView) ? "bg-muted text-xs" : "text-xs"} placeholder="Enter DRG. NO." /></div>
            <div className="space-y-2"><Label htmlFor="inspAgency">INSP. AGENCY:</Label><Input id="inspAgency" name="inspAgency" type="text" value={formData.inspAgency} onChange={handleInputChange} readOnly={userRole === 'PROD' || isView} className={(userRole === 'PROD' || isView) ? "bg-muted text-xs" : "text-xs"} placeholder="Enter INSP. AGENCY" /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 w-full overflow-hidden">
        <CardHeader><CardTitle>Inspection Details</CardTitle></CardHeader>
        <CardContent className="p-6 flex flex-col gap-4 w-full">
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow className="bg-blue-100">
                  <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300 w-16 text-center">SR NO.</TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300">DESCRIPTION</TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300">AS PER DRG.</TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300">
                    <div className="flex flex-col gap-2"><span>ACTUAL</span><Input type="text" value={vendorDishEndNo} onChange={(e) => setVendorDishEndNo(e.target.value)} placeholder="Vendor Dish End Number" readOnly={userRole === 'PROD' || isView} className={`text-xs border-0 focus-visible:ring-0 ${(userRole === 'PROD' || isView) ? 'bg-muted' : 'bg-white'}`} /></div>
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300">REMARKS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="p-2 border border-gray-300 text-center"><div className="text-sm font-medium">{row.srNo}</div></TableCell>
                    <TableCell className="p-2 border border-gray-300"><div className="text-sm">{row.description}</div></TableCell>
                    <TableCell className="p-2 border border-gray-300"><Input type="text" value={row.asPerDrg} onChange={(e) => handleRowChange(row.id, "asPerDrg", e.target.value)} readOnly={userRole === 'PROD' || isView} className={`w-full text-xs border-0 focus-visible:ring-0 ${(userRole === 'PROD' || isView) ? 'bg-muted' : ''}`} /></TableCell>
                    <TableCell className="p-2 border border-gray-300"><Input type="text" value={row.actual} onChange={(e) => handleRowChange(row.id, "actual", e.target.value)} readOnly={userRole === 'PROD' || isView} className={`w-full text-xs border-0 focus-visible:ring-0 ${(userRole === 'PROD' || isView) ? 'bg-muted' : ''}`} /></TableCell>
                    <TableCell className="p-2 border border-gray-300"><Input type="text" value={row.remarks} onChange={(e) => handleRowChange(row.id, "remarks", e.target.value)} readOnly={userRole === 'PROD' || isView} className={`w-full text-xs border-0 focus-visible:ring-0 ${(userRole === 'PROD' || isView) ? 'bg-muted' : ''}`} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 w-full overflow-hidden">
        <CardHeader><CardTitle>Instrument Calibration Details</CardTitle></CardHeader>
        <CardContent className="p-6 flex flex-col gap-4 w-full">
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="p-2 text-xs font-bold uppercase">NAME</TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">ID NO. / SR NO.</TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">DUE DATE</TableHead>
                  {!isView && <TableHead className="p-2 text-xs font-bold uppercase w-[120px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {instrumentRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><Input type="text" value={row.name} onChange={(e) => handleInstrumentRowChange(row.id, "name", e.target.value)} readOnly={userRole === 'PROD' || isView} className={`w-full text-xs border-0 focus-visible:ring-0 ${(userRole === 'PROD' || isView) ? 'bg-muted' : ''}`} /></TableCell>
                    <TableCell><Input type="text" value={row.idNo} onChange={(e) => handleInstrumentRowChange(row.id, "idNo", e.target.value)} readOnly={userRole === 'PROD' || isView} className={`w-full text-xs border-0 focus-visible:ring-0 ${(userRole === 'PROD' || isView) ? 'bg-muted' : ''}`} /></TableCell>
                    <TableCell><Input type="date" value={row.dueDate} onChange={(e) => handleInstrumentRowChange(row.id, "dueDate", e.target.value)} readOnly={userRole === 'PROD' || isView} className={`w-full text-xs border-0 focus-visible:ring-0 ${(userRole === 'PROD' || isView) ? 'bg-muted' : ''}`} /></TableCell>
                    {!isView && (<TableCell><Button type="button" variant="ghost" size="sm" onClick={() => removeInstrumentRow(row.id)} disabled={instrumentRows.length === 1 || userRole === 'PROD'}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!isView && <Button type="button" variant="outline" onClick={addInstrumentRow} className="w-full sm:w-auto mt-2" disabled={userRole === 'PROD'}><Plus className="h-4 w-4 mr-2" />Add Row</Button>}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader><CardTitle>Production Engineer Assignment</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="productionEngineer">Production Engineer:</Label>
              <Select value={productionEngineer} onValueChange={setProductionEngineer} disabled={userRole === 'PROD' || isView}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select Production Engineer" /></SelectTrigger>
                <SelectContent>{productionEngineers.map((engineer) => { const normalized = normalizeUser(engineer); return (<SelectItem key={normalized.id} value={normalized.id}>{normalized.displayName}</SelectItem>);})}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 mt-6">
        <Button variant="outline" onClick={onBack}>{isView ? "Close" : "Cancel"}</Button>
        {!isView && <Button onClick={() => handleSubmit("draft")} disabled={submitting || userRole === 'PROD'}>{submitting ? "Saving..." : (editId ? "Update Report" : "Submit Report")}</Button>}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
function InspectionReport() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: routeId } = useParams()
  const mode = useMemo(() => {
    if (location.pathname.includes("/create")) return "create"
    if (location.pathname.includes("/edit")) return "edit"
    if (location.pathname.includes("/view")) return "view"
    return "list"
  }, [location.pathname])

  const handleSuccess = () => {
    navigate("/inspection-report/list")
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
      <main className="flex-1 overflow-auto p-6 flex flex-col">
        <div className="flex-1 flex flex-col w-full">
          {mode === "list" ? (
            <ListView
              onCreateClick={() => navigate("/inspection-report/create")}
              onEditClick={(row) => navigate(`/inspection-report/edit/${toUrlKey(row.report_no)}`, { state: { report: { id: row.id, label: row.report_no } } })}
              onViewClick={(row) => navigate(`/inspection-report/view/${toUrlKey(row.report_no)}`, { state: { report: { id: row.id, label: row.report_no } } })}
            />
          ) : (
            <FormView
              onBack={() => navigate("/inspection-report/list")}
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

export default InspectionReport
