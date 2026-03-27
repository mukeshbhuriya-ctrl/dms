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
import { dccService } from "../../services/dcc.service"

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

  // Initial Fetch of Customers with nested locations and POs
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        console.log("Fetching customers...");
        const response = await dccService.getCustomers({ limit: 1000 });
        console.log("Customers response:", response);

        if (response.success && response.data) {
          console.log("Setting customers:", response.data);
          setCustomers(response.data || []);
        } else {
          console.error("Failed to fetch customers:", response);
        }
      } catch (err) {
        console.error("Error fetching customers:", err);
      }
    }
    fetchCustomers()
  }, [])

  // Helper functions to get filtered data
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

  // Get available data based on selections
  const availableLocations = formData.customerId ? getLocationsForCustomer(formData.customerId) : []
  const availablePOs = formData.locationId ? getPOsForLocation(formData.locationId) : []
  const availableJobs = transmissions || []

  // Get communication matrix for selected PO
  const getCommunicationMatrix = () => {
    if (!formData.poId || !formData.customerId) return { shreno: [], client: [] }

    const customer = customers.find(c => c.id === formData.customerId)
    if (!customer) return { shreno: [], client: [] }

    const location = customer.customer_locations?.find(l => l.id === formData.locationId)
    if (!location) return { shreno: [], client: [] }

    const po = location.pos?.find(p => p.id === formData.poId)
    if (!po || !po.po_communication_matrix) return { shreno: [], client: [] }

    const matrix = Array.isArray(po.po_communication_matrix) ? po.po_communication_matrix : []
    const shreno = matrix.filter(m => m.type === 'shreno' || m.type === 'Internal')
    const client = matrix.filter(m => m.type === 'client' || m.type === 'External')

    return { shreno, client }
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
        console.log("Fetching transmissions for PO:", formData.poId);
        const response = await dccService.getTransmissions({ po_id: formData.poId });
        console.log("Transmissions response:", response);

        if (response.success && response.data) {
          // Backend returns { success: true, data: { data: [...], meta: {...} } }
          const transmissionsData = response.data.data || response.data;
          console.log("Setting transmissions:", transmissionsData);
          setTransmissions(transmissionsData);
        } else {
          console.error("Failed to fetch transmissions:", response);
          setTransmissions([]);
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
      setCommunicationMatrix({ shreno: [], client: [] });
      return;
    }

    const fetchTransmissionDetails = async () => {
      setIsLoading(true);
      try {
        console.log("Fetching transmission documents for:", formData.jobId);

        // Get Transmission Documents using service
        const resDocs = await dccService.getTransmissionDocuments({ transmission_id: formData.jobId });
        console.log("Transmission documents response:", resDocs);

        if (resDocs.success) {
          // Map backend data to frontend structure
          // Map backend data to frontend structure
          const mappedDocs = (resDocs.data || []).map(item => {
            const docSource = item.group_document;
            if (!docSource) return null;

            const uploaderName = item.version?.uploader?.name || docSource.user?.name || '';

            return {
              id: docSource.id,
              documentCode: docSource.document?.document_number,
              documentName: docSource.document?.document_name,
              documentType: docSource.document?.document_type?.name || 'Document',
              uploadedBy: uploaderName,
              uploadedDate: new Date(docSource.createdAt).toLocaleDateString(),
              versionNo: item.display_version_no,
              status: item.version?.status || 'Approved'
            };
          }).filter(Boolean);

          setDocuments(mappedDocs);
        } else {
          setDocuments([]);
        }

        // Get Communication Matrix from PO
        const matrix = getCommunicationMatrix()
        setCommunicationMatrix(matrix);

      } catch (error) {
        console.error("Error fetching transmission details", error);
        setDocuments([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTransmissionDetails();
  }, [formData.jobId, formData.customerId, formData.locationId, formData.poId, customers]);


  // Initialize selected emails when dialog opens
  useEffect(() => {
    if (isDialogOpen && formData.poId) {
      const matrix = getCommunicationMatrix()
      const initialSelection = {}
      matrix.shreno.forEach((contact) => {
        initialSelection[contact.id] = true
      })
      matrix.client.forEach((contact) => {
        initialSelection[contact.id] = true
      })
      setSelectedEmails(initialSelection)
    } else if (!isDialogOpen) {
      setSelectedEmails({})
    }
  }, [isDialogOpen, formData.poId])

  // Handle inputs
  const handleCustomerChange = (customerId) => {
    setFormData({ customerId, locationId: "", poId: "", jobId: "" })
    setTransmissions([])
    setDocuments([])
  }

  const handleLocationChange = (locationId) => {
    setFormData((prev) => ({ ...prev, locationId, poId: "", jobId: "" }))
    setTransmissions([])
    setDocuments([])
  }

  const handlePOChange = (poId) => {
    setFormData((prev) => ({ ...prev, poId, jobId: "" }))
    setDocuments([])
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
    // 1. Get selected emails
    const selectedIds = Object.keys(selectedEmails).filter(id => selectedEmails[id]);

    if (selectedIds.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    setIsLoading(true);

    try {
      // 2. Separate emails into To (Client) and CC (Shreno)
      const clientEmails = [];
      const shrenoEmails = [];

      selectedIds.forEach(id => {
        // Handle both string and number IDs (though keys are strings)
        const contactIdStr = id;
        const contactIdNum = parseInt(id);

        // Try matching number ID first if available
        let clientContact = communicationMatrix.client.find(c => c.id === contactIdNum);
        if (!clientContact) clientContact = communicationMatrix.client.find(c => c.id == contactIdStr);

        if (clientContact) {
          clientEmails.push(clientContact.email);
          return;
        }

        let shrenoContact = communicationMatrix.shreno.find(c => c.id === contactIdNum);
        if (!shrenoContact) shrenoContact = communicationMatrix.shreno.find(c => c.id == contactIdStr);

        if (shrenoContact) {
          shrenoEmails.push(shrenoContact.email);
          return;
        }
      });

      console.log("Sending email payload:", {
        transmission_id: formData.jobId,
        client_emails: clientEmails,
        shreno_emails: shrenoEmails
      });

      // 3. Call Service
      const response = await dccService.sendTransmissionEmail({
        transmission_id: formData.jobId,
        client_emails: clientEmails,
        shreno_emails: shrenoEmails
      });

      if (response && response.success) {
        toast.success("Email sent successfully!");
        setIsDialogOpen(false);
        // Clean selection not required as per basic requirement but good UX
      } else {
        const msg = response?.message || "Failed to send email";
        toast.error(msg);
      }
    } catch (error) {
      console.error("Email send error:", error);
      toast.error(error.message || "Failed to send email");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTransmission = transmissions.find(t => t.id === formData.jobId);
  const transmittalStatus = selectedTransmission?.status || 'Pending';
  const isSent = transmittalStatus === 'Sent';

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-auto p-6 flex flex-col">
          <div className="flex-1 flex flex-col w-full">
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
                              {location.location_name || location.name}
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
                              {po.po_number}
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
                              {job.transmission_number}
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
                        {isSent ? "Resend Mail" : "Send Mail"}
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
                          <TableHead>Generated Document No</TableHead>
                          <TableHead>Document Name</TableHead>
                          <TableHead>Uploaded By</TableHead>
                          <TableHead>Uploaded Date</TableHead>
                          <TableHead>Revision/Version No</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Transmittal Status</TableHead>
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
                              <TableCell>{document.uploadedBy}</TableCell>
                              <TableCell>{document.uploadedDate}</TableCell>
                              <TableCell>
                                {document.versionNo ? `Rev ${document.versionNo}` : '-'}
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                                  Approved
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  isSent 
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                                    : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                }`}>
                                  {transmittalStatus}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={8}
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
                    {isLoading ? "Sending..." : (isSent ? "Resend Mail" : "Send Mail")}
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
