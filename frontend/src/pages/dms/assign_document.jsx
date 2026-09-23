import { PageContainer } from "@/components/layout/PageContainer";
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { toast } from 'react-toastify';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { ConfirmDialog } from "../../components/shared/ConfirmDialog"
import { PromptDialog } from "../../components/shared/PromptDialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import DocumentTrail from "../../components/dms/DocumentTrail"
import { DocumentPreviewDialog } from "../../components/shared/DocumentPreviewDialog"
import { FileListPreviewDialog } from "../../components/shared/FileListPreviewDialog"
import ProDataTable from "../../components/shared/ProDataTable"
import { SearchableSelect } from "../../components/shared/SearchableSelect"
import apiClient from "../../api/api.client"
import { dccService } from "../../services/dcc.service"
import { exportApi } from "../../api/export.api"
import * as XLSX from 'xlsx';
import { downloadAssignmentTemplate } from "../../services/excel_template.service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Search,
  ArrowRight,
  Plus,
  ArrowLeft,
  Edit,
  Copy,
  History,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  ChevronDown,
  Check,
  AlertCircle,
  Archive,
  CheckCircle2,
  XCircle,
  RefreshCw
} from "lucide-react"

import { useAuth } from "@/context/AuthContext"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AccessControl } from "@/components/iam/access_control";
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"

