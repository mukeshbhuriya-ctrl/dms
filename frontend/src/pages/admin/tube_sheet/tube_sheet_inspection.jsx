import { PageContainer } from "@/components/layout/PageContainer";
import { useState, useEffect, useCallback, useMemo } from "react"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"

import { SearchableSelect } from "@/components/shared/SearchableSelect"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { Plus, Trash2, ArrowLeft, FileText, Eye, Edit, CheckCircle, XCircle, Download, Archive } from "lucide-react"
import { DataTable } from "@/components/shared/DataTable"
import ProDataTable from "@/components/shared/ProDataTable"
import { toast } from 'react-toastify'
import { useAuth } from "@/context/AuthContext"
import { Switch } from "@/components/ui/switch"
import ConfirmDialog from "@/components/shared/ConfirmDialog"

// ─── List View ───────────────────────────────────────────────────────────────
function ListView({ onCreateClick, onEditClick, onViewClick }) {
  const [error, setError] = useState("")

  const { user, roles } = useAuth()
  const isAdmin = roles?.includes("ADMIN");
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Cascading Filters State
  const [activeFilters, setActiveFilters] = useState({ records: [] });
  const [columnFilters, setColumnFilters] = useState({ is_active: ['true'] });

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmData, setConfirmData] = useState({ title: "", description: "", variant: "danger", onConfirm: null });

  const fetchActiveFilters = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/tube-sheet-inspection/get-filters");
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
  }, [columnFilters.msn, columnFilters.po_no, columnFilters.client, activeFilters.records]);

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

  const handleViewClick = async (id) => {
    if(onViewClick) onViewClick(id);
  }

  const handleDownload = async (id, reportNo) => {
    try {
      const filename = `TUBE_SHEET_${reportNo.replace(/\//g, '_')}.pdf`;
      await exportApi.download(
        `/api/tube-sheet-inspection/${id}/download`,
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
          const res = await apiClient.patch(`/api/tube-sheet-inspection/toggle-status/${row.id}`)
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
          const res = await apiClient.delete(`/api/tube-sheet-inspection/archive/${row.id}`)
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
        const isQE = roles?.includes("QE") || roles?.includes("QC_ENGINEER") || roles?.includes("QC")

        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewClick(row.id)}
              className="cursor-pointer"
              title="View">
              <Eye className="h-4 w-4 mr-2" /> View
            </Button>
            {isAdmin || isQE ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditClick(row.id)}
                className="cursor-pointer"
                title="Edit">
                <Edit className="h-4 w-4 mr-2" /> Edit
              </Button>
            ) : null}
            
            <Button
              variant="outline"
              size="sm"
              className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 cursor-pointer"
              onClick={() => handleDownload(row.id, row.report_no)}
              title="Download PDF">
              <Download className="h-4 w-4 mr-2" /> Download
            </Button>
            
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/20 hover:bg-destructive/5 cursor-pointer"
                onClick={() => handleDelete(row)}
                title="Archive Report"
              >
                <Archive className="h-4 w-4" /> Archive
              </Button>
            )}
          </div>
        )
      },
    },
  ], [activeClientOptions, activePoOptions, activeMsnOptions, isAdmin, roles, user, activeIsActiveOptions, onEditClick])

  const fetchData = useCallback(async (params) => {
    const queryParams = { ...params };
    if (queryParams.columnFilters) {
      queryParams.columnFilters = JSON.stringify(queryParams.columnFilters);
    }
    const res = await apiClient.get(`/api/tube-sheet-inspection/list`, queryParams)
    return { data: res.data, meta: res.meta }
  }, [])

  const handleExport = async () => {
    try {
      await exportApi.exportTubeSheet();
    } catch (error) {
      console.error("Tube Sheet Export failed:", error);
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
        onAdd={onCreateClick}
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


    </div>
  )
}

