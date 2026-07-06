import { useState, useCallback, useEffect, useMemo } from "react"
import apiClient from "@/api/api.client"
import ProDataTable from "@/components/shared/ProDataTable"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Eye, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

const formatTimestamp = (iso) => {
  if (!iso) return "-"
  const d = new Date(iso)
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })
}

function DebugTraces() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [columnFilters, setColumnFilters] = useState({
      startTime: new Date().toISOString().split('T')[0] // default to today
  })
  
  // Sheet states
  const [selectedTrace, setSelectedTrace] = useState(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const columns = useMemo(
    () => [
      {
        accessorKey: "startTime",
        header: "Event Time",
        filterType: "date",
        cell: (row) => formatTimestamp(row.startTime),
      },
      {
        accessorKey: "traceId",
        header: "Trace ID",
        cell: (row) => (
            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                {row.traceId}
            </span>
        )
      },
      {
        accessorKey: "performer",
        header: "Performer",
        cell: (row) => row.performer || "System",
      },
      {
        accessorKey: "activity",
        header: "Activity / Module",
        cell: (row) => row.activity || "Unknown Procedure",
      },
      {
        accessorKey: "status",
        header: "Status",
        filterType: "select",
        isMulti: false,
        filterOptions: [
            { value: "SUCCESS", label: "Success" },
            { value: "FAILED", label: "Failed" }
        ],
        cell: (row) => {
          const isFailed = row.status === 'FAILED'
          return (
            <span className={`inline-flex items-center text-[11px] font-bold uppercase tracking-wider ${isFailed ? 'text-red-500' : 'text-emerald-500'}`}>
              {row.status}
            </span>
          )
        },
      },
      {
        id: "actions",
        header: "Trace",
        cell: (row) => (
            <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => {
                    setSelectedTrace(row)
                    setIsSheetOpen(true)
                }}
            >
                <Eye className="h-4 w-4 mr-1" />
                View
            </Button>
        )
      }
    ],
    []
  )

  const fetchData = useCallback(
    async ({ page, limit, search, columnFilters: cf }) => {
      // In a real paginated API, we'd pass page/limit.
      // Our trace API currently returns all for a day, so we handle pagination locally for now.
      
      const params = {}
      if (search) params.search = search
      if (cf?.startTime) params.date = cf.startTime
      if (cf?.traceId) params.traceId = cf.traceId

      try {
          const res = await apiClient.get('/api/admin/debug-traces', params)
          let data = res?.data || []
          
          // Apply local filters if API doesn't handle them fully yet
          if (cf?.status) {
              data = data.filter(d => d.status === cf.status)
          }

          // Local pagination
          const startIndex = (page - 1) * limit
          const paginatedData = data.slice(startIndex, startIndex + limit)

          return { 
              data: paginatedData, 
              meta: {
                  page,
                  limit,
                  total: data.length,
                  totalPages: Math.ceil(data.length / limit)
              } 
          }
      } catch (err) {
          console.error("Failed to fetch traces:", err)
          return { data: [], meta: { total: 0 } }
      }
    },
    []
  )

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <h1 className="text-lg font-semibold text-slate-800 ml-2">System Execution Traces</h1>
      </header>
      
      <main className="flex-1 flex flex-col overflow-auto p-6">
        <div className="w-full flex-1 flex flex-col">
          <ProDataTable
            columns={columns}
            fetchData={fetchData}
            refreshKey={refreshKey}
            columnFilters={columnFilters}
            onFilterChange={(newFilters) => setColumnFilters((prev) => ({ ...prev, ...newFilters }))}
            globalSearchPlaceholder="Search by Trace ID or activity..."
            showSelectionColumn={false}
            initialStickyColumns={["startTime"]}
          />
        </div>
      </main>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          <SheetHeader className="mb-6 border-b pb-4">
            <SheetTitle className="text-lg flex items-center gap-2">
                Execution Pipeline
                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                    {selectedTrace?.traceId}
                </span>
            </SheetTitle>
            <SheetDescription>
              Chronological log of system events for this procedure.
            </SheetDescription>
          </SheetHeader>
          
          <div className="relative border-l-2 border-slate-200 ml-2 pl-6 space-y-4">
            {selectedTrace?.steps?.map((step, idx) => (
                <div key={idx} className="relative group">
                    <div className={`absolute -left-[31px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                        step.level === 'ERROR' ? 'bg-red-500 scale-125' : 
                        step.level === 'WARN' ? 'bg-amber-400' : 'bg-slate-400'
                    }`}></div>
                    
                    <div className="flex flex-col gap-1 mb-4 hover:bg-slate-50 p-2 -ml-2 rounded transition-colors">
                        <div className="flex items-center text-xs font-medium text-slate-400 gap-1 mb-1">
                            <Clock className="w-3 h-3" />
                            {formatTimestamp(step.timestamp)}
                        </div>
                        
                        <div className={`text-sm font-mono whitespace-pre-wrap break-words w-full ${
                            step.level === 'ERROR' ? 'text-red-700 font-bold bg-red-50 p-3 rounded-md border border-red-100' : 
                            step.level === 'WARN' ? 'text-amber-700 font-semibold bg-amber-50 p-2 rounded-md border border-amber-100' : 
                            'text-slate-700 bg-slate-50 border border-slate-100 p-2 rounded-md'
                        }`}>
                            {step.message.replace(/\[TRC-[a-f0-9]+\]\s*/g, '')}
                        </div>
                    </div>
                </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export default DebugTraces
