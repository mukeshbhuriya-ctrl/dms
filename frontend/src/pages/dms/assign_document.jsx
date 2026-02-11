import { useState, useEffect } from "react"
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
import { Search, ArrowRight } from "lucide-react"

function AssignDocument() {
  const [formData, setFormData] = useState({
    customerId: "",
    locationId: "",
    poId: "",
    jobIds: [], // Changed to array for multiple jobs
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [customers, setCustomers] = useState([])
  const [allDocuments, setAllDocuments] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all")
  const [selectedDocuments, setSelectedDocuments] = useState([])
  const [currentStep, setCurrentStep] = useState(1) // 1 = selection, 2 = details
  const [documentDetails, setDocumentDetails] = useState({})
  const [userSearchQueries, setUserSearchQueries] = useState({})
  const [error, setError] = useState("")

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

        // Fetch customers and documents in parallel
        const [customersRes, documentsRes] = await Promise.all([
          fetch(`${backendUrl}/api/dcc/get-customers?limit=1000`, {
            method: "GET",
            headers,
            credentials: "include",
          }),
          fetch(`${backendUrl}/api/dcc/document?limit=1000`, {
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

        // Extract data from responses
        const customersData = customersPayload?.data || customersPayload?.customers || []
        const documentsData = documentsPayload?.data || documentsPayload?.documents || []

        setCustomers(customersData)
        setAllDocuments(documentsData)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err?.message || "Failed to load data")
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchData()
  }, [])

  // Dummy document list - replaced with API data
  const _allDocuments = [
    {
      id: 1,
      documentCode: "DOC-001",
      documentName: "Sales Invoice",
      documentType: "Invoice",
    },
    {
      id: 2,
      documentCode: "DOC-002",
      documentName: "Purchase Receipt",
      documentType: "Receipt",
    },
    {
      id: 3,
      documentCode: "DOC-003",
      documentName: "Service Agreement",
      documentType: "Agreement",
    },
    {
      id: 4,
      documentCode: "DOC-004",
      documentName: "Quality Certificate",
      documentType: "Certificate",
    },
    {
      id: 5,
      documentCode: "DOC-005",
      documentName: "Business License",
      documentType: "License",
    },
    {
      id: 6,
      documentCode: "DOC-006",
      documentName: "Tax Invoice",
      documentType: "Invoice",
    },
    {
      id: 7,
      documentCode: "DOC-007",
      documentName: "Delivery Receipt",
      documentType: "Receipt",
    },
    {
      id: 8,
      documentCode: "DOC-008",
      documentName: "Employment Contract",
      documentType: "Contract",
    },
    {
      id: 9,
      documentCode: "DOC-009",
      documentName: "ISO Certificate",
      documentType: "Certificate",
    },
    {
      id: 10,
      documentCode: "DOC-010",
      documentName: "Export License",
      documentType: "License",
    },
  ]

  // Mock users list - replace with actual API call
  const users = [
    { id: "1", name: "John Doe", email: "john@example.com" },
    { id: "2", name: "Jane Smith", email: "jane@example.com" },
    { id: "3", name: "Bob Johnson", email: "bob@example.com" },
    { id: "4", name: "Alice Williams", email: "alice@example.com" },
    { id: "5", name: "Charlie Brown", email: "charlie@example.com" },
  ]

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
        return prev.filter((doc) => doc.id !== document.id)
      } else {
        return [...prev, document]
      }
    })
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selectedDocuments.length === filteredDocuments.length) {
      setSelectedDocuments([])
    } else {
      setSelectedDocuments([...filteredDocuments])
    }
  }

  // Initialize document details when moving to step 2
  const handleNext = () => {
    const details = {}
    selectedDocuments.forEach((doc) => {
      details[doc.id] = {
        shrenoDocumentNo: "",
        shrenoReferenceNo: "",
        clientDocumentNo: "",
        clientReferenceNo: "",
        assignUserId: "",
        uploadDueDays: "",
        responseDueDays: "",
      }
    })
    setDocumentDetails(details)
    setCurrentStep(2)
  }

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
    setCurrentStep(1)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    // Create variable with all selected job IDs
    const jobIds = formData.jobIds || []

    console.log("Selected Job IDs:", jobIds)
    console.log("Total jobs selected:", jobIds.length)
    console.log("Assign document data:", formData)

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      // Add your API call here
      // Use jobIds variable here for API request
    }, 1000)
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Assign Document</h1>
              <p className="text-muted-foreground">
                Select customer, location, PO, and job to assign documents.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
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
                      {formData.jobIds && formData.jobIds.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {formData.jobIds.length} job(s) selected
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Submit Buttons */}
              {formData.jobIds && formData.jobIds.length > 0 && (
                <div className="flex justify-end gap-4 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormData({
                        customerId: "",
                        locationId: "",
                        poId: "",
                        jobIds: [],
                      })
                      setSearchQuery("")
                      setDocumentTypeFilter("all")
                      setSelectedDocuments([])
                      setCurrentStep(1)
                      setDocumentDetails({})
                      setUserSearchQueries({})
                    }}
                    disabled={isLoading}
                  >
                    Reset
                  </Button>
                </div>
              )}
            </form>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Loading State */}
            {isLoadingData && (
              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground">Loading data...</p>
                </CardContent>
              </Card>
            )}

            {/* Document List - Show after job selection */}
            {formData.jobIds && formData.jobIds.length > 0 && !isLoadingData && (
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>Available Documents</CardTitle>
                  <CardDescription>
                    Search and filter documents to assign to this job
                  </CardDescription>
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
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">
                            <Checkbox
                              checked={
                                filteredDocuments.length > 0 &&
                                selectedDocuments.length === filteredDocuments.length
                              }
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
                          filteredDocuments.map((document, index) => {
                            const isSelected = selectedDocuments.some(
                              (doc) => doc.id === document.id
                            )
                            return (
                              <TableRow
                                key={document.id}
                                className={isSelected ? "bg-muted/50" : ""}
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() =>
                                      handleDocumentToggle(document)
                                    }
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {index + 1}
                                </TableCell>
                                <TableCell>
                                  {document.document_number || document.documentCode}
                                </TableCell>
                                <TableCell>
                                  {document.document_name || document.documentName}
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                    {document.document_type?.name || document.documentType || "N/A"}
                                  </span>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="h-24 text-center"
                            >
                              No documents found matching your search criteria.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Results count and Next button */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {filteredDocuments.length} of {allDocuments.length}{" "}
                      documents | Selected: {selectedDocuments.length}
                    </div>
                    {selectedDocuments.length > 0 && (
                      <Button
                        type="button"
                        onClick={handleNext}
                        disabled={isLoading}
                      >
                        Next <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Document Details */}
            {currentStep === 2 && selectedDocuments.length > 0 && (
              <Card className="mt-8">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Document Details</CardTitle>
                      <CardDescription>
                        Enter details for the selected documents
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                    >
                      Back
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
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
                        {selectedDocuments.map((document, index) => {
                          const details = documentDetails[document.id] || {
                            shrenoDocumentNo: "",
                            shrenoReferenceNo: "",
                            clientDocumentNo: "",
                            clientReferenceNo: "",
                            assignUserId: "",
                            uploadDueDays: "",
                            responseDueDays: "",
                          }
                          const userSearch = userSearchQueries[document.id] || ""
                          const filteredUsers = users.filter(
                            (user) =>
                              user.name
                                .toLowerCase()
                                .includes(userSearch.toLowerCase()) ||
                              user.email
                                .toLowerCase()
                                .includes(userSearch.toLowerCase())
                          )

                          return (
                            <TableRow key={document.id}>
                              <TableCell className="font-medium">
                                {index + 1}
                              </TableCell>
                              <TableCell>
                                {document.document_number || document.documentCode}
                              </TableCell>
                              <TableCell>
                                {document.document_name || document.documentName}
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                  {document.document_type?.name || document.documentType || "N/A"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Input
                                  placeholder="Enter Shreno Doc No"
                                  value={details.shrenoDocumentNo}
                                  onChange={(e) =>
                                    handleDetailChange(
                                      document.id,
                                      "shrenoDocumentNo",
                                      e.target.value
                                    )
                                  }
                                  className="w-full"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  placeholder="Enter Shreno Ref No"
                                  value={details.shrenoReferenceNo}
                                  onChange={(e) =>
                                    handleDetailChange(
                                      document.id,
                                      "shrenoReferenceNo",
                                      e.target.value
                                    )
                                  }
                                  className="w-full"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  placeholder="Enter Client Doc No"
                                  value={details.clientDocumentNo}
                                  onChange={(e) =>
                                    handleDetailChange(
                                      document.id,
                                      "clientDocumentNo",
                                      e.target.value
                                    )
                                  }
                                  className="w-full"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  placeholder="Enter Client Ref No"
                                  value={details.clientReferenceNo}
                                  onChange={(e) =>
                                    handleDetailChange(
                                      document.id,
                                      "clientReferenceNo",
                                      e.target.value
                                    )
                                  }
                                  className="w-full"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  placeholder="Enter days"
                                  value={details.uploadDueDays}
                                  onChange={(e) =>
                                    handleDetailChange(
                                      document.id,
                                      "uploadDueDays",
                                      e.target.value
                                    )
                                  }
                                  className="w-full"
                                  min="0"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  placeholder="Enter days"
                                  value={details.responseDueDays}
                                  onChange={(e) =>
                                    handleDetailChange(
                                      document.id,
                                      "responseDueDays",
                                      e.target.value
                                    )
                                  }
                                  className="w-full"
                                  min="0"
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={details.assignUserId}
                                  onValueChange={(value) =>
                                    handleDetailChange(
                                      document.id,
                                      "assignUserId",
                                      value
                                    )
                                  }
                                >
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
                                          onChange={(e) => {
                                            setUserSearchQueries((prev) => ({
                                              ...prev,
                                              [document.id]: e.target.value,
                                            }))
                                          }}
                                          className="pl-8"
                                        />
                                      </div>
                                    </div>
                                    {filteredUsers.length > 0 ? (
                                      filteredUsers.map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                          <div className="flex flex-col">
                                            <span>{user.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                              {user.email}
                                            </span>
                                          </div>
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <div className="p-2 text-sm text-muted-foreground">
                                        No users found
                                      </div>
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

                  {/* Submit Button */}
                  <div className="flex justify-end gap-4 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={async () => {
                        // Create variable with all selected job IDs (always an array)
                        const jobIds = formData.jobIds || []

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

                        // Request body structure (same for single or multiple jobs)
                        const requestBody = {
                          customer_id: formData.customerId,
                          customer_location_id: formData.locationId,
                          po_id: formData.poId,
                          job_ids: jobIds, // Array - will contain 1 or more job IDs
                          documents: documents,
                        }

                        console.log("Request Body:", JSON.stringify(requestBody, null, 2))
                        console.log("Selected Job IDs:", jobIds)
                        console.log("Total jobs selected:", jobIds.length)

                        setIsLoading(true)

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

                          // TODO: Replace with actual API endpoint
                          const res = await fetch(`${backendUrl}/api/dcc/assign-document`, {
                            method: "POST",
                            headers,
                            credentials: "include",
                            body: JSON.stringify(requestBody),
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

                          // Success - reset form or show success message
                          console.log("Documents assigned successfully:", payload)

                          // Reset form
                          setFormData({
                            customerId: "",
                            locationId: "",
                            poId: "",
                            jobIds: [],
                          })
                          setSelectedDocuments([])
                          setCurrentStep(1)
                          setDocumentDetails({})
                          setUserSearchQueries({})
                          setSearchQuery("")
                          setDocumentTypeFilter("all")

                        } catch (err) {
                          console.error("Error assigning documents:", err)
                          setError(err?.message || "Something went wrong")
                        } finally {
                          setIsLoading(false)
                        }
                      }}
                      disabled={isLoading}
                    >
                      {isLoading ? "Assigning..." : "Assign Documents"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default AssignDocument