function AssignDocument() {
  const { roles, hasPermission } = useAuth()
  const [view, setView] = useState("list") // 'list' or 'assign'
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [selectedRowIds, setSelectedRowIds] = useState(new Set())
  const [selectedRowObjects, setSelectedRowObjects] = useState(new Map())
  const [currentTableData, setCurrentTableData] = useState([])
  const [searchParams] = useSearchParams()
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all")
  const [columnFilters, setColumnFilters] = useState({ is_active: ['true'] });
  const globalSearchRef = useRef("");

  useEffect(() => {
    const status = searchParams.get("status")
    if (status) {
      setStatusFilter(status)
    } else {
      setStatusFilter("all")
    }
  }, [searchParams])

  // Trail State
  const [isTrailOpen, setIsTrailOpen] = useState(false)
  const [activeDocId, setActiveDocId] = useState(null)

  // Preview State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState("")
  const [activePreviewDoc, setActivePreviewDoc] = useState(null)
  const [isFileListOpen, setIsFileListOpen] = useState(false)
  const [activeFileList, setActiveFileList] = useState([])
  const [activeFileListDocName, setActiveFileListDocName] = useState("")

  const [assignments, setAssignments] = useState([
    {
      tempId: Date.now(),
      jobId: [], // Support array for UI selection
      searchQuery: "", // Job search
      customerId: "",
      customerSearch: "", // Customer search
      poId: "",
      poSearch: "", // PO search
      documentName: "",
      shrenoDocumentNo: "",
      clientDocumentNo: "",
      assignUserId: "",
      upload_due_days: "",
      response_due_days: "",
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  // Master lists for display and search results
  const [customers, setCustomers] = useState([])
  const [users, setUsers] = useState([])
  const [allJobs, setAllJobs] = useState([]) // Master list of jobs (cached)
  const [allPos, setAllPos] = useState([])    // Master list of POs (cached)
  const [activeFilters, setActiveFilters] = useState({ customers: [], pos: [], jobs: [] })

  // Refs for debouncing
  const searchTimeoutRef = useRef({}); // { [tempId_field]: setTimeoutId }
  const [error, setError] = useState("")
  
  // Confirmation state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [confirmData, setConfirmData] = useState({ title: "", description: "", action: null, variant: "danger" })

  // Master Data fetching (unified)
  useEffect(() => {
    fetchMasterData();
    fetchActiveFilters();
  }, [refreshKey]);

  const fetchMasterData = async () => {
    try {
      setIsLoadingData(true);

      // Fetch ALL Master Data (not just active)
      const [customersRes, posRes, jobsRes, usersRes] = await Promise.all([
        apiClient.get("/api/dcc/get-customers", { limit: 9999 }),
        apiClient.get("/api/dcc/get-pos", { limit: 9999 }),
        apiClient.get("/api/dcc/get-jobs", { limit: 9999 }),
        apiClient.get("/api/users/by-role/USER", { limit: 9999 })
      ]);

      if (customersRes?.success) setCustomers(customersRes.data || []);
      if (posRes?.success) setAllPos(posRes.data || []);
      if (jobsRes?.success) setAllJobs(jobsRes.data || []);

      const userList = usersRes?.data || usersRes || [];
      setUsers(Array.isArray(userList) ? userList : []);

      setIsLoadingData(false);
    } catch (err) {
      console.error("Error fetching master data:", err);
      setIsLoadingData(false);
    }
  };

  const fetchActiveFilters = async () => {
    try {
      const res = await dccService.getActiveFilters();
      if (res.success) setActiveFilters(res.data);
    } catch (err) {
      console.error("Error fetching active filters:", err);
    }
  };

  // --- Bulk Excel Import Logic ---
  const [importReview, setImportReview] = useState({ isOpen: false, data: [], summary: {} });

  const handleDownloadTemplate = () => {
    downloadAssignmentTemplate();
    toast.info("Downloading assignment template...");
  };

  const handleImportExcel = async (file) => {
    if (!file) return;

    const REQUIRED_HEADERS = [
      "Job Number",
      "Document Name",
      "Employee ID",
      "Shreno Document No",
      "Client Document No",
      "Upload Due Days",
      "Response Due Days"
    ];

    const reader = new FileReader();
    reader.onload = (e) => {
      const bstr = e.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const rawData = XLSX.utils.sheet_to_json(ws);

      if (rawData.length > 0) {
        const fileHeaders = Object.keys(rawData[0]);
        const missingHeaders = REQUIRED_HEADERS.filter(h => !fileHeaders.includes(h));
        if (missingHeaders.length > 0) {
          // If headers are missing, we still try to proceed if possible or toast warning
          console.warn(`Excel missing columns: ${missingHeaders.join(", ")}`);
        }
      }

      const validatedRows = rawData.map((row, index) => {
        const jobNumberStr = String(row["Job Number"] || "").trim();
        const jobNumbers = jobNumberStr.split(',').map(j => j.trim().toUpperCase()).filter(Boolean);
        const docName = String(row["Document Name"] || "").trim();
        const empid = String(row["Employee ID"] || "").trim();
        const shrenoNo = String(row["Shreno Document No"] || "").trim();
        const clientNo = String(row["Client Document No"] || "").trim();
        const uploadDaysRaw = row["Upload Due Days"];
        const responseDaysRaw = row["Response Due Days"];

        const targetUser = users.find(u => String(u.empid) === empid);
        const errors = [];
        
        if (jobNumbers.length === 0) errors.push("Job Number is required");
        if (!docName) errors.push("Document Name is required");

        const targetJobs = jobNumbers.map(jn => {
            const job = allJobs.find(j => String(j.job_number) === jn);
            if (!job) errors.push(`Job Number "${jn}" not found`);
            return job;
        }).filter(Boolean);

        const uploadDays = parseInt(uploadDaysRaw);
        if (uploadDaysRaw === undefined || isNaN(uploadDays) || uploadDays < 0) {
          errors.push("Invalid Upload Due Days");
        }
        const responseDays = parseInt(responseDaysRaw);
        if (responseDaysRaw === undefined || isNaN(responseDays) || responseDays < 0) {
          errors.push("Invalid Response Due Days");
        }

        const firstJob = targetJobs[0] || {};

        return {
          rowNo: index + 1,
          jobNumber: jobNumbers.join(', ') || "EMPTY",
          docName, empid, shrenoNo, clientNo,
          uploadDays: uploadDays || 0,
          responseDays: responseDays || 0,
          status: errors.length === 0 ? "valid" : "error",
          message: errors.length === 0 ? "Ready to assign" : errors.join(" | "),
          jobId: targetJobs.map(j => j.id),
          customerId: firstJob.customer_id,
          poId: firstJob.po_id,
          assignUserId: targetUser?.id,
          userName: targetUser?.name
        };
      });

      setImportReview({
        isOpen: true,
        data: validatedRows,
        summary: {
          total: validatedRows.length,
          valid: validatedRows.filter(r => r.status === 'valid').length,
          error: validatedRows.filter(r => r.status === 'error').length
        }
      });
    };
    reader.readAsBinaryString(file);
  };

  const finalizeImport = async () => {
    const validRows = importReview.data.filter(r => r.status === 'valid');
    if (validRows.length === 0) return;

    setIsLoading(true);

    const requestBody = {
      assignments: validRows.map(r => ({
        job_id: r.jobId, // Sending as array directly now
        document_name: r.docName,
        shreno_document_no: r.shrenoNo,
        client_document_no: r.clientNo,
        assign_user_id: r.assignUserId || null,
        upload_due_days: r.uploadDays ? parseInt(r.uploadDays) : null,
        response_due_days: r.responseDays ? parseInt(r.responseDays) : null,
      }))
    };

    try {
      const response = await apiClient.post("/api/dcc/bulk-assign-documents", requestBody);

      if (response.success) {
        toast.success(`Imported and assigned ${validRows.length} documents successfully!`);
        setImportReview({ isOpen: false, data: [], summary: {} });
        setRefreshKey(prev => prev + 1);
        setView("list");
      }
    } catch (err) {
      console.error("Error importing documents:", err);
      toast.error(err.message || "Failed to import documents.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Restrictive (Active) Filter Options for List View ---
  const activeClientOptions = useMemo(() => {
    let filtered = activeFilters.jobs;
    // Reverse filters
    if (columnFilters.po_number) {
      filtered = filtered.filter(j =>
        String(j.po?.po_number || j.po_number || "") === String(columnFilters.po_number)
      );
    }
    if (Array.isArray(columnFilters.job_number) && columnFilters.job_number.length > 0) {
      const selectedJobs = columnFilters.job_number.map(String);
      filtered = filtered.filter(j => selectedJobs.includes(String(j.job_number)));
    }

    const clientNames = [...new Set(filtered.map(j => j.customer?.customer_name || j.customer_name))].filter(Boolean);
    return clientNames.sort().map(name => ({ label: name, value: name }));
  }, [activeFilters.jobs, columnFilters.po_number, columnFilters.job_number]);

  const activePoOptions = useMemo(() => {
    let filtered = activeFilters.jobs;
    // Forward filter
    if (columnFilters.customer_name) {
      filtered = filtered.filter(j => {
        const val = (j.customer?.customer_name || j.customer_name);
        return Array.isArray(columnFilters.customer_name)
          ? columnFilters.customer_name.includes(val)
          : val === columnFilters.customer_name;
      });
    }
    // Reverse filter
    if (Array.isArray(columnFilters.job_number) && columnFilters.job_number.length > 0) {
      const selectedJobs = columnFilters.job_number.map(String);
      filtered = filtered.filter(j => selectedJobs.includes(String(j.job_number)));
    }

    const poNumbers = [...new Set(filtered.map(j => j.po?.po_number || j.po_number))].filter(Boolean);
    return poNumbers.sort().map(p => ({ label: p.toString(), value: p.toString() }));
  }, [activeFilters.jobs, columnFilters.customer_name, columnFilters.job_number]);

  const activeJobOptions = useMemo(() => {
    let filtered = activeFilters.jobs;
    // Forward filters
    if (columnFilters.customer_name) {
      filtered = filtered.filter(j => {
        const val = (j.customer?.customer_name || j.customer_name);
        return Array.isArray(columnFilters.customer_name)
          ? columnFilters.customer_name.includes(val)
          : val === columnFilters.customer_name;
      });
    }
    if (columnFilters.po_number) {
      filtered = filtered.filter(j =>
        String(j.po?.po_number || j.po_number || "") === String(columnFilters.po_number)
      );
    }

    const jobNumbers = [...new Set(filtered.map(j => j.job_number))].filter(Boolean);
    return jobNumbers.sort().map(j => ({ label: j.toString(), value: j.toString() }));
  }, [activeFilters.jobs, columnFilters.customer_name, columnFilters.po_number]);

  // --- List View Columns ---
  const columns = useMemo(() => [
    {
      accessorKey: "document.document_number",
      header: "System Doc ID",
    },
        {
      id: "shreno_doc_no",
      accessorKey: "shreno_doc_no",
      header: "Shreno Doc No",
      filterType: "text",
      cell: (row) => row.shreno_doc_no || "-",
    },
    {
      id: "client_doc_no",
      accessorKey: "client_doc_no",
      header: "Client Doc No",
      filterType: "text",
      cell: (row) => row.client_doc_no || "-",
    },
    {
      id: "documentName",
      header: "Document Name",
      accessorKey: "document.document_name",
      filterType: "text",
    },
    {
      id: "revision_no",
      accessorKey: "display_version_no",
      header: "Revision No",
      cell: (row) => (row.display_version_no === 0 || row.display_version_no) ? `${row.display_version_no}` : "-",
    },
    {
      id: "assignee",
      header: "Assigned To",
      accessorKey: "user.name",
      filterType: "select",
      isMulti: true,
      filterOptions: [
        { label: "Pending Assignee", value: "pending_assignee" },
        ...users.map(u => ({
          label: u.empid ? `${u.name || u.full_name} (${u.empid})` : (u.name || u.full_name),
          value: String(u.id)
        }))
      ],
      cell: (row) => {
        const name = row.user ? (row.user.name || row.user.full_name || row.user.email) : "Pending Assignee";
        const empid = row.user?.empid || row.user?.employeeId || "";
        
        if (!row.user) {
          return <span className="text-slate-400 italic font-medium">Pending Assignee</span>;
        }

        return empid ? (
          <div className="flex flex-col">
            <span className="font-medium text-slate-700">{name} ({empid})</span>
          </div>
        ) : name;
      },
    },
    
    {
      id: "plant_submission_date",
      accessorKey: "upload_due_days",
      header: "Planned Submission Date",
      cell: (row) => {
        if (!row.upload_due_days) return "-";
        const latestVersion = row.versions && row.versions.length > 0 ? row.versions[0] : null;
        const baseDate = latestVersion ? new Date(latestVersion.createdAt) : new Date(row.createdAt);
        const deadline = new Date(baseDate.getTime() + (row.upload_due_days * 24 * 60 * 60 * 1000));
        return deadline.toLocaleDateString("en-GB", { day: '2-digit', month: 'long', year: 'numeric' });
      },
    },
    {
      id: "status",
      header: "Status",
      filterType: "select",
      filterOptions: [
        { label: "Awaiting Upload", value: "awaiting_upload" },
        { label: "Pending for Approval", value: "pending_approval" },
        { label: "Approved", value: "approved" },
      ],
      cell: (row) => {
        const docStatus = row.status;
        if (docStatus === 'Response Due' || docStatus === 'Upload Due') {
          return (
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
              {docStatus === 'Upload Due' ? 'Upload Overdue' : 'Response Overdue'}
            </span>
          );
        }
        const isUploaderPending = docStatus === 'Pending';
        let text = isUploaderPending ? "Awaiting Upload" : (docStatus === 'Pending for Approval' ? "Pending for Approval" : docStatus);
        let colorClass = isUploaderPending ? "bg-gray-100 text-gray-800" : "bg-orange-100 text-orange-800 border border-orange-200";

        if (docStatus === 'Approved') {
          text = "Approved";
          colorClass = "bg-green-100 text-green-800";
        } else if (docStatus === 'Rejected') {
          text = "Rejected";
          colorClass = "bg-red-100 text-red-800";
        } else if (docStatus === 'Revision Requested') {
          text = "Revision Requested";
          colorClass = "bg-purple-100 text-purple-800 border border-purple-200";
        }

        return (
          <span className={`whitespace-nowrap px-2 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
            {text}
          </span>
        );
      },
    },
    {
      id: "client_status",
      header: "Client Status",
      filterType: "select",
      filterOptions: [
        { label: "Awaiting Client Review", value: "Pending" },
        { label: "Approved", value: "Approved" },
        { label: "Rejected", value: "Rejected" },
        { label: "Commented", value: "Commented" },
        { label: "Re-approval", value: "Re-approval" },
        { label: "As Built", value: "As Built" }
      ],
      cell: (row) => {
        let docStatus = 'Not Sent';
        const latestVersion = row.versions && row.versions.length > 0 ? row.versions[0] : null;
        if (latestVersion && latestVersion.transmission_items && latestVersion.transmission_items.length > 0) {
          docStatus = latestVersion.transmission_items[0].client_status || 'Pending';
        }

        if (docStatus === 'Not Sent') {
            return <span className="text-gray-400 font-medium italic">-</span>;
        }

        let text = docStatus;
        let colorClass = "bg-gray-100 text-gray-800 border border-gray-200";

        if (docStatus === 'Pending') {
          text = "Awaiting Client Review";
          colorClass = "bg-indigo-100 text-indigo-800 border border-indigo-200";
        } else if (docStatus === 'Approved') {
          colorClass = "bg-green-100 text-green-800";
        } else if (docStatus === 'Final Approved') {
          colorClass = "bg-emerald-100 text-emerald-800 border border-emerald-200";
        } else if (docStatus === 'Rejected') {
          colorClass = "bg-red-100 text-red-800 border border-red-200";
        } else if (docStatus === 'Commented') {
          colorClass = "bg-amber-100 text-amber-800 border border-amber-200";
        } else if (docStatus === 'As Built') {
          colorClass = "bg-teal-100 text-teal-800 border border-teal-200";
        } else if (docStatus === 'Re-approval') {
          colorClass = "bg-purple-100 text-purple-800 border border-purple-200";
        }

        return (
          <span className={`whitespace-nowrap px-2 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
            {text}
          </span>
        );
      },
    },
     {
      accessorKey: "is_active",
      header: "Active",
      filterType: "select",
      isMulti: true,
      filterOptions: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" }
      ],
      cell: (row) => row.is_active
        ? <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-medium">Active</Badge>
        : <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20 text-xs font-medium">Inactive</Badge>,
    },
    {
      id: "actions",
      header: "Actions",
      width: "60px",
      cell: (row) => {
        const actions = [];
        
        if (hasPermission("dms:vdr", "Update")) {
           actions.push({ label: "Edit Assignment", icon: Edit, onClick: () => handleEditAssign(row) });
        }
        
        actions.push({ label: "View Trail", icon: History, onClick: () => {
           setActiveDocId(row.id);
           setIsTrailOpen(true);
        }});
        
        const latestVersion = row.versions && row.versions.length > 0 ? row.versions[0] : null;
        const clientStatus = (latestVersion && latestVersion.transmission_items && latestVersion.transmission_items.length > 0) ? latestVersion.transmission_items[0].client_status : null;
        const isClientApproved = clientStatus === 'Approved' || clientStatus === 'Final Approved' || clientStatus === 'As Built';
        
        if (isClientApproved && row.status !== 'Revision Requested') {
           actions.push({ label: "Request Revision", icon: RefreshCw, onClick: () => handleRequestRevision(row) });
        }
        
        if (row.status === 'Revision Requested' && hasPermission("dms:vdr", "Update")) {
           actions.push({ type: "separator" });
           actions.push({ label: "Approve Revision", icon: CheckCircle2, onClick: () => handleApproveRevision(row) });
           actions.push({ label: "Reject Revision", icon: XCircle, onClick: () => handleRejectRevision(row), color: "danger" });
        }
        
        if (hasPermission("dms:vdr", "Delete")) {
           actions.push({ type: "separator" });
           actions.push({ 
             label: row.is_active ? "Deactivate" : "Activate", 
             icon: row.is_active ? XCircle : CheckCircle2, 
             onClick: () => handleToggleStatus(row),
             color: row.is_active ? "danger" : "default"
           });
           actions.push({ type: "separator" });
           actions.push({ label: "Archive Document", icon: Archive, color: "danger", onClick: () => handleDelete(row) });
        }
        
        return (
          <div className="flex items-center justify-center">
            <DataTableRowActions actions={actions} />
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: "customer_name",
      header: "Client",
      accessorKey: "customer.customer_name",
      filterType: "select",
      filterOptions: activeClientOptions,
      cell: (row) => row.customer?.customer_name || "-",
    },
    {
      id: "po_number",
      header: "PO",
      accessorKey: "po.po_number",
      filterType: "select",
      filterOptions: activePoOptions,
      cell: (row) => row.po?.po_number || "-",
    },
    {
      id: "job_number",
      header: "Job Number",
      accessorKey: "job_number",
      filterType: "select",
      isMulti: true,
      filterOptions: activeJobOptions,
      cell: (row) => {
        const jobs = row.group?.job_group?.map(jg => jg.job?.job_number).filter(Boolean);
        return jobs && jobs.length > 0 ? jobs.join(', ') : "-";
      },
    },
    {
      accessorKey: "upload_due_days",
      header: "Upload Due Days",
      cell: (row) => row.upload_due_days || "-",
    },
    {
      accessorKey: "response_due_days",
      header: "Response Due Days",
      cell: (row) => row.response_due_days || "-",
    },
     {
      accessorKey: "createdAt",
      header: "Created At",
      cell: (row) => new Date(row.createdAt).toLocaleDateString("en-GB"),
    },
    {
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: (row) => new Date(row.updatedAt).toLocaleDateString("en-GB"),
    },

  ], [activeClientOptions, activePoOptions, activeJobOptions, users, hasPermission]);

  const proTableTopFilters = useMemo(() => [
    {
      value: statusFilter,
      onChange: setStatusFilter,
      placeholder: "All Status",
      options: [
        { label: "All Status", value: "all" },
        { label: "Awaiting Upload", value: "awaiting_upload" },
        { label: "Pending for Approval", value: "pending_approval" },
        { label: "Approved", value: "approved" },
        { label: "Awaiting Client Review", value: "awaiting_client_review" },
        { label: "Rejected", value: "rejected" },
        { label: "Commented", value: "Commented" },
        { label: "As Built", value: "As Built" },
        { label: "Re-approval", value: "Re-approval" },
      ]
    }
  ], [statusFilter]);

  const fetchAssignedDocuments = useCallback(async ({ page, limit, search, columnFilters }) => {
    try {
      const p = page || 1;
      const l = limit || 10;
      const params = { page: p, limit: l };

      if (search) params.search = search.trim();
      if (statusFilter && statusFilter !== 'all') params.status_filter = statusFilter;

      // Map column-based filters to API params safely
      if (columnFilters) {
        Object.keys(columnFilters).forEach(key => {
          const val = columnFilters[key];
          if (val === undefined || val === null || val === "") return;
          if (Array.isArray(val) && val.length === 0) return;

          if (key === 'customer_name') params.customer_name_filter = val;
          else if (key === 'po_number') params.po_number_filter = val;
          else if (key === 'job_number') params.job_number_filter = val;
          else if (key === 'status') params.uploader_status_filter = val;
          else if (key === 'documentName') params.search = val;
          else if (key === 'shreno_doc_no') params.shreno_doc_no_filter = val;
          else if (key === 'client_doc_no') params.client_doc_no_filter = val;
          else if (key === 'assignee') params.user_id_filter = val;
          else if (key === 'is_active' || key === 'client_status') {
             const currentFilters = params.columnFilters ? JSON.parse(params.columnFilters) : {};
             currentFilters[key] = val;
             params.columnFilters = JSON.stringify(currentFilters);
          }
        });
      }

      console.log("Fetching assigned documents with params:", params);
      globalSearchRef.current = search || "";
      const response = await apiClient.get("/api/dcc/get-assigned-documents", params);

      if (response && response.success) {
        setCurrentTableData(response.data || []);
        return {
          data: response.data || [],
          meta: response.meta || { total: (response.data || []).length, page: p, limit: l }
        };
      }
      setCurrentTableData([]);
      return { data: [], meta: {} };
    } catch (err) {
      console.error("Error fetching documents:", err);
      setCurrentTableData([]);
      return { data: [], meta: {} };
    }
  }, [statusFilter]);

  const handleSelectionChange = useCallback((newSelectedIds) => {
    setSelectedRowIds(newSelectedIds);
    setSelectedRowObjects(prev => {
      const next = new Map(prev);
      // Remove any that are no longer in newSelectedIds
      for (const id of next.keys()) {
        if (!newSelectedIds.has(id)) {
          next.delete(id);
        }
      }
      // Add any newly selected from currentTableData
      newSelectedIds.forEach(id => {
        if (!next.has(id)) {
          const row = currentTableData.find(r => r.id === id);
          if (row) {
            next.set(id, row);
          }
        }
      });
      return next;
    });
  }, [currentTableData]);

  // Helper to fetch and merge POs
  const fetchPos = async (customerId = "", search = "") => {
    try {
      const params = { limit: 100 }
      if (customerId) params.customer_id = customerId
      if (search) params.search = search
      const res = await apiClient.get("/api/dcc/get-pos", params)
      if (res.success) {
        setAllPos(prev => {
          const combined = [...prev, ...(res.data || [])]
          // De-duplicate by ID
          return Array.from(new Map(combined.map(item => [item.id, item])).values())
        })
      }
    } catch (err) {
      console.error("Error fetching POs:", err)
    }
  }

  // Helper to fetch and merge Jobs
  const fetchJobs = async (poId = "", customerId = "", search = "") => {
    try {
      const params = { limit: 100 }
      if (poId) params.po_id = poId
      if (customerId) params.customer_id = customerId
      if (search) params.search = search
      const res = await apiClient.get("/api/dcc/get-jobs", params)
      if (res.success) {
        setAllJobs(prev => {
          const combined = [...prev, ...(res.data || [])]
          return Array.from(new Map(combined.map(item => [item.id, item])).values())
        })
      }
    } catch (err) {
      console.error("Error fetching jobs:", err)
    }
  }

  // Helper to fetch and merge Customers (for search results)
  const fetchCustomers = async (search = "") => {
    try {
      const params = { limit: 100 }
      if (search) params.search = search
      const res = await apiClient.get("/api/dcc/get-customers", params)
      if (res.success) {
        setCustomers(prev => {
          const combined = [...prev, ...(res.data || [])]
          return Array.from(new Map(combined.map(item => [item.id, item])).values())
        })
      }
    } catch (err) {
      console.error("Error fetching customers:", err)
    }
  }

  // --- Helpers for Dynamic Rows ---
  const addRow = () => {
    setAssignments(prev => [
      ...prev,
      {
        tempId: Date.now(),
        jobId: [],
        searchQuery: "",
        customerId: "",
        customerSearch: "",
        poId: "",
        poSearch: "",
        documentName: "",
        shrenoDocumentNo: "",
        clientDocumentNo: "",
        assignUserId: "",
        upload_due_days: "",
        response_due_days: "",
      }
    ])
  }

  const removeRow = (tempId) => {
    if (assignments.length === 1) {
      toast.warn("At least one row is required")
      return
    }
    setAssignments(prev => prev.filter(row => row.tempId !== tempId))
  }

  const copyRow = (row) => {
    setAssignments(prev => [
      ...prev,
      {
        ...row,
        tempId: Date.now() + Math.random(), // Ensure unique tempId
      }
    ])
  }

  // --- Handlers ---
  const handleAssignmentChange = async (tempId, field, value) => {
    setAssignments(prev => prev.map(row => {
      if (row.tempId !== tempId) return row;

      let updatedRow = { ...row, [field]: value };

      // Two-way sync between upload_due_days and planned_submission_date
      if (field === 'planned_submission_date' && value) {
        const targetDate = new Date(value);
        const createdAt = new Date(row.createdAt || new Date());
        targetDate.setHours(0,0,0,0);
        createdAt.setHours(0,0,0,0);
        const diffMs = targetDate.getTime() - createdAt.getTime();
        updatedRow.upload_due_days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24))).toString();
      } else if (field === 'upload_due_days') {
        updatedRow.planned_submission_date = ""; // Clear explicit date so it derives from days again
      }

      // Handle search queries with debouncing
      if (['customerSearch', 'poSearch', 'searchQuery'].includes(field)) {
        const key = `${tempId}_${field}`;
        if (searchTimeoutRef.current[key]) clearTimeout(searchTimeoutRef.current[key]);

        searchTimeoutRef.current[key] = setTimeout(() => {
          if (field === 'customerSearch') fetchCustomers(value);
          else if (field === 'poSearch') fetchPos(updatedRow.customerId, value);
          else if (field === 'searchQuery') fetchJobs(updatedRow.poId, updatedRow.customerId, value);
        }, 500);
      }

      if (field === 'customerId') {
        updatedRow.customerSearch = "";
        // Reset PO and Job if they don't belong to the new customer
        const currentPo = allPos.find(p => p.id === row.poId);
        if (currentPo && currentPo.customer_id !== value) {
          updatedRow.poId = "";
          updatedRow.jobId = "";
        }
        // Fetch new POs for this customer
        if (value) fetchPos(value);
      } else if (field === 'poId') {
        updatedRow.poSearch = "";
        const selectedPo = allPos.find(p => p.id === value);
        if (selectedPo) {
          updatedRow.customerId = selectedPo.customer_id || "";
          // Reset Job if it doesn't belong to the new PO
          const currentJob = allJobs.find(j => j.id === row.jobId);
          if (currentJob && currentJob.po_id !== value) {
            updatedRow.jobId = "";
          }
          // Fetch new jobs for this PO if needed
          fetchJobs(value, selectedPo.customer_id);
        }
      } else if (field === 'jobId') {
        const jobIds = Array.isArray(value) ? value : (value ? [value] : []);
        updatedRow.jobId = jobIds;

        if (jobIds.length > 0) {
          const firstJobId = jobIds[0];
          const selectedJob = allJobs.find(j => String(j.id) === String(firstJobId));
          if (selectedJob) {
            updatedRow.poId = selectedJob.po_id || "";
            updatedRow.customerId = selectedJob.customer_id || "";
            updatedRow.searchQuery = "";
            if (selectedJob.po_id && !allPos.find(p => p.id === selectedJob.po_id)) {
              fetchPos("", "", selectedJob.po_id);
            }
          }
        }
      }

      return updatedRow;
    }))
  }

  const handleEditAssign = (row) => {
    setEditingId(row.id)
    setView("assign")

    const targetJobs = row.group?.job_group?.map(jg => jg.job).filter(Boolean) || [];
    if (targetJobs.length > 0) {
      // Cache these jobs and their POs immediately so metadata (like Location) is available
      setAllJobs(prev => Array.from(new Map([...prev, ...targetJobs].map(item => [item.id, item])).values()));
      const pos = targetJobs.map(j => j.po).filter(Boolean);
      if (pos.length > 0) {
        setAllPos(prev => Array.from(new Map([...prev, ...pos].map(item => [item.id, item])).values()));
      }
    }

    const firstJob = targetJobs[0] || {};

    setAssignments([
      {
        tempId: Date.now(),
        editingId: row.id,
        jobId: row.group?.job_group?.map(jg => jg.job_id).filter(Boolean) || [],
        customerId: firstJob.customer_id || "",
        poId: firstJob.po_id || "",
        documentName: row.document?.document_name || "",
        documentId: row.document_id || "",
        shrenoDocumentNo: row.shreno_doc_no || "",
        clientDocumentNo: row.client_doc_no || "",
        assignUserId: row.user_id || "",
        upload_due_days: row.upload_due_days || "",
        response_due_days: row.response_due_days || "",
        createdAt: (row.versions && row.versions.length > 0) ? row.versions[0].createdAt : (row.createdAt || new Date().toISOString()),
        planned_submission_date: ""
      }
    ])
  }

  const handleBulkEdit = () => {
    if (selectedRowIds.size === 0) return;
    
    // Convert Set to array of rows from mapped objects
    const selectedRows = Array.from(selectedRowObjects.values()).filter(Boolean);
    
    if (selectedRows.length === 0) {
       toast.error("Could not load data for selected rows.");
       return;
    }

    setView("assign")
    setEditingId(true) 
    
    const allTargetJobs = [];
    selectedRows.forEach(row => {
        const targetJobs = row.group?.job_group?.map(jg => jg.job).filter(Boolean) || [];
        allTargetJobs.push(...targetJobs);
    });
    
    if (allTargetJobs.length > 0) {
      setAllJobs(prev => Array.from(new Map([...prev, ...allTargetJobs].map(item => [item.id, item])).values()));
      const pos = allTargetJobs.map(j => j.po).filter(Boolean);
      if (pos.length > 0) {
        setAllPos(prev => Array.from(new Map([...prev, ...pos].map(item => [item.id, item])).values()));
      }
    }

    const newAssignments = selectedRows.map((row, idx) => {
        const targetJobs = row.group?.job_group?.map(jg => jg.job).filter(Boolean) || [];
        const firstJob = targetJobs[0] || {};
        return {
            tempId: Date.now() + idx,
            editingId: row.id,
            jobId: row.group?.job_group?.map(jg => jg.job_id).filter(Boolean) || [],
            customerId: firstJob.customer_id || "",
            poId: firstJob.po_id || "",
            documentName: row.document?.document_name || "",
            documentId: row.document_id || "",
            shrenoDocumentNo: row.shreno_doc_no || "",
            clientDocumentNo: row.client_doc_no || "",
            assignUserId: row.user_id || "",
            upload_due_days: row.upload_due_days || "",
            response_due_days: row.response_due_days || "",
            createdAt: (row.versions && row.versions.length > 0) ? row.versions[0].createdAt : (row.createdAt || new Date().toISOString()),
            planned_submission_date: ""
        }
    });

    setAssignments(newAssignments);
  }

  // handleNext removed during streamlining

  // Handle back to selection and reset form
  const handleBack = () => {
    setView("list")
    setEditingId(null)
    setSelectedRowIds(new Set())
    setSelectedRowObjects(new Map())
    // Reset form data removed
    setAssignments([
      {
        tempId: Date.now(),
        jobId: [],
        documentName: "",
        shrenoDocumentNo: "",
        shrenoReferenceNo: "",
        clientDocumentNo: "",
        clientReferenceNo: "",
        assignUserId: "",
        upload_due_days: "",
        response_due_days: "",
        createdAt: new Date().toISOString(),
        planned_submission_date: ""
      }
    ])
  }

  const handleAssign = async () => {
    const validAssignments = assignments.filter(a => a.jobId && a.documentName)
    if (validAssignments.length === 0) {
      toast.error("Please complete at least one assignment row (Job, Name).");
      return;
    }

    setIsLoading(true)

    const requestBody = {
      assignments: validAssignments.map(a => ({
        job_id: a.jobId,
        document_name: a.documentName,
        shreno_document_no: a.shrenoDocumentNo,
        shreno_reference_no: a.shrenoReferenceNo,
        client_document_no: a.clientDocumentNo,
        client_reference_no: a.clientReferenceNo,
        assign_user_id: a.assignUserId,
        upload_due_days: a.upload_due_days ? parseInt(a.upload_due_days) : null,
        response_due_days: a.response_due_days ? parseInt(a.response_due_days) : null,
      })),
    }

    try {
      let response;
      if (editingId) {
        const updates = validAssignments.filter(a => a.editingId).map(a => {
          const updateBody = {
            id: a.editingId,
            job_ids: a.jobId,
            document_id: a.documentId,
            document_name: a.documentName,
            assign_user_id: a.assignUserId || null,
            upload_due_days: a.upload_due_days ? parseInt(a.upload_due_days) : null,
            response_due_days: a.response_due_days ? parseInt(a.response_due_days) : null,
            shreno_document_no: a.shrenoDocumentNo,
            client_document_no: a.clientDocumentNo,
          };
          if (a.planned_submission_date) {
              updateBody.planned_submission_date = a.planned_submission_date;
          }
          return updateBody;
        });

        if (updates.length === 0) {
          toast.warn("No valid assignments to update.");
          setIsLoading(false);
          return;
        }

        response = await apiClient.put("/api/dcc/bulk-update-assigned-documents", { updates });
      } else {
        response = await apiClient.post("/api/dcc/bulk-assign-documents", requestBody);
      }

      if (response.success) {
        toast.success(editingId ? "Assignments updated successfully!" : "Documents assigned successfully!");
        handleBack();
        setRefreshKey(prev => prev + 1);
      }
    } catch (err) {
      console.error("Error assigning documents:", err)
      toast.error(err.message || "Failed to assign documents.")
    } finally {
      setIsLoading(false)
    }
  }
  const onFilterChange = (newFilters) => {
    setColumnFilters(prev => {
      const updated = { ...prev, ...newFilters };

      // Handle Multi-select Array vs Single value mapping
      Object.keys(newFilters).forEach(key => {
        const val = newFilters[key];
        if (Array.isArray(val) && val.length === 0) {
          delete updated[key];
        }
      });

      // Reverse Cascading Auto-Select Logic (Enhanced for Multi-select)
      // Only auto-select parent if a SINGLE item is selected in child (to avoid ambiguity)
      if (newFilters.hasOwnProperty('job_number')) {
        const jobVal = newFilters.job_number;
        const actualJobVal = Array.isArray(jobVal) ? (jobVal.length === 1 ? jobVal[0] : null) : jobVal;

        if (actualJobVal) {
          const selectedJob = activeFilters.jobs.find(j => (j.job_number || j.number || "").toString() === actualJobVal.toString());
          if (selectedJob) {
            const poNum = (selectedJob.po?.po_number || selectedJob.po_number || "").toString();
            const custName = (selectedJob.customer?.customer_name || selectedJob.customer_name || "").toString();
            if (poNum) updated.po_number = poNum;
            if (custName) updated.customer_name = custName;
          }
        }
      } else if (newFilters.hasOwnProperty('po_number')) {
        const poVal = newFilters.po_number;
        const actualPoVal = Array.isArray(poVal) ? (poVal.length === 1 ? poVal[0] : null) : poVal;

        if (actualPoVal) {
          const selectedPo = activeFilters.pos.find(p => (p.po_number || p.number || "").toString() === actualPoVal.toString());
          if (selectedPo) {
            const custName = (selectedPo.customer?.customer_name || selectedPo.customer_name || "").toString();
            if (custName) updated.customer_name = custName;
          }
        }
      }

      // Forward Cascading Reset Logic (only if manually changing a parent)
      if (newFilters.hasOwnProperty('customer_name')) {
        // If customer changed, reset children if they are not compatible
        const newCust = Array.isArray(newFilters.customer_name) ? newFilters.customer_name : [newFilters.customer_name];
        // For simplicity, we mostly reset if it's a single select change. 
        // If it's multi-select, we might just keep them and let the user refine.
        if (newCust.length === 1 && newCust[0]) {
          // Check current PO
          const currentPo = Array.isArray(updated.po_number) ? updated.po_number[0] : updated.po_number;
          const poObj = activeFilters.pos.find(p => (p.po_number || p.number || "").toString() === (currentPo || "").toString());
          if (poObj && (poObj.customer?.customer_name || poObj.customer_name || "").toString() !== newCust[0].toString()) {
            delete updated.po_number;
            delete updated.job_number;
          }
        }
      }

      return updated;
    });
  };

  const handleExport = async (type) => {
    try {
      const params = {};
      if (type !== "all") {
        if (statusFilter && statusFilter !== 'all') params.status_filter = statusFilter;
        
        if (columnFilters) {
          if (columnFilters.customer_name) params.customer_name_filter = columnFilters.customer_name;
          if (columnFilters.po_number) params.po_number_filter = columnFilters.po_number;
          if (columnFilters.job_number) params.job_number_filter = columnFilters.job_number;
          if (columnFilters.status) params.uploader_status_filter = columnFilters.status;
          if (columnFilters.shreno_doc_no) params.shreno_doc_no_filter = columnFilters.shreno_doc_no;
          if (columnFilters.client_doc_no) params.client_doc_no_filter = columnFilters.client_doc_no;
          if (columnFilters.documentName) params.search = columnFilters.documentName;
          if (columnFilters.assignee) params.user_id_filter = columnFilters.assignee;
        }
        
        if (globalSearchRef.current) {
          params.search = globalSearchRef.current;
        }
      }

      await exportApi.exportModule("group_document", "Assigned documents export.xlsx", params)
      setRefreshKey(prev => prev + 1)


    } catch (error) {
      console.error("Export failed:", error)
    }
  }

  const handleToggleStatus = (row) => {
    setConfirmData({
      title: "Change Status",
      description: `Are you sure you want to ${row.is_active ? 'deactivate' : 'activate'} this assignment?`,
      action: async () => {
        try {
          const res = await apiClient.patch(`/api/dcc/assigned-documents/toggle-status/${row.id}`)
          if (res.success) {
            toast.success(`Assignment ${row.is_active ? 'deactivated' : 'activated'} successfully`)
            setRefreshKey(prev => prev + 1)
          }
        } catch (err) {
          toast.error(err.message || "Failed to toggle status")
        }
      },
      variant: "warning"
    })
    setConfirmDialogOpen(true)
  }

  const handleDelete = (row) => {
    setConfirmData({
      title: "Archive Assignment",
      description: "Are you sure you want to archive this assignment?",
      action: async () => {
        try {
          const res = await apiClient.delete(`/api/dcc/delete-assigned-document/${row.id}`)
          if (res.success) {
            toast.success("Assignment archived successfully")
            setRefreshKey(prev => prev + 1)
          }
        } catch (err) {
          toast.error(err.message || "Failed to archive assignment")
        }
      },
      variant: "danger"
    })
    setConfirmDialogOpen(true)
  }

  const handleRequestRevision = (row) => {
    setConfirmData({
      title: "Request Revision",
      description: "Are you sure you want to request a new revision for this document? It will be sent to the Admin for approval.",
      showInput: true,
      inputPlaceholder: "Reason for revision...",
      action: async (remarks) => {
        try {
          const res = await apiClient.post(`/api/dcc/assigned-documents/${row.id}/request-revision`, { remarks })
          if (res.success) {
            toast.success("Revision requested successfully")
            setRefreshKey(prev => prev + 1)
          }
        } catch (err) {
          toast.error(err.message || "Failed to request revision")
        }
      },
      variant: "default"
    })
    setConfirmDialogOpen(true)
  }

  const handleApproveRevision = (row) => {
    setConfirmData({
      title: "Approve Revision Request",
      description: "Are you sure you want to approve this revision request? A new pending version will be created for the uploader.",
      action: async () => {
        try {
          const res = await apiClient.post(`/api/dcc/assigned-documents/${row.id}/approve-revision`)
          if (res.success) {
            toast.success("Revision request approved")
            setRefreshKey(prev => prev + 1)
          }
        } catch (err) {
          toast.error(err.message || "Failed to approve revision request")
        }
      },
      variant: "default"
    })
    setConfirmDialogOpen(true)
  }

  const handleRejectRevision = (row) => {
    setConfirmData({
      title: "Reject Revision Request",
      description: "Are you sure you want to reject this revision request? The document will remain Approved.",
      showInput: true,
      inputPlaceholder: "Reason for rejection...",
      action: async (remarks) => {
        try {
          const res = await apiClient.post(`/api/dcc/assigned-documents/${row.id}/reject-revision`, { remarks })
          if (res.success) {
            toast.success("Revision request rejected")
            setRefreshKey(prev => prev + 1)
          }
        } catch (err) {
          toast.error(err.message || "Failed to reject revision request")
        }
      },
      variant: "danger"
    })
    setConfirmDialogOpen(true)
  }

  const confirmAction = async (inputValue) => {
    if (confirmData.action) {
      await confirmData.action(inputValue)
    }
  }

  const isSubmitDisabled = isLoading || assignments.some(a => !a.jobId || !a.documentName || !a.assignUserId)

  return (
    <PageContainer className="overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 w-full">
        <div className="flex justify-end mb-4 w-full">
{view === "list" ? (
              <>
              {selectedRowIds.size > 0 && (
                <Button onClick={handleBulkEdit} size="sm" className="rounded-sm bg-slate-800 text-white hover:bg-slate-700 shadow-none cursor-pointer">
                  <Edit className="mr-2 h-4 w-4" /> Edit Selected ({selectedRowIds.size})
                </Button>
              )}
              </>
          ) : (
            <Button variant="outline" size="sm" onClick={handleBack} className="rounded-sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
            </Button>
          )}
        </div>

          {/* List View */}
          {view === 'list' && (
            <ProDataTable
              columns={columns}
              fetchData={fetchAssignedDocuments}
              customToolbarActions={
                hasPermission("dms:vdr", "Export") && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200 bg-white text-slate-600 data-[state=open]:bg-slate-50 hover:bg-slate-50 shadow-none ml-1">
                        <Download className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-white border border-slate-200 shadow-lg p-1.5">
                      <DropdownMenuItem onClick={() => handleExport("filtered")} className="text-xs font-medium cursor-pointer flex items-center">
                        <Download className="mr-2 h-4 w-4" />
                        Export Filtered Data
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("all")} className="text-xs font-medium cursor-pointer flex items-center">
                        <Download className="mr-2 h-4 w-4" />
                        Export All Data
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              }
              onAdd={hasPermission("dms:vdr", "Create") ? () => { handleBack(); setView("assign"); } : undefined}
              onImport={hasPermission("dms:vdr", "Create") ? handleImportExcel : undefined}
              onDownloadTemplate={hasPermission("dms:vdr", "Create") ? handleDownloadTemplate : undefined}
              selectedRows={selectedRowIds}
              onSelectionChange={handleSelectionChange}
              columnFilters={columnFilters}
              onFilterChange={(newFilter) => {
                setColumnFilters(prev => {
                  const updated = { ...prev, ...newFilter };

                  // Handle Multi-select Array vs Single value mapping
                  Object.keys(newFilter).forEach(key => {
                    const val = newFilter[key];
                    if (Array.isArray(val) && val.length === 0) {
                      delete updated[key];
                    }
                  });

                  // Reverse Cascading Auto-Select Logic
                  if (newFilter.hasOwnProperty('job_number')) {
                    const jobVal = newFilter.job_number;
                    const actualJobVal = Array.isArray(jobVal) ? (jobVal.length === 1 ? jobVal[0] : null) : jobVal;

                    if (actualJobVal) {
                      const selectedJob = activeFilters.jobs.find(j => (j.job_number || "").toString() === actualJobVal.toString());
                      if (selectedJob) {
                        const poNum = (selectedJob.po?.po_number || selectedJob.po_number || "").toString();
                        const custName = (selectedJob.customer?.customer_name || selectedJob.customer_name || "").toString();
                        if (poNum) updated.po_number = poNum;
                        if (custName) updated.customer_name = custName;
                      }
                    }
                  } else if (newFilter.hasOwnProperty('po_number')) {
                    const poVal = newFilter.po_number;
                    const actualPoVal = Array.isArray(poVal) ? (poVal.length === 1 ? poVal[0] : null) : poVal;

                    if (actualPoVal) {
                      const selectedPo = activeFilters.pos.find(p => (p.po_number || "").toString() === actualPoVal.toString());
                      if (selectedPo) {
                        const custName = (selectedPo.customer?.customer_name || selectedPo.customer_name || "").toString();
                        if (custName) updated.customer_name = custName;
                      }
                    }
                  }

                  // Forward Cascading Reset Logic (Intelligent)
                  if (newFilter.hasOwnProperty('customer_name')) {
                    const newCust = Array.isArray(newFilter.customer_name) ? newFilter.customer_name : [newFilter.customer_name];
                    if (newCust.length === 1 && newCust[0]) {
                      const currentPo = updated.po_number;
                      const poObj = activeFilters.pos.find(p => (p.po_number || "").toString() === (currentPo || "").toString());
                      if (poObj && (poObj.customer?.customer_name || poObj.customer_name || "").toString() !== newCust[0].toString()) {
                        delete updated.po_number;
                        delete updated.job_number;
                      }
                    }
                  } else if (newFilter.hasOwnProperty('po_number')) {
                    const newPo = Array.isArray(newFilter.po_number) ? newFilter.po_number : [newFilter.po_number];
                    if (newPo.length === 1 && newPo[0]) {
                      const currentJob = Array.isArray(updated.job_number) ? updated.job_number[0] : updated.job_number;
                      const jobObj = activeFilters.jobs.find(j => (j.job_number || "").toString() === (currentJob || "").toString());
                      if (jobObj && (jobObj.po?.po_number || jobObj.po_number || "").toString() !== newPo[0].toString()) {
                        delete updated.job_number;
                      }
                    }
                  }

                  return updated;
                });
              }}
              refreshKey={refreshKey}
              topFilters={proTableTopFilters}
              globalSearchPlaceholder="Search documents..."
              initialStickyColumns={["document.document_number"]}
              defaultColumnFilters={{ is_active: ['true'] }}
              lockActiveFilters={true}
            />
          )}

          {confirmData.showInput ? (
            <PromptDialog
              isOpen={confirmDialogOpen}
              onClose={() => setConfirmDialogOpen(false)}
              title={confirmData.title}
              description={confirmData.description}
              onConfirm={confirmAction}
              variant={confirmData.variant}
              inputPlaceholder={confirmData.inputPlaceholder}
            />
          ) : (
            <ConfirmDialog
              isOpen={confirmDialogOpen}
              onClose={() => setConfirmDialogOpen(false)}
              title={confirmData.title}
              description={confirmData.description}
              onConfirm={confirmAction}
              variant={confirmData.variant}
            />
          )}

          {view === 'assign' && (
            <div className="flex-1 flex flex-col w-full space-y-6">
              {/* Document Details Section */}

              <div className="space-y-6">
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <h2 className="text-xl ">Document Details</h2>
                    <p className="text-sm text-muted-foreground">Enter details for the documents to be assigned</p>
                  </div>
                  <Button type="button" size="sm" onClick={addRow}>
                    <Plus className="mr-2 h-4 w-4" /> Add Row
                  </Button>
                </div>
                <div>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 whitespace-nowrap">
                          {/* ... existing table headers ... */}
                          <TableHead className="w-[50px]">S.No</TableHead>
                          <TableHead className="min-w-[200px]">Customer <span className="text-destructive">*</span></TableHead>
                          <TableHead className="min-w-[150px]">PO Number <span className="text-destructive">*</span></TableHead>
                          <TableHead className="min-w-[150px]">Location</TableHead>
                          <TableHead className="min-w-[200px]">Job Number <span className="text-destructive">*</span></TableHead>
                          <TableHead className="min-w-[200px]">Document Name <span className="text-destructive">*</span></TableHead>
                          <TableHead className="min-w-[150px]">Shreno Document No</TableHead>
                          <TableHead className="min-w-[150px]">Client Document No</TableHead>
                          <TableHead className="min-w-[100px]">Upload Due Days</TableHead>
                          <TableHead className="min-w-[100px]">Response Due Days</TableHead>
                          <TableHead className="min-w-[150px]">Planned Submission Date</TableHead>
                          <TableHead className="min-w-[180px]">Assign User <span className="text-destructive">*</span></TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignments.map((assignment, idx) => {
                          const jobDetails = allJobs.find(j => j.id === assignment.jobId);
                          const poDetails = allPos.find(p => p.id === assignment.poId);
                          const displayLocation = jobDetails?.customer_location?.location_name || poDetails?.customer_location?.location_name || "auto-fill";

                          return (
                            <TableRow key={assignment.tempId}>
                              <TableCell className="font-medium">{idx + 1}</TableCell>

                              {/* Customer Select */}
                              <TableCell>
                                <Select
                                  value={assignment.customerId}
                                  onValueChange={val => handleAssignmentChange(assignment.tempId, 'customerId', val)}
                                  required
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Customer" />
                                  </SelectTrigger>
                                  <SelectContent position="popper" sideOffset={5} className="min-w-[var(--radix-select-trigger-width)] max-w-[400px]">
                                    <div className="p-2 sticky top-0 bg-popover z-10 w-full mb-1 border-b">
                                      <Input
                                        placeholder="Search Customer..."
                                        value={assignment.customerSearch || ""}
                                        onChange={e => handleAssignmentChange(assignment.tempId, 'customerSearch', e.target.value)}
                                        onKeyDown={e => e.stopPropagation()}
                                        onClick={e => e.stopPropagation()}
                                        className="h-8 shadow-none border-none focus-visible:ring-0 px-1"
                                        autoFocus
                                      />
                                    </div>
                                    <div className="max-h-[250px] overflow-y-auto">
                                      {customers
                                        .filter(c => !assignment.customerSearch || c.customer_name.toLowerCase().includes(assignment.customerSearch.toLowerCase()))
                                        .map(c => (
                                          <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                                            {c.customer_name}
                                          </SelectItem>
                                        ))}
                                    </div>
                                  </SelectContent>
                                </Select>
                              </TableCell>

                              {/* PO Number Select */}
                              <TableCell>
                                <Select
                                  value={assignment.poId}
                                  onValueChange={val => handleAssignmentChange(assignment.tempId, 'poId', val)}
                                  required
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select PO" />
                                  </SelectTrigger>
                                  <SelectContent position="popper" sideOffset={5} className="min-w-[var(--radix-select-trigger-width)] max-w-[400px]">
                                    <div className="p-2 sticky top-0 bg-popover z-10 w-full mb-1 border-b">
                                      <Input
                                        placeholder="Search PO..."
                                        value={assignment.poSearch || ""}
                                        onChange={e => handleAssignmentChange(assignment.tempId, 'poSearch', e.target.value)}
                                        onKeyDown={e => e.stopPropagation()}
                                        onClick={e => e.stopPropagation()}
                                        className="h-8 shadow-none border-none focus-visible:ring-0 px-1"
                                        autoFocus
                                      />
                                    </div>
                                    <div className="max-h-[250px] overflow-y-auto">
                                      {allPos
                                        .filter(p => !assignment.customerId || p.customer_id === assignment.customerId)
                                        .filter(p => !assignment.poSearch || p.po_number.toLowerCase().includes(assignment.poSearch.toLowerCase()))
                                        .map(p => (
                                          <SelectItem key={p.id} value={p.id} className="cursor-pointer">
                                            <div className="flex flex-col text-left">
                                              <span>{p.po_number}</span>
                                              {!assignment.customerId && p.customer?.customer_name && (
                                                <span className="text-[10px] text-muted-foreground font-normal">
                                                  {p.customer.customer_name}
                                                </span>
                                              )}
                                            </div>
                                          </SelectItem>
                                        ))}
                                    </div>
                                  </SelectContent>
                                </Select>
                              </TableCell>

                              {/* Read-Only Location Column */}
                              <TableCell>
                                <Input
                                  value={displayLocation}
                                  className="w-full bg-slate-50 text-slate-500 cursor-not-allowed"
                                  readOnly
                                />
                              </TableCell>

                              {/* MSN/JOB No Multi-Select Dropdown */}
                              <TableCell>
                                <SearchableSelect
                                  multi
                                  value={assignment.jobId}
                                  onValueChange={val => handleAssignmentChange(assignment.tempId, 'jobId', val)}
                                  options={allJobs
                                    .filter(j => !assignment.poId || String(j.po_id) === String(assignment.poId))
                                    .filter(j => !assignment.customerId || String(j.customer_id) === String(assignment.customerId))
                                    .map(job => ({
                                      value: String(job.id),
                                      label: job.job_number
                                    }))
                                  }
                                  placeholder="Select Jobs"
                                  searchPlaceholder="Search Job..."
                                  className=" h-9"
                                />
                              </TableCell>

                              {/* Document Name Input */}
                              <TableCell>
                                <Input
                                  placeholder="Document Name"
                                  value={assignment.documentName}
                                  onChange={e => handleAssignmentChange(assignment.tempId, 'documentName', e.target.value)}
                                  className="w-full"
                                  required
                                />
                              </TableCell>

                              <TableCell>
                                <Input
                                  placeholder="Shreno Doc No"
                                  value={assignment.shrenoDocumentNo}
                                  onChange={e => handleAssignmentChange(assignment.tempId, 'shrenoDocumentNo', e.target.value)}
                                  className="w-full"
                                  required
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  placeholder="Client Doc No"
                                  value={assignment.clientDocumentNo}
                                  onChange={e => handleAssignmentChange(assignment.tempId, 'clientDocumentNo', e.target.value)}
                                  className="w-full"
                                  required
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  placeholder="Days"
                                  value={assignment.upload_due_days}
                                  onChange={e => handleAssignmentChange(assignment.tempId, 'upload_due_days', e.target.value)}
                                  className="w-full"
                                  min="0"
                                  required
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  placeholder="Days"
                                  value={assignment.response_due_days}
                                  onChange={e => handleAssignmentChange(assignment.tempId, 'response_due_days', e.target.value)}
                                  className="w-full"
                                  min="0"
                                  required
                                />
                              </TableCell>

                              <TableCell>
                                {hasPermission("dms:vdr", "Update") ? (
                                  <Input
                                    type="date"
                                    value={assignment.planned_submission_date || (() => {
                                      if (!assignment.upload_due_days || isNaN(assignment.upload_due_days)) return "";
                                      const d = new Date(assignment.createdAt || new Date());
                                      d.setDate(d.getDate() + parseInt(assignment.upload_due_days));
                                      // format to YYYY-MM-DD for input type date
                                      return d.toISOString().split('T')[0];
                                    })()}
                                    onChange={e => handleAssignmentChange(assignment.tempId, 'planned_submission_date', e.target.value)}
                                    className="w-full"
                                  />
                                ) : (
                                  <Input
                                    value={(() => {
                                      if (!assignment.upload_due_days || isNaN(assignment.upload_due_days)) return "Enter Days First";
                                      const d = new Date(assignment.createdAt || new Date());
                                      d.setDate(d.getDate() + parseInt(assignment.upload_due_days));
                                      return d.toLocaleDateString("en-GB");
                                    })()}
                                    className="w-full bg-slate-50 text-slate-500  cursor-not-allowed"
                                    readOnly
                                    disabled
                                  />
                                )}
                              </TableCell>

                              {/* User Selection with SearchableSelect */}
                              <TableCell>
                                <SearchableSelect
                                  value={assignment.assignUserId}
                                  onValueChange={val => handleAssignmentChange(assignment.tempId, 'assignUserId', val)}
                                  options={users.map(user => ({
                                    value: String(user.id),
                                    label: user.empid ? `${user.name || user.full_name} (${user.empid})` : (user.name || user.full_name || user.email)
                                  }))}
                                  placeholder="Select User"
                                  searchPlaceholder="Search User..."
                                  className="h-9"
                                />
                              </TableCell>

                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={() => copyRow(assignment)}
                                    title="Copy Row"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeRow(assignment.tempId)}
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    title="Remove Row"
                                  >
                                    <Plus className="h-4 w-4 rotate-45" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <Button className="cursor-pointer" variant="outline" onClick={handleBack} disabled={isLoading}>Cancel</Button>
                    <AccessControl required="dms:vdr:Create">
                    <Button className="cursor-pointer" onClick={handleAssign} disabled={isSubmitDisabled}>
                      {isLoading ? (editingId ? "Updating..." : "Assigning...") : (editingId ? "Update Document" : "Assign Documents")}
                    </Button>
                    </AccessControl>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Trail Sidebar Drawer */}
          <Sheet open={isTrailOpen} onOpenChange={setIsTrailOpen}>
            <SheetContent side="right" className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl flex flex-col">
              <SheetHeader className="p-6 pb-2 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Document Audit Trail
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <DocumentTrail 
                  documentId={activeDocId} 
                  onPreview={(previewInfo) => {
                    setActivePreviewDoc(previewInfo);
                    setPreviewUrl(previewInfo.previewUrl);
                    setIsPreviewOpen(true);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>

          <FileListPreviewDialog 
            isOpen={isFileListOpen}
            onClose={() => setIsFileListOpen(false)}
            files={activeFileList}
            documentName={activeFileListDocName}
            onPreviewFile={(previewInfo) => {
                setActivePreviewDoc(previewInfo);
                setPreviewUrl(previewInfo.previewUrl);
                setIsPreviewOpen(true);
            }}
          />

          <DocumentPreviewDialog 
            isOpen={isPreviewOpen}
            onOpenChange={setIsPreviewOpen}
            previewUrl={previewUrl}
            activePreviewDoc={activePreviewDoc}
          />
        </div>

      <Dialog open={importReview.isOpen} onOpenChange={(val) => setImportReview(prev => ({ ...prev, isOpen: val }))}>
        <DialogContent className="sm:max-w-[1000px] w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 border-b">
            <DialogTitle>Review Import</DialogTitle>
            <DialogDescription>Valid rows will be directly imported and assigned in the system.</DialogDescription>
            <div className="flex gap-4 mt-4 py-2 border-y bg-slate-50 px-4 rounded-lg">
              <div className="text-sm font-medium">Total: {importReview.summary.total}</div>
              <div className="text-sm font-medium text-green-600">Valid: {importReview.summary.valid}</div>
              <div className="text-sm font-medium text-red-600">Errors: {importReview.summary.error}</div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <Table>
              <TableHeader><TableRow className="bg-slate-50"><TableHead>Row</TableHead><TableHead>Job</TableHead><TableHead>Document</TableHead><TableHead>Employee</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {importReview.data.map((row) => (
                  <TableRow key={row.rowNo}>
                    <TableCell>{row.rowNo}</TableCell>
                    <TableCell className="">{row.jobNumber}</TableCell>
                    <TableCell>{row.docName}</TableCell>
                    <TableCell className="font-semibold text-slate-700">{row.userName || row.empid || <span className="text-slate-400 italic font-normal text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">Pending Assignee</span>}</TableCell>
                    <TableCell>
                      {row.status === 'valid' ? <div className="text-green-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Ready</div> : <div className="text-red-600 flex items-center gap-1"><XCircle className="h-4 w-4" /> {row.message}</div>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="p-6 border-t bg-slate-50">
            <Button className="cursor-pointer" variant="outline" onClick={() => setImportReview(prev => ({ ...prev, isOpen: false }))}>Cancel</Button>
            <Button 
              className="bg-green-600 cursor-pointer" 
              onClick={finalizeImport} 
              disabled={importReview.summary.valid === 0 || isLoading}
            >
              {isLoading ? "Merging..." : `Merge ${importReview.summary.valid} Rows`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

export default AssignDocument
