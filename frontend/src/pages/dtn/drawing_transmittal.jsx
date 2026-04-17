import React, { useState, useEffect, useMemo } from "react"
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
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { SearchableSelect } from "@/components/shared/SearchableSelect"
import ProDataTable from "@/components/shared/ProDataTable"
import apiClient from "@/api/api.client"

// ─── List View ───────────────────────────────────────────────────────────────
function ListView({ onCreateClick }) {
  const columns = useMemo(() => [
    { id: "ref_no", header: "Reference No", accessorKey: "ref_no" },
    { id: "customer", header: "Customer", accessorKey: "customer" },
    { id: "job_no", header: "Job Numbers", accessorKey: "job_no" },
    { id: "date", header: "Date", accessorKey: "date" },
    { id: "status", header: "Status", accessorKey: "status" },
  ], [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Drawing Transmittals</h1>
          <p className="text-muted-foreground text-sm font-medium">View and manage all drawing transmittals.</p>
        </div>
      </div>

      <ProDataTable 
        data={[]} 
        columns={columns} 
        isLoading={false}
        onAdd={onCreateClick}
        globalSearchPlaceholder="Search reference no, msn, client..."
      />
    </div>
  )
}

// ─── Create View ─────────────────────────────────────────────────────────────
function CreateView({ onBack }) {
  const [jobIds, setJobIds] = useState([])
  const [jobs, setJobs] = useState([])
  const [jobsLoading, setJobsLoading] = useState(false)

  // Auto-fill (Identical state structure to MHC)
  const [autoFill, setAutoFill] = useState({
    reportNo: "DESIGN-11", // Refers to Transmittal Ref No in DTN
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
    setJobsLoading(true)
    apiClient.get("/api/common/jobs?limit=200")
      .then(res => setJobs(res.data || []))
      .catch(err => console.error("Failed to fetch jobs:", err))
      .finally(() => setJobsLoading(false))
  }, [])

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

  const addMatrixRow = () => {
    const nextSr = (distributionRows.length + 1).toString().padStart(2, '0')
    setDistributionRows(prev => [...prev, { 
      id: Date.now(), 
      srNo: nextSr, 
      docNo: "", 
      rev: "", 
      copies: "01", 
      deps: {} 
    }])
  }

  // Auto-fill logic
  const handleJobSelect = (ids) => {
    setJobIds(ids)
    if (ids.length > 0) {
      const firstJob = jobs.find(j => j.id === ids[0]);
      if (firstJob) {
        setAutoFill(prev => ({
          ...prev,
          client: firstJob.customer?.customer_name || "Pall Corporation",
          poNo: firstJob.po?.po_number || "4506553303",
          projectId: firstJob.project_id || "40540",
          equipmentName: firstJob.equipement_name || "E40340",
          tagNo: firstJob.tag_number || "T095656",
          code: firstJob.code || "ASME BPVC VIII-1",
        }))
      }
    }
  }

  // Items Table Columns (ProDataTable Style)
  const itemColumns = useMemo(() => [
    { id: "selection", header: "Select", type: "checkbox", width: "50px" },
    { id: "doc_no", header: "Document No.", accessorKey: "doc_no" },
    { id: "description", header: "Description", accessorKey: "description" },
    { id: "rev", header: "Rev", accessorKey: "rev", width: "80px" },
    { id: "copies", header: "Copies", accessorKey: "copies", width: "100px" },
  ], [])

  return (
    <div>
      {/* Header (MHC Style) */}
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

      {/* ── Section 1: Basic Information (Simplified) ── */}
      <Card className="mb-6 shadow-sm border border-muted-foreground/20">
        <CardHeader className="pb-4 border-b bg-muted/5 font-semibold text-lg">
          <CardTitle className="text-base font-semibold">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {/* MSN / Job Number */}
            <div className="space-y-2">
              <Label className="uppercase text-xs font-semibold text-muted-foreground italic">MSN / JOB NO.:</Label>
              <SearchableSelect
                multi={true}
                options={jobs.map((j) => ({ value: j.id, label: j.job_number }))}
                value={jobIds}
                onValueChange={handleJobSelect}
                placeholder={jobsLoading ? "Loading jobs…" : "SELECT MSN"}
                searchPlaceholder="Search job number..."
              />
            </div>

            {/* Transmittal Ref No */}
            <div className="space-y-2">
              <Label className="uppercase text-xs font-semibold text-muted-foreground italic">TRANSMITTAL REF NO.:</Label>
              <Input value={autoFill.reportNo} readOnly className="bg-muted/40 h-10 border-muted-foreground/20 shadow-none text-sm font-medium" />
            </div>

            {/* Client */}
            <div className="space-y-2">
              <Label className="uppercase text-xs font-semibold text-muted-foreground italic">CUSTOMER / VENDOR (CLIENT):</Label>
              <Input value={autoFill.client} readOnly className="bg-muted/40 h-10 border-muted-foreground/20 shadow-none text-sm font-medium" />
            </div>

            {/* PO No */}
            <div className="space-y-2">
              <Label className="uppercase text-xs font-semibold text-muted-foreground italic">PURCHASE ORDER NO (PO. NO.):</Label>
              <Input value={autoFill.poNo} readOnly className="bg-muted/40 h-10 border-muted-foreground/20 shadow-none text-sm font-medium" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* ── Section 2: ISSUED TO Table (SS8 Replication) ── */}
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
                                  onCheckedChange={(val) => setIssuedTo(prev => ({ ...prev, [item.key]: val }))}
                                  className="h-5 w-5 border-muted-foreground/40"
                                />
                             </div>
                          </td>
                       </tr>
                    ))}
                    {/* Empty row to match SS style */}
                    <tr className="h-10 border-b last:border-0">
                       <td className="border-r"></td>
                       <td></td>
                    </tr>
                 </tbody>
              </table>
           </div>
           
           {/* Dynamic Attention Summary */}
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

      {/* ── Section 3: ISSUED FOR Table (SS9 Replication) ── */}
      <Card className="mb-8 shadow-sm border border-muted-foreground/20 overflow-hidden">
        <CardHeader className="pb-4 border-b bg-muted/5 py-4">
           <CardTitle className="text-base font-semibold uppercase tracking-wide">Issued For :</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
           <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left Table: Reference, Planning, Construction */}
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

              {/* Right Table: MANUFACTURING, OUTSOURCING, PROCUREMENT */}
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
      {/* ── Section 4: DISTRIBUTION Matrix (SS10 Replication) ── */}
      <Card className="mb-8 shadow-sm border border-muted-foreground/20 overflow-hidden">
        <CardHeader className="pb-4 border-b bg-muted/5 py-4 flex flex-row items-center justify-between">
           <CardTitle className="text-base font-semibold uppercase tracking-wide">Distribution :</CardTitle>
           <Button 
             variant="outline" 
             size="sm" 
             onClick={addMatrixRow}
             className="h-8 text-[10px] font-bold uppercase tracking-tight"
           >
             <Plus className="h-3 w-3 mr-1" />
             Add New Item
           </Button>
        </CardHeader>
        <CardContent className="p-0">
           <div className="overflow-x-auto custom-scrollbar-x">
              <table className="w-full border-collapse min-w-[1200px]">
                 <thead>
                    <tr className="bg-slate-50 border-b">
                       <th className="p-2 border-r text-[10px] font-bold uppercase text-slate-600 w-16 text-center">Sr. No</th>
                       <th className="p-2 border-r text-[10px] font-bold uppercase text-slate-600 text-left min-w-[300px]">Document Number / Title</th>
                       <th className="p-2 border-r text-[10px] font-bold uppercase text-slate-600 w-24 text-center">Rev No</th>
                       <th className="p-2 border-r text-[10px] font-bold uppercase text-slate-600 w-24 text-center">No. of Copy</th>
                       {depts.map(d => (
                          <th key={d} className="p-2 border-r text-[10px] font-bold uppercase text-slate-600 w-16 text-center">{d}</th>
                       ))}
                       {/* Empty columns for SS Match */}
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
                          <td className="p-1 border-r text-center">
                             <Input 
                               value={row.copies} 
                               onChange={(e) => updateMatrixCell(row.id, 'copies', e.target.value)}
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
                          {/* Empty columns for SS Match */}
                          <td className="border-r"></td>
                          <td className="border-r"></td>
                          <td></td>
                       </tr>
                    ))}
                    {/* Placeholder rows to match matrix look */}
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
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onBack}>
          Cancel
        </Button>
        <Button>
          Generate Transmittal
        </Button>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function DrawingTransmittal() {
  const [view, setView] = useState("list")

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
              <ListView onCreateClick={() => setView("create")} />
            ) : (
              <CreateView onBack={() => setView("list")} />
            )}
          </div>
        </main>
    </div>
  )
}
