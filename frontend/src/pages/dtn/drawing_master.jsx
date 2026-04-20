import React, { useState, useEffect, useMemo } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
   Card,
   CardContent,
} from "@/components/ui/card"
import {
   Layers,
   Search,
   Filter,
   Eye,
   ArrowLeft
} from "lucide-react"
import { cn } from "@/lib/utils"
import apiClient from "@/api/api.client"
import ProDataTable from "@/components/shared/ProDataTable"

// ─── Master List Table Row ──────────────────────────────────────────────────
const MasterRow = ({ item, index }) => {
   return (
      <tr key={item.drgNo} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors group">
         <td className="p-3 border-r text-center text-[11px] font-bold text-slate-500 bg-slate-50/30 w-16">
            {index + 1}
         </td>

         <td className="p-3 border-r text-center text-[12px] font-bold uppercase w-64">
            {item.drgNo}
         </td>

         <td className="p-3 border-r text-center text-[11px] font-medium w-32">
            {item.rev}
         </td>

         {[1, 2, 3, 4, 5].map(col => (
            <td key={col} className="p-3 border-r text-center text-[11px] w-20">
               {/* DCR AND DATE Columns - Placeholders for now */}
            </td>
         ))}

         <td className="p-3 border-r text-center text-[10px] uppercase font-semibold text-slate-500 italic">
            {item.remark || "-"}
         </td>
      </tr>
   )
}

