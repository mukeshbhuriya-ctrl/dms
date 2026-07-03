import React, { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "react-toastify"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ModuleHeader } from "@/components/shared/ModuleHeader"
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Trash2, Type, ArrowLeft, FileText, Eye, X, Edit, CheckCircle, XCircle, Download, Printer, Search, AlertCircle, CheckCircle2, Hash, User, Briefcase, Layers, Box, Maximize, Database, ArrowRight, Save, Check, RotateCcw, Copy, Undo } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DataTable } from "@/components/shared/DataTable"
import ProDataTable from "@/components/shared/ProDataTable";
import { SearchableSelect } from "@/components/shared/SearchableSelect"
import { formatDateTimeSQL } from "@/utils/time"
import { useSearchParams } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import * as XLSX from "xlsx";

import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"
import { Switch } from "@/components/ui/switch"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { Archive } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

function emptyRow(id) {
  return {
    id,
    itemNo: "",
    description: "",
    size: "",
    materialSpecification: "",
    quantityUnit: "",
    heatNo: "",
    grnAppApNo: "",
    mtrNo: "",
    manufacturerName: "",
    remarks: "",
    isHeading: false,
    headingText: "",
    parentHeadingId: null,
    qcStatus: "Pending",
    qcRemarks: "",
    version: 1,
    is_current: true,
  }
}

