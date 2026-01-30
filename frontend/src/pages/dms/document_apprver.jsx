import { useState } from "react"
import { AdminSidebar } from "@/components"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
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
import { Download, CheckCircle, XCircle } from "lucide-react"

function DocumentApprover() {
  const [formData, setFormData] = useState({
    customerId: "",
    locationId: "",
    poId: "",
    jobId: "",
  })
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

  // Dummy document list - replace with actual API call based on job
  const documents = formData.jobId
    ? [
        {
          id: 1,
          documentCode: "DOC-001",
          documentName: "Sales Invoice",
          documentType: "Invoice",
          status: "pending",
          uploadedBy: "John Doe",
          uploadedDate: "2024-01-15",
          fileUrl: "#",
        },
        {
          id: 2,
          documentCode: "DOC-002",
          documentName: "Purchase Receipt",
          documentType: "Receipt",
          status: "approved",
          uploadedBy: "Jane Smith",
          uploadedDate: "2024-01-16",
          fileUrl: "#",
        },
        {
          id: 3,
          documentCode: "DOC-003",
          documentName: "Service Agreement",
          documentType: "Agreement",
          status: "rejected",
          uploadedBy: "Bob Johnson",
          uploadedDate: "2024-01-17",
          fileUrl: "#",
        },
        {
          id: 4,
          documentCode: "DOC-004",
          documentName: "Quality Certificate",
          documentType: "Certificate",
          status: "pending for approval",
          uploadedBy: "Alice Williams",
          uploadedDate: "2024-01-18",
          fileUrl: "#",
        },
        {
          id: 5,
          documentCode: "DOC-005",
          documentName: "Business License",
          documentType: "License",
          status: "approved",
          uploadedBy: "Charlie Brown",
          uploadedDate: "2024-01-19",
          fileUrl: "#",
        },
      ]
    : []

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

  // Handle customer change
  const handleCustomerChange = (customerId) => {
    setFormData({
      customerId,
      locationId: "",
      poId: "",
      jobId: "",
    })
  }

  // Handle location change
  const handleLocationChange = (locationId) => {
    setFormData((prev) => ({
      ...prev,
      locationId,
      poId: "",
      jobId: "",
    }))
  }

  // Handle PO change
  const handlePOChange = (poId) => {
    setFormData((prev) => ({
      ...prev,
      poId,
      jobId: "",
    }))
  }

  // Handle job change
  const handleJobChange = (jobId) => {
    setFormData((prev) => ({
      ...prev,
      jobId,
    }))
  }

  // Handle download
  const handleDownload = (documentId, fileUrl) => {
    // Simulate download
    console.log("Downloading document:", documentId, fileUrl)
    // Add your download logic here
    // Example: window.open(fileUrl, '_blank')
  }

  // Handle approve
  const handleApprove = async (documentId) => {
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      console.log("Approving document:", documentId)
      setIsLoading(false)
      // Add your API call here
      // Example: await fetch(`/api/documents/${documentId}/approve`, { method: 'POST' })
    }, 1000)
  }

  // Handle reject
  const handleReject = async (documentId) => {
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      console.log("Rejecting document:", documentId)
      setIsLoading(false)
      // Add your API call here
      // Example: await fetch(`/api/documents/${documentId}/reject`, { method: 'POST' })
    }, 1000)
  }

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
            Approved
          </span>
        )
      case "rejected":
        return (
          <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
            Rejected
          </span>
        )
      case "pending for approval":
        return (
          <span className="inline-flex items-center rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-600 dark:text-orange-400">
            Pending for Approval
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-gray-500/10 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
            {status}
          </span>
        )
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
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Document Approver</h1>
              <p className="text-muted-foreground">
                Select customer, location, PO, and job to view and approve documents.
              </p>
            </div>

            {/* Selection Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Select Job</CardTitle>
                <CardDescription>
                  Choose the customer, location, PO, and job to view documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerId">
                      Customer <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.customerId}
                      onValueChange={handleCustomerChange}
                      disabled={isLoading}
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

                  {formData.poId && (
                    <div className="space-y-2">
                      <Label htmlFor="jobId">
                        Job Number <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.jobId}
                        onValueChange={handleJobChange}
                        disabled={isLoading || !formData.poId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a job" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableJobs.map((job) => (
                            <SelectItem key={job.id} value={job.id}>
                              {job.jobNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Documents Table */}
            {formData.jobId && (
              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>
                    Review and approve/reject documents for the selected job
                  </CardDescription>
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
                          <TableHead>Uploaded By</TableHead>
                          <TableHead>Uploaded Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[250px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.length > 0 ? (
                          documents.map((document, index) => (
                            <TableRow key={document.id}>
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
                              <TableCell>{document.uploadedBy}</TableCell>
                              <TableCell>{document.uploadedDate}</TableCell>
                              <TableCell>
                                {getStatusBadge(document.status)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleDownload(document.id, document.fileUrl)
                                    }
                                    disabled={isLoading}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleApprove(document.id)}
                                    disabled={
                                      isLoading || document.status === "approved"
                                    }
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleReject(document.id)}
                                    disabled={
                                      isLoading || document.status === "rejected"
                                    }
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="h-24 text-center"
                            >
                              No documents found for the selected job.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
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

export default DocumentApprover

