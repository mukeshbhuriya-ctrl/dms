import { useState, useEffect, useMemo, useCallback } from "react"
import { AdminSidebar } from "@/components"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { toast } from 'react-toastify';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, ArrowRight, Plus, ArrowLeft, Edit, Copy, History } from "lucide-react"
import { DataTable } from "@/components/shared/DataTable"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"
import DocumentTrail from "../../components/dms/DocumentTrail"

function AssignDocument() {
  const [view, setView] = useState("list") // 'list' or 'assign'
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [statusFilter, setStatusFilter] = useState("all")
  
  // Trail State
  const [isTrailOpen, setIsTrailOpen] = useState(false)
  const [activeDocId, setActiveDocId] = useState(null)

  // --- Assign Form State ---
  const [jobs, setJobs] = useState([])
  const [assignments, setAssignments] = useState([
    {
      tempId: Date.now(),
      jobId: "",
      searchQuery: "",
      documentName: "",
      shrenoDocumentNo: "",
      shrenoReferenceNo: "",
      clientDocumentNo: "",
      clientReferenceNo: "",
      assignUserId: "",
      upload_due_days: "",
      response_due_days: "",
      actual_due_days: "",
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [customers, setCustomers] = useState([])
  const [users, setUsers] = useState([])
  const [error, setError] = useState("")

  // --- List View Columns ---
  const columns = useMemo(() => [
    {
      accessorKey: "document.document_number",
      header: "Doc Generated No",
    },
    {
      id: "job_number",
      header: "Job Number",
      cell: (row) => row.group?.job_group?.[0]?.job?.job_number || "-",
    },
    {
      accessorKey: "shreno_doc_no",
      header: "Shreno Doc No",
      cell: (row) => row.shreno_doc_no || "-",
    },
    {
      accessorKey: "client_doc_no",
      header: "Client Doc No",
      cell: (row) => row.client_doc_no || "-",
    },
    {
      accessorKey: "document.document_name",
      header: "Document Name",
    },
    {
      accessorKey: "user.name",
      header: "Assigned To",
      cell: (row) => {
        const name = String(row.user?.name || row.user?.full_name || row.user?.email || "Unassigned")
        const empid = String(row.user?.empid || row.user?.employeeId || "")
        return (name !== "Unassigned" && empid) ? `${name} (${empid})` : name;
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      accessorKey: "upload_due_days",
      header: "Upload Due Days",
      cell: (row) => row.upload_due_days || "-",
    },
    {
      accessorKey: "response_due_days",
      header: "Response Due Days",
      cell: (row) => row.response_due_days || "-",
    },
    {
      accessorKey: "actual_due_days",
      header: "Actual Due Days",
      cell: (row) => row.actual_due_days || "-",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold 
          ${row.status === 'Approved' ? 'bg-green-100 text-green-800' :
            row.status === 'Rejected' ? 'bg-red-100 text-red-800' :
              row.status === 'Uploaded' ? 'bg-blue-100 text-blue-800' :
                row.status === 'Upload Due' ? 'bg-red-100 text-red-800 border border-red-200' :
                  row.status === 'Response Due' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                    'bg-yellow-100 text-yellow-800'}`}>
          {row.status}
        </span>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: (row) => new Date(row.updatedAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => {
        const isEditable = row.status === 'Pending' || row.status === 'Upload Due';
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEditAssign(row)}
              disabled={!isEditable}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-600"
              onClick={() => {
                setActiveDocId(row.id);
                setIsTrailOpen(true);
              }}
            >
              <History className="h-4 w-4 mr-2" />
              Trail
            </Button>
          </div>
        );
      },
    },
  ], [])

  // --- Fetch Data for List View ---
  const fetchAssignedDocuments = useCallback(async ({ page, limit, search, sorting }) => {
    try {
      const params = { page, limit }
      if (search) params.search = search
      if (statusFilter && statusFilter !== 'all') params.status_filter = statusFilter
      if (sorting && sorting.length > 0) {
        params.sortBy = sorting[0].id
        params.sortOrder = sorting[0].desc ? "desc" : "asc"
      }

      const response = await apiClient.get("/api/dcc/get-assigned-documents", params)

      if (response.success) {
        return {
          data: response.data || [],
          meta: response.meta || {}
        }
      }
      return { data: [], meta: {} }
    } catch (err) {
      console.error("Error fetching documents:", err)
      return { data: [], meta: {} }
    }
  }, [statusFilter])

  // Fetch customers and users
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true)
        // Fetch customers, users, and jobs in parallel using apiClient
        const [customersRes, usersRes, jobsRes] = await Promise.all([
          apiClient.get("/api/dcc/get-customers", { limit: 1000 }),
          apiClient.get("/api/users/by-role/USER", { limit: 1000 }),
          apiClient.get("/api/dcc/get-jobs", { limit: 1000 }),
        ])

        setCustomers(customersRes?.data || [])
        setUsers(usersRes?.data || [])
        setJobs(jobsRes?.data || [])
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err?.message || "Failed to load data")
        toast.error(err?.message || "Failed to load initial data")
      } finally {
        setIsLoadingData(false)
      }
    }

    if (view === 'assign') {
      fetchData()
    }
  }, [view])

  // Get available jobs
  const availableJobs = jobs || []

  // --- Helpers for Dynamic Rows ---
  const addRow = () => {
    setAssignments(prev => [
      ...prev,
      {
        tempId: Date.now(),
        jobId: "",
        searchQuery: "",
        documentName: "",
        shrenoDocumentNo: "",
        shrenoReferenceNo: "",
        clientDocumentNo: "",
        clientReferenceNo: "",
        assignUserId: "",
        upload_due_days: "",
        response_due_days: "",
        actual_due_days: "",
      }
    ])
  }

  const removeRow = (tempId) => {
    if (assignments.length === 1) {
      toast.warn("At least one row is required")
      return
    }
    setAssignments(prev => prev.filter(row => row.tempId !== tempId))
  }

  const copyRow = (row) => {
    setAssignments(prev => [
      ...prev,
      {
        ...row,
        tempId: Date.now() + Math.random(), // Ensure unique tempId
      }
    ])
  }

  const handleAssignmentChange = (tempId, field, value) => {
    setAssignments(prev => prev.map(row =>
      row.tempId === tempId ? { ...row, [field]: value } : row
    ))
  }

  const handleEditAssign = (row) => {
    setEditingId(row.id)
    setView("assign")

    // Set form data removed

    // Set assignments (just one for edit for now, as simple merge)
    setAssignments([
      {
        tempId: Date.now(),
        jobId: row.group?.job_group?.[0]?.job_id || "",
        documentName: row.document?.document_name || "",
        shrenoDocumentNo: row.shreno_doc_no || "",
        shrenoReferenceNo: row.shreno_reference_no || "",
        clientDocumentNo: row.client_doc_no || "",
        clientReferenceNo: row.client_reference_no || "",
        assignUserId: row.user_id || "",
        upload_due_days: row.upload_due_days || "",
        response_due_days: row.response_due_days || "",
        actual_due_days: row.actual_due_days || "",
      }
    ])
  }

  // handleNext removed during streamlining

  // Handle document detail change
  const handleDetailChange = (documentId, field, value) => {
    setDocumentDetails((prev) => ({
      ...prev,
      [documentId]: {
        ...prev[documentId],
        [field]: value,
      },
    }))
  }

  // Handle back to selection and reset form
  const handleBack = () => {
    setView("list")
    setEditingId(null)
    // Reset form data removed
    setAssignments([
      {
        tempId: Date.now(),
        jobId: "",
        documentName: "",
        shrenoDocumentNo: "",
        shrenoReferenceNo: "",
        clientDocumentNo: "",
        clientReferenceNo: "",
        assignUserId: "",
        upload_due_days: "",
        response_due_days: "",
        actual_due_days: "",
      }
    ])
  }

  // Unused handlers removed

  const handleAssign = async () => {

    const validAssignments = assignments.filter(a => a.jobId && a.documentName && a.assignUserId)
    if (validAssignments.length === 0) {
      toast.error("Please complete at least one assignment row (Job, Name, User).");
      return;
    }

    setIsLoading(true)

    const requestBody = {
      assignments: validAssignments.map(a => ({
        job_id: a.jobId,
        document_name: a.documentName,
        shreno_document_no: a.shrenoDocumentNo,
        shreno_reference_no: a.shrenoReferenceNo,
        client_document_no: a.clientDocumentNo,
        client_reference_no: a.clientReferenceNo,
        assign_user_id: a.assignUserId,
        upload_due_days: a.upload_due_days ? parseInt(a.upload_due_days) : null,
        response_due_days: a.response_due_days ? parseInt(a.response_due_days) : null,
        actual_due_days: a.actual_due_days ? parseInt(a.actual_due_days) : null,
      })),
    }

    try {
      const response = await apiClient.post("/api/dcc/bulk-assign-documents", requestBody)

      if (response.success) {
        toast.success("Documents assigned successfully!")
        handleBack()
        setRefreshKey(prev => prev + 1)
      }
    } catch (err) {
      console.error("Error assigning documents:", err)
      toast.error(err.message || "Failed to assign documents.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      await exportApi.exportModule("group_document", "Assigned documents export.xlsx")
      setRefreshKey(prev => prev + 1)

    } catch (error) {
      console.error("Export failed:", error)
    }
  }

  const isSubmitDisabled = isLoading || assignments.some(a => !a.jobId || !a.documentName || !a.assignUserId)

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-auto p-6 flex flex-col">
          <div className="flex-1 flex flex-col w-full">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {view === "list" ? "Assigned Documents" : editingId ? "Edit Assignment" : "Assign Documents"}
                </h1>
                <p className="text-muted-foreground">
                  {view === "list"
                    ? "View and manage assigned documents."
                    : editingId ? "Update assignment details." : "Select customer, location, PO, and job to assign documents."}
                </p>
              </div>
              <div>
                {view === "list" ? (
                  <Button onClick={() => {
                    handleBack()
                    setView("assign")
                  }}>
                    <Plus className="mr-2 h-4 w-4" /> Assign Documents
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                  </Button>
                )}
              </div>
            </div>

            {/* List View */}
            {view === 'list' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Assigned Documents List</CardTitle>
                    <CardDescription>All documents assigned to jobs.</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="statusFilter" className="whitespace-nowrap">Filter by Status:</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Uploaded">Uploaded</SelectItem>
                          <SelectItem value="Approved">Approved</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                          <SelectItem value="Upload Due">Upload Due</SelectItem>
                          <SelectItem value="Response Due">Response Due</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={columns}
                    fetchData={fetchAssignedDocuments}
                    onExport={handleExport}
                  />
                </CardContent>
              </Card>
            )}

            {view === 'assign' && (
              <div className="flex-1 flex flex-col w-full space-y-6">
                {/* Document Details Section */}

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Document Details</CardTitle>
                        <CardDescription>Enter details for the documents to be assigned</CardDescription>
                      </div>
                      <Button type="button" size="sm" onClick={addRow}>
                        <Plus className="mr-2 h-4 w-4" /> Add Row
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50 whitespace-nowrap">
                              <TableHead className="w-[50px]">S.No</TableHead>
                              <TableHead className="min-w-[250px]">Job Number *</TableHead>
                              <TableHead className="min-w-[150px]">Customer</TableHead>
                              <TableHead className="min-w-[150px]">Location</TableHead>
                              <TableHead className="min-w-[150px]">PO Number</TableHead>
                              <TableHead className="min-w-[200px]">Document Name *</TableHead>
                              <TableHead className="min-w-[150px]">Shreno Document No</TableHead>
                              <TableHead className="min-w-[150px]">Shreno Reference No</TableHead>
                              <TableHead className="min-w-[150px]">Client Document No</TableHead>
                              <TableHead className="min-w-[150px]">Client Reference No</TableHead>
                              <TableHead className="min-w-[100px]">Upload Due Days</TableHead>
                              <TableHead className="min-w-[100px]">Response Due Days</TableHead>
                              <TableHead className="min-w-[100px]">Actual Due Days</TableHead>
                              <TableHead className="min-w-[180px]">Assign User *</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {assignments.map((assignment, idx) => {
                              const jobDetails = availableJobs.find(j => j.id === assignment.jobId);
                              return (
                                <TableRow key={assignment.tempId}>
                                  <TableCell className="font-medium">{idx + 1}</TableCell>

                                  {/* MSN/JOB No Select */}
                                  <TableCell>
                                    <Select
                                      value={assignment.jobId}
                                      onValueChange={val => handleAssignmentChange(assignment.tempId, 'jobId', val)}
                                      required
                                    >
                                      <SelectTrigger className="w-full font-bold">
                                        <SelectValue placeholder="Select Job" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <div className="p-2 sticky top-0 bg-popover z-10 w-full mb-1">
                                          <Input
                                            placeholder="Search Job Number..."
                                            value={assignment.searchQuery || ""}
                                            onChange={e => handleAssignmentChange(assignment.tempId, 'searchQuery', e.target.value)}
                                            onKeyDown={e => e.stopPropagation()}
                                            onClick={e => e.stopPropagation()}
                                            autoFocus
                                            className="h-8 shadow-none"
                                          />
                                        </div>
                                        <div className="max-h-[200px] overflow-y-auto">
                                          {availableJobs
                                            .filter(job => !assignment.searchQuery || job.job_number.toLowerCase().includes(assignment.searchQuery.toLowerCase()))
                                            .map(job => (
                                              <SelectItem key={job.id} value={job.id} className="font-bold">
                                                {job.job_number}
                                              </SelectItem>
                                          ))}
                                          {availableJobs.filter(job => !assignment.searchQuery || job.job_number.toLowerCase().includes(assignment.searchQuery.toLowerCase())).length === 0 && (
                                            <div className="py-6 text-center text-sm text-muted-foreground">
                                              No jobs found.
                                            </div>
                                          )}
                                        </div>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>

                                  {/* Read-Only Columns */}
                                  <TableCell>
                                    <Input
                                      value={jobDetails?.customer?.customer_name || "-"}
                                      className="w-full bg-slate-50 text-slate-500 cursor-not-allowed"
                                      readOnly
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={jobDetails?.customer_location?.location_name || "-"}
                                      className="w-full bg-slate-50 text-slate-500 cursor-not-allowed"
                                      readOnly
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={jobDetails?.po?.po_number || "-"}
                                      className="w-full bg-slate-50 text-slate-500 cursor-not-allowed"
                                      readOnly
                                    />
                                  </TableCell>

                                  {/* Document Name Input */}
                                  <TableCell>
                                    <Input
                                      placeholder="Document Name"
                                      value={assignment.documentName}
                                      onChange={e => handleAssignmentChange(assignment.tempId, 'documentName', e.target.value)}
                                      className="w-full"
                                      required
                                    />
                                  </TableCell>

                                  <TableCell>
                                    <Input
                                      placeholder="Shreno Doc No"
                                      value={assignment.shrenoDocumentNo}
                                      onChange={e => handleAssignmentChange(assignment.tempId, 'shrenoDocumentNo', e.target.value)}
                                      className="w-full"
                                      required
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      placeholder="Shreno Ref No"
                                      value={assignment.shrenoReferenceNo}
                                      onChange={e => handleAssignmentChange(assignment.tempId, 'shrenoReferenceNo', e.target.value)}
                                      className="w-full"
                                      required
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      placeholder="Client Doc No"
                                      value={assignment.clientDocumentNo}
                                      onChange={e => handleAssignmentChange(assignment.tempId, 'clientDocumentNo', e.target.value)}
                                      className="w-full"
                                      required
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      placeholder="Client Ref No"
                                      value={assignment.clientReferenceNo}
                                      onChange={e => handleAssignmentChange(assignment.tempId, 'clientReferenceNo', e.target.value)}
                                      className="w-full"
                                      required
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      placeholder="Days"
                                      value={assignment.upload_due_days}
                                      onChange={e => handleAssignmentChange(assignment.tempId, 'upload_due_days', e.target.value)}
                                      className="w-full"
                                      min="0"
                                      required
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      placeholder="Days"
                                      value={assignment.response_due_days}
                                      onChange={e => handleAssignmentChange(assignment.tempId, 'response_due_days', e.target.value)}
                                      className="w-full"
                                      min="0"
                                      required
                                    />
                                  </TableCell>

                                  <TableCell>
                                    <Input
                                      type="number"
                                      placeholder="Days"
                                      value={assignment.actual_due_days}
                                      onChange={e => handleAssignmentChange(assignment.tempId, 'actual_due_days', e.target.value)}
                                      className="w-full"
                                      min="0"
                                      required
                                    />
                                  </TableCell>

                                  {/* User Select */}
                                  <TableCell>
                                    <Select
                                      value={assignment.assignUserId}
                                      onValueChange={val => handleAssignmentChange(assignment.tempId, 'assignUserId', val)}
                                      required
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select user" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {users.map(user => {
                                          const id = String(user?.id || "")
                                          const name = String(user?.name || user?.full_name || user?.email || "User")
                                          const empid = String(user?.empid || user?.employeeId || "")
                                          const displayName = empid ? `${name} (${empid})` : name

                                          return (
                                            <SelectItem key={id} value={id}>
                                              {displayName}
                                            </SelectItem>
                                          )
                                        })}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>

                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                        onClick={() => copyRow(assignment)}
                                        title="Copy Row"
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeRow(assignment.tempId)}
                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        title="Remove Row"
                                      >
                                        <Plus className="h-4 w-4 rotate-45" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline" onClick={handleBack} disabled={isLoading}>Cancel</Button>
                        <Button onClick={handleAssign} disabled={isSubmitDisabled}>
                          {isLoading ? "Assigning..." : "Assign Documents"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
              </div>
            )}

            {/* Trail Sidebar Drawer */}
            <Sheet open={isTrailOpen} onOpenChange={setIsTrailOpen}>
              <SheetContent side="right" className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl flex flex-col">
                <SheetHeader className="p-6 pb-2 border-b">
                  <SheetTitle className="flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    Document Audit Trail
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  <DocumentTrail documentId={activeDocId} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default AssignDocument
