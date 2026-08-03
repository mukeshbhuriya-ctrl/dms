import React, { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { PageContainer } from "@/components/layout/PageContainer"
import ProDataTable from "@/components/shared/ProDataTable"
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"
import { Eye, ShieldCheck, Flame, Pencil, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const MOCK_DATA = [
  { id: "1", permit_no: "WP-2026-001", job_type: "Hot Work, Confined Space", initiator: "Mukesh Bhuriya", current_stage: "Stage 2: Electrical", status: "PENDING", date: "2026-08-01T10:00:00Z" },
  { id: "2", permit_no: "WP-2026-002", job_type: "Working at Height", initiator: "Amit Sharma", current_stage: "Stage 5: Safety Approval", status: "PENDING", date: "2026-08-02T14:30:00Z" },
  { id: "3", permit_no: "WP-2026-003", job_type: "Electrical Work", initiator: "Rahul Verma", current_stage: "Issued", status: "APPROVED", date: "2026-08-03T09:15:00Z" },
]

export default function WorkPermitRegister() {
  const navigate = useNavigate()
  const [selectedRows, setSelectedRows] = useState(new Set())

  // Mock fetch data
  const fetchData = async ({ page, limit, search }) => {
    return new Promise(resolve => {
      setTimeout(() => {
        let filtered = [...MOCK_DATA]
        if (search) {
          filtered = filtered.filter(item => 
            item.permit_no.toLowerCase().includes(search.toLowerCase()) ||
            item.job_type.toLowerCase().includes(search.toLowerCase())
          )
        }
        resolve({
          data: filtered,
          meta: { total: filtered.length, page: 1, totalPages: 1 }
        })
      }, 400)
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "DRAFT": return "bg-slate-100 text-slate-500 border-slate-200"
      case "PENDING": return "bg-amber-100 text-amber-700 border-amber-200"
      case "APPROVED": return "bg-emerald-100 text-emerald-700 border-emerald-200"
      case "REJECTED": return "bg-red-100 text-red-700 border-red-200"
      default: return "bg-slate-100 text-slate-700"
    }
  }

  const columns = useMemo(() => [
    {
      id: "permit_no",
      accessorKey: "permit_no",
      header: "Permit No",
      width: "140px",
      cell: (row) => <span className="font-bold text-slate-700">{row.permit_no}</span>
    },
    {
      id: "date",
      accessorKey: "date",
      header: "Date",
      filterType: "date",
      width: "140px",
      cell: (row) => row.date ? new Date(row.date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }) : "-"
    },
    {
      id: "job_type",
      accessorKey: "job_type",
      header: "Job Types",
      filterType: "text",
      width: "250px",
      cell: (row) => (
        <div className="flex gap-1 flex-wrap">
          {row.job_type.split(',').map((job, idx) => (
            <Badge key={idx} variant="outline" className="bg-slate-50 text-slate-600 text-[10px] uppercase font-semibold h-5 px-1.5 border-slate-200 shadow-none">
              {job.trim()}
            </Badge>
          ))}
        </div>
      )
    },
    {
      id: "initiator",
      accessorKey: "initiator",
      header: "Initiator",
      filterType: "text",
      width: "150px"
    },
    {
      id: "current_stage",
      accessorKey: "current_stage",
      header: "Current Stage",
      filterType: "text",
      width: "200px",
      cell: (row) => (
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
          {row.current_stage}
        </span>
      )
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      filterType: "select",
      filterOptions: [
        { label: "Pending", value: "PENDING" },
        { label: "Approved", value: "APPROVED" },
        { label: "Rejected", value: "REJECTED" },
      ],
      width: "120px",
      cell: (row) => (
        <Badge variant="outline" className={`${getStatusColor(row.status)} shadow-none text-[10px] h-5 tracking-wide uppercase font-bold`}>
          {row.status}
        </Badge>
      )
    },
    {
      id: "actions",
      header: "Actions",
      width: "80px",
      cell: (row) => {
        const rowActions = [
          {
            label: "View Permit",
            icon: Eye,
            onClick: () => navigate(`/work-permit/create?id=${row.id}`)
          },
          { type: "separator" },
          {
            label: "Action Required",
            icon: ArrowRight,
            onClick: () => navigate(`/work-permit/create?id=${row.id}&action=true`)
          }
        ]
        return <DataTableRowActions actions={rowActions} />
      }
    }
  ], [navigate])

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Flame className="h-6 w-6 text-amber-500" />
            Work Permit Register
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage and track all work permits across different approval stages.</p>
        </div>
      </div>
      
      <div className="h-[calc(100vh-160px)]">
        <ProDataTable
          columns={columns}
          fetchData={fetchData}
          refreshKey={0}
          onAdd={() => navigate('/work-permit/create')}
          onAddTooltip="Initiate New Permit"
          globalSearchPlaceholder="Search by permit no or job type..."
          selectedRows={selectedRows}
          onSelectionChange={setSelectedRows}
          initialStickyColumns={["permit_no", "job_type"]}
        />
      </div>
    </PageContainer>
  )
}
