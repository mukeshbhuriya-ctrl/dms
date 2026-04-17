import React, { useState, useMemo } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Search,
  Download,
  Filter
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Master List Table Row ──────────────────────────────────────────────────
// Handles rowspanning and specific styling for the master list
const MasterRow = ({ item, index }) => {
  return (
     <>
       {item.sheets.map((sheet, sIdx) => (
          <tr key={`${item.drgNo}-${sheet.no}`} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors group">
             {/* Sr No - only shows in first sheet row if spanning */}
             {sIdx === 0 && (
                <td 
                  rowSpan={item.sheets.length} 
                  className="p-3 border-r text-center text-[11px] font-bold text-slate-500 bg-slate-50/30 w-16"
                >
                   {index + 1}
                </td>
             )}

             {/* Drg No - only shows in first sheet row if spanning */}
             {sIdx === 0 && (
                <td 
                  rowSpan={item.sheets.length} 
                  className="p-3 border-r text-center text-[12px] font-bold uppercase w-64"
                >
                   {item.drgNo}
                </td>
             )}

             {/* Sheet No */}
             <td className={cn(
                "p-3 border-r text-center text-[11px] font-medium w-24",
                sheet.isBold && "font-bold text-slate-900"
             )}>
                {sheet.no}
             </td>

             {/* Latest Rev No */}
             <td className={cn(
                "p-3 border-r text-center text-[11px] font-medium w-32",
                sheet.isBold && "font-bold text-slate-900"
             )}>
                {sheet.rev}
             </td>

             {/* DCR AND DATE Columns (1-5) */}
             {[1, 2, 3, 4, 5].map(col => (
                <td key={col} className="p-3 border-r text-center text-[11px] w-20">
                   {/* Data here would go under respective revision column */}
                </td>
             ))}

             {/* Remark - only shows in first sheet row or per sheet based on logic. 
                 Screenshot shows some Remarks associated with specific rows or spanning. 
                 For GA DRAWING it looks item-level. */}
             {sIdx === 0 && (
                <td 
                  rowSpan={item.sheets.length} 
                  className="p-3 border-r text-center text-[10px] uppercase font-semibold text-slate-500 italic"
                >
                   {item.remark || "-"}
                </td>
             )}
          </tr>
       ))}
     </>
  )
}

// ─── Main View ──────────────────────────────────────────────────────────────
export default function DrawingMaster() {
  const [searchTerm, setSearchTerm] = useState("")

  const masterData = [
    { drgNo: "CFBR-001-01", sheets: [{ no: "1 OF 1", rev: "00" }], remark: "GA DRAWING" },
    { drgNo: "CFBR-001-02", sheets: [
        { no: "1 OF 3", rev: "02", isBold: true },
        { no: "2 OF 3", rev: "02" },
        { no: "3 OF 3", rev: "01" }
    ], remark: "" },
    { drgNo: "CFBR-001-03", sheets: [{ no: "1 OF 1", rev: "01" }] },
    { drgNo: "VT-CFBR-001-04", sheets: [
        { no: "1 OF 2", rev: "01" },
        { no: "2 OF 2", rev: "01" }
    ] },
    { drgNo: "VT-CFBR-001-05", sheets: [
        { no: "1 OF 2", rev: "02" },
        { no: "2 OF 2", rev: "02" }
    ] },
    { drgNo: "VT-CFBR-001-06", sheets: [{ no: "1 OF 1", rev: "00" }] },
    { drgNo: "VT-CFBR-001-07", sheets: [
        { no: "1 OF 2", rev: "00" },
        { no: "2 OF 2", rev: "00" }
    ] },
    { drgNo: "VT-CFBR-001-09", sheets: [{ no: "1 OF 1", rev: "00", isBold: true }], remark: "GA DRAWING" },
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
        <div className="flex-1 flex flex-col w-full">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-1 tracking-tight">Master List of Drawings</h1>
              <p className="text-muted-foreground text-sm font-medium italic">Track document revisions, sheets, and DCR history.</p>
            </div>
            {/* <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button size="sm" className="h-9">
                <Plus className="h-4 w-4 mr-2" />
                Add Drawing
              </Button>
            </div> */}
          </div>

          <div className="flex gap-2 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search drawings, titles..." 
                className="pl-10 h-10 border-muted-foreground/20 italic" 
              />
            </div>
            <Button variant="outline" className="h-10">
               <Filter className="h-4 w-4 mr-2" />
               Filters
            </Button>
          </div>

          <Card className="rounded-xl shadow-sm border border-muted-foreground/20 overflow-hidden flex-1">
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[1200px]">
                     <thead>
                        <tr className="bg-slate-100/80 border-b">
                           <th rowSpan={2} className="p-3 border-r text-[10px] font-bold uppercase text-slate-700 w-16 text-center">SR NO.</th>
                           <th rowSpan={2} className="p-3 border-r text-[10px] font-bold uppercase text-slate-700 text-center w-64">DRG NO. / DOCUMENT NO.</th>
                           <th rowSpan={2} className="p-3 border-r text-[10px] font-bold uppercase text-slate-700 w-24 text-center">SHEET NO</th>
                           <th rowSpan={2} className="p-3 border-r text-[10px] font-bold uppercase text-slate-700 w-32 text-center">LATEST REV. NO</th>
                           <th colSpan={5} className="p-2 border-r text-[10px] font-bold uppercase text-slate-700 text-center">DCR AND DATE</th>
                           <th rowSpan={2} className="p-3 text-[10px] font-bold uppercase text-slate-700 text-center w-48 border-l">REMARK</th>
                        </tr>
                        <tr className="bg-slate-50 border-b">
                           <th className="p-2 border-r text-[10px] font-bold text-slate-600 text-center w-20">1</th>
                           <th className="p-2 border-r text-[10px] font-bold text-slate-600 text-center w-20">2</th>
                           <th className="p-2 border-r text-[10px] font-bold text-slate-600 text-center w-20">3</th>
                           <th className="p-2 border-r text-[10px] font-bold text-slate-600 text-center w-20">4</th>
                           <th className="p-2 border-r text-[10px] font-bold text-slate-600 text-center w-20">5</th>
                        </tr>
                     </thead>
                     <tbody className="bg-white">
                        {masterData.map((item, index) => (
                          <MasterRow key={item.drgNo} item={item} index={index} />
                        ))}
                        
                        {/* Empty rows to match SS matrix look */}
                        {[1, 2, 3, 4, 5].map(i => (
                           <tr key={i} className="h-10 border-b last:border-0 hover:bg-slate-50/30 transition-colors">
                              <td className="border-r"></td>
                              <td className="border-r"></td>
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
      </main>
    </div>
  )
}
