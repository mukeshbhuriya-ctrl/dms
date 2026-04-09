import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Search, Plus, ArrowLeft, Mail, Download, Send, Eye, FileText, AlertCircle, ChevronLeft, ChevronRight, X, ChevronDown, Check } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
import { DocumentPreviewDialog } from "@/components/shared/DocumentPreviewDialog"

function CreateTransmission() {
  const navigate = useNavigate();
  const [view, setView] = useState("list") // 'list' | 'create'

  // --- Transmittal Preview Helper ---
  const handlePreviewTransmittal = (id) => {
    if (!id) return;
    const url = `${BACKEND_URL}/api/dcc/preview-transmittal-pdf/${id}`;
    setActivePreviewDoc({
      documentName: "Generated Transmittal Doc",
      mimeType: "application/pdf"
    });
    setPreviewUrl(url);
    setIsPreviewOpen(true);
  };

  // --- List View State ---
  const [transmissions, setTransmissions] = useState([])
  const [loadingList, setLoadingList] = useState(false)

  // --- Create View State ---
  const [selectedDocuments, setSelectedDocuments] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [activeListFilters, setActiveListFilters] = useState({ customers: [], pos: [] });
  const [activeSelectionFilters, setActiveSelectionFilters] = useState({ customers: [], pos: [], jobs: [] });
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [successData, setSuccessData] = useState(null) // { zip_url, password }
  const [allJobs, setAllJobs] = useState([]) // For dropdown filters

  // --- Core State ---
  const [currentDocs, setCurrentDocs] = useState([]) // Store current page docs for metadata lookup
  const [customers, setCustomers] = useState([])

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
  const [currentSearchParams, setCurrentSearchParams] = useState({ search: '', columnFilters: {} })
  const [isSelectingAll, setIsSelectingAll] = useState(false)
  const [includeZipDownload, setIncludeZipDownload] = useState(true)

  // --- Initial Data Fetch (Customers & Jobs for metadata lookup/filtering) ---
  useEffect(() => {
    fetchActiveListFilters();
    fetchActiveSelectionFilters();
    fetchCustomers();
    fetchAllJobs();
  }, [refreshKey]);

  const fetchActiveListFilters = async () => {
    try {
      const res = await dccService.getTransmissionFilters();
      if (res.success) setActiveListFilters(res.data);
    } catch (err) {
      console.error("Error fetching list filters:", err);
    }
  };

  const fetchActiveSelectionFilters = async () => {
    try {
      // is_transmittable=true means only those with approved documents not yet sent
      const res = await dccService.getActiveFilters({ is_transmittable: 'true' });
      if (res.success) setActiveSelectionFilters(res.data);
    } catch (err) {
      console.error("Error fetching selection filters:", err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await dccService.getCustomers();
      if (res.success) {
        setCustomers(res.data || []);
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
    }
  }

  const fetchAllJobs = async () => {
    try {
      const res = await dccService.getJobs();
      if (res.success) {
        setAllJobs(res.data || []);
      }
    } catch (err) {
      console.error("Error fetching all jobs:", err);
    }
  }

  // --- Memoized Filter Options ---
  const clientFilterOptions = useMemo(() => {
    return customers.map(c => ({ label: c.customer_name, value: c.customer_name }))
  }, [customers]);

  const poFilterOptions = useMemo(() => {
    const pos = customers.flatMap(c =>
      c.customer_locations?.flatMap(l => l.pos?.map(p => p.po_number) || []) || []
    );
    return [...new Set(pos)].map(p => ({ label: p, value: p }));
  }, [customers]);

  const jobFilterOptions = useMemo(() => {
    return allJobs.map(j => ({ label: j.job_number, value: j.job_number }))
  }, [allJobs]);

  const fetchApprovedDocuments = useCallback(async ({ page, limit, search, columnFilters }) => {
    setLoadingDocs(true);
    try {
      const params = {
        page,
        limit,
        search,
        status_filter: 'done',
        approver_status_filter: 'approved',
        exclude_transmitted: true
      };

      if (columnFilters) {
        if (columnFilters.customer_name) params.customer_name_filter = columnFilters.customer_name;
        if (columnFilters.po_number) params.po_number_filter = columnFilters.po_number;
        if (columnFilters.job_number) params.job_number_filter = columnFilters.job_number;
      }

      const response = await dccService.getDocumentsForApproval(params);
      if (response.success) {
        const mappedData = (response.data || []).map((doc, index) => ({
          ...doc,
          s_no: (page - 1) * limit + index + 1
        }));
        setCurrentDocs(mappedData);
        return {
          data: mappedData,
          meta: response.meta || {}
        };
      }
      return { data: [], meta: {} };
    } catch (error) {
      console.error("Error fetching documents:", error);
      return { data: [], meta: {} };
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  // --- Helpers for Dropdowns (Used in Send View) ---
  const getCommunicationMatrixForPO = (poId, customerId, locationId) => {
    // DIAGNOSTIC LOGGING
    console.log("getCommunicationMatrixForPO inputs:", { poId, customerId, locationId });
    console.log("Customers in state count:", customers.length);

    if (!poId || !customerId) return { shreno: [], client: [] }

    // Robust search with string-based ID comparison
    const customer = customers.find(c => String(c.id) === String(customerId))
    if (!customer) {
      console.warn("Customer not found for ID:", customerId);
      return { shreno: [], client: [] }
    }

    const location = customer.customer_locations?.find(l => String(l.id) === String(locationId))
    if (!location) {
      console.warn("Location not found for ID:", locationId, "in customer locations:", customer.customer_locations?.length);
      return { shreno: [], client: [] }
    }

    const po = location.pos?.find(p => String(p.id) === String(poId))
    if (!po) {
      console.warn("PO not found for ID:", poId, "in location POs:", location.pos?.length);
      return { shreno: [], client: [] }
    }

    if (!po.po_communication_matrix) {
      console.warn("PO has no communication matrix:", po.po_number);
      return { shreno: [], client: [] }
    }

    const matrix = Array.isArray(po.po_communication_matrix) ? po.po_communication_matrix : []
    const shreno = matrix.filter(m => m.type === 'shreno' || m.type === 'Internal')
    const client = matrix.filter(m => m.type === 'client' || m.type === 'External')
    return { shreno, client }
  }

  const onSelectionReset = useCallback(() => {
    setSelectedDocuments([]);
  }, []);

  const handleParamsChange = (params) => {
    const { search, columnFilters } = params;

    // Check if meaningful filters changed (ignoring page/pageSize for selection reset)
    const filtersChanged =
      search !== currentSearchParams.search ||
      JSON.stringify(columnFilters) !== JSON.stringify(currentSearchParams.columnFilters);

    if (filtersChanged) {
      onSelectionReset();
      setCurrentSearchParams({ search, columnFilters });
    }
  };

  const handleToggleSelectAll = async (checked, currentFilters) => {
    if (checked) {
      setIsSelectingAll(true);
      try {
        const params = {
          search: currentFilters.search,
          status_filter: 'done',
          approver_status_filter: 'approved',
          exclude_transmitted: true
        };

        if (currentFilters.columnFilters) {
          if (currentFilters.columnFilters.customer_name) params.customer_name_filter = currentFilters.columnFilters.customer_name;
          if (currentFilters.columnFilters.po_number) params.po_number_filter = currentFilters.columnFilters.po_number;
          if (currentFilters.columnFilters.job_number) params.job_number_filter = currentFilters.columnFilters.job_number;
        }

        const response = await dccService.getDocumentsForApproval(params);
        if (response.success) {
          const allDocs = response.data || [];
          // Validate all docs belong to same Customer & PO
          if (allDocs.length > 0) {
            const firstPo = allDocs[0].po_id;
            const firstCustomer = allDocs[0].customer_id;
            const mixedPo = allDocs.some(d => d.po_id !== firstPo);
            const mixedCustomer = allDocs.some(d => d.customer_id !== firstCustomer);
            if (mixedCustomer || mixedPo) {
              toast.warn("Cannot select all — filtered documents belong to different POs or Customers. Please filter by a specific PO first.");
              setIsSelectingAll(false);
              return;
            }
          }
          const allDocIds = allDocs.map(d => d.id);
          setSelectedDocuments(allDocIds);
        }
      } catch (err) {
        console.error("Error selecting all filtered documents:", err);
      } finally {
        setIsSelectingAll(false);
      }
    } else {
      setSelectedDocuments([]);
    }
  };


  const handleSubmitTransmission = async () => {
    if (selectedDocuments.length === 0) {
      toast.error("Please select at least one document");
      return;
    }

    setIsSubmitting(true);
    try {
      // Find metadata from the first selected document
      const docResponse = await dccService.getDocumentsForApproval({
        limit: 1,
        document_id: selectedDocuments[0],
        approver_status_filter: 'approved'
      });

      if (!docResponse.success || !docResponse.data[0]) {
        toast.error("Could not determine metadata for selected documents.");
        setIsSubmitting(false);
        return;
      }

      const firstDoc = docResponse.data[0];

      // Final validation: ensure all selected documents belong to same PO
      if (selectedDocuments.length > 1) {
        const allDocsResponse = await dccService.getDocumentsForApproval({
          approver_status_filter: 'approved'
        });
        if (allDocsResponse.success) {
          const selectedDocs = (allDocsResponse.data || []).filter(d => selectedDocuments.includes(d.id));
          const mixedPo = selectedDocs.some(d => d.po_id !== firstDoc.po_id);
          const mixedCustomer = selectedDocs.some(d => d.customer_id !== firstDoc.customer_id);
          if (mixedCustomer) {
            toast.error("Selected documents belong to different Customers. A transmission must contain documents from a single Customer.");
            setIsSubmitting(false);
            return;
          }
          if (mixedPo) {
            toast.error("Selected documents belong to different POs. A transmission must contain documents from a single PO.");
            setIsSubmitting(false);
            return;
          }
        }
      }

      const payload = {
        customer_id: firstDoc.customer_id,
        customer_location_id: firstDoc.customer_location_id,
        po_id: firstDoc.po_id,
        document_ids: selectedDocuments
      };

      const result = await dccService.createTransmission(payload);
      if (result.success) {
        toast.success(`Transmission created successfully!`);
        setView("list");
        setSelectedDocuments([]);
        setRefreshKey(prev => prev + 1);
      } else {
        toast.error(result.message || "Failed to create transmission");
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error(error.message || "Failed to create transmission");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleReset = () => {
    setSelectedDocuments([]);
    setView("list");
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
  const fetchTransmissions = useCallback(async ({ page, limit, search }) => {
    try {
      const res = await dccService.getTransmissions({ page, limit, search });
      if (res.success && res.data) {
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

  // --- Send View Logic ---
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
      setCommunicationMatrix(matrix); // CRITICAL FIX: Update the matrix state for the dialog UI

      const initialSelection = {}
      matrix.shreno.forEach((contact) => initialSelection[contact.id] = true)
      matrix.client.forEach((contact) => initialSelection[contact.id] = true)
      setSelectedEmails(initialSelection)
    }
  }, [isSendMailDialogOpen, activeTransmission, customers])

  const handleEmailToggle = (contactId) => {
    setSelectedEmails((prev) => ({ ...prev, [contactId]: !prev[contactId] }))
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
        let clientContact = communicationMatrix.client.find(c => c.id == id);
        if (clientContact) { clientEmails.push(clientContact.email); return; }
        let shrenoContact = communicationMatrix.shreno.find(c => c.id == id);
        if (shrenoContact) shrenoEmails.push(shrenoContact.email);
      });
      const response = await dccService.sendTransmissionEmail({
        transmission_id: activeTransmission.id,
        client_emails: clientEmails,
        shreno_emails: shrenoEmails,
        include_zip: includeZipDownload
      });
      if (response && response.success) {
        toast.success("Email sent successfully!");
        setIsSendMailDialogOpen(false);
        setView("list");
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

  // --- Columns Definition ---

  // List View Columns
  const listColumns = useMemo(() => [
    {
      header: "Transmission No",
      accessorKey: "transmission_number",
      cell: (row) => row?.transmission_number || '-'
    },
    { 
      header: "Customer", 
      id: "customer_name",
      filterType: 'select',
      accessorKey: "customer.customer_name" 
    },
    { 
      header: "PO Number", 
      id: "po_number",
      filterType: 'select',
      accessorKey: "po.po_number" 
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
      cell: (row) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.client_status === 'Approved' ? 'bg-green-100 text-green-800' :
          row.client_status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
          {row.client_status || 'Pending'}
        </span>
      )
    },
    {
      header: "Actions",
      id: "actions",
      cell: (row) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            if (row.password) {
              navigator.clipboard.writeText(row.password);
              toast.success("Password copied to clipboard");
            }
          }}>
            Copy Pass
          </Button>
          {row.zip_url && (
            <Button variant="outline" size="sm" onClick={() => {
              navigator.clipboard.writeText(row.zip_url);
              toast.success("Zip URL copied to clipboard");
            }}>
              Copy URL
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
                a.click();
              } catch (error) { toast.error("Failed to download PDF"); }
            }}
          >
            <Download className="h-4 w-4" /> PDF
          </Button>
          {row.client_status === 'Approved' || row.client_status === 'Rejected' || row.client_status === 'Partially Approved' ? (
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
              {row.status === 'Sent' ? "Resend" : "Send"}
            </Button>
          )}
        </div>
      )
    }
  ], []);

  // Create View Document Columns (REF: assign_document.jsx style)
  const documentColumns = useMemo(() => [
    {
      id: "select",
      header: "Select",
      cell: (row) => (
        <Checkbox
          checked={selectedDocuments.includes(row.id)}
          onCheckedChange={(checked) => {
            if (checked) {
              // Validate: all selected documents must be from the same PO & Customer
              if (selectedDocuments.length > 0) {
                const firstSelectedDoc = currentDocs.find(d => d.id === selectedDocuments[0]);
                if (firstSelectedDoc) {
                  // Check Customer match
                  if (row.customer_id !== firstSelectedDoc.customer_id) {
                    toast.warn("All documents in a transmission must belong to the same Customer.");
                    return;
                  }
                  // Check PO match
                  if (row.po_id !== firstSelectedDoc.po_id) {
                    toast.warn("All documents in a transmission must belong to the same PO. Multiple jobs within the same PO are allowed.");
                    return;
                  }
                }
              }
              setSelectedDocuments(prev => [...prev, row.id]);
            } else {
              setSelectedDocuments(prev => prev.filter(id => id !== row.id));
            }
          }}
        />
      ),
      className: "w-[50px]"
    },
    { header: "S.No", accessorKey: "s_no", className: "w-[60px]" },
    { header: "System Doc ID", accessorKey: "document.document_number" },
    { header: "Document Name", accessorKey: "document.document_name" },
    {
      id: "customer_name",
      header: "Client",
      accessorKey: "customer.customer_name",
      filterType: "select",
      filterOptions: clientFilterOptions,
      cell: (row) => row.customer?.customer_name || "-",
    },
    {
      id: "po_number",
      header: "PO",
      accessorKey: "po.po_number",
      filterType: "select",
      filterOptions: poFilterOptions,
      cell: (row) => row.po?.po_number || "-",
    },
    {
      id: "job_number",
      header: "Job Number",
      accessorKey: "job_number",
      filterType: "select",
      isMulti: true,
      filterOptions: jobFilterOptions,
      cell: (row) => row.group?.job_group?.[0]?.job?.job_number || "-",
    },
    {
      header: "Revision",
      accessorKey: "display_version_no",
      cell: (row) => (row.display_version_no !== null && row.display_version_no !== undefined) ? `${row.display_version_no}` : '-'
    }
  ], [selectedDocuments, clientFilterOptions, poFilterOptions, jobFilterOptions]);

  // Send View Columns (DataTable version)
  const sendDocumentColumns = useMemo(() => [
    {
      header: "S.No",
      id: "s_no",
      cell: (row, idx) => idx + 1,
      className: "w-[60px]"
    },
    {
      header: "System Doc ID",
      accessorKey: "documentCode"
    },
    {
      header: "Document Name",
      accessorKey: "documentName"
    },
    {
      header: "Uploaded By",
      accessorKey: "uploadedBy"
    },
    {
      header: "Uploaded Date",
      accessorKey: "uploadedDate"
    },
    {
      header: "Revision",
      accessorKey: "versionNo",
      cell: (row) => (row.versionNo !== null && row.versionNo !== undefined) ? `${row.versionNo}` : '-'
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row) => (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
          {row.status}
        </span>
      )
    },
    {
      header: "Action",
      id: "action",
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setActivePreviewDoc(row);
            setPreviewUrl(row.file_url);
            setIsPreviewOpen(true);
          }}
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
      )
    }
  ], []);


  return (
    <>
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
            <div className="flex gap-2">
              {view === 'list' ? (
                <Button onClick={() => { setView('create'); setSelectedDocuments([]); }}>
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
                <TransmissionListTable
                  columns={listColumns}
                  fetchData={dccService.getTransmissions}
                  onExport={handleExport}
                  refreshKey={refreshKey}
                  customers={activeListFilters.customers}
                  pos={activeListFilters.pos}
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
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <DataTable
                  columns={sendDocumentColumns}
                  initialData={sendDocuments}
                  fetchData={async () => ({ data: sendDocuments, meta: { total: sendDocuments.length, page: 1, totalPages: 1 } })} // Static data for now
                />

                {activeTransmission?.client_status !== 'Approved' && activeTransmission?.client_status !== 'Rejected' && activeTransmission?.client_status !== 'Partially Approved' && (
                  <div className="mt-8 space-y-4 border-t pt-6">
                    {/* Row 1: Transmittal Row (Pure Neutral Tones) */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border border-slate-200 rounded-2xl">
                      {/* Left: Metadata */}
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                          <FileText className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">Documents</h4>
                        </div>
                      </div>

                      {/* Right: Actions (Check FIRST, then Preview) */}
                      <div className="flex items-center gap-3 bg-white p-1.5 pr-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center space-x-3 px-3">
                          <Checkbox
                            id="include-zip-card"
                            checked={includeZipDownload}
                            onCheckedChange={(checked) => setIncludeZipDownload(!!checked)}
                            className="h-5 w-5 border-slate-300 data-[state=checked]:bg-slate-700 data-[state=checked]:border-slate-700"
                          />
                          <Label
                            htmlFor="include-zip-card"
                            className="cursor-pointer text-sm font-bold text-slate-700"
                          >
                            Include documents ZIP
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Final Action (Primary Send) */}
                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        onClick={() => setIsSendMailDialogOpen(true)}
                        disabled={isLoadingSend}
                        className="px-10 h-12 text-base font-bold shadow-[0_10px_20px_-5px_rgba(0,0,0,0.2)] hover:shadow-2xl transition-all rounded-xl"
                      >
                        {activeTransmission?.status === 'Sent' ? "Resend Mail" : "Send Mail"}
                        <Send className="h-5 w-5 ml-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            /* CREATE VIEW */
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Select Approved Documents</CardTitle>
                  <CardDescription>
                    Filter and select one or more documents to include in the new transmission.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DocumentSelectionTable
                    columns={documentColumns}
                    fetchData={fetchApprovedDocuments}
                    onSelectionReset={onSelectionReset}
                    selectedDocuments={selectedDocuments}
                    setSelectedDocuments={setSelectedDocuments}
                    handleToggleSelectAll={handleToggleSelectAll}
                    isSelectingAll={isSelectingAll}
                    customers={activeSelectionFilters.customers}
                    allJobs={activeSelectionFilters.jobs}
                  />

                  {/* BOTTOM ACTION BUTTONS */}
                  <div className="flex justify-end gap-2 mt-6">
                    <Button variant="destructive" onClick={handleReset}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmitTransmission} disabled={isSubmitting || selectedDocuments.length === 0}>
                      {isSubmitting ? "Creating..." : "Create Transmission"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
                <FileText className="h-5 w-5 text-primary" />
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
                  No Client contacts found.
                </p>
              )}
            </div>
          </div>


          <DialogFooter className="bg-gray-50 -mx-6 -mb-6 p-4 rounded-b-lg border-t gap-4 flex justify-end">
            <Button
              variant="outline"
              onClick={() => setIsSendMailDialogOpen(false)}
              disabled={isLoadingSend}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendMail}
              disabled={isLoadingSend || Object.values(selectedEmails).filter(Boolean).length === 0}
              className="px-8"
            >
              {isLoadingSend ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {activeTransmission?.status === 'Sent' ? "Resend Mail" : "Send Mail"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shared Document Preview Dialog */}
      <DocumentPreviewDialog
        isOpen={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        previewUrl={previewUrl}
        activePreviewDoc={activePreviewDoc}
      />
    </>
  )
}

// --- Local Table Component implementation (Outside to avoid re-mounting) ---
const DocumentSelectionTable = ({
  columns,
  fetchData,
  onSelectionReset,
  selectedDocuments,
  setSelectedDocuments,
  handleToggleSelectAll,
  isSelectingAll,
  customers = [],
  allJobs = []
}) => {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState({});
  const [debouncedColumnFilters, setDebouncedColumnFilters] = useState({});
  const isFirstRender = useRef(true);

  // Sync search
  useEffect(() => {
    if (isFirstRender.current) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      onSelectionReset(); // RESET SELECTION
    }, 500);
    return () => clearTimeout(timer);
  }, [search, onSelectionReset]);

  // Sync filters
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedColumnFilters(columnFilters);
      setPage(1);
      onSelectionReset(); // RESET SELECTION
    }, 800);
    return () => clearTimeout(timer);
  }, [columnFilters, onSelectionReset]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await fetchData({
          page,
          limit: pageSize,
          search: debouncedSearch,
          columnFilters: debouncedColumnFilters
        });
        setData(result.data || []);
        setMeta(result.meta || {});
      } catch (error) {
        console.error("Failed to load local data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [page, pageSize, debouncedSearch, debouncedColumnFilters, fetchData]);

  const resolvePath = (object, path) => {
    if (!path) return undefined;
    return path.split('.').reduce((o, p) => (o ? o[p] : undefined), object);
  };

  // --- Intelligent Cascading Logic ---
  const handleFilterChange = (id, value) => {
    const newFilters = { ...columnFilters };

    if (id === 'customer_name') {
      newFilters.customer_name = value || "";
      newFilters.po_number = ""; // Reset child
      newFilters.job_number = ""; // Reset grandchild
    } else if (id === 'po_number') {
      newFilters.po_number = value || "";
      newFilters.job_number = ""; // Reset grandchild
      // Reverse Cascading: if PO is selected, auto-set Customer
      if (value && !Array.isArray(value)) {
        const selectedObj = allJobs.find(j => j.po?.po_number === value);
        if (selectedObj?.customer?.customer_name) {
          newFilters.customer_name = selectedObj.customer.customer_name;
        }
      }
    } else if (id === 'job_number') {
      newFilters.job_number = value || "";
      // Handle Multi-select Array vs Single value mapping (Intelligent for Reverse Cascading)
      if (Array.isArray(value)) {
          if (value.length === 0) {
              delete newFilters.job_number;
          } else if (value.length === 1) {
              // Extract to single value for better cascading
              const val = value[0];
              const selectedJob = allJobs.find(j => j.job_number === val);
              if (selectedJob) {
                  newFilters.po_number = selectedJob.po?.po_number || "";
                  newFilters.customer_name = selectedJob.customer?.customer_name || "";
              }
          }
      } else if (value) {
        // Reverse Cascading: if Job is selected, auto-set PO and Customer
        const selectedJob = allJobs.find(j => j.job_number === value);
        if (selectedJob) {
          newFilters.po_number = selectedJob.po?.po_number || "";
          newFilters.customer_name = selectedJob.customer?.customer_name || "";
        }
      }
    } else {
      newFilters[id] = value;
    }
    setColumnFilters(newFilters);
  };

  // --- Dynamic (Filtered) Dropdown Options ---
  const dynamicClientOptions = useMemo(() => {
    return customers.map(c => ({ label: c.customer_name, value: c.customer_name }));
  }, [customers]);

  const dynamicPoOptions = useMemo(() => {
    let filteredJobs = [...allJobs];
    if (columnFilters.customer_name) {
      filteredJobs = filteredJobs.filter(j => j.customer?.customer_name === columnFilters.customer_name);
    }
    const uniquePos = [...new Set(filteredJobs.map(j => j.po?.po_number).filter(Boolean))];
    return uniquePos.map(p => ({ label: p, value: p }));
  }, [allJobs, columnFilters.customer_name]);

  const dynamicJobOptions = useMemo(() => {
    let filteredJobs = [...allJobs];
    if (columnFilters.customer_name) {
      filteredJobs = filteredJobs.filter(j => j.customer?.customer_name === columnFilters.customer_name);
    }
    if (columnFilters.po_number) {
      filteredJobs = filteredJobs.filter(j => j.po?.po_number === columnFilters.po_number);
    }
    const uniqueJobs = [...new Set(filteredJobs.map(j => j.job_number))];
    return uniqueJobs.map(j => ({ label: j, value: j }));
  }, [allJobs, columnFilters.customer_name, columnFilters.po_number]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Input
            placeholder="Global Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, idx) => {
                const isSelectCol = col.id === 'select';
                
                // Inject Dynamic Options for specific columns
                let finalOptions = col.filterOptions;
                if (col.id === 'customer_name') finalOptions = dynamicClientOptions;
                if (col.id === 'po_number') finalOptions = dynamicPoOptions;
                if (col.id === 'job_number') finalOptions = dynamicJobOptions;

                return (
                  <TableHead key={idx} className={`${col.className} whitespace-nowrap bg-slate-50/50`}>
                    <div className="flex flex-col gap-1.5 py-1.5">
                      <div className="font-bold uppercase text-slate-700 text-[10px] tracking-wider mb-0.5">
                        {isSelectCol ? (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={data.length > 0 && data.every(d => selectedDocuments.includes(d.id))}
                              onCheckedChange={(checked) => handleToggleSelectAll(checked, { search: debouncedSearch, columnFilters: debouncedColumnFilters })}
                            />
                            <span>Select</span>
                          </div>
                        ) : col.header}
                      </div>
                      {col.id !== 'select' && col.filterType === 'select' && (
                        col.isMulti ? (
                            <MultiSelectFilter
                                options={finalOptions || []}
                                value={columnFilters[col.id || col.accessorKey] || []}
                                onChange={(val) => handleFilterChange(col.id || col.accessorKey, val)}
                                placeholder={`All ${col.header}`}
                            />
                        ) : (
                        <Select
                          value={columnFilters[col.id || col.accessorKey] || "all"}
                          onValueChange={(val) => handleFilterChange(col.id || col.accessorKey, val === 'all' ? "" : val)}
                        >
                          <SelectTrigger className="h-7 text-xs font-normal w-full min-w-[110px] max-w-[180px]">
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {finalOptions?.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        )
                      )}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Loading documents...</TableCell></TableRow>
            ) : data.length ? (
              data.map((row, rIdx) => (
                <TableRow key={rIdx}>
                  {columns.map((col, cIdx) => (
                    <TableCell key={cIdx} className={col.className}>
                      {col.cell ? col.cell(row) : resolvePath(row, col.accessorKey)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No approved documents found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select value={pageSize.toString()} onValueChange={(val) => { setPageSize(parseInt(val)); setPage(1); }}>
            <SelectTrigger className="h-8 w-[70px]"><SelectValue placeholder={pageSize} /></SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 20, 50, 100].map(v => <SelectItem key={v} value={v.toString()}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Page {meta.page || 1} of {meta.totalPages || 1} ({meta.total || 0} items)
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(prev => prev - 1)} disabled={page <= 1 || loading}><ChevronLeft className="h-4 w-4" />Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(prev => prev + 1)} disabled={page >= (meta.totalPages || 1) || loading}>Next<ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Local List View Table implementation (Replica of shared DataTable) ---
const TransmissionListTable = ({
  columns,
  fetchData,
  onExport,
  refreshKey,
  customers = [],
  pos = []
}) => {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState({});
  const [debouncedColumnFilters, setDebouncedColumnFilters] = useState({});
  const isFirstRender = useRef(true);

  // Sync search
  useEffect(() => {
    if (isFirstRender.current) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Sync filters
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedColumnFilters(columnFilters);
      setPage(1);
    }, 800);
    return () => clearTimeout(timer);
  }, [columnFilters]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const params = {
          page,
          limit: pageSize,
          search: debouncedSearch
        };
        // Map UI filters to backend search parameters
        if (debouncedColumnFilters.customer_name) params.customer_name_filter = debouncedColumnFilters.customer_name;
        if (debouncedColumnFilters.po_number) params.po_number_filter = debouncedColumnFilters.po_number;

        const result = await fetchData(params);
        setData(result.data || []);
        setMeta(result.meta || {});
      } catch (error) {
        console.error("Failed to load list data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [page, pageSize, debouncedSearch, debouncedColumnFilters, fetchData, refreshKey]);

  const resolvePath = (object, path) => {
    if (!path) return undefined;
    return path.split('.').reduce((o, p) => (o ? o[p] : undefined), object);
  };

  // --- Intelligent Cascading Logic ---
  const handleFilterChange = (id, value) => {
    const newFilters = { ...columnFilters };
    if (id === 'customer_name') {
      newFilters.customer_name = value || "";
      newFilters.po_number = ""; // Reset child
    } else if (id === 'po_number') {
      newFilters.po_number = value || "";
      // Reverse Cascading from list of active POs
      if (value) {
        const selectedPo = pos.find(p => p.po_number === value);
        if (selectedPo && selectedPo.customer?.customer_name) {
          newFilters.customer_name = selectedPo.customer.customer_name;
        }
      }
    } else {
      newFilters[id] = value;
    }
    setColumnFilters(newFilters);
  };

  // --- Dynamic (Filtered) Dropdown Options ---
  const dynamicClientOptions = useMemo(() => {
    return customers.map(c => ({ label: c.customer_name, value: c.customer_name }));
  }, [customers]);

  const dynamicPoOptions = useMemo(() => {
    let filteredPos = [...pos];
    const currentCustomer = columnFilters.customer_name;

    if (currentCustomer) {
      filteredPos = filteredPos.filter(p => p.customer?.customer_name === currentCustomer);
    }
    const uniquePosNames = [...new Set(filteredPos.map(p => p.po_number).filter(Boolean))];
    return uniquePosNames.map(p => ({ label: p, value: p }));
  }, [pos, columnFilters.customer_name]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Global Search.."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={onExport} size="sm">
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, idx) => {
                // Inject Dynamic Options for specific columns
                let finalOptions = col.filterOptions;
                if (col.id === 'customer_name') finalOptions = dynamicClientOptions;
                if (col.id === 'po_number') finalOptions = dynamicPoOptions;

                return (
                  <TableHead key={idx} className={`${col.className} whitespace-nowrap bg-slate-50/50`}>
                    <div className="flex flex-col gap-1.5 py-1.5">
                      <div className="font-bold uppercase text-slate-700 text-[10px] tracking-wider mb-0.5">
                        {col.header}
                      </div>
                      {col.filterType === 'select' && (
                        <Select
                          value={columnFilters[col.id || col.accessorKey] || "all"}
                          onValueChange={(val) => handleFilterChange(col.id || col.accessorKey, val === 'all' ? "" : val)}
                        >
                          <SelectTrigger className="h-7 text-xs font-normal w-full min-w-[110px] max-w-[180px]">
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {finalOptions?.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Loading transmissions...</TableCell></TableRow>
            ) : data.length ? (
              data.map((row, rIdx) => (
                <TableRow key={rIdx}>
                  {columns.map((col, cIdx) => (
                    <TableCell key={cIdx} className={col.className}>
                      {col.cell ? col.cell(row) : resolvePath(row, col.accessorKey)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No transmissions found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select value={pageSize.toString()} onValueChange={(val) => { setPageSize(parseInt(val)); setPage(1); }}>
            <SelectTrigger className="h-8 w-[70px]"><SelectValue placeholder={pageSize} /></SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 20, 50, 100].map(v => <SelectItem key={v} value={v.toString()}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Page {meta.page || 1} of {meta.totalPages || 1} ({meta.total || 0} items)
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(prev => prev - 1)} disabled={page <= 1 || loading}><ChevronLeft className="h-4 w-4" />Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(prev => prev + 1)} disabled={page >= (meta.totalPages || 1) || loading}>Next<ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MultiSelectFilter = ({ options, value, onChange, placeholder }) => {
  const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (val) => {
    const newVal = selectedValues.includes(val)
      ? selectedValues.filter(v => v !== val)
      : [...selectedValues, val];
    onChange(newVal);
  };

  const clearFilters = (e) => {
    e.stopPropagation();
    onChange([]);
    setSearchTerm("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-xs font-normal w-full min-w-[110px] max-w-[180px] justify-between px-2 bg-white"
        >
          <div className="flex items-center gap-1 truncate mr-1">
            {selectedValues.length === 0 ? (
              <span className="text-slate-400">{placeholder}</span>
            ) : (
                <div className="flex items-center gap-1">
                    <span className="font-medium text-primary bg-primary/10 px-1 rounded-sm text-[10px]">
                        {selectedValues.length}
                    </span>
                    <span className="truncate">{options.find(o => o.value === selectedValues[0])?.label}</span>
                    {selectedValues.length > 1 && <span className="text-slate-400">...</span>}
                </div>
            )}
          </div>
          <div className="flex items-center">
            {selectedValues.length > 0 && (
                <X 
                  className="h-3 w-3 mr-1 text-slate-400 hover:text-slate-600 pointer-events-auto" 
                  onClick={clearFilters}
                />
            )}
            <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="flex flex-col h-[300px]">
          <div className="p-2 border-b">
            <div className="relative">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                <Input
                    placeholder="Search..."
                    className="h-8 pl-8 text-xs shadow-none border-none focus-visible:ring-0"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-2 text-xs text-center text-slate-500">No results.</div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-100 rounded-sm cursor-pointer"
                  onClick={() => toggleOption(opt.value)}
                >
                  <Checkbox 
                    checked={selectedValues.includes(opt.value)}
                    onCheckedChange={() => toggleOption(opt.value)}
                    className="h-3.5 w-3.5 shadow-none"
                  />
                  <span className="text-xs truncate flex-1">{opt.label}</span>
                  {selectedValues.includes(opt.value) && <Check className="h-3 w-3 text-primary shrink-0" />}
                </div>
              ))
            )}
          </div>
          {selectedValues.length > 0 && (
            <div className="p-2 border-t mt-auto">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full h-7 text-[10px] text-slate-500 hover:text-red-600 shadow-none border-none"
                    onClick={clearFilters}
                >
                    Clear Selections
                </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CreateTransmission;
