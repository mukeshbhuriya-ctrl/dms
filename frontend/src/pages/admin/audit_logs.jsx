import { useState, useCallback, useEffect, useMemo } from "react"
import { getAuditLogs, getAuditLogFilters, exportAuditLogs } from "@/api/audit-log.api"
import ProDataTable from "@/components/shared/ProDataTable"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import apiClient from "@/api/api.client"

/**
 * Format an ISO date string to a human-readable local timestamp.
 */
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

/**
 * AuditLogs — System Audit Log Viewer (Admin Only)
 * Layout follows create_user.jsx pattern exactly.
 */
function AuditLogs() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [columnFilters, setColumnFilters] = useState({})
  const [filterOptions, setFilterOptions] = useState({ modules: [], users: [], actions: [] })

  // Fetch filter options on mount
  useEffect(() => {
    getAuditLogFilters()
      .then((res) => {
        if (res.success && res.data) {
          setFilterOptions(res.data)
        }
      })
      .catch((err) => console.error("Failed to load audit log filters:", err))
  }, [refreshKey])

  // Build column filter options from dynamic data
  const moduleFilterOptions = useMemo(
    () => filterOptions.modules.map((m) => ({ value: m, label: m })),
    [filterOptions.modules]
  )
  const actionFilterOptions = useMemo(
    () =>
      (filterOptions.actions || ["created", "updated", "deleted"]).map((a) => ({
        value: a,
        label: a.charAt(0).toUpperCase() + a.slice(1),
      })),
    [filterOptions.actions]
  )
  const userFilterOptions = useMemo(
    () =>
      filterOptions.users.map((u) => ({
        value: u.name,
        label: `${u.name} (${u.empid})`,
      })),
    [filterOptions.users]
  )

  // Table columns — minimal, matching Excel export
  const columns = useMemo(
    () => [
      {
        accessorKey: "createdAt",
        header: "Event Time",
        filterType: "date",
        cell: (row) => formatTimestamp(row.createdAt),
      },
      {
        accessorKey: "user_name",
        header: "Employee Name",
        filterType: "select",
        isMulti: true,
        filterOptions: userFilterOptions,
        cell: (row) => row.user_name || "-",
      },
      {
        accessorKey: "user_empid",
        header: "Employee ID",
        cell: (row) => row.user_empid || "-",
      },
      {
        accessorKey: "action",
        header: "Action",
        filterType: "select",
        isMulti: true,
        filterOptions: actionFilterOptions,
        cell: (row) => (
          <span className="inline-flex items-center px-2 py-0.5 border border-slate-200 text-slate-600 text-[10px] font-semibold uppercase rounded-sm bg-white">
            {row.action}
          </span>
        ),
      },
      {
        accessorKey: "module",
        header: "Module",
        filterType: "select",
        isMulti: true,
        filterOptions: moduleFilterOptions,
        cell: (row) => row.module || "-",
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: (row) => row.description || "-",
      },
    ],
    [userFilterOptions, actionFilterOptions, moduleFilterOptions]
  )

  // Fetch data callback for ProDataTable
  const fetchData = useCallback(
    async ({ page, limit, search, columnFilters: cf }) => {
      const params = { page, limit, search }

      // Map column filters to API query params
      if (cf?.module?.length) params.module = cf.module.join(",")
      if (cf?.action?.length) params.action = cf.action.join(",")
      if (cf?.user_name?.length) params.user_name = cf.user_name.join(",")
      if (cf?.createdAt) {
        params.dateFrom = cf.createdAt;
        params.dateTo = cf.createdAt;
      }

      const res = await getAuditLogs(params)
      return { data: res.data || [], meta: res.meta || {} }
    },
    []
  )

  // Export handler
  const handleExport = async () => {
    try {
      const params = {}
      if (columnFilters.module?.length) params.module = columnFilters.module.join(",")
      if (columnFilters.action?.length) params.action = columnFilters.action.join(",")
      if (columnFilters.createdAt) {
        params.dateFrom = columnFilters.createdAt;
        params.dateTo = columnFilters.createdAt;
      }

      const blob = await exportAuditLogs(params)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Audit_Logs_${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (err) {
      console.error("Export failed:", err)
    }
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
      <main className="flex-1 flex flex-col overflow-auto p-6">
        <div className="w-full flex-1 flex flex-col">
          <ProDataTable
            columns={columns}
            fetchData={fetchData}
            onExport={handleExport}
            refreshKey={refreshKey}
            columnFilters={columnFilters}
            onFilterChange={(newFilters) => setColumnFilters((prev) => ({ ...prev, ...newFilters }))}
            globalSearchPlaceholder="Search..."
            showSelectionColumn={false}
            initialStickyColumns={["createdAt"]}
          />
        </div>
      </main>
    </>
  )
}

export default AuditLogs
