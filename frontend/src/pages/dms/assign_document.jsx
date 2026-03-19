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
import { Checkbox } from "@/components/ui/checkbox"
import { Search, ArrowRight, Plus, ArrowLeft, Edit } from "lucide-react"
import { DataTable } from "@/components/shared/DataTable"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"

function AssignDocument() {
  const [view, setView] = useState("list") // 'list' or 'assign'
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingId, setEditingId] = useState(null)

  // --- Assign Form State ---
  const [formData, setFormData] = useState({
    customerId: "",
    locationId: "",
    poId: "",
    jobIds: [], // Changed to array for multiple jobs
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [customers, setCustomers] = useState([])
  const [users, setUsers] = useState([])
  const [allDocuments, setAllDocuments] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all")
  const [selectedDocuments, setSelectedDocuments] = useState([])
  const [documentDetails, setDocumentDetails] = useState({})
  const [userSearchQueries, setUserSearchQueries] = useState({})
  const [error, setError] = useState("")

  // --- List View Columns ---
  const columns = useMemo(() => [
    {
      accessorKey: "document.document_number",
      header: "Document No",
    },
    {
      accessorKey: "shreno_doc_no",
      header: "Shreno Doc No",
      cell: (row) => row.shreno_doc_no || "-",
    },
    {
      accessorKey: "document.document_name",
      header: "Document Name",
    },
    {
      accessorKey: "user.name",
      header: "Assigned To",
      cell: (row) => row.user?.name || "Unassigned",
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
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleEditAssign(row)}
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      ),
    },
  ], [])

  // --- Fetch Data for List View ---
  const fetchAssignedDocuments = useCallback(async ({ page, limit, search, sorting }) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
      const authData = localStorage.getItem("user_auth")
      let token = null
      if (authData) {
        try {
          const parsed = JSON.parse(authData)
          token = parsed?.payload?.token || parsed?.token
        } catch { }
      }

      const headers = {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
      }

      const params = new URLSearchParams()
      params.append("page", page)
      params.append("limit", limit)
      if (search) params.append("search", search)
      if (sorting && sorting.length > 0) {
        params.append("sortBy", sorting[0].id)
        params.append("sortOrder", sorting[0].desc ? "desc" : "asc")
      }

      const res = await fetch(`${backendUrl}/api/dcc/get-assigned-documents?${params.toString()}`, {
        method: "GET",
        headers,
        credentials: "include",
      })

      const responseData = await res.json()

      if (res.ok && responseData.success) {
        return {
          data: responseData.data || [],
          meta: responseData.meta || {}
        }
      }
      return { data: [], meta: {} }
    } catch (err) {
      console.error("Error fetching documents:", err)
      return { data: [], meta: {} }
    }
  }, [])

  // Fetch customers and documents from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"

        // Get auth token
        const authData = localStorage.getItem("user_auth")
        let token = null
        if (authData) {
          try {
            const parsed = JSON.parse(authData)
            token = parsed?.payload?.token || parsed?.token
          } catch {
            // If parsing fails, continue without token
          }
        }

        const headers = {
          "Content-Type": "application/json",
        }
        if (token) {
          headers["Authorization"] = `Bearer ${token}`
        }

        // Fetch customers, documents, and users in parallel
        const [customersRes, documentsRes, usersRes] = await Promise.all([
          fetch(`${backendUrl}/api/dcc/get-customers?limit=1000`, {
            method: "GET",
            headers,
            credentials: "include",
          }),
          fetch(`${backendUrl}/api/dcc/document?limit=1000&exclude_transmitted=true&exclude_assigned=${editingId ? 'true' : 'true'}${editingId && selectedDocuments[0] ? `&include_id=${selectedDocuments[0].id}` : ''}`, {
            method: "GET",
            headers,
            credentials: "include",
          }),
          fetch(`${backendUrl}/api/users/get-users?limit=1000`, {
            method: "GET",
            headers,
            credentials: "include",
          }),
        ])

        const customersContentType = customersRes.headers.get("content-type") || ""
        const customersPayload = customersContentType.includes("application/json")
          ? await customersRes.json()
          : await customersRes.text()

        const documentsContentType = documentsRes.headers.get("content-type") || ""
        const documentsPayload = documentsContentType.includes("application/json")
          ? await documentsRes.json()
          : await documentsRes.text()

        const usersContentType = usersRes.headers.get("content-type") || ""
        const usersPayload = usersContentType.includes("application/json")
          ? await usersRes.json()
          : await usersRes.text()

        if (!customersRes.ok) {
          const message =
            typeof customersPayload === "string"
              ? customersPayload
              : customersPayload?.message || "Failed to fetch customers"
          throw new Error(message)
        }

        if (!documentsRes.ok) {
          const message =
            typeof documentsPayload === "string"
              ? documentsPayload
              : documentsPayload?.message || "Failed to fetch documents"
          throw new Error(message)
        }

        if (!usersRes.ok) {
          console.error("Failed to fetch users", usersPayload);
          // Don't throw, just warn? Or maybe throw if users are essential.
          // For now, let's log.
        }

        // Extract data from responses
        const customersData = customersPayload?.data || customersPayload?.customers || []
        const documentsData = documentsPayload?.data || documentsPayload?.documents || []
        const usersData = usersPayload?.data || []

        setCustomers(customersData)
        setAllDocuments(documentsData)
        setUsers(usersData)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err?.message || "Failed to load data")
      } finally {
        setIsLoadingData(false)
      }
    }

    if (view === 'assign') {
      fetchData()
    }
  }, [view])


  // Get locations for selected customer
  const getLocationsForCustomer = (customerId) => {
    const customer = customers.find((c) => c.id === customerId)
    return customer?.customer_locations || []
  }

  // Get POs for selected location
  const getPOsForLocation = (locationId) => {
    if (!formData.customerId || !locationId) return []
    const customer = customers.find((c) => c.id === formData.customerId)
    if (!customer) return []

    const location = customer.customer_locations?.find((loc) => loc.id === locationId)
    return location?.pos || []
  }

  // Get jobs for selected PO
  const getJobsForPO = (poId) => {
    if (!formData.locationId || !poId) return []
    const customer = customers.find((c) => c.id === formData.customerId)
    if (!customer) return []

    const location = customer.customer_locations?.find((loc) => loc.id === formData.locationId)
    if (!location) return []

    const po = location.pos?.find((p) => p.id === poId)
    return po?.jobs || []
  }

  // Get available locations based on selected customer
  const availableLocations = formData.customerId
    ? getLocationsForCustomer(formData.customerId)
    : []

  // Get available POs based on selected location
  const availablePOs = formData.locationId
    ? getPOsForLocation(formData.locationId)
    : []

  // Get available jobs based on selected PO
  const availableJobs = formData.poId
    ? getJobsForPO(formData.poId)
    : []

  // Get unique document types for filter
  const documentTypes = [
    "all",
    ...new Set(
      allDocuments.map((doc) =>
        doc.document_type?.name || doc.documentType || "Unknown"
      )
    ),
  ]

  // Filter documents based on search and document type
  const filteredDocuments = allDocuments.filter((doc) => {
    const docCode = doc.document_number || doc.documentCode || ""
    const docName = doc.document_name || doc.documentName || ""
    const docType = doc.document_type?.name || doc.documentType || ""

    const matchesSearch =
      searchQuery === "" ||
      docCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      docName.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType =
      documentTypeFilter === "all" || docType === documentTypeFilter

    return matchesSearch && matchesType
  })

  // Handle document selection
  const handleDocumentToggle = (document) => {
    setSelectedDocuments((prev) => {
      const isSelected = prev.some((doc) => doc.id === document.id)
      if (isSelected) {
        // Remove from details too
        setDocumentDetails(detailsPrev => {
          const next = { ...detailsPrev };
          delete next[document.id];
          return next;
        });
        return prev.filter((doc) => doc.id !== document.id)
      } else {
        // Add to details with defaults
        setDocumentDetails(detailsPrev => ({
          ...detailsPrev,
          [document.id]: {
            shrenoDocumentNo: "",
            shrenoReferenceNo: "",
            clientDocumentNo: "",
            clientReferenceNo: "",
            assignUserId: "",
            uploadDueDays: "",
            responseDueDays: "",
          }
        }));
        return [...prev, document]
      }
    })
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selectedDocuments.length === filteredDocuments.length) {
      setSelectedDocuments([])
      setDocumentDetails({})
    } else {
      setSelectedDocuments([...filteredDocuments])
      setDocumentDetails(prev => {
        const next = { ...prev };
        filteredDocuments.forEach(doc => {
          if (!next[doc.id]) {
            next[doc.id] = {
              shrenoDocumentNo: "",
              shrenoReferenceNo: "",
              clientDocumentNo: "",
              clientReferenceNo: "",
              assignUserId: "",
              uploadDueDays: "",
              responseDueDays: "",
            };
          }
        });
        return next;
      });
    }
  }

  const handleEditAssign = (row) => {
    setEditingId(row.id)
    setView("assign")

    // Set form data
    setFormData({
      customerId: row.customer_id,
      locationId: row.customer_location_id,
      poId: row.po_id,
      jobIds: row.group?.job_group?.map(jg => jg.job_id) || []
    })

    // Set selected document
    const doc = {
      ...row.document,
      // Ensure properties match expected structure in step 2
      id: row.document_id
    }
    setSelectedDocuments([doc])

    // Set document details
    setDocumentDetails({
      [doc.id]: {
        shrenoDocumentNo: row.shreno_doc_no || "",
        shrenoReferenceNo: row.shreno_reference_no || "",
        clientDocumentNo: row.client_doc_no || "",
        clientReferenceNo: row.client_reference_no || "",
        assignUserId: row.user_id || "",
        uploadDueDays: row.upload_due_days || "",
        responseDueDays: row.response_due_days || "",
      }
    });

    // View switch is enough
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

  // Handle back to selection
  const handleBack = () => {
    setView("list")
    setEditingId(null)
    setSelectedDocuments([])
    setDocumentDetails({})
  }

  // Handle customer change
  const handleCustomerChange = (customerId) => {
    setFormData({
      customerId,
      locationId: "",
      poId: "",
      jobIds: [],
    })
  }

  // Handle location change
  const handleLocationChange = (locationId) => {
    setFormData((prev) => ({
      ...prev,
      locationId,
      poId: "",
      jobIds: [],
    }))
  }

  // Handle PO change
  const handlePOChange = (poId) => {
    setFormData((prev) => ({
      ...prev,
      poId,
      jobIds: [],
    }))
  }

  // Handle job selection (multiple jobs)
  const handleJobToggle = (jobId) => {
    setFormData((prev) => {
      const currentJobIds = prev.jobIds || []
      const isSelected = currentJobIds.includes(jobId)

      if (isSelected) {
        return {
          ...prev,
          jobIds: currentJobIds.filter((id) => id !== jobId),
        }
      } else {
        return {
          ...prev,
          jobIds: [...currentJobIds, jobId],
        }
      }
    })
  }

  // Handle select all jobs
  const handleSelectAllJobs = () => {
    if (formData.jobIds?.length === availableJobs.length) {
      setFormData((prev) => ({
        ...prev,
        jobIds: [],
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        jobIds: availableJobs.map((job) => job.id),
      }))
    }
  }

  const handleAssign = async () => {
    if (!formData.customerId || !formData.locationId || !formData.poId) {
      toast.error("Missing required selection (Customer, Location, or PO). Please go back and select.");
      return;
    }

    setIsLoading(true)

    // Create variable with all selected job IDs
    const jobIds = formData.jobIds || []

    console.log("Selected Job IDs:", jobIds)
    console.log("Total jobs selected:", jobIds.length)

    // Prepare documents array with all document details
    const documents = selectedDocuments.map((doc) => {
      const details = documentDetails[doc.id] || {}
      return {
        document_id: doc.id,
        shreno_document_no: details.shrenoDocumentNo || "",
        shreno_reference_no: details.shrenoReferenceNo || "",
        client_document_no: details.clientDocumentNo || "",
        client_reference_no: details.clientReferenceNo || "",
        assign_user_id: details.assignUserId || "",
        upload_due_days: details.uploadDueDays ? parseInt(details.uploadDueDays) : null,
        response_due_days: details.responseDueDays ? parseInt(details.responseDueDays) : null,
      }
    })

    // Request body structure
    const requestBody = {
      customer_id: formData.customerId,
      customer_location_id: formData.locationId,
      po_id: formData.poId,
      job_ids: jobIds,
      documents: documents,
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
      const authData = localStorage.getItem("user_auth")
      let token = null
      if (authData) {
        try {
          const parsed = JSON.parse(authData)
          token = parsed?.payload?.token || parsed?.token
        } catch {
          // If parsing fails, continue without token
        }
      }

      const headers = {
        "Content-Type": "application/json",
      }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const res = await fetch(`${backendUrl}/api/dcc/${editingId ? `update-assigned-document/${editingId}` : 'assign-document'}`, {
        method: editingId ? "PUT" : "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(editingId ? {
          ...requestBody,
          document_id: documents[0].document_id,
          assign_user_id: documents[0].assign_user_id,
          shreno_document_no: documents[0].shreno_document_no,
          shreno_reference_no: documents[0].shreno_reference_no,
          client_document_no: documents[0].client_document_no,
          client_reference_no: documents[0].client_reference_no,
          upload_due_days: documents[0].upload_due_days,
          response_due_days: documents[0].response_due_days
        } : requestBody),
      })

      const contentType = res.headers.get("content-type") || ""
      const payload = contentType.includes("application/json")
        ? await res.json()
        : await res.text()

      if (!res.ok) {
        const message =
          typeof payload === "string"
            ? payload
            : payload?.message || "Failed to assign documents"
        throw new Error(message)
      }

      // Success
      toast.success(editingId ? "Assignment updated successfully!" : "Documents assigned successfully!")
      // Reset form
      setFormData({
        customerId: "",
        locationId: "",
        poId: "",
        jobIds: [],
      })
      setEditingId(null)
      setSelectedDocuments([])
      setDocumentDetails({})
      setUserSearchQueries({})
      setSearchQuery("")
      setDocumentTypeFilter("all")

      // Switch back to list view and refresh
      setView("list")
      setRefreshKey(prev => prev + 1)
      setTimeout(() => window.location.reload(), 1000);

    } catch (err) {
      console.error("Error assigning documents:", err)
      // Display simplified error message
      toast.error(err.message || "Failed to assign documents. Please check inputs and try again.")
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
                    setEditingId(null)
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
                <CardHeader>
                  <CardTitle>Assigned Documents List</CardTitle>
                  <CardDescription>All documents assigned to jobs.</CardDescription>
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
                <form>
                  <Card>
                    <CardHeader>
                      <CardTitle>Selection</CardTitle>
                      <CardDescription>
                        Select customer, location, PO, and job in sequence
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Row 1: Customer and Location */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="customerId">
                            Customer Name <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={formData.customerId}
                            onValueChange={handleCustomerChange}
                            disabled={isLoading || isLoadingData}
                            required
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={
                                isLoadingData ? "Loading customers..." : "Select a customer"
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {customers.length > 0 ? (
                                customers.map((customer) => (
                                  <SelectItem key={customer.id} value={customer.id}>
                                    {customer.customer_name || customer.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-customers" disabled>
                                  No customers found
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="locationId">
                            Location <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={formData.locationId}
                            onValueChange={handleLocationChange}
                            disabled={isLoading || !formData.customerId}
                            required
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a location" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableLocations.length > 0 ? (
                                availableLocations.map((location) => (
                                  <SelectItem key={location.id} value={location.id}>
                                    <div className="flex flex-col">
                                      <span>{location.location_name || location.name}</span>
                                      {location.gst_number && (
                                        <span className="text-xs text-muted-foreground">
                                          GST: {location.gst_number}
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-location" disabled>
                                  No locations available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Row 2: PO Number */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="poId">
                            PO Number <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={formData.poId}
                            onValueChange={handlePOChange}
                            disabled={isLoading || !formData.locationId}
                            required
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a PO" />
                            </SelectTrigger>
                            <SelectContent>
                              {availablePOs.length > 0 ? (
                                availablePOs.map((po) => (
                                  <SelectItem key={po.id} value={po.id}>
                                    {po.po_number || po.poNumber}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-po" disabled>
                                  No purchase orders available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Row 3: Multiple Jobs Selection */}
                      {formData.poId && availableJobs.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>
                              Jobs <span className="text-destructive">*</span>
                            </Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleSelectAllJobs}
                              disabled={isLoading}
                              className="h-auto py-1 text-xs"
                            >
                              {formData.jobIds?.length === availableJobs.length
                                ? "Deselect All"
                                : "Select All"}
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4 border rounded-lg">
                            {availableJobs.map((job) => {
                              const isSelected = formData.jobIds?.includes(job.id) || false
                              return (
                                <div
                                  key={job.id}
                                  className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50"
                                >
                                  <Checkbox
                                    id={`job-${job.id}`}
                                    checked={isSelected}
                                    onCheckedChange={() => handleJobToggle(job.id)}
                                    disabled={isLoading}
                                  />
                                  <Label
                                    htmlFor={`job-${job.id}`}
                                    className="text-sm font-normal cursor-pointer flex-1"
                                  >
                                    {job.job_number || job.jobNumber}
                                  </Label>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </form>

                {/* Available Documents Section */}
                {formData.jobIds?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Available Documents</CardTitle>
                      <CardDescription>Search and filter documents to assign to this job</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Search and Filter */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="space-y-2">
                          <Label htmlFor="search">Search Documents</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="search"
                              type="text"
                              placeholder="Search by code or name..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="documentTypeFilter">Filter by Type</Label>
                          <Select
                            value={documentTypeFilter}
                            onValueChange={setDocumentTypeFilter}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                              {documentTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type === "all" ? "All Types" : type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Documents Table */}
                      <div className="rounded-md border max-h-80 overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                            <TableRow>
                              <TableHead className="w-[50px]">
                                <Checkbox
                                  checked={filteredDocuments.length > 0 && selectedDocuments.length === filteredDocuments.length}
                                  onCheckedChange={handleSelectAll}
                                />
                              </TableHead>
                              <TableHead className="w-[50px]">S.No</TableHead>
                              <TableHead>Document Code</TableHead>
                              <TableHead>Document Name</TableHead>
                              <TableHead>Document Type</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredDocuments.length > 0 ? (
                              filteredDocuments.map((doc, idx) => (
                                <TableRow key={doc.id} className={selectedDocuments.some(s => s.id === doc.id) ? "bg-muted/50" : ""}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedDocuments.some(s => s.id === doc.id)}
                                      onCheckedChange={() => handleDocumentToggle(doc)}
                                    />
                                  </TableCell>
                                  <TableCell>{idx + 1}</TableCell>
                                  <TableCell className="font-medium">{doc.document_number || doc.documentCode}</TableCell>
                                  <TableCell>{doc.document_name || doc.documentName}</TableCell>
                                  <TableCell>
                                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                      {doc.document_type?.name || doc.documentType || "N/A"}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                  No documents found matching your search criteria.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Document Details Section */}
                {selectedDocuments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Document Details</CardTitle>
                      <CardDescription>Enter details for the selected documents</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50 whitespace-nowrap">
                              <TableHead className="w-[50px]">S.No</TableHead>
                              <TableHead>Document Code</TableHead>
                              <TableHead>Document Name</TableHead>
                              <TableHead>Document Type</TableHead>
                              <TableHead>Shreno Document No</TableHead>
                              <TableHead>Shreno Reference No</TableHead>
                              <TableHead>Client Document No</TableHead>
                              <TableHead>Client Reference No</TableHead>
                              <TableHead>Upload Due Days</TableHead>
                              <TableHead>Response Due Days</TableHead>
                              <TableHead>Assign User</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedDocuments.map((doc, idx) => {
                              const details = documentDetails[doc.id] || {}
                              const userSearch = userSearchQueries[doc.id] || ""
                              const filteredUsers = users.filter(u =>
                                u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                                u.email?.toLowerCase().includes(userSearch.toLowerCase())
                              )

                              return (
                                <TableRow key={doc.id}>
                                  <TableCell className="font-medium">{idx + 1}</TableCell>
                                  <TableCell>{doc.document_number || doc.documentCode}</TableCell>
                                  <TableCell>{doc.document_name || doc.documentName}</TableCell>
                                  <TableCell>
                                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                      {doc.document_type?.name || doc.documentType || "N/A"}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      placeholder="Enter Shreno Doc No"
                                      value={details.shrenoDocumentNo}
                                      onChange={e => handleDetailChange(doc.id, 'shrenoDocumentNo', e.target.value)}
                                      className="w-full"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      placeholder="Enter Shreno Ref No"
                                      value={details.shrenoReferenceNo}
                                      onChange={e => handleDetailChange(doc.id, 'shrenoReferenceNo', e.target.value)}
                                      className="w-full"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      placeholder="Enter Client Doc No"
                                      value={details.clientDocumentNo}
                                      onChange={e => handleDetailChange(doc.id, 'clientDocumentNo', e.target.value)}
                                      className="w-full"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      placeholder="Enter Client Ref No"
                                      value={details.clientReferenceNo}
                                      onChange={e => handleDetailChange(doc.id, 'clientReferenceNo', e.target.value)}
                                      className="w-full"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      placeholder="Enter days"
                                      value={details.uploadDueDays}
                                      onChange={e => handleDetailChange(doc.id, 'uploadDueDays', e.target.value)}
                                      className="w-full"
                                      min="0"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      placeholder="Enter days"
                                      value={details.responseDueDays}
                                      onChange={e => handleDetailChange(doc.id, 'responseDueDays', e.target.value)}
                                      className="w-full"
                                      min="0"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Select value={details.assignUserId} onValueChange={val => handleDetailChange(doc.id, 'assignUserId', val)}>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select user" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <div className="p-2">
                                          <div className="relative mb-2">
                                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                              placeholder="Search users..."
                                              value={userSearch}
                                              onChange={e => setUserSearchQueries(prev => ({ ...prev, [doc.id]: e.target.value }))}
                                              onKeyDown={e => e.stopPropagation()}
                                              className="pl-8"
                                            />
                                          </div>
                                        </div>
                                        {filteredUsers.length > 0 ? (
                                          filteredUsers.map(u => (
                                            <SelectItem key={u.id} value={u.id}>
                                              <div className="flex flex-col">
                                                <span>{u.name}</span>
                                                <span className="text-xs text-muted-foreground">{u.email}</span>
                                              </div>
                                            </SelectItem>
                                          ))
                                        ) : (
                                          <div className="p-2 text-sm text-muted-foreground">No users found</div>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline" onClick={handleBack} disabled={isLoading}>Cancel</Button>
                        <Button onClick={handleAssign} disabled={isLoading}>
                          {isLoading ? (editingId ? "Updating..." : "Assigning...") : editingId ? "Update Assignment" : "Assign Documents"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default AssignDocument
