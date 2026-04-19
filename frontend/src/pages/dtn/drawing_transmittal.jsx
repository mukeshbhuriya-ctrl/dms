import React, { useState, useEffect, useMemo, useCallback } from "react"
import { toast } from "react-toastify"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Plus,
  ArrowLeft,
  Layers,
  Edit,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SearchableSelect } from "@/components/shared/SearchableSelect"
import ProDataTable from "@/components/shared/ProDataTable"
import apiClient from "@/api/api.client"

// ─── List View ───────────────────────────────────────────────────────────────
function ListView({ onCreateClick, onEditClick, refreshKey }) {
  const fetchDtns = useCallback(async ({ page, limit, search }) => {
    // ProDataTable expects { data, meta }
    const res = await apiClient.get("/api/dtn", { page, limit, search })
    return res;
  }, [])

  const getStatusBadge = (status) => {
    let colorClass = "bg-gray-100 text-gray-700 border-gray-200"
    if (status === "Draft") colorClass = "bg-slate-100 text-slate-700 border-slate-200"
    if (status === "Pending") colorClass = "bg-amber-50 text-amber-700 border-amber-200"
    if (status === "Approved") colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200"

    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colorClass}`}>
        {status}
      </span>
    )
  }

  const columns = useMemo(() => [
    { id: "ref_no", header: "Reference No", accessorKey: "ref_no" },
    { id: "customer", header: "Customer", accessorKey: "customer" },
    { id: "job_no", header: "Job Numbers", accessorKey: "job_no" },
    { 
      id: "date", 
      header: "Date", 
      accessorKey: "date",
      cell: (row) => row.date ? new Date(row.date).toLocaleDateString() : "N/A"
    },
    { 
      id: "status", 
      header: "Status", 
      accessorKey: "status",
      cell: (row) => getStatusBadge(row.status || "Draft")
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-2 border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-none" 
            onClick={() => onEditClick(row.id)}
          >
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-[11px] font-medium">Edit</span>
          </Button>
        </div>
      )
    }
  ], [onEditClick])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Drawing Transmittals</h1>
          <p className="text-muted-foreground text-sm font-medium">View and manage all drawing transmittals.</p>
        </div>
      </div>

      <ProDataTable 
        fetchData={fetchDtns}
        columns={columns} 
        refreshKey={refreshKey}
        onAdd={onCreateClick}
        globalSearchPlaceholder="Search reference no, msn, client..."
      />
    </div>
  )
}

// ─── Create View ─────────────────────────────────────────────────────────────
function CreateView({ onBack, editId, defaultRefNo }) {
  const [jobIds, setJobIds] = useState([])
  const [jobs, setJobs] = useState([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [fetchingDtn, setFetchingDtn] = useState(false)
  const [savingStatus, setSavingStatus] = useState(null) // 'Draft' or 'Pending'

  // Auto-fill (Identical state structure to MHC)
  const [autoFill, setAutoFill] = useState({
    reportNo: defaultRefNo || "SHR/DGN/001",
    client: "",
    poNo: "",
    projectId: "",
    equipmentName: "",
    tagNo: "",
    code: "",
  })

  // Checklists (Issued To)
  const [issuedTo, setIssuedTo] = useState({
    hm: false, hq: false, hmf: false, hpl: false, hst: false, hpc: false, ppd: false,
  })

  // Checklists (Issued For)
  const [issuedFor, setIssuedFor] = useState({
    reference: false, planning: false, construction: false,
    manufacturing: false, outsourcing: false, procurement: false,
  })

  // Distribution Matrix (SS10 Replication)
  const [distributionRows, setDistributionRows] = useState([
    { id: Date.now(), srNo: "01", docNo: "MASTER LIST OF DRAWING & DOCUMENT", rev: "10", copies: "01", deps: {} }
  ])

  const depts = ["HM", "HQ", "HMF", "HPL", "HST", "HPC", "PPD"]

  useEffect(() => {
    const init = async () => {
      setJobsLoading(true)
      try {
        const res = await apiClient.get("/api/common/jobs")
        setJobs(res.data || [])
        
        if (editId) {
          setFetchingDtn(true)
          const dtnRes = await apiClient.get(`/api/dtn/${editId}`)
          if (dtnRes.success && dtnRes.data) {
            const d = dtnRes.data
            setAutoFill({
              reportNo: d.ref_no,
              client: d.client_name,
              poNo: d.po_number,
              projectId: d.project_id || "",
              equipmentName: d.equipment_name || "",
              tagNo: d.tag_no || "",
              code: d.code || "",
            })
            setJobIds(d.jobIds)
            setIssuedTo(d.issued_to)
            setIssuedFor(d.issued_for)
            setDistributionRows(d.distributionRows)
          }
        } else {
           // Fetch next reference number from backend
           const nextRes = await apiClient.get("/api/dtn/next-ref")
           if (nextRes.success) {
              setAutoFill(prev => ({ ...prev, reportNo: nextRes.data }))
           }
        }
      } catch (err) {
        console.error("Failed to init CreateView:", err)
      } finally {
        setJobsLoading(false)
        setFetchingDtn(false)
      }
    }
    init()
  }, [editId])

  // Options for Job Number dropdown (Cascading Logic)
  const jobOptions = useMemo(() => {
    // If no jobs are selected, show everything
    if (!jobIds || jobIds.length === 0) {
      return jobs.map((j) => ({ value: String(j.id), label: j.job_number }))
    }

    // Find the current PO context from the first selected job
    const firstJob = jobs.find(j => String(j.id) === String(jobIds[0]))
    const currentPoNo = firstJob?.po?.po_number

    // If we can't find a PO Number, don't restrict (failsafe)
    if (!currentPoNo) {
      return jobs.map((j) => ({ value: String(j.id), label: j.job_number }))
    }

    // Filter list to only show jobs belonging to the SAME PO
    return jobs
      .filter(j => j.po?.po_number === currentPoNo)
      .map(j => ({ value: String(j.id), label: j.job_number }))
  }, [jobs, jobIds])

  // Matrix handlers
  const updateMatrixCell = (rowId, field, value) => {
    setDistributionRows(prev => prev.map(row => 
      row.id === rowId ? { ...row, [field]: value } : row
    ))
  }

  const updateMatrixDep = (rowId, dep, value) => {
    setDistributionRows(prev => prev.map(row => 
      row.id === rowId ? { ...row, deps: { ...row.deps, [dep]: value } } : row
    ))
  }

  // Synchronized Issued To handler
  const updateIssuedTo = (key, val) => {
    setIssuedTo(prev => ({ ...prev, [key]: val }));
    
    // Sync to all rows in the distribution matrix
    const upperKey = key.toUpperCase();
    setDistributionRows(prev => prev.map(row => ({
      ...row,
      deps: { ...row.deps, [upperKey]: val }
    })));
  };

  const addMatrixRow = () => {
    const nextSr = (distributionRows.length + 1).toString().padStart(2, '0');
    const currentDeps = Object.entries(issuedTo).reduce((acc, [k, v]) => ({
      ...acc, [k.toUpperCase()]: v
    }), {});

    setDistributionRows(prev => [...prev, { 
      id: Date.now(), 
      srNo: nextSr, 
      docNo: "", 
      rev: "0", 
      copies: "01", 
      deps: { ...currentDeps } 
    }])
  }

  // Auto-fill logic
  const handleJobSelect = async (ids) => {
    setJobIds(ids)
    if (ids.length > 0) {
      const firstJob = jobs.find(j => String(j.id) === String(ids[0]));
      if (firstJob) {
        setAutoFill(prev => ({
          ...prev,
          client: firstJob.customer?.customer_name || "N/A",
          poNo: firstJob.po?.po_number || "N/A",
          projectId: firstJob.project_id || "40540",
          equipmentName: firstJob.equipement_name || "E40340",
          tagNo: firstJob.tag_number || "T095656",
          code: firstJob.code || "ASME BPVC VIII-1",
        }))
      }

      // Fetch related documents (Unique Union for all selected jobs)
      try {
        const res = await apiClient.get(`/api/dtn/documents-by-jobs?jobIds=${ids.join(',')}`)
        if (res.success && res.data) {
          // Pre-calculate current distribution defaults from Issued To
          const currentDeps = Object.entries(issuedTo).reduce((acc, [k, v]) => ({
            ...acc, [k.toUpperCase()]: v
          }), {});

          const newRows = res.data.map((doc, index) => ({
            id: doc.id || Date.now() + index,
            srNo: (index + 1).toString().padStart(2, '0'),
            // Combine System ID and Name for the title column
            docNo: `[${doc.system_doc_id}] ${doc.document_name}`,
            rev: "0", // Default to Rev 0
            copies: "01", // Default to 1 copy
            deps: { ...currentDeps } // Inherit current Issued To selection
          }))
          setDistributionRows(newRows)
        }
      } catch (error) {
        console.error("Error fetching documents for jobs:", error)
        toast.error("Failed to fetch related documents")
      }
    } else {
      // Clear matrix and auto-fill if no jobs selected
      setDistributionRows([])
      setAutoFill({
        reportNo: "SHR/DGN/001",
        client: "",
        poNo: "",
        projectId: "",
        equipmentName: "",
        tagNo: "",
        code: "",
      })
    }
  }

  // Submission Logic (Draft or Pending)
  const handleSubmit = async (status) => {
    if (jobIds.length === 0) {
      return toast.warning("Please select at least one Job Number.")
    }

    if (distributionRows.length === 0) {
      return toast.warning("The distribution matrix cannot be empty.")
    }

    setSavingStatus(status)
    const firstJob = jobs.find(j => String(j.id) === String(jobIds[0]))

    const payload = {
      ref_no: autoFill.reportNo,
      date: new Date().toISOString(),
      customer_id: firstJob?.customer_id,
      client_name: autoFill.client,
      po_id: firstJob?.po_id,
      po_number: autoFill.poNo,
      project_id: autoFill.projectId,
      equipment_name: autoFill.equipmentName,
      tag_no: autoFill.tagNo,
      code: autoFill.code,
      issued_to: issuedTo,
      issued_for: issuedFor,
      status, // New: Draft or Pending
      jobIds: jobIds,
      items: distributionRows
    }

    try {
      const endpoint = editId ? `/api/dtn/${editId}` : "/api/dtn"
      const method = editId ? "put" : "post"
      
      const res = await apiClient[method](endpoint, payload)
      if (res.success) {
        toast.success(status === "Draft" ? "Draft saved successfully!" : (editId ? "Transmittal updated successfully!" : "Transmittal generated successfully!"))
        onBack(true)
      } else {
        toast.error(res.message || "Failed to process transmittal")
      }
    } catch (error) {
      console.error("Submit DTN error:", error)
      toast.error(`An error occurred while ${status === "Draft" ? "saving draft" : "generating transmittal"}`)
    } finally {
      setSavingStatus(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Create Drawing Transmittal</h1>
          <p className="text-muted-foreground text-sm">Fill in the details and add drawing items.</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      </div>

      <Card className="mb-6 shadow-sm border border-muted-foreground/20">
        <CardHeader className="pb-4 border-b bg-muted/5 font-semibold text-lg">
          <CardTitle className="text-base font-semibold">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="uppercase text-xs font-semibold text-muted-foreground italic">MSN / JOB NO.:</Label>
              <SearchableSelect
                multi={true}
                options={jobOptions}
                value={jobIds}
                onValueChange={handleJobSelect}
                placeholder={jobsLoading ? "Loading jobs…" : "SELECT MSN"}
                searchPlaceholder="Search job number..."
              />
            </div>

            <div className="space-y-2">
              <Label className="uppercase text-xs font-semibold text-muted-foreground italic">TRANSMITTAL REF NO.:</Label>
              <Input value={autoFill.reportNo} readOnly className="bg-muted/40 h-10 border-muted-foreground/20 shadow-none text-sm font-medium" />
            </div>

            <div className="space-y-2">
              <Label className="uppercase text-xs font-semibold text-muted-foreground italic">CUSTOMER / VENDOR (CLIENT):</Label>
              <Input value={autoFill.client} readOnly className="bg-muted/40 h-10 border-muted-foreground/20 shadow-none text-sm font-medium" />
            </div>

            <div className="space-y-2">
              <Label className="uppercase text-xs font-semibold text-muted-foreground italic">PURCHASE ORDER NO (PO. NO.):</Label>
              <Input value={autoFill.poNo} readOnly className="bg-muted/40 h-10 border-muted-foreground/20 shadow-none text-sm font-medium" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="mb-6 shadow-sm border border-muted-foreground/20 overflow-hidden">
        <CardHeader className="pb-4 border-b bg-muted/5 py-4">
           <CardTitle className="text-base font-semibold uppercase tracking-wide">Issued To :</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
           <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                 <tbody>
                    {[
                       { key: 'hm', label: 'HEAD MARKETING (HM)' },
                       { key: 'hq', label: 'HEAD QUALITY (HQ)' },
                       { key: 'hmf', label: 'HEAD MANUFACTURING (HMF)' },
                       { key: 'hpl', label: 'HEAD PLANNING (HPL)' },
                       { key: 'hst', label: 'HEAD STORE (HST)' },
                       { key: 'hpc', label: 'HEAD PURCHASE (HPC)' },
                       { key: 'ppd', label: 'PREPRATORY DEPARTMENT (PPD)' },
                    ].map((item) => (
                       <tr key={item.key} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 px-6 text-sm font-medium text-muted-foreground border-r w-2/3">
                             {item.label}
                          </td>
                           <td className="p-3 text-center w-1/3">
                              <div className="flex justify-center">
                                 <Checkbox 
                                   id={`to-${item.key}`} 
                                   checked={issuedTo[item.key]}
                                   onCheckedChange={(val) => updateIssuedTo(item.key, val)}
                                   className="h-5 w-5 border-muted-foreground/40"
                                 />
                              </div>
                           </td>
                       </tr>
                    ))}
                    <tr className="h-10 border-b last:border-0">
                       <td className="border-r"></td>
                       <td></td>
                    </tr>
                 </tbody>
              </table>
           </div>
           
           {Object.values(issuedTo).some(v => v) && (
              <div className="p-4 bg-slate-50/80 border-t flex items-center gap-2">
                 <span className="text-xs font-bold text-slate-500 uppercase tracking-wider italic">ATTN:</span>
                 <span className="text-sm font-bold text-slate-800 uppercase tracking-tight">
                    {Object.entries(issuedTo)
                       .filter(([_, checked]) => checked)
                       .map(([key]) => key.toUpperCase())
                       .join(", ")}
                 </span>
              </div>
           )}
        </CardContent>
      </Card>

      <Card className="mb-8 shadow-sm border border-muted-foreground/20 overflow-hidden">
        <CardHeader className="pb-4 border-b bg-muted/5 py-4">
           <CardTitle className="text-base font-semibold uppercase tracking-wide">Issued For :</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
           <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="border-r border-b md:border-b-0">
                 <table className="w-full border-collapse">
                    <tbody>
                       {[
                          { key: 'reference', label: 'Reference' },
                          { key: 'planning', label: 'Planning' },
                          { key: 'construction', label: 'Construction' },
                       ].map((item) => (
                          <tr key={item.key} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                             <td className="p-3 px-6 text-sm font-medium text-muted-foreground border-r w-2/3">
                                {item.label}
                             </td>
                             <td className="p-3 text-center w-1/3">
                                <div className="flex justify-center">
                                   <Checkbox 
                                     id={`for-${item.key}`} 
                                     checked={issuedFor[item.key]}
                                     onCheckedChange={(val) => setIssuedFor(prev => ({ ...prev, [item.key]: val }))}
                                     className="h-5 w-5 border-muted-foreground/40"
                                   />
                                </div>
                             </td>
                          </tr>
                       ))}
                       <tr className="h-10 border-b last:border-0"><td className="border-r"></td><td></td></tr>
                    </tbody>
                 </table>
              </div>

              <div>
                 <table className="w-full border-collapse">
                    <tbody>
                       {[
                          { key: 'manufacturing', label: 'MANUFACTURING:' },
                          { key: 'outsourcing', label: 'OUTSOURCING:' },
                          { key: 'procurement', label: 'PROCUREMENT:' },
                       ].map((item) => (
                          <tr key={item.key} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                             <td className="p-3 px-6 text-sm font-medium text-muted-foreground border-r w-2/3">
                                {item.label}
                             </td>
                             <td className="p-3 text-center w-1/3">
                                <div className="flex justify-center">
                                   <Checkbox 
                                     id={`for-${item.key}`} 
                                     checked={issuedFor[item.key]}
                                     onCheckedChange={(val) => setIssuedFor(prev => ({ ...prev, [item.key]: val }))}
                                     className="h-5 w-5 border-muted-foreground/40"
                                   />
                                </div>
                             </td>
                          </tr>
                       ))}
                       <tr className="h-10 border-b last:border-0"><td className="border-r"></td><td></td></tr>
                    </tbody>
                 </table>
              </div>
           </div>
        </CardContent>
      </Card>
      <Card className="mb-8 shadow-sm border border-muted-foreground/20 overflow-hidden">
        <CardHeader className="pb-4 border-b bg-muted/5 py-4">
           <CardTitle className="text-base font-semibold uppercase tracking-wide">Distribution :</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
           <div className="overflow-x-auto custom-scrollbar-x">
              <table className="w-full border-collapse min-w-[1200px]">
                 <thead>
                    <tr className="bg-slate-50 border-b">
                       <th className="p-2 border-r text-[10px] font-bold uppercase text-slate-600 w-16 text-center">Sr. No</th>
                       <th className="p-2 border-r text-[10px] font-bold uppercase text-slate-600 text-left min-w-[300px]">Document Number / Title</th>
                       <th className="p-2 border-r text-[10px] font-bold uppercase text-slate-600 w-24 text-center">Rev No</th>
                       {depts.map(d => (
                          <th key={d} className="p-2 border-r text-[10px] font-bold uppercase text-slate-600 w-16 text-center">{d}</th>
                       ))}
                       <th className="p-2 border-r w-16"></th>
                       <th className="p-2 border-r w-16"></th>
                       <th className="p-2 w-16"></th>
                    </tr>
                 </thead>
                 <tbody>
                    {distributionRows.map((row) => (
                       <tr key={row.id} className="border-b last:border-0 group hover:bg-slate-50/30 transition-colors">
                          <td className="p-2 border-r text-center text-[11px] font-bold text-slate-500 bg-slate-50/30">
                             {row.srNo}
                          </td>
                          <td className="p-1 border-r">
                             <Input 
                               value={row.docNo} 
                               onChange={(e) => updateMatrixCell(row.id, 'docNo', e.target.value)}
                               className="border-none shadow-none focus-visible:ring-0 text-[11px] h-8 font-medium placeholder:italic uppercase"
                               placeholder="ENTER DOC NO / TITLE"
                             />
                          </td>
                          <td className="p-1 border-r text-center">
                             <Input 
                               value={row.rev} 
                               onChange={(e) => updateMatrixCell(row.id, 'rev', e.target.value)}
                               className="border-none shadow-none focus-visible:ring-0 text-[11px] h-8 text-center font-bold"
                             />
                          </td>
                          {depts.map(d => (
                             <td key={d} className="p-2 border-r">
                                <div className="flex justify-center">
                                   <Checkbox 
                                     checked={row.deps[d] || false}
                                     onCheckedChange={(val) => updateMatrixDep(row.id, d, val)}
                                     className="h-4 w-4 border-muted-foreground/40"
                                   />
                                </div>
                             </td>
                          ))}
                          <td className="border-r"></td>
                          <td className="border-r"></td>
                          <td></td>
                       </tr>
                    ))}
                    {[1, 2, 3].map(i => (
                       <tr key={i} className="h-10 border-b last:border-0 opacity-40">
                          <td className="border-r px-2 text-[10px] text-slate-400 text-center font-bold">{(distributionRows.length + i).toString().padStart(2, '0')}</td>
                          <td className="border-r"></td>
                          <td className="border-r"></td>
                          <td className="border-r"></td>
                          {depts.map(d => <td key={d} className="border-r"></td>)}
                          <td className="border-r"></td>
                          <td className="border-r"></td>
                          <td></td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </CardContent>
      </Card>
      <div className="flex gap-4 justify-end items-center mt-6">
        <Button 
          variant="outline" 
          onClick={onBack} 
          disabled={savingStatus !== null} 
          className="h-10 px-6 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all rounded-lg font-medium shadow-none gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button 
          variant="outline" 
          onClick={() => handleSubmit("Draft")} 
          disabled={savingStatus !== null}
          className="h-10 px-6 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all rounded-lg font-medium shadow-none"
        >
          {savingStatus === "Draft" ? "Saving..." : "Save Draft"}
        </Button>
        <Button 
          onClick={() => handleSubmit("Pending")} 
          disabled={savingStatus !== null}
          className="h-10 px-8 bg-slate-900 hover:bg-black text-white transition-all rounded-lg shadow-md font-bold text-[13px] uppercase tracking-wide border-none"
        >
          {savingStatus === "Pending" ? "Processing..." : "Generate Transmittal"}
        </Button>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function DrawingTransmittal() {
  const [view, setView] = useState("list")
  const [editId, setEditId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleCreate = useCallback(() => {
    setEditId(null)
    setView("create")
  }, [])

  const handleEdit = useCallback((id) => {
    setEditId(id)
    setView("create")
  }, [])

  const handleBack = useCallback((refresh = false) => {
    if (refresh) setRefreshKey(prev => prev + 1)
    setView("list")
  }, [])

  return (
    <div className="flex-1 flex flex-col w-full h-full bg-slate-50/20 overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-6 bg-white sticky top-0 z-40">
          <SidebarTrigger className="-ml-1" />
          <div className="h-4 w-px bg-border mx-2" />
          <div className="flex items-center gap-2 text-sm">
             <Layers className="h-4 w-4 text-muted-foreground" />
             <span className="font-semibold text-foreground uppercase tracking-tight text-[13px]">Drawing Transmittal</span>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-6 flex flex-col">
          <div className="flex-1 flex flex-col w-full">
            {view === "list" ? (
              <ListView 
                onCreateClick={handleCreate} 
                onEditClick={handleEdit}
                refreshKey={refreshKey}
              />
            ) : (
              <CreateView 
                onBack={handleBack} 
                editId={editId}
              />
            )}
          </div>
        </main>
    </div>
  )
}
