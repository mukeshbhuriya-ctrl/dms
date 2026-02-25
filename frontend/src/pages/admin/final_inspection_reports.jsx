import { useState, useEffect, useCallback } from "react"
import apiClient from "@/api/api.client"
import { AdminSidebar } from "@/components"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Trash2, ArrowLeft, Eye, Edit } from "lucide-react"
import { DataTable } from "@/components/shared/DataTable"
import { toast } from 'react-toastify'

// ─── List View ───────────────────────────────────────────────────────────────
function ListView({ onCreateClick, onEditClick }) {
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isViewLoading, setIsViewLoading] = useState(false)
  const [error, setError] = useState("")

  const handleViewClick = async (id) => {
    setIsViewLoading(true)
    setError("")
    try {
      const res = await apiClient.get(`/api/inspection-report/final/${id}`)
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

  const columns = [
    { header: "Report No.", accessorKey: "report_no" },
    { header: "MSN", accessorKey: "msn" },
    { header: "Client", accessorKey: "client" },
    { header: "PO No.", accessorKey: "po_no" },
    { header: "Project ID", accessorKey: "project_id" },
    { header: "Equipment", accessorKey: "equipment_name" },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row) => (
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${row.status === 'draft' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
          {row.status}
        </span>
      ),
    },
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
            onClick={() => handleViewClick(row.id)}
            title="View">
            <Eye className="h-4 w-4 mr-2" /> View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditClick(row.id)}
            title="Edit">
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
        </div>
      ),
    },
  ]

  const fetchData = useCallback(async ({ page, limit, search }) => {
    const params = new URLSearchParams({ page, limit, ...(search ? { search } : {}) })
    const res = await apiClient.get(`/api/inspection-report/final/list`, Object.fromEntries(params))
    return { data: res.data, meta: res.meta }
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Final Inspection Reports</h1>
          <p className="text-muted-foreground">View and manage all final inspection reports.</p>
        </div>
        <Button onClick={onCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Create
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <DataTable columns={columns} fetchData={fetchData} />

      {/* View Details Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[95vw] w-full max-h-[95vh] overflow-y-auto p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-center">Final Inspection Report Details</DialogTitle>
            <DialogDescription className="text-center">
              Complete details of the selected Final Inspection Report.
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
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">DRG NO:</span>
                  <span className="font-medium">{selectedRecord.drg_no || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">REPORT NO:</span>
                  <span className="font-medium">{selectedRecord.report_no || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">QUALITY ENGINEER:</span>
                  <span className="font-medium">{selectedRecord.quality_engineer?.name || "-"}</span>
                </div>
              </div>

              {/* Inspection Details Table */}
              {selectedRecord.details && selectedRecord.details.length > 0 && (
                <div className="overflow-x-auto rounded-md border border-border">
                  <h3 className="p-3 font-bold text-sm bg-muted/40 border-b border-border">Inspection Details</h3>
                  <table className="w-full border-collapse text-xs text-left">
                    <thead>
                      <tr className="bg-[#f4f4f5] border-b border-border">
                        <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">SR NO.</th>
                        <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">DESCRIPTION</th>
                        <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">REQUIRED</th>
                        <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider">ACTUAL</th>
                        <th className="p-3 font-bold text-[11px] uppercase tracking-wider">REMARKS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRecord.details.map((row) => (
                        <tr key={row.id} className="hover:bg-muted/30 border-b border-border last:border-0">
                          <td className="border-r border-border p-3 align-top font-medium">{row.sr_no || "-"}</td>
                          <td className="border-r border-border p-3 align-top">{row.description || "-"}</td>
                          <td className="border-r border-border p-3 align-top">{row.required || "-"}</td>
                          <td className="border-r border-border p-3 align-top">{row.actual || "-"}</td>
                          <td className="p-3 align-top">{row.remarks || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Nozzle Details Table */}
              {selectedRecord.nozzles && selectedRecord.nozzles.length > 0 && (
                <div className="overflow-x-auto rounded-md border border-border mt-6">
                  <h3 className="p-3 font-bold text-sm bg-muted/40 border-b border-border">Nozzle Details</h3>
                  <table className="w-full border-collapse text-xs text-left">
                    <thead>
                      <tr className="bg-[#f4f4f5] border-b border-border">
                        <th className="border-r border-border border-b p-3 font-bold text-[11px] uppercase tracking-wider" rowSpan={2}>NOZZLE MARK</th>
                        <th className="border-r border-border border-b p-3 font-bold text-[11px] uppercase tracking-wider" rowSpan={2}>ORIENTATION</th>
                        <th className="border-r border-border border-b p-3 font-bold text-[11px] uppercase tracking-wider" rowSpan={2}>SIZE</th>
                        <th className="border-r border-border border-b p-3 font-bold text-[11px] uppercase tracking-wider bg-muted/50 text-center" colSpan={3}>DIMENSION AS PER APP. DRG</th>
                        <th className="border-b border-border p-3 font-bold text-[11px] uppercase tracking-wider bg-muted/50 text-center" colSpan={2}>DIMENSION AT ACTUAL</th>
                      </tr>
                      <tr className="bg-[#f4f4f5] border-b border-border text-center">
                        <th className="border-r border-border p-3 font-bold text-[10px] uppercase tracking-wider">LOCATION</th>
                        <th className="border-r border-border p-3 font-bold text-[10px] uppercase tracking-wider">ELEVATION</th>
                        <th className="border-r border-border p-3 font-bold text-[10px] uppercase tracking-wider">PROJECTION</th>
                        <th className="border-r border-border p-3 font-bold text-[10px] uppercase tracking-wider">ELEVATION</th>
                        <th className="p-3 font-bold text-[10px] uppercase tracking-wider">PROJECTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRecord.nozzles.map((row) => (
                        <tr key={row.id} className="hover:bg-muted/30 border-b border-border last:border-0 text-center">
                          <td className="border-r border-border p-3 align-top font-medium">{row.nozzle_mark || "-"}</td>
                          <td className="border-r border-border p-3 align-top">{row.orientation || "-"}</td>
                          <td className="border-r border-border p-3 align-top">{row.size || "-"}</td>
                          <td className="border-r border-border p-3 align-top bg-muted/5">{row.location || "-"}</td>
                          <td className="border-r border-border p-3 align-top bg-muted/5">{row.elevation_approved || "-"}</td>
                          <td className="border-r border-border p-3 align-top bg-muted/5">{row.projection_approved || "-"}</td>
                          <td className="border-r border-border p-3 align-top bg-muted/10">{row.elevation_actual || "-"}</td>
                          <td className="p-3 align-top bg-muted/10">{row.projection_actual || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Part Details Table */}
              {selectedRecord.parts && selectedRecord.parts.length > 0 && (
                <div className="overflow-x-auto rounded-md border border-border mt-6">
                  <h3 className="p-3 font-bold text-sm bg-muted/40 border-b border-border">Part Details</h3>
                  <table className="w-full border-collapse text-xs text-left">
                    <thead>
                      <tr className="bg-[#f4f4f5] border-b border-border">
                        <th className="border-r border-border border-b p-3 font-bold text-[11px] uppercase tracking-wider" rowSpan={2}>PART NO</th>
                        <th className="border-r border-border border-b p-3 font-bold text-[11px] uppercase tracking-wider" rowSpan={2}>DESCRIPTION</th>
                        <th className="border-r border-border border-b p-3 font-bold text-[11px] uppercase tracking-wider bg-muted/50 text-center" colSpan={3}>DIMENSION AS PER APP. DRG</th>
                        <th className="border-b border-border p-3 font-bold text-[11px] uppercase tracking-wider bg-muted/50 text-center" colSpan={2}>DIMENSION AT ACTUAL</th>
                      </tr>
                      <tr className="bg-[#f4f4f5] border-b border-border text-center">
                        <th className="border-r border-border p-3 font-bold text-[10px] uppercase tracking-wider">ORIENTATION</th>
                        <th className="border-r border-border p-3 font-bold text-[10px] uppercase tracking-wider">ELEVATION</th>
                        <th className="border-r border-border p-3 font-bold text-[10px] uppercase tracking-wider">PROJECTION</th>
                        <th className="border-r border-border p-3 font-bold text-[10px] uppercase tracking-wider">ELEVATION</th>
                        <th className="p-3 font-bold text-[10px] uppercase tracking-wider">PROJECTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRecord.parts.map((row) => (
                        <tr key={row.id} className="hover:bg-muted/30 border-b border-border last:border-0 text-center">
                          <td className="border-r border-border p-3 align-top font-medium">{row.part_no || "-"}</td>
                          <td className="border-r border-border p-3 align-top">{row.description || "-"}</td>
                          <td className="border-r border-border p-3 align-top bg-muted/5">{row.orientation_approved || "-"}</td>
                          <td className="border-r border-border p-3 align-top bg-muted/5">{row.elevation_approved || "-"}</td>
                          <td className="border-r border-border p-3 align-top bg-muted/5">{row.projection_approved || "-"}</td>
                          <td className="border-r border-border p-3 align-top bg-muted/10">{row.elevation_actual || "-"}</td>
                          <td className="p-3 align-top bg-muted/10">{row.projection_actual || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Remarks Section */}
              {selectedRecord.remarks && selectedRecord.remarks.length > 0 && (
                <div className="overflow-x-auto rounded-md border border-border mt-6">
                  <h3 className="p-3 font-bold text-sm bg-muted/40 border-b border-border">Remarks</h3>
                  <div className="p-4 space-y-2">
                    {selectedRecord.remarks.map((rem, index) => (
                      <div key={rem.id} className="flex gap-3 items-start text-xs">
                        <span className="font-bold">{index + 1}.</span>
                        <span>{rem.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

// ─── Create / Edit View (Original Legacy Visual UI) ──────────────────────────────────────────────────────
function CreateView({ onBack, onSuccess, editId = null }) {
  // Get today's date
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  // Header section
  const [msn, setMsn] = useState("")
  const [reportNo, setReportNo] = useState("")
  const [client, setClient] = useState("")
  const [poNo, setPoNo] = useState("")
  const [equipment, setEquipment] = useState("")
  const [code, setCode] = useState("")

  // User input fields
  const [formData, setFormData] = useState({
    tagNo: "",
    drgNo: "",
    project_id: "",
  })

  const [qualityEngineer, setQualityEngineer] = useState("")

  // First table rows (DESCRIPTION, REQUIRED, ACTUAL, REMARKS)
  const initialTable1Rows = [{ id: 1, srNo: 1, description: "", required: "", actual: "", remarks: "" }]
  const [table1Rows, setTable1Rows] = useState(initialTable1Rows)

  // Second table rows (NOZZLE MARK, ORIENTATION, SIZE, etc.)
  const initialTable2Rows = [{ id: 1, srNo: 1, nozzleMark: "", orientation: "", size: "", location: "", elevationApproved: "", projectionApproved: "", elevationActual: "", projectionActual: "" }]
  const [table2Rows, setTable2Rows] = useState(initialTable2Rows)

  // Third table rows (PART NO, DESCRIPTION, etc.)
  const initialTable3Rows = [{ id: 1, srNo: 1, partNo: "", description: "", orientationApproved: "", elevationApproved: "", projectionApproved: "", elevationActual: "", projectionActual: "" }]
  const [table3Rows, setTable3Rows] = useState(initialTable3Rows)

  // Remarks
  const initialRemarks = [
    { id: 1, text: "All dimensions are in mm unless otherwise specified." },
    { id: 2, text: "All other dimensions are checked as per approved drawing and found satisfactory." },
    { id: 3, text: "Abbreviation: TL: Tan Line, CL: Center Line, GF: Gasket face, FF: Flange face, VOD: Vessel Outside Diameter, VCL: Vessel center line, OD: Outside diameter, TTL : Top tan line, BTL: Bottom tan line, QTY.: Quantity, I/S: Inside, O/S: Outside, NCL:Nozzle center line, BWL: Bottom Weld line, TWL: Top weld line, APD: As Per Drawing" },
  ]
  const [remarks, setRemarks] = useState(initialRemarks)

  // Instrument Calibration Details table
  const [instrumentRows, setInstrumentRows] = useState([{ id: 1, name: "", idNo: "", dueDate: "" }])

  // API State
  const [msnOptions, setMsnOptions] = useState([])
  const [qualityEngineers, setQualityEngineers] = useState([])
  const [submitting, setSubmitting] = useState(false)

  // Load API data
  useEffect(() => {
    apiClient.get("/api/common/jobs?limit=200")
      .then((res) => { if (res.success) setMsnOptions(res.data) })
      .catch((err) => console.error("Failed to fetch jobs:", err))

    apiClient.get("/api/common/qc-engineers")
      .then((res) => { if (res.success) setQualityEngineers(res.data) })
      .catch((err) => console.error("Failed to fetch QC engineers:", err))
  }, [])

  // Auto-fill for Edit View
  useEffect(() => {
    if (editId && msnOptions.length > 0) {
      apiClient.get(`/api/inspection-report/final/${editId}`)
        .then((res) => {
          if (res.success && res.data) {
            const data = res.data
            setMsn(data.job_id || "")
            setReportNo(data.report_no || "")
            setEquipment(data.equipment_name || "")
            setCode(data.code || "")
            setClient(data.client || "")
            setPoNo(data.po_no || "")

            setFormData({
              tagNo: data.tag_no || "",
              drgNo: data.drg_no || "",
              project_id: data.project_id || "",
            })

            setQualityEngineer(data.quality_engineer_id || "")

            if (data.details && data.details.length > 0) {
              setTable1Rows(data.details.map((item, i) => ({
                id: i + 1, srNo: item.sr_no || (i + 1), description: item.description || "", required: item.required || "", actual: item.actual || "", remarks: item.remarks || ""
              })))
            } else { setTable1Rows(initialTable1Rows) }

            if (data.nozzles && data.nozzles.length > 0) {
              setTable2Rows(data.nozzles.map((nz, i) => ({
                id: i + 1, srNo: nz.sr_no || (i + 1), nozzleMark: nz.nozzle_mark || "", orientation: nz.orientation || "", size: nz.size || "", location: nz.location || "", elevationApproved: nz.elevation_approved || "", projectionApproved: nz.projection_approved || "", elevationActual: nz.elevation_actual || "", projectionActual: nz.projection_actual || ""
              })))
            } else { setTable2Rows(initialTable2Rows) }

            if (data.parts && data.parts.length > 0) {
              setTable3Rows(data.parts.map((pt, i) => ({
                id: i + 1, srNo: pt.sr_no || (i + 1), partNo: pt.part_no || "", description: pt.description || "", orientationApproved: pt.orientation_approved || "", elevationApproved: pt.elevation_approved || "", projectionApproved: pt.projection_approved || "", elevationActual: pt.elevation_actual || "", projectionActual: pt.projection_actual || ""
              })))
            } else { setTable3Rows(initialTable3Rows) }

            if (data.instruments && data.instruments.length > 0) {
              setInstrumentRows(data.instruments.map((inst, i) => ({
                id: i + 1, name: inst.name || "", idNo: inst.id_no || "", dueDate: inst.due_date || ""
              })))
            } else { setInstrumentRows([{ id: 1, name: "", idNo: "", dueDate: "" }]) }

            if (data.remarks && data.remarks.length > 0) {
              setRemarks(data.remarks.map((rem, i) => ({ id: i + 1, text: rem.text || "" })))
            } else { setRemarks(initialRemarks) }
          }
        })
        .catch((err) => console.error("Failed to fetch report details:", err))
    }
  }, [editId, msnOptions])

  // Handle Dropdown Change
  const handleMsnChange = async (value) => {
    setMsn(value)
    if (!editId) setReportNo("Loading...")

    const selectedMsn = msnOptions.find((option) => option.id === value)
    setClient(selectedMsn?.customer?.customer_name || "")
    setPoNo(selectedMsn?.po?.po_number || "")
    setFormData((prev) => ({ ...prev, tagNo: selectedMsn?.tagNo || "" }))
    setEquipment(selectedMsn?.equipement_name || "")
    setCode(selectedMsn?.code || "")

    if (!editId) {
      try {
        const res = await apiClient.get(`/api/inspection-report/final/next-report-no/${value}`)
        setReportNo(res.success && res.data?.next_report_no ? res.data.next_report_no : "Auto-generated on Submit")
      } catch (err) {
        console.error("Failed to fetch next report number:", err)
        setReportNo("Auto-generated on Submit")
      }
    }
  }

  // Handle input field changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Handle table 1 row changes
  const handleTable1RowChange = (id, field, value) => {
    setTable1Rows(table1Rows.map((row) => row.id === id ? { ...row, [field]: value } : row))
  }

  // Handle table 2 row changes
  const handleTable2RowChange = (id, field, value) => {
    setTable2Rows(table2Rows.map((row) => row.id === id ? { ...row, [field]: value } : row))
  }

  // Handle table 3 row changes
  const handleTable3RowChange = (id, field, value) => {
    setTable3Rows(table3Rows.map((row) => row.id === id ? { ...row, [field]: value } : row))
  }

  // Handle instrument table row changes
  const handleInstrumentRowChange = (id, field, value) => {
    setInstrumentRows(instrumentRows.map((row) => row.id === id ? { ...row, [field]: value } : row))
  }

  // Handle remarks changes
  const handleRemarkChange = (id, value) => {
    setRemarks(remarks.map((remark) => remark.id === id ? { ...remark, text: value } : remark))
  }

  // Adding Rows
  const addTable1Row = () => {
    const newId = Math.max(...table1Rows.map((row) => row.id), 0) + 1
    setTable1Rows([...table1Rows, { id: newId, srNo: newId, description: "", required: "", actual: "", remarks: "" }])
  }
  const addTable2Row = () => {
    const newId = Math.max(...table2Rows.map((row) => row.id), 0) + 1
    setTable2Rows([...table2Rows, { id: newId, srNo: newId, nozzleMark: "", orientation: "", size: "", location: "", elevationApproved: "", projectionApproved: "", elevationActual: "", projectionActual: "" }])
  }
  const addTable3Row = () => {
    const newId = Math.max(...table3Rows.map((row) => row.id), 0) + 1
    setTable3Rows([...table3Rows, { id: newId, srNo: newId, partNo: "", description: "", orientationApproved: "", elevationApproved: "", projectionApproved: "", elevationActual: "", projectionActual: "" }])
  }
  const addInstrumentRow = () => {
    const newId = Math.max(...instrumentRows.map((row) => row.id), 0) + 1
    setInstrumentRows([...instrumentRows, { id: newId, name: "", idNo: "", dueDate: "" }])
  }
  const addRemark = () => {
    const newId = Math.max(...remarks.map((r) => r.id), 0) + 1
    setRemarks([...remarks, { id: newId, text: "" }])
  }

  // Removing Rows
  const removeTable1Row = (id) => { if (table1Rows.length > 1) setTable1Rows(table1Rows.filter((row) => row.id !== id)) }
  const removeTable2Row = (id) => { if (table2Rows.length > 1) setTable2Rows(table2Rows.filter((row) => row.id !== id)) }
  const removeTable3Row = (id) => { if (table3Rows.length > 1) setTable3Rows(table3Rows.filter((row) => row.id !== id)) }
  const removeInstrumentRow = (id) => { if (instrumentRows.length > 1) setInstrumentRows(instrumentRows.filter((row) => row.id !== id)) }
  const removeRemark = (id) => { if (remarks.length > 1) setRemarks(remarks.filter((r) => r.id !== id)) }


  // Form Submission
  const handleSubmit = async () => {
    if (!msn) return toast.error("Please select an MSN")

    const payload = {
      job_id: msn,
      msn: msnOptions.find(opt => opt.id === msn)?.job_number || "",
      client,
      po_no: poNo,
      equipment_name: equipment,
      code,
      project_id: formData.project_id,
      tag_no: formData.tagNo,
      drg_no: formData.drgNo,
      quality_engineer_id: qualityEngineer,
      details: table1Rows.filter(r => r.description || r.required || r.actual).map(r => ({
        sr_no: parseInt(r.srNo, 10), description: r.description, required: r.required, actual: r.actual, remarks: r.remarks
      })),
      nozzles: table2Rows.filter(r => r.nozzleMark || r.orientation || r.size).map(r => ({
        sr_no: parseInt(r.srNo, 10), nozzle_mark: r.nozzleMark, orientation: r.orientation, size: r.size, location: r.location, elevation_approved: r.elevationApproved, projection_approved: r.projectionApproved, elevation_actual: r.elevationActual, projection_actual: r.projectionActual
      })),
      parts: table3Rows.filter(r => r.partNo || r.description).map(r => ({
        sr_no: parseInt(r.srNo, 10), part_no: r.partNo, description: r.description, orientation_approved: r.orientationApproved, elevation_approved: r.elevationApproved, projection_approved: r.projectionApproved, elevation_actual: r.elevationActual, projection_actual: r.projectionActual
      })),
      instruments: instrumentRows.filter(r => r.name || r.idNo || r.dueDate).map(r => ({
        name: r.name, id_no: r.idNo, due_date: r.dueDate
      })),
      remarks: remarks.filter(r => r.text).map((r, i) => ({
        sr_no: i + 1, text: r.text
      }))
    }

    try {
      setSubmitting(true)
      let res;
      if (editId) {
        res = await apiClient.put(`/api/inspection-report/final/update/${editId}`, payload)
      } else {
        res = await apiClient.post("/api/inspection-report/final/create", payload)
      }

      if (res.success) {
        toast.success(editId ? "Final Inspection Report updated!" : "Final Inspection Report created!")
        onSuccess()
      }
    } catch (err) {
      toast.error(err.message || "Failed to save report")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">{editId ? "Edit" : "Create"} Final Inspection Report</h1>
          <p className="text-muted-foreground">{editId ? "Update the details for this final inspection." : "Fill in the details for a new final inspection."}</p>
        </div>
        <Button variant="outline" onClick={onBack} className="h-9">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to List
        </Button>
      </div>

      {/* Header Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Report Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="msn">MSN:</Label>
              <Select value={msn} onValueChange={handleMsnChange}>
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
              <Input id="reportNo" type="text" value={reportNo} readOnly className="bg-muted font-bold text-xs" />
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
              <Label htmlFor="projectId">PROJECT ID:</Label>
              <Input
                id="projectId"
                name="project_id"
                type="text"
                value={formData.project_id}
                onChange={handleInputChange}
                placeholder="Enter Project ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">DATE:</Label>
              <Input
                id="date"
                type="text"
                value={today}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagNo">TAG NO:</Label>
              <Input
                id="tagNo"
                type="text"
                name="tagNo"
                value={formData.tagNo}
                onChange={handleInputChange}
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
              <Label htmlFor="code">CODE:</Label>
              <Input
                id="code"
                type="text"
                value={code}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Input Fields Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Equipment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="drgNo">DRG. NO.:</Label>
              <Input
                id="drgNo"
                name="drgNo"
                type="text"
                value={formData.drgNo}
                onChange={handleInputChange}
                placeholder="Enter DRG. NO."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualityEngineer">QUALITY ENGINEER:</Label>
              <Select value={qualityEngineer} onValueChange={setQualityEngineer}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Quality Engineer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {qualityEngineers.map((engineer) => (
                    <SelectItem key={engineer.id} value={engineer.id}>
                      {engineer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* First Table Section */}
      <Card className="mb-6 w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Inspection Details</CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex flex-col gap-4 w-full">
          <div className="rounded-md border overflow-y-auto max-h-[500px]">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    DESCRIPTION
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    REQUIRED
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    ACTUAL
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    REMARKS
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase w-[120px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table1Rows.length > 0 ? (
                  table1Rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.description}
                          onChange={(e) =>
                            handleTable1RowChange(row.id, "description", e.target.value)
                          }
                          placeholder="Description"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.required}
                          onChange={(e) =>
                            handleTable1RowChange(row.id, "required", e.target.value)
                          }
                          placeholder="Required"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.actual}
                          onChange={(e) =>
                            handleTable1RowChange(row.id, "actual", e.target.value)
                          }
                          placeholder="Actual"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.remarks}
                          onChange={(e) =>
                            handleTable1RowChange(row.id, "remarks", e.target.value)
                          }
                          placeholder="Remarks"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTable1Row(row.id)}
                          disabled={table1Rows.length === 1}
                          title="Remove Row"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No inspection details added.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addTable1Row}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
        </CardContent>
      </Card>

      {/* Second Table Section - Nozzle Details */}
      <Card className="mb-6 w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Nozzle Details</CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex flex-col gap-4 w-full">
          <div className="rounded-md border overflow-y-auto max-h-[500px]">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    NOZZLE MARK
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    ORIENTATION
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    SIZE
                  </TableHead>
                  <TableHead
                    colSpan={3}
                    className="p-2 text-xs font-bold uppercase text-center"
                  >
                    DIMENSION AS PER APPROVED DRAWING
                  </TableHead>
                  <TableHead
                    colSpan={2}
                    className="p-2 text-xs font-bold uppercase text-center"
                  >
                    DIMENSION AT ACTUAL MEASURE
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase w-[120px]">
                    Actions
                  </TableHead>
                </TableRow>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    LOCATION
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    ELEVATION
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    PROJECTION
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    ELEVATION
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    PROJECTION
                  </TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table2Rows.length > 0 ? (
                  table2Rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.nozzleMark}
                          onChange={(e) =>
                            handleTable2RowChange(row.id, "nozzleMark", e.target.value)
                          }
                          placeholder="Nozzle Mark"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.orientation}
                          onChange={(e) =>
                            handleTable2RowChange(row.id, "orientation", e.target.value)
                          }
                          placeholder="Orientation"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.size}
                          onChange={(e) =>
                            handleTable2RowChange(row.id, "size", e.target.value)
                          }
                          placeholder="Size"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.location}
                          onChange={(e) =>
                            handleTable2RowChange(row.id, "location", e.target.value)
                          }
                          placeholder="Location"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.elevationApproved}
                          onChange={(e) =>
                            handleTable2RowChange(row.id, "elevationApproved", e.target.value)
                          }
                          placeholder="Elevation"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.projectionApproved}
                          onChange={(e) =>
                            handleTable2RowChange(row.id, "projectionApproved", e.target.value)
                          }
                          placeholder="Projection"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.elevationActual}
                          onChange={(e) =>
                            handleTable2RowChange(row.id, "elevationActual", e.target.value)
                          }
                          placeholder="Elevation"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.projectionActual}
                          onChange={(e) =>
                            handleTable2RowChange(row.id, "projectionActual", e.target.value)
                          }
                          placeholder="Projection"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTable2Row(row.id)}
                          disabled={table2Rows.length === 1}
                          title="Remove Row"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      No nozzle details added.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addTable2Row}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
        </CardContent>
      </Card>

      {/* Third Table Section - Part Details */}
      <Card className="mb-6 w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Part Details</CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex flex-col gap-4 w-full">
          <div className="rounded-md border overflow-y-auto max-h-[500px]">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    PART NO
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    DESCRIPTION
                  </TableHead>
                  <TableHead
                    colSpan={3}
                    className="p-2 text-xs font-bold uppercase text-center"
                  >
                    DIMENSION AS PER APPROVED DRAWING
                  </TableHead>
                  <TableHead
                    colSpan={2}
                    className="p-2 text-xs font-bold uppercase text-center"
                  >
                    DIMENSION AT ACTUAL MEASURE
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase w-[120px]">
                    Actions
                  </TableHead>
                </TableRow>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    ORIENTATION
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    ELEVATION
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    PROJECTION
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    ELEVATION
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    PROJECTION
                  </TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table3Rows.length > 0 ? (
                  table3Rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.partNo}
                          onChange={(e) =>
                            handleTable3RowChange(row.id, "partNo", e.target.value)
                          }
                          placeholder="Part No"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.description}
                          onChange={(e) =>
                            handleTable3RowChange(row.id, "description", e.target.value)
                          }
                          placeholder="Description"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.orientationApproved}
                          onChange={(e) =>
                            handleTable3RowChange(row.id, "orientationApproved", e.target.value)
                          }
                          placeholder="Orientation"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.elevationApproved}
                          onChange={(e) =>
                            handleTable3RowChange(row.id, "elevationApproved", e.target.value)
                          }
                          placeholder="Elevation"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.projectionApproved}
                          onChange={(e) =>
                            handleTable3RowChange(row.id, "projectionApproved", e.target.value)
                          }
                          placeholder="Projection"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.elevationActual}
                          onChange={(e) =>
                            handleTable3RowChange(row.id, "elevationActual", e.target.value)
                          }
                          placeholder="Elevation"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.projectionActual}
                          onChange={(e) =>
                            handleTable3RowChange(row.id, "projectionActual", e.target.value)
                          }
                          placeholder="Projection"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTable3Row(row.id)}
                          disabled={table3Rows.length === 1}
                          title="Remove Row"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No part details added.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addTable3Row}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
        </CardContent>
      </Card>

      {/* Remarks Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Remarks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Label>REMARK:</Label>
            {remarks.map((remark, index) => (
              <div key={remark.id} className="flex gap-2 items-start">
                <div className="flex-shrink-0 pt-2">
                  <span className="text-sm font-medium">{index + 1}</span>
                </div>
                <Textarea
                  value={remark.text}
                  onChange={(e) => handleRemarkChange(remark.id, e.target.value)}
                  className="min-h-[60px] flex-1"
                  placeholder="Enter remark"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRemark(remark.id)}
                  disabled={remarks.length === 1}
                  className="mt-2"
                  title="Remove Remark"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addRemark}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Remark
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instrument Calibration Details Table */}
      <Card className="mb-6 w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Instrument Calibration Details</CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex flex-col gap-4 w-full">
          <div className="rounded-md border overflow-y-auto max-h-[500px]">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    NAME
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    ID NO. / SR NO.
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    DUE DATE
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase w-[120px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instrumentRows.length > 0 ? (
                  instrumentRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.name}
                          onChange={(e) =>
                            handleInstrumentRowChange(row.id, "name", e.target.value)
                          }
                          placeholder="Name"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.idNo}
                          onChange={(e) =>
                            handleInstrumentRowChange(row.id, "idNo", e.target.value)
                          }
                          placeholder="ID No. / SR No."
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={row.dueDate}
                          onChange={(e) =>
                            handleInstrumentRowChange(row.id, "dueDate", e.target.value)
                          }
                          placeholder="Due Date"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeInstrumentRow(row.id)}
                          disabled={instrumentRows.length === 1}
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
          <Button
            type="button"
            variant="outline"
            onClick={addInstrumentRow}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 mt-8 mb-4">
        <Button variant="outline" onClick={onBack}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving..." : (editId ? "Update Report" : "Save Report")}
        </Button>
      </div>

    </div>
  )
}

// ─── Main Component Wrapper ───────────────────────────────────────────
export default function FinalInspectionReports() {
  const [view, setView] = useState("list") // "list" | "create" | "edit"
  const [editId, setEditId] = useState(null)

  const handleSuccess = () => {
    setView("list")
    setEditId(null)
  }

  const handleEdit = (id) => {
    setEditId(id)
    setView("edit")
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {view === "list" ? (
              <ListView
                onCreateClick={() => {
                  setEditId(null)
                  setView("create")
                }}
                onEditClick={handleEdit}
              />
            ) : (
              <CreateView
                onBack={() => {
                  setView("list")
                  setEditId(null)
                }}
                onSuccess={handleSuccess}
                editId={editId}
              />
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
