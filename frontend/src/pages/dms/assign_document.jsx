import { useState, useEffect, useMemo, useCallback, useRef } from "react"

import { SidebarTrigger } from "@/components/ui/sidebar"
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

  const [assignments, setAssignments] = useState([
    {
      tempId: Date.now(),
      jobId: "",
      searchQuery: "", // Job search
      customerId: "",
      customerSearch: "", // Customer search
      poId: "",
      poSearch: "", // PO search
      documentName: "",
      shrenoDocumentNo: "",
      clientDocumentNo: "",
      assignUserId: "",
      upload_due_days: "",
      response_due_days: "",
      actual_due_days: "",
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  // Master lists for display and search results
  const [customers, setCustomers] = useState([])
  const [users, setUsers] = useState([])
  const [allJobs, setAllJobs] = useState([]) // Master list of jobs (cached)
  const [allPos, setAllPos] = useState([])    // Master list of POs (cached)

  // Refs for debouncing
  const searchTimeoutRef = useRef({}); // { [tempId_field]: setTimeoutId }
  const [error, setError] = useState("")

  // --- List View Columns ---
  const columns = useMemo(() => [
    {
      accessorKey: "document.document_number",
      header: "System Doc ID",
    },
    {
      id: "customer_name",
      header: "Client",
      accessorKey: "customer.customer_name",
      filterType: "text",
      cell: (row) => row.customer?.customer_name || "-",
    },
    {
      id: "po_number",
      header: "PO",
      accessorKey: "po.po_number",
      filterType: "text",
      cell: (row) => row.po?.po_number || "-",
    },
    {
      id: "job_number",
      header: "Job Number",
      filterType: "text",
      cell: (row) => row.group?.job_group?.[0]?.job?.job_number || "-",
    },
    {
      accessorKey: "document.document_name",
      header: "Document Name",
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
      accessorKey: "user.name",
      header: "Assigned To",
      cell: (row) => {
        const name = String(row.user?.name || row.user?.full_name || row.user?.email || "Unassigned")
        const empid = String(row.user?.empid || row.user?.employeeId || "")
        return (name !== "Unassigned" && empid) ? `${name} (${empid})` : name;
      },
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
      id: "status",
      header: "Status",
      filterType: "select",
      filterOptions: [
        { label: "Awaiting Upload", value: "awaiting_upload" },
        { label: "Pending for Approval", value: "pending_approval" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
      ],
      cell: (row) => {
        const docStatus = row.status;
        if (docStatus === 'Response Due' || docStatus === 'Upload Due') {
          return (
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
              {docStatus === 'Upload Due' ? 'Upload Overdue' : 'Response Overdue'}
            </span>
          );
        }
        const isUploaderPending = docStatus === 'Pending';
        let text = isUploaderPending ? "Awaiting Upload" : (docStatus === 'Pending for Approval' ? "Pending for Approval" : docStatus);
        let colorClass = isUploaderPending ? "bg-gray-100 text-gray-800" : "bg-orange-100 text-orange-800 border border-orange-200";

        if (docStatus === 'Approved') {
          text = "Approved";
          colorClass = "bg-green-100 text-green-800";
        } else if (docStatus === 'Rejected') {
          text = "Rejected";
          colorClass = "bg-red-100 text-red-800";
        }

        return (
          <span className={`whitespace-nowrap px-2 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
            {text}
          </span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: (row) => new Date(row.createdAt).toLocaleDateString("en-GB"),
    },
    {
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: (row) => new Date(row.updatedAt).toLocaleDateString("en-GB"),
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
  const fetchAssignedDocuments = useCallback(async ({ page, limit, search, columnFilters }) => {
    try {
      const params = { page, limit }
      if (search) params.search = search
      if (statusFilter && statusFilter !== 'all') params.status_filter = statusFilter

      // Map column-based filters to API params
      if (columnFilters) {
        if (columnFilters.customer_name) params.customer_name_filter = columnFilters.customer_name;
        if (columnFilters.po_number) params.po_number_filter = columnFilters.po_number;
        if (columnFilters.job_number) params.job_number_filter = columnFilters.job_number;
        if (columnFilters.status) params.uploader_status_filter = columnFilters.status;
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

  // Fetch initial data (users and top entities)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true)
        // Fetch all of each to populate complete dropdowns
        const [customersRes, usersRes, jobsRes, posRes] = await Promise.all([
          apiClient.get("/api/dcc/get-customers", { limit: 999999 }),
          apiClient.get("/api/users/by-role/USER", { limit: 999999 }),
          apiClient.get("/api/dcc/get-jobs", { limit: 999999 }),
          apiClient.get("/api/dcc/get-pos", { limit: 999999 }),
        ])

        setCustomers(customersRes?.data || [])
        setUsers(usersRes?.data || [])
        setAllJobs(jobsRes?.data || [])
        setAllPos(posRes?.data || [])
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to load initial data")
        toast.error("Failed to load initial data")
      } finally {
        setIsLoadingData(false)
      }
    }
    if (view === 'assign') fetchData()
  }, [view, refreshKey])

  // Helper to fetch and merge POs
  const fetchPos = async (customerId = "", search = "") => {
    try {
      const params = { limit: 100 }
      if (customerId) params.customer_id = customerId
      if (search) params.search = search
      const res = await apiClient.get("/api/dcc/get-pos", params)
      if (res.success) {
        setAllPos(prev => {
          const combined = [...prev, ...(res.data || [])]
          // De-duplicate by ID
          return Array.from(new Map(combined.map(item => [item.id, item])).values())
        })
      }
    } catch (err) {
      console.error("Error fetching POs:", err)
    }
  }

  // Helper to fetch and merge Jobs
  const fetchJobs = async (poId = "", customerId = "", search = "") => {
    try {
      const params = { limit: 100 }
      if (poId) params.po_id = poId
      if (customerId) params.customer_id = customerId
      if (search) params.search = search
      const res = await apiClient.get("/api/dcc/get-jobs", params)
      if (res.success) {
        setAllJobs(prev => {
          const combined = [...prev, ...(res.data || [])]
          return Array.from(new Map(combined.map(item => [item.id, item])).values())
        })
      }
    } catch (err) {
      console.error("Error fetching jobs:", err)
    }
  }

  // Helper to fetch and merge Customers (for search results)
  const fetchCustomers = async (search = "") => {
    try {
      const params = { limit: 100 }
      if (search) params.search = search
      const res = await apiClient.get("/api/dcc/get-customers", params)
      if (res.success) {
        setCustomers(prev => {
          const combined = [...prev, ...(res.data || [])]
          return Array.from(new Map(combined.map(item => [item.id, item])).values())
        })
      }
    } catch (err) {
      console.error("Error fetching customers:", err)
    }
  }

  // --- Helpers for Dynamic Rows ---
  const addRow = () => {
    setAssignments(prev => [
      ...prev,
      {
        tempId: Date.now(),
        jobId: "",
        searchQuery: "",
        customerId: "",
        customerSearch: "",
        poId: "",
        poSearch: "",
        documentName: "",
        shrenoDocumentNo: "",
        clientDocumentNo: "",
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

  // --- Handlers ---
  const handleAssignmentChange = async (tempId, field, value) => {
    setAssignments(prev => prev.map(row => {
      if (row.tempId !== tempId) return row;

      let updatedRow = { ...row, [field]: value };

      // Handle search queries with debouncing
      if (['customerSearch', 'poSearch', 'searchQuery'].includes(field)) {
        const key = `${tempId}_${field}`;
        if (searchTimeoutRef.current[key]) clearTimeout(searchTimeoutRef.current[key]);

        searchTimeoutRef.current[key] = setTimeout(() => {
          if (field === 'customerSearch') fetchCustomers(value);
          else if (field === 'poSearch') fetchPos(updatedRow.customerId, value);
          else if (field === 'searchQuery') fetchJobs(updatedRow.poId, updatedRow.customerId, value);
        }, 500);
      }

      if (field === 'customerId') {
        updatedRow.customerSearch = "";
        // Reset PO and Job if they don't belong to the new customer
        const currentPo = allPos.find(p => p.id === row.poId);
        if (currentPo && currentPo.customer_id !== value) {
          updatedRow.poId = "";
          updatedRow.jobId = "";
        }
        // Fetch new POs for this customer
        if (value) fetchPos(value);
      } else if (field === 'poId') {
        updatedRow.poSearch = "";
        const selectedPo = allPos.find(p => p.id === value);
        if (selectedPo) {
          updatedRow.customerId = selectedPo.customer_id || "";
          // Reset Job if it doesn't belong to the new PO
          const currentJob = allJobs.find(j => j.id === row.jobId);
          if (currentJob && currentJob.po_id !== value) {
            updatedRow.jobId = "";
          }
          // Fetch new jobs for this PO
          fetchJobs(value, selectedPo.customer_id);
        }
      } else if (field === 'jobId') {
        const selectedJob = allJobs.find(j => j.id === value);
        if (selectedJob) {
          updatedRow.poId = selectedJob.po_id || "";
          updatedRow.customerId = selectedJob.customer_id || "";
          updatedRow.searchQuery = "";
          // Ensure we have current PO and Customer details
          if (!allPos.find(p => p.id === selectedJob.po_id)) fetchPos("", "", selectedJob.po_id);
        }
      }

      return updatedRow;
    }))
  }

  const handleEditAssign = (row) => {
    setEditingId(row.id)
    setView("assign")

    const targetJob = row.group?.job_group?.[0]?.job;
    if (targetJob) {
      // Cache this job and its PO immediately so metadata (like Location) is available
      setAllJobs(prev => Array.from(new Map([...prev, targetJob].map(item => [item.id, item])).values()));
      if (targetJob.po) {
        setAllPos(prev => Array.from(new Map([...prev, targetJob.po].map(item => [item.id, item])).values()));
      }
    }

    setAssignments([
      {
        tempId: Date.now(),
        jobId: row.group?.job_group?.[0]?.job_id || "",
        customerId: row.group?.job_group?.[0]?.job?.customer_id || "",
        poId: row.group?.job_group?.[0]?.job?.po_id || "",
        documentName: row.document?.document_name || "",
        shrenoDocumentNo: row.shreno_doc_no || "",
        clientDocumentNo: row.client_doc_no || "",
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
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
      <main className="flex-1 overflow-auto p-6 flex flex-col">
        <div className="flex-1 flex flex-col w-full">

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {view === "list" ? "Documents" : editingId ? "Edit Assignment" : "Assign Documents"}
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
                    <span className="text-sm font-semibold text-slate-800 whitespace-nowrap">Filter by Status:</span>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px] h-9 bg-white border-slate-200">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Uploaded">Uploaded</SelectItem>
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
                          <TableHead className="min-w-[200px]">Customer <span className="text-destructive">*</span></TableHead>
                          <TableHead className="min-w-[150px]">PO Number <span className="text-destructive">*</span></TableHead>
                          <TableHead className="min-w-[150px]">Location</TableHead>
                          <TableHead className="min-w-[200px]">Job Number <span className="text-destructive">*</span></TableHead>
                          <TableHead className="min-w-[200px]">Document Name <span className="text-destructive">*</span></TableHead>
                          <TableHead className="min-w-[150px]">Shreno Document No</TableHead>
                          <TableHead className="min-w-[150px]">Client Document No</TableHead>
                          <TableHead className="min-w-[100px]">Upload Due Days</TableHead>
                          <TableHead className="min-w-[100px]">Response Due Days</TableHead>
                          <TableHead className="min-w-[100px]">Actual Due Days</TableHead>
                          <TableHead className="min-w-[180px]">Assign User <span className="text-destructive">*</span></TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignments.map((assignment, idx) => {
                          const jobDetails = allJobs.find(j => j.id === assignment.jobId);
                          const poDetails = allPos.find(p => p.id === assignment.poId);
                          const displayLocation = jobDetails?.customer_location?.location_name || poDetails?.customer_location?.location_name || "auto-fill";

                          return (
                            <TableRow key={assignment.tempId}>
                              <TableCell className="font-medium">{idx + 1}</TableCell>

                              {/* Customer Select */}
                              <TableCell>
                                <Select
                                  value={assignment.customerId}
                                  onValueChange={val => handleAssignmentChange(assignment.tempId, 'customerId', val)}
                                  required
                                >
                                  <SelectTrigger className="w-full font-bold">
                                    <SelectValue placeholder="Select Customer" />
                                  </SelectTrigger>
                                  <SelectContent position="popper" sideOffset={5} className="min-w-[var(--radix-select-trigger-width)] max-w-[400px]">
                                    <div className="p-2 sticky top-0 bg-popover z-10 w-full mb-1 border-b">
                                      <Input
                                        placeholder="Search Customer..."
                                        value={assignment.customerSearch || ""}
                                        onChange={e => handleAssignmentChange(assignment.tempId, 'customerSearch', e.target.value)}
                                        onKeyDown={e => e.stopPropagation()}
                                        onClick={e => e.stopPropagation()}
                                        className="h-8 shadow-none border-none focus-visible:ring-0 px-1"
                                        autoFocus
                                      />
                                    </div>
                                    <div className="max-h-[250px] overflow-y-auto">
                                      {customers
                                        .filter(c => !assignment.customerSearch || c.customer_name.toLowerCase().includes(assignment.customerSearch.toLowerCase()))
                                        .map(c => (
                                          <SelectItem key={c.id} value={c.id} className="font-bold cursor-pointer">
                                            {c.customer_name}
                                          </SelectItem>
                                        ))}
                                    </div>
                                  </SelectContent>
                                </Select>
                              </TableCell>

                              {/* PO Number Select */}
                              <TableCell>
                                <Select
                                  value={assignment.poId}
                                  onValueChange={val => handleAssignmentChange(assignment.tempId, 'poId', val)}
                                  required
                                >
                                  <SelectTrigger className="w-full font-bold">
                                    <SelectValue placeholder="Select PO" />
                                  </SelectTrigger>
                                  <SelectContent position="popper" sideOffset={5} className="min-w-[var(--radix-select-trigger-width)] max-w-[400px]">
                                    <div className="p-2 sticky top-0 bg-popover z-10 w-full mb-1 border-b">
                                      <Input
                                        placeholder="Search PO..."
                                        value={assignment.poSearch || ""}
                                        onChange={e => handleAssignmentChange(assignment.tempId, 'poSearch', e.target.value)}
                                        onKeyDown={e => e.stopPropagation()}
                                        onClick={e => e.stopPropagation()}
                                        className="h-8 shadow-none border-none focus-visible:ring-0 px-1"
                                        autoFocus
                                      />
                                    </div>
                                    <div className="max-h-[250px] overflow-y-auto">
                                      {allPos
                                        .filter(p => !assignment.customerId || p.customer_id === assignment.customerId)
                                        .filter(p => !assignment.poSearch || p.po_number.toLowerCase().includes(assignment.poSearch.toLowerCase()))
                                        .map(p => (
                                          <SelectItem key={p.id} value={p.id} className="font-bold cursor-pointer">
                                            {p.po_number}
                                          </SelectItem>
                                        ))}
                                    </div>
                                  </SelectContent>
                                </Select>
                              </TableCell>

                              {/* Read-Only Location Column */}
                              <TableCell>
                                <Input
                                  value={displayLocation}
                                  className="w-full bg-slate-50 text-slate-500 cursor-not-allowed"
                                  readOnly
                                />
                              </TableCell>

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
                                  <SelectContent position="popper" sideOffset={5} className="min-w-[var(--radix-select-trigger-width)] max-w-[400px]">
                                    <div className="p-2 sticky top-0 bg-popover z-10 w-full mb-1 border-b">
                                      <Input
                                        placeholder="Search Job..."
                                        value={assignment.searchQuery || ""}
                                        onChange={e => handleAssignmentChange(assignment.tempId, 'searchQuery', e.target.value)}
                                        onKeyDown={e => e.stopPropagation()}
                                        onClick={e => e.stopPropagation()}
                                        className="h-8 shadow-none border-none focus-visible:ring-0 px-1"
                                        autoFocus
                                      />
                                    </div>
                                    <div className="max-h-[250px] overflow-y-auto">
                                      {allJobs
                                        .filter(j => !assignment.poId || j.po_id === assignment.poId)
                                        .filter(job => !assignment.searchQuery || job.job_number.toLowerCase().includes(assignment.searchQuery.toLowerCase()))
                                        .map(job => (
                                          <SelectItem key={job.id} value={job.id} className="font-bold cursor-pointer">
                                            {job.job_number}
                                          </SelectItem>
                                        ))}
                                    </div>
                                  </SelectContent>
                                </Select>
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
                                  placeholder="Client Doc No"
                                  value={assignment.clientDocumentNo}
                                  onChange={e => handleAssignmentChange(assignment.tempId, 'clientDocumentNo', e.target.value)}
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
    </>
  )
}

export default AssignDocument
