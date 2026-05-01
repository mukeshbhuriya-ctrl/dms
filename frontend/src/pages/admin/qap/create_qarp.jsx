import { useState, useMemo, useEffect, useCallback, Fragment } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"
import { toast } from "react-toastify"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Plus, Trash2, Type, ArrowLeft, Eye, Edit, Download } from "lucide-react"
import ProDataTable from "@/components/shared/ProDataTable"

const toUrlKey = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

// ─── List View ───────────────────────────────────────────────────────────────
function ListView({ onCreateClick, onEditClick, onViewClick }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  // Cascading Filters State
  const [activeFilters, setActiveFilters] = useState({ records: [] });
  const [columnFilters, setColumnFilters] = useState({});

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
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewClick(row)}
            title="View">
            <Eye className="h-4 w-4 mr-2" /> View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditClick(row)}
            title="Edit">
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={() => handleDownloadPdf(row.id)}
            title="Download PDF">
            <Download className="h-4 w-4 mr-2" /> Download
          </Button>
        </div>
      ),
    },
  ], [onEditClick, onViewClick, activeClientOptions, activePoOptions, activeMsnOptions])

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
    </div>
  )
}

// ─── Create / Edit / View View ──────────────────────────────────────────────
function FormView({ onBack, onSuccess, editId = null, isView = false }) {
  const location = useLocation()
  const [recordId, setRecordId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // Header section
  const [msn, setMsn] = useState("")
  const [msnOptions, setMsnOptions] = useState([])
  const [jobsLoading, setJobsLoading] = useState(true)

  const [client, setClient] = useState("")
  const [poNo, setPoNo] = useState("")
  const [poDate, setPoDate] = useState("")

  const [formData, setFormData] = useState({
    documentNo: "",
    drgNo: "",
    customerDrgNo: "",
    equipmentDescription: "",
    tagNo: "",
    code: "",
    projectId: "",
  })

  const [submitting, setSubmitting] = useState(false)
  const [dynamicColumns, setDynamicColumns] = useState([])

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

  useEffect(() => {
    apiClient.get("/api/common/jobs?limit=200")
      .then((res) => setMsnOptions(res.data || []))
      .catch((err) => console.error("Failed to fetch jobs:", err))
      .finally(() => setJobsLoading(false))
  }, [])

  const applyDataToForm = useCallback((data) => {
    setRecordId(data.id)
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

    if (data.dynamic_columns) {
      setDynamicColumns(data.dynamic_columns.map(c => ({ ...c, isEditing: false })))
    }

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
  }, [])

  useEffect(() => {
    if (editId && msnOptions.length > 0) {
      const fetchRecord = async () => {
        setIsLoading(true)
        try {
          const reportState = location.state?.report
          let finalId = reportState?.id || editId

          if (!reportState?.id) {
            const decoded = decodeURIComponent(editId)
            const response = await apiClient.get("/api/qap/list", { search: decoded, limit: 10 })
            const matched = response?.data?.find(p => toUrlKey(p.report_no) === editId || p.report_no === decoded)
            if (matched) finalId = matched.id
          }

          const res = await apiClient.get(`/api/qap/${finalId}`)
          if (res.success && res.data) applyDataToForm(res.data)
          else toast.error("Report not found")
        } catch (err) {
          toast.error("Error loading record")
        } finally {
          setIsLoading(false)
        }
      }
      fetchRecord()
    }
  }, [editId, msnOptions, applyDataToForm, location.state])

  const handleMsnChange = async (jobId) => {
    setMsn(jobId)
    if (editId) return
    setFormData((prev) => ({ ...prev, documentNo: "Loading..." }))

    try {
      const res = await apiClient.get(`/api/qap/next-report-no/${jobId}`)
      const nextReportNo = res.success && res.data?.next_report_no ? res.data.next_report_no : "Auto-generated on Submit"
      
      const jobRes = await apiClient.get(`/api/common/jobs/${jobId}`)
      if (jobRes.success && jobRes.data) {
        const job = jobRes.data
        setClient(job.customer?.customer_name || "")
        setPoNo(job.po?.po_number || "")
        let pd = job.po?.po_date ? new Date(job.po.po_date).toLocaleDateString("en-GB") : ""
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
      setFormData((prev) => ({ ...prev, documentNo: "Auto-generated on Submit" }))
    }
  }

  const rowsWithSerialNumbers = useMemo(() => {
    let mainCounter = 0
    let subCounter = 0
    const result = []

    tableRows.forEach((row) => {
      if (row.activity === "Pre-Inspection Meeting") {
        result.push({ ...row, serialNo: "---", subSerialNo: null })
      } else if (row.isHeading || row.isRoot) {
        mainCounter++
        subCounter = 0
        result.push({ ...row, serialNo: mainCounter.toString(), subSerialNo: null })
      } else {
        if (mainCounter > 0) {
          subCounter++
          result.push({ ...row, serialNo: mainCounter.toString(), subSerialNo: `${mainCounter}.${subCounter}` })
        } else {
          result.push({ ...row, serialNo: null, subSerialNo: null })
        }
      }
    })
    return result
  }, [tableRows])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleRowChange = (id, field, value) => {
    setTableRows(prev => prev.map((row) => row.id === id ? { ...row, [field]: value } : row))
  }

  const handleAddColumn = () => {
    const newColId = `col_${Date.now()}`
    setDynamicColumns([...dynamicColumns, { id: newColId, name: `Column ${dynamicColumns.length + 1}`, isEditing: true }])
  }

  const handleColumnNameChange = (id, newName) => {
    setDynamicColumns(prev => prev.map(col => col.id === id ? { ...col, name: newName } : col))
  }

  const toggleColumnEdit = (id) => {
    setDynamicColumns(prev => prev.map(col => col.id === id ? { ...col, isEditing: !col.isEditing } : col))
  }

  const removeColumn = (id) => setDynamicColumns(prev => prev.filter(col => col.id !== id))

  const handleDynamicColumnChange = (rowId, colId, value) => {
    setTableRows(prev => prev.map(row => row.id === rowId ? { ...row, dynamicValues: { ...(row.dynamicValues || {}), [colId]: value } } : row))
  }

  const addRow = () => {
    const newId = Date.now()
    setTableRows([...tableRows, { id: newId, activity: "", typeMethodCheck: "", extent: "", acceptanceCriteria: "", referenceDocuments: "", verifyingDocument: "", shreno: "H", clientTpia: "", remark: "", isHeading: true, isRoot: true, headingText: "", parentHeaderId: null, dynamicValues: {} }])
  }

  const addRowAfterHeading = (headingId) => {
    const newId = Date.now() + Math.random()
    const headingIndex = tableRows.findIndex((row) => row.id === headingId)
    if (headingIndex !== -1) {
      const newRow = { id: newId, activity: "", typeMethodCheck: "", extent: "", acceptanceCriteria: "", referenceDocuments: "", verifyingDocument: "", shreno: "H", clientTpia: "", remark: "", isHeading: false, isRoot: false, headingText: "", parentHeaderId: headingId, dynamicValues: {} }
      let insertIndex = headingIndex + 1
      for (let i = headingIndex + 1; i < tableRows.length; i++) {
        if (tableRows[i].isHeading || tableRows[i].isRoot) break
        insertIndex = i + 1
      }
      const newRows = [...tableRows]
      newRows.splice(insertIndex, 0, newRow)
      setTableRows(newRows)
    }
  }

  const toggleHeading = (id) => {
    setTableRows(prev => prev.map((row) => row.id === id ? { ...row, isHeading: !row.isHeading, isRoot: !row.isHeading, headingText: row.isHeading ? "" : row.headingText, parentHeaderId: null } : row))
  }

  const removeRow = (id) => tableRows.length > 1 && setTableRows(prev => prev.filter((row) => row.id !== id))

  const handleSubmit = async () => {
    if (!msn) { toast.error("Please select an MSN / Job"); return; }
    const payload = {
      job_id: msn,
      msn: msnOptions.find(o => o.id === msn)?.job_number || "",
      client, po_no: poNo, po_date: poDate, project_id: formData.projectId,
      equipment_name: formData.equipmentDescription, tag_no: formData.tagNo, code: formData.code,
      shreno_drg_no: formData.drgNo, customer_drg_no: formData.customerDrgNo,
      report_no: (formData.documentNo !== "Loading..." && formData.documentNo !== "Auto-generated on Submit") ? formData.documentNo : undefined,
      dynamic_columns: dynamicColumns,
      items: rowsWithSerialNumbers.map(r => ({
        is_heading: typeof r.isHeading === 'boolean' ? r.isHeading : false,
        is_root: typeof r.isRoot === 'boolean' ? r.isRoot : false,
        heading_text: r.headingText, parent_header_id: r.parentHeaderId ? r.parentHeaderId.toString() : null,
        activity: r.activity, type_method_check: r.typeMethodCheck, extent: r.extent, acceptance_criteria: r.acceptanceCriteria,
        reference_documents: r.referenceDocuments, verifying_document: r.verifyingDocument, shreno: r.shreno,
        client_tpia: r.clientTpia, remark: r.remark, dynamic_values: r.dynamicValues || {}
      }))
    }

    try {
      setSubmitting(true)
      let res = (editId && recordId) ? await apiClient.put(`/api/qap/update/${recordId}`, payload) : await apiClient.post("/api/qap/create", payload)
      if (res.success) { toast.success(editId ? "Plan updated!" : "Plan created!"); onSuccess(); }
    } catch (err) { toast.error(err.message || "Failed to save Plan") }
    finally { setSubmitting(false) }
  }

  const headingOptions = [
    "Welding", "NDE & QC Procedures", "Material Identification", "Dish End Fabrication",
    "Main Shell and Skirt Fabrication", "Nozzle Fabrication", "Final Assembly",
    "Final Dimension and Visual", "PWHT AND NDE AFTER PWHT", "Pressure Test",
    "Surface Preparation and Painting", "Final Stamping & Documentation"
  ]

  if (isLoading) return <div className="p-8 text-center">Loading...</div>

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{isView ? "View" : editId ? "Edit" : "Create"} Quality Assurance Plan</h1>
          <p className="text-muted-foreground">{isView ? "Review plan details." : editId ? "Update plan details." : "Create and structure plan details."}</p>
        </div>
        <Button variant="outline" onClick={onBack} className="h-9"><ArrowLeft className="h-4 w-4 mr-2" /> Back to List</Button>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="msn">MSN Number</Label>
              <Select value={msn} onValueChange={handleMsnChange} disabled={jobsLoading || isView}>
                <SelectTrigger className="w-full"><SelectValue placeholder={jobsLoading ? "Loading..." : "Select MSN"} /></SelectTrigger>
                <SelectContent>{msnOptions.map((opt) => (<SelectItem key={opt.id} value={opt.id}>{opt.job_number}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label htmlFor="client">Client</Label><Input id="client" type="text" value={client} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label htmlFor="documentNo">Document No.</Label><Input id="documentNo" type="text" value={formData.documentNo} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label htmlFor="equipment">Equipment Name</Label><Input id="equipment" type="text" value={formData.equipmentDescription} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label htmlFor="tagNo">Tag No.</Label><Input id="tagNo" type="text" value={formData.tagNo} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label htmlFor="code">CODE</Label><Input id="code" type="text" value={formData.code} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label htmlFor="poNo">P.O. No.</Label><Input id="poNo" type="text" value={poNo} onChange={(e) => setPoNo(e.target.value)} readOnly={isView} className={isView ? "bg-muted" : ""} /></div>
            <div className="space-y-2"><Label htmlFor="poDate">P.O. Date</Label><Input id="poDate" type="text" value={poDate} onChange={(e) => setPoDate(e.target.value)} readOnly={isView} className={isView ? "bg-muted" : ""} /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader><CardTitle>Document Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2"><Label htmlFor="drgNo">SHRENO DRG No.</Label><Input id="drgNo" name="drgNo" type="text" value={formData.drgNo} onChange={handleInputChange} readOnly={isView} className={isView ? "bg-muted" : ""} /></div>
            <div className="space-y-2"><Label htmlFor="customerDrgNo">Customer DRG No.</Label><Input id="customerDrgNo" name="customerDrgNo" type="text" value={formData.customerDrgNo} onChange={handleInputChange} readOnly={isView} className={isView ? "bg-muted" : ""} /></div>
            <div className="space-y-2"><Label htmlFor="projectId">Project ID</Label><Input id="projectId" name="projectId" type="text" value={formData.projectId} onChange={handleInputChange} readOnly={isView} className={isView ? "bg-muted" : ""} /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full overflow-hidden">
        <CardHeader><CardTitle>Quality Assurance Plan Details</CardTitle></CardHeader>
        <CardContent className="p-6 flex flex-col gap-4 w-full">
          <div className="rounded-md border overflow-y-auto max-h-[500px]">
            <Table className="min-w-[1800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Sr. No.</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Type / Method / Extent</TableHead>
                  <TableHead>Acceptance / Ref Docs</TableHead>
                  <TableHead>Verifying Doc</TableHead>
                  <TableHead>Shreno</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <span>Client/TPIA</span>
                      {!isView && <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddColumn}><Plus className="h-4 w-4" /></Button>}
                    </div>
                  </TableHead>
                  {dynamicColumns.map(col => (
                    <TableHead key={col.id} className="min-w-[120px]">
                      <div className="flex items-center justify-between">
                        {col.isEditing && !isView ? (
                          <Input value={col.name} onChange={(e) => handleColumnNameChange(col.id, e.target.value)} onBlur={() => toggleColumnEdit(col.id)} onKeyDown={(e) => e.key === 'Enter' && toggleColumnEdit(col.id)} autoFocus className="h-6 text-xs p-1" />
                        ) : (
                          <span onDoubleClick={() => !isView && toggleColumnEdit(col.id)} className="cursor-pointer">{col.name}</span>
                        )}
                        {!isView && <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeColumn(col.id)}><Trash2 className="h-3 w-3" /></Button>}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead>Remark</TableHead>
                  {!isView && <TableHead className="w-[120px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowsWithSerialNumbers.map((row) =>
                  row.isHeading ? (
                    <TableRow key={row.id} className="bg-muted/30">
                      <TableCell className="font-bold">{row.serialNo}</TableCell>
                      <TableCell colSpan={6 + dynamicColumns.length}>
                        {isView ? (
                          <span className="font-bold">{row.headingText}</span>
                        ) : (
                          <Select value={row.headingText} onValueChange={(v) => handleRowChange(row.id, "headingText", v)}>
                            <SelectTrigger className="w-[400px] font-bold border-0 focus-visible:ring-0"><SelectValue placeholder="Select heading" /></SelectTrigger>
                            <SelectContent>{headingOptions.map((opt, idx) => (<SelectItem key={idx} value={opt}>{opt}</SelectItem>))}</SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell></TableCell>
                      {!isView && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="icon" onClick={() => addRowAfterHeading(row.id)} className="h-8 w-8"><Plus className="h-4 w-4" /></Button>
                            <Button type="button" variant="outline" size="icon" onClick={() => removeRow(row.id)} disabled={tableRows.length === 1} className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ) : (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs">{row.subSerialNo || row.serialNo || "-"}</TableCell>
                      <TableCell><Input type="text" value={row.activity} onChange={(e) => handleRowChange(row.id, "activity", e.target.value)} readOnly={isView} className="text-xs border-0" /></TableCell>
                      <TableCell><Input type="text" value={row.typeMethodCheck} onChange={(e) => handleRowChange(row.id, "typeMethodCheck", e.target.value)} readOnly={isView} className="text-xs border-0" /></TableCell>
                      <TableCell><Input type="text" value={row.acceptanceCriteria} onChange={(e) => handleRowChange(row.id, "acceptanceCriteria", e.target.value)} readOnly={isView} className="text-xs border-0" /></TableCell>
                      <TableCell><Input type="text" value={row.verifyingDocument} onChange={(e) => handleRowChange(row.id, "verifyingDocument", e.target.value)} readOnly={isView} className="text-xs border-0" /></TableCell>
                      <TableCell><Input type="text" value={row.shreno} onChange={(e) => handleRowChange(row.id, "shreno", e.target.value)} readOnly={isView} className="text-xs border-0" /></TableCell>
                      <TableCell><Input type="text" value={row.clientTpia} onChange={(e) => handleRowChange(row.id, "clientTpia", e.target.value)} readOnly={isView} className="text-xs border-0" /></TableCell>
                      {dynamicColumns.map(col => (
                        <TableCell key={col.id}>
                          <Input type="text" value={row.dynamicValues?.[col.id] || ""} onChange={(e) => handleDynamicColumnChange(row.id, col.id, e.target.value)} readOnly={isView} className="text-xs border-0" />
                        </TableCell>
                      ))}
                      <TableCell><Input type="text" value={row.remark} onChange={(e) => handleRowChange(row.id, "remark", e.target.value)} readOnly={isView} className="text-xs border-0" /></TableCell>
                      {!isView && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="icon" onClick={() => toggleHeading(row.id)} className="h-8 w-8"><Type className="h-4 w-4" /></Button>
                            <Button type="button" variant="outline" size="icon" onClick={() => removeRow(row.id)} disabled={tableRows.length === 1} className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
          {!isView && <Button type="button" variant="outline" onClick={addRow} className="mt-2"><Plus className="h-4 w-4 mr-2" />Add Heading</Button>}
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end mt-4 mb-8">
        <Button variant="outline" onClick={onBack}>{isView ? "Close" : "Cancel"}</Button>
        {!isView && <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : (editId ? "Update" : "Submit")}</Button>}
      </div>
    </>
  )
}

// ─── Main Controller ─────────────────────────────────────────────────────────
export default function QualityAssurancePlan() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: routeId } = useParams()
  
  const mode = useMemo(() => {
    if (location.pathname.includes("/create")) return "create"
    if (location.pathname.includes("/edit")) return "edit"
    if (location.pathname.includes("/view")) return "view"
    return "list"
  }, [location.pathname])

  const handleSuccess = () => navigate("/qap/list")

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
      <main className="flex-1 overflow-auto p-6 flex flex-col">
        <div className="flex-1 flex flex-col w-full">
          {mode === "list" ? (
            <ListView
              onCreateClick={() => navigate("/qap/create")}
              onEditClick={(row) => navigate(`/qap/edit/${toUrlKey(row.report_no)}`, { state: { report: { id: row.id, label: row.report_no } } })}
              onViewClick={(row) => navigate(`/qap/view/${toUrlKey(row.report_no)}`, { state: { report: { id: row.id, label: row.report_no } } })}
            />
          ) : (
            <FormView
              onBack={() => navigate("/qap/list")}
              onSuccess={handleSuccess}
              editId={routeId}
              isView={mode === "view"}
            />
          )}
        </div>
      </main>
    </>
  )
}
