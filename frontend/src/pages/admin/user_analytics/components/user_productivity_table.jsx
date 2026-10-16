import React, { useCallback, useMemo, useState } from "react";
import { Download, ArrowLeft, Activity, UserCheck, AlertTriangle, UserX, X } from "lucide-react";
import { toast } from "react-toastify";
import ProDataTable from "@/components/shared/ProDataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import userAnalyticsApi from "@/api/user_analytics.api";

function formatDateTime(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UserProductivityTable({
  initialTier = "ALL",
  initialDepartmentId = null,
  initialStartDate = null,
  initialEndDate = null,
  onBackToAnalytics,
}) {
  const [tierFilter, setTierFilter] = useState(initialTier || "ALL");
  const [tableRefreshKey, setTableRefreshKey] = useState(0);

  React.useEffect(() => {
    if (initialTier) {
      setTierFilter(initialTier);
      setTableRefreshKey((k) => k + 1);
    }
  }, [initialTier]);

  const fetchTableData = useCallback(
    async ({ page, pageSize, search, sorting }) => {
      try {
        const sortBy = sorting?.[0]?.id || "totalOperations";
        const sortOrder = sorting?.[0]?.desc ? "desc" : "asc";

        const params = {
          page,
          limit: pageSize,
          search: search || undefined,
          department_id: initialDepartmentId || undefined,
          startDate: initialStartDate || undefined,
          endDate: initialEndDate || undefined,
          tier: tierFilter !== "ALL" ? tierFilter : undefined,
          sortBy,
          sortOrder,
        };

        const res = await userAnalyticsApi.getUserProductivityRecords(params);

        return {
          data: res.data || [],
          total: res.pagination?.total || 0,
        };
      } catch (err) {
        toast.error("Failed to load user productivity records");
        return { data: [], total: 0 };
      }
    },
    [tierFilter, initialDepartmentId, initialStartDate, initialEndDate]
  );

  const resolveRow = (r) => (r && r.original !== undefined ? r.original : r) || {};

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "User / Employee",
        cell: (row) => {
          const item = resolveRow(row);
          return (
            <div>
              <p className="font-semibold text-slate-900 text-xs">{item.name}</p>
              <p className="text-[11px] font-mono text-slate-500">{item.empid}</p>
            </div>
          );
        },
      },
      {
        accessorKey: "department",
        header: "Department & Role",
        cell: (row) => {
          const item = resolveRow(row);
          const roles = Array.isArray(item.roles) ? item.roles : [];
          return (
            <div>
              <p className="text-xs font-medium text-slate-800">{item.department}</p>
              <p className="text-[10px] text-slate-500 truncate max-w-[140px]">
                {roles.join(", ") || item.designation}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "tier",
        header: "Engagement Tier",
        cell: (row) => {
          const item = resolveRow(row);
          const { tier = "DORMANT", isActuallyActive, totalOperations = 0 } = item;
          if (tier === "ACTIVE" || isActuallyActive) {
            return (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                Active Working Users ({totalOperations} ops)
              </Badge>
            );
          }
          if (tier === "PASSIVE") {
            return (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                Passive Users (0 edits)
              </Badge>
            );
          }
          return (
            <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]">
              Inactive Users (No Logins)
            </Badge>
          );
        },
      },
      {
        accessorKey: "totalOperations",
        header: "Total Operations",
        cell: (row) => {
          const item = resolveRow(row);
          return (
            <span className="text-xs font-bold font-mono text-slate-900">
              {item.totalOperations || 0}
            </span>
          );
        },
      },
      {
        id: "breakdown",
        header: "Created / Updated / Deleted",
        cell: (row) => {
          const item = resolveRow(row);
          const { createdCount = 0, updatedCount = 0, deletedCount = 0 } = item;
          return (
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <span className="text-emerald-700 font-semibold">{createdCount}c</span>
              <span className="text-slate-300">/</span>
              <span className="text-blue-700 font-semibold">{updatedCount}u</span>
              <span className="text-slate-300">/</span>
              <span className="text-rose-700 font-semibold">{deletedCount}d</span>
            </div>
          );
        },
      },
      {
        accessorKey: "topModule",
        header: "Top Active Module",
        cell: (row) => {
          const item = resolveRow(row);
          const mod = item.topModule || "-";
          return (
            <Badge variant="outline" className="text-[10px] font-medium text-slate-700 bg-slate-50 border-slate-200 max-w-[140px] truncate">
              {mod}
            </Badge>
          );
        },
      },
      {
        accessorKey: "latestActionInPeriod",
        header: "Last Activity in Period",
        cell: (row) => {
          const item = resolveRow(row);
          return (
            <span className="text-xs text-slate-600">
              {formatDateTime(item.latestActionInPeriod)}
            </span>
          );
        },
      },
      {
        accessorKey: "last_login_at",
        header: "Last Login Timestamp",
        cell: (row) => {
          const item = resolveRow(row);
          return (
            <span className="text-xs text-slate-600">
              {formatDateTime(item.last_login_at)}
            </span>
          );
        },
      },
    ],
    []
  );

  return (
    <ProDataTable
      columns={columns}
      fetchData={fetchTableData}
      refreshKey={tableRefreshKey}
      customToolbarActions={
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-900">
              User Productivity & Audit Operations Ledger
            </span>
            {tierFilter !== "ALL" && (
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-semibold">
                Filter: {tierFilter}
              </Badge>
            )}
          </div>

          <Select
            value={tierFilter}
            onValueChange={(val) => {
              setTierFilter(val);
              setTableRefreshKey((k) => k + 1);
            }}
          >
            <SelectTrigger className="w-[160px] h-9 text-xs bg-white font-medium border-slate-300">
              <SelectValue placeholder="All Tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">All Tiers</SelectItem>
              <SelectItem value="ACTIVE" className="text-xs">Active Working Users (1+ Ops)</SelectItem>
              <SelectItem value="PASSIVE" className="text-xs">Passive Users (0 Ops)</SelectItem>
              <SelectItem value="DORMANT" className="text-xs">Inactive Users (No Logins)</SelectItem>
              <SelectItem value="DEACTIVATED" className="text-xs">Deactivated Accounts</SelectItem>
            </SelectContent>
          </Select>

          {tierFilter !== "ALL" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setTierFilter("ALL");
                setTableRefreshKey((k) => k + 1);
              }}
              className="h-9 text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-50 gap-1 font-medium"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filter
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onBackToAnalytics}
            className="h-9 px-2.5 text-xs font-semibold gap-1.5 text-slate-700 hover:text-slate-900 bg-white border-slate-300 hover:bg-slate-100 shadow-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Analytics
          </Button>
        </div>
      }
      globalSearchPlaceholder="Search by user name, employee ID, department..."
      showSelectionColumn={false}
    />
  );
}