// ─── Create / Edit / View ──────────────────────────────────────────────────────
function CreateView({ onBack, onSuccess, editId = null, isViewMode = false }) {

  // First section - Dropdowns and User input fields
  const [formData, setFormData] = useState({
    msn: "",
    reportNo: "",
    client: "",
    poNo: "",
    equipment: "",
    code: "",
    tagNo: "",
    drgNo: "",
    inspAgency: "",
    inspectionDate: ""
  })

  const [actual_dimension_1, setActualDimension1] = useState("")
  const [actual_dimension_2, setActualDimension2] = useState("")

  const [masterInstruments, setMasterInstruments] = useState([])

  useEffect(() => {
    apiClient.get("/api/masters/instruments?type=CALIBRATION_INSTRUMENT")
      .then((res) => {
        let data = Array.isArray(res) ? res : (res.data || []);
        const mapped = data.map(item => ({
          id: item.id,
          name: `${item.equipment_desc || ''}${item.range ? ` / ${item.range}` : ''}`.trim(),
          id_no: item.serial_no || '',
          due_date: item.due_date ? new Date(item.due_date).toLocaleDateString('en-GB').replace(/\//g, '-') : ''
        }));
        setMasterInstruments(mapped)
      })
      .catch((err) => console.error("Failed to fetch instruments:", err))
  }, [])

  const { roles } = useAuth()
  const userRole = (roles?.includes("QC_ENGINEER") || roles?.includes("ADMIN") || roles?.includes("QC")) ? "QC" : (roles?.includes("PRODUCTION_ENGINEER") ? "PROD" : "")

  // Description options for the table
  const defaultItems = [
    { srNo: 1, desc: "OUT SIDE DIA." },
    { srNo: 2, desc: "OVERALL THICKNESS" },
    { srNo: 3, desc: "BOLT HOLES DRILL HOLE NO. / DIA." },
    { srNo: 4, desc: "1ST STEP O.D. (tube side)" },
    { srNo: 5, desc: "1ST STEP HEIGHT (tube side)" },
    { srNo: 6, desc: "2ND STEP O.D. (tube side)" },
    { srNo: 7, desc: "2ND STEP HEIGHT (tube side)" },
    { srNo: 8, desc: "STEP O.D. (shell side)" },
    { srNo: 9, desc: "STEP DEPTH (shell side)" },
    { srNo: 10, desc: "STEP I.D. (shell side)" },
    { srNo: 11, desc: "O.T.L" },
    { srNo: 12, desc: "LIGAMENT" },
    { srNo: 13, desc: "NO. OF TUBE HOLE" },
    { srNo: 14, desc: "TUBE HOLE DIA." },
    { srNo: 15, desc: "TUBE HOLE EXPANSION GROOVE" },
    { srNo: 16, desc: "PITCH-TRIANGULAR" },
    { srNo: 17, desc: "TIE ROD" },
    { srNo: 18, desc: "DOWEL PIN" },
    { srNo: 19, desc: "VENT HOLE" },
    { srNo: 20, desc: "FRONT SIDE TUBE HOLE CHEM." },
    { srNo: 21, desc: "RESPECTIVE ORIENTATION" },
    { srNo: 22, desc: "VISUAL SURFACE FINISH" }
  ];

  // Main table rows
  const [tableRows, setTableRows] = useState(
    defaultItems.map((item) => ({
      id: item.srNo,
      srNo: item.srNo,
      description: item.desc,
      drgDim: "",
      actual1: "",
      actual2: "",
      remarks: "",
    }))
  )


  // Instrument Calibration Details table
  const [instrumentRows, setInstrumentRows] = useState([
    { id: 1, name: "", idNo: "", dueDate: "" },
  ])

  const [remarksRows, setRemarksRows] = useState([
    { id: 1, remark: "BOTH TUBESHEETS ARE CLEARED FOR FURTHER PROCESS." }
  ])

  // API state
  const [msnOptions, setMsnOptions] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    apiClient.get("/api/common/jobs")
      .then((res) => { if (res.success) setMsnOptions(res.data) })
      .catch((err) => console.error("Failed to fetch jobs:", err))
  }, [])

  useEffect(() => {
    // If we have an editId, fetch the existing report details
    if (editId && msnOptions.length > 0) {
      apiClient.get(`/api/tube-sheet-inspection/${editId}`)
        .then((res) => {
          if (res.success && res.data) {
            const data = res.data
            // Match MSN option by job_id
            setFormData({
              msn: data.job_id || "",
              reportNo: data.report_no || "",
              equipment: data.equipment_name || "",
              code: data.code || "",
              client: data.client || "",
              poNo: data.po_no || "",
              tagNo: data.tag_no || "",
              drgNo: data.drg_no || "",
              inspAgency: data.insp_agency || ""
            })

            setActualDimension1(data.actual_dimension_1_header || "text")
            setActualDimension2(data.actual_dimension_2_header || "text")

            if (data.items && data.items.length > 0) {
              setTableRows(data.items.map((item, i) => ({
                id: i + 1,
                srNo: item.sr_no || (i + 1),
                description: item.description || "",
                drgDim: item.drg_dim || "",
                actual1: item.actual_dimension_1 || "",
                actual2: item.actual_dimension_2 || "",
                remarks: item.remarks || ""
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

            if (data.remarks && data.remarks.length > 0) {
              setRemarksRows(data.remarks.map((rmk) => ({
                id: rmk.sr_no,
                remark: rmk.text || ""
              })))
            }
          }
        })
        .catch((err) => console.error("Failed to fetch report details:", err))
    }
  }, [editId, msnOptions])

  const handleMsnChange = async (value) => {
    const selectedMsn = msnOptions.find((option) => option.id === value)

    let generatedReportNo = formData.reportNo;
    if (!editId) {
      if (selectedMsn && selectedMsn.job_number) {
        generatedReportNo = `SHR/TSI/${selectedMsn.job_number}/01`;
      } else {
        generatedReportNo = "Auto-generated on Submit";
      }
    }

    setFormData(prev => ({
      ...prev,
      msn: value,
      equipment: selectedMsn?.equipement_name || "",
      client: selectedMsn?.customer?.customer_name || "",
      poNo: selectedMsn?.po?.po_number || "",
      reportNo: generatedReportNo
      // code is explicitly not populated here as per QC instructions
    }))
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

  const addTableRow = (index) => {
    const newRow = {
      id: Date.now(),
      srNo: "",
      description: "",
      drgDim: "",
      actual1: "",
      actual2: "",
      remarks: "",
    }
    const newRows = [...tableRows]
    newRows.splice(index + 1, 0, newRow)

    // Re-calculate Sr No seamlessly
    const reindexedRows = newRows.map((r, i) => ({ ...r, srNo: i + 1 }))
    setTableRows(reindexedRows)
  }
  const removeTableRow = (id) => {
    if (tableRows.length > 1) {
      const filtered = tableRows.filter((row) => row.id !== id)
      const reindexed = filtered.map((r, i) => ({ ...r, srNo: i + 1 }))
      setTableRows(reindexed)
    }
  }

  const handleInstrumentRowChange = (id, field, value) => {
    setInstrumentRows(
      instrumentRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    )
  }

  const addInstrumentRow = () => {
    setInstrumentRows([
      ...instrumentRows,
      { id: Date.now(), instrument_id: "", name: "", idNo: "", dueDate: "" },
    ])
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

  const removeInstrumentRow = (id) => {
    if (instrumentRows.length > 1) {
      setInstrumentRows(instrumentRows.filter((row) => row.id !== id))
    }
  }

  const handleRemarkChange = (id, value) => {
    setRemarksRows(remarksRows.map((row) => (row.id === id ? { ...row, remark: value } : row)))
  }

  const addRemarkRow = () => {
    setRemarksRows([...remarksRows, { id: Date.now(), remark: "" }])
  }

  const removeRemarkRow = (id) => {
    setRemarksRows(remarksRows.filter((row) => row.id !== id))
  }



  const handleSubmit = async () => {
    if (!formData.msn) {
      toast.error("Please select an MSN")
      return
    }

    const payload = {
      job_id: formData.msn,
      msn: msnOptions.find(opt => opt.id === formData.msn)?.job_number || "",
      client: formData.client,
      po_no: formData.poNo,
      equipment_name: formData.equipment,
      tag_no: formData.tagNo,
      code: formData.code,
      drg_no: formData.drgNo,
      insp_agency: formData.inspAgency,
      actual_dimension_1_header: actual_dimension_1,
      actual_dimension_2_header: actual_dimension_2,
      items: tableRows.map(r => ({
        sr_no: r.srNo,
        description: r.description,
        drg_dim: r.drgDim,
        actual_dimension_1: r.actual1,
        actual_dimension_2: r.actual2,
        remarks: r.remarks,
      })),
      instruments: instrumentRows.filter(r => r.name || r.idNo || r.dueDate).map(r => ({
        instrument_id: r.instrument_id,
        name: r.name,
        id_no: r.idNo,
        due_date: r.dueDate
      })),
      remarks: remarksRows.filter(r => r.remark.trim() !== "").map((r, i) => ({
        sr_no: i + 1,
        text: r.remark
      }))
    }

    try {
      setSubmitting(true)
      let res;
      if (editId) {
        res = await apiClient.put(`/api/tube-sheet-inspection/update/${editId}`, payload)
      } else {
        res = await apiClient.post("/api/tube-sheet-inspection/create", payload)
      }

      if (res.success) {
        toast.success(editId ? "Tube Sheet Inspection Report updated successfully!" : "Tube Sheet Inspection Report created successfully!")
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
              <Label htmlFor="msn">MSN / JOB NO.:</Label>
              <Select value={formData.msn} onValueChange={handleMsnChange} disabled={userRole === 'PROD' || isViewMode}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select MSN" />
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
              <Label htmlFor="reportNo">REPORT NO.:</Label>
              <Input id="reportNo" type="text" value={formData.reportNo} readOnly className="bg-muted text-xs font-semibold" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">CLIENT:</Label>
              <Input id="client" type="text" value={formData.client} readOnly className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="poNo">P.O. NO.:</Label>
              <Input id="poNo" type="text" value={formData.poNo} readOnly className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment">EQUIPMENT NO.:</Label>
              <Input id="equipment" type="text" value={formData.equipment} readOnly className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagNo">TAG NO.:</Label>
              <Input id="tagNo" name="tagNo" type="text" value={formData.tagNo} onChange={(e) => setFormData({ ...formData, tagNo: e.target.value })} readOnly={userRole === 'PROD' || isViewMode} className={userRole === 'PROD' || isViewMode ? "bg-muted text-xs" : "text-xs"} placeholder="Enter TAG NO." />
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
              <Label htmlFor="drgNo">DRG. NO.:</Label>
              <Input
                id="drgNo"
                name="drgNo"
                type="text"
                value={formData.drgNo}
                onChange={handleInputChange}
                readOnly={userRole === 'PROD' || isViewMode}
                className={userRole === 'PROD' || isViewMode ? "bg-muted text-xs" : "text-xs"}
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
                readOnly={userRole === 'PROD' || isViewMode}
                className={userRole === 'PROD' || isViewMode ? "bg-muted text-xs" : "text-xs"}
                placeholder="Enter INSP. AGENCY"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">CONSTRUCTION CODE:</Label>
              <Input
                id="code"
                name="code"
                type="text"
                value={formData.code}
                onChange={handleInputChange}
                readOnly={userRole === 'PROD' || isViewMode}
                className={userRole === 'PROD' || isViewMode ? "bg-muted text-xs" : "text-xs"}
                placeholder="Enter Construction Code"
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
                  <TableHead rowSpan={2} className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300 min-w-[60px] text-center align-middle">
                    SR NO.
                  </TableHead>
                  <TableHead rowSpan={2} className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300 align-middle text-center min-w-[350px]">
                    DESCRIPTION
                  </TableHead>
                  <TableHead rowSpan={2} className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300 align-middle text-center min-w-[200px]">
                    DRG. DIM
                  </TableHead>
                  <TableHead colSpan={2} className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300 text-center align-middle min-w-[300px]">
                    Actual Dimension
                  </TableHead>
                  <TableHead rowSpan={2} className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300 align-middle text-center min-w-[250px]">
                    REMARKS
                  </TableHead>
                  <TableHead rowSpan={2} className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300 align-middle text-center min-w-[120px]">
                    ACTIONS
                  </TableHead>
                </TableRow>
                <TableRow className="bg-blue-100">
                  <TableHead className="p-1 text-xs font-bold text-gray-500 border border-gray-300 text-center bg-blue-100 w-1/2 min-w-[150px]">
                    <Input
                      type="text"
                      value={actual_dimension_1}
                      onChange={(e) => setActualDimension1(e.target.value)}
                      readOnly={userRole === 'PROD' || isViewMode}
                      placeholder="Enter Column 1"
                      className="text-xs font-bold text-gray-500 text-center border border-input focus-visible:ring-1 focus-visible:ring-ring bg-white/50 hover:bg-white/80 h-8 px-2 w-full transition-colors"
                    />
                  </TableHead>
                  <TableHead className="p-1 text-xs font-bold text-gray-500 border border-gray-300 text-center bg-blue-100 w-1/2 min-w-[150px]">
                    <Input
                      type="text"
                      value={actual_dimension_2}
                      onChange={(e) => setActualDimension2(e.target.value)}
                      readOnly={userRole === 'PROD' || isViewMode}
                      placeholder="Enter Column 2"
                      className="text-xs font-bold text-gray-500 text-center border border-input focus-visible:ring-1 focus-visible:ring-ring bg-white/50 hover:bg-white/80 h-8 px-2 w-full transition-colors"
                    />
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
                        readOnly={userRole === 'PROD' || isViewMode}
                        placeholder="Description"
                        className={`w-full text-xs border-0 focus-visible:ring-0 ${userRole === 'PROD' || isViewMode ? 'bg-muted' : 'bg-transparent'} rounded-md`}
                      />
                    </TableCell>
                    <TableCell className="p-2 border border-gray-300">
                      <Input
                        type="text"
                        value={row.drgDim}
                        onChange={(e) => handleRowChange(row.id, "drgDim", e.target.value)}
                        readOnly={userRole === 'PROD' || isViewMode}
                        className={`w-full text-xs border-0 focus-visible:ring-0 ${userRole === 'PROD' || isViewMode ? 'bg-muted' : 'bg-transparent'} rounded-md`}
                      />
                    </TableCell>
                    <TableCell className="p-2 border border-gray-300">
                      <Input
                        type="text"
                        value={row.actual1}
                        onChange={(e) => handleRowChange(row.id, "actual1", e.target.value)}
                        readOnly={userRole === 'PROD' || isViewMode}
                        className={`w-full text-xs border-0 focus-visible:ring-0 ${userRole === 'PROD' || isViewMode ? 'bg-muted' : 'bg-transparent'} rounded-md`}
                      />
                    </TableCell>
                    <TableCell className="p-2 border border-gray-300">
                      <Input
                        type="text"
                        value={row.actual2}
                        onChange={(e) => handleRowChange(row.id, "actual2", e.target.value)}
                        readOnly={userRole === 'PROD' || isViewMode}
                        className={`w-full text-xs border-0 focus-visible:ring-0 ${userRole === 'PROD' || isViewMode ? 'bg-muted' : 'bg-transparent'} rounded-md`}
                      />
                    </TableCell>
                    <TableCell className="p-2 border border-gray-300">
                      <Input
                        type="text"
                        value={row.remarks}
                        onChange={(e) => handleRowChange(row.id, "remarks", e.target.value)}
                        readOnly={userRole === 'PROD' || isViewMode}
                        className={`w-full text-xs border-0 focus-visible:ring-0 ${userRole === 'PROD' || isViewMode ? 'bg-muted' : 'bg-transparent'} rounded-md`}
                      />
                    </TableCell>
                    <TableCell className="p-2 border border-gray-300">
                      <div className="flex items-center justify-center gap-2">
                        {!isViewMode && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 bg-white"
                              onClick={() => addTableRow(tableRows.findIndex(r => r.id === row.id))}
                              disabled={userRole === 'PROD'}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 bg-white"
                              onClick={() => removeTableRow(row.id)}
                              disabled={tableRows.length <= 1 || userRole === 'PROD'}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!isViewMode && (
            <Button type="button" variant="outline" onClick={() => addTableRow(tableRows.length - 1)} className="w-full sm:w-auto mt-2" disabled={userRole === 'PROD'}>
              <Plus className="h-4 w-4 mr-2" />
              Add Row
            </Button>
          )}
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
                          disabled={userRole === 'PROD' || isViewMode}
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
                        {!isViewMode && (
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
                        )}
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
          {!isViewMode && (
            <Button type="button" variant="outline" onClick={addInstrumentRow} className="w-full sm:w-auto mt-2 cursor-pointer" disabled={userRole === 'PROD'}>
              <Plus className="h-4 w-4 mr-2" />
              Add Row
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Remarks Section */}
      <Card className="mb-6 w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Remarks</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Label className="uppercase font-bold text-xs">REMARK:</Label>
            {remarksRows.map((row, index) => (
              <div key={row.id} className="flex gap-4 items-start">
                <span className="text-sm font-medium w-4 text-center mt-2">{index + 1}</span>
                <div className="flex-1">
                  <Textarea
                    value={row.remark}
                    onChange={(e) => handleRemarkChange(row.id, e.target.value)}
                    readOnly={userRole === 'PROD' || isViewMode}
                    className={`min-h-[50px] text-xs resize-none ${userRole === 'PROD' || isViewMode ? 'bg-muted' : ''}`}
                  />
                </div>
                {!isViewMode && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRemarkRow(row.id)}
                    disabled={userRole === 'PROD'}
                    className="shrink-0 text-destructive hover:text-destructive/90 hover:bg-destructive/10 mt-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {!isViewMode && (
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addRemarkRow}
                  disabled={userRole === 'PROD'}
                  className="w-auto cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Remark
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 mt-6">
        {!isViewMode && (
          <Button onClick={() => handleSubmit()} disabled={submitting || userRole === 'PROD'} className="cursor-pointer">
            {submitting ? "Saving..." : (editId ? "Update Report" : "Submit Report")}
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
function TubeSheetInspection() {
  const [view, setView] = useState("list") // "list" | "create" | "edit"
  const [editId, setEditId] = useState(null)
  const [isViewMode, setIsViewMode] = useState(false)

  const handleSuccess = () => {
    setView("list")
    setEditId(null)
  }

  const handleEdit = (id) => {
    setEditId(id)
    setView("edit")
    setIsViewMode(false)
  }

  const handleViewClick = (id) => {
    setEditId(id)
    setView("edit")
    setIsViewMode(true)
  }

  return (
    <>
      <PageContainer>
{view === "list" ? (
            <ListView
              onCreateClick={() => {
                setEditId(null)
                setView("create")
                setIsViewMode(false)
              }}
              onEditClick={handleEdit}
              onViewClick={handleViewClick}
            />
          ) : (
            <CreateView
              onBack={() => {
                setView("list")
                setEditId(null)
                setIsViewMode(false)
              }}
              onSuccess={handleSuccess}
              editId={editId}
              isViewMode={isViewMode}
            />
          )}
</PageContainer>
    </>
  )
}

export default TubeSheetInspection
