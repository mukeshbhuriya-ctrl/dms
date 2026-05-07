import React, { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "react-toastify"

import { SidebarTrigger } from "@/components/ui/sidebar"
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
import { Plus, Trash2, Type, ArrowLeft, FileText, Eye, X, Edit, CheckCircle, XCircle, Download, AlertCircle, CheckCircle2, Hash, User, Briefcase, Layers, Box, Maximize, Database } from "lucide-react"
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
import { useAuth } from "@/context/AuthContext"
import * as XLSX from "xlsx";

import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"
import { Switch } from "@/components/ui/switch"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { Archive } from "lucide-react"

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
  }
}

// ─── List View ───────────────────────────────────────────────────────────────
function ListView({ onCreateClick, onEditClick }) {
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isViewLoading, setIsViewLoading] = useState(false)

  const { user, roles } = useAuth()
  const isAdmin = roles?.includes("ADMIN");
  const isQE = roles?.includes("QE") || roles?.includes("QC_ENGINEER") || roles?.includes("QC");
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Bulk Import State
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [excelData, setExcelData] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState({ total: 0, processed: 0 });
  const [jobMetadata, setJobMetadata] = useState({}); // MSN -> Job Details
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  
  // Cascading Filters State
  const [activeFilters, setActiveFilters] = useState({ records: [] });
  const [columnFilters, setColumnFilters] = useState({ is_active: ['true'] });

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
      ["Job Number", "Shreno Drg No", "Customer Drg No", "Inspection By", "QC Engineer Emp ID", "Is Heading (Yes/No)", "Heading", "Item No", "Description", "Material Spec", "Size", "Quantity", "Heat No", "GRN No", "MTR No", "Manufacturer", "Remarks"],
      ["101010232", "DRG-001", "CUS-DRG-001", "John Doe", "EMP001", "Yes", "101", "101", "HEADING SECTION", "", "", "", "", "", "", "", ""],
      ["101010232", "DRG-001", "CUS-DRG-001", "John Doe", "EMP001", "No", "", "101", "PLATE", "ASTM A234", "10mm", "5 NOS", "HN123", "GRN456", "MTR789", "XYZ Steel", "Accepted"]
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
          const qcEmpId = String(row[4] || "").trim();
          
          const isHeading = String(row[5] || "").trim().toLowerCase() === "yes";
          const heading = String(row[6] || "").trim();
          
          const errors = [];
          if (!msn) errors.push("Job Number is required");
          if (!shreno_drg_no) errors.push("Shreno Drg No is required");
          
          const targetQC = allUsers.find(u => String(u.empid || "").trim().toUpperCase() === qcEmpId.toUpperCase());
          
          if (!qcEmpId) {
            errors.push("QC Engineer Emp ID is required");
          } else if (!targetQC) {
            errors.push(`QC Employee ID "${qcEmpId}" not found`);
          }
          
          const batchKey = `${msn}-${shreno_drg_no}-${row[7] || ''}-${row[12] || ''}`.toUpperCase();
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
            itemNo: String(row[7] || "").trim(),
            description: String(row[8] || "").trim(),
            materialSpecification: String(row[9] || "").trim(),
            size: String(row[10] || "").trim(),
            quantityUnit: String(row[11] || "").trim(),
            heatNo: String(row[12] || "").trim(),
            grnAppApNo: String(row[13] || "").trim(),
            mtrNo: String(row[14] || "").trim(),
            manufacturerName: String(row[15] || "").trim(),
            remarks: String(row[16] || "").trim(),
            qc_empid_raw: qcEmpId,
            qc_engineer_id: targetQC?.id || null,
            qc_engineer_name: targetQC?.name || null,
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
      
      // Group flat rows into Reports
      const reportGroups = {};
      excelData.forEach(row => {
          const key = `${row.msn}-${row.shreno_drg_no}`;
          if (!reportGroups[key]) {
              reportGroups[key] = {
                  msn: row.msn,
                  shreno_drg_no: row.shreno_drg_no,
                  customer_drg_no: row.customer_drg_no,
                  inspection_by: row.inspection_by,
                  qc_engineer_id: row.qc_engineer_id,
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
              quantityUnit: row.quantityUnit,
              heatNo: row.heatNo,
              grn_app_ap_no: row.grnAppApNo,
              mtrNo: row.mtrNo,
              manufacturerName: row.manufacturerName,
              remarks: row.remarks
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
    if (reviewStatus === "Rejected" && !reviewRemarks.trim()) {
      toast.error("Remarks are required for rejection.")
      return
    }

    setIsReviewing(true)
    try {
      const res = await apiClient.put(`/api/mhc/update-status/${docForReview.id}`, {
        status: reviewStatus,
        remarks: reviewRemarks
      })
      if (res.success) {
        toast.success(`Report ${reviewStatus} successfully`)
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
    const s = status?.trim()?.toLowerCase() || "pending"
    switch (s) {
      case "approved":
        return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 shadow-sm border border-green-200">Approved</span>
      case "rejected":
        return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 shadow-sm border border-red-200">Rejected</span>
      case "pending":
        return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800 shadow-sm border border-yellow-200">Pending</span>
      case "draft":
        return <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 shadow-sm border border-blue-200">Draft</span>
      default:
        return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800 shadow-sm border border-gray-200">{status || "Pending"}</span>
    }
  }

  const handleViewClick = async (id) => {
    setIsViewLoading(true)
    try {
      const res = await apiClient.get(`/api/mhc/${id}`)
      if (res.success) {
        setSelectedRecord(res.data)
        setIsViewOpen(true)
      } else {
        toast.warn("Failed to fetch details")
      }
    } catch (err) {
      toast.error("Error fetching details")
      console.error(err)
    } finally {
      setIsViewLoading(false)
    }
  }
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
      filterOptions: activeStatusOptions
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
        const canReview = isQE && (row.status?.toLowerCase() === "pending")
        const canEdit = (isAdmin || isQE) && (row.status?.toLowerCase() !== "approved")

        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="cursor-pointer"
              size="sm"
              onClick={() => handleViewClick(row.id)}
              title="View">
              <Eye className="h-4 w-4 mr-2" /> View
            </Button>
            {canEdit && (
               <Button
               variant="outline"
               size="sm"
               className="cursor-pointer"
               onClick={() => onEditClick(row.id)}
               title="Edit">
               <Edit className="h-4 w-4 mr-2" /> Edit
             </Button>
            )}
            {canReview && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 border-green-200 cursor-pointer"
                  onClick={() => handleReviewClick(row, "Approved")}
                  title="Approve">
                  <CheckCircle className="h-4 w-4 mr-2" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-red-200 cursor-pointer"
                  onClick={() => handleReviewClick(row, "Rejected")}
                  title="Reject">
                  <XCircle className="h-4 w-4 mr-2" /> Reject
                </Button>
              </>
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
  ], [isQE, isAdmin, activeClientOptions, activePoOptions, activeMsnOptions, activeStatusOptions]);

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
        <div>
          <h1 className="text-3xl font-bold mb-1">Material Heat Charts</h1>
          <p className="text-muted-foreground">View and manage all material heat charts.</p>
        </div>
      </div>

      <ProDataTable
        columns={columns}
        fetchData={fetchData}
        onExport={handleExport}
        onAdd={onCreateClick}
        onImport={handleImportExcel}
        onDownloadTemplate={handleDownloadTemplate}
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
                    <th className="p-2 text-left font-bold uppercase text-slate-800 text-[9px] tracking-wider min-w-[120px]">ASSIGNED QC</th>
                    <th className="p-2 text-left font-bold uppercase text-slate-800 text-[9px] tracking-wider min-w-[80px]">Item No</th>
                    <th className="p-2 text-left font-bold uppercase text-slate-800 text-[9px] tracking-wider min-w-[180px]">Description</th>
                    <th className="p-2 text-left font-bold uppercase text-slate-800 text-[9px] tracking-wider min-w-[100px]">Spec</th>
                    <th className="p-2 text-left font-bold uppercase text-slate-800 text-[9px] tracking-wider min-w-[80px]">Size</th>
                    <th className="p-2 text-left font-bold uppercase text-slate-800 text-[9px] tracking-wider min-w-[60px]">Qty</th>
                    <th className="p-2 text-left font-bold uppercase text-slate-800 text-[9px] tracking-wider min-w-[100px]">Heat No</th>
                    <th className="p-2 text-left font-bold uppercase text-slate-800 text-[9px] tracking-wider min-w-[100px]">GRN / MTR</th>
                    <th className="p-2 text-left font-bold uppercase text-slate-800 text-[9px] tracking-wider min-w-[150px]">Mfg / Remarks</th>
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

                      {/* Assigned QC */}
                      <td className="p-2 align-top text-[11px]">
                         {row.qc_engineer_name ? (
                            <div className="font-bold text-green-600">{row.qc_engineer_name}</div>
                         ) : (
                            <div className="font-bold text-red-600">{row.qc_empid_raw || "-"}</div>
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

                      {/* Heat No */}
                      <td className="p-2 align-top text-[11px]">
                        {row.heatNo || "-"}
                      </td>

                      {/* GRN / MTR */}
                      <td className="p-2 align-top text-xs">
                        <div>{row.grnAppApNo || "-"}</div>
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">{row.mtrNo || "-"}</div>
                      </td>

                      {/* Mfg / Remarks */}
                      <td className="p-2 align-top text-xs">
                         <div className="font-medium text-slate-700 line-clamp-1">{row.manufacturerName || "-"}</div>
                         <div className="text-[10px] text-slate-400 italic line-clamp-1">{row.remarks || "-"}</div>
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

      {/* View Details Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[95vw] w-full max-h-[95vh] overflow-y-auto p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-center">Material Heat Chart Details</DialogTitle>
            <DialogDescription className="text-center">
              Complete details of the selected Material Heat Chart.
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-6">
              {/* Basic Info */}
              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-y-6 gap-x-4 text-sm border border-border p-6 bg-white rounded-xl shadow-sm">
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">MSN / JOB NO:</span>
                  <span className="font-medium">{selectedRecord.msn || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">CLIENT:</span>
                  <span className="font-medium">{selectedRecord.client || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">PO NO:</span>
                  <span className="font-medium">{selectedRecord.po_no || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">PROJECT ID:</span>
                  <span className="font-medium">{selectedRecord.project_id || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">EQUIPMENT:</span>
                  <span className="font-medium">{selectedRecord.equipment_name || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">TAG NO:</span>
                  <span className="font-medium">{selectedRecord.tag_no || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">CODE:</span>
                  <span className="font-medium">{selectedRecord.code || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">SHRENO DRG NO:</span>
                  <span className="font-medium">{selectedRecord.shreno_drg_no || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">CUSTOMER DRG NO:</span>
                  <span className="font-medium">{selectedRecord.customer_drg_no || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">REPORT NO:</span>
                  <span className="font-medium">{selectedRecord.report_no || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">INSPECTION BY:</span>
                  <span className="font-medium">{selectedRecord.inspection_by || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">PRODUCTION ENGINEER:</span>
                  <span className="font-medium">{selectedRecord.production_engineer?.name || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">QUALITY ENGINEER:</span>
                  <span className="font-medium">{selectedRecord.qc_engineer?.name || "-"}</span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full border-collapse text-xs text-left">
                  <thead>
                    <tr className="bg-[#f4f4f5] border-b border-border">
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">HEADING</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">ITEM NO./PART NO.</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">DESCRIPTION</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider whitespace-normal">MATERIAL SPECIFICATION</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">SIZE</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">QUANTITY / UNIT</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider whitespace-normal">HEAT NO. / CAST NO. / PLATE NO.</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">GRN/APP/AP NO.</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">MTR NO.</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">MANUFACTURER NAME</th>
                      <th className="p-3 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">REMARKS NCR/DCR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      if (!selectedRecord.items || selectedRecord.items.length === 0) {
                        return (
                          <tr>
                            <td colSpan={10} className="border border-border p-4 text-center">
                              No items added.
                            </td>
                          </tr>
                        );
                      }

                      let currentHeading = "";
                      const rows = [];

                      selectedRecord.items.forEach((row) => {
                        if (row.is_heading) {
                          currentHeading = row.heading_text || row.item_no || "HEADING";
                        }

                        rows.push(
                          <tr key={row.id} className={row.is_heading ? "bg-[#f4f4f5] border-b border-border font-bold shadow-[inset_0_1px_0_0_#e4e4e7]" : "hover:bg-muted/30 border-b border-border last:border-0"}>
                            <td className={`border-r border-border p-3 align-top font-medium ${!row.is_heading ? 'text-muted-foreground' : ''}`}>{row.heading_text || currentHeading || "-"}</td>
                            <td className="border-r border-border p-3 align-top font-medium">{row.item_no || "-"}</td>
                            <td className="border-r border-border p-3 align-top">{row.description || "-"}</td>
                            <td className="border-r border-border p-3 align-top">{row.material_spec || "-"}</td>
                            <td className="border-r border-border p-3 align-top">{row.size || "-"}</td>
                            <td className="border-r border-border p-3 align-top">{row.quantity_unit || "-"}</td>
                            <td className="border-r border-border p-3 align-top">{row.heat_no || "-"}</td>
                            <td className="border-r border-border p-3 align-top">{row.grn_app_ap_no || "-"}</td>
                            <td className="border-r border-border p-3 align-top">{row.mtr_no || "-"}</td>
                            <td className="border-r border-border p-3 align-top">{row.manufacturer || "-"}</td>
                            <td className="p-3 align-top">{row.remarks || "-"}</td>
                          </tr>
                        );
                      });

                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Create View ─────────────────────────────────────────────────────────────
function CreateView({ onBack, onSuccess, editId = null }) {
  const { user } = useAuth()
  // Jobs list for MSN dropdown
  const [jobs, setJobs] = useState([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [qcEngineers, setQcEngineers] = useState([])
  const [qc_engineer_id, setQcEngineerId] = useState("")
  const [productionEngineers, setProductionEngineers] = useState([])
  const [production_engineer_id, setProductionEngineerId] = useState("")

  useEffect(() => {
    // Default to logged-in user if available
    if (user?.id && !editId) {
      setProductionEngineerId(user.id)
    }
  }, [user, editId])

  // Basic Info (auto-filled from selected job)
  const [selectedJobId, setSelectedJobId] = useState("")
  const [autoFill, setAutoFill] = useState({
    reportNo: "",
    client: "",
    poNo: "",
    projectId: "",
    equipmentName: "",
    tagNo: "",
    code: "",
  })

  // Equipment Details
  const [formData, setFormData] = useState({
    shrenoDrgNo: "",
    customerDrgNo: "",
    inspectionBy: "",
  })

  // Table rows
  const [tableRows, setTableRows] = useState([emptyRow(1)])

  // Submit state
  const [submitting, setSubmitting] = useState(null) // null | "Draft" | "Pending"

  useEffect(() => {
    apiClient.get("/api/common/jobs?limit=200")
      .then((res) => setJobs(res.data || []))
      .catch(() => setJobs([]))
      .finally(() => setJobsLoading(false))

    // Fetch Quality Engineers
    apiClient.get("/api/users/by-role/QC_ENGINEER")
      .then((res) => { if (res.success) setQcEngineers(res.data) })
      .catch((err) => console.error("Failed to fetch QE users:", err))

    // Fetch Production Engineers
    apiClient.get("/api/users/by-role/PRODUCTION_ENGINEER")
      .then((res) => { if (res.success) setProductionEngineers(res.data) })
      .catch((err) => console.error("Failed to fetch PE users:", err))
  }, [])

  // Handle editId logic
  useEffect(() => {
    if (editId) {
      apiClient.get(`/api/mhc/${editId}`)
        .then((res) => {
          if (res.success && res.data) {
            const data = res.data
            setSelectedJobId(data.job_id)
            setAutoFill({
              reportNo: data.report_no,
              client: data.client,
              poNo: data.po_no,
              projectId: data.project_id || "",
              equipmentName: data.equipment_name || "",
              tagNo: data.tag_no || "",
              code: data.code || "",
            })
            setFormData({
              shrenoDrgNo: data.shreno_drg_no || "",
              customerDrgNo: data.customer_drg_no || "",
              inspectionBy: data.inspection_by || "",
            })
            setQcEngineerId(data.qc_engineer_id || "")
            setProductionEngineerId(data.production_engineer_id || "")
            if (data.items && data.items.length > 0) {
              setTableRows(data.items.map(item => ({
                id: item.id,
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
                isHeading: item.is_heading,
                headingText: item.heading_text || "",
                parentHeadingId: item.parent_heading_id,
              })))
            }
          }
        })
    }
  }, [editId])

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
          projectId: job.project_id || "",
          equipmentName: job.equipement_name || "",
          tagNo: job.tag_number || "",
          code: job.code || "",
        })
      }
    } catch (err) {
      console.error("Failed to fetch job details:", err)
      setAutoFill({
        reportNo: nextReportNo,
        client: "",
        poNo: "",
        projectId: "",
        equipmentName: "",
        tagNo: "",
        code: "",
      })
    }
  }

  // Form field change
  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Row helpers
  const handleRowChange = (id, field, value) =>
    setTableRows((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)))

  const nextId = () => Math.max(...tableRows.map((r) => r.id), 0) + 1

  const addRow = () => setTableRows((rows) => [...rows, emptyRow(nextId())])

  const addRowAfterHeading = (headingId) => {
    const newRow = { ...emptyRow(nextId()), parentHeadingId: headingId }
    const idx = tableRows.findIndex((r) => r.id === headingId)
    let insertAt = idx + 1
    for (let i = idx + 1; i < tableRows.length; i++) {
      if (tableRows[i].isHeading) break
      insertAt = i + 1
    }
    const updated = [...tableRows]
    updated.splice(insertAt, 0, newRow)
    setTableRows(updated)
  }

  const toggleHeading = (id) =>
    setTableRows((rows) =>
      rows.map((r) =>
        r.id === id ? { ...r, isHeading: !r.isHeading, headingText: r.isHeading ? "" : (r.headingText || r.itemNo) } : r
      )
    )

  const removeRow = (id) => {
    if (tableRows.length <= 1) return
    setTableRows((rows) => rows.filter((r) => r.id !== id))
  }

  // Submit
  const handleSubmit = async (targetStatus = "Pending") => {
    if (!selectedJobId) { 
      toast.warn("Please select a Job / MSN.")
      return 
    }

    // Compute parent_heading_id dynamically: track the current heading sort_order
    let currentHeadingSortOrder = null;
    const items = tableRows.map((row, idx) => {
      // If this row has a heading, it starts a new heading group
      if (row.isHeading) {
        currentHeadingSortOrder = idx;
      }

      return {
        sort_order: idx,
        is_heading: row.isHeading,
        heading_text: row.isHeading ? (row.headingText || row.itemNo || "HEADING") : null,
        parent_heading_id: currentHeadingSortOrder !== null ? String(currentHeadingSortOrder) : null,
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
      };
    })

    const payload = {
      job_id: selectedJobId,
      shreno_drg_no: formData.shrenoDrgNo || null,
      customer_drg_no: formData.customerDrgNo || null,
      inspection_by: formData.inspectionBy || null,
      production_engineer_id: production_engineer_id || null,
      qc_engineer_id: qc_engineer_id || null,
      status: targetStatus,
      items,
    }

    try {
      setSubmitting(targetStatus)
      if (editId) {
        await apiClient.put(`/api/mhc/update/${editId}`, payload)
      } else {
        await apiClient.post("/api/mhc/create", payload)
      }
      onSuccess(editId ? "updated" : "created")
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
        <div>
          <h1 className="text-3xl font-bold mb-1">Create Material Heat Chart</h1>
          <p className="text-muted-foreground">Fill in the details and add material rows.</p>
        </div>
        <Button variant="outline" onClick={onBack} disabled={submitting !== null}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      </div>


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
                disabled={jobsLoading}
              />
            </div>

            {/* Auto-filled fields */}
            {[
              { label: "REPORT NO.:", value: autoFill.reportNo },
              { label: "CLIENT:", value: autoFill.client },
              { label: "PO. NO.:", value: autoFill.poNo },
              { label: "PROJECT ID:", value: autoFill.projectId },
              { label: "EQUIPMENT NAME:", value: autoFill.equipmentName },
              { label: "TAG NO.:", value: autoFill.tagNo },
              { label: "CODE:", value: autoFill.code },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-2">
                <Label className="uppercase text-xs font-semibold text-muted-foreground">{label}</Label>
                <Input value={value} readOnly className="bg-muted/50 h-9 border-muted" />
              </div>
            ))}
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
            <div className="space-y-2">
              <Label htmlFor="shrenoDrgNo" className="uppercase text-xs font-semibold text-muted-foreground">SHRENO DRG. NO.:</Label>
              <Input
                id="shrenoDrgNo"
                name="shrenoDrgNo"
                value={formData.shrenoDrgNo}
                onChange={handleFormChange}
                placeholder="Enter SHRENO DRG. No."
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerDrgNo" className="uppercase text-xs font-semibold text-muted-foreground">CUSTOMER DRG. NO.:</Label>
              <Input
                id="customerDrgNo"
                name="customerDrgNo"
                value={formData.customerDrgNo}
                onChange={handleFormChange}
                placeholder="Enter Customer DRG No."
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspectionBy" className="uppercase text-xs font-semibold text-muted-foreground">INSPECTION BY:</Label>
              <Input
                id="inspectionBy"
                name="inspectionBy"
                value={formData.inspectionBy}
                onChange={handleFormChange}
                placeholder="Enter Inspection By"
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: Material Heat Chart Details ── */}
      <Card className="mb-6 rounded-xl shadow-sm border border-muted-foreground/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Material Heat Chart Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground">
                    {[
                      "ITEM NO./PART NO.",
                      "DESCRIPTION",
                      "MATERIAL SPECIFICATION",
                      "SIZE",
                      "QUANTITY / UNIT",
                      "HEAT NO. / CAST NO. / PLATE NO.",
                      "GRN/APP/AP NO.",
                      "MTR NO.",
                      "MANUFACTURER NAME",
                      "REMARKS NCR/DCR",
                      "Action",
                    ].map((h, i) => (
                      <th
                        key={h}
                        className={`text-left p-3 font-semibold text-[11px] uppercase tracking-wider whitespace-normal min-w-[120px] ${i === 0 ? "sticky left-0 bg-[#f4f4f5] z-30 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" : ""
                          }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="h-4"></tr>
                  {tableRows.map((row) => (
                    <React.Fragment key={row.id}>
                      {row.isHeading && (
                        <tr className="bg-amber-50 border-t-2 border-amber-400/60">
                          <td colSpan={9} className="px-2 pt-2 pb-0 align-top sticky left-0 z-10 bg-amber-50">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 shrink-0">Heading:</span>
                              <Input
                                type="text"
                                value={row.headingText}
                                onChange={(e) => handleRowChange(row.id, "headingText", e.target.value)}
                                placeholder="Enter heading text…"
                                className="font-bold h-8 text-sm border-amber-300 shadow-none focus-visible:ring-1 focus-visible:ring-amber-400 bg-white/80"
                              />
                            </div>
                          </td>
                          <td className="px-2 pt-2 pb-0 align-top bg-amber-50">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 border-amber-300 shadow-none text-amber-700 hover:text-destructive hover:border-destructive/30 bg-white/80"
                              title="Remove heading"
                              onClick={() => toggleHeading(row.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      )}
                      <tr className={row.isHeading ? "bg-amber-50/30 border-b-2 border-amber-400/30" : ""}>
                        {[
                          { field: "itemNo", placeholder: "Item No" },
                          { field: "description", placeholder: "Description" },
                          { field: "materialSpecification", placeholder: "Material Spec" },
                          { field: "size", placeholder: "Size" },
                          { field: "quantityUnit", placeholder: "Quantity" },
                          { field: "heatNo", placeholder: "Heat No" },
                          { field: "grnAppApNo", placeholder: "GRN/APP/AP No" },
                          { field: "mtrNo", placeholder: "MTR No" },
                          { field: "manufacturerName", placeholder: "Manufacturer" },
                          { field: "remarks", placeholder: "Remarks" },
                        ].map(({ field, placeholder }, i) => (
                          <td
                            key={field}
                            className={`p-2 align-top ${i === 0 ? `sticky left-0 z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] ${row.isHeading ? "bg-amber-50" : "bg-white"}` : ""}`}
                          >
                            <Input
                              type="text"
                              value={row[field]}
                              onChange={(e) => handleRowChange(row.id, field, e.target.value)}
                              placeholder={placeholder}
                              className="text-[13px] min-w-[120px] h-10 border-muted-foreground/30 shadow-none focus-visible:ring-1"
                            />
                          </td>
                        ))}
                        <td className={`p-2 align-top ${row.isHeading ? "bg-amber-50/30" : "bg-white"}`}>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className={`h-10 w-10 border-muted-foreground/30 shadow-none ${row.isHeading ? "text-amber-700 bg-amber-100 border-amber-300 hover:text-amber-900" : "text-muted-foreground hover:text-foreground"}`}
                              title={row.isHeading ? "Has heading" : "Add heading"}
                              onClick={() => toggleHeading(row.id)}
                            >
                              <Type className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 border-muted-foreground/30 shadow-none text-muted-foreground hover:text-foreground"
                              title="Add row below"
                              onClick={() => addRowAfterHeading(row.id)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 border-muted-foreground/30 shadow-none text-muted-foreground hover:text-destructive"
                              onClick={() => removeRow(row.id)}
                              disabled={tableRows.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-muted/50 mt-4">
              <Button type="button" variant="outline" onClick={addRow} className="w-auto h-9 text-[13px] px-4 rounded-xl border-muted-foreground/30 shadow-sm">
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
          <p className="text-xs text-muted-foreground">Assign quality</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
            <div className="space-y-2">
              <Label className="uppercase text-[11px] font-bold text-muted-foreground tracking-wider">PRODUCTION <span className="text-destructive">*</span></Label>
              <SearchableSelect
                options={productionEngineers.map((u) => ({ value: u.id, label: `${u.name}` }))}
                value={production_engineer_id}
                onValueChange={setProductionEngineerId}
                placeholder="Select production engineer"
                searchPlaceholder="Search production engineer..."
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label className="uppercase text-[11px] font-bold text-muted-foreground tracking-wider">QUALITY <span className="text-destructive">*</span></Label>
              <SearchableSelect
                options={qcEngineers.map((u) => ({ value: u.id, label: `${u.name}` }))}
                value={qc_engineer_id}
                onValueChange={setQcEngineerId}
                placeholder="Select quality engineer"
                searchPlaceholder="Search quality engineer..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Footer Buttons ── */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onBack} disabled={submitting !== null}>
          Cancel
        </Button>
        <Button 
          variant="secondary" 
          onClick={() => handleSubmit("Draft")} 
          disabled={submitting !== null}
          className="bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border-blue-200"
        >
          {submitting === "Draft" ? "Saving…" : "Save Draft"}
        </Button>
        <Button onClick={() => handleSubmit("Pending")} disabled={submitting !== null}>
          {submitting === "Pending" ? "Submitting…" : "Submit"}
        </Button>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
function MaterialHeatChart() {
  const [view, setView] = useState("list") // "list" | "create"
  const [editId, setEditId] = useState(null)

  const handleCreateClick = () => {
    setEditId(null)
    setView("create")
  }

  const handleEditClick = (id) => {
    setEditId(id)
    setView("create")
  }

  const handleSuccess = (action) => {
    toast.success(`Material Heat Chart ${action} successfully!`)
    setView("list")
  }

  return (
    <>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-auto p-6 flex flex-col">
          <div className="flex-1 flex flex-col w-full">

            {view === "list" ? (
              <ListView onCreateClick={handleCreateClick} onEditClick={handleEditClick} />
            ) : (
              <CreateView onBack={() => setView("list")} onSuccess={handleSuccess} editId={editId} />
            )}
          </div>
        </main>
    </>
  )
}

export default MaterialHeatChart
