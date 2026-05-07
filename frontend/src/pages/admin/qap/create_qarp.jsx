import { useState, useMemo, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"
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
import { Plus, Trash2, Type, ArrowLeft, Eye, Edit, Download, Archive } from "lucide-react"
import { DataTable } from "@/components/shared/DataTable"
import ProDataTable from "@/components/shared/ProDataTable"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/context/AuthContext"

// ─── List View ───────────────────────────────────────────────────────────────
function ListView({ onCreateClick, onEditClick }) {
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isViewLoading, setIsViewLoading] = useState(false)
  const [error, setError] = useState("")

  const handleDownloadPdf = async (id) => {
    try {
      const filename = `QAP_${id}.pdf`;
      await exportApi.download(
        `/api/qap/download-pdf/${id}`,
        filename,
        {},
        { contentType: 'application/pdf' }
      );
    } catch (err) {
      console.error(err)
      toast.error(err.message || "Failed to download PDF")
    }
  }

  const handleViewClick = async (id) => {
    setIsViewLoading(true)
    setError("")
    try {
      const res = await apiClient.get(`/api/qap/${id}`)
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

  const [refreshTrigger, setRefreshTrigger] = useState(0)
  // Cascading Filters State
  const [activeFilters, setActiveFilters] = useState({ records: [] });
  const [columnFilters, setColumnFilters] = useState({ is_active: ['true'] });
  const { roles } = useAuth();
  const isAdmin = roles?.includes("ADMIN");

  const [confirmData, setConfirmData] = useState({ isOpen: false, title: "", description: "", confirmText: "", variant: "danger", onConfirm: null, isLoading: false });

  const fetchActiveFilters = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/qap/get-filters");
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

  const handleToggleStatus = async (row) => {
    setConfirmData({
      isOpen: true,
      title: `${row.is_active ? 'Deactivate' : 'Activate'} QAP Record`,
      description: `Are you sure you want to ${row.is_active ? 'deactivate' : 'activate'} QAP for report ${row.report_no}?`,
      confirmText: row.is_active ? 'Deactivate' : 'Activate',
      variant: 'warning',
      onConfirm: async () => {
        try {
          setConfirmData(prev => ({ ...prev, isLoading: true }))
          const res = await apiClient.patch(`/api/qap/toggle-status/${row.id}`)
          if (res.success) {
            toast.success(res.message)
            setRefreshTrigger(prev => prev + 1)
          }
        } catch (error) {
          toast.error(error.message || "Failed to toggle status")
        } finally {
          setConfirmData(prev => ({ ...prev, isOpen: false, isLoading: false }))
        }
      }
    })
  }

  const handleArchive = async (row) => {
    setConfirmData({
      isOpen: true,
      title: 'Archive QAP Record',
      description: `Are you sure you want to archive QAP for report ${row.report_no}? This action is irreversible.`,
      confirmText: 'Archive',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setConfirmData(prev => ({ ...prev, isLoading: true }))
          const res = await apiClient.delete(`/api/qap/archive/${row.id}`)
          if (res.success) {
            toast.success(res.message)
            setRefreshTrigger(prev => prev + 1)
          }
        } catch (error) {
          toast.error(error.message || "Failed to archive record")
        } finally {
          setConfirmData(prev => ({ ...prev, isOpen: false, isLoading: false }))
        }
      }
    })
  }

  const activeIsActiveOptions = [
    { label: "Active", value: "true" },
    { label: "Inactive", value: "false" }
  ];

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
      header: "PO No.",
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
    { header: "Project ID", accessorKey: "project_id" },
    { header: "Equipment", accessorKey: "equipment_name" },
    {
      header: "Created",
      accessorKey: "createdAt",
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
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
      cell: (row) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewClick(row.id)}
            className="cursor-pointer"
            title="View">
            <Eye className="h-4 w-4 mr-2" /> View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditClick(row.id)}
            className="cursor-pointer"
            title="Edit">
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-200 hover:bg-blue-50 cursor-pointer"
            onClick={() => handleDownloadPdf(row.id)}
            title="Download PDF">
            <Download className="h-4 w-4 mr-2" /> Download
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/20 hover:bg-destructive/5 cursor-pointer"
              onClick={() => handleArchive(row)}
              title="Archive Record"
            >
              <Archive className="h-4 w-4" /> Archive
            </Button>
          )}
        </div>
      ),
    },
  ], [onEditClick, activeClientOptions, activePoOptions, activeMsnOptions, isAdmin])

  const fetchData = useCallback(async (params) => {
    const queryParams = { ...params };
    if (queryParams.columnFilters) {
      queryParams.columnFilters = JSON.stringify(queryParams.columnFilters);
    }
    const res = await apiClient.get(`/api/qap/list`, queryParams)
    return { data: res.data, meta: res.meta }
  }, [])

  const handleExport = async () => {
    try {
      await exportApi.exportQAP();
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("QAP Export failed:", error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Quality Assurance Plans</h1>
          <p className="text-muted-foreground">View and manage all quality assurance plans.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <ProDataTable
        columns={columns}
        fetchData={fetchData}
        onExport={handleExport}
        onAdd={onCreateClick}
        columnFilters={columnFilters}
        onFilterChange={(newFilters) => setColumnFilters(prev => ({ ...prev, ...newFilters }))}
        refreshKey={refreshTrigger}
        globalSearchPlaceholder="Search report no, job, client..."
      />

      {/* View Details Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[95vw] w-full max-h-[95vh] overflow-y-auto p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-center">Quality Assurance Plan Details</DialogTitle>
            <DialogDescription className="text-center">
              Complete details of the selected Quality Assurance Plan.
            </DialogDescription>
            <div className="flex justify-center mt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => handleDownloadPdf(selectedRecord.id)}
              >
                <Download className="h-4 w-4 mr-2" /> Download QAP PDF
              </Button>
            </div>
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
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">PO DATE:</span>
                  <span className="font-medium">{selectedRecord.po_date || "-"}</span>
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
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">PROJECT ID:</span>
                  <span className="font-medium">{selectedRecord.project_id || "-"}</span>
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
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full border-collapse text-xs text-left">
                  <thead>
                    <tr className="bg-[#f4f4f5] border-b border-border">
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider min-w-[60px]">SR NO.</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">ACTIVITY (Description)</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">TYPE / METHOD / EXTENT</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">ACCEPTANCE CRITERIA / REF DOCS</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">VERIFYING DOCUMENT</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">SHRENO</th>
                      <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">CLIENT / TPIA</th>
                      {selectedRecord.dynamic_columns?.map((col, idx) => (
                        <th key={idx} className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">
                          {col.name}
                        </th>
                      ))}
                      <th className="p-3 font-bold text-[11px] uppercase tracking-wider">REMARKS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!selectedRecord.items || selectedRecord.items.length === 0) ? (
                      <tr>
                        <td colSpan={8 + (selectedRecord.dynamic_columns?.length || 0)} className="border border-border p-4 text-center">
                          No items added.
                        </td>
                      </tr>
                    ) : (
                      selectedRecord.items.map((row, index) => {
                        if (row.is_heading) {
                          return (
                            <tr key={row.id} className="bg-muted/30 border-b border-border last:border-0 font-semibold">
                              <td className="border-r border-border p-3 align-top text-center">
                                {row.sr_no || "-"}
                              </td>
                              <td colSpan={7 + (selectedRecord.dynamic_columns?.length || 0)} className="border-r border-border p-3 align-top">
                                {row.heading_text || "-"}
                              </td>
                            </tr>
                          )
                        }

                        // Standard Row
                        return (
                          <tr key={row.id} className="hover:bg-muted/30 border-b border-border last:border-0">
                            <td className="border-r border-border p-3 align-top font-medium text-center">{row.sr_no || "-"}</td>
                            <td className="border-r border-border p-3 align-top">{row.activity || "-"}</td>
                            <td className="border-r border-border p-3 align-top">
                              {row.type_method_check || ""} <br /> {row.extent || ""}
                            </td>
                            <td className="border-r border-border p-3 align-top">
                              {row.acceptance_criteria || ""} <br /> {row.reference_documents || ""}
                            </td>
                            <td className="border-r border-border p-3 align-top">{row.verifying_document || "-"}</td>
                            <td className="border-r border-border p-3 align-top text-center">{row.shreno || "-"}</td>
                            <td className="border-r border-border p-3 align-top text-center">{row.client_tpia || "-"}</td>
                            {selectedRecord.dynamic_columns?.map((col, idx) => {
                              const dynVal = row.dynamic_values && row.dynamic_values[col.id] ? row.dynamic_values[col.id] : "-";
                              return (
                                <td key={idx} className="border-r border-border p-3 align-top text-center">
                                  {dynVal}
                                </td>
                              );
                            })}
                            <td className="p-3 align-top">{row.remark || "-"}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog 
        isOpen={confirmData.isOpen}
        onClose={() => setConfirmData(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmData.onConfirm}
        title={confirmData.title}
        description={confirmData.description}
        confirmText={confirmData.confirmText}
        variant={confirmData.variant}
        isLoading={confirmData.isLoading}
      />
    </div>
  )
}

// ─── Create / Edit View ──────────────────────────────────────────────────────
function CreateView({ onBack, onSuccess, editId = null }) {
  // Get today's date
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  // Header section - Dropdowns
  const [msn, setMsn] = useState("")
  const [msnOptions, setMsnOptions] = useState([])
  const [jobsLoading, setJobsLoading] = useState(true)

  const [client, setClient] = useState("")
  const [poNo, setPoNo] = useState("")
  const [poDate, setPoDate] = useState("")

  // User input fields
  const [formData, setFormData] = useState({
    documentNo: "",
    drgNo: "",
    customerDrgNo: "",
    equipmentDescription: "",
    tagNo: "",
    code: "",
    projectId: "",
  })

  // Submit states
  const [submitting, setSubmitting] = useState(false)

  // Fetch Jobs on Mount
  useEffect(() => {
    apiClient.get("/api/common/jobs?limit=200")
      .then((res) => setMsnOptions(res.data || []))
      .catch((err) => {
        console.error("Failed to fetch jobs:", err)
        toast.error("Failed to load MSNs")
      })
      .finally(() => setJobsLoading(false))
  }, [])

  // Dynamic Columns
  const [dynamicColumns, setDynamicColumns] = useState([])

  // Table rows
  const [tableRows, setTableRows] = useState([
    {
      id: 1,
      activity: "Pre-Inspection Meeting",
      typeMethodCheck: "----",
      extent: "",
      acceptanceCriteria: "----",
      referenceDocuments: "",
      verifyingDocument: "MOM",
      shreno: "H",
      clientTpia: "O+P",
      remark: "",
      isHeading: false,
      isRoot: true,
      headingText: "",
      parentHeaderId: null,
      dynamicValues: {}
    },
    {
      id: 2,
      activity: "QAP",
      typeMethodCheck: "--",
      extent: "",
      acceptanceCriteria: "Drawings, QCM Para. 10.2",
      referenceDocuments: "",
      verifyingDocument: "QAP",
      shreno: "H",
      clientTpia: "H",
      remark: "",
      isHeading: false,
      isRoot: true,
      headingText: "",
      parentHeaderId: null,
      dynamicValues: {}
    },
    {
      id: 3,
      activity: "Design Calculation",
      typeMethodCheck: "Design Documents",
      extent: "",
      acceptanceCriteria: "ASME Sec VIII Div. 1",
      referenceDocuments: "",
      verifyingDocument: "Design Calculation",
      shreno: "R",
      clientTpia: "H",
      remark: "",
      isHeading: false,
      isRoot: true,
      headingText: "",
      parentHeaderId: null,
      dynamicValues: {}
    },
    {
      id: 4,
      activity: "Drawing",
      typeMethodCheck: "Relevant Drawings",
      extent: "",
      acceptanceCriteria: "Design Calculation, QCM Para. 8.12",
      referenceDocuments: "",
      verifyingDocument: "Drawings",
      shreno: "R",
      clientTpia: "H",
      remark: "",
      isHeading: false,
      isRoot: true,
      headingText: "",
      parentHeaderId: null,
      dynamicValues: {}
    },
  ])

  // If editId is present and jobs loaded, fetch QAP data to compose edit form
  useEffect(() => {
    if (editId && msnOptions.length > 0) {
      apiClient.get(`/api/qap/${editId}`)
        .then(res => {
          if (res.success && res.data) {
            const data = res.data;
            setMsn(data.job_id || "")
            setClient(data.client || "")
            setPoNo(data.po_no || "")
            setPoDate(data.po_date || "")

            setFormData({
              documentNo: data.report_no || "",
              drgNo: data.shreno_drg_no || "",
              customerDrgNo: data.customer_drg_no || "",
              equipmentDescription: data.equipment_name || "",
              tagNo: data.tag_no || "",
              code: data.code || "",
              projectId: data.project_id || ""
            })

            // Dynamic columns map
            if (data.dynamic_columns && data.dynamic_columns.length > 0) {
              setDynamicColumns(data.dynamic_columns.map(c => ({
                ...c,
                isEditing: false
              })))
            } else {
              setDynamicColumns([])
            }

            // Sync Table Rows
            if (data.items && data.items.length > 0) {
              setTableRows(data.items.sort((a, b) => a.sort_order - b.sort_order).map((item, idx) => ({
                id: item.id || idx + 1,
                activity: item.activity || "",
                typeMethodCheck: item.type_method_check || "",
                extent: item.extent || "",
                acceptanceCriteria: item.acceptance_criteria || "",
                referenceDocuments: item.reference_documents || "",
                verifyingDocument: item.verifying_document || "",
                shreno: item.shreno || "",
                clientTpia: item.client_tpia || "",
                remark: item.remark || "",
                isHeading: item.is_heading || false,
                isRoot: item.is_root || false,
                headingText: item.heading_text || "",
                parentHeaderId: item.parent_header_id || null,
                dynamicValues: item.dynamic_values || {}
              })))
            }
          }
        })
        .catch(err => {
          console.error(err)
          toast.error("Failed to load existing record for editing")
        })
    }
  }, [editId, msnOptions])


  // Calculate serial numbers
  const getSerialNumbers = () => {
    let mainCounter = 0
    let subCounter = 0
    const result = []

    tableRows.forEach((row) => {
      if (row.activity === "Pre-Inspection Meeting") {
        result.push({
          ...row,
          serialNo: "---",
          subSerialNo: null,
        })
      } else if (row.isHeading || row.isRoot) {
        mainCounter++
        subCounter = 0
        result.push({
          ...row,
          serialNo: mainCounter.toString(),
          subSerialNo: null,
        })
      } else {
        if (mainCounter > 0) {
          subCounter++
          result.push({
            ...row,
            serialNo: mainCounter.toString(),
            subSerialNo: `${mainCounter}.${subCounter}`,
          })
        } else {
          result.push({
            ...row,
            serialNo: null,
            subSerialNo: null,
          })
        }
      }
    })

    return result
  }

  // Handle MSN change to populate equipment, tag and code and set document no
  const handleMsnChange = async (jobId) => {
    setMsn(jobId)

    // Skip auto-fetch overrides if we're dealing with an existing doc we're strictly editing
    if (!editId) {
      setFormData((prev) => ({ ...prev, documentNo: "Loading..." }))

      let nextReportNo = "Auto-generated on Submit"
      try {
        const res = await apiClient.get(`/api/qap/next-report-no/${jobId}`)
        if (res.success && res.data?.next_report_no) {
          nextReportNo = res.data.next_report_no
        }
      } catch (err) {
        console.error("Failed to fetch next report number:", err)
      }

      try {
        const jobRes = await apiClient.get(`/api/common/jobs/${jobId}`)
        if (jobRes.success && jobRes.data) {
          const job = jobRes.data
          setClient(job.customer?.customer_name || "")
          setPoNo(job.po?.po_number || "")
          // Handle ISO PO Date parsing for visual field
          let pd = ""
          if (job.po?.po_date) {
            pd = new Date(job.po.po_date).toLocaleDateString("en-GB")
          }
          setPoDate(pd)

          setFormData((prev) => ({
            ...prev,
            documentNo: nextReportNo,
            projectId: job.project_id || "",
            equipmentDescription: job.equipement_name || "",
            tagNo: job.tag_number || "",
            code: job.code || "",
          }))
        }
      } catch (error) {
        console.error("Failed to load job details:", error)
        setFormData((prev) => ({
          ...prev,
          documentNo: nextReportNo,
          equipmentDescription: "",
          tagNo: "",
          code: "",
          projectId: "",
        }))
        setClient("")
        setPoNo("")
        setPoDate("")
      }
    } else {
      // Allowed edgecase: User changes MSN while editing, we override client/po data to match new job
      try {
        const jobRes = await apiClient.get(`/api/common/jobs/${jobId}`)
        if (jobRes.success && jobRes.data) {
          const job = jobRes.data
          setClient(job.customer?.customer_name || "")
          setPoNo(job.po?.po_number || "")
          let pd = ""
          if (job.po?.po_date) {
            pd = new Date(job.po.po_date).toLocaleDateString("en-GB")
          }
          setPoDate(pd)
          setFormData((prev) => ({
            ...prev,
            projectId: job.project_id || "",
            equipmentDescription: job.equipement_name || "",
            tagNo: job.tag_number || "",
            code: job.code || "",
          }))
        }
      } catch (e) { console.error(e) }
    }
  }

  const headingOptions = [
    "Welding",
    "NDE & QC Procedures",
    "Material Identification",
    "Dish End Fabrication",
    "Main Shell and Skirt Fabrication",
    "Nozzle Fabrication",
    "Final Assembly",
    "Final Dimension and Visual",
    "PWHT AND NDE AFTER PWHT",
    "Pressure Test",
    "Surface Preparation and Painting",
    "Final Stamping & Documentation"
  ]

  const rowsWithSerialNumbers = useMemo(() => getSerialNumbers(), [tableRows])

  // Handle input field changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Handle table row changes
  const handleRowChange = (id, field, value) => {
    setTableRows(
      tableRows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    )
  }

  const handleAddColumn = () => {
    const newColId = `col_${Date.now()}`
    const newCol = { id: newColId, name: `Column ${dynamicColumns.length + 1}`, isEditing: true }
    setDynamicColumns([...dynamicColumns, newCol])
  }

  const handleColumnNameChange = (id, newName) => {
    setDynamicColumns(dynamicColumns.map(col => col.id === id ? { ...col, name: newName } : col))
  }

  const toggleColumnEdit = (id) => {
    setDynamicColumns(dynamicColumns.map(col => col.id === id ? { ...col, isEditing: !col.isEditing } : col))
  }

  const removeColumn = (id) => {
    setDynamicColumns(dynamicColumns.filter(col => col.id !== id))
  }

  const handleDynamicColumnChange = (rowId, colId, value) => {
    setTableRows(tableRows.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          dynamicValues: {
            ...(row.dynamicValues || {}),
            [colId]: value
          }
        }
      }
      return row
    }))
  }

  // Add new heading at the end
  const addRow = () => {
    const newId = Math.max(...tableRows.map((row) => typeof row.id === 'number' ? row.id : 0), 0) + 1
    // Fallback if imported IDs were purely UUID string wrappers
    const numericId = Date.now() + newId
    setTableRows([
      ...tableRows,
      {
        id: numericId,
        activity: "",
        typeMethodCheck: "",
        extent: "",
        acceptanceCriteria: "",
        referenceDocuments: "",
        verifyingDocument: "",
        shreno: "H",
        clientTpia: "",
        remark: "",
        isHeading: true,
        isRoot: true,
        headingText: "",
        parentHeaderId: null,
        dynamicValues: {},
      },
    ])
  }

  // Add row after a specific heading
  const addRowAfterHeading = (headingId) => {
    const newId = Date.now() + Math.random()
    const headingIndex = tableRows.findIndex((row) => row.id === headingId)

    if (headingIndex !== -1) {
      const newRow = {
        id: newId,
        activity: "",
        typeMethodCheck: "",
        extent: "",
        acceptanceCriteria: "",
        referenceDocuments: "",
        verifyingDocument: "",
        shreno: "H",
        clientTpia: "",
        remark: "",
        isHeading: false,
        isRoot: false,
        headingText: "",
        parentHeaderId: headingId,
        dynamicValues: {},
      }

      // Find the last row that belongs to this heading (before next heading or end)
      let insertIndex = headingIndex + 1
      for (let i = headingIndex + 1; i < tableRows.length; i++) {
        if (tableRows[i].isHeading || tableRows[i].isRoot) {
          break
        }
        insertIndex = i + 1
      }

      const newRows = [...tableRows]
      newRows.splice(insertIndex, 0, newRow)
      setTableRows(newRows)
    }
  }

  // Toggle row to heading
  const toggleHeading = (id) => {
    setTableRows(
      tableRows.map((row) =>
        row.id === id
          ? {
            ...row,
            isHeading: !row.isHeading,
            isRoot: !row.isHeading,
            headingText: row.isHeading ? "" : row.headingText,
            parentHeaderId: null,
          }
          : row
      )
    )
  }

  // Remove row
  const removeRow = (id) => {
    if (tableRows.length > 1) {
      setTableRows(tableRows.filter((row) => row.id !== id))
    }
  }

  const handleSubmit = async () => {
    if (!msn) {
      toast.error("Please select an MSN / Job")
      return
    }

    const payload = {
      job_id: msn,
      // Find the matched job number to stringify for MSN field
      msn: msnOptions.find(o => o.id === msn)?.job_number || "",
      client,
      po_no: poNo,
      po_date: poDate,
      project_id: formData.projectId,
      equipment_name: formData.equipmentDescription,
      tag_no: formData.tagNo,
      code: formData.code,
      shreno_drg_no: formData.drgNo,
      customer_drg_no: formData.customerDrgNo,
      report_no: formData.documentNo !== "Loading..." && formData.documentNo !== "Auto-generated on Submit" ? formData.documentNo : undefined,
      dynamic_columns: dynamicColumns,
      items: rowsWithSerialNumbers.map(r => ({
        is_heading: typeof r.isHeading === 'boolean' ? r.isHeading : false,
        is_root: typeof r.isRoot === 'boolean' ? r.isRoot : false,
        heading_text: r.headingText,
        parent_header_id: r.parentHeaderId ? r.parentHeaderId.toString() : null,
        activity: r.activity,
        type_method_check: r.typeMethodCheck,
        extent: r.extent,
        acceptance_criteria: r.acceptanceCriteria,
        reference_documents: r.referenceDocuments,
        verifying_document: r.verifyingDocument,
        shreno: r.shreno,
        client_tpia: r.clientTpia,
        remark: r.remark,
        dynamic_values: r.dynamicValues || {}
      }))
    }

    try {
      setSubmitting(true)
      let res;
      if (editId) {
        res = await apiClient.put(`/api/qap/update/${editId}`, payload)
      } else {
        res = await apiClient.post("/api/qap/create", payload)
      }

      if (res.success) {
        toast.success(editId ? "Quality Assurance Plan updated successfully!" : "Quality Assurance Plan created successfully!")
        onSuccess()
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message || "Failed to save Quality Assurance Plan")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quality Assurance Plan</h1>
          <p className="text-muted-foreground">
            {editId ? "Update existing quality assurance plan information." : "Create and structure quality assurance plan information."}
          </p>
        </div>
        <Button variant="outline" onClick={onBack} className="h-9">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      </div>

      {/* First Section - Dropdowns */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="msn">MSN Number <span className="text-destructive">*</span></Label>
              <Select value={msn} onValueChange={handleMsnChange} disabled={jobsLoading}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={jobsLoading ? "Loading..." : "Select MSN"} />
                </SelectTrigger>
                <SelectContent>
                  {msnOptions.map((msnOption) => (
                    <SelectItem key={msnOption.id} value={msnOption.id}>
                      {msnOption.job_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">Client <span className="text-destructive">*</span></Label>
              <Input
                id="client"
                type="text"
                value={client}
                readOnly
                className="bg-muted"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentNo">Document No. <span className="text-destructive">*</span></Label>
              <Input
                id="documentNo"
                name="documentNo"
                type="text"
                value={formData.documentNo}
                readOnly
                className="bg-muted"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment">Equipment Name <span className="text-destructive">*</span></Label>
              <Input
                id="equipment"
                type="text"
                value={formData.equipmentDescription}
                readOnly
                className="bg-muted"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagNo">Tag No. <span className="text-destructive">*</span></Label>
              <Input
                id="tagNo"
                type="text"
                value={formData.tagNo}
                readOnly
                className="bg-muted"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">CODE <span className="text-destructive">*</span></Label>
              <Input
                id="code"
                type="text"
                value={formData.code}
                readOnly
                className="bg-muted"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="poNo">P.O. No. <span className="text-destructive">*</span></Label>
              <Input
                id="poNo"
                type="text"
                value={poNo}
                onChange={(e) => setPoNo(e.target.value)}
                placeholder="Enter P.O. No."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="poDate">P.O. Date <span className="text-destructive">*</span></Label>
              <Input
                id="poDate"
                type="text"
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
                placeholder="Enter P.O. Date"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Second Section - User Input Fields */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Document Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="drgNo">SHRENO DRG No. <span className="text-destructive">*</span></Label>
              <Input
                id="drgNo"
                name="drgNo"
                type="text"
                value={formData.drgNo}
                onChange={handleInputChange}
                placeholder="Enter SHRENO DRG No."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerDrgNo">Customer DRG No. <span className="text-destructive">*</span></Label>
              <Input
                id="customerDrgNo"
                name="customerDrgNo"
                type="text"
                value={formData.customerDrgNo}
                onChange={handleInputChange}
                placeholder="Enter Customer DRG No"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Third Section - Table */}
      <Card className="w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Quality Assurance Plan Details</CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex flex-col gap-4 w-full">
          <div className="rounded-md border overflow-y-auto max-h-[500px]">
            <Table className="min-w-[1800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="p-2 text-xs font-bold uppercase w-[80px]">
                    Sr. No.
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    Activity
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    Type / Method of Check /<br />Extent
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    Acceptance Criteria /<br />Reference Documents
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    Verifying Document
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    Shreno
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    <div className="flex items-center gap-2 justify-between">
                      <span>Client /<br />TPIA</span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleAddColumn}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableHead>
                  {dynamicColumns.map(col => (
                    <TableHead key={col.id} className="p-2 text-xs font-bold uppercase min-w-[120px]">
                      <div className="flex items-center justify-between">
                        {col.isEditing ? (
                          <Input
                            value={col.name}
                            onChange={(e) => handleColumnNameChange(col.id, e.target.value)}
                            onBlur={() => toggleColumnEdit(col.id)}
                            onKeyDown={(e) => e.key === 'Enter' && toggleColumnEdit(col.id)}
                            autoFocus
                            className="h-6 text-xs p-1"
                          />
                        ) : (
                          <span onDoubleClick={() => toggleColumnEdit(col.id)} className="cursor-pointer" title="Double click to edit">{col.name}</span>
                        )}
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={() => removeColumn(col.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    Remark
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase w-[120px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowsWithSerialNumbers.map((row) =>
                  row.isHeading ? (
                    <TableRow key={row.id} className="bg-muted/30">
                      <TableCell className="p-2 font-medium">
                        {row.serialNo}
                      </TableCell>
                      <TableCell colSpan={7 + dynamicColumns.length} className="p-2">
                        <Select
                          value={row.headingText}
                          onValueChange={(value) =>
                            handleRowChange(row.id, "headingText", value)
                          }
                        >
                          <SelectTrigger className="w-[300px] md:w-[400px] lg:w-[500px] font-semibold border-0 focus-visible:ring-0">
                            <div className="truncate text-left w-full">
                              <SelectValue placeholder="Select heading" />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {headingOptions.map((option, idx) => (
                              <SelectItem key={idx} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-2">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => addRowAfterHeading(row.id)}
                            className="h-8 w-8"
                            title="Add row after this heading"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeRow(row.id)}
                            disabled={tableRows.length === 1}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={row.id}>
                      <TableCell className="p-2 font-medium">
                        {row.subSerialNo || row.serialNo || "-"}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.activity}
                          onChange={(e) =>
                            handleRowChange(row.id, "activity", e.target.value)
                          }
                          placeholder="Activity"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.typeMethodCheck}
                          onChange={(e) =>
                            handleRowChange(row.id, "typeMethodCheck", e.target.value)
                          }
                          placeholder="Type / Method of Check"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.acceptanceCriteria}
                          onChange={(e) =>
                            handleRowChange(row.id, "acceptanceCriteria", e.target.value)
                          }
                          placeholder="Acceptance Criteria"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.verifyingDocument}
                          onChange={(e) =>
                            handleRowChange(row.id, "verifyingDocument", e.target.value)
                          }
                          placeholder="Verifying Document"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.shreno}
                          onChange={(e) =>
                            handleRowChange(row.id, "shreno", e.target.value)
                          }
                          placeholder="Shreno"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.clientTpia}
                          onChange={(e) =>
                            handleRowChange(row.id, "clientTpia", e.target.value)
                          }
                          placeholder="Client / TPIA"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      {dynamicColumns.map(col => (
                        <TableCell key={col.id}>
                          <Input
                            type="text"
                            value={row.dynamicValues?.[col.id] || ""}
                            onChange={(e) =>
                              handleDynamicColumnChange(row.id, col.id, e.target.value)
                            }
                            placeholder={col.name}
                            className="w-full text-xs border-0 focus-visible:ring-0"
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        <Input
                          type="text"
                          value={row.remark}
                          onChange={(e) =>
                            handleRowChange(row.id, "remark", e.target.value)
                          }
                          placeholder="Remark"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {/* <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => toggleHeading(row.id)}
                            className="h-8 w-8"
                            title="Convert to heading"
                          >
                            <Type className="h-4 w-4" />
                          </Button> */}
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeRow(row.id)}
                            disabled={tableRows.length === 1}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addRow}
            className="w-full sm:w-auto mt-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Heading
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end mt-4 mb-8">
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving..." : (editId ? "Update" : "Submit")}
        </Button>
      </div>
    </>
  )
}

// ─── Main Controller ─────────────────────────────────────────────────────────
function QualityAssurancePlan() {
  const [view, setView] = useState("list") // "list" | "create" | "edit"
  const [editId, setEditId] = useState(null)

  const handleCreateClick = () => {
    setEditId(null)
    setView("create")
  }

  const handleEditClick = (id) => {
    setEditId(id)
    setView("edit")
  }

  const handleBackToList = () => {
    setEditId(null)
    setView("list")
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
      <main className="flex-1 overflow-auto p-6 flex flex-col">
        <div className="flex-1 flex flex-col w-full">
          {view === "list" && (
            <ListView
              onCreateClick={handleCreateClick}
              onEditClick={handleEditClick}
            />
          )}
          {(view === "create" || view === "edit") && (
            <CreateView
              onBack={handleBackToList}
              onSuccess={handleBackToList}
              editId={editId}
            />
          )}
        </div>
      </main>
    </>
  )
}

export default QualityAssurancePlan
