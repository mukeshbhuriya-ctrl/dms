import React, { useCallback, useMemo, useState } from "react";
import { Download, ArrowLeft, Clock, ShieldAlert, X } from "lucide-react";
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
  if (!val) return "Never";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "Never";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const BUCKET_LABELS = {
  "0-10": "0–10 Days (Active)",
  "11-20": "11–20 Days (Mild)",
  "21-30": "21–30 Days (Moderate)",
  "31-60": "31–60 Days (Inactive)",
  "61-90": "61–90 Days (Severe)",
  "90+": "> 90 Days (Abandoned)",
  "never": "Never Active / No History",
};

export default function UserInactivityRosterTable({
  initialBucket = "ALL",
  initialDepartmentId = null,
  onBackToAnalytics,
}) {
  const [bucketFilter, setBucketFilter] = useState(initialBucket || "ALL");
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  React.useEffect(() => {
    if (initialBucket) {
      setBucketFilter(initialBucket);
      setTableRefreshKey((k) => k + 1);
    }
  }, [initialBucket]);

  const fetchTableData = useCallback(
    async ({ page, pageSize, search, sorting }) => {
      try {
        const res = await userAnalyticsApi.getUserInactivity({
          department_id: initialDepartmentId || undefined,
        });

        const buckets = res.data?.buckets || {};
        let list = [];

        if (bucketFilter !== "ALL" && buckets[bucketFilter]) {
          list = buckets[bucketFilter].users || [];
        } else {
          Object.values(buckets).forEach((b) => {
            if (Array.isArray(b.users)) {
              list.push(...b.users);
            }
          });
        }

        // Apply client-side search across fetched user roster
        if (search && search.trim()) {
          const q = search.trim().toLowerCase();
          list = list.filter(
            (u) =>
              u.name?.toLowerCase().includes(q) ||
              u.empid?.toLowerCase().includes(q) ||
              u.department?.toLowerCase().includes(q) ||
              u.email?.toLowerCase().includes(q)
          );
        }

        // Sort
        const sortBy = sorting?.[0]?.id || "days_inactive";
        const isAsc = sorting?.[0]?.desc ? false : true;

        list.sort((a, b) => {
          let av = a[sortBy] ?? (sortBy === "days_inactive" ? 999999 : 0);
          let bv = b[sortBy] ?? (sortBy === "days_inactive" ? 999999 : 0);
          if (av < bv) return isAsc ? -1 : 1;
          if (av > bv) return isAsc ? 1 : -1;
          return 0;
        });

        const start = (page - 1) * pageSize;
        const paged = list.slice(start, start + pageSize);

        return {
          data: paged,
          total: list.length,
        };
      } catch (err) {
        toast.error("Failed to load user inactivity roster");
        return { data: [], total: 0 };
      }
    },
    [bucketFilter, initialDepartmentId]
  );

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await userAnalyticsApi.exportUserInactivity({
        department_id: initialDepartmentId || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `User_Inactivity_Ageing_Roster_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Inactivity roster exported successfully");
    } catch (err) {
      toast.error("Failed to export inactivity roster");
    } finally {
      setIsExporting(false);
    }
  };

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
        header: "Department",
        cell: (row) => {
          const item = resolveRow(row);
          return (
            <div>
              <p className="text-xs font-medium text-slate-800">{item.department}</p>
              <p className="text-[10px] text-slate-400">{item.designation}</p>
            </div>
          );
        },
      },
      {
        accessorKey: "bucket",
        header: "Inactivity Bucket",
        cell: (row) => {
          const item = resolveRow(row);
          const { bucket } = item;
          let badgeTone = "bg-slate-100 text-slate-700 border-slate-200";
          if (bucket === "0-10") badgeTone = "bg-emerald-50 text-emerald-700 border-emerald-200";
          else if (bucket === "11-20") badgeTone = "bg-blue-50 text-blue-700 border-blue-200";
          else if (bucket === "21-30") badgeTone = "bg-amber-50 text-amber-700 border-amber-200";
          else if (bucket === "31-60") badgeTone = "bg-orange-50 text-orange-700 border-orange-200";
          else if (bucket === "61-90" || bucket === "90+") badgeTone = "bg-red-50 text-red-700 border-red-200";

          return (
            <Badge className={`${badgeTone} text-[10px] font-bold`}>
              {BUCKET_LABELS[bucket] || bucket}
            </Badge>
          );
        },
      },
      {
        accessorKey: "days_inactive",
        header: "Days Inactive",
        cell: (row) => {
          const item = resolveRow(row);
          const { days_inactive } = item;
          if (days_inactive == null) {
            return <span className="text-xs text-slate-400 font-mono">Never</span>;
          }
          return (
            <span className={`text-xs font-bold font-mono ${days_inactive >= 30 ? "text-red-600" : "text-slate-800"}`}>
              {days_inactive}d
            </span>
          );
        },
      },
      {
        accessorKey: "last_login_at",
        header: "Last Login",
        cell: (row) => {
          const item = resolveRow(row);
          return (
            <span className="text-xs text-slate-700">
              {formatDateTime(item.last_login_at)}
            </span>
          );
        },
      },
      {
        accessorKey: "last_activity_at",
        header: "Last System Action",
        cell: (row) => {
          const item = resolveRow(row);
          return (
            <span className="text-xs text-slate-700">
              {formatDateTime(item.last_activity_at)}
            </span>
          );
        },
      },
      {
        accessorKey: "is_active",
        header: "Account State",
        cell: (row) => {
          const item = resolveRow(row);
          return (
            <Badge
              variant="outline"
              className={
                item.is_active
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                  : "bg-red-50 text-red-700 border-red-200 text-[10px]"
              }
            >
              {item.is_active ? "Active" : "Deactivated"}
            </Badge>
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
              User Inactivity & Ageing Analysis Roster
            </span>
            {bucketFilter !== "ALL" && (
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-semibold">
                Bucket: {BUCKET_LABELS[bucketFilter] || bucketFilter}
              </Badge>
            )}
          </div>

          <Select
            value={bucketFilter}
            onValueChange={(val) => {
              setBucketFilter(val);
              setTableRefreshKey((k) => k + 1);
            }}
          >
            <SelectTrigger className="w-[180px] h-9 text-xs bg-white font-medium border-slate-300">
              <SelectValue placeholder="All Buckets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">All Ageing Buckets</SelectItem>
              {Object.entries(BUCKET_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {bucketFilter !== "ALL" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setBucketFilter("ALL");
                setTableRefreshKey((k) => k + 1);
              }}
              className="h-9 text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-50 gap-1 font-medium"
            >
              <X className="w-3.5 h-3.5" />
              Reset Bucket
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs bg-white text-slate-700 border-slate-300 hover:bg-slate-50 font-medium"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? "Exporting..." : "Export to Excel"}
          </Button>

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
      globalSearchPlaceholder="Search by user, employee ID, department, email..."
      showSelectionColumn={false}
    />
  );
}
