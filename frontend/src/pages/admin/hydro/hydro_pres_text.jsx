import { useState, useEffect, useCallback, Fragment, useMemo } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
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
import { Plus, Trash2, ArrowLeft, Eye, Edit, FileText, Download, Search } from "lucide-react"
import ProDataTable from "@/components/shared/ProDataTable"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"
import { toast } from "react-toastify"

const toUrlKey = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

function emptyRow(id) {
  return {
    id,
    particulars: "",
    mawp_int_ext: "",
    required_test_pressure: "",
    actual_test_pressure: "",
    holding_time: "",
    test_result: "",
    pg1_range: "",
    pg1_id_no: "",
    pg1_calib_date: "",
    pg1_due_date: "",
    pg2_range: "",
    pg2_id_no: "",
    pg2_calib_date: "",
    pg2_due_date: "",
  }
}

// ─── List View ───────────────────────────────────────────────────────────────
function ListView({ onCreateClick, onEditClick, onViewClick }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [columnFilters, setColumnFilters] = useState({})
  const [activeFilters, setActiveFilters] = useState({ records: [] });

  const fetchActiveFilters = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/hydro-test/active-filters");
      if (res.success) setActiveFilters(res.data);
    } catch (err) {
      console.error("Error fetching active filters:", err);
    }
  }, []);

  useEffect(() => {
    fetchActiveFilters();
  }, [fetchActiveFilters, refreshKey]);

  const activeClientOptions = useMemo(() => {
    let filtered = activeFilters.records || [];
    if (columnFilters.po_no) {
      const selected = Array.isArray(columnFilters.po_no) ? columnFilters.po_no : [columnFilters.po_no.toString()];
      filtered = filtered.filter(c => selected.includes(c.po?.toString()));
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
    const pos = [...new Set(filtered.map(c => c.po))].filter(Boolean).sort();
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
      filtered = filtered.filter(c => selected.includes(c.po?.toString()));
    }
    const msns = [...new Set(filtered.map(c => c.msn))].filter(Boolean).sort();
    return msns.map(m => ({ label: m, value: m }));
  }, [activeFilters.records, columnFilters.client, columnFilters.po_no]);

    const handleDownload = async (id, reportNo) => {
      try {
        const filename = `HYDRO_${reportNo || id}.pdf`;
        await exportApi.download(
          `/api/hydro-test/${id}/download`,
          filename,
          {},
          { contentType: 'application/pdf' }
        );
      } catch (err) {
        console.error(err)
        toast.error(err.message || "Failed to download PDF")
      }
    }

    const columns = [
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
              <Eye className="h-4 w-4" /> View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditClick(row)}
              title="Edit">
              <Edit className="h-4 w-4" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => handleDownload(row.id, row.report_no)}
              title="Download">
              <Download className="h-4 w-4" /> Download
            </Button>
          </div>
        ),
      },
    ]

  const fetchData = useCallback(async (params) => {
    const queryParams = { ...params };
    if (queryParams.columnFilters) {
        queryParams.columnFilters = JSON.stringify(queryParams.columnFilters);
    }
    const res = await apiClient.get(`/api/hydro-test/list`, queryParams)
    return { data: res.data, meta: res.meta }
  }, [])

  const handleExport = async () => {
    try {
      await exportApi.exportHydro();
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Hydro Export failed:", error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Hydrostatic Pressure Test Reports</h1>
          <p className="text-muted-foreground">View and manage all hydrostatic pressure test reports.</p>
        </div>
      </div>

      <ProDataTable 
        columns={columns} 
        fetchData={fetchData} 
        onExport={handleExport}
        columnFilters={columnFilters}
        onFilterChange={(newFilters) => setColumnFilters(prev => ({ ...prev, ...newFilters }))}
        refreshKey={refreshKey}
        onAdd={onCreateClick}
        onAddTooltip="Add New"
      />
    </div>
  )
}

