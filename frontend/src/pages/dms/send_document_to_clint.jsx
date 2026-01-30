import { useState, useEffect } from "react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Mail, Send } from "lucide-react"

function SendDocumentToClient() {
  const [formData, setFormData] = useState({
    customerId: "",
    locationId: "",
    poId: "",
    jobId: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedEmails, setSelectedEmails] = useState({})

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
      { id: "1", jobNumber: "SHRENO-VENDOR-TR-000001" },
      { id: "2", jobNumber: "SHRENO-VENDOR-TR-000002" },
    ],
    "2": [
      { id: "3", jobNumber: "SHRENO-VENDOR-TR-000003" },
    ],
    "3": [
      { id: "4", jobNumber: "SHRENO-VENDOR-TR-000004" },
      { id: "5", jobNumber: "SHRENO-VENDOR-TR-000005" },
    ],
    "4": [
      { id: "6", jobNumber: "SHRENO-VENDOR-TR-000006" },
    ],
    "5": [
      { id: "7", jobNumber: "SHRENO-VENDOR-TR-000007" },
    ],
    "6": [
      { id: "8", jobNumber: "SHRENO-VENDOR-TR-000008" },
    ],
    "7": [
      { id: "9", jobNumber: "SHRENO-VENDOR-TR-000009" },
    ],
  }

  // Mock PO Communication Matrix - replace with actual API call based on PO
  const poCommunicationMatrix = {
    "1": {
      shreno: [
        { id: "s1", name: "John Doe", email: "john.doe@shreno.com" },
        { id: "s2", name: "Jane Smith", email: "jane.smith@shreno.com" },
        { id: "s3", name: "Bob Johnson", email: "bob.johnson@shreno.com" },
        { id: "s4", name: "Sarah Williams", email: "sarah.williams@shreno.com" },
        { id: "s5", name: "Michael Brown", email: "michael.brown@shreno.com" },
      ],
      client: [
        { id: "c1", name: "Alice Williams", email: "alice.williams@client.com" },
        { id: "c2", name: "Charlie Brown", email: "charlie.brown@client.com" },
        { id: "c3", name: "David Miller", email: "david.miller@client.com" },
        { id: "c4", name: "Emily Davis", email: "emily.davis@client.com" },
      ],
    },
    "2": {
      shreno: [
        { id: "s6", name: "David Lee", email: "david.lee@shreno.com" },
        { id: "s7", name: "Emma Wilson", email: "emma.wilson@shreno.com" },
        { id: "s8", name: "Robert Taylor", email: "robert.taylor@shreno.com" },
      ],
      client: [
        { id: "c5", name: "Frank Miller", email: "frank.miller@client.com" },
        { id: "c6", name: "Grace Anderson", email: "grace.anderson@client.com" },
      ],
    },
    "3": {
      shreno: [
        { id: "s9", name: "Grace Taylor", email: "grace.taylor@shreno.com" },
        { id: "s10", name: "James Martinez", email: "james.martinez@shreno.com" },
        { id: "s11", name: "Lisa Thompson", email: "lisa.thompson@shreno.com" },
        { id: "s12", name: "Kevin White", email: "kevin.white@shreno.com" },
      ],
      client: [
        { id: "c7", name: "Henry Davis", email: "henry.davis@client.com" },
        { id: "c8", name: "Ivy Martinez", email: "ivy.martinez@client.com" },
        { id: "c9", name: "Jack Wilson", email: "jack.wilson@client.com" },
      ],
    },
    "4": {
      shreno: [
        { id: "s13", name: "Nancy Garcia", email: "nancy.garcia@shreno.com" },
        { id: "s14", name: "Oliver Rodriguez", email: "oliver.rodriguez@shreno.com" },
        { id: "s15", name: "Patricia Lewis", email: "patricia.lewis@shreno.com" },
      ],
      client: [
        { id: "c10", name: "Rachel Green", email: "rachel.green@client.com" },
        { id: "c11", name: "Samuel Harris", email: "samuel.harris@client.com" },
        { id: "c12", name: "Tina Clark", email: "tina.clark@client.com" },
        { id: "c13", name: "Victor Young", email: "victor.young@client.com" },
      ],
    },
    "5": {
      shreno: [
        { id: "s16", name: "William King", email: "william.king@shreno.com" },
        { id: "s17", name: "Xavier Wright", email: "xavier.wright@shreno.com" },
        { id: "s18", name: "Yvonne Lopez", email: "yvonne.lopez@shreno.com" },
        { id: "s19", name: "Zachary Hill", email: "zachary.hill@shreno.com" },
      ],
      client: [
        { id: "c14", name: "Amanda Scott", email: "amanda.scott@client.com" },
        { id: "c15", name: "Benjamin Adams", email: "benjamin.adams@client.com" },
      ],
    },
    "6": {
      shreno: [
        { id: "s20", name: "Catherine Baker", email: "catherine.baker@shreno.com" },
        { id: "s21", name: "Daniel Gonzalez", email: "daniel.gonzalez@shreno.com" },
        { id: "s22", name: "Fiona Nelson", email: "fiona.nelson@shreno.com" },
      ],
      client: [
        { id: "c16", name: "George Carter", email: "george.carter@client.com" },
        { id: "c17", name: "Hannah Mitchell", email: "hannah.mitchell@client.com" },
        { id: "c18", name: "Isaac Perez", email: "isaac.perez@client.com" },
        { id: "c19", name: "Julia Roberts", email: "julia.roberts@client.com" },
      ],
    },
    "7": {
      shreno: [
        { id: "s23", name: "Kyle Turner", email: "kyle.turner@shreno.com" },
        { id: "s24", name: "Laura Phillips", email: "laura.phillips@shreno.com" },
        { id: "s25", name: "Mark Campbell", email: "mark.campbell@shreno.com" },
        { id: "s26", name: "Nicole Parker", email: "nicole.parker@shreno.com" },
        { id: "s27", name: "Oscar Evans", email: "oscar.evans@shreno.com" },
      ],
      client: [
        { id: "c20", name: "Paul Edwards", email: "paul.edwards@client.com" },
        { id: "c21", name: "Quinn Collins", email: "quinn.collins@client.com" },
        { id: "c22", name: "Rebecca Stewart", email: "rebecca.stewart@client.com" },
      ],
    },
  }

  // Dummy document list - replace with actual API call based on job
  // Only show approved documents
  const allDocuments = formData.jobId
    ? [
        {
          id: 1,
          documentCode: "DOC-001",
          documentName: "Sales Invoice",
          documentType: "Invoice",
          status: "approved",
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
          status: "approved",
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
        {
          id: 6,
          documentCode: "DOC-006",
          documentName: "Tax Invoice",
          documentType: "Invoice",
          status: "pending for approval",
          uploadedBy: "David Lee",
          uploadedDate: "2024-01-20",
          fileUrl: "#",
        },
      ]
    : []

  // Filter only approved documents
  const documents = allDocuments.filter((doc) => doc.status === "approved")

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

  // Get communication matrix for selected PO
  const communicationMatrix = formData.poId
    ? poCommunicationMatrix[formData.poId] || { shreno: [], client: [] }
    : { shreno: [], client: [] }

  // Initialize selected emails when dialog opens
  useEffect(() => {
    if (isDialogOpen && formData.poId) {
      const matrix = poCommunicationMatrix[formData.poId] || { shreno: [], client: [] }
      const initialSelection = {}
      matrix.shreno.forEach((contact) => {
        initialSelection[contact.id] = true
      })
      matrix.client.forEach((contact) => {
        initialSelection[contact.id] = true
      })
      setSelectedEmails(initialSelection)
    } else if (!isDialogOpen) {
      // Reset when dialog closes
      setSelectedEmails({})
    }
  }, [isDialogOpen, formData.poId])

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

  // Handle email checkbox toggle
  const handleEmailToggle = (contactId) => {
    setSelectedEmails((prev) => ({
      ...prev,
      [contactId]: !prev[contactId],
    }))
  }

  // Handle send mail
  const handleSendMail = async () => {
    setIsLoading(true)

    // Get selected email addresses
    const shrenoEmails = communicationMatrix.shreno
      .filter((contact) => selectedEmails[contact.id])
      .map((contact) => contact.email)

    const clientEmails = communicationMatrix.client
      .filter((contact) => selectedEmails[contact.id])
      .map((contact) => contact.email)

    // Simulate API call
    setTimeout(() => {
      console.log("Sending documents to:", {
        shrenoEmails,
        clientEmails,
        documents: documents.map((doc) => doc.id),
        jobId: formData.jobId,
        poId: formData.poId,
      })
      setIsLoading(false)
      setIsDialogOpen(false)
      // Add your API call here
      // Example: await fetch('/api/send-documents', { method: 'POST', body: JSON.stringify({...}) })
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
              <h1 className="text-3xl font-bold mb-2">Send Document to Client</h1>
              <p className="text-muted-foreground">
                Select customer, location, PO, and job to send approved documents to
                clients.
              </p>
            </div>

            {/* Selection Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Select Transmission</CardTitle>
                <CardDescription>
                  Choose the customer, location, PO, and transmission to view approved documents
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
                        Transmission Number <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.jobId}
                        onValueChange={handleJobChange}
                        disabled={isLoading || !formData.poId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a transmission" />
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Approved Documents</CardTitle>
                      <CardDescription>
                        List of approved documents ready to be sent to client
                      </CardDescription>
                    </div>
                    {documents.length > 0 && (
                      <Button
                        type="button"
                        onClick={() => setIsDialogOpen(true)}
                        disabled={isLoading}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Mail
                      </Button>
                    )}
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
                          <TableHead>Uploaded By</TableHead>
                          <TableHead>Uploaded Date</TableHead>
                          <TableHead>Status</TableHead>
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
                                <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                                  Approved
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="h-24 text-center"
                            >
                              No approved documents found for the selected transmission.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Send Mail Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Send Documents via Email</DialogTitle>
                  <DialogDescription>
                    Select email addresses to send the approved documents. All emails
                    are selected by default.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Shreno Communication */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Shreno Communication</h3>
                    </div>
                    {communicationMatrix.shreno.length > 0 ? (
                      <div className="space-y-3 pl-7">
                        {communicationMatrix.shreno.map((contact) => (
                          <div
                            key={contact.id}
                            className="flex items-center space-x-3 p-3 border rounded-lg"
                          >
                            <Checkbox
                              id={`shreno-${contact.id}`}
                              checked={selectedEmails[contact.id] || false}
                              onCheckedChange={() => handleEmailToggle(contact.id)}
                            />
                            <Label
                              htmlFor={`shreno-${contact.id}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="font-medium">{contact.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {contact.email}
                              </div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground pl-7">
                        No Shreno contacts found for this PO.
                      </p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t"></div>

                  {/* Client Side Communication */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Client Side Communication</h3>
                    </div>
                    {communicationMatrix.client.length > 0 ? (
                      <div className="space-y-3 pl-7">
                        {communicationMatrix.client.map((contact) => (
                          <div
                            key={contact.id}
                            className="flex items-center space-x-3 p-3 border rounded-lg"
                          >
                            <Checkbox
                              id={`client-${contact.id}`}
                              checked={selectedEmails[contact.id] || false}
                              onCheckedChange={() => handleEmailToggle(contact.id)}
                            />
                            <Label
                              htmlFor={`client-${contact.id}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="font-medium">{contact.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {contact.email}
                              </div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground pl-7">
                        No client contacts found for this PO.
                      </p>
                    )}
                  </div>

                  {/* Documents Summary */}
                  <div className="space-y-2 pt-2 border-t">
                    <h4 className="font-semibold">Documents to Send:</h4>
                    <div className="text-sm text-muted-foreground">
                      {documents.length} approved document(s) will be sent
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSendMail}
                    disabled={
                      isLoading ||
                      Object.values(selectedEmails).filter(Boolean).length === 0
                    }
                  >
                    {isLoading ? "Sending..." : "Send Mail"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default SendDocumentToClient

