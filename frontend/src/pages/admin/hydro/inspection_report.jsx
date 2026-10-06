import { PageContainer } from "@/components/layout/PageContainer";
import { useState, useEffect, useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"

import { SearchableSelect } from "@/components/shared/SearchableSelect"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Trash2, ArrowLeft, FileText, Eye, Edit, CheckCircle, XCircle, Download, Archive, Copy } from "lucide-react"
import { DataTable } from "@/components/shared/DataTable"
import ProDataTable from "@/components/shared/ProDataTable"
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"
import { toast } from 'react-toastify'
import { useAuth } from "@/context/AuthContext"
import { Switch } from "@/components/ui/switch"
import ConfirmDialog from "@/components/shared/ConfirmDialog"

// ─── List View ───────────────────────────────────────────────────────────────
function ListView({ onCreateClick, onEditClick, onCloneClick }) {
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isViewLoading, setIsViewLoading] = useState(false)
  const [error, setError] = useState("")

  const { user, roles, hasPermission } = useAuth()
  const isAdmin = roles?.includes("ADMIN");
  const isQE = roles?.includes("QE") || roles?.includes("QC_ENGINEER") || roles?.includes("QC");
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Cascading Filters State
  const [activeFilters, setActiveFilters] = useState({ records: [] });
  const [columnFilters, setColumnFilters] = useState({ is_active: ['true'] });
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const statusParam = searchParams.get('status');
    const dateParam = searchParams.get('date');
    if (statusParam || dateParam) {
      setColumnFilters(prev => ({
        ...prev,
        status: statusParam ? [statusParam] : prev.status,
        date: dateParam ? [dateParam] : prev.date
      }));
      setSearchParams(new URLSearchParams(), { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmData, setConfirmData] = useState({ title: "", description: "", variant: "danger", onConfirm: null });

  const fetchActiveFilters = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/inspection-report/get-filters");
      if (res.success) setActiveFilters(res.data);
    } catch (err) {
      console.error("Error fetching active filters:", err);
    }
  }, []);

  useEffect(() => {
    fetchActiveFilters();
  }, [fetchActiveFilters, refreshTrigger]);

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
      const res = await apiClient.put(`/api/inspection-report/update-status/${docForReview.id}`, {
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
      default:
        return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800 shadow-sm border border-gray-200">{status || "Pending"}</span>
    }
  }

  const handleViewClick = async (id) => {
    setIsViewLoading(true)
    setError("")
    try {
      const res = await apiClient.get(`/api/inspection-report/${id}`)
      if (res.success) {
        setSelectedRecord(res.data)
        setIsViewOpen(true)
      } else {
        setError("Failed to fetch details")
      }
    } catch (err) {
      setError("Error fetching details")
      console.error(err)
    } finally {
      setIsViewLoading(false)
    }
  }

  const handleDownload = async (id, reportNo) => {
    try {
      const filename = `DISH_END_${reportNo.replace(/\//g, '_')}.pdf`;
      await exportApi.download(
        `/api/inspection-report/${id}/download`,
        filename,
        {},
        { contentType: 'application/pdf' }
      );
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download report');
    }
  };

  const handleToggleStatus = async (row) => {
    setConfirmData({
        title: `${row.is_active ? 'Deactivate' : 'Activate'} Report`,
        description: `Are you sure you want to ${row.is_active ? 'deactivate' : 'activate'} report ${row.report_no}?`,
        confirmText: row.is_active ? 'Deactivate' : 'Activate',
        variant: 'warning',
        onConfirm: async () => {
            try {
                const res = await apiClient.patch(`/api/inspection-report/toggle-status/${row.id}`)
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
        title: 'Archive Report',
        description: `Are you sure you want to archive report ${row.report_no}? This action is irreversible.`,
        confirmText: 'Archive',
        variant: 'danger',
        onConfirm: async () => {
            try {
                const res = await apiClient.delete(`/api/inspection-report/archive/${row.id}`)
                if (res.success) {
                    toast.success(res.message)
                    setRefreshTrigger(prev => prev + 1)
                } else {
                    toast.error(res.message || "Failed to archive report")
                }
            } catch (err) {
                console.error(err)
                toast.error("Failed to archive report")
            }
        }
    })
    setConfirmDialogOpen(true)
  }

  const activeIsActiveOptions = useMemo(() => [
    { label: "Active", value: "true" },
    { label: "Inactive", value: "false" }
  ], []);

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
      header: "Job Number", 
      accessorKey: "msn",
      filterType: "select",
      isMulti: true,
      filterOptions: activeMsnOptions
    },
    { header: "Equipment", accessorKey: "equipment_name" },
    {
      header: "Created",
      accessorKey: "createdAt",
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row) => getStatusBadge(row.status),
    },
    {
        header: "Active",
        accessorKey: "is_active",
        filterType: "select",
        isMulti: true,
        filterOptions: activeIsActiveOptions,
        cell: (row) => (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${row.is_active ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {row.is_active ? "Active" : "Inactive"}
            </span>
        )
    },
    {
      id: "actions",
      header: "Actions",
      width: "60px",
      cell: (row) => {
        const isAssignedPE = row.production_engineer_id === user?.id
        const isQE = roles?.includes("QE") || roles?.includes("QC_ENGINEER") || roles?.includes("QC")
        const status = row.status?.trim()?.toLowerCase()
        // Only non-QC users who are assigned can review, or Admin
        const canReview = !isQE && (isAssignedPE || isAdmin) && status !== "approved" && status !== "rejected"
        const isApproved = status === "approved"
        
        const actions = [];
        
        actions.push({
            label: "View",
            icon: Eye,
            onClick: () => handleViewClick(row.id)
        });
        
        if (isAdmin || isQE) {
            actions.push({
                label: "Edit",
                icon: Edit,
                onClick: () => onEditClick(row.id),
                disabled: isApproved
            });
            actions.push({
                label: "Clone",
                icon: Copy,
                onClick: () => onCloneClick(row.id)
            });
        } else if (!isApproved) {
            actions.push({
                label: "Review",
                icon: CheckCircle,
                onClick: () => onEditClick(row.id)
            });
        }
        
        if (canReview) {
            actions.push({ type: "separator" });
            actions.push({
                label: "Approve",
                icon: CheckCircle,
                onClick: () => handleReviewClick(row, "Approved"),
                className: "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            });
            actions.push({
                label: "Reject",
                icon: XCircle,
                onClick: () => handleReviewClick(row, "Rejected"),
                className: "text-red-600 hover:text-red-700 hover:bg-red-50"
            });
        }
        
        if (status === "approved" || isAdmin || isAssignedPE) {
            actions.push({ type: "separator" });
            actions.push({
                label: "Download PDF",
                icon: Download,
                onClick: () => handleDownload(row.id, row.report_no)
            });
        }
        
        if (isAdmin) {
            actions.push({ type: "separator" });
            actions.push({
                label: row.is_active ? "Deactivate" : "Activate",
                icon: row.is_active ? XCircle : CheckCircle,
                onClick: () => handleToggleStatus(row),
                className: row.is_active ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            });
            actions.push({
                label: "Archive",
                icon: Archive,
                onClick: () => handleDelete(row),
                className: "text-red-600 hover:text-red-700 hover:bg-red-50"
            });
        }
        
        return (
          <div className="flex items-center justify-center">
            <DataTableRowActions actions={actions} />
          </div>
        );
      },
    },
  ], [activeClientOptions, activePoOptions, activeMsnOptions, isAdmin, roles, user])

  const fetchData = useCallback(async (params) => {
    const queryParams = { ...params };
    if (queryParams.columnFilters) {
      queryParams.columnFilters = JSON.stringify(queryParams.columnFilters);
    }
    const res = await apiClient.get(`/api/inspection-report/list`, queryParams)
    return { data: res.data, meta: res.meta }
  }, [])

  const [refreshKey, setRefreshKey] = useState(0);

  const handleExport = async () => {
    try {
      await exportApi.exportDishEnd();
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Dish End Export failed:", error);
    }
  };

  return (
    <div>
      

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <ProDataTable
        columns={columns}
        fetchData={fetchData}
        onExport={handleExport}
        onAdd={hasPermission("inspection:dish_end", "Create") ? onCreateClick : undefined}
        columnFilters={columnFilters}
        onFilterChange={(newFilters) => setColumnFilters(prev => ({ ...prev, ...newFilters }))}
        refreshKey={refreshTrigger}
        globalSearchPlaceholder="Search report no, job, client..."
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
            <DialogTitle className="text-xl font-bold text-center">Dish End Inspection Report Details</DialogTitle>
            <DialogDescription className="text-center">
              Complete details of the selected Dish End Inspection Report.
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-6">
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
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">DRG NO:</span>
                  <span className="font-medium">{selectedRecord.drg_no || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">INSP AGENCY:</span>
                  <span className="font-medium">{selectedRecord.insp_agency || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">REPORT NO:</span>
                  <span className="font-medium">{selectedRecord.report_no || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">PRODUCTION ENGINEER:</span>
                  <span className="font-medium">{selectedRecord.production_engineer?.name || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">VENDOR DISH END NO:</span>
                  <span className="font-medium">{selectedRecord.vendor_dish_end_number || "-"}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full border-collapse text-xs text-left">
                  <thead>
                    <tr className="bg-[#f4f4f5] border-b border-border">
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">SR NO.</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">DESCRIPTION</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">AS PER DRG.</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">
                        <div className="flex flex-col gap-1">
                          <span>ACTUAL</span>
                          <span className="text-muted-foreground font-normal">{selectedRecord.vendor_dish_end_number || "Vendor Dish End Number"}</span>
                        </div>
                      </th>
                      <th className="p-3 font-bold text-[11px] uppercase tracking-wider">REMARKS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!selectedRecord.items || selectedRecord.items.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="border border-border p-4 text-center">
                          No items added.
                        </td>
                      </tr>
                    ) : (
                      selectedRecord.items.map((row) => (
                        <tr key={row.id} className="hover:bg-muted/30 border-b border-border last:border-0">
                          <td className="border-r border-border p-3 align-top font-medium">{row.sr_no || "-"}</td>
                          <td className="border-r border-border p-3 align-top">{row.description || "-"}</td>
                          <td className="border-r border-border p-3 align-top">{row.as_per_drg || "-"}</td>
                          <td className="border-r border-border p-3 align-top">{row.actual || "-"}</td>
                          <td className="p-3 align-top">{row.remarks || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Instruments Table */}
              {selectedRecord.instruments && selectedRecord.instruments.length > 0 && (
                <div className="overflow-x-auto rounded-md border border-border mt-6">
                  <h3 className="p-3 font-bold text-sm bg-muted/40 border-b border-border">Instrument Calibration Details</h3>
                  <table className="w-full border-collapse text-xs text-left">
                    <thead>
                      <tr className="bg-[#f4f4f5] border-b border-border">
                        <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">NAME</th>
                        <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">ID NO. / SR NO.</th>
                        <th className="p-3 font-bold text-[11px] uppercase tracking-wider">DUE DATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRecord.instruments.map((row) => (
                        <tr key={row.id} className="hover:bg-muted/30 border-b border-border last:border-0">
                          <td className="border-r border-border p-3 align-top font-medium">{row.name || "-"}</td>
                          <td className="border-r border-border p-3 align-top">{row.id_no || "-"}</td>
                          <td className="p-3 align-top">{row.due_date || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Create / Edit View ──────────────────────────────────────────────────────
function CreateView({ onBack, onSuccess, editId = null, cloneId = null }) {
  const normalizeUser = (user) => {
    const id = String(user?.id || "")
    const name = String(user?.name || user?.full_name || user?.email || "User")
    const empid = String(user?.empid || user?.employeeId || "")
    return {
      id,
      name,
      empid,
      displayName: empid ? `${name} (${empid})` : `${name}`,
    }
  }

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })

  // First section - Dropdowns
  const [msn, setMsn] = useState("")
  const [reportNo, setReportNo] = useState("")
  const [client, setClient] = useState("")
  const [poNo, setPoNo] = useState("")
  const [equipment, setEquipment] = useState("")
  const [code, setCode] = useState("")
  const [vendorDishEndNo, setVendorDishEndNo] = useState("")

  // User input fields
  const [formData, setFormData] = useState({
    tagNo: "",
    drgNo: "",
    inspAgency: "",
  })

  const [userRole, setUserRole] = useState("")

  // Detect user role from local storage
  useEffect(() => {
    const authData = localStorage.getItem("user_auth")
    if (authData) {
      try {
        const parsed = JSON.parse(authData)
        const roles = parsed?.payload?.roles || parsed?.payload?.user?.roles || []
        const roleNames = roles.map(r => (typeof r === 'object' && r.name) ? r.name : r)
        if (roleNames.some(r => ['QC_ENGINEER', 'ADMIN'].includes(r))) {
          setUserRole('QC')
        } else if (roleNames.some(r => ['PRODUCTION_ENGINEER'].includes(r))) {
          setUserRole('PROD')
        }
      } catch (e) {
        console.error("Error parsing auth data", e)
      }
    }
  }, [])

  // Description options for the table
  const descriptionOptions = [
    "INNER DIAMETER",
    "OVALITY (Maximum)",
    "CIRCUMFERANCE",
    "CROWN RADIUS (C.R)",
    "KNUCKLE RADIUS (K.R)",
    "STRAIGHT FACE",
    "DISH HEIGHT including SF",
    "NOMINAL THICKNESS",
    "MIN. THICKNESS",
    "SPIN HOLE",
    "Maximum OVER CROWNING",
    "Maximum UNDER CROWNING",
    "EDGE PREPARATION (Single \"V\" / DOUBLE \"V\")",
    "HEAT TREATMENT (YES/NO)",
    "MARKING",
    "VISUAL INSPECTION",
    "FORMING PROCESS",
    "NDT (LPT/MT)",
    "NDT (RT) (YES/NO)",
    "TEMPELATE VERIFICATION - INTERNAL",
    "TEMPELATE VERIFICATION - External (YES/NO)",
  ]

  // Main table rows
  const [tableRows, setTableRows] = useState(
    descriptionOptions.map((desc, index) => ({
      id: index + 1,
      srNo: index + 1,
      description: desc,
      asPerDrg: "",
      actual: "",
      remarks: "",
    }))
  )

  // Instrument Calibration Details table
  const [instrumentRows, setInstrumentRows] = useState([
    { id: 1, instrument_id: "", name: "", idNo: "", dueDate: "" },
  ])

  const [masterInstruments, setMasterInstruments] = useState([])

  // Production Engineer
  const [productionEngineer, setProductionEngineer] = useState("")

  // API state
  const [msnOptions, setMsnOptions] = useState([])
  const [productionEngineers, setProductionEngineers] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    apiClient.get("/api/common/jobs")
      .then((res) => { if (res.success) setMsnOptions(res.data) })
      .catch((err) => console.error("Failed to fetch jobs:", err))

    apiClient.get("/api/users/by-role/PRODUCTION_ENGINEER")
      .then((res) => { if (res.success) setProductionEngineers(res.data) })
      .catch((err) => console.error("Failed to fetch production engineers:", err))

    apiClient.get("/api/masters/instruments?type=CALIBRATION_INSTRUMENT")
      .then((res) => {
        let data = Array.isArray(res) ? res : (res.data || []);
        const mapped = data.map(item => ({
          id: item.id.toString(),
          name: `${item.equipment_desc || ''}${item.range ? ` / ${item.range}` : ''}`.trim(),
          id_no: item.serial_no || '',
          due_date: item.due_date ? new Date(item.due_date).toLocaleDateString('en-GB').replace(/\//g, '-') : ''
        }));
        setMasterInstruments(mapped)
      })
      .catch((err) => console.error("Failed to fetch instruments:", err))
  }, [])

  useEffect(() => {
    const targetId = editId || cloneId
    if (targetId && msnOptions.length > 0) {
      apiClient.get(`/api/inspection-report/${targetId}`)
        .then((res) => {
          if (res.success && res.data) {
            const data = res.data
            // Match MSN option by job_id
            setMsn(cloneId ? "" : (data.job_id || ""))
            setReportNo(cloneId ? "" : (data.report_no || ""))
            setEquipment(data.equipment_name || "")
            setCode(data.code || "")
            setClient(cloneId ? "" : (data.client || ""))
            setPoNo(cloneId ? "" : (data.po_no || ""))
            setVendorDishEndNo(data.vendor_dish_end_number || "")

            setFormData({
              tagNo: cloneId ? "" : (data.tag_no || ""),
              drgNo: cloneId ? "" : (data.drg_no || ""),
              inspAgency: data.insp_agency || "",
            })
            setProductionEngineer(data.production_engineer_id || "")

            if (data.items && data.items.length > 0) {
              setTableRows(data.items.map((item, i) => ({
                id: i + 1,
                srNo: item.sr_no || (i + 1),
                description: item.description || "",
                asPerDrg: item.as_per_drg || "",
                actual: cloneId ? "" : (item.actual || ""),
                remarks: cloneId ? "" : (item.remarks || "")
              })))
            }

            if (data.instruments && data.instruments.length > 0) {
              setInstrumentRows(data.instruments.map((inst, i) => ({
                id: i + 1,
                instrument_id: inst.instrument_id || "",
                name: inst.name || "",
                idNo: inst.id_no || "",
                dueDate: inst.due_date || ""
              })))
            }
          }
        })
        .catch((err) => console.error("Failed to fetch report details:", err))
    }
  }, [editId, msnOptions])

  const handleMsnChange = async (value) => {
    setMsn(value)

    // Only auto-fetch if we are not editing, or if editing and we change the MSN
    if (!editId) {
      setReportNo("Loading...")
    }

    const selectedMsn = msnOptions.find((option) => option.id === value)

    setEquipment(selectedMsn?.equipement_name || "")
    setCode(selectedMsn?.code || "")
    setClient(selectedMsn?.customer?.customer_name || "")
    setPoNo(selectedMsn?.po?.po_number || "")

    if (!editId) {
      try {
        const res = await apiClient.get(`/api/inspection-report/next-report-no/${value}`)
        if (res.success && res.data?.next_report_no) {
          setReportNo(res.data.next_report_no)
        } else {
          setReportNo("Auto-generated on Submit")
        }
      } catch (err) {
        console.error("Failed to fetch next report number:", err)
        setReportNo("Auto-generated on Submit")
      }
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleRowChange = (id, field, value) => {
    setTableRows(
      tableRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    )
  }

  const handleInstrumentRowChange = (id, field, value) => {
    setInstrumentRows(
      instrumentRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    )
  }

  const handleInstrumentSelect = (rowId, instrumentId) => {
    const selected = masterInstruments.find(i => i.id.toString() === instrumentId);
    if (selected) {
      setInstrumentRows(instrumentRows.map(row => row.id === rowId ? {
        ...row,
        instrument_id: selected.id,
        name: selected.name,
        idNo: selected.id_no,
        dueDate: selected.due_date
      } : row));
    }
  }

  const addInstrumentRow = () => {
    const newId = Math.max(...instrumentRows.map((row) => row.id), 0) + 1
    setInstrumentRows([...instrumentRows, { id: newId, instrument_id: "", name: "", idNo: "", dueDate: "" }])
  }

  const removeInstrumentRow = (id) => {
    if (instrumentRows.length > 1) {
      setInstrumentRows(instrumentRows.filter((row) => row.id !== id))
    }
  }

  const handleSubmit = async (status = "Draft") => {
    if (!msn) {
      toast.error("Please select an MSN")
      return
    }

    const payload = {
      job_id: msn,
      msn: msnOptions.find(opt => opt.id === msn)?.job_number || "",
      client,
      po_no: poNo,
      equipment_name: equipment,
      tag_no: formData.tagNo,
      code,
      drg_no: formData.drgNo,
      insp_agency: formData.inspAgency,
      production_engineer_id: productionEngineer,
      vendor_dish_end_number: vendorDishEndNo,
      status: status,
      items: tableRows.map(r => ({
        sr_no: parseInt(r.srNo, 10),
        description: r.description,
        as_per_drg: r.asPerDrg,
        actual: r.actual,
        remarks: r.remarks
      })),
      instruments: instrumentRows.filter(r => r.name || r.idNo || r.dueDate).map(r => ({
        instrument_id: r.instrument_id,
        name: r.name,
        id_no: r.idNo,
        due_date: r.dueDate
      }))
    }

    try {
      setSubmitting(true)
      let res;
      if (editId) {
        res = await apiClient.put(`/api/inspection-report/update/${editId}`, payload)
      } else {
        res = await apiClient.post("/api/inspection-report/create", payload)
      }

      if (res.success) {
        toast.success(editId ? "Dish End Inspection Report updated successfully!" : "Dish End Inspection Report created successfully!")
        onSuccess()
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message || "Failed to save report")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-6">
        <Button variant="outline" onClick={onBack} className="h-9">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="msn">MSN:</Label>
              <SearchableSelect
                options={msnOptions.map((msnOption) => ({ label: msnOption.job_number, value: msnOption.id }))}
                value={msn}
                onValueChange={handleMsnChange}
                placeholder="Select MSN"
                disabled={userRole === 'PROD'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportNo">REPORT NO.:</Label>
              <Input
                id="reportNo"
                type="text"
                value={reportNo}
                readOnly
                className="bg-muted text-xs font-semibold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment">EQUIPMENT:</Label>
              <Input
                id="equipment"
                type="text"
                value={equipment}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">CLIENT:</Label>
              <Input
                id="client"
                type="text"
                value={client}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="poNo">P.O. NO.:</Label>
              <Input
                id="poNo"
                type="text"
                value={poNo}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">CONSTRUCTION CODE:</Label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                readOnly={userRole === 'PROD'}
                className={userRole === 'PROD' ? "bg-muted text-xs" : "text-xs"}
                placeholder="Enter construction code"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date:</Label>
              <Input
                id="date"
                type="text"
                value={today}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Equipment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tagNo">TAG NO.:</Label>
              <Input
                id="tagNo"
                name="tagNo"
                type="text"
                value={formData.tagNo}
                onChange={handleInputChange}
                readOnly={userRole === 'PROD'}
                className={userRole === 'PROD' ? "bg-muted text-xs" : "text-xs"}
                placeholder="Enter TAG NO."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="drgNo">DRG. NO.:</Label>
              <Input
                id="drgNo"
                name="drgNo"
                type="text"
                value={formData.drgNo}
                onChange={handleInputChange}
                readOnly={userRole === 'PROD'}
                className={userRole === 'PROD' ? "bg-muted text-xs" : "text-xs"}
                placeholder="Enter DRG. NO."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspAgency">INSP. AGENCY:</Label>
              <Input
                id="inspAgency"
                name="inspAgency"
                type="text"
                value={formData.inspAgency}
                onChange={handleInputChange}
                readOnly={userRole === 'PROD'}
                className={userRole === 'PROD' ? "bg-muted text-xs" : "text-xs"}
                placeholder="Enter INSP. AGENCY"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Inspection Details</CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex flex-col gap-4 w-full">
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow className="bg-blue-100">
                  <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300 w-16 text-center">
                    SR NO.
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300">
                    DESCRIPTION
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300">
                    AS PER DRG.
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300">
                    <div className="flex flex-col gap-2">
                      <span>ACTUAL</span>
                      <Input
                        type="text"
                        value={vendorDishEndNo}
                        onChange={(e) => setVendorDishEndNo(e.target.value)}
                        placeholder="Vendor Dish End Number"
                        readOnly={userRole === 'PROD'}
                        className={`text-xs border-0 focus-visible:ring-0 ${userRole === 'PROD' ? 'bg-muted' : 'bg-white'}`}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300">
                    REMARKS
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="p-2 border border-gray-300 text-center">
                      <div className="text-sm font-medium">{row.srNo}</div>
                    </TableCell>
                    <TableCell className="p-2 border border-gray-300">
                      <Input
                        type="text"
                        value={row.description}
                        onChange={(e) => handleRowChange(row.id, "description", e.target.value)}
                        placeholder="Description"
                        readOnly={userRole === 'PROD'}
                        className={`w-full text-xs border-0 focus-visible:ring-0 ${userRole === 'PROD' ? 'bg-muted' : ''}`}
                      />
                    </TableCell>
                    <TableCell className="p-2 border border-gray-300">
                      <Input
                        type="text"
                        value={row.asPerDrg}
                        onChange={(e) => handleRowChange(row.id, "asPerDrg", e.target.value)}
                        placeholder="As Per DRG"
                        readOnly={userRole === 'PROD'}
                        className={`w-full text-xs border-0 focus-visible:ring-0 ${userRole === 'PROD' ? 'bg-muted' : ''}`}
                      />
                    </TableCell>
                    <TableCell className="p-2 border border-gray-300">
                      <Input
                        type="text"
                        value={row.actual}
                        onChange={(e) => handleRowChange(row.id, "actual", e.target.value)}
                        placeholder="Actual"
                        readOnly={userRole === 'PROD'}
                        className={`w-full text-xs border-0 focus-visible:ring-0 ${userRole === 'PROD' ? 'bg-muted' : ''}`}
                      />
                    </TableCell>
                    <TableCell className="p-2 border border-gray-300">
                      <Input
                        type="text"
                        value={row.remarks}
                        onChange={(e) => handleRowChange(row.id, "remarks", e.target.value)}
                        placeholder="Remarks"
                        readOnly={userRole === 'PROD'}
                        className={`w-full text-xs border-0 focus-visible:ring-0 ${userRole === 'PROD' ? 'bg-muted' : ''}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Instrument Calibration Details</CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex flex-col gap-4 w-full">
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="p-2 text-xs font-bold uppercase">NAME</TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">ID NO. / SR NO.</TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">DUE DATE</TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instrumentRows.length > 0 ? (
                  instrumentRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <SearchableSelect
                          options={masterInstruments.map(inst => ({ value: inst.id.toString(), label: inst.name }))}
                          value={masterInstruments.find(i => i.name === row.name)?.id?.toString() || ""}
                          onValueChange={(val) => handleInstrumentSelect(row.id, val)}
                          placeholder="Select Instrument"
                          disabled={userRole === 'PROD'}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.idNo}
                          readOnly
                          className="w-full text-xs border-0 focus-visible:ring-0 bg-muted"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.dueDate}
                          readOnly
                          className="w-full text-xs border-0 focus-visible:ring-0 bg-muted"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeInstrumentRow(row.id)}
                          disabled={instrumentRows.length === 1 || userRole === 'PROD'}
                          title="Remove Row"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No instrument calibration details added.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <Button type="button" variant="outline" onClick={addInstrumentRow} className="w-full sm:w-auto mt-2" disabled={userRole === 'PROD'}>
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Production Engineer Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="productionEngineer">Production Engineer:</Label>
              <SearchableSelect
                options={productionEngineers.map((engineer) => {
                  const normalized = normalizeUser(engineer);
                  return { label: normalized.displayName, value: normalized.id };
                })}
                value={productionEngineer}
                onValueChange={setProductionEngineer}
                placeholder="Select Production Engineer"
                disabled={userRole === 'PROD'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 mt-6">
        <Button variant="outline" className="cursor-pointer" onClick={() => handleSubmit("Draft")} disabled={submitting || userRole === 'PROD'}>
          Save Draft
        </Button>
        <Button className="cursor-pointer" onClick={() => handleSubmit("Offered")} disabled={submitting || userRole === 'PROD'}>
          {submitting ? "Saving..." : (editId ? "Update Report" : "Submit Report")}
        </Button>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
function InspectionReport() {
  const [view, setView] = useState("list") // "list" | "create" | "edit"
  const [editId, setEditId] = useState(null)
  const [cloneId, setCloneId] = useState(null)

  const handleSuccess = () => {
    setView("list")
    setEditId(null)
    setCloneId(null)
  }

  const handleEdit = (id) => {
    setEditId(id)
    setCloneId(null)
    setView("edit")
  }

  const handleClone = (id) => {
    setCloneId(id)
    setEditId(null)
    setView("create")
  }

  return (
    <>
      <PageContainer>
{view === "list" ? (
            <ListView
              onCreateClick={() => {
                setEditId(null)
                setCloneId(null)
                setView("create")
              }}
              onEditClick={handleEdit}
              onCloneClick={handleClone}
            />
          ) : (
            <CreateView
              onBack={() => {
                setView("list")
                setEditId(null)
                setCloneId(null)
              }}
              onSuccess={handleSuccess}
              editId={editId}
              cloneId={cloneId}
            />
          )}
</PageContainer>
    </>
  )
}

export default InspectionReport
