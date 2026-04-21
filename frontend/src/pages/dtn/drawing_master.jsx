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
   Download,
   Printer,
   Eye,
   ArrowLeft
} from "lucide-react"
import { cn } from "@/lib/utils"
import apiClient from "@/api/api.client"
import ProDataTable from "@/components/shared/ProDataTable"
import { exportApi } from "@/api/export.api"

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
            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
               {item.rev}
            </span>
         </td>

         {[0, 1, 2, 3, 4].map(idx => (
            <td key={idx} className={cn(
               "p-3 border-r text-center text-[11px] w-20 transition-all font-semibold",
               item.dcrs && item.dcrs[idx] ? "text-slate-800 bg-blue-50/10" : "text-slate-400"
            )}>
               {item.dcrs && item.dcrs[idx] ? item.dcrs[idx] : "-"}
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

   // Level 2 (Details) Fetching with Search Support
   const fetchJobDetails = async (jobId, searchStr = "") => {
      setLoading(true)
      try {
         const res = await apiClient.get(`/api/dtn/master/job/${jobId}`, { search: searchStr })
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

   // Debounced Search Implementation
   useEffect(() => {
      if (view === "details" && selectedJob) {
         const delayDebounceFn = setTimeout(() => {
            fetchJobDetails(selectedJob.job_id, searchTerm)
         }, 400) // 400ms debounce

         return () => clearTimeout(delayDebounceFn)
      }
   }, [searchTerm, view])

   const handleViewDetails = (row) => {
      setSelectedJob(row)
      setSearchTerm("") // Reset search when opening new job
      fetchJobDetails(row.job_id, "")
   }

   const handleBack = () => {
      setView("summary")
      setSelectedJob(null)
      setMasterData([])
      setSearchTerm("")
   }

   const handleExport = async (jobId, mode = 'download') => {
      const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : "";
      const endpoint = `/api/dtn/master/download/${jobId}${query}`;
      const filename = `MasterList_${selectedJob?.job_number}.pdf`;

      try {
         setLoading(true);
         if (mode === 'print') {
            // Logic similar to WPJCumulativePreview
            const response = await apiClient.get(endpoint, {}, { responseType: 'blob' });
            const blob = new Blob([response], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const printWindow = window.open(url, '_blank');
            if (printWindow) {
               printWindow.onload = () => {
                  printWindow.print();
               };
            }
         } else {
            // Logic similar to view_welding_joints
            await exportApi.download(endpoint, filename, {}, { contentType: 'application/pdf' });
         }
      } catch (err) {
         console.error("Export error:", err);
         alert("Could not generate PDF. Please try again.");
      } finally {
         setLoading(false);
      }
   }

   // Summary Table ColumnsInspection Preview —
   const summaryColumns = [
      { header: "Customer", accessorKey: "customer", className: "font-semibold" },
      { header: "PO", accessorKey: "po" },
      { header: "Job Number", accessorKey: "job_number", className: "font-bold text-blue-600" },
      {
         header: "Action",
         id: "action",
         cell: (row) => (
            <Button
               variant="outline"
               size="sm"
               className="flex items-center gap-2 cursor-pointer shadow-none border-slate-200 hover:border-blue-300 hover:text-blue-600 transition-all font-medium py-0 h-8 rounded-lg"
               onClick={() => handleViewDetails(row)}
            >
               <Eye className="h-3 w-3" />
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
               <Layers className="h-4 w-4 text-blue-600" />
               <span className="font-bold text-slate-800 uppercase tracking-tight text-[13px]">Drawing Master Board</span>
            </div>
         </header>

         <main className="flex-1 overflow-auto p-4 md:p-8">
            {view === "summary" ? (
               <div className="flex-1 flex flex-col w-full max-w-[1600px] mx-auto animate-in fade-in duration-500">
                  <div className="mb-8 flex items-end justify-between">
                     <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Master List Hub</h1>
                        <p className="text-slate-500 text-[14px] mt-1 font-medium">Global repository for all drawings and documents by project.</p>
                     </div>
                  </div>

                  <ProDataTable
                     columns={summaryColumns}
                     fetchData={fetchMasterSummaries}
                     showSearch={true}
                     globalSearchPlaceholder="Quick search projects..."
                     className="border border-slate-200/60 shadow-lg rounded-2xl overflow-hidden bg-white"
                  />
               </div>
            ) : (
               <div className="flex-1 flex flex-col w-full max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-3 duration-500">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                     <div className="flex items-center gap-5">
                        <Button variant="outline" size="icon" onClick={handleBack} className="rounded-xl border-slate-200 hover:bg-white hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm h-11 w-11">
                           <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                           <h1 className="text-2xl font-black tracking-tighter text-slate-900 border-l-4 border-blue-600 pl-4 uppercase">
                              Master List of Drawings
                           </h1>
                           <div className="flex items-center gap-3 mt-2 pl-4">
                              <span className="text-[10px] font-black uppercase bg-slate-900 text-white px-2.5 py-1 rounded tracking-widest shadow-sm">
                                 JOB: {selectedJob?.job_number}
                              </span>
                              <div className="h-1 w-1 rounded-full bg-slate-300" />
                              <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">
                                 {selectedJob?.customer} | PO: {selectedJob?.po}
                              </span>
                           </div>
                        </div>
                     </div>

                     <div className="flex items-center gap-2">
                        <Button 
                           variant="outline" 
                           className="h-10 px-4 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm"
                           onClick={() => handleExport(selectedJob?.job_id, 'print')}
                        >
                           <Printer className="h-4 w-4 text-slate-600" />
                           <span>Print</span>
                        </Button>
                        <Button 
                           className="h-10 px-4 bg-slate-950 hover:bg-slate-900 text-white rounded-lg font-medium flex items-center gap-2 transition-all shadow-md"
                           onClick={() => handleExport(selectedJob?.job_id, 'download')}
                        >
                           <Download className="h-4 w-4" />
                           <span>Download PDF</span>
                        </Button>
                     </div>
                  </div>

                  <div className="flex justify-end mb-6">
                     <div className="relative w-full max-w-sm group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                        <Input
                           placeholder="Filter drawing database..."
                           className="pl-11 h-12 border-slate-200 bg-white italic font-medium focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all shadow-sm rounded-xl"
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                        />
                     </div>
                  </div>

                  <Card className="rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden flex-1 bg-white">
                     <CardContent className="p-0">
                        <div className="overflow-x-auto">
                           <table className="w-full border-collapse min-w-[1000px]">
                              <thead>
                                 <tr className="bg-slate-50 border-b border-slate-200">
                                    <th rowSpan={2} className="p-4 border-r border-slate-200/60 text-[10px] font-bold uppercase text-slate-500 w-16 text-center">SR NO.</th>
                                    <th rowSpan={2} className="p-4 border-r border-slate-200/60 text-[10px] font-bold uppercase text-slate-500 text-center w-64">DRG NO. / DOCUMENT NO.</th>
                                    <th rowSpan={2} className="p-4 border-r border-slate-200/60 text-[10px] font-bold uppercase text-slate-500 w-32 text-center">LATEST REV. NO</th>
                                    <th colSpan={5} className="p-2 border-r border-slate-200/60 text-[10px] font-bold uppercase text-slate-500 text-center bg-slate-100/50">DCR AND DATE</th>
                                    <th rowSpan={2} className="p-4 text-[10px] font-bold uppercase text-slate-500 text-center w-48 bg-slate-50/50 shadow-inner">REMARK</th>
                                 </tr>
                                 <tr className="bg-slate-50/30 border-b border-slate-200">
                                    {[1, 2, 3, 4, 5].map(i => (
                                       <th key={i} className="p-2 border-r border-slate-200/60 text-[10px] font-bold text-slate-400 text-center w-20">{i}</th>
                                    ))}
                                 </tr>
                              </thead>
                              <tbody className="bg-white">
                                 {masterData.map((item, index) => (
                                    <MasterRow key={item.drgNo} item={item} index={index} />
                                 ))}

                                 {masterData.length === 0 && !loading && (
                                    <tr>
                                       <td colSpan={10} className="p-12 text-center text-slate-400 italic font-medium">
                                          {searchTerm ? `No drawings matching "${searchTerm}"` : "No drawings found for this job."}
                                       </td>
                                    </tr>
                                 )}

                                 {loading && masterData.length === 0 && (
                                    <tr>
                                       <td colSpan={10} className="p-12 text-center">
                                          <div className="flex items-center justify-center gap-2 text-slate-400 font-medium">
                                             <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                                             Searching drawing database...
                                          </div>
                                       </td>
                                    </tr>
                                 )}

                                 {masterData.length < 8 && Array.from({ length: 8 - masterData.length }).map((_, i) => (
                                    <tr key={`empty-${i}`} className="h-10 border-b last:border-0 opacity-40">
                                       <td className="border-r bg-slate-50/20"></td>
                                       <td className="border-r border-slate-200/60"></td>
                                       <td className="border-r border-slate-200/60"></td>
                                       <td className="border-r border-slate-200/60 font-semibold text-slate-200 text-center">-</td>
                                       <td className="border-r border-slate-200/60 text-center text-slate-200">-</td>
                                       <td className="border-r border-slate-200/60 text-center text-slate-200">-</td>
                                       <td className="border-r border-slate-200/60 text-center text-slate-200">-</td>
                                       <td className="border-r border-slate-200/60 text-center text-slate-200">-</td>
                                       <td className="bg-slate-50/10"></td>
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