// ─── List View ───────────────────────────────────────────────────────────────
function ListView({ onCreateClick, onEditClick, onCloneClick }) {
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isViewLoading, setIsViewLoading] = useState(false)

  const { user, roles } = useAuth()
  const isAdmin = roles?.includes("ADMIN");
  const isQE = roles?.includes("QC_ENGINEER");
  const isPE = roles?.includes("PRODUCTION_ENGINEER");
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Bulk Import State
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [excelData, setExcelData] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState({ total: 0, processed: 0 });
  const [jobMetadata, setJobMetadata] = useState({}); // MSN -> Job Details
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [revisionMhcId, setRevisionMhcId] = useState("");
  const [revisionRemarks, setRevisionRemarks] = useState("");

  const handleRevisionSubmit = async () => {
    if (!revisionMhcId || !revisionRemarks.trim()) {
      toast.error("Remarks are required for revision request.");
      return;
    }
    try {
      const res = await apiClient.post("/api/mhc/request-mhc-revision", {
        mhc_id: revisionMhcId,
        remarks: revisionRemarks
      });
      if (res.success) {
        toast.success("Revision requested successfully.");
        setRevisionDialogOpen(false);
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(res.message || "Failed to request revision.");
      }
    } catch (err) {
      toast.error("An error occurred.");
    }
  };

  // Cascading Filters State
  const [activeFilters, setActiveFilters] = useState({ records: [] });
  const [columnFilters, setColumnFilters] = useState({ is_active: ['true'] });
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle Notifications Routing (?id=...)
  useEffect(() => {
    const idParam = searchParams.get('id') || searchParams.get('mhc_id');
    if (idParam) {
      const fetchMhcAndFilter = async () => {
        try {
          const res = await apiClient.get(`/api/mhc/${idParam}`);
          if (res.success && res.data) {
            const match = res.data;
            setColumnFilters(prev => ({
              ...prev,
              msn: match.msn ? [match.msn.toString()] : undefined,
              po_no: match.po_no ? [match.po_no.toString()] : undefined,
              client: match.client ? [match.client.toString()] : undefined
            }));
            // Clean URL so user can clear filters normally later
            setSearchParams(new URLSearchParams(), { replace: true });
          }
        } catch (err) {
          console.error("Error fetching MHC from notification:", err);
        }
      };
      fetchMhcAndFilter();
    }
  }, [searchParams, setSearchParams]);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmData, setConfirmData] = useState({ title: "", description: "", variant: "danger", onConfirm: null });

  const handleToggleStatus = async (row) => {
    setConfirmData({
      title: `${row.is_active ? 'Deactivate' : 'Activate'} Material Heat Chart`,
      description: `Are you sure you want to ${row.is_active ? 'deactivate' : 'activate'} MHC ${row.report_no}?`,
      confirmText: row.is_active ? 'Deactivate' : 'Activate',
      variant: 'warning',
      onConfirm: async () => {
        try {
          const res = await apiClient.patch(`/api/mhc/toggle-status/${row.id}`)
          if (res.success) {
            toast.success(res.message)
            setRefreshTrigger(prev => prev + 1)
          } else {
            toast.error(res.message || "Failed to toggle status")
          }
        } catch (err) {
          console.error(err)
          toast.error("Failed to toggle status")
        }
      }
    })
    setConfirmDialogOpen(true)
  }

  const handleDelete = async (row) => {
    setConfirmData({
      title: 'Archive Material Heat Chart',
      description: `Are you sure you want to archive MHC ${row.report_no}?`,
      confirmText: 'Archive',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await apiClient.delete(`/api/mhc/${row.id}`)
          if (res.success) {
            toast.success(res.message)
            setRefreshTrigger(prev => prev + 1)
          } else {
            toast.error(res.message || "Failed to archive MHC")
          }
        } catch (err) {
          console.error(err)
          toast.error("Failed to archive MHC")
        }
      }
    })
    setConfirmDialogOpen(true)
  }

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await apiClient.get("/api/common/qc-engineers");
        if (res.success) setAllUsers(res.data || []);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };
    fetchUsers();
  }, []);

  const fetchActiveFilters = async () => {
    try {
      const res = await apiClient.get("/api/mhc/get-filters");
      if (res.success) setActiveFilters(res.data);
    } catch (err) {
      console.error("Error fetching active filters:", err);
    }
  };

  useEffect(() => {
    fetchActiveFilters();
  }, [refreshTrigger]);

  const handleDownloadTemplate = () => {
    const headers = [
      ["Job Number", "Shreno Drg No", "Customer Drg No", "Inspection By", "Production Engineer Emp ID", "Is Heading (Yes/No)", "Heading", "Item No", "Description", "Material Spec", "Size", "Quantity", "Heat No", "GRN No", "MTR No", "Manufacturer", "Remarks"],
      ["101010232", "DRG-001", "CUS-DRG-001", "John Doe", "EMP001", "Yes", "HEADING NAME", "", "", "", "", "", "", "", "", "", ""],
      ["101010232", "DRG-001", "CUS-DRG-001", "John Doe", "EMP001", "No", "", "101", "PLATE", "ASTM A234", "10mm", "5 NOS", "", "", "", "", ""]
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "MHC_Import_Template.xlsx");
  };

  const fetchJobMetadata = useCallback(async (data) => {
    const uniqueMsns = [...new Set(data.map(d => d.msn))];
    setIsFetchingMetadata(true);
    const metadataMap = {};

    try {
      await Promise.all(uniqueMsns.map(async (msn) => {
        try {
          const res = await apiClient.get(`/api/common/jobs/by-number/${msn}`);
          if (res.success && res.data) {
            metadataMap[msn] = res.data;
          } else {
            metadataMap[msn] = { error: "Job Not Found" };
          }
        } catch (err) {
          metadataMap[msn] = { error: "Job Not Found" };
        }
      }));
      setJobMetadata(metadataMap);
    } catch (err) {
      console.error("Failed to fetch metadata:", err);
    } finally {
      setIsFetchingMetadata(false);
    }
  }, []);

  const handleImportExcel = useCallback((file) => {
    if (!file) return;


    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!json || json.length < 1) {
          toast.error("Excel file appears to be empty.");
          return;
        }

        let headerIdx = -1;
        for (let i = 0; i < Math.min(json.length, 15); i++) {
          const firstCell = String(json[i][0] || "").toLowerCase().trim();
          if (firstCell === "job number" || firstCell === "msn") {
            headerIdx = i;
            break;
          }
        }

        if (headerIdx === -1) {
          toast.warn("Warning: Could not find 'Job Number' header. Defaulting to first row.");
          headerIdx = 0;
        }

        const rows = json.slice(headerIdx + 1);
        const seenKeys = new Set();

        const parsedData = rows.map((row, idx) => {
          const msn = String(row[0] || "").trim();
          const shreno_drg_no = String(row[1] || "").trim();
          const customer_drg_no = String(row[2] || "").trim();
          const inspection_by = String(row[3] || "").trim();
          const prodEmpId = String(row[4] || "").trim();

          const isHeading = String(row[5] || "").trim().toLowerCase() === "yes";
          const heading = String(row[6] || "").trim();

          const errors = [];
          if (!msn) errors.push("Job Number is required");
          if (!shreno_drg_no) errors.push("Shreno Drg No is required");

          const targetProd = allUsers.find(u => String(u.empid || "").trim().toUpperCase() === prodEmpId.toUpperCase());

          if (!prodEmpId) {
            errors.push("Production Engineer Emp ID is required");
          } else if (!targetProd) {
            errors.push(`Production Employee ID "${prodEmpId}" not found`);
          }

          const batchKey = `${msn}-${shreno_drg_no}-${row[7] || ''}`.toUpperCase();
          let isDuplicate = false;
          if (!isHeading && msn && shreno_drg_no) {
            if (seenKeys.has(batchKey)) isDuplicate = true;
            else seenKeys.add(batchKey);
          }

          return {
            msn,
            isHeading,
            heading,
            shreno_drg_no,
            customer_drg_no,
            inspection_by,
            itemNo: isHeading ? "" : String(row[7] || "").trim(),
            description: isHeading ? "" : String(row[8] || "").trim(),
            materialSpecification: isHeading ? "" : String(row[9] || "").trim(),
            size: isHeading ? "" : String(row[10] || "").trim(),
            quantityUnit: isHeading ? "" : String(row[11] || "").trim(),
            production_empid_raw: prodEmpId,
            production_engineer_id: targetProd?.id || null,
            production_engineer_name: targetProd?.name || null,
            status: errors.length > 0 ? "error" : (isDuplicate ? "duplicate" : "valid"),
            message: errors.length > 0 ? errors.join(" | ") : (isDuplicate ? "Duplicate entry in file" : "Ready")
          };
        }).filter(r => r.msn || r.shreno_drg_no);

        if (parsedData.length === 0) {
          toast.warn("No valid records found in file.");
          return;
        }

        setExcelData(parsedData);
        setTimeout(() => {
          setBulkImportDialogOpen(true);
          fetchJobMetadata(parsedData);
        }, 100);

      } catch (err) {
        console.error("Excel read error:", err);
        toast.error("Failed to read Excel file format.");
      }
    };
    reader.onerror = () => toast.error("File reading error.");
    reader.readAsArrayBuffer(file);
  }, [fetchJobMetadata, allUsers]);

  const confirmBulkImport = async () => {
    setIsImporting(true);

    const validData = excelData.filter(d => d.status === 'valid');
    const reportGroups = {};
    validData.forEach(row => {
      const key = `${row.msn}-${row.shreno_drg_no}`;
      if (!reportGroups[key]) {
        reportGroups[key] = {
          msn: row.msn,
          shreno_drg_no: row.shreno_drg_no,
          customer_drg_no: row.customer_drg_no,
          inspection_by: row.inspection_by,
          production_engineer_id: row.production_engineer_id,
          items: []
        };
      }
      reportGroups[key].items.push({
        is_heading: row.isHeading,
        heading_text: row.heading || (row.isHeading ? (row.itemNo || row.description) : null),
        item_no: row.itemNo,
        description: row.description,
        materialSpecification: row.materialSpecification,
        size: row.size,
        quantityUnit: row.quantityUnit
      });
    });

    const payload = Object.values(reportGroups);

    try {
      const res = await apiClient.post("/api/mhc/bulk-create", payload);
      if (res.success) {
        toast.success(res.message || "Bulk import completed successfully");
        setBulkImportDialogOpen(false);
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(res.message || "Failed to complete bulk import");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save MHC records");
    } finally {
      setIsImporting(false);
    }
  };

  // Review Dialog State
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [docForReview, setDocForReview] = useState(null)
  const [reviewStatus, setReviewStatus] = useState("")
  const [reviewRemarks, setReviewRemarks] = useState("")
  const [isReviewing, setIsReviewing] = useState(false)

  const handleReviewClick = (row, status) => {
    setDocForReview(row)
    setReviewStatus(status)
    setReviewRemarks("")
    setReviewDialogOpen(true)
  }

  const submitReview = async () => {
    if (!docForReview) return
    const status = reviewStatus.toUpperCase();
    if (status === "REJECTED" && !reviewRemarks.trim()) {
      toast.error("Remarks are required for rejection.")
      return
    }

    setIsReviewing(true)
    try {
      const res = await apiClient.put(`/api/mhc/update-status/${docForReview.id}`, {
        status: status,
        remarks: reviewRemarks
      })
      if (res.success) {
        toast.success(`Report ${status} successfully`)
        setReviewDialogOpen(false)
        setRefreshTrigger(prev => prev + 1)
      } else {
        toast.error(res.message || "Failed to submit review")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to submit review")
    } finally {
      setIsReviewing(false)
    }
  }

  const getStatusBadge = (status) => {
    const s = status?.trim()?.toUpperCase() || "PENDING"
    switch (s) {
      case "APPROVED":
        return <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 shadow-sm border border-emerald-200">Approved</span>
      case "REJECTED":
        return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-800 shadow-sm border border-red-200">Rejected</span>
      case "OFFERED":
        return <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 shadow-sm border border-amber-200">Offered</span>
      case "INITIATED":
      case "PENDING":
        return <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-800 shadow-sm border border-blue-200">Initiated</span>
      case "DRAFT":
        return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 shadow-sm border border-slate-200">Draft</span>
      default:
        return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-800 shadow-sm border border-gray-200">{status || "Pending"}</span>
    }
  }

  const handleViewClick = (id) => {
    onEditClick(id, true) // Pass true for isView
  }

  const handleDownloadPdf = useCallback(async (id, reportNo, mode = 'download') => {
    const endpoint = `/api/mhc/download-report/${id}`;
    const filename = `MHC_${reportNo.replace(/[^a-z0-9]/gi, '_')}.pdf`;

    try {
      if (mode === 'print') {
        const response = await apiClient.get(endpoint, {}, { responseType: 'blob' });
        const blob = new Blob([response], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      } else {
        await exportApi.download(endpoint, filename, {}, { contentType: 'application/pdf' });
      }
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Could not generate report. Please try again.");
    }
  }, []);
  // Cascading Filter Logic
  const activeClientOptions = useMemo(() => {
    let filtered = activeFilters.records || [];
    if (columnFilters.po_no) {
      const selected = Array.isArray(columnFilters.po_no) ? columnFilters.po_no : [columnFilters.po_no.toString()];
      filtered = filtered.filter(c => selected.includes(c.po_no?.toString()));
    }
    if (columnFilters.msn) {
      const selected = Array.isArray(columnFilters.msn) ? columnFilters.msn : [columnFilters.msn.toString()];
      filtered = filtered.filter(c => selected.includes(c.msn?.toString()));
    }
    const clients = [...new Set(filtered.map(c => c.client))].filter(Boolean).sort();
    return clients.map(c => ({ label: c, value: c }));
  }, [activeFilters.records, columnFilters.po_no, columnFilters.msn]);

  const activePoOptions = useMemo(() => {
    let filtered = activeFilters.records || [];
    if (columnFilters.client) {
      const selected = Array.isArray(columnFilters.client) ? columnFilters.client : [columnFilters.client.toString()];
      filtered = filtered.filter(c => selected.includes(c.client?.toString()));
    }
    if (columnFilters.msn) {
      const selected = Array.isArray(columnFilters.msn) ? columnFilters.msn : [columnFilters.msn.toString()];
      filtered = filtered.filter(c => selected.includes(c.msn?.toString()));
    }
    const pos = [...new Set(filtered.map(c => c.po_no))].filter(Boolean).sort();
    return pos.map(p => ({ label: p, value: p }));
  }, [activeFilters.records, columnFilters.client, columnFilters.msn]);

  const activeMsnOptions = useMemo(() => {
    let filtered = activeFilters.records || [];
    if (columnFilters.client) {
      const selected = Array.isArray(columnFilters.client) ? columnFilters.client : [columnFilters.client.toString()];
      filtered = filtered.filter(c => selected.includes(c.client?.toString()));
    }
    if (columnFilters.po_no) {
      const selected = Array.isArray(columnFilters.po_no) ? columnFilters.po_no : [columnFilters.po_no.toString()];
      filtered = filtered.filter(c => selected.includes(c.po_no?.toString()));
    }
    const msns = [...new Set(filtered.map(c => c.msn))].filter(Boolean).sort();
    return msns.map(m => ({ label: m, value: m }));
  }, [activeFilters.records, columnFilters.client, columnFilters.po_no]);

  const activeStatusOptions = useMemo(() => {
    const statuses = [...new Set((activeFilters.records || []).map(c => c.status))].filter(Boolean).sort();
    return statuses.map(s => ({ label: s, value: s }));
  }, [activeFilters.records]);

  const activeIsActiveOptions = useMemo(() => {
    return [
      { label: "Active", value: "true" },
      { label: "Inactive", value: "false" }
    ];
  }, []);

  // Auto-selection logic for reverse cascading
  useEffect(() => {
    if (!activeFilters.records || activeFilters.records.length === 0) return;

    const updates = {};
    if (columnFilters.msn && Array.isArray(columnFilters.msn) && columnFilters.msn.length === 1) {
      const selectedMsn = columnFilters.msn[0];
      const match = activeFilters.records.find(r => r.msn?.toString() === selectedMsn?.toString());
      if (match) {
        if (!columnFilters.client || columnFilters.client.length === 0) updates.client = [match.client];
        if (!columnFilters.po_no || columnFilters.po_no.length === 0) updates.po_no = [match.po_no];
      }
    }
    else if (columnFilters.po_no && Array.isArray(columnFilters.po_no) && columnFilters.po_no.length === 1) {
      const selectedPo = columnFilters.po_no[0];
      const match = activeFilters.records.find(r => r.po_no?.toString() === selectedPo?.toString());
      if (match && (!columnFilters.client || columnFilters.client.length === 0)) {
        updates.client = [match.client];
      }
    }

    if (Object.keys(updates).length > 0) {
      setColumnFilters(prev => ({ ...prev, ...updates }));
    }
  }, [columnFilters.msn, columnFilters.po_no, activeFilters.records]);

  const columns = useMemo(() => [
    { header: "Report No.", accessorKey: "report_no" },
    {
      header: "Client",
      accessorKey: "client",
      filterType: "select",
      isMulti: true,
      filterOptions: activeClientOptions
    },
    {
      header: "PO No",
      accessorKey: "po_no",
      filterType: "select",
      isMulti: true,
      filterOptions: activePoOptions
    },
    {
      header: "MSN",
      accessorKey: "msn",
      filterType: "select",
      isMulti: true,
      filterOptions: activeMsnOptions
    },
    { header: "Equipment", accessorKey: "equipment_name" },
    {
      header: "Created At",
      accessorKey: "createdAt",
      cell: (row) => formatDateTimeSQL(row.createdAt),
    },
    {
      header: "Status",
      accessorKey: "status",
      filterType: "select",
      isMulti: true,
      filterOptions: activeStatusOptions,
      cell: (row) => getStatusBadge(row.status)
    },
    {
      header: "Active",
      accessorKey: "is_active",
      filterType: "select",
      isMulti: true,
      filterOptions: activeIsActiveOptions,
      cell: (row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={row.is_active}
            onCheckedChange={() => handleToggleStatus(row)}
            className={`${row.is_active ? 'data-[state=checked]:bg-emerald-500' : 'data-[state=unchecked]:bg-amber-500'}`}
            disabled={!isAdmin}
          />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${row.is_active ? "text-emerald-600" : "text-amber-600"}`}>
            {row.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => {
        const status = row.status // Keep case from DB
        const s = status?.toUpperCase()
        const canEdit = (isAdmin || isQE) && ["DRAFT", "INITIATED", "PENDING", "REJECTED", "OFFERED"].includes(s)
        const canOffer = (isAdmin || isPE) && (s === "INITIATED" || s === "REJECTED" || s === "PENDING" || s === "OFFERED")
        const canFinalize = (isAdmin || isQE) && s === "OFFERED"

        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="cursor-pointer"
              size="sm"
              onClick={() => handleViewClick(row.id)}
              title="View">
              <Eye className="h-4 w-4 mr-1" /> View
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 cursor-pointer border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-none rounded-sm"
              onClick={(e) => { e.stopPropagation(); handleDownloadPdf(row.id, row.report_no, 'download'); }}
              title="Download PDF"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              <span className="text-[10px] font-bold uppercase">PDF</span>
            </Button>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                onClick={() => onCloneClick(row.id)}
                title="Clone MHC"
              >
                <Copy className="h-4 w-4 mr-2" /> Clone
              </Button>
            )}
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => onEditClick(row.id)}
                title="Edit Initiation">
                <Edit className="h-4 w-4 mr-2" /> Edit
              </Button>
            )}
            {canOffer && (
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                onClick={() => onEditClick(row.id)}
                title="Edit & Continue MHC">
                <ArrowRight className="h-4 w-4 mr-2" /> Edit & Continue
              </Button>
            )}
            {canFinalize && (
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                onClick={() => onEditClick(row.id)}
                title="Review MHC">
                <CheckCircle className="h-4 w-4 mr-2" /> Review & Continue
              </Button>
            )}

            {s === "APPROVED" && (isAdmin || isQE) && (
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                onClick={(e) => {
                  e.stopPropagation();
                  setRevisionMhcId(row.id);
                  setRevisionRemarks("");
                  setRevisionDialogOpen(true);
                }}
                title="Request Revision">
                <Undo className="h-4 w-4 mr-2" /> Revise
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(row)}
                title="Archive MHC"
                className="text-destructive border-destructive/20 hover:bg-destructive/5 cursor-pointer"
              >
                <Archive className="h-4 w-4" /> Archive
              </Button>
            )}
          </div>
        )
      },
    },
  ], [isQE, isAdmin, isPE, activeClientOptions, activePoOptions, activeMsnOptions, activeStatusOptions, activeIsActiveOptions, handleDownloadPdf, handleViewClick, onEditClick, onCloneClick]);

  const fetchData = useCallback(async (params) => {
    try {
      const queryParams = { ...params };
      if (queryParams.columnFilters) {
        queryParams.columnFilters = JSON.stringify(queryParams.columnFilters);
      }
      const res = await apiClient.get(`/api/mhc/list`, queryParams)
      return res;
    } catch (err) {
      console.error("Fetch MHC error:", err);
      return { data: [], meta: {} };
    }
  }, []); // refreshTrigger is passed as refreshKey to ProDataTable now

  const handleExport = async () => {
    try {
      await exportApi.exportMHC();
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("MHC Export failed:", error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div />
      </div>

      <ProDataTable
        columns={columns}
        fetchData={fetchData}
        onExport={handleExport}
        onAdd={(isAdmin || !isPE) ? onCreateClick : undefined}
        onImport={(isAdmin || !isPE) ? handleImportExcel : undefined}
        onDownloadTemplate={(isAdmin || !isPE) ? handleDownloadTemplate : undefined}
        columnFilters={columnFilters}
        onFilterChange={(newFilters) => setColumnFilters(prev => ({ ...prev, ...newFilters }))}
        refreshKey={refreshTrigger}
        globalSearchPlaceholder="Search report no, msn, client..."
      />

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        title={confirmData.title}
        description={confirmData.description}
        onConfirm={confirmData.onConfirm}
        confirmText={confirmData.confirmText}
        variant={confirmData.variant}
      />

      {/* Bulk Import Review Dialog */}
      <Dialog open={bulkImportDialogOpen} onOpenChange={setBulkImportDialogOpen}>
        <DialogContent className="sm:max-w-[1100px] w-full max-h-[95vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-6 pb-2 border-b">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Review MHC Import
            </DialogTitle>
            <DialogDescription>
              Verify the material heat chart details and Job (MSN) metadata before confirming.
            </DialogDescription>
            <div className="flex gap-4 mt-4 py-2 border-y bg-slate-50 px-4 rounded-lg">
              <div className="text-sm font-medium">Total: {excelData.length}</div>
              <div className="text-sm font-medium text-green-600">Valid: {excelData.filter(r => r.status === 'valid' && !jobMetadata[r.msn]?.error).length}</div>
              <div className="text-sm font-medium text-red-600">Errors: {excelData.filter(r => r.status === 'error' || jobMetadata[r.msn]?.error).length}</div>
              {excelData.some(r => r.status === 'duplicate') && (
                <div className="text-sm font-medium text-amber-600">Duplicates: {excelData.filter(r => r.status === 'duplicate').length}</div>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-x-auto p-6 bg-white custom-scrollbar-x">
            <div className="border rounded-xl w-fit min-w-full">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-slate-100 shadow-sm z-10">
                  <tr className="border-b divide-x divide-slate-200">
                    <th className="p-2 text-left font-bold uppercase text-slate-800 text-[9px] tracking-wider min-w-[100px]">Job No</th>
                    <th className="p-2 text-left font-bold uppercase text-slate-800 text-[9px] tracking-wider min-w-[120px]">SHRENO DRG. NO.</th>
                    <th className="p-2 text-left font-bold uppercase text-slate-800 text-[9px] tracking-wider min-w-[140px]">CUSTOMER DRG. NO.</th>
                    <th className="p-2 text-left font-bold uppercase text-slate-800 text-[9px] tracking-wider min-w-[120px]">INSPECTION BY</th>
                    <th className="p-2 text-left font-bold uppercase text-slate-800 text-[9px] tracking-wider min-w-[120px]">ASSIGNED PROD</th>
                    <th className="p-2 text-left font-bold uppercase text-slate-800 text-[9px] tracking-wider min-w-[80px]">Item No</th>
                    <th className="p-2 text-left font-bold uppercase text-slate-800 text-[9px] tracking-wider min-w-[180px]">Description</th>
                    <th className="p-2 text-left font-bold uppercase text-slate-800 text-[9px] tracking-wider min-w-[100px]">Spec</th>
                    <th className="p-2 text-left font-bold uppercase text-slate-800 text-[9px] tracking-wider min-w-[80px]">Size</th>
                    <th className="p-2 text-left font-bold uppercase text-slate-800 text-[9px] tracking-wider min-w-[60px]">Qty</th>
                    <th className="p-2 text-center font-bold uppercase text-slate-800 text-[9px] tracking-wider min-w-[250px]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {excelData.map((row, idx) => {
                    const job = jobMetadata[row.msn];
                    const hasMsnError = job?.error || !row.msn;
                    const isDup = row.status === 'duplicate';
                    const isErr = row.status === 'error' || hasMsnError;

                    return (
                      <tr key={idx} className={`border-b divide-x divide-slate-100 transition-colors ${row.isHeading ? 'bg-slate-50/80 font-bold' : isErr ? 'bg-red-50/20' : 'hover:bg-slate-50'}`}>
                        {/* Job No */}
                        <td className="p-2 align-top text-[11px]">
                          <div className="font-semibold">{row.msn}</div>
                          {job && !job.error && (
                            <div className="text-[9px] text-slate-500 mt-0.5 uppercase tracking-tight">{job.customer?.customer_name}</div>
                          )}
                        </td>

                        {/* Shreno Ref */}
                        <td className="p-2 align-top text-[11px] font-medium">
                          {row.shreno_drg_no || "-"}
                        </td>

                        {/* Client Ref */}
                        <td className="p-2 align-top text-[11px] text-slate-500 italic">
                          {row.customer_drg_no || "-"}
                        </td>

                        {/* Inspection By */}
                        <td className="p-2 align-top text-[11px]">
                          {row.inspection_by || "-"}
                        </td>

                        {/* Assigned PROD */}
                        <td className="p-2 align-top text-[11px]">
                          {row.production_engineer_name ? (
                            <div className="font-bold text-green-600">{row.production_engineer_name}</div>
                          ) : (
                            <div className="font-bold text-red-600">{row.production_empid_raw || "-"}</div>
                          )}
                        </td>

                        {/* Item No */}
                        <td className="p-2 align-top text-[11px]">
                          {row.isHeading ? (row.itemNo || row.heading) : (row.itemNo || "-")}
                        </td>

                        {/* Description */}
                        <td className="p-2 align-top text-[11px]">
                          <div className={`line-clamp-2 ${row.isHeading ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                            {row.description || (row.isHeading ? "" : "-")}
                          </div>
                        </td>

                        {/* Spec */}
                        <td className="p-2 align-top text-[11px]">
                          {row.materialSpecification || "-"}
                        </td>

                        {/* Size */}
                        <td className="p-2 align-top text-[11px]">
                          {row.size || "-"}
                        </td>

                        {/* Qty */}
                        <td className="p-2 align-top text-[11px]">
                          {row.quantityUnit || "-"}
                        </td>



                        {/* Status (Far Right) */}
                        <td className="p-2 align-top text-left min-w-[250px]">
                          {isFetchingMetadata ? (
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                              <span className="text-[10px] text-slate-400">Validating...</span>
                            </div>
                          ) : isErr ? (
                            <div className="text-red-600 font-medium text-[10px] flex items-start gap-1 p-1 rounded bg-red-50/50 leading-normal">
                              <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              <span className="break-words">
                                {hasMsnError ? `Job Number "${row.msn || 'Empty'}" not found` : ""}
                                {hasMsnError && row.message ? " | " : ""}
                                {row.message || ""}
                              </span>
                            </div>
                          ) : isDup ? (
                            <div className="text-amber-600 font-medium text-[10px] flex items-center gap-1.5 p-1 rounded bg-amber-50/50">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              <span>{row.message}</span>
                            </div>
                          ) : (
                            <div className="text-green-600 font-medium text-[10px] flex items-center gap-1.5 p-1 rounded bg-green-50/50">
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              <span>Ready</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter className="p-6 border-t bg-slate-50 flex items-center sm:justify-between w-full">
            <Button variant="outline" onClick={() => setBulkImportDialogOpen(false)} disabled={isImporting} className="bg-white border-slate-200">
              Cancel
            </Button>
            <Button
              onClick={confirmBulkImport}
              className="bg-green-600 hover:bg-green-700 text-white shadow-md transition-all px-8 h-10 font-medium"
              disabled={isImporting || excelData.length === 0 || excelData.some(r => r.status === 'error' || jobMetadata[r.msn]?.error)}
            >
              {isImporting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Processing...
                </div>
              ) : (
                `Merge ${excelData.filter(r => r.status === 'valid' && !jobMetadata[r.msn]?.error).length} Reports`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{reviewStatus} Report</DialogTitle>
            <DialogDescription>
              {docForReview && `Are you sure you want to ${reviewStatus.toLowerCase()} report ${docForReview.report_no}?`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="remarks">Remarks {reviewStatus === "Rejected" && <span className="text-destructive">*</span>}</Label>
              <Input
                id="remarks"
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder="Enter remarks..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={submitReview}
              disabled={isReviewing || (reviewStatus === "Rejected" && !reviewRemarks.trim())}
              variant={reviewStatus === "Rejected" ? "destructive" : "default"}
            >
              Confirm {reviewStatus}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revision Dialog */}
      <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Revision</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason for Revision</Label>
              <Input
                value={revisionRemarks}
                onChange={(e) => setRevisionRemarks(e.target.value)}
                placeholder="Explain why this MHC needs revision..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="cursor-pointer" variant="outline" onClick={() => setRevisionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRevisionSubmit} className="bg-orange-600 hover:bg-orange-700 text-white cursor-pointer">Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Create View ─────────────────────────────────────────────────────────────
function CreateView({ onBack, onSuccess, editId = null, cloneId = null, isView = false }) {
  const { user } = useAuth()
  // Jobs list for MSN dropdown
  const [jobs, setJobs] = useState([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [qcGroups, setQcGroups] = useState([])
  const [qc_group_id, setQcGroupId] = useState("")
  const [productionGroups, setProductionGroups] = useState([])
  const [production_group_id, setProductionGroupId] = useState("")

  const [mhcStatus, setMhcStatus] = useState("Initiated")
  const [approverRemarks, setApproverRemarks] = useState("")
  const [submittedAt, setSubmittedAt] = useState(null)
  const [approvedAt, setApprovedAt] = useState(null)
  const { roles } = useAuth()
  const isQE = roles?.includes("QC_ENGINEER");
  const isPE = roles?.includes("PRODUCTION_ENGINEER");
  const isAdmin = roles?.includes("ADMIN");

  // Basic Info (auto-filled from selected job)
  const [selectedJobId, setSelectedJobId] = useState("")
  const [autoFill, setAutoFill] = useState({
    reportNo: "",
    client: "",
    poNo: "",
    equipmentName: "",
    tagNo: "",
  })

  // Equipment Details
  const [formData, setFormData] = useState({
    shrenoDrgNo: "",
    customerDrgNo: "",
    inspectionBy: "",
    projectId: "",
    code: "",
  })

  // Table rows
  const [tableRows, setTableRows] = useState([emptyRow("row-1")])

  // Search Filter
  const [itemSearchActive, setItemSearchActive] = useState(false)
  const [itemSearchQuery, setItemSearchQuery] = useState("")

  // Selection for Selective Download
  const [selectedItemIds, setSelectedItemIds] = useState(new Set())

  // Submit state
  const [submitting, setSubmitting] = useState(null) // null | "Draft" | "Pending"

  useEffect(() => {
    apiClient.get("/api/common/jobs")
      .then((res) => setJobs(res.data || []))
      .catch(() => setJobs([]))
      .finally(() => setJobsLoading(false))

    // Fetch My Groups to auto-select
    if (!editId && (isAdmin || isQE)) {
      apiClient.get("/api/employee-groups/my-groups")
        .then((res) => {
          if (res.success && res.data) {
            const myQualityGroup = res.data.find(g => g.group_type === "QUALITY" || g.type === "QUALITY")
            if (myQualityGroup) setQcGroupId(myQualityGroup.id)
          }
        })
        .catch((err) => console.error("Failed to fetch my groups:", err))
    }

    // Fetch Quality Groups
    apiClient.get("/api/employee-groups?type=QUALITY")
      .then((res) => { if (res.success) setQcGroups(res.data) })
      .catch((err) => console.error("Failed to fetch Quality groups:", err))

    // Fetch Production Groups
    apiClient.get("/api/employee-groups?type=PRODUCTION")
      .then((res) => { if (res.success) setProductionGroups(res.data) })
      .catch((err) => console.error("Failed to fetch Production groups:", err))
  }, [isAdmin, isQE, editId])

  // Handle editId or cloneId logic
  useEffect(() => {
    const targetId = editId || cloneId;
    if (targetId) {
      apiClient.get(`/api/mhc/${targetId}`)
        .then((res) => {
          if (res.success && res.data) {
            const data = res.data
            setSelectedJobId(cloneId ? "" : data.job_id)
            setAutoFill({
              reportNo: cloneId ? "" : data.report_no,
              client: cloneId ? "" : data.client,
              poNo: cloneId ? "" : data.po_no,
              equipmentName: cloneId ? "" : (data.equipment_name || ""),
              tagNo: cloneId ? "" : (data.tag_no || ""),
            })
            setFormData({
              shrenoDrgNo: cloneId ? "" : (data.shreno_drg_no || ""),
              customerDrgNo: cloneId ? "" : (data.customer_drg_no || ""),
              inspectionBy: cloneId ? "" : (data.inspection_by || ""),
              projectId: cloneId ? "" : (data.project_id || ""),
              code: cloneId ? "" : (data.code || ""),
            })
            setQcGroupId(data.qc_group_id || "")
            setProductionGroupId(data.production_group_id || "")
            setMhcStatus(cloneId ? (isQE ? "Draft" : "Initiated") : (data.status || "Initiated"))
            setApproverRemarks(cloneId ? "" : (data.approver_remarks || ""))
            setSubmittedAt(cloneId ? null : (data.submitted_at || null))
            setApprovedAt(cloneId ? null : (data.approved_at || null))
            if (data.items && data.items.length > 0) {
              setTableRows(data.items.map((item, index) => ({
                id: cloneId ? undefined : item.id,
                tempRowId: `row-${Date.now()}-${index}`,
                itemNo: item.item_no || "",
                description: item.description || "",
                size: item.size || "",
                materialSpecification: item.material_spec || "",
                quantityUnit: item.quantity_unit || "",
                heatNo: item.heat_no || "",
                grnAppApNo: item.grn_app_ap_no || "",
                mtrNo: item.mtr_no || "",
                manufacturerName: item.manufacturer || "",
                remarks: item.remarks || "",
                qcStatus: cloneId ? "Pending" : (item.qc_status || "Pending"),
                qcRemarks: cloneId ? "" : (item.qc_remarks || ""),
                qcReviewerName: cloneId ? "" : (item.qc_reviewer?.name || ""),
                prodEngineerName: cloneId ? "" : (item.prod_engineer?.name || ""),
                productionDate: cloneId ? null : item.production_date,
                qcDate: cloneId ? null : item.qc_date,
                isHeading: Boolean(item.is_heading),
                headingText: item.heading_text || "",
                parentHeadingId: cloneId ? undefined : item.parent_heading_id,
              })))
            }
          }
        })
    }
  }, [editId, cloneId, isQE])

  // Handle MSN selection → auto-fill from job details API
  const handleJobSelect = async (jobId) => {
    setSelectedJobId(jobId)
    setAutoFill((prev) => ({ ...prev, reportNo: "Loading...", client: "Loading..." }))

    let nextReportNo = ""
    try {
      const res = await apiClient.get(`/api/mhc/next-report-no/${jobId}`)
      if (res.success && res.data?.next_report_no) {
        nextReportNo = res.data.next_report_no
      }
    } catch (err) {
      console.error("Failed to fetch next report number:", err)
      nextReportNo = "Auto-generated on Submit"
    }

    try {
      const jobRes = await apiClient.get(`/api/common/jobs/${jobId}`)
      if (jobRes.success && jobRes.data) {
        const job = jobRes.data
        setAutoFill({
          reportNo: nextReportNo,
          client: job.customer?.customer_name || "",
          poNo: job.po?.po_number || "",
          equipmentName: job.equipement_name || "",
          tagNo: job.tag_number || "",
        })
        setFormData(prev => ({
          ...prev,
          projectId: job.project_id || "",
          code: job.code || "",
        }))
      }
    } catch (err) {
      console.error("Failed to fetch job details:", err)
      setAutoFill({
        reportNo: nextReportNo,
        client: "",
        poNo: "",
        equipmentName: "",
        tagNo: "",
      })
      setFormData(prev => ({
        ...prev,
        projectId: "",
        code: "",
      }))
    }
  }

  // Form field change
  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Row helpers
  const handleRowChange = (id, field, value) =>
    setTableRows((rows) => rows.map((r) => {
      if (r.id === id) {
        const updated = { ...r, [field]: value };
        // If status changed to Pending, clear out previous remarks for a fresh cycle
        if (field === "qcStatus" && String(value).toUpperCase() === "PENDING") {
          updated.qcRemarks = "";
        }
        return updated;
      }
      return r;
    }))

  const nextId = () => {
    const now = Date.now();
    // Ensure it's unique even if called rapidly
    return `new-${now}-${Math.floor(Math.random() * 1000)}`;
  }

  const addRow = () => setTableRows((rows) => [...rows, emptyRow(nextId())])

  const addRowAfter = (rowId) => {
    const idx = tableRows.findIndex((r) => r.id === rowId)
    const clickedRow = tableRows[idx]

    // Determine the parent heading for the new row based on the clicked row's heading context
    let parentHeadingId = clickedRow.isHeading ? clickedRow.id : clickedRow.parentHeadingId

    const newRow = { ...emptyRow(nextId()), parentHeadingId }
    const updated = [...tableRows]
    updated.splice(idx + 1, 0, newRow)
    setTableRows(updated)
  }

  const toggleHeading = (id) => {
    setTableRows((rows) => {
      const idx = rows.findIndex((r) => r.id === id);
      if (idx === -1) return rows;

      const clickedRow = rows[idx];
      const newRows = [...rows];

      if (clickedRow.isHeading) {
        // If it's already a heading, toggle it back to an item
        newRows[idx] = { ...clickedRow, isHeading: false, headingText: "" };
      } else {
        // If it's an item, insert a new heading row ABOVE it
        const newHeadingRow = {
          ...emptyRow(nextId()),
          isHeading: true,
          headingText: "HEADING",
          parentHeadingId: clickedRow.parentHeadingId
        };
        newRows.splice(idx, 0, newHeadingRow);
      }

      return newRows;
    });
  };

  const removeRow = (id) => {
    if (tableRows.length <= 1) return
    setTableRows((rows) => rows.filter((r) => r.id !== id))
  }

  const sStatus = mhcStatus?.toUpperCase() || "";
  const isQcInitiationLocked = isView || !((isAdmin || isQE) && (sStatus === "INITIATED" || sStatus === "PENDING" || sStatus === "DRAFT" || sStatus === "OFFERED" || !editId));
  const isProdOfferLocked = isView || !(
    ((isAdmin || isPE || isQE) && (sStatus === "INITIATED" || sStatus === "PENDING" || sStatus === "REJECTED" || sStatus === "OFFERED" || sStatus === "DRAFT" || sStatus === ""))
  );
  const isQcFinalLocked = isView || !((isAdmin || isQE) && sStatus === "OFFERED");
  const showQcCols = isView || (sStatus !== "DRAFT" && sStatus !== "INITIATED" && sStatus !== "");

  const filteredTableRows = useMemo(() => {
    if (!itemSearchQuery.trim()) return tableRows;
    const query = itemSearchQuery.toLowerCase();

    const matchingIds = new Set();
    const parentHeadingIds = new Set();

    // Pass 1: Identify matching items and their structural dependencies
    tableRows.forEach(row => {
      const matches = row.itemNo?.toLowerCase().includes(query) ||
        row.description?.toLowerCase().includes(query) ||
        (row.isHeading && row.headingText?.toLowerCase().includes(query));

      if (matches) {
        matchingIds.add(row.id);
        if (row.parentHeadingId) parentHeadingIds.add(row.parentHeadingId);
      }
    });

    // Pass 2: Filter while preserving structure (Heading matches or Item matches)
    return tableRows.filter(row =>
      matchingIds.has(row.id) || parentHeadingIds.has(row.id)
    );
  }, [tableRows, itemSearchQuery]);

  const toggleItemSelection = (id) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    const selectable = tableRows.filter(r => !r.isHeading && r.id && !String(r.id).startsWith("new-"))
    if (selectedItemIds.size === selectable.length && selectable.length > 0) {
      setSelectedItemIds(new Set())
    } else {
      setSelectedItemIds(new Set(selectable.map(r => r.id)))
    }
  }

  const handleDownloadSelectedPdf = async (mode = 'download') => {
    if (selectedItemIds.size === 0) {
      toast.warn("Please select at least one item to include in the PDF.")
      return
    }
    const itemIds = Array.from(selectedItemIds).join(',')
    const endpoint = `/api/mhc/download-report/${editId}?itemIds=${itemIds}`;
    const filename = `MHC_${autoFill.reportNo.replace(/[^a-z0-9]/gi, '_')}_Selective.pdf`;

    try {
      if (mode === 'print') {
        const response = await apiClient.get(endpoint, {}, { responseType: 'blob' });
        const blob = new Blob([response], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      } else {
        await exportApi.download(endpoint, filename, {}, { contentType: 'application/pdf' });
      }
    } catch (err) {
      console.error("Export error:", err);
      toast.error(`Could not ${mode === 'print' ? 'print' : 'generate'} selective report.`);
    }
  };

  const handleItemAction = async (item, action) => {
    if (!item.id || String(item.id).startsWith("new-")) {
      toast.warn("Item must be saved before performing this action.")
      return
    }
    const remarks = prompt(`Enter remarks for item ${action.toLowerCase()}:`)
    if (remarks === null) return;

    try {
      const endpoint = action === "REJECT" ? `/api/mhc/reject-item/${item.id}` : `/api/mhc/request-revision/${item.id}`;
      const res = await apiClient.post(endpoint, { remarks });
      if (res.success) {
        toast.success(`Item ${action.toLowerCase()}ed successfully.`)
        // Refresh MHC data to get new item versions
        apiClient.get(`/api/mhc/${editId}`).then(r => {
          if (r.success && r.data) {
            setTableRows(r.data.items.map(i => ({
              id: i.id,
              itemNo: i.item_no || "",
              description: i.description || "",
              size: i.size || "",
              materialSpecification: i.material_spec || "",
              quantityUnit: i.quantity_unit || "",
              heatNo: i.heat_no || "",
              grnAppApNo: i.grn_app_ap_no || "",
              mtrNo: i.mtr_no || "",
              manufacturerName: i.manufacturer || "",
              remarks: i.remarks || "",
              qcStatus: i.qc_status || "Pending",
              qcRemarks: i.qc_remarks || "",
              qcReviewerName: i.qc_reviewer?.name || "",
              prodEngineerName: i.prod_engineer?.name || "",
              isHeading: Boolean(i.is_heading),
              headingText: i.heading_text || "",
              parentHeadingId: i.parent_heading_id,
              version: i.version,
            })))
          }
        })
      } else {
        toast.error(res.message || "Action failed.")
      }
    } catch (err) {
      toast.error("Failed to perform item action.")
    }
  }

  const handleRevisionAction = async (action) => {
    try {
      const res = await apiClient.post(`/api/mhc/${action}-mhc-revision`, { mhc_id: editId });
      if (res.success) {
        toast.success(`Revision ${action}ed.`);
        window.location.reload();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error("Failed to process revision action.");
    }
  };

  const handleSubmit = async (action = "SUBMIT") => {
    if (!selectedJobId) {
      toast.warn("Please select a Job / MSN.")
      return
    }

    if (action === "INITIATE") {
      if (!qc_group_id || !production_group_id) {
        toast.error("Please assign both a QUALITY GROUP and a PRODUCTION GROUP before initiating.", { theme: "colored" })
        return;
      }
    }

    const items = tableRows.map((row, idx) => ({
      id: row.id && !String(row.id).startsWith("new-") ? row.id : undefined,
      sort_order: idx,
      is_heading: row.isHeading,
      heading_text: row.isHeading ? (row.headingText || row.itemNo || "HEADING") : null,
      item_no: row.itemNo || null,
      description: row.description || null,
      size: row.size || null,
      material_spec: row.materialSpecification || null,
      quantity_unit: row.quantityUnit || null,
      heat_no: row.heatNo || null,
      grn_app_ap_no: row.grnAppApNo || null,
      mtr_no: row.mtrNo || null,
      manufacturer: row.manufacturerName || null,
      remarks: row.remarks || null,
      qc_status: row.qcStatus || "Pending",
      qc_remarks: row.qcRemarks || null,
    }))

    const payload = {
      job_id: selectedJobId,
      shreno_drg_no: formData.shrenoDrgNo || null,
      customer_drg_no: formData.customerDrgNo || null,
      inspection_by: formData.inspectionBy || null,
      project_id: formData.projectId || null,
      code: formData.code || null,
      production_group_id: production_group_id || null,
      qc_group_id: qc_group_id || null,
      items,
      status: action === "DRAFT" ? "Draft" : (action === "INITIATE" ? "Initiated" : undefined)
    }

    try {
      setSubmitting(action)
      let res;
      const currentStatus = mhcStatus?.toUpperCase() || "";
      if (!editId) {
        res = await apiClient.post("/api/mhc/initiate", payload)
      } else if ((currentStatus === "INITIATED" || currentStatus === "PENDING" || currentStatus === "REJECTED") && action === "OFFER") {
        res = await apiClient.post(`/api/mhc/offer/${editId}`, payload)
      } else if (currentStatus === "OFFERED" && action === "SAVE_REVIEW") {
        res = await apiClient.post(`/api/mhc/save-review/${editId}`, payload)
      } else if (currentStatus === "OFFERED" && action === "FINALIZE") {
        res = await apiClient.post(`/api/mhc/finalize/${editId}`, payload)
      } else if (currentStatus === "OFFERED" && action === "UPDATE_OFFERED") {
        res = await apiClient.post(`/api/mhc/offer/${editId}`, payload)
      } else if (currentStatus === "OFFERED" && action === "UPDATE_FULL") {
        res = await apiClient.put(`/api/mhc/update/${editId}`, payload)
      } else {
        // This covers update of DRAFT, INITIATED, or saving as DRAFT/INITIATED
        res = await apiClient.put(`/api/mhc/update/${editId}`, payload)
      }

      if (res.success) {
        const msg = action === "DRAFT" ? "saved as draft" : (editId ? "updated" : "initiated")
        onSuccess(msg)
      } else {
        toast.error(res.message || "Failed to process MHC.")
      }
    } catch (err) {
      toast.error(err.message || "Failed to save Material Heat Chart.")
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div />
        <Button variant="outline" onClick={onBack} disabled={submitting !== null} >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      </div>

      {mhcStatus === "Revision_Requested" && isAdmin && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-orange-800 font-semibold text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Revision Request Pending
            </h3>
            <p className="text-orange-700 text-sm mt-1">
              {(() => {
                try {
                  if (!approverRemarks) return "";
                  const parsed = JSON.parse(approverRemarks);
                  return parsed.remarks ? `Reason: ${parsed.remarks}` : approverRemarks;
                } catch (e) {
                  return approverRemarks;
                }
              })()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => handleRevisionAction("deny")} variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-100 cursor-pointer">
              Deny
            </Button>
            <Button onClick={() => handleRevisionAction("approve")} className="bg-orange-600 hover:bg-orange-700 text-white cursor-pointer">
              Approve Revision
            </Button>
          </div>
        </div>
      )}

      {/* ── Section 1: Basic Information ── */}
      <Card className="mb-6 rounded-xl shadow-sm border border-muted-foreground/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* MSN / Job Number */}
            <div className="space-y-2">
              <Label className="uppercase text-xs font-semibold text-muted-foreground">MSN / JOB NO.:</Label>
              <SearchableSelect
                options={jobs.map((j) => ({ value: j.id, label: j.job_number }))}
                value={selectedJobId}
                onValueChange={handleJobSelect}
                placeholder={jobsLoading ? "Loading jobs…" : "Select MSN"}
                searchPlaceholder="Search job number..."
                disabled={jobsLoading || isView}
              />
            </div>

            {/* Auto-filled fields */}
            {[
              { label: "REPORT NO.:", value: autoFill.reportNo },
              { label: "CLIENT:", value: autoFill.client },
              { label: "PO. NO.:", value: autoFill.poNo },
              { label: "EQUIPMENT NAME:", value: autoFill.equipmentName },
              { label: "TAG NO.:", value: autoFill.tagNo },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-2">
                <Label className="uppercase text-xs font-semibold text-muted-foreground">{label}</Label>
                <Input value={value} readOnly className="bg-muted/50 h-9 border-muted" />
              </div>
            ))}

            <div className="space-y-2">
              <Label className="uppercase text-xs font-semibold text-muted-foreground">PROJECT ID:</Label>
              <Input
                value={formData.projectId}
                onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                className="h-9 border-muted-foreground/30"
                disabled={isView || (!isAdmin && !isQE)}
                placeholder="Enter project ID"
              />
            </div>

            <div className="space-y-2">
              <Label className="uppercase text-xs font-semibold text-muted-foreground">CONSTRUCTION CODE:</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                className="h-9 border-muted-foreground/30"
                disabled={isView || (!isAdmin && !isQE)}
                placeholder="Enter construction code"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Equipment Details ── */}
      <Card className="mb-6 rounded-xl shadow-sm border border-muted-foreground/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Equipment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { label: "SHRENO DRG NO.:", field: "shrenoDrgNo" },
              { label: "CUSTOMER DRG NO.:", field: "customerDrgNo" },
              { label: "INSPECTION BY:", field: "inspectionBy" },
            ].map((f) => (
              <div className="space-y-2" key={f.field}>
                <Label className="uppercase text-xs font-semibold text-muted-foreground">{f.label} <span className="text-destructive">*</span></Label>
                <Input
                  value={formData[f.field]}
                  onChange={(e) => setFormData({ ...formData, [f.field]: e.target.value })}
                  placeholder={`Enter ${f.label.toLowerCase().replace(':', '')}`}
                  className="h-10 rounded-xl border-muted-foreground/30"
                  disabled={isView}
                  required
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: Material Heat Chart Details ── */}
      <Card className="mb-6 rounded-xl shadow-sm border border-muted-foreground/20 overflow-hidden">
        <CardHeader className="pb-4 bg-slate-50/50 border-b border-muted-foreground/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-800">Material Heat Chart Details</CardTitle>
            {isView && editId && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadSelectedPdf('print')}
                  className="h-8 px-2 cursor-pointer border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-none rounded-sm bg-white"
                  title="Print Selected Items"
                >
                  <Printer className="h-3.5 w-3.5 mr-1" />
                  <span className="text-[10px] font-bold uppercase">Print</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadSelectedPdf('download')}
                  className="h-8 px-2 cursor-pointer bg-slate-900 border-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm rounded-sm"
                  title="Download Selected PDF"
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  <span className="text-[10px] font-bold uppercase">PDF</span>
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-4">
            <div className="overflow-x-auto overflow-y-auto max-h-[500px] custom-scrollbar border rounded-xl shadow-inner bg-slate-50/20 relative">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-40 shadow-sm">
                  <tr className="border-b bg-slate-100 text-slate-700">
                    {isView && (
                      <th className="p-3 w-12 sticky left-0 bg-slate-100 z-[51] border-b-2 border-slate-200">
                        <Checkbox
                          checked={selectedItemIds.size > 0 && selectedItemIds.size === tableRows.filter(r => !r.isHeading && r.id && !String(r.id).startsWith("new-")).length}
                          onCheckedChange={toggleSelectAll}
                          className="border-slate-400 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                        />
                      </th>
                    )}
                    {[
                      {
                        label: "ITEM NO./PART NO.",
                        id: "itemNo",
                        searchable: true
                      },
                      "DESCRIPTION",
                      "MATERIAL SPECIFICATION",
                      "SIZE",
                      "QUANTITY / UNIT",
                      "HEAT NO. / CAST NO. / PLATE NO.",
                      "GRN/APP/AP NO.",
                      "MTR NO.",
                      "MANUFACTURER NAME",
                      "REMARKS NCR/DCR",
                      "QC REVIEW",
                      "QC REMARKS",
                      "PROD. PERSON",
                      "QC REVIEWER",
                      "Action",
                    ].filter(h => showQcCols || (h !== "QC REVIEW" && h !== "QC REMARKS" && h !== "PROD. PERSON" && h !== "QC REVIEWER"))
                      .map((h, i) => {
                        const isObj = typeof h === "object";
                        const label = isObj ? h.label : h;

                        return (
                          <th
                            key={label}
                            className={`p-3 text-left font-bold uppercase text-slate-800 text-[10px] tracking-wider whitespace-nowrap border-b-2 border-slate-200 sticky top-0 z-40 bg-slate-100 ${i === 0 ? "sticky left-0 z-[52] min-w-[150px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" : ""
                              }`}
                          >
                            <div className="flex items-center justify-between gap-2 group">
                              {isObj && h.id === "itemNo" && itemSearchActive ? (
                                <div className="flex items-center gap-1 w-full bg-white border border-primary/30 rounded px-1.5 py-0.5 shadow-sm animate-in fade-in slide-in-from-left-1 duration-200">
                                  <Search className="h-3 w-3 text-primary/60" />
                                  <input
                                    autoFocus
                                    className="bg-transparent border-none outline-none text-[11px] w-full font-medium placeholder:font-normal placeholder:text-slate-400"
                                    placeholder="Search..."
                                    value={itemSearchQuery}
                                    onChange={(e) => setItemSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Escape') {
                                        setItemSearchActive(false);
                                        setItemSearchQuery("");
                                      }
                                    }}
                                  />
                                  <button onClick={() => { setItemSearchActive(false); setItemSearchQuery(""); }}>
                                    <X className="h-3 w-3 text-slate-400 hover:text-rose-500 transition-colors" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span className="truncate">{label}</span>
                                  {isObj && h.searchable && (
                                    <button
                                      onClick={() => setItemSearchActive(true)}
                                      className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-primary transition-all focus:opacity-100"
                                    >
                                      <Search className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </th>
                        )
                      })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(() => {
                    let activeHeadingId = null;
                    return filteredTableRows.map((row, idx) => {
                      if (row.isHeading) activeHeadingId = row.id;
                      const isInGroup = activeHeadingId !== null;
                      return (
                        <React.Fragment key={row.id}>
                          {row.isHeading && (
                            <tr className="group/heading border-b-0 bg-slate-50/60">
                              {isView && <td className="bg-slate-100/60 border-t border-t-slate-200" />}
                              <td colSpan={11} className="p-0 border-t border-t-slate-200">
                                <div className="flex items-center justify-between my-1.5 mx-2 w-full pr-4">
                                  <div className="flex items-center gap-0 sticky left-2 w-fit z-20">
                                    <div className="flex items-center gap-2 border border-slate-200 bg-white rounded-md p-1 pl-3 w-full shadow-sm">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 shrink-0">Heading:</span>
                                      <Input
                                        type="text"
                                        value={row.headingText}
                                        onChange={(e) => handleRowChange(row.id, "headingText", e.target.value)}
                                        placeholder="Enter heading text..."
                                        className="border-none bg-transparent shadow-none text-sm font-bold text-slate-800 focus-visible:ring-0 placeholder:text-slate-400 h-8"
                                        disabled={isQcInitiationLocked}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleRowChange(row.id, "headingText", "")}
                                        className={`flex items-center justify-center h-7 w-7 border border-slate-200 bg-slate-50 rounded text-slate-400 hover:bg-slate-100 transition-colors shadow-sm ml-2 ${isView ? 'hidden' : ''}`}
                                      >
                                        <X className="h-4 w-4 stroke-[3px]" />
                                      </button>
                                    </div>
                                  </div>
                                  {!isView && (
                                    <div className="flex items-center gap-1.5 h-10 sticky right-2 bg-slate-50/60 px-2 rounded z-20">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg border transition-all text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100"
                                        onClick={() => toggleHeading(row.id)}
                                        disabled={isQcInitiationLocked}
                                      >
                                        <Type className="h-4 w-4 stroke-[3px]" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all"
                                        onClick={() => addRowAfter(row.id)}
                                        disabled={isQcInitiationLocked}
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all"
                                        onClick={() => removeRow(row.id)}
                                        disabled={isQcInitiationLocked}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                          {!row.isHeading && (
                            <tr className={`${isInGroup ? "bg-slate-50/40 border-l-2 border-l-indigo-400" : "hover:bg-muted/10"} border-b border-muted-foreground/10 transition-colors`}>
                              {isView && (
                                <td className={`p-3 align-middle sticky left-0 z-20 ${isInGroup ? "bg-slate-50" : "bg-white"} border-r border-slate-100`}>
                                  {row.id && !String(row.id).startsWith("new-") && (
                                    <Checkbox
                                      checked={selectedItemIds.has(row.id)}
                                      onCheckedChange={() => toggleItemSelection(row.id)}
                                      className="border-slate-400 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                                    />
                                  )}
                                </td>
                              )}
                              {[
                                { field: "itemNo", placeholder: "Item No", locked: isQcInitiationLocked },
                                { field: "description", placeholder: "Description", locked: isQcInitiationLocked },
                                { field: "materialSpecification", placeholder: "Material Spec", locked: isQcInitiationLocked },
                                { field: "size", placeholder: "Size", locked: isQcInitiationLocked },
                                { field: "quantityUnit", placeholder: "Quantity", locked: isQcInitiationLocked },
                                { field: "heatNo", placeholder: "Heat No", locked: isProdOfferLocked },
                                { field: "grnAppApNo", placeholder: "GRN/APP/AP No", locked: isProdOfferLocked },
                                { field: "mtrNo", placeholder: "MTR No", locked: isQcFinalLocked },
                                { field: "manufacturerName", placeholder: "Manufacturer", locked: isQcFinalLocked },
                                { field: "remarks", placeholder: "Remarks", locked: isQcFinalLocked },
                              ].map(({ field, placeholder, locked }, i) => (
                                <td
                                  key={field}
                                  className={`p-2 align-top ${i === 0 ? `sticky left-0 z-20 ${isInGroup ? "bg-slate-100/40 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" : "bg-white"}` : ""}`}
                                >
                                  <Textarea
                                    value={row[field]}
                                    onChange={(e) => handleRowChange(row.id, field, e.target.value)}
                                    placeholder={placeholder}
                                    className={`text-[13px] min-w-[240px] w-full min-h-[40px] max-h-[120px] py-2.5 resize-y shadow-none focus-visible:ring-1 ${isInGroup ? "border-slate-300 focus-visible:ring-slate-500 bg-white/80" : "border-muted-foreground/30"} rounded-lg ${String(row.qcStatus || "Pending").toUpperCase() === 'APPROVED' ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900 font-medium' : ''}`}
                                    disabled={locked || String(row.qcStatus || "Pending").toUpperCase() === 'APPROVED'}
                                  />
                                </td>
                              ))}

                              {/* QC REVIEW */}
                              {showQcCols && (
                                <td className="p-2 align-top min-w-[240px]">
                                  <div className="flex items-center gap-2 h-10">
                                    {(() => {
                                      const s = String(row.qcStatus || "Pending").toUpperCase();
                                      if (isAdmin || isQE) {
                                        return (
                                          <>
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="outline"
                                                    className={`h-8 w-8 rounded-lg transition-all ${s === 'APPROVED' ? 'bg-emerald-500 text-white border-emerald-600' : 'hover:bg-emerald-50 text-emerald-600 border-emerald-200'}`}
                                                    onClick={() => handleRowChange(row.id, "qcStatus", s === 'APPROVED' ? 'Pending' : 'Approved')}
                                                    disabled={isView || (mhcStatus?.toUpperCase() !== "OFFERED" && !isAdmin)}
                                                  >
                                                    <Check className="h-4 w-4" />
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Approve Item</TooltipContent>
                                              </Tooltip>

                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="outline"
                                                    className={`h-8 w-8 rounded-lg transition-all ${s === 'REJECTED' ? 'bg-rose-500 text-white border-rose-600' : 'hover:bg-rose-50 text-rose-600 border-rose-200'}`}
                                                    onClick={() => handleRowChange(row.id, "qcStatus", s === 'REJECTED' ? 'Pending' : 'Rejected')}
                                                    disabled={isView || (mhcStatus?.toUpperCase() !== "OFFERED" && !isAdmin)}
                                                  >
                                                    <X className="h-4 w-4" />
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Reject Item</TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>

                                            {s !== 'PENDING' && (
                                              <span className={`text-[10px] font-bold uppercase tracking-tight ${s === 'APPROVED' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {s === 'APPROVED' ? 'Approved' : 'Rejected'}
                                              </span>
                                            )}
                                          </>
                                        );
                                      } else {
                                        // Production View: ONLY show if NOT pending
                                        if (s === 'PENDING') return null;

                                        return (
                                          <div className="flex items-center gap-2">
                                            {s === 'APPROVED' && (
                                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                                                <CheckCircle className="h-3.5 w-3.5" />
                                                <span className="text-[10px] font-black uppercase tracking-tight">Approved</span>
                                              </div>
                                            )}
                                            {s === 'REJECTED' && (
                                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shadow-sm">
                                                <XCircle className="h-3.5 w-3.5" />
                                                <span className="text-[10px] font-black uppercase tracking-tight">Rejected</span>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      }
                                    })()}
                                  </div>
                                </td>
                              )}
                              {showQcCols && (
                                <td className="p-2 align-top min-w-[200px]">
                                  <Textarea
                                    value={row.qcRemarks || ""}
                                    onChange={(e) => handleRowChange(row.id, "qcRemarks", e.target.value)}
                                    placeholder="QC remarks..."
                                    className={`text-[13px] min-h-[40px] max-h-[120px] py-2.5 resize-y rounded-lg transition-all ${String(row.qcStatus || "Pending").toUpperCase() === "REJECTED" ? "border-rose-400 bg-rose-50/30 focus-visible:ring-rose-500" : (String(row.qcStatus || "Pending").toUpperCase() === 'APPROVED' ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900 font-medium' : 'border-muted-foreground/30')}`}
                                    disabled={isView || String(row.qcStatus || "Pending").toUpperCase() === 'APPROVED' || (!isAdmin && !isQE)}
                                  />
                                </td>
                              )}
                              {showQcCols && (
                                <td className="p-2 align-top min-w-[150px]">
                                  <div className="flex flex-col justify-center h-10 px-3 rounded-lg border border-muted-foreground/10 bg-slate-50/50">
                                    <span className="text-xs font-bold text-slate-700 leading-tight">{row.prodEngineerName || "-"}</span>
                                    {row.prodEngineerName && row.productionDate && (
                                      <span className="text-[9px] font-medium text-slate-500 leading-tight">
                                        {new Date(row.productionDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              )}
                              {showQcCols && (
                                <td className="p-2 align-top min-w-[150px]">
                                  <div className="flex flex-col justify-center h-10 px-3 rounded-lg border border-muted-foreground/10 bg-slate-50/50">
                                    <span className="text-xs font-bold text-slate-700 leading-tight">{row.qcReviewerName || "-"}</span>
                                    {row.qcReviewerName && row.qcDate && (
                                      <span className="text-[9px] font-medium text-slate-500 leading-tight">
                                        {new Date(row.qcDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              )}
                              {/* Actions */}
                              <td className={`p-2 align-top ${isView ? 'hidden' : ''}`}>
                                <div className="flex items-center gap-1.5 h-10">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className={`h-8 w-8 rounded-lg border transition-all ${row.isHeading ? "text-amber-700 bg-amber-400 border-amber-500 hover:bg-amber-500 hover:text-white" : "text-muted-foreground hover:text-foreground"}`}
                                    onClick={() => toggleHeading(row.id)}
                                    disabled={isQcInitiationLocked}
                                  >
                                    <Type className={`h-4 w-4 ${row.isHeading ? "stroke-[3px]" : ""}`} />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg border-muted-foreground/20 hover:bg-primary/5 hover:text-primary transition-all"
                                    onClick={() => addRowAfter(row.id)}
                                    disabled={isQcInitiationLocked}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg border-muted-foreground/20 hover:bg-destructive/5 hover:text-destructive transition-all"
                                    onClick={() => removeRow(row.id)}
                                    disabled={isQcInitiationLocked}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            <div className={`pt-4 border-t border-muted/50 mt-4 ${isView ? 'hidden' : ''}`}>
              <Button type="button" variant="outline" onClick={addRow} className="w-auto h-9 text-[13px] px-4 rounded-xl border-muted-foreground/30 shadow-sm" disabled={isQcInitiationLocked}>
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 4: Approval ── */}
      <Card className="mb-6 rounded-xl shadow-sm border border-muted-foreground/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Approval</CardTitle>
          <p className="text-xs text-muted-foreground">Assign groups</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="uppercase text-[11px] font-bold text-muted-foreground tracking-wider">QUALITY GROUP <span className="text-destructive">*</span></Label>
                <SearchableSelect
                  options={qcGroups.map((g) => ({ value: g.id, label: g.name }))}
                  value={qc_group_id}
                  onValueChange={setQcGroupId}
                  placeholder="Select quality group"
                  disabled={isQcInitiationLocked}
                />
                {!qc_group_id && !isQcInitiationLocked && (
                  <p className="text-[11px] text-rose-500 font-medium tracking-tight flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" /> Required for initiation
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="uppercase text-[11px] font-bold text-muted-foreground tracking-wider">PRODUCTION GROUP <span className="text-destructive">*</span></Label>
                <SearchableSelect
                  options={productionGroups.map((g) => ({ value: g.id, label: g.name }))}
                  value={production_group_id}
                  onValueChange={setProductionGroupId}
                  placeholder="Select production group"
                  disabled={isQcInitiationLocked}
                />
                {!production_group_id && !isQcInitiationLocked && (
                  <p className="text-[11px] text-rose-500 font-medium tracking-tight flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" /> Required for initiation
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Footer Buttons ── */}
      <div className="flex gap-3 justify-end mt-8 pb-12">
        <Button variant="outline" onClick={onBack} disabled={submitting !== null} className="cursor-pointer">
          {isView ? "Back to List" : "Cancel"}
        </Button>
        {!isView && (
          <>
            {(isAdmin || isQE) && (!editId || mhcStatus?.toUpperCase() === "DRAFT") && (
              <Button
                variant="outline"
                onClick={() => handleSubmit("DRAFT")}
                disabled={submitting !== null}
                className="border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                {submitting === "DRAFT" ? "Saving..." : "Save as Draft"}
              </Button>
            )}
            {(!editId || ["INITIATED", "PENDING", "DRAFT"].includes(mhcStatus?.toUpperCase())) && (isAdmin || isQE) && (
              <Button
                onClick={() => handleSubmit("INITIATE")}
                disabled={submitting !== null || !qc_group_id || !production_group_id}
                className={`cursor-pointer ${(!qc_group_id || !production_group_id) ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {submitting === "INITIATE" ? "Initiating..." : (editId && mhcStatus?.toUpperCase() !== "DRAFT" ? "Update Initiation" : "Initiate MHC")}
              </Button>
            )}
            {editId && (mhcStatus?.toUpperCase() === "INITIATED" || mhcStatus?.toUpperCase() === "PENDING" || mhcStatus?.toUpperCase() === "REJECTED") && (isAdmin || isPE) && (
              <Button
                variant="secondary"
                onClick={() => handleSubmit("OFFER")}
                disabled={submitting !== null}
                className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 cursor-pointer gap-2"
              >
                {submitting === "OFFER" ? "Continuing..." : "Continue (Production)"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {(mhcStatus?.toUpperCase() === "OFFERED") && (isPE || isAdmin) && (
              <Button
                onClick={() => handleSubmit("UPDATE_OFFERED")}
                disabled={submitting !== null}
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 cursor-pointer gap-2"
              >
                {submitting === "UPDATE_OFFERED" ? "Updating..." : "Update (Production)"}
                <Save className="h-4 w-4" />
              </Button>
            )}
            {mhcStatus?.toUpperCase() === "OFFERED" && (isAdmin || isQE) && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => handleSubmit("UPDATE_FULL")}
                  disabled={submitting !== null || !tableRows.some(r => !r.isHeading && r.qcStatus !== 'Approved')}
                  className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 cursor-pointer gap-2"
                >
                  {submitting === "UPDATE_FULL" ? "Saving..." : "Review & Continue"}
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => handleSubmit("FINALIZE")}
                  disabled={submitting !== null || tableRows.some(r => !r.isHeading && r.qcStatus !== 'Approved')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer gap-2"
                >
                  {submitting === "FINALIZE" ? "Finalizing..." : "Finalize & Approve MHC"}
                  <CheckCircle className="h-4 w-4" />
                </Button>
              </>
            )}
            {mhcStatus?.toUpperCase() === "OFFERED" && isAdmin && (
              <Button
                variant="destructive"
                onClick={() => handleSubmit("REJECT")}
                disabled={submitting !== null}
                className="cursor-pointer"
              >
                Reject Entire MHC
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function MaterialHeatChart() {
  const [view, setView] = useState("list")
  const [editId, setEditId] = useState(null)
  const [cloneId, setCloneId] = useState(null)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const action = searchParams.get('action')
    const id = searchParams.get('id')
    if (action === 'edit' && id) {
      handleEditClick(id)
    }
  }, [searchParams])

  const handleCreateClick = () => {
    setEditId(null)
    setCloneId(null)
    setIsReadOnly(false)
    setView("create")
  }

  const handleEditClick = (id, isView = false) => {
    setEditId(id)
    setCloneId(null)
    setIsReadOnly(isView)
    setView("create")
  }

  const handleCloneClick = (id) => {
    setCloneId(id)
    setEditId(null)
    setIsReadOnly(false)
    setView("create")
  }

  const handleSuccess = (action) => {
    toast.success(`Material Heat Chart ${action} successfully!`)
    setView("list")
  }

  return (
    <>
      <ModuleHeader
        title="Material Heat Chart"
        description="Manage inspection records, production data, and quality approvals for heat-treated materials."
      />
      <main className="flex-1 overflow-auto p-6 flex flex-col">
        <div className="flex-1 flex flex-col w-full">

          {view === "list" ? (
            <ListView onCreateClick={handleCreateClick} onEditClick={handleEditClick} onCloneClick={handleCloneClick} />
          ) : (
            <CreateView onBack={() => setView("list")} onSuccess={handleSuccess} editId={editId} cloneId={cloneId} isView={isReadOnly} />
          )}
        </div>
      </main>
    </>
  )
}
