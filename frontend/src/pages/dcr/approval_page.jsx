import { useCallback, useEffect, useState } from "react"
import { AdminSidebar } from "@/components"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ArrowLeft, Check, X } from "lucide-react"

const normalizeStatus = (value) =>
  String(value || "pending")
    .trim()
    .toLowerCase()

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

const extractRecords = (payload) => {
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload)) return payload
  return []
}

const normalizeListRecord = (item, index) => {
  const statuses = getStatusFromPayload(item)

  return {
    id: item?.id || `${item?.dcr_no || "dcr"}-${index}`,
    dcr_no: item?.dcr_no || "-",
    drg_no: item?.drg_no || item?.design_number || "-",
    inspect_by: item?.inspect_by || "-",
    status: statuses.status,
    design_engineer_status: statuses.designStatus,
    quality_engineer_status: statuses.qualityStatus,
  }
}

const normalizeDetail = (item = {}) => {
  const statuses = getStatusFromPayload(item)
  const changeList = Array.isArray(item?.change_request) ? item.change_request : []

  return {
    id: item?.id || "",
    dcrNo: String(item?.dcr_no || "-"),
    drawingNo: String(item?.drg_no || "-"),
    equipmentNo: String(item?.equ_no || "-"),
    inspectBy: String(item?.inspect_by || "-"),
    jobNumber: String(item?.job_number || "-"),
    designEngineerName: String(item?.design_engineer?.name || "-"),
    qualityEngineerName: String(item?.quality_engineer?.name || "-"),
    status: statuses.status,
    designStatus: statuses.designStatus,
    qualityStatus: statuses.qualityStatus,
    rows:
      changeList.length > 0
        ? changeList.map((row, rowIndex) => ({
            id: row?.id || `row-${rowIndex + 1}`,
            itemPartNo: String(row?.item_part_no || "-"),
            changeFrom: String(row?.chnage_from || "-"),
            changeTo: String(row?.chnage_to || "-"),
            reason: String(row?.reason || "-"),
          }))
        : [
            {
              id: "row-1",
              itemPartNo: "-",
              changeFrom: "-",
              changeTo: "-",
              reason: "-",
            },
          ],
  }
}

