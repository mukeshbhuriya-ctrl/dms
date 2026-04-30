import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import { SidebarTrigger } from "@/components/ui/sidebar"
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import DocumentTrail from "../../components/dms/DocumentTrail"
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
  FileText,
  Upload,
  AlertCircle,
  CheckCircle2,
  XCircle
} from "lucide-react"

function AssignDocument() {
  const navigate = useNavigate()
  const location = useLocation()
  const [view, setView] = useState("list") // 'list' or 'assign'
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [columnFilters, setColumnFilters] = useState({});

  // Trail State
  const [isTrailOpen, setIsTrailOpen] = useState(false)
  const [activeDocId, setActiveDocId] = useState(null)

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
  const mode = useMemo(() => {
    if (location.pathname.includes("/edit/")) return "edit"
    if (location.pathname.includes("/view/")) return "view"
    if (location.pathname.endsWith("/create")) return "create"
    return "list"
  }, [location.pathname])

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
        const errors = [];
        const jobNumber = String(row["Job Number"] || "").trim().toUpperCase();
        const docName = String(row["Document Name"] || "").trim();
        const empid = String(row["Employee ID"] || "").trim();
        const shrenoNo = String(row["Shreno Document No"] || "").trim();
        const clientNo = String(row["Client Document No"] || "").trim();
        const uploadDaysRaw = row["Upload Due Days"];
        const responseDaysRaw = row["Response Due Days"];

        const targetJob = allJobs.find(j => String(j.job_number) === jobNumber);
        const targetUser = users.find(u => String(u.empid) === empid);

        if (!jobNumber) errors.push("Job Number is required");
        else if (!targetJob) errors.push(`Job Number "${jobNumber}" not found`);

        if (!docName) errors.push("Document Name is required");
        
        // Employee ID is now optional. If provided but not found, we still mark as valid (Pending)
        if (empid && !targetUser) {
           console.log(`Employee ID "${empid}" not found, treating as Pending Assignee.`);
        }

        const uploadDays = parseInt(uploadDaysRaw);
        if (uploadDaysRaw === undefined || isNaN(uploadDays) || uploadDays < 0) {
          errors.push("Invalid Upload Due Days");
        }
        const responseDays = parseInt(responseDaysRaw);
        if (responseDaysRaw === undefined || isNaN(responseDays) || responseDays < 0) {
          errors.push("Invalid Response Due Days");
        }

        return {
          rowNo: index + 1,
          jobNumber, docName, empid, shrenoNo, clientNo,
          uploadDays: uploadDays || 0,
          responseDays: responseDays || 0,
          status: errors.length === 0 ? "valid" : "error",
          message: errors.length === 0 ? "Ready to assign" : errors.join(" | "),
          jobId: targetJob?.id,
          customerId: targetJob?.customer_id,
          poId: targetJob?.po_id,
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
        job_id: r.jobId,
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
      cell: (row) => row.group?.job_group?.[0]?.job?.job_number || "-",
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
      accessorKey: "upload_due_days",
      header: "Upload Due Days",
      cell: (row) => row.upload_due_days || "-",
    },
    {
      id: "plant_submission_date",
      accessorKey: "upload_due_days",
      header: "Plant Submission Date",
      cell: (row) => {
        if (!row.upload_due_days) return "-";
        const created = new Date(row.createdAt);
        const deadline = new Date(created.getTime() + (row.upload_due_days * 24 * 60 * 60 * 1000));
        return deadline.toLocaleDateString("en-GB");
      },
    },
    {
      accessorKey: "response_due_days",
      header: "Response Due Days",
      cell: (row) => row.response_due_days || "-",
    },
    {
      id: "status",
      header: "Status",
      filterType: "select",
      filterOptions: [
        { label: "Awaiting Upload", value: "awaiting_upload" },
        { label: "Pending for Approval", value: "pending_approval" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
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
        }

        return (
          <span className={`whitespace-nowrap px-2 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
            {text}
          </span>
        );
      },
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
    {
      id: "actions",
      header: "Actions",
      cell: (row) => {
        const isEditable = row.status === 'Pending' || row.status === 'Upload Due';
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEditAssign(row)}
              disabled={!isEditable}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-600"
              onClick={() => {
                setActiveDocId(row.id);
                setIsTrailOpen(true);
              }}
            >
              <History className="h-4 w-4 mr-2" />
              Trail
            </Button>
          </div>
        );
      },
    },
  ], [activeClientOptions, activePoOptions, activeJobOptions])

  const proTableTopFilters = useMemo(() => [
    {
      value: statusFilter,
      onChange: setStatusFilter,
      placeholder: "All Status",
      options: [
        { label: "All Status", value: "all" },
        { label: "Pending", value: "Pending" },
        { label: "Uploaded", value: "Uploaded" },
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
        });
      }

      console.log("Fetching assigned documents with params:", params);
      const response = await apiClient.get("/api/dcc/get-assigned-documents", params);

      if (response && response.success) {
        return {
          data: response.data || [],
          meta: response.meta || { total: (response.data || []).length, page: p, limit: l }
        };
      }
      return { data: [], meta: {} };
    } catch (err) {
      console.error("Error fetching documents:", err);
      return { data: [], meta: {} };
    }
  }, [statusFilter]);

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
        jobId: "",
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

  const openEditAssign = (row) => {
    setEditingId(row.id)
    setView("assign")

    const targetJob = row.group?.job_group?.[0]?.job;
    if (targetJob) {
      // Cache this job and its PO immediately so metadata (like Location) is available
      setAllJobs(prev => Array.from(new Map([...prev, targetJob].map(item => [item.id, item])).values()));
      if (targetJob.po) {
        setAllPos(prev => Array.from(new Map([...prev, targetJob.po].map(item => [item.id, item])).values()));
      }
    }

    setAssignments([
      {
        tempId: Date.now(),
        jobId: row.group?.job_group?.[0]?.job_id ? [row.group.job_group[0].job_id] : [],
        customerId: row.group?.job_group?.[0]?.job?.customer_id || "",
        poId: row.group?.job_group?.[0]?.job?.po_id || "",
        documentName: row.document?.document_name || "",
        documentId: row.document_id || "",
        shrenoDocumentNo: row.shreno_doc_no || "",
        clientDocumentNo: row.client_doc_no || "",
        assignUserId: row.user_id || "",
        upload_due_days: row.upload_due_days || "",
        response_due_days: row.response_due_days || "",
      }
    ])
  }

  const handleEditAssign = (row) => {
    navigate(`/documents/edit/${row.id}`, { state: { record: row } })
  }

  useEffect(() => {
    if (mode === "list") {
      setView("list")
      setEditingId(null)
      return
    }

    setView("assign")
    if (mode === "edit" || mode === "view") {
      const row = location.state?.record
      if (row) {
        openEditAssign(row)
      } else {
        toast.error("Please open edit/view from documents list so record data can load.")
        navigate("/documents/list")
      }
      return
    }

    setEditingId(null)
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
      }
    ])
  }, [mode, location.state, navigate])

  // handleNext removed during streamlining

  // Handle back to selection and reset form
  const handleBack = () => {
    navigate("/documents/list")
    setView("list")
    setEditingId(null)
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
      assignments: validAssignments.flatMap(a =>
        a.jobId.map(jid => ({
          job_id: jid,
          document_name: a.documentName,
          shreno_document_no: a.shrenoDocumentNo,
          shreno_reference_no: a.shrenoReferenceNo,
          client_document_no: a.clientDocumentNo,
          client_reference_no: a.clientReferenceNo,
          assign_user_id: a.assignUserId,
          upload_due_days: a.upload_due_days ? parseInt(a.upload_due_days) : null,
          response_due_days: a.response_due_days ? parseInt(a.response_due_days) : null,
        }))
      ),
    }

    try {
      let response;
      if (editingId) {
        const a = validAssignments[0];
        const updateBody = {
          job_ids: a.jobId,
          document_id: a.documentId,
          assign_user_id: a.assignUserId || null,
          upload_due_days: a.upload_due_days ? parseInt(a.upload_due_days) : null,
          response_due_days: a.response_due_days ? parseInt(a.response_due_days) : null,
          shreno_document_no: a.shrenoDocumentNo,
          client_document_no: a.clientDocumentNo,
        };
        response = await apiClient.put(`/api/dcc/update-assigned-document/${editingId}`, updateBody);
      } else {
        response = await apiClient.post("/api/dcc/bulk-assign-documents", requestBody);
      }

      if (response.success) {
        toast.success(editingId ? "Assignment updated successfully!" : "Documents assigned successfully!");
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

  const handleExport = async () => {
    try {
      await exportApi.exportModule("group_document", "Assigned documents export.xlsx")
      setRefreshKey(prev => prev + 1)

    } catch (error) {
      console.error("Export failed:", error)
    }
  }

  const isSubmitDisabled = isLoading || assignments.some(a => !a.jobId || !a.documentName || !a.assignUserId)

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            {view === "list" ? "Documents (VDR)" : editingId ? "Update Document Details" : "Assign Documents"}
          </h1>
        </div>
        {view !== "list" && (
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        )}
      </header>
      <main className={`flex-1 min-h-0 p-6 flex flex-col ${view === "list" ? "overflow-hidden" : "overflow-auto"}`}>
        <div className={`flex-1 min-h-0 flex flex-col w-full ${view === "list" ? "overflow-hidden" : ""}`}>

          {/* List View */}
          {view === 'list' && (
            <ProDataTable
              columns={columns}
              fetchData={fetchAssignedDocuments}
              onExport={handleExport}
              onAdd={() => {
                handleBack();
                navigate("/documents/create");
              }}
              onImport={handleImportExcel}
              onDownloadTemplate={handleDownloadTemplate}
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
                          <TableHead className="min-w-[150px]">Plant Submission Date</TableHead>
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
                                <Input
                                  value={(() => {
                                    if (!assignment.upload_due_days || isNaN(assignment.upload_due_days)) return "Enter Days First";
                                    const d = new Date();
                                    d.setDate(d.getDate() + parseInt(assignment.upload_due_days));
                                    return d.toLocaleDateString("en-GB");
                                  })()}
                                  className="w-full bg-slate-50 text-slate-500  cursor-not-allowed"
                                  readOnly
                                  disabled
                                />
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
                    <Button variant="outline" onClick={handleBack} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleAssign} disabled={isSubmitDisabled}>
                      {isLoading ? (editingId ? "Updating..." : "Assigning...") : (editingId ? "Update Document" : "Assign Documents")}
                    </Button>
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
                <DocumentTrail documentId={activeDocId} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </main>

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
            <Button variant="outline" onClick={() => setImportReview(prev => ({ ...prev, isOpen: false }))}>Cancel</Button>
            <Button className="bg-green-600" onClick={finalizeImport} disabled={importReview.summary.valid === 0}>Merge {importReview.summary.valid} Rows</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Local Component-Based Table implementation ---
// Exact replica of @/components/shared/DataTable.jsx but with controlled columnFilters support
const AssignDocumentTable = ({
  columns,
  fetchData,
  onExport,
  columnFilters, // Controlled from parent for cascading reset
  onFilterChange,
  refreshKey
}) => {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedColumnFilters, setDebouncedColumnFilters] = useState({});

  const isFirstRender = useRef(true);

  // Debounce the global search
  useEffect(() => {
    if (isFirstRender.current) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Debounce column-level filters
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

  // Sync Data - Following DataTable.jsx pattern but with immediate prop-based columnFilters
  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await fetchData({
          page,
          limit: pageSize,
          search: debouncedSearch,
          columnFilters // Use prop directly for immediate response in cascading filter reset
        });
        if (!cancelled) {
          setData(result.data || []);
          setMeta(result.meta || {});
        }
      } catch (error) {
        console.error("Failed to load assign table data", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, [page, pageSize, debouncedSearch, columnFilters, fetchData, refreshKey]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  }

  const handlePageChange = (newPage) => {
    setPage(newPage)
  }

  const handlePageSizeChange = (val) => {
    setPageSize(parseInt(val))
    setPage(1)
  }

  const resolvePath = (object, path) => {
    if (!path) return undefined;
    return path.split('.').reduce((o, p) => (o ? o[p] : undefined), object);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Global Search..."
          value={search}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
        <Button variant="outline" onClick={onExport}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, idx) => (
                <TableHead key={idx} className={`${col.className} whitespace-nowrap bg-slate-50/50 ${col.filterType ? 'min-w-[150px]' : ''}`}>
                  <div className="flex flex-col gap-1.5 py-1.5">
                    <span className=" uppercase text-slate-700 text-[10px] tracking-wider mb-0.5">
                      {col.header}
                    </span>
                    {col.filterType === 'select' && (
                      col.isMulti ? (
                        <MultiSelectFilter
                          options={col.filterOptions || []}
                          value={columnFilters[col.id || col.accessorKey] || []}
                          onChange={(val) => onFilterChange({ [col.id || col.accessorKey]: val })}
                          placeholder={`All ${col.header}`}
                        />
                      ) : (
                        <Select
                          value={(columnFilters[col.id || col.accessorKey] || "all").toString()}
                          onValueChange={(val) => onFilterChange({ [col.id || col.accessorKey]: val === 'all' ? "" : val })}
                        >
                          <SelectTrigger className="h-7 text-xs font-normal w-full min-w-[110px] max-w-[180px]">
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            <SelectItem value="all">All</SelectItem>
                            {col.filterOptions?.map((opt, idx) => (
                              <SelectItem key={`${opt.value}-${idx}`} value={opt.value.toString()}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )
                    )}
                    {col.filterType === 'text' && (
                      <Input
                        placeholder={`Search ${col.header}...`}
                        className="h-7 text-xs font-normal w-full max-w-[150px]"
                        value={columnFilters[col.id || col.accessorKey] || ""}
                        onChange={(e) => onFilterChange({ [col.id || col.accessorKey]: e.target.value })}
                      />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Loading...</TableCell></TableRow>
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
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No results.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination component - Exact replica from DataTable.jsx */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Page {meta.page || 1} of {meta.totalPages || 1} ({meta.total || 0} items)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= (meta.totalPages || 1) || loading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
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
                    className="h-3.5 w-3.5"
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
                className="w-full h-7 text-[10px] text-slate-500 hover:text-red-600"
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

export default AssignDocument