// ─── Form View ─────────────────────────────────────────────────────────────
function FormView({ onBack, onSuccess, isEdit, editId, isView }) {
  const location = useLocation()
  const [recordId, setRecordId] = useState(null)
  const [jobs, setJobs] = useState([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [selectedJobId, setSelectedJobId] = useState("")
  const [autoFill, setAutoFill] = useState({
    reportNo: "",
    client: "",
    poNo: "",
    projectId: "",
    equipmentName: "",
    tagNo: "",
    code: "",
    msn: "",
  })
  const [formData, setFormData] = useState({
    shrenoDrgNo: "",
    customerDrgNo: "",
    constructionCode: "",
    chlorineContent: "",
    inspectionAgency: "",
    testPosition: "",
    procedureNo: "",
    testMedium: "WATER",
    metalTemp: "",
  })
  const [tableRows, setTableRows] = useState([emptyRow(1)])
  const [remarks, setRemarks] = useState([
    { id: 1, text: "NO PRESSURE DROP OR VISIBLE DEFORMATION OBSERVED DURING THE HOLDING TIME. NO LEAKAGE OBSERVED FROM ANY WELDED JOINTS.\nWITNESS FINAL EXTERNAL INSPECTION OF EQUIPMENT AT HYDROSTATIC PRESSURE DIVIDED BY 1.3 & CLOSED VISUAL INSPECTION CARRIED OUT - SATISFACTORY" }
  ])
  const [submitting, setSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    apiClient.get("/api/common/jobs?limit=200")
      .then((res) => setJobs(res.data || []))
      .catch(() => setJobs([]))
      .finally(() => setJobsLoading(false))
  }, [])

  const applyDataToForm = useCallback((data) => {
    setRecordId(data.id)
    setSelectedJobId(data.job_id)
    setAutoFill({
      reportNo: data.report_no || "",
      client: data.client || "",
      poNo: data.po_no || "",
      projectId: data.project_id || "",
      equipmentName: data.equipment_name || "",
      tagNo: data.tag_no || "",
      code: data.code || "",
      msn: data.msn || "",
    })
    setFormData({
      shrenoDrgNo: data.shreno_drg_no || "",
      customerDrgNo: data.customer_drg_no || "",
      constructionCode: data.construction_code || "",
      chlorineContent: data.chlorine_content || "",
      inspectionAgency: data.inspection_agency || "",
      testPosition: data.test_position || "",
      procedureNo: data.procedure_no || "",
      testMedium: data.test_medium || "WATER",
      metalTemp: data.metal_temp || "",
    })
    if (data.items && data.items.length > 0) {
      setTableRows(data.items.map((item, idx) => ({ id: item.id || idx + 1, ...item })))
    } else {
      setTableRows([emptyRow(1)])
    }
    if (data.remarks && data.remarks.length > 0) {
      setRemarks(data.remarks.map((r, idx) => ({ id: r.id || idx + 1, text: r.text || "" })))
    }
  }, [])

  useEffect(() => {
    if ((isEdit || isView) && editId) {
      setIsLoading(true)
      const fetchReport = async () => {
        try {
          const reportState = location.state?.report
          let finalId = reportState?.id
          
          if (!finalId) {
             const decoded = decodeURIComponent(editId)
             const response = await apiClient.get("/api/hydro-test/list", { search: decoded, limit: 10 })
             const matched = response?.data?.find(p => toUrlKey(p.report_no) === editId || p.report_no === decoded)
             if (matched) finalId = matched.id
          }

          if (finalId) {
            const res = await apiClient.get(`/api/hydro-test/${finalId}`)
            if (res.success && res.data) applyDataToForm(res.data)
            else toast.error("Report not found")
          } else {
            toast.error("Report not found")
          }
        } catch (err) {
          toast.error("Error loading record")
        } finally {
          setIsLoading(false)
        }
      }
      fetchReport()
    }
  }, [isEdit, isView, editId, applyDataToForm, location.state])

  const handleJobSelect = async (jobId) => {
    setSelectedJobId(jobId)
    if (isEdit || isView) return
    try {
      const res = await apiClient.get(`/api/hydro-test/next-report-no/${jobId}`)
      const jobRes = await apiClient.get(`/api/common/jobs/${jobId}`)
      if (jobRes.success && jobRes.data) {
        const job = jobRes.data
        setAutoFill({
          reportNo: res.data?.next_report_no || "Auto",
          client: job.customer?.customer_name || "",
          poNo: job.po?.po_number || "",
          projectId: job.project_id || "",
          equipmentName: job.equipement_name || "",
          tagNo: job.tag_number || "",
          code: job.code || "",
          msn: job.job_number || "",
        })
      }
    } catch (err) {}
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleRowChange = (id, field, value) => {
    setTableRows((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const addRow = () => setTableRows((rows) => [...rows, emptyRow(Math.max(...rows.map((r) => r.id), 0) + 1)])
  const removeRow = (id) => {
    if (tableRows.length <= 1) return
    setTableRows((rows) => rows.filter((r) => r.id !== id))
  }

  const addRemark = () => setRemarks((rem) => [...rem, { id: Math.max(...rem.map((r) => r.id), 0) + 1, text: "" }])
  const updateRemark = (id, text) => setRemarks((rem) => rem.map((r) => r.id === id ? { ...r, text } : r))
  const removeRemark = (id) => {
    if (remarks.length <= 1) return
    setRemarks((rem) => rem.filter((r) => r.id !== id))
  }

  const handleSubmit = async () => {
    if (!selectedJobId) { toast.error("Please select a Job."); return }
    const payload = {
      job_id: selectedJobId,
      shreno_drg_no: formData.shrenoDrgNo,
      customer_drg_no: formData.customerDrgNo,
      construction_code: formData.constructionCode,
      chlorine_content: formData.chlorineContent,
      inspection_agency: formData.inspectionAgency,
      test_position: formData.testPosition,
      procedure_no: formData.procedureNo,
      test_medium: formData.testMedium,
      metal_temp: formData.metalTemp,
      items: tableRows.map((row, idx) => ({ ...row, sort_order: idx })),
      remarks: remarks.map((r, idx) => ({ text: r.text, sort_order: idx })),
    }
    try {
      setSubmitting(true)
      if (isEdit && recordId) {
        await apiClient.put(`/api/hydro-test/update/${recordId}`, payload)
      } else {
        await apiClient.post("/api/hydro-test/create", payload)
      }
      toast.success("Report saved successfully")
      onSuccess(isEdit)
    } catch (err) {
      toast.error(err.message || "Failed to save report")
    } finally {
      setSubmitting(false)
    }
  }

  const today = new Date().toLocaleDateString('en-GB')

  if (isLoading) return <div className="p-8 text-center">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">{isView ? "View" : isEdit ? "Edit" : "Create"} Hydrostatic Pressure Test Report</h1>
          <p className="text-muted-foreground">{isView ? "Review details" : isEdit ? "Edit the" : "Fill in the"} details for the hydrostatic pressure test report.</p>
        </div>
        <Button variant="outline" onClick={onBack} className="h-9">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      </div>

      <Card className="mb-6 rounded-xl shadow-sm border border-muted-foreground/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Report Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 text-sm">
            <div className="space-y-2">
              <Label className="uppercase text-xs font-semibold text-muted-foreground">MSN Number:</Label>
              <Select value={selectedJobId} onValueChange={handleJobSelect} disabled={jobsLoading || isEdit || isView}>
                <SelectTrigger className="w-full bg-white h-9"><SelectValue placeholder={jobsLoading ? "Loading..." : "Select MSN"} /></SelectTrigger>
                <SelectContent>{jobs.map((j) => (<SelectItem key={j.id} value={j.id}>{j.job_number}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="uppercase text-xs font-semibold text-muted-foreground">TODAY'S DATE:</Label>
              <Input value={today} readOnly className="bg-muted/50 h-9" />
            </div>
            {[
              { label: "REPORT NO.:", value: autoFill.reportNo },
              { label: "P.O. NO.:", value: autoFill.poNo },
              { label: "CLIENT NAME:", value: autoFill.client },
              { label: "PROJECT ID:", value: autoFill.projectId },
              { label: "EQUIPMENT NAME:", value: autoFill.equipmentName },
              { label: "TAG NO.:", value: autoFill.tagNo },
              { label: "CODE:", value: autoFill.code },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-2">
                <Label className="uppercase text-xs font-semibold text-muted-foreground">{label}</Label>
                <Input value={value} readOnly className="bg-muted/50 h-9" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 rounded-xl shadow-sm border border-muted-foreground/20">
        <CardHeader className="pb-4"><CardTitle className="text-base font-semibold">Test Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[
              { id: "shrenoDrgNo", label: "SHRENO DRG. NO.", placeholder: "Enter Drg No" },
              { id: "customerDrgNo", label: "CUSTOMER DRG. NO.", placeholder: "Enter Drg No" },
              { id: "constructionCode", label: "CONSTRUCTION CODE", placeholder: "Enter Code" },
              { id: "chlorineContent", label: "CHLORINE CONTENT", placeholder: "Enter Content" },
              { id: "inspectionAgency", label: "INSPECTION AGENCY", placeholder: "Enter Agency" },
              { id: "testPosition", label: "TEST POSITION", placeholder: "Enter Position" },
              { id: "procedureNo", label: "PROCEDURE NO.", placeholder: "Enter Procedure" },
              { id: "testMedium", label: "TEST MEDIUM", placeholder: "Enter Medium" },
              { id: "metalTemp", label: "METAL TEMP.", placeholder: "Enter Temp" },
            ].map((f) => (
              <div key={f.id} className="space-y-2">
                <Label htmlFor={f.id} className="uppercase text-xs font-semibold text-muted-foreground">{f.label}:</Label>
                <Input id={f.id} name={f.id} value={formData[f.id]} onChange={handleFormChange} disabled={isView} placeholder={f.placeholder} className="h-9" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 rounded-xl shadow-sm border border-muted-foreground/20">
        <CardHeader className="pb-4"><CardTitle className="text-base font-semibold">Pressure Test Details</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border text-xs">
              <thead>
                <tr className="bg-[#f4f4f5]">
                  <th className="border border-border p-2 font-bold uppercase min-w-[150px]" rowSpan={2}>PARTICULARS</th>
                  <th className="border border-border p-2 font-bold uppercase min-w-[100px]" rowSpan={2}>MAWP INT/EXT</th>
                  <th className="border border-border p-2 font-bold uppercase min-w-[120px]" rowSpan={2}>REQ PRESS</th>
                  <th className="border border-border p-2 font-bold uppercase min-w-[120px]" rowSpan={2}>ACT PRESS</th>
                  <th colSpan={4} className="border border-border p-2 font-bold uppercase text-center">GAUGE DETAIL</th>
                  <th className="border border-border p-2 font-bold uppercase min-w-[100px]" rowSpan={2}>HOLD TIME</th>
                  <th className="border border-border p-2 font-bold uppercase min-w-[120px]" rowSpan={2}>RESULT</th>
                  {!isView && <th className="border border-border p-2 font-bold uppercase w-[60px]" rowSpan={2}>Action</th>}
                </tr>
                <tr className="bg-[#f4f4f5]">
                  <th className="border border-border p-2 font-bold uppercase min-w-[80px]">RANGE</th>
                  <th className="border border-border p-2 font-bold uppercase min-w-[80px]">I.D No.</th>
                  <th className="border border-border p-2 font-bold uppercase min-w-[100px]">CALIB</th>
                  <th className="border border-border p-2 font-bold uppercase min-w-[100px]">DUE</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <Fragment key={row.id}>
                    <tr className="border-b">
                      <td className="border border-border p-1" rowSpan={2}><Textarea value={row.particulars} onChange={(e) => handleRowChange(row.id, "particulars", e.target.value)} disabled={isView} className="w-full text-xs min-h-[80px] border-0" /></td>
                      <td className="border border-border p-1" rowSpan={2}><Input value={row.mawp_int_ext} onChange={(e) => handleRowChange(row.id, "mawp_int_ext", e.target.value)} disabled={isView} className="w-full text-xs h-[80px] border-0" /></td>
                      <td className="border border-border p-1" rowSpan={2}><Input value={row.required_test_pressure} onChange={(e) => handleRowChange(row.id, "required_test_pressure", e.target.value)} disabled={isView} className="w-full text-xs h-[80px] border-0" /></td>
                      <td className="border border-border p-1" rowSpan={2}><Input value={row.actual_test_pressure} onChange={(e) => handleRowChange(row.id, "actual_test_pressure", e.target.value)} disabled={isView} className="w-full text-xs h-[80px] border-0" /></td>
                      <td className="border border-border p-1"><Input value={row.pg1_range} onChange={(e) => handleRowChange(row.id, "pg1_range", e.target.value)} disabled={isView} className="w-full text-xs h-9 border-0" /></td>
                      <td className="border border-border p-1"><Input value={row.pg1_id_no} onChange={(e) => handleRowChange(row.id, "pg1_id_no", e.target.value)} disabled={isView} className="w-full text-xs h-9 border-0" /></td>
                      <td className="border border-border p-1"><Input type="date" value={row.pg1_calib_date} onChange={(e) => handleRowChange(row.id, "pg1_calib_date", e.target.value)} disabled={isView} className="w-full text-xs h-9 border-0" /></td>
                      <td className="border border-border p-1"><Input type="date" value={row.pg1_due_date} onChange={(e) => handleRowChange(row.id, "pg1_due_date", e.target.value)} disabled={isView} className="w-full text-xs h-9 border-0" /></td>
                      <td className="border border-border p-1" rowSpan={2}><Input value={row.holding_time} onChange={(e) => handleRowChange(row.id, "holding_time", e.target.value)} disabled={isView} className="w-full text-xs h-[80px] border-0" /></td>
                      <td className="border border-border p-1" rowSpan={2}><Input value={row.test_result} onChange={(e) => handleRowChange(row.id, "test_result", e.target.value)} disabled={isView} className="w-full text-xs h-[80px] border-0" /></td>
                      {!isView && (<td className="border border-border p-2 text-center" rowSpan={2}><Button variant="ghost" size="icon" onClick={() => removeRow(row.id)} disabled={tableRows.length === 1} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></td>)}
                    </tr>
                    <tr className="border-b">
                      <td className="border border-border p-1"><Input value={row.pg2_range} onChange={(e) => handleRowChange(row.id, "pg2_range", e.target.value)} disabled={isView} className="w-full text-xs h-9 border-0" /></td>
                      <td className="border border-border p-1"><Input value={row.pg2_id_no} onChange={(e) => handleRowChange(row.id, "pg2_id_no", e.target.value)} disabled={isView} className="text-xs h-9 border-0" /></td>
                      <td className="border border-border p-1"><Input type="date" value={row.pg2_calib_date} onChange={(e) => handleRowChange(row.id, "pg2_calib_date", e.target.value)} disabled={isView} className="text-xs h-9 border-0" /></td>
                      <td className="border border-border p-1"><Input type="date" value={row.pg2_due_date} onChange={(e) => handleRowChange(row.id, "pg2_due_date", e.target.value)} disabled={isView} className="text-xs h-9 border-0" /></td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
            {!isView && <div className="pt-4"><Button type="button" variant="outline" onClick={addRow} className="h-9"><Plus className="h-4 w-4 mr-2" />Add Row</Button></div>}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 rounded-xl shadow-sm border border-muted-foreground/20">
        <CardHeader className="pb-4"><CardTitle className="text-base font-semibold">Remarks</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {remarks.map((r) => (
            <div key={r.id} className="flex gap-4">
              <Textarea value={r.text} onChange={(e) => updateRemark(r.id, e.target.value)} disabled={isView} className="min-h-[60px] flex-1 text-sm" />
              {!isView && <Button variant="ghost" size="icon" onClick={() => removeRemark(r.id)} disabled={remarks.length === 1} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>}
            </div>
          ))}
          {!isView && <Button type="button" variant="outline" onClick={addRemark} className="h-9"><Plus className="h-4 w-4 mr-2" />Add Remark</Button>}
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onBack} disabled={submitting}>{isView ? "Close" : "Cancel"}</Button>
        {!isView && <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : "Submit"}</Button>}
      </div>
    </div>
  )
}

function HydroPresText() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: routeId } = useParams()
  const mode = useMemo(() => {
    if (location.pathname.includes("/create")) return "create"
    if (location.pathname.includes("/edit")) return "edit"
    if (location.pathname.includes("/view")) return "view"
    return "list"
  }, [location.pathname])

  const handleSuccess = (isEdit) => {
    toast.success(`Report ${isEdit ? "updated" : "created"} successfully!`)
    navigate("/hydro-test/list")
  }

  return (
    <main className="flex-1 overflow-auto p-6 flex flex-col">
      <div className="flex-1 flex flex-col w-full">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 mb-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        {mode === "list" ? (
          <ListView 
            onCreateClick={() => navigate("/hydro-test/create")} 
            onEditClick={(row) => navigate(`/hydro-test/edit/${toUrlKey(row.report_no)}`, { state: { report: { id: row.id, label: row.report_no } } })} 
            onViewClick={(row) => navigate(`/hydro-test/view/${toUrlKey(row.report_no)}`, { state: { report: { id: row.id, label: row.report_no } } })}
          />
        ) : (
          <FormView 
            onBack={() => navigate("/hydro-test/list")} 
            onSuccess={handleSuccess} 
            isEdit={mode === "edit"} 
            isView={mode === "view"}
            editId={routeId} 
          />
        )}
      </div>
    </main>
  )
}

export default HydroPresText
