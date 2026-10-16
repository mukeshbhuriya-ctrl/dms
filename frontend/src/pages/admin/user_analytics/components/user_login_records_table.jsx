import React, { useCallback, useMemo, useState, useEffect } from "react";
import { Download, ArrowLeft, History, ExternalLink, X } from "lucide-react";
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
    second: "2-digit",
  });
}

function formatDuration(sec) {
  if (sec == null) return "Active";
  const s = Number(sec);
  if (isNaN(s) || s <= 0) return "< 1s";
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export default function UserLoginRecordsTable({
  initialStatus = "ALL",
  initialDepartmentId = null,
  initialStartDate = null,
  initialEndDate = null,
  onBackToAnalytics,
}) {
  const [statusFilter, setStatusFilter] = useState(initialStatus || "ALL");
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // Drill-down flat screen view for selected user's sessions
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSessionStatusFilter, setUserSessionStatusFilter] = useState("ALL");
  const [userSessionRefreshKey, setUserSessionRefreshKey] = useState(0);
  const [isExportingUserHistory, setIsExportingUserHistory] = useState(false);

  useEffect(() => {
    if (initialStatus) {
      setStatusFilter(initialStatus);
      setTableRefreshKey((k) => k + 1);
    }
  }, [initialStatus]);

  const resolveRow = (r) => (r && r.original !== undefined ? r.original : r) || {};

  // Fetch unique users overview (grouped by user)
  const fetchTableData = useCallback(
    async ({ page, pageSize, search, sorting }) => {
      try {
        const sortBy = sorting?.[0]?.id || "last_login_at";
        const sortOrder = sorting?.[0]?.desc ? "desc" : "asc";

        const params = {
          page,
          limit: pageSize,
          search: search || undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          department_id: initialDepartmentId || undefined,
          startDate: initialStartDate || undefined,
          endDate: initialEndDate || undefined,
          groupByUser: true,
          sortBy,
          sortOrder,
        };

        const res = await userAnalyticsApi.getUserLoginRecords(params);
        return {
          data: res.data || [],
          total: res.pagination?.total || 0,
        };
      } catch (err) {
        toast.error("Failed to load user login activity records");
        return { data: [], total: 0 };
      }
    },
    [statusFilter, initialDepartmentId, initialStartDate, initialEndDate]
  );

  // Fetch individual session logs for the selected user (Flat Screen View)
  const fetchUserSessionData = useCallback(
    async ({ page, pageSize, search, sorting }) => {
      const targetUserId = selectedUser?.user_id || selectedUser?.id;
      if (!targetUserId) return { data: [], total: 0 };
      try {
        const sortBy = sorting?.[0]?.id || "login_at";
        const sortOrder = sorting?.[0]?.desc ? "desc" : "asc";

        const params = {
          user_id: targetUserId,
          page,
          limit: pageSize,
          search: search || undefined,
          status: userSessionStatusFilter !== "ALL" ? userSessionStatusFilter : undefined,
          startDate: initialStartDate || undefined,
          endDate: initialEndDate || undefined,
          sortBy,
          sortOrder,
        };

        const res = await userAnalyticsApi.getUserLoginRecords(params);
        return {
          data: res.data || [],
          total: res.pagination?.total || 0,
        };
      } catch (err) {
        toast.error("Failed to load user session records");
        return { data: [], total: 0 };
      }
    },
    [selectedUser, userSessionStatusFilter, initialStartDate, initialEndDate]
  );

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const params = {
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        department_id: initialDepartmentId || undefined,
        startDate: initialStartDate || undefined,
        endDate: initialEndDate || undefined,
        groupByUser: true,
      };
      const blob = await userAnalyticsApi.exportUserLogins(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Unique_User_Logins_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Unique user login summary exported successfully");
    } catch (err) {
      toast.error("Failed to export login activity report");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportUserHistory = async () => {
    const targetUserId = selectedUser?.user_id || selectedUser?.id;
    if (!targetUserId) return;
    try {
      setIsExportingUserHistory(true);
      const params = {
        user_id: targetUserId,
        status: userSessionStatusFilter !== "ALL" ? userSessionStatusFilter : undefined,
        startDate: initialStartDate || undefined,
        endDate: initialEndDate || undefined,
      };
      const blob = await userAnalyticsApi.exportUserLogins(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const sanitizedName = (selectedUser.user_name || "User").replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `Session_History_${sanitizedName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Exported session history for ${selectedUser.user_name}`);
    } catch (err) {
      toast.error("Failed to export user session history");
    } finally {
      setIsExportingUserHistory(false);
    }
  };

  // ── Columns for Unique Users Overview Ledger ──
  const uniqueUsersColumns = useMemo(
    () => [
      {
        accessorKey: "user_name",
        header: "User / Employee",
        cell: (row) => {
          const item = resolveRow(row);
          return (
            <div>
              <button
                type="button"
                onClick={() => {
                  setSelectedUser(item);
                  setUserSessionStatusFilter("ALL");
                  setUserSessionRefreshKey((k) => k + 1);
                }}
                className="font-semibold text-blue-600 hover:text-blue-800 hover:underline text-xs text-left flex items-center gap-1 group"
                title="Click to view detailed session history"
              >
                <span>{item.user_name || "Unknown"}</span>
                <ExternalLink className="w-3 h-3 text-blue-400 group-hover:text-blue-700 transition-colors" />
              </button>
              <p className="text-[11px] font-mono text-slate-500">{item.employee_id || "—"}</p>
            </div>
          );
        },
      },
      {
        accessorKey: "department_name",
        header: "Department & Roles",
        cell: (row) => {
          const item = resolveRow(row);
          const roles = Array.isArray(item.role_names) ? item.role_names : [];
          return (
            <div>
              <p className="text-xs font-medium text-slate-800">{item.department_name || "—"}</p>
              {roles.length > 0 && (
                <p className="text-[10px] text-slate-500 truncate max-w-[150px]">
                  {roles.join(", ")}
                </p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "last_login_at",
        header: "Last Logged In",
        cell: (row) => {
          const item = resolveRow(row);
          return (
            <span className="text-xs text-slate-700 font-medium">
              {formatDateTime(item.last_login_at || item.login_at)}
            </span>
          );
        },
      },
      {
        accessorKey: "total_logins",
        header: "Logins in Period",
        cell: (row) => {
          const item = resolveRow(row);
          return (
            <Badge variant="outline" className="text-[11px] font-semibold bg-slate-50 text-slate-700 border-slate-200">
              {item.total_logins || 1} {item.total_logins === 1 ? "login" : "logins"}
            </Badge>
          );
        },
      },
      {
        accessorKey: "active_session",
        header: "Current Session Status",
        cell: (row) => {
          const item = resolveRow(row);
          return item.active_session ? (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold flex items-center gap-1 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Now
            </Badge>
          ) : (
            <Badge variant="outline" className="text-slate-500 bg-slate-50 border-slate-200 text-[10px] font-medium">
              Logged Out
            </Badge>
          );
        },
      },
      {
        accessorKey: "ip_address",
        header: "Latest Device & IP",
        cell: (row) => {
          const item = resolveRow(row);
          const { ip_address, user_agent } = item;
          return (
            <div className="max-w-[180px]">
              <p className="text-xs font-mono text-slate-800">{ip_address || "—"}</p>
              {user_agent && (
                <p className="text-[10px] text-slate-400 truncate" title={user_agent}>
                  {user_agent}
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Details",
        cell: (row) => {
          const item = resolveRow(row);
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedUser(item);
                setUserSessionStatusFilter("ALL");
                setUserSessionRefreshKey((k) => k + 1);
              }}
              className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 text-blue-700 bg-blue-50/70 hover:bg-blue-100 hover:text-blue-900 border-blue-200"
            >
              <History className="w-3.5 h-3.5" />
              View History
            </Button>
          );
        },
      },
    ],
    []
  );

  // ── Columns for Specific User's Full Session Details Table (Flat Screen View) ──
  const userSessionColumns = useMemo(
    () => [
      {
        accessorKey: "status",
        header: "Status",
        cell: (row) => {
          const item = resolveRow(row);
          const { status, failure_reason } = item;
          const isSuccess = status === "SUCCESS";
          return (
            <div>
              <Badge
                className={
                  isSuccess
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold"
                    : "bg-red-50 text-red-700 border-red-200 text-[10px] font-bold"
                }
              >
                {isSuccess ? "Success" : "Failed"}
              </Badge>
              {failure_reason && (
                <p className="text-[10px] text-red-600 mt-0.5 truncate max-w-[140px]" title={failure_reason}>
                  {failure_reason.replace(/_/g, " ")}
                </p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "login_at",
        header: "Login Timestamp",
        cell: (row) => {
          const item = resolveRow(row);
          return (
            <span className="text-xs text-slate-700 font-medium">
              {formatDateTime(item.login_at)}
            </span>
          );
        },
      },
      {
        accessorKey: "logout_at",
        header: "Logout Timestamp",
        cell: (row) => {
          const item = resolveRow(row);
          const { logout_at } = item;
          return (
            <span className="text-xs text-slate-700">
              {logout_at ? (
                formatDateTime(logout_at)
              ) : (
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                  Active Session
                </Badge>
              )}
            </span>
          );
        },
      },
      {
        accessorKey: "session_duration",
        header: "Session Duration",
        cell: (row) => {
          const item = resolveRow(row);
          const { session_duration } = item;
          return (
            <span className="text-xs font-mono font-medium text-slate-800">
              {formatDuration(session_duration)}
            </span>
          );
        },
      },
      {
        accessorKey: "ip_address",
        header: "IP & Device",
        cell: (row) => {
          const item = resolveRow(row);
          const { ip_address, user_agent } = item;
          return (
            <div className="max-w-[220px]">
              <p className="text-xs font-mono text-slate-800">{ip_address || "—"}</p>
              {user_agent && (
                <p className="text-[10px] text-slate-400 truncate" title={user_agent}>
                  {user_agent}
                </p>
              )}
            </div>
          );
        },
      },
    ],
    []
  );

  // ── FLAT SCREEN VIEW 1: Specific User's Full Session Details ──
  if (selectedUser) {
    return (
      <div className="space-y-3">
        {/* Flat User Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-slate-200 rounded-lg shadow-xs">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedUser(null)}
              className="h-8 px-2.5 text-xs font-semibold gap-1.5 text-slate-700 hover:text-slate-900 bg-white border-slate-300 hover:bg-slate-100 shadow-none"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Users
            </Button>
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  {selectedUser.user_name || "User"} — Login & Session Details
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-0.5">
                <span>
                  <strong className="text-slate-700 font-medium">Emp ID:</strong> {selectedUser.employee_id || "—"}
                </span>
                <span>•</span>
                <span>
                  <strong className="text-slate-700 font-medium">Department:</strong> {selectedUser.department_name || "—"}
                </span>
                {Array.isArray(selectedUser.role_names) && selectedUser.role_names.length > 0 && (
                  <>
                    <span>•</span>
                    <span>
                      <strong className="text-slate-700 font-medium">Roles:</strong> {selectedUser.role_names.join(", ")}
                    </span>
                  </>
                )}
                <span>•</span>
                <span>
                  <strong className="text-slate-700 font-medium">Total Logins:</strong> {selectedUser.total_logins || 1}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedUser.active_session ? (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold gap-1.5 py-1 px-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active Session Right Now
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-xs py-1 px-2.5">
                Currently Logged Out
              </Badge>
            )}
          </div>
        </div>

        {/* Flat Full-Screen Session Table */}
        <ProDataTable
          columns={userSessionColumns}
          fetchData={fetchUserSessionData}
          refreshKey={userSessionRefreshKey}
          customToolbarActions={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">
                  Session Records
                </span>
                {userSessionStatusFilter !== "ALL" && (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-semibold">
                    Status: {userSessionStatusFilter}
                  </Badge>
                )}
              </div>

              <Select
                value={userSessionStatusFilter}
                onValueChange={(val) => {
                  setUserSessionStatusFilter(val);
                  setUserSessionRefreshKey((k) => k + 1);
                }}
              >
                <SelectTrigger className="w-[125px] h-9 text-xs bg-white font-medium border-slate-300">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">All Statuses</SelectItem>
                  <SelectItem value="SUCCESS" className="text-xs">Successful Only</SelectItem>
                  <SelectItem value="FAILED" className="text-xs">Failed Only</SelectItem>
                </SelectContent>
              </Select>

              {userSessionStatusFilter !== "ALL" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setUserSessionStatusFilter("ALL");
                    setUserSessionRefreshKey((k) => k + 1);
                  }}
                  className="h-9 text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-50 gap-1 font-medium"
                >
                  <X className="w-3.5 h-3.5" />
                  Reset Status
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs bg-white text-slate-700 border-slate-300 hover:bg-slate-50 font-medium"
                onClick={handleExportUserHistory}
                disabled={isExportingUserHistory}
              >
                <Download className="w-3.5 h-3.5" />
                {isExportingUserHistory ? "Exporting..." : "Export Sessions"}
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
          globalSearchPlaceholder="Search session IP, device..."
          showSelectionColumn={false}
        />
      </div>
    );
  }

  // ── FLAT SCREEN VIEW 2: Unique Users Overview ──
  return (
    <ProDataTable
      columns={uniqueUsersColumns}
      fetchData={fetchTableData}
      refreshKey={tableRefreshKey}
      customToolbarActions={
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-900">
              Unique Logged-In Users
            </span>
            {statusFilter !== "ALL" && (
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-semibold">
                Status: {statusFilter}
              </Badge>
            )}
          </div>

          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setTableRefreshKey((k) => k + 1);
            }}
          >
            <SelectTrigger className="w-[125px] h-9 text-xs bg-white font-medium border-slate-300">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="SUCCESS" className="text-xs">Successful Only</SelectItem>
              <SelectItem value="FAILED" className="text-xs">Failed Only</SelectItem>
            </SelectContent>
          </Select>

          {statusFilter !== "ALL" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setStatusFilter("ALL");
                setTableRefreshKey((k) => k + 1);
              }}
              className="h-9 text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-50 gap-1 font-medium"
            >
              <X className="w-3.5 h-3.5" />
              Reset Status
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
      globalSearchPlaceholder="Search by user, employee ID, department, IP..."
      showSelectionColumn={false}
    />
  );
}
