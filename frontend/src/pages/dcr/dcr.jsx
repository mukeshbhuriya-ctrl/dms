import { useCallback, useEffect, useState, useMemo } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"

import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { ArrowLeft, Plus, X, CheckCircle, XCircle, Eye, Edit, Download, Search, ChevronDown, ChevronLeft, ChevronRight, Check } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ProDataTable from "@/components/shared/ProDataTable"
import { useAuth } from "@/context/AuthContext"
import { toast } from "react-toastify"

const StatusBadge = ({ status, className }) => {
  const statusConfig = {
    pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20" },
    waiting: { label: "Waiting for Design", className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 hover:bg-gray-500/20" },
    rejected: { label: "Rejected", className: "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20" },
    design_rejected: { label: "Rejected by Design", className: "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20" },
    approved: { label: "Approved", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20" }
  };

  const config = statusConfig[status] || {
    label: status,
    className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 hover:bg-gray-500/20"
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className} ${className || ""}`}>
      {config.label}
    </span>
  );
};

const defaultFormData = {
  msmNumber: "",
  dcrNo: "",
  drawingNo: "",
  equipmentNo: "",
  inspBy: "",
  qualityEngineerId: "",
  designEngineerId: "",
}

const createEmptyRow = (id = 1) => ({
  id,
  itemPartNo: "",
  changeFrom: "",
  changeTo: "",
  reasonForChange: "",
})

const normalizeStatus = (value) =>
  String(value || "pending")
    .trim()
    .toLowerCase()

const normalizeChangeRequest = (item, index) => ({
  id: item?.id || `${item?.item_part_no || "item"}-${index}`,
  item_part_no: item?.item_part_no || item?.itemPartNo || "-",
  chnage_from:
    item?.chnage_from || item?.change_from || item?.changeFrom || "-",
  chnage_to: item?.chnage_to || item?.change_to || item?.changeTo || "-",
  reason: item?.reason || item?.reason_for_change || item?.reasonForChange || "-",
})

const getStatusFromPayload = (item = {}) => {
  const statusItem = Array.isArray(item?.dcr_status) ? item.dcr_status[0] : null

  return {
    status: normalizeStatus(statusItem?.status ?? item?.status),
    designStatus: normalizeStatus(
      statusItem?.design_engineer_status ?? item?.design_engineer_status
    ),
    qualityStatus: normalizeStatus(
      statusItem?.quality_engineer_status ?? item?.quality_engineer_status
    ),
  }
}

const normalizeRecord = (item, index) => {
  const statuses = getStatusFromPayload(item)
  const requests = Array.isArray(item?.change_requests) ? item.change_requests : []

  return {
    id: item?.id || item?.job_id || `${item?.dcr_no || "dcr"}-${index}`,
    job_id: item?.job_id || "-",
    dcr_no: item?.dcr_no || "-",
    drg_no: item?.drg_no || "-",
    equ_no: item?.equ_no || "-",
    inspect_by: item?.inspect_by || "-",
    status: statuses.status,
    design_engineer_status: statuses.designStatus,
    quality_engineer_status: statuses.qualityStatus,
    design_engineer_id: item?.design_engineer_id || "",
    quality_engineer_id: item?.quality_engineer_id || "",
    client: item?.client || "-",
    po_no: item?.po_no || "-",
    msn: item?.msn || "-",
    change_requests: requests.map((request, requestIndex) =>
      normalizeChangeRequest(request, requestIndex)
    ),
  }
}

const normalizeDetail = (item) => {
  const statuses = getStatusFromPayload(item)
  const changeList = Array.isArray(item?.change_request) ? item.change_request : []

  return {
    formData: {
      msmNumber: String(item?.job_id || item?.job?.id || ""),
      dcrNo: String(item?.dcr_no || ""),
      drawingNo: String(item?.drg_no || ""),
      equipmentNo: String(item?.equ_no || ""),
      inspBy: String(item?.inspect_by || ""),
      qualityEngineerId: String(item?.quality_engineer?.id || ""),
      designEngineerId: String(item?.design_engineer?.id || ""),
    },
    tableRows:
      changeList.length > 0
        ? changeList.map((row, index) => ({
          id: row?.id || `view-row-${index + 1}`,
          itemPartNo: String(row?.item_part_no || ""),
          changeFrom: String(row?.chnage_from || ""),
          changeTo: String(row?.chnage_to || ""),
          reasonForChange: String(row?.reason || ""),
        }))
        : [createEmptyRow(1)],
    jobNumber: String(item?.job_number || "-"),
    designEngineerName: String(item?.design_engineer?.name || "-"),
    qualityEngineerName: String(item?.quality_engineer?.name || "-"),
    status: statuses.status,
    designStatus: statuses.designStatus,
    qualityStatus: statuses.qualityStatus,
  }
}

const extractRecords = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.dcr)) return payload.dcr
  if (Array.isArray(payload?.payload)) return payload.payload
  if (Array.isArray(payload?.payload?.data)) return payload.payload.data
  if (payload?.dcr_no || payload?.job_id) return [payload]
  if (payload?.data && (payload.data?.dcr_no || payload.data?.job_id)) {
    return [payload.data]
  }
  return []
}

const extractJobs = (payload) => {
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload)) return payload
  return []
}

const normalizeJob = (job) => ({
  id: String(job?.id || ""),
  job_number: String(job?.job_number || "-"),
  next_dcr_no: String(job?.next_dcr_no || ""),
  tag_number: String(job?.tag_number || "-"),
  equipement_name: String(job?.equipement_name || "-"),
  code: String(job?.code || ""),
})

const normalizeUser = (user) => {
  const id = String(user?.id || "")
  const name = String(user?.name || user?.full_name || user?.email || "User")
  const empid = String(user?.empid || user?.employeeId || "")

  return {
    id,
    name,
    empid,
    displayName: empid ? `${name} (${empid})` : name,
  }
}

const getToken = () => {
  const authData = localStorage.getItem("user_auth")
  if (!authData) return null

  try {
    const parsed = JSON.parse(authData)
    return parsed?.payload?.token || parsed?.token || null
  } catch {
    return null
  }
}

const getAuthHeaders = () => {
  const token = getToken()
  const headers = {
    "Content-Type": "application/json",
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

function CreateDCR() {
  const { user, roles } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { id: routeId } = useParams()

  const view = location.pathname.includes("/create") ? "create"
    : location.pathname.includes("/edit/") ? "edit"
      : location.pathname.includes("/view/") ? "view"
        : "list"

  // Review Dialog State
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [docForReview, setDocForReview] = useState(null)
  const [reviewStatus, setReviewStatus] = useState("")
  const [reviewRemarks, setReviewRemarks] = useState("")
  const [isReviewing, setIsReviewing] = useState(false)
  const [selectedDcrId, setSelectedDcrId] = useState(null)

  const handleReviewClick = (row, status) => {
    setDocForReview(row)
    setReviewStatus(status)
    setReviewRemarks("")
    setReviewDialogOpen(true)
  }

  const submitReview = async () => {
    if (!docForReview) return
    if (reviewStatus === "rejected" && !reviewRemarks.trim()) {
      toast.error("Remarks are required for rejection.")
      return
    }

    setIsReviewing(true)
    try {
      const isDesignEngineer = roles?.includes("DESIGN_ENGINEER") && docForReview.design_engineer_id === user?.id
      const isQualityEngineer = roles?.includes("QC_ENGINEER") && docForReview.quality_engineer_id === user?.id

      let apiUrl = ""
      let payload = { dcr_id: docForReview.id }

      if (isDesignEngineer) {
        apiUrl = "/api/dcr/approval/update-design-engineer-status"
        payload.design_engineer_status = reviewStatus
        payload.design_engineer_remarks = reviewRemarks
      } else if (isQualityEngineer) {
        apiUrl = "/api/dcr/approval/update-quality-engineer-status"
        payload.quality_engineer_status = reviewStatus
        payload.quality_engineer_remarks = reviewRemarks
      } else {
        toast.error("You are not authorized to perform this review.")
        setIsReviewing(false)
        return
      }

      const res = await apiClient.post(apiUrl, payload);

      if (res.success) {
        toast.success(`DCR ${reviewStatus} successfully`)
        setReviewDialogOpen(false)
        fetchDcrList()
      } else {
        toast.error(res.message || "Failed to submit review")
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message || "Failed to submit review")
    } finally {
      setIsReviewing(false)
    }
  }
  const [refreshKey, setRefreshKey] = useState(0)
  const [columnFilters, setColumnFilters] = useState({})
  const [activeFilters, setActiveFilters] = useState({ records: [] })

  const fetchActiveFilters = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/dcr/active-filters")
      if (res.success) setActiveFilters(res.data)
    } catch (err) {
      console.error("Error fetching active filters:", err)
    }
  }, [])

  useEffect(() => {
    fetchActiveFilters()
  }, [fetchActiveFilters, refreshKey])

  // Auto-selection for reverse cascading
  useEffect(() => {
    if (!activeFilters.records || activeFilters.records.length === 0) return

    const updates = {}
    if (columnFilters.msn && Array.isArray(columnFilters.msn) && columnFilters.msn.length === 1) {
      const selectedMsn = columnFilters.msn[0]
      const match = activeFilters.records.find(r => r.msn?.toString() === selectedMsn?.toString())
      if (match) {
        if (!columnFilters.client || columnFilters.client.length === 0) updates.client = [match.client]
        if (!columnFilters.po_no || columnFilters.po_no.length === 0) updates.po_no = [match.po]
      }
    } else if (columnFilters.po_no && Array.isArray(columnFilters.po_no) && columnFilters.po_no.length === 1) {
      const selectedPo = columnFilters.po_no[0]
      const match = activeFilters.records.find(r => r.po?.toString() === selectedPo?.toString())
      if (match && (!columnFilters.client || columnFilters.client.length === 0)) {
        updates.client = [match.client]
      }
    }

    if (Object.keys(updates).length > 0) {
      setColumnFilters(prev => ({ ...prev, ...updates }))
    }
  }, [columnFilters.msn, columnFilters.po_no, activeFilters.records])

  // Cascading Logic
  const activeClientOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.po_no) {
      const selected = Array.isArray(columnFilters.po_no) ? columnFilters.po_no : [columnFilters.po_no.toString()]
      filtered = filtered.filter(c => selected.includes(c.po?.toString()))
    }
    if (columnFilters.msn) {
      const selected = Array.isArray(columnFilters.msn) ? columnFilters.msn : [columnFilters.msn.toString()]
      filtered = filtered.filter(c => selected.includes(c.msn?.toString()))
    }
    const clients = [...new Set(filtered.map(c => c.client))].filter(Boolean).sort()
    return clients.map(c => ({ label: c, value: c }))
  }, [activeFilters.records, columnFilters.po_no, columnFilters.msn])

  const activePoOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.client) {
      const selected = Array.isArray(columnFilters.client) ? columnFilters.client : [columnFilters.client.toString()]
      filtered = filtered.filter(c => selected.includes(c.client?.toString()))
    }
    if (columnFilters.msn) {
      const selected = Array.isArray(columnFilters.msn) ? columnFilters.msn : [columnFilters.msn.toString()]
      filtered = filtered.filter(c => selected.includes(c.msn?.toString()))
    }
    const pos = [...new Set(filtered.map(c => c.po))].filter(Boolean).sort()
    return pos.map(p => ({ label: p, value: p }))
  }, [activeFilters.records, columnFilters.client, columnFilters.msn])

  const activeMsnOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.client) {
      const selected = Array.isArray(columnFilters.client) ? columnFilters.client : [columnFilters.client.toString()]
      filtered = filtered.filter(c => selected.includes(c.client?.toString()))
    }
    if (columnFilters.po_no) {
      const selected = Array.isArray(columnFilters.po_no) ? columnFilters.po_no : [columnFilters.po_no.toString()]
      filtered = filtered.filter(c => selected.includes(c.po?.toString()))
    }
    const msns = [...new Set(filtered.map(c => c.msn))].filter(Boolean).sort()
    return msns.map(m => ({ label: m, value: m }))
  }, [activeFilters.records, columnFilters.client, columnFilters.po_no])

  const [jobs, setJobs] = useState([])
  const [designEngineers, setDesignEngineers] = useState([])
  const [qualityEngineers, setQualityEngineers] = useState([])
  const [isLoadingJobs, setIsLoadingJobs] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)

  const [formData, setFormData] = useState(defaultFormData)
  const [assignedDocs, setAssignedDocs] = useState([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  const [tableRows, setTableRows] = useState([createEmptyRow(1)])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [formError, setFormError] = useState("")
  const [formSuccess, setFormSuccess] = useState("")
  const [viewDetails, setViewDetails] = useState({
    jobNumber: "-",
    designEngineerName: "-",
    qualityEngineerName: "-",
    status: "pending",
    designStatus: "pending",
    qualityStatus: "pending",
  })

  const handleDownloadPdf = async (id, dcrNo) => {
    try {
      const filename = `DCR_${String(dcrNo || id).replace(/\//g, "_")}.pdf`;
      await exportApi.download(
        `/api/dcr/download-pdf/${id}`,
        filename,
        {},
        { contentType: 'application/pdf' }
      );
    } catch (err) {
      console.error(err)
      toast.error(err.message || "Failed to download PDF")
    }
  }

  const handleExport = async () => {
    try {
      await exportApi.exportModule('dcr', 'dcr_export.xlsx');
    } catch (error) {
      console.error("DCR Export failed:", error);
      toast.error("Export failed");
    }
  };

  const columns = useMemo(() => [
    { header: "DCR No", accessorKey: "dcr_no" },
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
    { header: "DRG No", accessorKey: "drg_no" },
    { header: "Inspect By", accessorKey: "inspect_by" },
    {
      header: "Main Status",
      accessorKey: "status",
      cell: (row) => <StatusBadge status={row.status} />
    },
    {
      header: "Design Status",
      accessorKey: "design_engineer_status",
      cell: (row) => <StatusBadge status={row.design_engineer_status} />
    },
    {
      header: "Quality Status",
      accessorKey: "quality_engineer_status",
      cell: (row) => {
        if (row.quality_engineer_status === "pending") {
          if (row.design_engineer_status === "rejected") return <StatusBadge status="design_rejected" />
          if (row.design_engineer_status !== "approved") return <StatusBadge status="waiting" />
          return <StatusBadge status="pending" />
        }
        return <StatusBadge status={row.quality_engineer_status} />
      }
    },
    {
      id: "actions",
      header: "Action",
      cell: (row) => (
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleViewDcr(row)}
            title="View"
            className="h-8 px-2"
          >
            <Eye className="h-3.5 w-3.5 mr-1" /> View
          </Button>
          {(row.status === "pending" || row.status === "rejected") && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleEditDcr(row)}
              title="Edit"
              className="h-8 px-2"
            >
              <Edit className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          )}
          {(roles?.includes("QC_ENGINEER") && row.quality_engineer_id === user?.id &&
            row.design_engineer_status === "approved" && row.quality_engineer_status === "pending") && (
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleReviewClick(row, "approved")}
                  title="Approve"
                  className="h-8 px-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleReviewClick(row, "rejected")}
                  title="Reject"
                  className="h-8 px-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                </Button>
              </div>
            )}
          {(roles?.includes("DESIGN_ENGINEER") && row.design_engineer_id === user?.id &&
            row.design_engineer_status === "pending") && (
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleReviewClick(row, "approved")}
                  title="Approve"
                  className="h-8 px-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleReviewClick(row, "rejected")}
                  title="Reject"
                  className="h-8 px-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                </Button>
              </div>
            )}
          {row.status === "approved" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDownloadPdf(row.id, row.dcr_no)}
              title="Download PDF"
              className="h-8 px-2 border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <Download className="h-3.5 w-3.5 mr-1" /> PDF
            </Button>
          )}
        </div>
      )
    }
  ], [activeClientOptions, activePoOptions, activeMsnOptions, user, roles])

  const fetchDcrList = useCallback(async (params) => {
    try {
      const queryParams = { ...params };
      if (queryParams.columnFilters) {
        queryParams.columnFilters = JSON.stringify(queryParams.columnFilters);
      }
      const payload = await apiClient.get('/api/dcr/get-dcr', queryParams)

      const records = extractRecords(payload).map((item, index) =>
        normalizeRecord(item, index)
      )

      return {
        data: records,
        meta: {
          total: Number(payload?.meta?.total) || records.length || 0,
          page: Number(payload?.meta?.page) || 1,
          limit: Number(payload?.meta?.limit) || 10,
          totalPages: Number(payload?.meta?.totalPages) || 1
        }
      }
    } catch (err) {
      console.error("Unable to load DCR list", err)
      return { data: [], meta: {} }
    }
  }, [])

  const fetchJobs = useCallback(async () => {
    setIsLoadingJobs(true)

    try {
      const payload = await apiClient.get('/api/dcr/get-jobs')

      const jobList = extractJobs(payload)
        .map(normalizeJob)
        .filter((job) => job.id)

      setJobs(jobList)
    } catch (err) {
      setFormError(err?.message || "Unable to load job numbers")
      setJobs([])
    } finally {
      setIsLoadingJobs(false)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true)

    try {
      const [designRes, qualityRes] = await Promise.all([
        apiClient.get('/api/users/by-role/DESIGN_ENGINEER'),
        apiClient.get('/api/users/by-role/QC_ENGINEER'),
      ])

      const designList = Array.isArray(designRes?.data)
        ? designRes.data.map(normalizeUser).filter((u) => u.id)
        : []

      const qualityList = Array.isArray(qualityRes?.data)
        ? qualityRes.data.map(normalizeUser).filter((u) => u.id)
        : []

      setDesignEngineers(designList)
      setQualityEngineers(qualityList)
    } catch (err) {
      setFormError(err?.message || "Unable to load users")
      setDesignEngineers([])
      setQualityEngineers([])
    } finally {
      setIsLoadingUsers(false)
    }
  }, [])

  const handleViewDcr = (row) => {
    const safePath = row.dcr_no ? encodeURIComponent(String(row.dcr_no).replace(/\//g, "-")) : row.id
    navigate(`/dcr/view/${safePath}`, { state: { record: row } })
  }

  const handleEditDcr = (row) => {
    const safePath = row.dcr_no ? encodeURIComponent(String(row.dcr_no).replace(/\//g, "-")) : row.id
    navigate(`/dcr/edit/${safePath}`, { state: { record: row } })
  }

  const handleViewDcrInternal = useCallback(async (id) => {
    setIsLoadingDetail(true)
    try {
      const payload = await apiClient.get(`/api/dcr/get-dcr-by-id/${id}`)
      const dataItem = Array.isArray(payload?.data) ? payload.data[0] : payload?.data
      const detail = normalizeDetail(dataItem || {})
      setFormData(detail.formData)
      setTableRows(detail.tableRows)
      setViewDetails({
        jobNumber: detail.jobNumber,
        designEngineerName: detail.designEngineerName,
        qualityEngineerName: detail.qualityEngineerName,
        status: detail.status,
        designStatus: detail.designStatus,
        qualityStatus: detail.qualityStatus,
      })
      setSelectedDcrId(id)
    } catch (err) {
      toast.error(err?.message || "Unable to load DCR details")
    } finally {
      setIsLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    const initializeForm = async () => {
      if ((view !== "view" && view !== "edit") || !routeId) return

      if (location.state?.record?.id) {
        handleViewDcrInternal(location.state.record.id)
        return
      }

      // Search-based fallback
      try {
        const dcrNoFromUrl = decodeURIComponent(routeId).replace(/-/g, "/")
        const response = await apiClient.get("/api/dcr/get-dcr", {
          page: 1,
          limit: 50,
          search: dcrNoFromUrl
        })

        const records = extractRecords(response)
        const matched = records.find(r => r.dcr_no === dcrNoFromUrl || r.id === routeId)

        if (matched && matched.id) {
          handleViewDcrInternal(matched.id)
        } else {
          toast.error(`DCR not found: ${dcrNoFromUrl}`)
        }
      } catch (err) {
        toast.error("Unable to locate DCR from URL")
      }
    }

    initializeForm()
  }, [view, routeId, location.state, handleViewDcrInternal])

  useEffect(() => {
    if (view === "create" || view === "edit") {
      setFormError("")
      setFormSuccess("")
      fetchJobs()
      fetchUsers()
    }
  }, [view, fetchJobs, fetchUsers])

  // Fetch drawings when job changes (including on edit hydration)
  useEffect(() => {
    if (formData.msmNumber && (view === "create" || view === "edit")) {
      const fetchDrawings = async () => {
        setIsLoadingDocs(true)
        try {
          const payload = await apiClient.get(`/api/dcr/get-assigned-drawings/${formData.msmNumber}`)
          if (payload.success) {
            setAssignedDocs(payload.data || [])
          }
        } catch (err) {
          console.error("Error fetching drawings:", err)
        } finally {
          setIsLoadingDocs(false)
        }
      }
      fetchDrawings()
    }
  }, [formData.msmNumber, view])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    if (formError) {
      setFormError("")
    }
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    if (formError) {
      setFormError("")
    }
  }

  const handleJobChange = async (jobId) => {
    const selectedJob = jobs.find((job) => job.id === jobId)

    setFormData((prev) => ({
      ...prev,
      msmNumber: jobId,
      dcrNo: selectedJob?.next_dcr_no || "",
      equipmentNo: selectedJob?.equipement_name || "",
      drawingNo: "",
    }))

    if (formError) {
      setFormError("")
    }

    if (!jobId) {
      setAssignedDocs([])
    }
  }

  const handleTableRowChange = (id, field, value) => {
    setTableRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    )

    if (formError) {
      setFormError("")
    }
  }

  const addTableRow = () => {
    const nextId = Math.max(...tableRows.map((row) => row.id), 0) + 1
    setTableRows((prev) => [...prev, createEmptyRow(nextId)])
  }

  const removeTableRow = (id) => {
    if (tableRows.length > 1) {
      setTableRows((prev) => prev.filter((row) => row.id !== id))
    }
  }

  const handleBack = () => {
    navigate("/dcr/list")
  }

  const handleCreate = () => {
    navigate("/dcr/create")
  }

  const handleReset = () => {
    setFormData(defaultFormData)
    setTableRows([createEmptyRow(1)])
    setFormError("")
    setFormSuccess("")
    setViewDetails({
      jobNumber: "-",
      designEngineerName: "-",
      qualityEngineerName: "-",
      status: "pending",
      designStatus: "pending",
      qualityStatus: "pending",
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFormError("")
    setFormSuccess("")

    try {
      if (!formData.msmNumber) {
        throw new Error("Please select MSM Number (Job No)")
      }

      if (!formData.drawingNo) {
        throw new Error("Please select Drawing No")
      }

      if (!formData.equipmentNo) {
        throw new Error("Please enter Equipment No")
      }

      if (!formData.inspBy) {
        throw new Error("Please enter Inspection By")
      }

      if (!formData.designEngineerId || !formData.qualityEngineerId) {
        throw new Error("Please select both design and quality engineers")
      }

      const preparedRows = tableRows
        .map((row) => ({
          itemPartNo: String(row.itemPartNo || "").trim(),
          changeFrom: String(row.changeFrom || "").trim(),
          changeTo: String(row.changeTo || "").trim(),
          reasonForChange: String(row.reasonForChange || "").trim(),
        }))
        .filter(
          (row) =>
            row.itemPartNo || row.changeFrom || row.changeTo || row.reasonForChange
        )

      if (preparedRows.length === 0) {
        throw new Error("Add at least one change request row")
      }

      const invalidRow = preparedRows.find(
        (row) =>
          !row.itemPartNo || !row.changeFrom || !row.changeTo || !row.reasonForChange
      )

      if (invalidRow) {
        throw new Error("Each change request row must have all fields filled")
      }

      const requestBody = {
        job_id: formData.msmNumber,
        dcr_no: formData.dcrNo,
        drg_no: formData.drawingNo,
        equ_no: formData.equipmentNo,
        inspect_by: formData.inspBy,
        design_engineer_id: formData.designEngineerId,
        quality_engineer_id: formData.qualityEngineerId,
        status: "pending",
        design_engineer_status: "pending",
        quality_engineer_status: "pending",
        change_requests: preparedRows.map((row) => ({
          item_part_no: row.itemPartNo,
          chnage_from: row.changeFrom,
          chnage_to: row.changeTo,
          reason: row.reasonForChange,
        })),
      }

      if (view === "edit" && selectedDcrId) {
        const payload = await apiClient.put(`/api/dcr/update-dcr/${selectedDcrId}`, requestBody)
        setFormSuccess(payload?.message || "DCR updated successfully")
      } else {
        const payload = await apiClient.post('/api/dcr/create-dcr', requestBody)
        setFormSuccess(payload?.message || "DCR created successfully")
      }

      handleReset()
      navigate("/dcr/list")
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      setFormError(err?.message || "Unable to create DCR")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isViewMode = view === "view"
  const isCreateMode = view === "create"
  const isEditMode = view === "edit"
  const isFormDisabled = isSubmitting || isViewMode

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
      </header>

      <main className="flex-1 overflow-auto p-6 flex flex-col">
        <div className="flex-1 flex flex-col w-full">
          {view !== "list" && (
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {isCreateMode ? "Create DCR" : isEditMode ? "Edit DCR" : "DCR Details"}
                </h1>
                <p className="text-muted-foreground">
                  {isCreateMode ? "Generate a new Design Change Request" : isEditMode ? "Modify existing Design Change Request" : "Viewing Design Change Request details"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="h-9"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to List
                </Button>
              </div>
            </div>
          )}

          {view === "list" ? (
            <ProDataTable
              columns={columns}
              fetchData={fetchDcrList}
              title="DCR Register"
              onAdd={handleCreate}
              onExport={handleExport}
              refreshKey={refreshKey}
              columnFilters={columnFilters}
              onFilterChange={(newFilters) => setColumnFilters(prev => ({ ...prev, ...newFilters }))}
            />
          ) : (
            <form onSubmit={(isCreateMode || isEditMode) ? handleSubmit : (e) => e.preventDefault()}>
              <div className="grid gap-6">
                {formError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {formError}
                  </div>
                )}

                {formSuccess && (
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
                    {formSuccess}
                  </div>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>Enter the basic DCR details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="msmNumber">
                          MSM Number <span className="text-destructive">*</span>
                        </Label>
                        {isViewMode ? (
                          <Input
                            id="msmNumber"
                            type="text"
                            value={viewDetails.jobNumber}
                            readOnly
                            disabled
                          />
                        ) : (
                          <Select
                            value={formData.msmNumber}
                            onValueChange={handleJobChange}
                            disabled={isSubmitting || isLoadingJobs}
                          >
                            <SelectTrigger id="msmNumber" className="w-full">
                              <SelectValue
                                placeholder={
                                  isLoadingJobs ? "Loading job numbers..." : "Select job no"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {jobs.map((job) => (
                                <SelectItem key={job.id} value={job.id}>
                                  <div className="flex flex-col text-left">
                                    <span className="font-medium">{job.job_number}</span>
                                    <span className="text-xs text-muted-foreground">
                                      Next DCR: {job.next_dcr_no || "-"}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dcrNo">
                          DCR NO. <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="dcrNo"
                          name="dcrNo"
                          type="text"
                          placeholder="Auto-filled from selected job"
                          value={formData.dcrNo}
                          onChange={handleInputChange}
                          required
                          readOnly
                          disabled={isFormDisabled}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="drawingNo">
                          DRAWING NO. <span className="text-destructive">*</span>
                        </Label>
                        {isViewMode ? (
                          <Input
                            id="drawingNo"
                            type="text"
                            value={formData.drawingNo}
                            readOnly
                            disabled
                          />
                        ) : (
                          <Select
                            value={formData.drawingNo}
                            onValueChange={(value) => handleSelectChange("drawingNo", value)}
                            disabled={isSubmitting || isLoadingDocs || !formData.msmNumber}
                          >
                            <SelectTrigger id="drawingNo" className="w-full">
                              <SelectValue
                                placeholder={
                                  !formData.msmNumber
                                    ? "Select job no first"
                                    : isLoadingDocs
                                      ? "Loading drawings..."
                                      : "Select drawing no"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {assignedDocs.length === 0 && !isLoadingDocs ? (
                                <div className="p-2 text-sm text-muted-foreground text-center">
                                  No drawings assigned to this job
                                </div>
                              ) : (
                                assignedDocs.map((doc) => (
                                  <SelectItem key={doc.id} value={doc.shreno_doc_no}>
                                    <div className="flex flex-col text-left">
                                      <span className="font-medium">{doc.shreno_doc_no}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {doc.document_name}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="equipmentNo">
                          EQUIPMENT NO. <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="equipmentNo"
                          name="equipmentNo"
                          type="text"
                          placeholder="Enter equipment number"
                          value={formData.equipmentNo}
                          onChange={handleInputChange}
                          required
                          disabled={isFormDisabled}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="inspBy">
                          INSP. BY <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="inspBy"
                          name="inspBy"
                          type="text"
                          placeholder="Enter inspector name"
                          value={formData.inspBy}
                          onChange={handleInputChange}
                          required
                          disabled={isFormDisabled}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Change Details</CardTitle>
                        <CardDescription>Add items and specify the changes</CardDescription>
                      </div>
                      {!isViewMode && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addTableRow}
                          disabled={isSubmitting}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Row
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">S.No</TableHead>
                            <TableHead>ITEM / PART NO.</TableHead>
                            <TableHead>CHANGE FROM</TableHead>
                            <TableHead>CHANGE TO</TableHead>
                            <TableHead>REASON FOR CHANGE</TableHead>
                            <TableHead className="w-[100px]">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tableRows.map((row, index) => (
                            <TableRow key={row.id}>
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell>
                                <Input
                                  type="text"
                                  placeholder="Enter item/part no."
                                  value={row.itemPartNo}
                                  onChange={(e) =>
                                    handleTableRowChange(row.id, "itemPartNo", e.target.value)
                                  }
                                  disabled={isFormDisabled}
                                  className="min-w-[150px]"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="text"
                                  placeholder="Enter change from"
                                  value={row.changeFrom}
                                  onChange={(e) =>
                                    handleTableRowChange(row.id, "changeFrom", e.target.value)
                                  }
                                  disabled={isFormDisabled}
                                  className="min-w-[150px]"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="text"
                                  placeholder="Enter change to"
                                  value={row.changeTo}
                                  onChange={(e) =>
                                    handleTableRowChange(row.id, "changeTo", e.target.value)
                                  }
                                  disabled={isFormDisabled}
                                  className="min-w-[150px]"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="text"
                                  placeholder="Enter reason"
                                  value={row.reasonForChange}
                                  onChange={(e) =>
                                    handleTableRowChange(row.id, "reasonForChange", e.target.value)
                                  }
                                  disabled={isFormDisabled}
                                  className="min-w-[200px]"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeTableRow(row.id)}
                                  disabled={isFormDisabled || tableRows.length === 1}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Approval</CardTitle>
                    <CardDescription>Assign quality and design personnel</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


                      <div className="space-y-2">
                        <Label htmlFor="designEngineerId">
                          DESIGN <span className="text-destructive">*</span>
                        </Label>
                        {isViewMode ? (
                          <Input
                            id="designEngineerId"
                            type="text"
                            value={viewDetails.designEngineerName}
                            readOnly
                            disabled
                          />
                        ) : (
                          <Select
                            value={formData.designEngineerId}
                            onValueChange={(value) => handleSelectChange("designEngineerId", value)}
                            disabled={isSubmitting || isLoadingUsers}
                          >
                            <SelectTrigger id="designEngineerId" className="w-full">
                              <SelectValue
                                placeholder={
                                  isLoadingUsers ? "Loading users..." : "Select design engineer"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {designEngineers.map((user) => (
                                <SelectItem key={`design-${user.id}`} value={user.id}>
                                  {user.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="qualityEngineerId">
                          QUALITY <span className="text-destructive">*</span>
                        </Label>
                        {isViewMode ? (
                          <Input
                            id="qualityEngineerId"
                            type="text"
                            value={viewDetails.qualityEngineerName}
                            readOnly
                            disabled
                          />
                        ) : (
                          <Select
                            value={formData.qualityEngineerId}
                            onValueChange={(value) => handleSelectChange("qualityEngineerId", value)}
                            disabled={isSubmitting || isLoadingUsers}
                          >
                            <SelectTrigger id="qualityEngineerId" className="w-full">
                              <SelectValue
                                placeholder={
                                  isLoadingUsers ? "Loading users..." : "Select quality engineer"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {qualityEngineers.map((user) => (
                                <SelectItem key={`quality-${user.id}`} value={user.id}>
                                  {user.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {(isCreateMode || isEditMode) && (
                  <div className="flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReset}
                      disabled={isSubmitting}
                    >
                      Reset
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update DCR" : "Create DCR")}
                    </Button>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">{reviewStatus} DCR</DialogTitle>
            <DialogDescription>
              {docForReview && `Are you sure you want to ${reviewStatus.toLowerCase()} DCR ${docForReview.dcr_no}?`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="remarks">
                Remarks {reviewStatus === "rejected" && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="remarks"
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder="Enter remarks..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitReview}
              disabled={isReviewing || (reviewStatus === "rejected" && !reviewRemarks.trim())}
              variant={reviewStatus === "rejected" ? "destructive" : "default"}
            >
              {isReviewing ? "Submitting..." : `Confirm ${reviewStatus}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CreateDCR
