import { useState } from "react"
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
import { Search } from "lucide-react"

function CreateTransmission() {
  const [formData, setFormData] = useState({
    customerId: "",
    locationId: "",
    poId: "",
  })
  const [selectedJobs, setSelectedJobs] = useState([])
  const [selectedDocuments, setSelectedDocuments] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(false)

  // Mock customer data - replace with actual API call
  const customers = [
    { id: "1", name: "Customer 1" },
    { id: "2", name: "Customer 2" },
    { id: "3", name: "Customer 3" },
  ]

  // Mock location data - replace with actual API call based on customer
  const locations = {
    "1": [
      { id: "1", name: "Location A", gstNumber: "GST001" },
      { id: "2", name: "Location B", gstNumber: "GST002" },
    ],
    "2": [
      { id: "3", name: "Location C", gstNumber: "GST003" },
      { id: "4", name: "Location D", gstNumber: "GST004" },
    ],
    "3": [
      { id: "5", name: "Location E", gstNumber: "GST005" },
    ],
  }

  // Mock PO data - replace with actual API call based on location
  const purchaseOrders = {
    "1": [
      { id: "1", poNumber: "PO-001" },
      { id: "2", poNumber: "PO-002" },
    ],
    "2": [
      { id: "3", poNumber: "PO-003" },
      { id: "4", poNumber: "PO-004" },
    ],
    "3": [
      { id: "5", poNumber: "PO-005" },
    ],
    "4": [
      { id: "6", poNumber: "PO-006" },
    ],
    "5": [
      { id: "7", poNumber: "PO-007" },
    ],
  }

  // Mock Job data - replace with actual API call based on PO
  const jobs = {
    "1": [
      { id: "1", jobNumber: "JOB-001" },
      { id: "2", jobNumber: "JOB-002" },
    ],
    "2": [
      { id: "3", jobNumber: "JOB-003" },
    ],
    "3": [
      { id: "4", jobNumber: "JOB-004" },
      { id: "5", jobNumber: "JOB-005" },
    ],
    "4": [
      { id: "6", jobNumber: "JOB-006" },
    ],
    "5": [
      { id: "7", jobNumber: "JOB-007" },
    ],
    "6": [
      { id: "8", jobNumber: "JOB-008" },
    ],
    "7": [
      { id: "9", jobNumber: "JOB-009" },
    ],
  }

  // Mock documents - replace with actual API call based on selected jobs
  // Documents are associated with jobs
  const allJobDocuments = {
    "1": [
      {
        id: 1,
        documentCode: "DOC-001",
        documentName: "Sales Invoice",
        documentType: "Invoice",
        jobId: "1",
        jobNumber: "JOB-001",
      },
      {
        id: 2,
        documentCode: "DOC-002",
        documentName: "Purchase Receipt",
        documentType: "Receipt",
        jobId: "1",
        jobNumber: "JOB-001",
      },
    ],
    "2": [
      {
        id: 3,
        documentCode: "DOC-003",
        documentName: "Service Agreement",
        documentType: "Agreement",
        jobId: "2",
        jobNumber: "JOB-002",
      },
      {
        id: 4,
        documentCode: "DOC-004",
        documentName: "Quality Certificate",
        documentType: "Certificate",
        jobId: "2",
        jobNumber: "JOB-002",
      },
    ],
    "3": [
      {
        id: 5,
        documentCode: "DOC-005",
        documentName: "Business License",
        documentType: "License",
        jobId: "3",
        jobNumber: "JOB-003",
      },
    ],
    "4": [
      {
        id: 6,
        documentCode: "DOC-006",
        documentName: "Tax Invoice",
        documentType: "Invoice",
        jobId: "4",
        jobNumber: "JOB-004",
      },
      {
        id: 7,
        documentCode: "DOC-007",
        documentName: "Delivery Receipt",
        documentType: "Receipt",
        jobId: "4",
        jobNumber: "JOB-004",
      },
    ],
    "5": [
      {
        id: 8,
        documentCode: "DOC-008",
        documentName: "Employment Contract",
        documentType: "Contract",
        jobId: "5",
        jobNumber: "JOB-005",
      },
    ],
    "6": [
      {
        id: 9,
        documentCode: "DOC-009",
        documentName: "ISO Certificate",
        documentType: "Certificate",
        jobId: "6",
        jobNumber: "JOB-006",
      },
    ],
    "7": [
      {
        id: 10,
        documentCode: "DOC-010",
        documentName: "Export License",
        documentType: "License",
        jobId: "7",
        jobNumber: "JOB-007",
      },
    ],
    "8": [
      {
        id: 11,
        documentCode: "DOC-011",
        documentName: "Import Permit",
        documentType: "Permit",
        jobId: "8",
        jobNumber: "JOB-008",
      },
    ],
    "9": [
      {
        id: 12,
        documentCode: "DOC-012",
        documentName: "Shipping Bill",
        documentType: "Bill",
        jobId: "9",
        jobNumber: "JOB-009",
      },
    ],
  }

  // Get available locations based on selected customer
  const availableLocations = formData.customerId
    ? locations[formData.customerId] || []
    : []

  // Get available POs based on selected location
  const availablePOs = formData.locationId
    ? purchaseOrders[formData.locationId] || []
    : []

  // Get available jobs based on selected PO
  const availableJobs = formData.poId ? jobs[formData.poId] || [] : []

  // Get all documents for selected jobs
  const allDocuments = selectedJobs.flatMap((jobId) => {
    return allJobDocuments[jobId] || []
  })

  // Get unique document types for filter
  const documentTypes = [
    "all",
    ...new Set(allDocuments.map((doc) => doc.documentType)),
  ]

  // Filter documents based on search and document type
  const filteredDocuments = allDocuments.filter((doc) => {
    const matchesSearch =
      searchQuery === "" ||
      doc.documentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.jobNumber.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType =
      documentTypeFilter === "all" || doc.documentType === documentTypeFilter

    return matchesSearch && matchesType
  })

  // Handle customer change
  const handleCustomerChange = (customerId) => {
    setFormData({
      customerId,
      locationId: "",
      poId: "",
    })
    setSelectedJobs([])
    setSelectedDocuments([])
  }

  // Handle location change
  const handleLocationChange = (locationId) => {
    setFormData((prev) => ({
      ...prev,
      locationId,
      poId: "",
    }))
    setSelectedJobs([])
    setSelectedDocuments([])
  }

  // Handle PO change
  const handlePOChange = (poId) => {
    setFormData((prev) => ({
      ...prev,
      poId,
    }))
    setSelectedJobs([])
    setSelectedDocuments([])
  }

  // Handle job selection toggle
  const handleJobToggle = (jobId) => {
    setSelectedJobs((prev) => {
      const isSelected = prev.includes(jobId)
      if (isSelected) {
        // Remove job and its documents from selection
        const updatedJobs = prev.filter((id) => id !== jobId)
        setSelectedDocuments((docs) =>
          docs.filter((doc) => doc.jobId !== jobId)
        )
        return updatedJobs
      } else {
        return [...prev, jobId]
      }
    })
  }

  // Handle select all jobs
  const handleSelectAllJobs = () => {
    if (selectedJobs.length === availableJobs.length) {
      setSelectedJobs([])
      setSelectedDocuments([])
    } else {
      setSelectedJobs(availableJobs.map((job) => job.id))
    }
  }

  // Handle document selection toggle
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

  // Handle select all documents
  const handleSelectAllDocuments = () => {
    if (selectedDocuments.length === filteredDocuments.length) {
      setSelectedDocuments([])
    } else {
      setSelectedDocuments([...filteredDocuments])
    }
  }

  // Handle create transmission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      console.log("Creating transmission:", {
        customerId: formData.customerId,
        locationId: formData.locationId,
        poId: formData.poId,
        selectedJobs: selectedJobs,
        selectedDocuments: selectedDocuments.map((doc) => ({
          id: doc.id,
          documentCode: doc.documentCode,
          documentName: doc.documentName,
          jobId: doc.jobId,
          jobNumber: doc.jobNumber,
        })),
      })
      setIsLoading(false)
      // Add your API call here
      // Example: await fetch('/api/transmissions', { method: 'POST', body: JSON.stringify({...}) })
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
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Create Transmission</h1>
              <p className="text-muted-foreground">
                Select customer, location, PO, jobs, and documents to create a new
                transmission.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid gap-6">
                {/* Selection Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Select Customer, Location & PO</CardTitle>
                    <CardDescription>
                      Choose the customer, location, and PO to proceed
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customerId">
                          Customer <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={formData.customerId}
                          onValueChange={handleCustomerChange}
                          disabled={isLoading}
                          required
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a customer" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.customerId && (
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
                              {availableLocations.map((location) => (
                                <SelectItem key={location.id} value={location.id}>
                                  {location.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {formData.locationId && (
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
                              {availablePOs.map((po) => (
                                <SelectItem key={po.id} value={po.id}>
                                  {po.poNumber}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Job Selection */}
                {formData.poId && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Select Jobs</CardTitle>
                          <CardDescription>
                            Select one or more jobs to include in the transmission
                          </CardDescription>
                        </div>
                        {availableJobs.length > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAllJobs}
                          >
                            {selectedJobs.length === availableJobs.length
                              ? "Deselect All"
                              : "Select All"}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {availableJobs.length > 0 ? (
                        <div className="space-y-3">
                          {availableJobs.map((job) => (
                            <div
                              key={job.id}
                              className="flex items-center space-x-3 p-3 border rounded-lg"
                            >
                              <Checkbox
                                id={`job-${job.id}`}
                                checked={selectedJobs.includes(job.id)}
                                onCheckedChange={() => handleJobToggle(job.id)}
                              />
                              <Label
                                htmlFor={`job-${job.id}`}
                                className="flex-1 cursor-pointer font-medium"
                              >
                                {job.jobNumber}
                              </Label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No jobs found for the selected PO.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Document Selection */}
                {selectedJobs.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Select Documents</CardTitle>
                          <CardDescription>
                            Select documents from the selected jobs to include in the
                            transmission
                          </CardDescription>
                        </div>
                        {filteredDocuments.length > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAllDocuments}
                          >
                            {selectedDocuments.length === filteredDocuments.length
                              ? "Deselect All"
                              : "Select All"}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Search and Filter */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="space-y-2">
                          <Label htmlFor="search">Search Documents</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="search"
                              type="text"
                              placeholder="Search by code, name, or job number..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="documentTypeFilter">Filter by Document Type</Label>
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
                      {filteredDocuments.length > 0 ? (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[50px]">
                                  <Checkbox
                                    checked={
                                      filteredDocuments.length > 0 &&
                                      selectedDocuments.length ===
                                        filteredDocuments.length
                                    }
                                    onCheckedChange={handleSelectAllDocuments}
                                  />
                                </TableHead>
                                <TableHead className="w-[50px]">S.No</TableHead>
                                <TableHead>Document Code</TableHead>
                                <TableHead>Document Name</TableHead>
                                <TableHead>Document Type</TableHead>
                                <TableHead>Job Number</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredDocuments.map((document, index) => {
                                const isSelected = selectedDocuments.some(
                                  (doc) => doc.id === document.id
                                )
                                return (
                                  <TableRow key={document.id}>
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
                                    <TableCell>{document.documentCode}</TableCell>
                                    <TableCell>{document.documentName}</TableCell>
                                    <TableCell>
                                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                        {document.documentType}
                                      </span>
                                    </TableCell>
                                    <TableCell>{document.jobNumber}</TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          {allDocuments.length === 0
                            ? "No documents found for the selected jobs."
                            : "No documents match your search criteria."}
                        </div>
                      )}

                      {/* Selection Summary */}
                      {selectedDocuments.length > 0 && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                          <p className="text-sm font-medium">
                            {selectedDocuments.length} document(s) selected from{" "}
                            {new Set(selectedDocuments.map((doc) => doc.jobId)).size}{" "}
                            job(s)
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Submit Buttons */}
                {selectedDocuments.length > 0 && (
                  <div className="flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setFormData({
                          customerId: "",
                          locationId: "",
                          poId: "",
                        })
                        setSelectedJobs([])
                        setSelectedDocuments([])
                        setSearchQuery("")
                        setDocumentTypeFilter("all")
                      }}
                      disabled={isLoading}
                    >
                      Reset
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Creating..." : "Create Transmission"}
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default CreateTransmission

