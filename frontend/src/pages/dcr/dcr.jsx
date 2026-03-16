import { useCallback, useEffect, useState } from "react"
import { AdminSidebar } from "@/components"
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

import { ArrowLeft, Plus, X, CheckCircle, XCircle, Eye, Edit, Download } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
      msmNumber: String(item?.job_number || ""),
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
  const [view, setView] = useState("list")

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
  const [dcrList, setDcrList] = useState([])
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [listError, setListError] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [listPagination, setListPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  })

  const [jobs, setJobs] = useState([])
  const [users, setUsers] = useState([])
  const [isLoadingJobs, setIsLoadingJobs] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)

  const [formData, setFormData] = useState(defaultFormData)
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

  const fetchDcrList = useCallback(async () => {
    setIsLoadingList(true)
    setListError("")

    try {
      const params = {
        page: listPagination.page,
        limit: listPagination.limit,
      }

      const payload = await apiClient.get('/api/dcr/get-dcr', params)

      const records = extractRecords(payload).map((item, index) =>
        normalizeRecord(item, index)
      )

      setDcrList(records)
      setListPagination((prev) => ({
        ...prev,
        page: Number(payload?.meta?.page) || prev.page,
        limit: Number(payload?.meta?.limit) || prev.limit,
        total: Number(payload?.meta?.total) || records.length || 0,
        totalPages: Number(payload?.meta?.totalPages) || 1,
      }))
    } catch (err) {
      setListError(err?.message || "Unable to load DCR list")
      setDcrList([])
      setListPagination((prev) => ({
        ...prev,
        total: 0,
        totalPages: 1,
      }))
    } finally {
      setIsLoadingList(false)
    }
  }, [listPagination.page, listPagination.limit])

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
      const params = {
        page: "1",
        limit: "1000",
      }

      const payload = await apiClient.get('/api/users/get-users', params)

      const userList = Array.isArray(payload?.data)
        ? payload.data.map(normalizeUser).filter((user) => user.id)
        : []

      setUsers(userList)
    } catch (err) {
      setFormError(err?.message || "Unable to load users")
      setUsers([])
    } finally {
      setIsLoadingUsers(false)
    }
  }, [])

  const handleViewDcr = async (id) => {
    setIsLoadingDetail(true)
    setListError("")
    setFormError("")

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
      setView("view")
    } catch (err) {
      setListError(err?.message || "Unable to load DCR details")
    } finally {
      setIsLoadingDetail(false)
    }
  }

  useEffect(() => {
    if (view === "list") {
      fetchDcrList()
    }
  }, [view, refreshKey, fetchDcrList])

  useEffect(() => {
    if (view === "create") {
      setFormError("")
      setFormSuccess("")
      fetchJobs()
      fetchUsers()
    }
  }, [view, fetchJobs, fetchUsers])

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

  const handleJobChange = (jobId) => {
    const selectedJob = jobs.find((job) => job.id === jobId)

    setFormData((prev) => ({
      ...prev,
      msmNumber: jobId,
      dcrNo: selectedJob?.next_dcr_no || "",
      equipmentNo: selectedJob?.equipement_name || "",
      drawingNo: selectedJob?.code || "",
    }))

    if (formError) {
      setFormError("")
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

  const handleListPageChange = (page) => {
    const safePage = Math.min(Math.max(page, 1), Math.max(listPagination.totalPages, 1))
    setListPagination((prev) => ({
      ...prev,
      page: safePage,
    }))
  }

  const handleListLimitChange = (value) => {
    const nextLimit = Number(value)
    if (!Number.isFinite(nextLimit) || nextLimit <= 0) {
      return
    }
    setListPagination((prev) => ({
      ...prev,
      page: 1,
      limit: nextLimit,
    }))
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

      const payload = await apiClient.post('/api/dcr/create-dcr', requestBody)

      setFormSuccess(payload?.message || "DCR created successfully")
      handleReset()
      setView("list")
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      setFormError(err?.message || "Unable to create DCR")
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedJob = jobs.find((job) => job.id === formData.msmNumber)
  const isViewMode = view === "view"
  const isCreateMode = view === "create"
  const isFormDisabled = isSubmitting || isViewMode

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>

        <main className="flex-1 overflow-auto p-6 flex flex-col">
          <div className="flex-1 flex flex-col w-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {view === "list" ? "DCR List" : view === "create" ? "Create DCR" : "View DCR"}
                </h1>
                <p className="text-muted-foreground">
                  {view === "list"
                    ? "All DCR records fetched from /api/dcr/get-dcr"
                    : view === "create"
                      ? "Fill in the DCR (Design Change Request) information below."
                      : "DCR details fetched from /api/dcr/get-dcr-by-id/:id"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {view === "list" ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={fetchDcrList}
                      disabled={isLoadingList || isLoadingDetail}
                    >
                      {isLoadingList ? "Refreshing..." : "Refresh"}
                    </Button>
                    <Button onClick={() => setView("create")}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create DCR
                    </Button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setView("list")}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to List
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {view === "list" ? (
              <Card>
                <CardHeader>
                  <CardTitle>DCR Records</CardTitle>
                </CardHeader>
                <CardContent>
                  {listError ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {listError}
                    </div>
                  ) : (
                    <>
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>DCR No</TableHead>
                              <TableHead>DRG No</TableHead>
                              <TableHead>Inspect By</TableHead>
                              <TableHead>Main Status</TableHead>
                              <TableHead>Design Status</TableHead>
                              <TableHead>Quality Status</TableHead>
                              <TableHead className="w-[120px]">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoadingList ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center h-24">
                                  Loading DCR data...
                                </TableCell>
                              </TableRow>
                            ) : dcrList.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center h-24">
                                  No DCR records found.
                                </TableCell>
                              </TableRow>
                            ) : (
                              dcrList.map((record) => (
                                <TableRow key={record.id}>
                                  <TableCell className="font-medium">{record.dcr_no}</TableCell>
                                  <TableCell>{record.drg_no}</TableCell>
                                  <TableCell>{record.inspect_by}</TableCell>
                                  <TableCell>
                                    <StatusBadge status={record.status} />
                                  </TableCell>
                                  <TableCell>
                                    <StatusBadge status={record.design_engineer_status} />
                                  </TableCell>
                                  <TableCell>
                                    {record.quality_engineer_status === "pending" ? (
                                      record.design_engineer_status === "rejected" ? (
                                        <StatusBadge status="design_rejected" />
                                      ) : record.design_engineer_status !== "approved" ? (
                                        <StatusBadge status="waiting" />
                                      ) : (
                                        <StatusBadge status="pending" />
                                      )
                                    ) : (
                                      <StatusBadge status={record.quality_engineer_status} />
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewDcr(record.id)}
                                        disabled={isLoadingDetail}
                                        title="View"
                                      >
                                        <Eye className="h-4 w-4" />View
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className={`${normalizeStatus(record.design_engineer_status) === "approved" && normalizeStatus(record.quality_engineer_status) === "approved"
                                          ? "text-blue-600 border-blue-200 hover:bg-blue-50"
                                          : "opacity-50 cursor-not-allowed text-gray-400 border-gray-200"
                                          }`}
                                        onClick={() => {
                                          if (normalizeStatus(record.design_engineer_status) === "approved" && normalizeStatus(record.quality_engineer_status) === "approved") {
                                            handleDownloadPdf(record.id, record.dcr_no)
                                          } else {
                                            toast.info("DCR can only be downloaded after approval from both Design and Quality.")
                                          }
                                        }}
                                        title="Download PDF"
                                      >
                                        <Download className="h-4 w-4 mr-2" /> Download
                                      </Button>

                                      {/* Design Engineer Actions */}
                                      {roles?.includes("DESIGN_ENGINEER") &&
                                        record.design_engineer_id === user?.id && (
                                          <>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="bg-green-50 text-green-600 hover:bg-green-100 border-green-200"
                                              onClick={() => handleReviewClick(record, "approved")}
                                              disabled={record.design_engineer_status !== "pending" || isLoadingDetail}
                                              title="Approve"
                                            >
                                              <CheckCircle className="h-4 w-4" /> Approve
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                                              onClick={() => handleReviewClick(record, "rejected")}
                                              disabled={record.design_engineer_status !== "pending" || isLoadingDetail}
                                              title="Reject"
                                            >
                                              <XCircle className="h-4 w-4" /> Reject
                                            </Button>
                                          </>
                                        )}

                                      {/* Quality Engineer Actions */}
                                      {roles?.includes("QC_ENGINEER") &&
                                        record.quality_engineer_id === user?.id && (
                                          <>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="bg-green-50 text-green-600 hover:bg-green-100 border-green-200"
                                              onClick={() => handleReviewClick(record, "approved")}
                                              disabled={
                                                record.design_engineer_status !== "approved" ||
                                                record.quality_engineer_status !== "pending" ||
                                                isLoadingDetail
                                              }
                                              title="Approve"
                                            >
                                              <CheckCircle className="h-4 w-4" /> Approve
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                                              onClick={() => handleReviewClick(record, "rejected")}
                                              disabled={
                                                record.design_engineer_status !== "approved" ||
                                                record.quality_engineer_status !== "pending" ||
                                                isLoadingDetail
                                              }
                                              title="Reject"
                                            >
                                              <XCircle className="h-4 w-4" /> Reject
                                            </Button>
                                          </>
                                        )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="flex items-center justify-between gap-4 py-4">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">Rows per page</p>
                          <Select
                            value={String(listPagination.limit)}
                            onValueChange={handleListLimitChange}
                            disabled={isLoadingList}
                          >
                            <SelectTrigger className="h-8 w-[80px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent side="top">
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="20">20</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                              <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-3">
                          <p className="text-sm text-muted-foreground">
                            Page {listPagination.page} of {listPagination.totalPages} ({listPagination.total} items)
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleListPageChange(listPagination.page - 1)}
                            disabled={isLoadingList || listPagination.page <= 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleListPageChange(listPagination.page + 1)}
                            disabled={isLoadingList || listPagination.page >= listPagination.totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <form onSubmit={isCreateMode ? handleSubmit : (e) => e.preventDefault()}>
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
                          <Input
                            id="drawingNo"
                            name="drawingNo"
                            type="text"
                            placeholder="Enter drawing number"
                            value={formData.drawingNo}
                            onChange={handleInputChange}
                            required
                            disabled={isFormDisabled}
                          />
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
                                {users.map((user) => (
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
                                {users.map((user) => (
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

                  {isCreateMode && (
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
                        {isSubmitting ? "Creating..." : "Create DCR"}
                      </Button>
                    </div>
                  )}
                </div>
              </form>
            )}
          </div>
        </main>
      </SidebarInset>

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
    </SidebarProvider>
  )
}

export default CreateDCR