// ─── Main View ──────────────────────────────────────────────────────────────
export default function DrawingMaster() {
   const [view, setView] = useState("summary") // "summary" or "details"
   const [selectedJob, setSelectedJob] = useState(null)
   const [summaries, setSummaries] = useState([])
   const [masterData, setMasterData] = useState([])
   const [loading, setLoading] = useState(false)
   const [searchTerm, setSearchTerm] = useState("")

   // Standardized fetchData for ProDataTable
   const fetchMasterSummaries = async (params) => {
      try {
         // ProDataTable passes { page, limit, search, columnFilters }
         const res = await apiClient.get("/api/dtn/master/summaries", {
            search: params.search
         })
         return res; // Already contains { success, data, meta }
      } catch (err) {
         console.error("Error fetching summaries:", err)
         return { success: false, data: [], meta: {} }
      }
   }

   // Fetch Job Details (Level 2)
   const fetchJobDetails = async (jobId) => {
      setLoading(true)
      try {
         const res = await apiClient.get(`/api/dtn/master/job/${jobId}`)
         if (res.success) {
            setMasterData(res.data || [])
            setView("details")
         }
      } catch (err) {
         console.error("Error fetching job details:", err)
      } finally {
         setLoading(false)
      }
   }

   useEffect(() => {
      // summaries are now fetched automatically by ProDataTable
   }, [])

   const handleViewDetails = (row) => {
      setSelectedJob(row)
      fetchJobDetails(row.job_id)
   }

   const handleBack = () => {
      setView("summary")
      setSelectedJob(null)
      setMasterData([])
   }

   // Summary Table Columns
   const summaryColumns = [
      { header: "Customer", accessorKey: "customer", className: "font-semibold" },
      { header: "PO", accessorKey: "po" },
      { header: "Job Number", accessorKey: "job_number", className: "font-bold text-primary" },
      {
         header: "Action",
         id: "action",
         cell: (row) => (
            <Button
               variant="outline"
               size="sm"
               className="flex items-center gap-2 cursor-pointer"
               onClick={() => handleViewDetails(row)}

            >
               <Eye className="h-3.5 w-3.5" />
               View
            </Button>
         )
      }
   ]

   return (
      <div className="flex-1 flex flex-col w-full h-full bg-slate-50/20 overflow-hidden text-slate-900">
         <header className="flex h-16 shrink-0 items-center gap-2 border-b px-6 bg-white sticky top-0 z-40">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-border mx-2" />
            <div className="flex items-center gap-2 text-sm">
               <Layers className="h-4 w-4 text-muted-foreground" />
               <span className="font-semibold text-foreground uppercase tracking-tight text-[13px]">Drawing Master</span>
            </div>
         </header>

         <main className="flex-1 overflow-auto p-6 flex flex-col">
            {view === "summary" ? (
               <div className="flex-1 flex flex-col w-full">
                  <div className="mb-8">
                     <h1 className="text-3xl font-bold mb-1 tracking-tight">Drawing Master</h1>
                     <p className="text-muted-foreground text-sm font-medium italic">Select a Job with existing transmittals to view its Drawing Master list.</p>
                  </div>

                  <ProDataTable
                     columns={summaryColumns}
                     fetchData={fetchMasterSummaries}
                     showSearch={true}
                     globalSearchPlaceholder="Search by Job, Customer or PO..."
                     className="border border-slate-200/60 shadow-sm rounded-xl overflow-hidden"
                  />
               </div>
            ) : (
               <div className="flex-1 flex flex-col w-full max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                     <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full hover:bg-slate-100">
                           <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                           <h1 className="text-2xl font-bold tracking-tight">Master List of Drawings</h1>
                           <p className="text-muted-foreground text-[13px] font-medium uppercase bg-slate-100 px-2 py-0.5 rounded inline-block mt-1">
                              Job: {selectedJob?.job_number} | PO: {selectedJob?.po} | {selectedJob?.customer}
                           </p>
                        </div>
                     </div>
                  </div>

                  <div className="flex gap-2 mb-6">
                     <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                           placeholder="Search drawings, titles..."
                           className="pl-10 h-10 border-slate-200 bg-white italic"
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                        />
                     </div>
                     <Button variant="outline" className="h-10 bg-white">
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                     </Button>
                  </div>

                  <Card className="rounded-xl shadow-md border border-slate-200 overflow-hidden flex-1 bg-white">
                     <CardContent className="p-0">
                        <div className="overflow-x-auto">
                           <table className="w-full border-collapse min-w-[1000px]">
                              <thead>
                                 <tr className="bg-slate-100/90 border-b">
                                    <th rowSpan={2} className="p-3 border-r text-[10px] font-bold uppercase text-slate-700 w-16 text-center">SR NO.</th>
                                    <th rowSpan={2} className="p-3 border-r text-[10px] font-bold uppercase text-slate-700 text-center w-64">DRG NO. / DOCUMENT NO.</th>
                                    {/* SHEET NO REMOVED PER USER REQUEST */}
                                    <th rowSpan={2} className="p-3 border-r text-[10px] font-bold uppercase text-slate-700 w-32 text-center">LATEST REV. NO</th>
                                    <th colSpan={5} className="p-2 border-r text-[10px] font-bold uppercase text-slate-700 text-center">DCR AND DATE</th>
                                    <th rowSpan={2} className="p-3 text-[10px] font-bold uppercase text-slate-700 text-center w-48 border-l">REMARK</th>
                                 </tr>
                                 <tr className="bg-slate-50/50 border-b">
                                    {[1, 2, 3, 4, 5].map(i => (
                                       <th key={i} className="p-2 border-r text-[10px] font-bold text-slate-600 text-center w-20">{i}</th>
                                    ))}
                                 </tr>
                              </thead>
                              <tbody className="bg-white">
                                 {masterData
                                    .filter(item =>
                                       item.drgNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                       (item.docName && item.docName.toLowerCase().includes(searchTerm.toLowerCase()))
                                    )
                                    .map((item, index) => (
                                       <MasterRow key={item.drgNo} item={item} index={index} />
                                    ))
                                 }

                                 {masterData.length === 0 && !loading && (
                                    <tr>
                                       <td colSpan={10} className="p-12 text-center text-slate-400 italic font-medium">
                                          No drawings found for this transmittal job.
                                       </td>
                                    </tr>
                                 )}

                                 {/* Empty rows to maintain table structure */}
                                 {masterData.length < 8 && Array.from({ length: 8 - masterData.length }).map((_, i) => (
                                    <tr key={`empty-${i}`} className="h-10 border-b last:border-0 opacity-40">
                                       <td className="border-r bg-slate-50/20"></td>
                                       <td className="border-r"></td>
                                       <td className="border-r"></td>
                                       <td className="border-r"></td>
                                       <td className="border-r"></td>
                                       <td className="border-r"></td>
                                       <td className="border-r"></td>
                                       <td className="border-r"></td>
                                       <td className="border-l"></td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </CardContent>
                  </Card>
               </div>
            )}
         </main>
      </div>
   )
}
