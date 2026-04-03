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
import { Search, Plus, ArrowLeft, Mail, Download, Send, Eye, FileText, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
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
  const [includeTransmittalDoc, setIncludeTransmittalDoc] = useState(true)

  // --- Initial Data Fetch (Customers & Jobs for metadata lookup/filtering) ---
  useEffect(() => {
    fetchCustomers();
    fetchAllJobs();
  }, []);

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
          const allDocIds = (response.data || []).map(d => d.id);
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
        include_transmittal: includeTransmittalDoc
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
                <DataTable
                  columns={listColumns}
                  fetchData={fetchTransmissions}
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
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <DataTable
                  columns={sendDocumentColumns}
                  initialData={sendDocuments}
                  fetchData={async () => ({ data: sendDocuments, meta: { total: sendDocuments.length, page: 1, totalPages: 1 } })} // Static data for now
                />

                {activeTransmission?.client_status !== 'Approved' && activeTransmission?.client_status !== 'Rejected' && (
                  <div className="mt-8 space-y-4 border-t pt-6">
                    {/* Row 1: Transmittal Row (Pure Neutral Tones) */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border border-slate-200 rounded-2xl">
                      {/* Left: Metadata */}
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                          <FileText className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">Transmittal Documents</h4>
                        </div>
                      </div>

                      {/* Right: Actions (Check FIRST, then Preview) */}
                      <div className="flex items-center gap-3 bg-white p-1.5 pr-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center space-x-3 px-3">
                          <Checkbox
                            id="include-transmittal-card"
                            checked={includeTransmittalDoc}
                            onCheckedChange={(checked) => setIncludeTransmittalDoc(!!checked)}
                            className="h-5 w-5 border-slate-300 data-[state=checked]:bg-slate-700 data-[state=checked]:border-slate-700"
                          />
                          <Label
                            htmlFor="include-transmittal-card"
                            className="cursor-pointer text-sm font-bold text-slate-700"
                          >
                            Include PDF
                          </Label>
                        </div>

                        <div className="h-6 w-px bg-slate-200"></div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium rounded-lg"
                          onClick={() => handlePreviewTransmittal(activeTransmission?.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
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


          <DialogFooter className="bg-gray-50 -mx-6 -mb-6 p-4 rounded-b-lg border-t gap-2 sm:gap-0">
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
  isSelectingAll
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
                        <Select
                          value={columnFilters[col.id || col.accessorKey] || "all"}
                          onValueChange={(val) => setColumnFilters(prev => ({ ...prev, [col.id || col.accessorKey]: val === 'all' ? "" : val }))}
                        >
                          <SelectTrigger className="h-7 text-xs font-normal w-full min-w-[110px] max-w-[180px]">
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {col.filterOptions?.map(opt => (
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

export default CreateTransmission;
