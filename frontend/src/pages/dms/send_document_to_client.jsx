import { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
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
import { toast } from 'react-toastify';

function SendDocumentToClient() {
  const location = useLocation()
  const [formData, setFormData] = useState({
    customerId: "",
    locationId: "",
    poId: "",
    jobId: "", // This is actually the transmissionId
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedEmails, setSelectedEmails] = useState({})

  // State for data
  const [customers, setCustomers] = useState([])
  const [transmissions, setTransmissions] = useState([])
  const [documents, setDocuments] = useState([])

  // Communications
  const [communicationMatrix, setCommunicationMatrix] = useState({ shreno: [], client: [] })

  // Handle incoming navigation state
  useEffect(() => {
    if (location.state) {
      const { customerId, locationId, poId, jobId } = location.state
      console.log("Pre-filling form:", location.state)
      setFormData(prev => ({
        ...prev,
        customerId: customerId || "",
        locationId: locationId || "",
        poId: poId || "",
        jobId: jobId || ""
      }))
    }
  }, [location.state])

  // Initial Fetch of Customers
  useEffect(() => {
    const fetchCustomers = async () => {
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

        const headers = { "Content-Type": "application/json" }
        if (token) headers["Authorization"] = `Bearer ${token}`

        const res = await fetch(`${backendUrl}/api/dcc/get-customers?limit=1000`, { method: "GET", headers })
        const data = await res.json()
        if (res.ok) {
          setCustomers(data.data || [])
        }
      } catch (err) {
        console.error("Error fetching customers:", err)
      }
    }
    fetchCustomers()
  }, [])

  // Find helpers
  const getLocationsForCustomer = (customerId) => {
    const customer = customers.find(c => c.id === customerId)
    return customer?.customer_locations || []
  }

  const getPOsForLocation = (locationId) => {
    if (!formData.customerId || !locationId) return []
    const customer = customers.find(c => c.id === formData.customerId)
    if (!customer) return []
    const location = customer.customer_locations?.find(loc => loc.id === locationId)
    return location?.pos || []
  }

  // Fetch Transmissions when PO is selected
  useEffect(() => {
    if (!formData.poId) {
      setTransmissions([]);
      return;
    }

    const fetchTransmissions = async () => {
      setIsLoading(true);
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
        const token = JSON.parse(localStorage.getItem("user_auth"))?.payload?.token;

        const res = await fetch(`${backendUrl}/api/dcc/get-transmissions?po_id=${formData.poId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setTransmissions(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching transmissions", error);
        setTransmissions([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTransmissions();
  }, [formData.poId]);

  // Fetch Documents and Communication Matrix when Transmission is selected
  useEffect(() => {
    if (!formData.jobId) {
      setDocuments([]);
      return;
    }

    const fetchTransmissionDetails = async () => {
      setIsLoading(true);
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
        const token = JSON.parse(localStorage.getItem("user_auth"))?.payload?.token;

        // Get Transmission Documents
        const resDocs = await fetch(`${backendUrl}/api/dcc/get-transmission-documents?transmission_id=${formData.jobId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const docsData = await resDocs.json();
        if (resDocs.ok) {
          // Map backend data to frontend structure
          const mappedDocs = (docsData.data || []).map(item => ({
            id: item.single_document.id,
            documentCode: item.single_document.document.document_number,
            documentName: item.single_document.document.document_name,
            documentType: item.single_document.document.document_type || 'Document', // adjust based on schema
            uploadedBy: `${item.single_document.user?.first_name || ''} ${item.single_document.user?.last_name || ''}`.trim(),
            uploadedDate: new Date(item.single_document.createdAt).toLocaleDateString(),
            status: 'Approved' // Transmissions only contain approved documents
          }));
          setDocuments(mappedDocs);
        }

        // Get Communication Matrix from PO
        const customer = customers.find(c => c.id === formData.customerId);
        const location = customer?.customer_locations?.find(l => l.id === formData.locationId);
        const po = location?.pos?.find(p => p.id === formData.poId);

        if (po && po.po_communication_matrix) {
          // Ensure it's an array and filter properly
          const matrix = Array.isArray(po.po_communication_matrix) ? po.po_communication_matrix : [];
          const shreno = matrix.filter(m => m.type === 'shreno' || m.type === 'Internal');
          const client = matrix.filter(m => m.type === 'client' || m.type === 'External');
          setCommunicationMatrix({ shreno, client });
        }

      } catch (error) {
        console.error("Error fetching transmission details", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTransmissionDetails();
  }, [formData.jobId, formData.customerId, formData.locationId, formData.poId, customers]);


  // Initialize selected emails when dialog opens
  useEffect(() => {
    if (isDialogOpen && formData.poId) {
      const initialSelection = {}
      communicationMatrix.shreno.forEach((contact) => {
        initialSelection[contact.id] = true
      })
      communicationMatrix.client.forEach((contact) => {
        initialSelection[contact.id] = true
      })
      setSelectedEmails(initialSelection)
    } else if (!isDialogOpen) {
      setSelectedEmails({})
    }
  }, [isDialogOpen, formData.poId, communicationMatrix])

  // Get available locations and POs
  const availableLocations = formData.customerId ? getLocationsForCustomer(formData.customerId) : []
  const availablePOs = formData.locationId ? getPOsForLocation(formData.locationId) : []

  // Handle inputs
  const handleCustomerChange = (customerId) => {
    setFormData({ customerId, locationId: "", poId: "", jobId: "" })
  }

  const handleLocationChange = (locationId) => {
    setFormData((prev) => ({ ...prev, locationId, poId: "", jobId: "" }))
  }

  const handlePOChange = (poId) => {
    setFormData((prev) => ({ ...prev, poId, jobId: "" }))
  }

  const handleJobChange = (jobId) => {
    setFormData((prev) => ({ ...prev, jobId }))
  }

  const handleEmailToggle = (contactId) => {
    setSelectedEmails((prev) => ({
      ...prev,
      [contactId]: !prev[contactId],
    }))
  }

  const handleSendMail = async () => {
    setIsLoading(true)

    // Get selected email addresses
    const shrenoEmails = communicationMatrix.shreno
      .filter((contact) => selectedEmails[contact.id])
      .map((contact) => contact.email)

    const clientEmails = communicationMatrix.client
      .filter((contact) => selectedEmails[contact.id])
      .map((contact) => contact.email)

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
      const token = JSON.parse(localStorage.getItem("user_auth"))?.payload?.token;

      const response = await fetch(`${backendUrl}/api/dcc/send-transmission-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          transmission_id: formData.jobId,
          shreno_emails: shrenoEmails,
          client_emails: clientEmails
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Email sent successfully!");
        setIsDialogOpen(false);
      } else {
        toast.error("Failed to send email: " + result.message);
      }
    } catch (error) {
      console.error("Send mail error", error);
      toast.error("Error sending email");
    } finally {
      setIsLoading(false);
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
              <h1 className="text-3xl font-bold mb-2">Send Document to Client</h1>
              <p className="text-muted-foreground">
                Select customer, location, PO, and Transmission to send approved documents.
              </p>
            </div>

            {/* Selection Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Select Transmission</CardTitle>
                <CardDescription>
                  Choose the customer, location, PO, and transmission
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
                      disabled={isLoading || customers.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.customer_name || customer.name}
                          </SelectItem>
                        ))}
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
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a location" />
                      </SelectTrigger>
                      <SelectContent>
                        {getLocationsForCustomer(formData.customerId).map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.location_name || location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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
                        {getPOsForLocation(formData.locationId).map((po) => (
                          <SelectItem key={po.id} value={po.id}>
                            {po.po_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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
                        {transmissions.map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.transmission_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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