function DcrApprovalPage({
  title,
  listApi,
  updateApi,
  statusField,
  remarksField,
}) {
  const [view, setView] = useState("list")
  const [records, setRecords] = useState([])
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false)
  const [listError, setListError] = useState("")
  const [formError, setFormError] = useState("")
  const [formSuccess, setFormSuccess] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  })

  const [detail, setDetail] = useState(null)
  const [decisionStatus, setDecisionStatus] = useState("")
  const [decisionRemarks, setDecisionRemarks] = useState("")

  const fetchList = useCallback(async () => {
    setIsLoadingList(true)
    setListError("")

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      })

      const res = await fetch(`${backendUrl}${listApi}?${params.toString()}`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      const payload = await res.json()
      if (!res.ok || payload?.success === false) {
        throw new Error(payload?.message || "Failed to fetch DCR approvals")
      }

      const list = extractRecords(payload).map((item, index) =>
        normalizeListRecord(item, index)
      )
      setRecords(list)
      setPagination((prev) => ({
        ...prev,
        page: Number(payload?.meta?.page) || prev.page,
        limit: Number(payload?.meta?.limit) || prev.limit,
        total: Number(payload?.meta?.total) || list.length || 0,
        totalPages: Number(payload?.meta?.totalPages) || 1,
      }))
    } catch (err) {
      setListError(err?.message || "Unable to load DCR approvals")
      setRecords([])
      setPagination((prev) => ({
        ...prev,
        total: 0,
        totalPages: 1,
      }))
    } finally {
      setIsLoadingList(false)
    }
  }, [listApi, pagination.page, pagination.limit])

  useEffect(() => {
    if (view === "list") {
      fetchList()
    }
  }, [view, refreshKey, fetchList])

  const handlePageChange = (page) => {
    const safePage = Math.min(Math.max(page, 1), Math.max(pagination.totalPages, 1))
    setPagination((prev) => ({
      ...prev,
      page: safePage,
    }))
  }

  const handleLimitChange = (value) => {
    const nextLimit = Number(value)
    if (!Number.isFinite(nextLimit) || nextLimit <= 0) return
    setPagination((prev) => ({
      ...prev,
      page: 1,
      limit: nextLimit,
    }))
  }

  const handleOpenDecision = async (id) => {
    setIsLoadingDetail(true)
    setListError("")
    setFormError("")
    setFormSuccess("")

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
      const res = await fetch(`${backendUrl}/api/dcr/approval/get-dcr-by-id/${id}`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      })

      const payload = await res.json()
      if (!res.ok || payload?.success === false) {
        throw new Error(payload?.message || "Failed to fetch DCR details")
      }

      const dataItem = Array.isArray(payload?.data) ? payload.data[0] : payload?.data
      const normalized = normalizeDetail(dataItem)
      setDetail(normalized)
      setDecisionStatus("")
      setDecisionRemarks("")
      setView("decision")
    } catch (err) {
      setListError(err?.message || "Unable to load DCR details")
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const handleSubmitDecision = async (e) => {
    e.preventDefault()
    setFormError("")
    setFormSuccess("")
    setIsSubmittingDecision(true)

    try {
      if (!detail?.id) {
        throw new Error("DCR id not found")
      }
      if (!decisionStatus) {
        throw new Error("Please choose Approved or Reject")
      }
      if (!decisionRemarks.trim()) {
        throw new Error("Please enter remarks")
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
      const requestBody = {
        dcr_id: detail.id,
        [statusField]: decisionStatus,
        [remarksField]: decisionRemarks.trim(),
      }

      const res = await fetch(`${backendUrl}${updateApi}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(requestBody),
      })

      const payload = await res.json()
      if (!res.ok || payload?.success === false) {
        throw new Error(payload?.message || "Failed to submit decision")
      }

      setFormSuccess(payload?.message || "Decision submitted successfully")
      setView("list")
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      setFormError(err?.message || "Unable to submit decision")
    } finally {
      setIsSubmittingDecision(false)
    }
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto w-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{title}</h1>
                <p className="text-muted-foreground">
                  {view === "list"
                    ? "Review assigned DCR records."
                    : "Review details and submit your decision."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {view === "list" ? (
                  <Button
                    variant="outline"
                    onClick={fetchList}
                    disabled={isLoadingList || isLoadingDetail}
                  >
                    {isLoadingList ? "Refreshing..." : "Refresh"}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setView("list")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to List
                  </Button>
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
                              <TableHead className="w-[170px]">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoadingList ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center h-24">
                                  Loading DCR data...
                                </TableCell>
                              </TableRow>
                            ) : records.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center h-24">
                                  No DCR records found.
                                </TableCell>
                              </TableRow>
                            ) : (
                              records.map((record) => (
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
                                    <StatusBadge status={record.quality_engineer_status} />
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenDecision(record.id)}
                                      disabled={isLoadingDetail}
                                    >
                                      Submit Decision
                                    </Button>
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
                            value={String(pagination.limit)}
                            onValueChange={handleLimitChange}
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
                            Page {pagination.page} of {pagination.totalPages} ({pagination.total} items)
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={isLoadingList || pagination.page <= 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={isLoadingList || pagination.page >= pagination.totalPages}
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
              <form onSubmit={handleSubmitDecision}>
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
                      <CardDescription>DCR basic details</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="jobNo">MSM Number</Label>
                          <Input id="jobNo" value={detail?.jobNumber || "-"} readOnly disabled />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dcrNo">DCR NO.</Label>
                          <Input id="dcrNo" value={detail?.dcrNo || "-"} readOnly disabled />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="drawingNo">DRAWING NO.</Label>
                          <Input id="drawingNo" value={detail?.drawingNo || "-"} readOnly disabled />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="equipmentNo">EQUIPMENT NO.</Label>
                          <Input id="equipmentNo" value={detail?.equipmentNo || "-"} readOnly disabled />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="inspBy">INSP. BY</Label>
                          <Input id="inspBy" value={detail?.inspectBy || "-"} readOnly disabled />
                        </div>
                        <div className="space-y-2">
                          <Label>Current Status</Label>
                          <div className="h-10 flex items-center">
                            <StatusBadge status={detail?.status || "pending"} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Change Details</CardTitle>
                      <CardDescription>Submitted change requests</CardDescription>
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
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(detail?.rows || []).map((row, index) => (
                              <TableRow key={row.id}>
                                <TableCell className="font-medium">{index + 1}</TableCell>
                                <TableCell>{row.itemPartNo}</TableCell>
                                <TableCell>{row.changeFrom}</TableCell>
                                <TableCell>{row.changeTo}</TableCell>
                                <TableCell>{row.reason}</TableCell>
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
                      <CardDescription>Assigned personnel and statuses</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="qualityName">QUALITY</Label>
                          <Input id="qualityName" value={detail?.qualityEngineerName || "-"} readOnly disabled />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="designName">DESIGN</Label>
                          <Input id="designName" value={detail?.designEngineerName || "-"} readOnly disabled />
                        </div>
                        <div className="space-y-2">
                          <Label>Design Status</Label>
                          <div className="h-10 flex items-center">
                            <StatusBadge status={detail?.designStatus || "pending"} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Quality Status</Label>
                          <div className="h-10 flex items-center">
                            <StatusBadge status={detail?.qualityStatus || "pending"} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Submit Decision</CardTitle>
                      <CardDescription>Choose decision, add remarks, then submit.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant={decisionStatus === "approved" ? "default" : "outline"}
                          onClick={() => setDecisionStatus("approved")}
                          disabled={isSubmittingDecision}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          type="button"
                          variant={decisionStatus === "rejected" ? "destructive" : "outline"}
                          onClick={() => setDecisionStatus("rejected")}
                          disabled={isSubmittingDecision}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="remarks">Remarks</Label>
                        <Textarea
                          id="remarks"
                          placeholder="Write remarks"
                          value={decisionRemarks}
                          onChange={(e) => setDecisionRemarks(e.target.value)}
                          disabled={isSubmittingDecision}
                          required
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmittingDecision}>
                          {isSubmittingDecision ? "Submitting..." : "Submit"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </form>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default DcrApprovalPage
