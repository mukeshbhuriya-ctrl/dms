import { useState, useEffect, useMemo, useCallback } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Plus, ArrowLeft, Mail, Download, Send, Eye, FileText, AlertCircle } from "lucide-react"
import { toast } from 'react-toastify';
import { dccService } from "../../services/dcc.service";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
import { DataTable } from "@/components/shared/DataTable";
import { exportApi } from "@/api/export.api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function CreateTransmission() {
  const navigate = useNavigate();
  const [view, setView] = useState("list") // 'list' | 'create'

  // --- List View State ---
  const [transmissions, setTransmissions] = useState([])
  const [loadingList, setLoadingList] = useState(false)

  // --- Create View State ---
  const [formData, setFormData] = useState({
    customerId: "",
    locationId: "",
    poId: "",
  })
  const [autoFilled, setAutoFilled] = useState({
    customerId: false,
    locationId: false
  })
  const [customers, setCustomers] = useState([])
  const [allDocuments, setAllDocuments] = useState([]) // Documents for selected PO
  const [selectedDocuments, setSelectedDocuments] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [successData, setSuccessData] = useState(null) // { zip_url, password }
  
  // --- Preview State ---
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [activePreviewDoc, setActivePreviewDoc] = useState(null)

  // --- Send View State ---
  const [activeTransmission, setActiveTransmission] = useState(null)
  const [sendDocuments, setSendDocuments] = useState([])
  const [isSendMailDialogOpen, setIsSendMailDialogOpen] = useState(false)
  const [selectedEmails, setSelectedEmails] = useState({})
  const [communicationMatrix, setCommunicationMatrix] = useState({ shreno: [], client: [] })
  const [isLoadingSend, setIsLoadingSend] = useState(false)

  // --- Job Selection Logic ---
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [jobs, setJobs] = useState([]);

  // --- Initial Data Fetch (Customers for Create View) ---
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await dccService.getCustomers({ limit: 1000 });
      if (res.success) {
        setCustomers(res.data || []);
      } else {
        console.error("Failed to fetch customers:", res.message);
        toast.error("Failed to load customers");
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
      toast.error("Failed to load customers");
    }
  }

  // --- Helpers for Dropdowns ---
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

  // Get all POs from all customers/locations
  const getAllPOs = () => {
    const allPOs = [];
    customers.forEach(customer => {
      customer.customer_locations?.forEach(location => {
        location.pos?.forEach(po => {
          allPOs.push({
            ...po,
            customerName: customer.customer_name,
            locationName: location.location_name
          });
        });
      });
    });
    return allPOs;
  }

  const fetchDocumentsForPO = async (poId, jobIds = []) => {
    setLoadingDocs(true);
    try {
      // Fetch approved documents for this PO
      const params = {
        status_filter: 'done', // Filter by 'Done' status which includes Approved/Uploaded
        approver_status_filter: 'approved', // Ensure strictly approved
        limit: 1000,
        po_id: poId, // Important: Filter by PO
        job_ids: jobIds, // Filter by selected job IDs!
        exclude_transmitted: true // Exclude documents already part of a transmission
      };

      const data = await dccService.getDocumentsForApproval(params);
      if (data.success) {
        setAllDocuments(data.data);
      } else {
        toast.error(data.message || "Failed to load documents");
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoadingDocs(false);
    }
  };

  const fetchJobsForPO = async (poId) => {
    try {
      const res = await dccService.getJobs({ po_id: poId, limit: 1000 });
      if (res.success) {
        setJobs(res.data || []);
      } else {
        toast.error("Failed to load jobs");
      }
    } catch (err) {
      console.error("Error fetching jobs:", err);
    }
  }

  // --- Handlers for Create/Form ---
  const handleCustomerChange = (customerId) => {
    setFormData({ customerId, locationId: "", poId: "" })
    setAutoFilled({ customerId: false, locationId: false })
    setAllDocuments([])
    setJobs([])
    setSelectedDocuments([])
    setSelectedJobs([])
  }

  const handleLocationChange = (locationId) => {
    setFormData((prev) => ({ ...prev, locationId, poId: "" }))
    setAutoFilled((prev) => ({ ...prev, locationId: false }))
    setAllDocuments([])
    setJobs([])
    setSelectedDocuments([])
    setSelectedJobs([])
  }

  const handlePOChange = (poId) => {
    if (poId) {
      // Find the PO in the customer data to auto-fill customer and location
      let foundCustomer = null;
      let foundLocation = null;
      let foundPO = null;

      for (const customer of customers) {
        for (const location of customer.customer_locations || []) {
          const po = location.pos?.find(p => p.id === poId);
          if (po) {
            foundCustomer = customer;
            foundLocation = location;
            foundPO = po;
            break;
          }
        }
        if (foundPO) break;
      }

      if (foundCustomer && foundLocation) {
        // Auto-fill customer and location
        setFormData({
          customerId: foundCustomer.id,
          locationId: foundLocation.id,
          poId: poId
        });
        setAutoFilled({
          customerId: true,
          locationId: true
        });
      } else {
        // Just set the PO if not found (shouldn't happen)
        setFormData((prev) => ({ ...prev, poId }));
      }

      fetchJobsForPO(poId);
    } else {
      setFormData((prev) => ({ ...prev, poId: "" }));
      setAllDocuments([]);
      setJobs([]);
      setSelectedJobs([]);
    }
    setSelectedDocuments([]);
  }

  // --- Job Selection Logic ---
  // Use API fetched jobs
  const uniqueJobs = useMemo(() => jobs, [jobs]);


  // Refetch documents when selectedJobs change
  useEffect(() => {
    if (formData.poId && selectedJobs.length > 0) {
      fetchDocumentsForPO(formData.poId, selectedJobs);
    } else if (formData.poId && selectedJobs.length === 0) {
      setAllDocuments([]);
    }
  }, [selectedJobs, formData.poId]);

  // Use allDocuments directly since they are now server-filtered
  const filteredDocuments = allDocuments;

  const itemsWithSNo = useMemo(() => filteredDocuments.map((doc, index) => ({ ...doc, s_no: index + 1 })), [filteredDocuments]);

  const handleJobToggle = (jobId) => {
    setSelectedJobs(prev => {
      if (prev.includes(jobId)) {
        return prev.filter(j => j !== jobId);
      } else {
        return [...prev, jobId];
      }
    });
  };

  const handleSelectAllJobs = () => {
    if (selectedJobs.length === uniqueJobs.length) {
      setSelectedJobs([]);
    } else {
      setSelectedJobs(uniqueJobs.map(j => j.id));
    }
  }

  // --- Document Selection Logic ---
  const handleSelectAllDocs = (checked) => {
    if (checked) {
      // Select visible documents only or all filtered?
      // Usually all filtered.
      setSelectedDocuments(filteredDocuments.map(d => d.id));
    } else {
      setSelectedDocuments([]);
    }
  };

  const handleSelectOneDoc = (docId, checked) => {
    if (checked) {
      setSelectedDocuments(prev => [...prev, docId]);
    } else {
      setSelectedDocuments(prev => prev.filter(id => id !== docId));
    }
  };

  const handleSubmitTransmission = async () => {
    if (selectedDocuments.length === 0) {
      toast.error("Please select at least one document");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customer_id: formData.customerId,
        customer_location_id: formData.locationId,
        po_id: formData.poId,
        document_ids: selectedDocuments
      };

      const result = await dccService.createTransmission(payload);
      console.log("Create Transmission Result:", result);
      if (result.success) {
        toast.success(`Transmission created successfully!`);
        setView("list");
        setSuccessData(null);
        setFormData({ customerId: "", locationId: "", poId: "" });
        setAllDocuments([]);
        setSelectedDocuments([]);
        setSelectedJobs([]);
      } else {
        const errorMsg = result.message || result.error || "Failed to create transmission";
        console.error("Backend error:", errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Submission error:", error);
      const errorMsg = error.response?.data?.message || error.message || "Failed to create transmission";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleReset = () => {
    setFormData({ customerId: "", locationId: "", poId: "" });
    setAllDocuments([]);
    setSelectedDocuments([]);
    setSelectedJobs([]);
    setView("list"); // Optional: go back to list, or stay in create mode? User implies stay.
    // Actually typically reset clears the form so they can start over.
  };


  const handleExport = async () => {
    try {
      await exportApi.exportModule('transmission');
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Transmission Export failed:", error);
    }
  };

  // --- List View Data Fetching ---
  const fetchTransmissions = useCallback(async ({ page, limit, search, sorting }) => {
    try {
      const params = {
        page,
        limit,
        search,
      };

      const res = await dccService.getTransmissions(params);

      if (res.success && res.data) {
        console.log("Transmissions data:", res.data.data);
        return {
          data: res.data.data || [],
          meta: res.data.meta || {}
        }
      }
      return { data: [], meta: {} };
    } catch (error) {
      console.error("Error fetching transmissions:", error);
      return { data: [], meta: {} };
    }
  }, []);

  // --- Integrated Send View Logic (Ported from SendDocumentToClient) ---

  const getCommunicationMatrixForPO = (poId, customerId, locationId) => {
    if (!poId || !customerId) return { shreno: [], client: [] }

    const customer = customers.find(c => c.id === customerId)
    if (!customer) return { shreno: [], client: [] }

    const location = customer.customer_locations?.find(l => l.id === locationId)
    if (!location) return { shreno: [], client: [] }

    const po = location.pos?.find(p => p.id === poId)
    if (!po || !po.po_communication_matrix) return { shreno: [], client: [] }

    const matrix = Array.isArray(po.po_communication_matrix) ? po.po_communication_matrix : []
    const shreno = matrix.filter(m => m.type === 'shreno' || m.type === 'Internal')
    const client = matrix.filter(m => m.type === 'client' || m.type === 'External')

    return { shreno, client }
  }

  const fetchTransmissionDetailsForSend = async (transmission) => {
    setLoadingDocs(true);
    try {
      const resDocs = await dccService.getTransmissionDocuments({ transmission_id: transmission.id });
      
      if (resDocs.success) {
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
            status: item.version?.status || 'Approved',
            // Pre-calculate document type for robust preview routing
            mimeType: item.version?.mime_type || '', 
            filePath: item.version?.file_path || '',
            file_url: item.version?.id 
              ? `${BACKEND_URL}/api/dcc/document-preview/${item.version.id}/${encodeURIComponent(item.version.file_path.split('/').pop())}`
              : null
          };
        }).filter(Boolean);

        setSendDocuments(mappedDocs);
      } else {
        setSendDocuments([]);
      }

      const matrix = getCommunicationMatrixForPO(transmission.po_id, transmission.customer_id, transmission.customer_location_id)
      setCommunicationMatrix(matrix);

    } catch (error) {
      console.error("Error fetching transmission details", error);
      setSendDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  }

  useEffect(() => {
    if (isSendMailDialogOpen && activeTransmission) {
      const matrix = getCommunicationMatrixForPO(activeTransmission.po_id, activeTransmission.customer_id, activeTransmission.customer_location_id)
      const initialSelection = {}
      matrix.shreno.forEach((contact) => {
        initialSelection[contact.id] = true
      })
      matrix.client.forEach((contact) => {
        initialSelection[contact.id] = true
      })
      setSelectedEmails(initialSelection)
    } else if (!isSendMailDialogOpen) {
      setSelectedEmails({})
    }
  }, [isSendMailDialogOpen, activeTransmission, customers])

  const handleEmailToggle = (contactId) => {
    setSelectedEmails((prev) => ({
      ...prev,
      [contactId]: !prev[contactId],
    }))
  }

  const handleSendMail = async () => {
    const selectedIds = Object.keys(selectedEmails).filter(id => selectedEmails[id]);

    if (selectedIds.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    setIsLoadingSend(true);

    try {
      const clientEmails = [];
      const shrenoEmails = [];

      selectedIds.forEach(id => {
        const contactIdNum = parseInt(id);
        const contactIdStr = id;

        let clientContact = communicationMatrix.client.find(c => c.id === contactIdNum || c.id == contactIdStr);
        if (clientContact) {
            clientEmails.push(clientContact.email);
            return;
        }

        let shrenoContact = communicationMatrix.shreno.find(c => c.id === contactIdNum || c.id == contactIdStr);
        if (shrenoContact) {
            shrenoEmails.push(shrenoContact.email);
            return;
        }
      });

      const response = await dccService.sendTransmissionEmail({
        transmission_id: activeTransmission.id,
        client_emails: clientEmails,
        shreno_emails: shrenoEmails
      });

      if (response && response.success) {
        toast.success("Email sent successfully!");
        setIsSendMailDialogOpen(false);
        setActiveTransmission(prev => ({ ...prev, status: 'Sent' }));
        setRefreshKey(prev => prev + 1);
      } else {
        toast.error(response?.message || "Failed to send email");
      }
    } catch (error) {
      toast.error(error.message || "Failed to send email");
    } finally {
      setIsLoadingSend(false);
    }
  };

  // --- Helper for Status Badge ---
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Approved</span>
      case 'Rejected':
        return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Rejected</span>
      case 'Pending':
      default:
        return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">Pending</span>
    }
  };

  // --- Columns Definition ---

  // List View Columns
  const listColumns = useMemo(() => [
    {
      header: "Transmission No",
      accessorKey: "transmission_number",
      cell: (row) => row?.transmission_number || '-'
    },
    {
      header: "PO Number",
      accessorKey: "po.po_number",
      cell: (row) => row?.po?.po_number || '-'
    },
    {
      header: "Customer",
      accessorKey: "customer.customer_name",
      cell: (row) => row?.customer?.customer_name || '-'
    },
    {
      header: "Document Count",
      id: "document_count",
      cell: (row) => row?.documents?.length || 0
    },
    {
      header: "Password",
      accessorKey: "password",
      cell: (row) => {
        const password = row?.password;
        if (!password) return '-';
        return (
          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
            {password}
          </span>
        );
      }
    },
    {
      header: "Created Date",
      accessorKey: "createdAt",
      cell: (row) => {
        const date = row?.createdAt;
        if (!date) return '-';
        return new Date(date).toISOString().split('T')[0]
      }
    },
    {
      header: "Client Status",
      accessorKey: "client_status",
      cell: (row) => getStatusBadge(row.client_status)
    },
    {
      header: "Actions",
      id: "actions",
      cell: (row) => {
        if (!row) return null;
        return (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              if (row.password) {
                navigator.clipboard.writeText(row.password);
                toast.success("Password copied to clipboard");
              }
            }}>
              Copy Password
            </Button>
            {row.zip_url && (
              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard.writeText(row.zip_url);
                toast.success("Zip URL copied to clipboard");
              }}>
                Copy Zip URL
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={async () => {
                try {
                  const blob = await dccService.downloadTransmittalPDF(row.id);
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Transmittal_${row.transmission_number}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  toast.success("PDF downloaded successfully");
                } catch (error) {
                  toast.error("Failed to download PDF");
                }
              }}
            >
              <Download className="h-4 w-4" />
              Document Transmittal
            </Button>
            {row.client_status === 'Approved' || row.client_status === 'Rejected' ? (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => {
                  setActiveTransmission(row);
                  fetchTransmissionDetailsForSend(row);
                  setView("send");
                }}
              >
                <Eye className="h-4 w-4" />
                View
              </Button>
            ) : (
              <Button
                variant={row.status === 'Sent' ? "secondary" : "default"}
                size="sm"
                className="flex items-center gap-2"
                onClick={() => {
                  setActiveTransmission(row);
                  fetchTransmissionDetailsForSend(row);
                  setView("send");
                }}
              >
                <Mail className="h-4 w-4" />
                {row.status === 'Sent' ? "Resend Mail" : "Send Mail"}
              </Button>
            )}
          </div>
        );
      }
    }
  ], [navigate, customers]);

  // Create View Document Columns
  const documentColumns = useMemo(() => [
    {
      header: () => (
        <Checkbox
          checked={filteredDocuments.length > 0 && selectedDocuments.length === filteredDocuments.length}
          onCheckedChange={(value) => handleSelectAllDocs(!!value)}
          aria-label="Select all"
        />
      ),
      accessorKey: "select",
      cell: (item) => (
        <Checkbox
          checked={selectedDocuments.includes(item.id)}
          onCheckedChange={(checked) => handleSelectOneDoc(item.id, checked)}
          aria-label={`Select ${item.document?.document_number}`}
        />
      ),
      className: "w-[50px]"
    },
    { header: "S.No", accessorKey: "s_no" },
    { header: "Generated Document No", accessorKey: "document.document_number" },
    { header: "Document Name", accessorKey: "document.document_name" },
    {
      header: "Job Number",
      accessorKey: "group.job_group.0.job.job_number",
      cell: (item) => {
        const jobs = item.group?.job_group;
        return jobs && jobs.length > 0 ? jobs.map(j => j.job?.job_number).join(', ') : '-';
      }
    },
    { header: "Revision/Version No", accessorKey: "display_version_no", cell: (item) => item.display_version_no ? `Rev ${item.display_version_no}` : '-' },
    { header: "Status", accessorKey: "status" }
  ], [selectedDocuments, filteredDocuments]);


  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-auto p-6 flex flex-col">
          <div className="flex-1 flex flex-col w-full">

            {/* Header Section */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {view === 'list' ? 'Transmissions' : view === 'send' ? 'Send Documents' : 'Create Transmission'}
                </h1>
                <p className="text-muted-foreground">
                  {view === 'list' 
                    ? 'Manage and view existing transmissions.' 
                    : view === 'send' 
                      ? 'Review documents and send to client.'
                      : 'Select approved documents to create a new transmission.'}
                </p>
              </div>
              <div>
                {view === 'list' ? (
                  <Button onClick={() => setView('create')}>
                    <Plus className="mr-2 h-4 w-4" /> Create Transmission
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => {
                      setView('list');
                      setActiveTransmission(null);
                      setSendDocuments([]);
                  }}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                  </Button>
                )}
              </div>
            </div>

            {/* Content Section */}
            {view === 'list' ? (
              <Card>
                <CardHeader><CardTitle>Transmission List</CardTitle></CardHeader>
                <CardContent>
                  <DataTable
                    columns={listColumns}
                    fetchData={fetchTransmissions}
                    pageCount={0}
                    onExport={handleExport}
                    refreshKey={refreshKey}
                  />
                </CardContent>
              </Card>
            ) : view === 'send' ? (
               <Card>
                 <CardHeader>
                   <div className="flex items-center justify-between">
                     <div>
                       <CardTitle>Approved Documents</CardTitle>
                       <CardDescription>
                         List of approved documents for Transmission {activeTransmission?.transmission_number}
                       </CardDescription>
                     </div>
                     {activeTransmission?.client_status !== 'Approved' && activeTransmission?.client_status !== 'Rejected' && (
                       <Button
                         type="button"
                         onClick={() => setIsSendMailDialogOpen(true)}
                         disabled={isLoadingSend}
                       >
                         <Send className="h-4 w-4 mr-2" />
                         {activeTransmission?.status === 'Sent' ? "Resend Mail" : "Send Mail"}
                       </Button>
                     )}
                   </div>
                 </CardHeader>
                 <CardContent className="pt-6">
                   <div className="rounded-md border bg-white">
                     <Table>
                       <TableHeader>
                         <TableRow>
                           <TableHead className="w-[60px]">S.No</TableHead>
                           <TableHead>Doc Generated No</TableHead>
                           <TableHead>Document Name</TableHead>
                           <TableHead>Uploaded By</TableHead>
                           <TableHead>Uploaded Date</TableHead>
                           <TableHead>Revision</TableHead>
                           <TableHead>Status</TableHead>
                           <TableHead>Transmittal Status</TableHead>
                           <TableHead className="text-right">Actions</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {sendDocuments.length > 0 ? (
                           sendDocuments.map((document, index) => (
                             <TableRow key={document.id}>
                               <TableCell className="font-medium text-slate-500">
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
                                   activeTransmission?.status === 'Sent' 
                                     ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                                     : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                 }`}>
                                   {activeTransmission?.status || 'Pending'}
                                 </span>
                               </TableCell>
                               <TableCell className="text-right">
                                 {document.file_url && (
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     className="h-8 gap-1"
                                     onClick={() => {
                                       setActivePreviewDoc({
                                         documentName: document.documentName,
                                         versionNo: document.versionNo ? `Rev ${document.versionNo}` : '',
                                         mimeType: document.mimeType,
                                         filePath: document.filePath
                                       });
                                       setPreviewUrl(document.file_url);
                                       setIsPreviewOpen(true);
                                     }}
                                   >
                                     <Eye className="h-3.5 w-3.5" />
                                     Preview
                                   </Button>
                                 )}
                               </TableCell>
                             </TableRow>
                           ))
                         ) : (
                           <TableRow>
                             <TableCell
                               colSpan={9}
                               className="h-24 text-center"
                             >
                               {loadingDocs ? "Loading documents..." : "No approved documents found for this transmission."}
                             </TableCell>
                           </TableRow>
                         )}
                       </TableBody>
                     </Table>
                   </div>
                 </CardContent>
               </Card>
            ) : (
              <div className="grid gap-6">
                {/* Selection Context */}
                <Card>
                  <CardHeader>
                    <CardTitle>Selection</CardTitle>
                    <CardDescription>Select customer, location, PO, and job in sequence</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>
                          Customer Name <span className="text-red-500">*</span>
                          {autoFilled.customerId && <span className="ml-2 text-xs text-muted-foreground">(auto-filled)</span>}
                        </Label>
                        <Select value={formData.customerId} onValueChange={handleCustomerChange}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select Customer" /></SelectTrigger>
                          <SelectContent>
                            {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>
                          Location <span className="text-red-500">*</span>
                          {autoFilled.locationId && <span className="ml-2 text-xs text-muted-foreground">(auto-filled)</span>}
                        </Label>
                        <Select value={formData.locationId} onValueChange={handleLocationChange} disabled={!formData.customerId}>
                          <SelectTrigger className="w-full h-auto py-2"><SelectValue placeholder="Select Location" /></SelectTrigger>
                          <SelectContent>
                            {getLocationsForCustomer(formData.customerId).map(l => (
                              <SelectItem key={l.id} value={l.id} className="py-2">
                                <div className="flex flex-col items-start text-left">
                                  <span className="font-medium">{l.location_name}</span>
                                  {l.gst_number && <span className="text-xs text-muted-foreground">GST: {l.gst_number}</span>}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>PO Number <span className="text-red-500">*</span></Label>
                        <Select value={formData.poId} onValueChange={handlePOChange}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select a PO" /></SelectTrigger>
                          <SelectContent>
                            {getAllPOs().map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                <div className="flex flex-col items-start text-left">
                                  <span className="font-medium">{p.po_number}</span>
                                  <span className="text-xs text-muted-foreground">{p.customerName} - {p.locationName}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Job Selection */}
                {formData.poId && uniqueJobs.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <CardTitle>Select Jobs</CardTitle>
                          <CardDescription>Select one or more jobs to include in the transmission</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleSelectAllJobs}>
                          {selectedJobs.length === uniqueJobs.length ? "Deselect All" : "Select All"}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {uniqueJobs.map(job => (
                          <div key={job.id} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50 transition-colors">
                            <Checkbox
                              id={`job-${job.id}`}
                              checked={selectedJobs.includes(job.id)}
                              onCheckedChange={() => handleJobToggle(job.id)}
                            />
                            <Label htmlFor={`job-${job.id}`} className="cursor-pointer font-medium flex-1">
                              {job.job_number}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Document List */}
                {formData.poId && (
                  <Card>
                    <CardHeader>
                      <div className="space-y-1">
                        <CardTitle>Select Approved Documents</CardTitle>
                        <CardDescription>Select documents from the selected jobs to include</CardDescription>
                      </div>

                    </CardHeader>
                    <CardContent>
                      {loadingDocs ? (
                        <div className="text-center py-4">Loading documents...</div>
                      ) : (
                        itemsWithSNo.length > 0 ? (
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[50px]">
                                    <Checkbox
                                      checked={itemsWithSNo.length > 0 && selectedDocuments.length === itemsWithSNo.length}
                                      onCheckedChange={(value) => handleSelectAllDocs(!!value)}
                                      aria-label="Select all"
                                    />
                                  </TableHead>
                                  <TableHead>S.No</TableHead>
                                  <TableHead>Generated Document No</TableHead>
                                  <TableHead>Document Name</TableHead>
                                  <TableHead>Job Number</TableHead>
                                  <TableHead>Revision/Version No</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {itemsWithSNo.map((doc) => (
                                  <TableRow key={doc.id}>
                                    <TableCell>
                                      <Checkbox
                                        checked={selectedDocuments.includes(doc.id)}
                                        onCheckedChange={(checked) => handleSelectOneDoc(doc.id, checked)}
                                        aria-label={`Select ${doc.document.document_number}`}
                                      />
                                    </TableCell>
                                    <TableCell>{doc.s_no}</TableCell>
                                    <TableCell>{doc.document.document_number}</TableCell>
                                    <TableCell>{doc.document.document_name}</TableCell>
                                    <TableCell>
                                      {(() => {
                                        const jobs = doc.group?.job_group;
                                        return jobs && jobs.length > 0 ? jobs.map(j => j.job?.job_number).join(', ') : '-';
                                      })()}
                                    </TableCell>
                                    <TableCell>
                                      {doc.display_version_no ? `v${doc.display_version_no}` : '-'}
                                    </TableCell>
                                    <TableCell>{doc.status}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            {uniqueJobs.length > 0 && selectedJobs.length === 0 ?
                              "Please select at least one job to view documents." :
                              "No approved documents found for this PO."}
                          </div>
                        )
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 mt-4">
                  <Button variant="outline" onClick={handleReset}>
                    Reset
                  </Button>
                  <Button onClick={handleSubmitTransmission} disabled={isSubmitting || selectedDocuments.length === 0}>
                    {isSubmitting ? "Creating..." : "Create Transmission"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
        
        {/* Send Mail Dialog */}
        <Dialog open={isSendMailDialogOpen} onOpenChange={setIsSendMailDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Send Documents via Email</DialogTitle>
              <DialogDescription>
                Select email addresses to send the approved documents for {activeTransmission?.transmission_number}.
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
                    No Shreno contacts found.
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
                    No client contacts found.
                  </p>
                )}
              </div>

              {/* Documents Summary */}
              <div className="space-y-2 pt-2 border-t">
                <h4 className="font-semibold">Documents to Send:</h4>
                <div className="text-sm text-muted-foreground">
                  {sendDocuments.length} approved document(s) will be sent
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSendMailDialogOpen(false)}
                disabled={isLoadingSend}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSendMail}
                disabled={
                  isLoadingSend ||
                  Object.values(selectedEmails).filter(Boolean).length === 0
                }
              >
                {isLoadingSend ? "Sending..." : (activeTransmission?.status === 'Sent' ? "Resend Mail" : "Send Mail")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Document Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="sm:max-w-6xl w-[98vw] h-[95vh] p-0 overflow-hidden border-none shadow-2xl">
            <div className="w-full h-full bg-slate-100 flex items-center justify-center relative">
              {/* Floating Close Button (Optional if the default X is not enough) */}
              {/* <Button 
                variant="secondary" 
                size="icon" 
                className="absolute top-4 right-12 z-50 rounded-full shadow-lg"
                onClick={() => setIsPreviewOpen(false)}
              >
                <Plus className="h-6 w-6 rotate-45" />
              </Button> */}

              {previewUrl ? (
                // Determine support based on MIME type or version's file path extension
                (
                  activePreviewDoc?.mimeType === 'application/pdf' || 
                  activePreviewDoc?.filePath?.toLowerCase().endsWith('.pdf') ||
                  previewUrl.toLowerCase().includes('pdf')
                ) ? (
                  <iframe
                    src={`${previewUrl}#toolbar=0`}
                    className="w-full h-full border-0"
                    title="PDF Preview"
                  />
                ) : (
                  activePreviewDoc?.mimeType?.startsWith('image/') || 
                  /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(activePreviewDoc?.filePath || '') ||
                  /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(previewUrl)
                ) ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      e.target.src = "";
                      e.target.onerror = null;
                      toast.error("Failed to load image preview");
                    }}
                  />
                ) : (
                  // Fallback UI for Excel, Word, etc.
                  <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-dashed rounded-lg">
                    <div className="bg-slate-100 p-4 rounded-full mb-4">
                      <FileText className="h-12 w-12 text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium">
                      Preview not available for this file type.
                    </p>
                    <Button 
                      variant="link" 
                      className="mt-2 text-primary"
                      onClick={() => window.open(previewUrl, '_blank')}
                    >
                      Open in New Tab
                    </Button>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground opacity-40">
                  <Plus className="h-10 w-10 rotate-45" />
                  <p>No preview available</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider >
  )
}

export default CreateTransmission
