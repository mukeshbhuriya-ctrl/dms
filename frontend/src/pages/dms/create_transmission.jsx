import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
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
import { Search, Plus, ArrowLeft, Mail, Download, Send, Eye, FileText, AlertCircle, ChevronLeft, ChevronRight, X, ChevronDown, Check, Layout, Save, Trash2, Loader2 } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from 'react-toastify';
import { dccService } from "../../services/dcc.service";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const DEFAULT_TRANSMITTAL_SUBJECT = "Document Transmission: {{transmission_number}} - PO: {{po_number}}";
const DEFAULT_TRANSMITTAL_BODY = `Dear Sir/Madam,

Please find attached the document transmittal for {{transmission_number}} related to PO: {{po_number}} for {{customer_name}}.

Total documents: {{document_count}}

You can download the documents using the link below:
{{zip_url}}

Password: {{password}}

Regards,
DCC Team`;
import ProDataTable from "@/components/shared/ProDataTable";
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
  SheetDescription,
  SheetFooter,
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

  // Email Template States
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [isTemplateSheetOpen, setIsTemplateSheetOpen] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateName, setTemplateName] = useState("");

  const [tempEmailInput, setTempEmailInput] = useState("");
  const [customShrenoEmails, setCustomShrenoEmails] = useState([]);
  const [customClientEmails, setCustomClientEmails] = useState([]);
  const [activeAddEmailType, setActiveAddEmailType] = useState(null); // 'shreno' | 'client' | null

  // --- Filtering State ---
  const [listFilters, setListFilters] = useState({});
  const [selectionFilters, setSelectionFilters] = useState({});

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

  // --- Cascading Filter Options (List View) ---
  const listCustomerOptions = useMemo(() => {
    return activeListFilters.customers.map(c => ({ label: c.customer_name, value: c.customer_name }));
  }, [activeListFilters.customers]);

  const listPoOptions = useMemo(() => {
    const selectedCustomer = listFilters.customer_name;
    let list = activeListFilters.pos;
    if (selectedCustomer) {
      list = list.filter(p => {
        const pCust = p.customer?.customer_name || p.customer_name;
        return Array.isArray(selectedCustomer) ? selectedCustomer.includes(pCust) : pCust === selectedCustomer;
      });
    }
    return list.map(p => ({ label: p.po_number, value: p.po_number }));
  }, [activeListFilters.pos, listFilters.customer_name]);

  // --- Cascading Filter Options (Selection/Create View) ---
  const selectionCustomerOptions = useMemo(() => {
    return activeSelectionFilters.customers.map(c => ({ label: c.customer_name, value: c.customer_name }));
  }, [activeSelectionFilters.customers]);

  const selectionPoOptions = useMemo(() => {
    const selectedCustomer = selectionFilters.customer_name;
    let list = activeSelectionFilters.pos;
    if (selectedCustomer) {
      list = list.filter(p => {
        const pCust = p.customer?.customer_name || p.customer_name;
        return Array.isArray(selectedCustomer) ? selectedCustomer.includes(pCust) : pCust === selectedCustomer;
      });
    }
    return list.map(p => ({ label: p.po_number, value: p.po_number }));
  }, [activeSelectionFilters.pos, selectionFilters.customer_name]);

  const selectionJobOptions = useMemo(() => {
    const selectedCustomer = selectionFilters.customer_name;
    const selectedPo = selectionFilters.po_number;
    let list = activeSelectionFilters.jobs;
    if (selectedCustomer) {
      list = list.filter(j => {
        const jCust = j.customer?.customer_name || j.customer_name;
        return Array.isArray(selectedCustomer) ? selectedCustomer.includes(jCust) : jCust === selectedCustomer;
      });
    }
    if (selectedPo) {
      list = list.filter(j => {
        const jPo = j.po?.po_number || j.po_number;
        return Array.isArray(selectedPo) ? selectedPo.includes(jPo) : jPo === selectedPo;
      });
    }
    return list.map(j => ({ label: j.job_number, value: j.job_number }));
  }, [activeSelectionFilters.jobs, selectionFilters.customer_name, selectionFilters.po_number]);


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

  const onSelectionChange = (newSelectedRows) => {
    const newDocIds = Array.from(newSelectedRows);
    
    // If selecting more than they had before, validate the newest addition
    if (newDocIds.length > selectedDocuments.length) {
      const addedId = newDocIds.find(id => !selectedDocuments.includes(id));
      const addedDoc = currentDocs.find(d => d.id === addedId);
      
      if (addedDoc && selectedDocuments.length > 0) {
        // We need to find at least one already selected doc to compare
        // Note: selectedDocuments might contain IDs not in currentDocs (other pages)
        // But for robust validation, we ideally compare against the first selected doc's metadata.
        // We'll use a ref or state for 'enforcedMetadata' if needed, but for now:
        const firstId = selectedDocuments[0];
        // This is a bit tricky if firstId is not on current page. 
        // In a real app, we'd fetch that doc or store its metadata.
        // For simplicity here, we'll assume currentDocs has it or we just allow it and validate on submit.
        // However, the local impl used currentDocs.find(d => d.id === selectedDocuments[0]).
      }
    }
    setSelectedDocuments(newDocIds);
  };

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

  const onListFiltersChange = (newFilters) => {
    setListFilters(prev => {
      const updated = { ...prev, ...newFilters };

      // Cascading Logic
      if (newFilters.customer_name !== undefined) {
        // Forward: Clear PO if Customer changes
        updated.po_number = "";
      } else if (newFilters.po_number !== undefined) {
        // Reverse Cascading: Auto-select Customer if PO is selected
        const poVal = Array.isArray(newFilters.po_number) ? newFilters.po_number[0] : newFilters.po_number;
        if (poVal) {
          const po = activeListFilters.pos.find(p => p.po_number === poVal);
          if (po) {
            const custName = po.customer?.customer_name || po.customer_name;
            if (custName) updated.customer_name = custName;
          }
        }
      }
      return updated;
    });
  };

  const onSelectionFiltersChange = (newFilters) => {
    setSelectionFilters(prev => {
      const updated = { ...prev, ...newFilters };

      // Cascading Logic
      if (newFilters.customer_name !== undefined) {
        // Forward: Clear PO and Job if Customer changes
        updated.po_number = "";
        updated.job_number = "";
      } else if (newFilters.po_number !== undefined) {
        // Forward: Clear Job if PO changes
        updated.job_number = "";

        // Reverse Cascading: Auto-select Customer if PO is selected
        const poVal = Array.isArray(newFilters.po_number) ? newFilters.po_number[0] : newFilters.po_number;
        if (poVal) {
          const po = activeSelectionFilters.pos.find(p => p.po_number === poVal);
          if (po && (po.customer?.customer_name || po.customer_name)) {
            updated.customer_name = po.customer?.customer_name || po.customer_name;
          }
        }
      } else if (newFilters.job_number !== undefined) {
        // Reverse Cascading: Auto-select Customer and PO if Job is selected
        const jobVal = Array.isArray(newFilters.job_number) ? newFilters.job_number[0] : newFilters.job_number;
        if (jobVal) {
          const job = activeSelectionFilters.jobs.find(j => j.job_number === jobVal);
          if (job) {
            updated.po_number = job.po?.po_number || "";
            updated.customer_name = job.customer?.customer_name || "";
          }
        }
      }

      onSelectionReset(); // Reset selection when filters change
      return updated;
    });
  };

  const handleToggleSelectAll = async (checked) => {
    if (checked) {
      setIsSelectingAll(true);
      try {
        const params = {
          search: currentSearchParams.search,
          status_filter: 'done',
          approver_status_filter: 'approved',
          exclude_transmitted: true
        };

        if (selectionFilters) {
          if (selectionFilters.customer_name) params.customer_name_filter = selectionFilters.customer_name;
          if (selectionFilters.po_number) params.po_number_filter = selectionFilters.po_number;
          if (selectionFilters.job_number) params.job_number_filter = selectionFilters.job_number;
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
    setSelectionFilters({
      customer_name: "",
      po_number: "",
      job_number: ""
    });
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
  const fetchTransmissions = useCallback(async ({ page, limit, search, columnFilters }) => {
    try {
      const params = { page, limit, search };
      if (columnFilters) {
        if (columnFilters.customer_name) params.customer_name_filter = columnFilters.customer_name;
        if (columnFilters.po_number) params.po_number_filter = columnFilters.po_number;
      }

      const res = await dccService.getTransmissions(params);
      if (res.success) {
        return {
          data: res.data || [],
          meta: res.meta || {}
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

  const addCustomEmail = (type) => {
    if (!tempEmailInput.trim() || !tempEmailInput.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (type === 'shreno') {
      if (customShrenoEmails.includes(tempEmailInput)) { toast.error("Email already added"); return; }
      setCustomShrenoEmails(prev => [...prev, tempEmailInput]);
    } else {
      if (customClientEmails.includes(tempEmailInput)) { toast.error("Email already added"); return; }
      setCustomClientEmails(prev => [...prev, tempEmailInput]);
    }
    setTempEmailInput("");
    setActiveAddEmailType(null);
  };

  const removeCustomEmail = (type, email) => {
    if (type === 'shreno') setCustomShrenoEmails(prev => prev.filter(e => e !== email));
    else setCustomClientEmails(prev => prev.filter(e => e !== email));
  };

  // --- Email Template Logic ---
  const fetchTemplates = async () => {
    try {
      const res = await dccService.getEmailTemplates();
      if (res.success) setEmailTemplates(res.data || []);
    } catch (err) {
      console.error("Error fetching templates:", err);
    }
  };

  const handleApplyTemplate = (template) => {
    setEmailSubject(template.subject);
    setEmailBody(template.body);
    setSelectedTemplateId(template.id);
    setIsTemplateSheetOpen(false);
    toast.success(`Template "${template.name}" applied`);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !emailSubject.trim() || !emailBody.trim()) {
      toast.error("Template name, subject, and body are required");
      return;
    }

    setIsSavingTemplate(true);
    try {
      let res;
      if (selectedTemplateId) {
        res = await dccService.updateEmailTemplate(selectedTemplateId, {
          name: templateName,
          subject: emailSubject,
          body: emailBody
        });
      } else {
        res = await dccService.createEmailTemplate({
          name: templateName,
          subject: emailSubject,
          body: emailBody
        });
      }

      if (res.success) {
        toast.success(selectedTemplateId ? "Template updated" : "Template saved");
        fetchTemplates();
        setTemplateName("");
      }
    } catch (err) {
      console.error("Save template error:", err);
      toast.error(err.response?.data?.message || "Failed to save template");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    try {
      const res = await dccService.deleteEmailTemplate(templateId);
      if (res.success) {
        toast.success("Template deleted");
        fetchTemplates();
        if (selectedTemplateId === templateId) {
          setSelectedTemplateId("");
          setTemplateName("");
        }
      }
    } catch (err) {
      console.error("Delete template error:", err);
      toast.error("Failed to delete template");
    }
  };

  useEffect(() => {
    if (isTemplateSheetOpen) {
      if (!emailSubject && !emailBody) {
        setEmailSubject(DEFAULT_TRANSMITTAL_SUBJECT);
        setEmailBody(DEFAULT_TRANSMITTAL_BODY);
      }
    }
  }, [isTemplateSheetOpen]);

  useEffect(() => {
    if (isSendMailDialogOpen) {
      fetchTemplates();
    }
  }, [isSendMailDialogOpen]);

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

      // Merge custom ad-hoc emails
      const finalClientEmails = [...clientEmails, ...customClientEmails];
      const finalShrenoEmails = [...shrenoEmails, ...customShrenoEmails];

      const response = await dccService.sendTransmissionEmail({
        transmission_id: activeTransmission.id,
        client_emails: finalClientEmails,
        shreno_emails: finalShrenoEmails,
        include_zip: includeZipDownload,
        custom_subject: emailSubject || undefined,
        custom_body: emailBody || undefined
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
      filterOptions: listCustomerOptions,
      accessorKey: "customer.customer_name" 
    },
    { 
      header: "PO Number", 
      id: "po_number",
      filterType: 'select',
      filterOptions: listPoOptions,
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
  ], [activeListFilters, listCustomerOptions, listPoOptions]);

  const documentColumns = useMemo(() => [
    { header: "S.No", accessorKey: "s_no", width: '60px' },
    { header: "System Doc ID", accessorKey: "document.document_number" },
    { header: "Document Name", accessorKey: "document.document_name" },
    {
      id: "customer_name",
      header: "Client",
      accessorKey: "customer.customer_name",
      filterType: "select",
      filterOptions: selectionCustomerOptions,
      cell: (row) => row.customer?.customer_name || "-",
    },
    {
      id: "po_number",
      header: "PO",
      accessorKey: "po.po_number",
      filterType: "select",
      filterOptions: selectionPoOptions,
      cell: (row) => row.po?.po_number || "-",
    },
    {
      id: "job_number",
      header: "Job Number",
      accessorKey: "job_number",
      filterType: "select",
      isMulti: true,
      filterOptions: selectionJobOptions,
      cell: (row) => row.group?.job_group?.[0]?.job?.job_number || "-",
    },
    {
      header: "Revision",
      accessorKey: "display_version_no",
      cell: (row) => (row.display_version_no !== null && row.display_version_no !== undefined) ? `${row.display_version_no}` : '-'
    }
  ], [selectionCustomerOptions, selectionPoOptions, selectionJobOptions]);

  // Send View Columns
  const sendDocumentColumns = useMemo(() => [
    {
      header: "S.No",
      id: "s_no",
      cell: (row, idx) => idx + 1,
      width: "60px"
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
                {view === 'send'
                  ? 'Review documents and send to client.'
                  : view === 'create'
                    ? 'Select approved documents to create a new transmission.'
                    : ''}
              </p>
            </div>
            <div className="flex gap-2">
              {view !== 'list' && (
                <Button variant="outline" onClick={() => {
                  setView('list');
                  setActiveTransmission(null);
                  setSendDocuments([]);
                  setSelectedDocuments([]);
                  setSelectionFilters({
                    customer_name: "",
                    po_number: "",
                    job_number: ""
                  });
                }}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                </Button>
              )}
            </div>
          </div>

          {/* Content Section */}
          {view === 'list' ? (
            <Card className="border-none shadow-none bg-transparent">
              <CardContent className="p-0">
                <ProDataTable
                  columns={listColumns}
                  fetchData={fetchTransmissions}
                  onExport={handleExport}
                  refreshKey={refreshKey}
                  columnFilters={listFilters}
                  onFilterChange={onListFiltersChange}
                  showSelectionColumn={false}
                  onAdd={() => { setView('create'); setSelectedDocuments([]); }}
                  onAddTooltip="Create Transmission"
                />
              </CardContent>
            </Card>
          ) : view === 'send' ? (
            <Card className="border-none shadow-none bg-transparent">
              <CardHeader className="px-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Approved Documents</CardTitle>
                    <CardDescription>
                      Transmission documents for {activeTransmission?.transmission_number}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 pt-4">
                <ProDataTable
                  columns={sendDocumentColumns}
                  fetchData={async () => ({ data: sendDocuments, meta: { total: sendDocuments.length, page: 1, totalPages: 1 } })}
                  showSelectionColumn={false}
                />

                {activeTransmission?.client_status !== 'Approved' && activeTransmission?.client_status !== 'Rejected' && activeTransmission?.client_status !== 'Partially Approved' && (
                  <div className="mt-8 space-y-4 border-t pt-6">
                    {/* Row 1: Transmittal Row */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border border-slate-200 rounded-2xl bg-white shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <FileText className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">Review & Send</h4>
                          <p className="text-xs text-slate-500">Ensure recipients are correct before sending.</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center space-x-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                          <Checkbox
                            id="include-zip-card"
                            checked={includeZipDownload}
                            onCheckedChange={(checked) => setIncludeZipDownload(!!checked)}
                            className="h-4 w-4"
                          />
                          <Label
                            htmlFor="include-zip-card"
                            className="cursor-pointer text-xs font-bold text-slate-700"
                          >
                            Include ZIP
                          </Label>
                        </div>
                        <Button
                          type="button"
                          onClick={() => setIsSendMailDialogOpen(true)}
                          disabled={isLoadingSend}
                          className="h-10 px-6 font-bold shadow-sm"
                        >
                          Send Mail
                          <Send className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            /* CREATE VIEW */
            <div className="space-y-6">
              <Card className="border-none shadow-none bg-transparent">
                <CardContent className="p-0">
                  <ProDataTable
                    columns={documentColumns}
                    fetchData={fetchApprovedDocuments}
                    refreshKey={refreshKey}
                    selectedRows={new Set(selectedDocuments)}
                    onSelectionChange={onSelectionChange}
                    columnFilters={selectionFilters}
                    onFilterChange={onSelectionFiltersChange}
                  />

                  {/* BOTTOM ACTION BUTTONS */}
                  <div className="flex justify-end gap-3 mt-8 border-t pt-6">
                    <Button variant="ghost" className="font-semibold text-slate-600" onClick={handleReset}>
                      Discard
                    </Button>
                    <Button 
                      onClick={handleSubmitTransmission} 
                      disabled={isSubmitting || selectedDocuments.length === 0}
                      className="px-8 font-bold shadow-md"
                    >
                      {isSubmitting ? <><Loader2 className="animate-spin mr-2 h-4 w-4" />Creating...</> : "Create Transmission"}
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Shreno Communication</h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full hover:bg-primary/10 text-primary"
                  onClick={() => setActiveAddEmailType(activeAddEmailType === 'shreno' ? null : 'shreno')}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              {activeAddEmailType === 'shreno' && (
                <div className="flex gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-top-2">
                  <Input 
                    placeholder="Enter extra email..." 
                    className="h-9 flex-1 bg-white" 
                    value={tempEmailInput}
                    onChange={(e) => setTempEmailInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomEmail('shreno')}
                  />
                  <Button size="sm" onClick={() => addCustomEmail('shreno')}>Add</Button>
                </div>
              )}
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

              {/* Custom Shreno Emails */}
              {customShrenoEmails.length > 0 && (
                <div className="space-y-3 pl-7 pt-2">
                  {customShrenoEmails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between p-3 border border-primary/30 bg-primary/5 rounded-lg group"
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox checked={true} disabled className="opacity-50" />
                        <div>
                          <div className="font-semibold text-sm text-primary">Extra Recipient</div>
                          <div className="text-sm text-slate-600">{email}</div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeCustomEmail('shreno', email)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t"></div>

            {/* Client Side Communication */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Client Side Communication</h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full hover:bg-primary/10 text-primary"
                  onClick={() => setActiveAddEmailType(activeAddEmailType === 'client' ? null : 'client')}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              {activeAddEmailType === 'client' && (
                <div className="flex gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-top-2">
                  <Input 
                    placeholder="Enter extra email..." 
                    className="h-9 flex-1 bg-white" 
                    value={tempEmailInput}
                    onChange={(e) => setTempEmailInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomEmail('client')}
                  />
                  <Button size="sm" onClick={() => addCustomEmail('client')}>Add</Button>
                </div>
              )}
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

              {/* Custom Client Emails */}
              {customClientEmails.length > 0 && (
                <div className="space-y-3 pl-7 pt-2">
                  {customClientEmails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between p-3 border border-primary/30 bg-primary/5 rounded-lg group"
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox checked={true} disabled className="opacity-50" />
                        <div>
                          <div className="font-semibold text-sm text-primary">Extra Recipient</div>
                          <div className="text-sm text-slate-600">{email}</div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeCustomEmail('client', email)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>


          <DialogFooter className="bg-gray-50 -mx-6 -mb-6 p-4 rounded-b-lg border-t gap-4 flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsTemplateSheetOpen(true)}
                className="border-primary text-primary hover:bg-primary/5 shadow-sm"
              >
                <Layout className="h-4 w-4 mr-2" />
                Email Template
              </Button>
            </div>
            <div className="flex gap-4">
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
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {activeTransmission?.status === 'Sent' ? "Resend Mail" : "Send Mail"}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmailTemplateDrawer 
        isOpen={isTemplateSheetOpen}
        onOpenChange={setIsTemplateSheetOpen}
        emailTemplates={emailTemplates}
        fetchTemplates={fetchTemplates}
        onApply={handleApplyTemplate}
        emailSubject={emailSubject}
        setEmailSubject={setEmailSubject}
        emailBody={emailBody}
        setEmailBody={setEmailBody}
        templateName={templateName}
        setTemplateName={setTemplateName}
        selectedTemplateId={selectedTemplateId}
        setSelectedTemplateId={setSelectedTemplateId}
        handleSaveTemplate={handleSaveTemplate}
        handleDeleteTemplate={handleDeleteTemplate}
        isSavingTemplate={isSavingTemplate}
      />

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

// --- Email Template Drawer Component ---
const EmailTemplateDrawer = ({
  isOpen,
  onOpenChange,
  emailTemplates = [],
  onApply,
  emailSubject,
  setEmailSubject,
  emailBody,
  setEmailBody,
  templateName,
  setTemplateName,
  selectedTemplateId,
  setSelectedTemplateId,
  handleSaveTemplate,
  handleDeleteTemplate,
  isSavingTemplate
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[500px] w-full p-0 flex flex-col">
        <SheetHeader className="p-6 border-b bg-slate-50/50">
          <SheetTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Manage Email Templates
          </SheetTitle>
          <SheetDescription>
            Define and reuse professional email content with dynamic placeholders.
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Template Selector Dropdown */}
          <div className="space-y-4">
            <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Select Existing Template</Label>
            <Select 
              value={selectedTemplateId || "default"} 
              onValueChange={(val) => {
                if (val === "default") {
                  setSelectedTemplateId("");
                  setTemplateName("");
                  setEmailSubject(DEFAULT_TRANSMITTAL_SUBJECT);
                  setEmailBody(DEFAULT_TRANSMITTAL_BODY);
                } else if (val === "new") {
                  setSelectedTemplateId("");
                  setTemplateName("");
                  setEmailSubject("");
                  setEmailBody("");
                } else {
                  const tmp = emailTemplates.find(t => t.id === val);
                  if (tmp) {
                    setSelectedTemplateId(tmp.id);
                    setTemplateName(tmp.name);
                    onApply(tmp);
                  }
                }
              }}
            >
              <SelectTrigger className="w-full h-11 border-slate-200">
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">System Default</SelectItem>
                <SelectItem value="new">+ Create New Template</SelectItem>
                {emailTemplates.length > 0 && <div className="h-px bg-slate-100 my-1" />}
                {emailTemplates.map(tmp => (
                  <SelectItem key={tmp.id} value={tmp.id}>
                    {tmp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                {selectedTemplateId ? "Edit Template" : "Template Content"}
              </Label>
              {selectedTemplateId && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive h-7 px-2 hover:bg-destructive/5"
                  onClick={() => handleDeleteTemplate(selectedTemplateId)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="templateName" className="text-xs font-medium text-slate-500">Template Identifier (Name)</Label>
                <Input 
                  id="templateName"
                  placeholder="e.g., Standard Transmittal"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="h-10 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailSubject" className="text-xs font-medium text-slate-500">Email Subject</Label>
                <Input 
                  id="emailSubject"
                  placeholder="Subject line..."
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="h-10 rounded-lg font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailBody" className="text-xs font-medium text-slate-500">Email Body Content</Label>
                <Textarea 
                  id="emailBody"
                  placeholder="Type your email content here..."
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="min-h-[250px] rounded-xl resize-none font-sans text-sm p-4 border-slate-200 focus-visible:ring-primary/20"
                />
                <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg">
                  <p className="text-[10px] text-amber-800 font-bold mb-1">AVAILABLE PLACEHOLDERS:</p>
                  <div className="flex flex-wrap gap-1">
                    {['{{transmission_number}}', '{{customer_name}}', '{{po_number}}', '{{document_count}}', '{{zip_url}}', '{{password}}'].map(tag => (
                      <code 
                        key={tag} 
                        className="bg-white px-1.5 py-0.5 rounded border border-amber-200 text-[10px] text-amber-900 cursor-pointer hover:bg-amber-100 transition-colors"
                        onClick={() => setEmailBody(prev => prev + tag)}
                      >
                        {tag}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="p-6 border-t bg-slate-50/50 gap-2">
          <Button 
            variant="outline" 
            className="flex-1 h-11"
            onClick={() => {
              setSelectedTemplateId("");
              setTemplateName("");
              setEmailSubject("");
              setEmailBody("");
            }}
          >
            Reset Form
          </Button>
          <Button 
            className="flex-1 h-11 shadow-lg"
            onClick={handleSaveTemplate}
            disabled={isSavingTemplate}
          >
            {isSavingTemplate ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="h-4 w-4 mr-2" />}
            {selectedTemplateId ? "Update Template" : "Save Template"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default CreateTransmission;
