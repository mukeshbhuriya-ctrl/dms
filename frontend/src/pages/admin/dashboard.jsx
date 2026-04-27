import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CircleCheck,
  Clock3,
  ExternalLink,
  FileStack,
  FolderGit2,
  Gauge,
  GitBranch,
  RefreshCw,
  ShieldAlert,
  SidebarIcon,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";

import adminDashboardApi from "@/api/admin-dashboard.api";
import { useNotifications } from "@/context/NotificationContext";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const fmt = new Intl.NumberFormat("en-IN");
const AUTO_REFRESH_MS = 300000;
const HIDDEN_NOTIFICATION_TITLES = new Set([
  "Task Started",
  "Task Completed",
  "Task Failed",
  "Dashboard Load Failed",
  "Auto Refresh Failed",
]);

function formatValue(value) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "0";
  return fmt.format(num);
}

function formatDateTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return "now";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusEntries(mapObj = {}) {
  return Object.entries(mapObj).sort((a, b) => b[1] - a[1]);
}

function statusTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("attention") || normalized.includes("reject") || normalized.includes("open") || normalized.includes("critical")) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (normalized.includes("review") || normalized.includes("draft") || normalized.includes("pending") || normalized.includes("warning") || normalized.includes("active")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (normalized.includes("healthy") || normalized.includes("approved") || normalized.includes("completed") || normalized.includes("success")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-600";
}

function KpiCard({ title, value, description, Icon }) {
  const IconComponent = Icon;
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold text-slate-700">{title}</CardTitle>
          <IconComponent className="h-4 w-4 text-slate-500" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight text-slate-900">{typeof value === "number" ? formatValue(value) : value}</p>
        <CardDescription className="mt-1 text-xs text-slate-500">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{typeof value === "number" ? formatValue(value) : value}</p>
    </div>
  );
}

function StatusRow({ title, values }) {
  const entries = statusEntries(values);
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-400">No records</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {entries.map(([label, count]) => (
            <span
              key={`${title}-${label}`}
              className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700"
            >
              {label}: {formatValue(count)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertSummaryCard({ title, value, description }) {
  const cardTone = Number(value || 0) > 0 ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white";
  return (
    <div className={`rounded-lg border p-4 ${cardTone}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{formatValue(value)}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function TopAlertList({ title, rows, buildLabel, onOpen }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {rows?.length ? (
        rows.slice(0, 5).map((row, idx) => (
          <div key={row.id || `${title}-${idx}`} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1 text-sm text-slate-700">
                <p>{buildLabel(row)}</p>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusTone(row?.delayedDays >= 14 || row?.stalledDays >= 14 ? "critical" : "warning")}`}>
                  {row?.delayedDays || row?.stalledDays || 0}d delayed
                </span>
              </div>
              <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => onOpen(row)}>
                Open
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-400">
          No active alerts in this category.
        </div>
      )}
    </div>
  );
}

function ModuleHealthCard({ item, onOpen }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="break-words text-[1.95rem] font-bold leading-[1.15] text-slate-900 sm:text-[1.8rem] lg:text-[1.7rem]">
              {item.title}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Total records: {formatValue(item.total)}
            </CardDescription>
          </div>
          <span className={`inline-flex w-fit shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide sm:max-w-[11rem] ${statusTone(item.status)}`}>
            {item.status}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 grid-cols-3">
          <StatPill label="Pending" value={item.pending} />
          <StatPill label="Approved" value={item.approved} />
          <StatPill label="Rejected" value={item.rejected} />
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => onOpen(item.route)}>
          Open Module
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

function RecentActivityCard({ rows, onOpen }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle>Recent System Activity</CardTitle>
        <CardDescription>Latest movement across execution modules, approvals, and reports.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows?.length ? (
          rows.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.module}</span>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone(item.status)}`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">{item.subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">{formatRelativeTime(item.date)}</span>
                <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => onOpen(item.route)}>
                  Open
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-400">
            No recent activity available.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentJobsCard({ jobs, onOpen }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle>Recent Jobs</CardTitle>
        <CardDescription>Newest jobs added to the system with a quick sense of execution activity.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {jobs?.length ? (
          jobs.map((job) => (
            <div key={job.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-slate-900">{job.jobNumber}</p>
                <p className="text-xs text-slate-500">{job.customerName}</p>
                <p className="text-xs text-slate-500">{job.equipmentName}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-slate-500">PO: {job.poNumber}</span>
                <span className="text-xs text-slate-500">Activity: {formatValue(job.activityCount)}</span>
                <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => onOpen("/admin/job-overview", { jobId: job.id })}>
                  View Job
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-400">
            No recent jobs found.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NotificationDrawer({
  open,
  onOpenChange,
  notifications,
  markRead,
  markAllRead,
  onOpenAction,
}) {
  const [filter, setFilter] = useState("all");
  const filterOptions = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "action", label: "Action Required" },
    { key: "system", label: "System" },
  ];

  const visibleNotifications = useMemo(
    () => notifications.filter((n) => !HIDDEN_NOTIFICATION_TITLES.has(n?.title || "")),
    [notifications],
  );

  const filtered = useMemo(() => {
    if (filter === "unread") return visibleNotifications.filter((n) => !n.read);
    if (filter === "action") return visibleNotifications.filter((n) => n.kind === "action");
    if (filter === "system") return visibleNotifications.filter((n) => n.kind === "system");
    return visibleNotifications;
  }, [filter, visibleNotifications]);

  const unread = visibleNotifications.filter((n) => !n.read).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[460px] p-0 sm:max-w-[460px]">
        <SheetHeader className="space-y-3 border-b px-5 py-4">
          <SheetTitle className="flex items-center justify-between pr-8">
            <span className="text-xl font-semibold text-slate-900">Notifications</span>
            <Badge variant="outline" className="rounded-full text-xs font-semibold">
              Unread: {unread}
            </Badge>
          </SheetTitle>
          <SheetDescription className="text-sm text-slate-600">
            Workflow events, pending actions, and system feed.
          </SheetDescription>
          <div className="flex flex-wrap items-center gap-2">
            {filterOptions.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? "default" : "outline"}
                className="h-8 rounded-md px-3 text-xs font-semibold"
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              onClick={markAllRead}
              disabled={unread === 0}
              className="ml-auto h-8 rounded-md px-3 text-xs font-semibold"
            >
              Mark all read
            </Button>
          </div>
        </SheetHeader>

        <div className="max-h-[78vh] overflow-auto px-5 py-2">
          {filtered.length === 0 ? (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No notifications in this view right now.
            </div>
          ) : (
            filtered.map((n) => (
              <div key={n.id} className={`border-b py-3 ${n.read ? "opacity-75" : ""}`}>
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 shrink-0 text-slate-500" />
                  <p className="min-w-0 flex-1 truncate text-sm text-slate-800">
                    {n?.title}: {n?.message}
                  </p>
                  {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                </div>

                <div className="mt-1 flex items-center justify-between pl-6">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <Clock3 className="h-3 w-3" />
                    <span>{formatRelativeTime(n.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!n.read && (
                      <Button size="sm" variant="ghost" className="h-7 rounded px-2 text-[11px]" onClick={() => markRead(n.id)}>
                        Read
                      </Button>
                    )}
                    {n.actionPath && (
                      <Button size="sm" variant="ghost" className="h-7 gap-1 rounded px-2 text-[11px]" onClick={() => onOpenAction(n)}>
                        Open
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    drawerOpen,
    setDrawerOpen,
    markRead,
    markAllRead,
  } = useNotifications();

  const [overview, setOverview] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [trends, setTrends] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [trendWindow, setTrendWindow] = useState(30);
  const [activeTask, setActiveTask] = useState(null);
  const requestInFlightRef = useRef(false);

  const openPath = useCallback((path, params = {}) => {
    const search = new URLSearchParams(params).toString();
    navigate(search ? `${path}?${search}` : path);
  }, [navigate]);

  const openFromNotification = useCallback((n) => {
    if (!n.actionPath) return;
    markRead(n.id);
    setDrawerOpen(false);
    openPath(n.actionPath, n.actionParams || {});
  }, [markRead, openPath, setDrawerOpen]);

  const loadDashboardData = useCallback(async (days) => {
    const [overviewRes, alertsRes, trendsRes] = await Promise.all([
      adminDashboardApi.getOverview(),
      adminDashboardApi.getAlerts({ stalledDays: 7 }),
      adminDashboardApi.getTrends({ days }),
    ]);

    return {
      overview: overviewRes?.data || null,
      alerts: alertsRes?.data || null,
      trends: trendsRes?.data || null,
    };
  }, []);

  const fetchDashboard = useCallback(async ({ silent = false, days = trendWindow, source = "manual" } = {}) => {
    if (requestInFlightRef.current && source !== "manual" && source !== "trend") {
      return;
    }

    try {
      requestInFlightRef.current = true;
      if (silent) setIsRefreshing(true);
      else setIsLoading(true);

      const data = await loadDashboardData(days);
      setOverview(data.overview);
      setAlerts(data.alerts);
      setTrends(data.trends);
    } finally {
      requestInFlightRef.current = false;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [loadDashboardData, trendWindow]);

  const runUserTask = useCallback(async ({ label, taskFn, successMessage, failureMessage }) => {
    const startedAt = Date.now();
    setActiveTask({ label, startedAt });

    try {
      await taskFn();
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      toast.success(`${successMessage} (${elapsed}s)`);
    } catch (error) {
      toast.error(error?.message || failureMessage);
      throw error;
    } finally {
      setActiveTask(null);
    }
  }, []);

  useEffect(() => {
    fetchDashboard({ days: trendWindow, source: "init" }).catch((error) => {
      toast.error(error?.message || "Failed to load dashboard data");
    });
  }, [fetchDashboard, trendWindow]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchDashboard({ silent: true, days: trendWindow, source: "auto" }).catch(() => { });
    }, AUTO_REFRESH_MS);

    const onFocus = () => {
      fetchDashboard({ silent: true, days: trendWindow, source: "focus" }).catch(() => { });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchDashboard({ silent: true, days: trendWindow, source: "visible" }).catch(() => { });
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetchDashboard, trendWindow]);

  const onTrendWindowChange = async (days) => {
    setTrendWindow(days);
    await runUserTask({
      label: `Refreshing ${days}-day trend data`,
      taskFn: async () => {
        await fetchDashboard({ silent: true, days, source: "trend" });
      },
      successMessage: `Trend data updated for ${days} days`,
      failureMessage: `Failed to refresh ${days}-day trend data`,
    });
  };

  const onManualRefresh = async () => {
    await runUserTask({
      label: "Refreshing dashboard snapshot",
      taskFn: async () => {
        await fetchDashboard({ silent: true, days: trendWindow, source: "manual" });
      },
      successMessage: "Dashboard refreshed",
      failureMessage: "Dashboard refresh failed",
    });
  };

  const topKpis = useMemo(() => {
    if (!overview) return [];
    return [
      {
        title: "Customers",
        value: overview.totals?.customers,
        description: "Active customers in this company workspace",
        Icon: Building2,
      },
      {
        title: "Users",
        value: overview.totals?.users,
        description: "Registered internal users",
        Icon: Users,
      },
      {
        title: "Jobs",
        value: overview.totals?.jobs,
        description: "Tracked execution jobs in the system",
        Icon: FolderGit2,
      },
      {
        title: "DMS Assignments",
        value: overview.dms?.assignedDocuments,
        description: "Assigned document records",
        Icon: FileStack,
      },
      {
        title: "Transmissions",
        value: overview.dms?.transmissions,
        description: "Created document transmissions",
        Icon: Briefcase,
      },
      {
        title: "Weld Joints",
        value: overview.weld?.weldJoints,
        description: "Total weld joints",
        Icon: Wrench,
      },
      {
        title: "Quality Reports",
        value:
          (overview.quality?.mhcReports || 0) +
          (overview.quality?.qapReports || 0) +
          (overview.quality?.hydroReports || 0) +
          (overview.quality?.dishEndReports || 0) +
          (overview.quality?.finalInspectionReports || 0),
        description: "MHC + QAP + Hydro + Inspection",
        Icon: CircleCheck,
      },
      {
        title: "NCR + DCR",
        value: (overview.ncr?.total || 0) + (overview.dcr?.total || 0),
        description: "Engineering change/non-conformance",
        Icon: AlertTriangle,
      },
    ];
  }, [overview]);

  const trendChartData = useMemo(() => {
    if (!trends?.labels?.length) return [];
    return trends.labels.map((label, idx) => ({
      label: label.slice(5),
      dmsAssignments: trends.series?.dmsAssignments?.[idx] || 0,
      dmsUploads: trends.series?.dmsUploads?.[idx] || 0,
      ncrCreated: trends.series?.ncrCreated?.[idx] || 0,
      qualityReports: trends.series?.qualityReports?.[idx] || 0,
    }));
  }, [trends]);

  const chartConfig = {
    dmsAssignments: { label: "DMS Assignments", color: "#0f766e" },
    dmsUploads: { label: "DMS Uploads", color: "#0284c7" },
    ncrCreated: { label: "NCR Created", color: "#b45309" },
    qualityReports: { label: "Quality Reports", color: "#166534" },
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-6">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-2" />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
            <p className="text-xs text-slate-500">System health, operational pressure, and module execution in one place.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onManualRefresh}
            disabled={isRefreshing || isLoading || !!activeTask}
            className="h-9 gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setDrawerOpen(true)}
            className="relative"
            aria-label="Open notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      <NotificationDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        notifications={notifications}
        markRead={markRead}
        markAllRead={markAllRead}
        onOpenAction={openFromNotification}
      />

      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-slate-50/50 p-6">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <Card key={idx} className="border-slate-200">
                <CardContent className="h-28 animate-pulse rounded-md bg-slate-100" />
              </Card>
            ))}
          </div>
        ) : !overview ? (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle>Dashboard data unavailable</CardTitle>
              <CardDescription>Unable to fetch overview data from backend.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {topKpis.map((item) => (
                <KpiCard key={item.title} {...item} />
              ))}
            </div>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  Module Health
                </CardTitle>
                <CardDescription>High-level readiness across the major execution modules in the system.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 lg:grid-cols-2">
                  {(overview.moduleHealth || []).map((item) => (
                    <ModuleHealthCard
                      key={item.key}
                      item={item}
                      onOpen={(route) => openPath(route)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Document and Transmission Health</CardTitle>
                  <CardDescription>DMS assignment lifecycle, revision states, and client document flow.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <StatPill label="Doc Masters" value={overview.dms?.documentMasters} />
                    <StatPill label="Assigned Docs" value={overview.dms?.assignedDocuments} />
                    <StatPill label="Versions" value={overview.dms?.documentVersions} />
                    <StatPill label="Transmissions" value={overview.dms?.transmissions} />
                  </div>
                  <StatusRow title="Assignment Status" values={overview.dms?.assignmentStatus} />
                  <StatusRow title="Version Status" values={overview.dms?.versionStatus} />
                  <StatusRow title="Transmission Status" values={overview.dms?.transmissionStatus} />
                  <StatusRow title="Client Status" values={overview.dms?.transmissionDocumentClientStatus} />
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Quality and Engineering Snapshot</CardTitle>
                  <CardDescription>Inspection readiness, exception pressure, and weld-stage execution state.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <StatPill label="Weld Joints" value={overview.weld?.weldJoints} />
                    <StatPill label="Active Stages" value={overview.weld?.activeWeldStages} />
                    <StatPill label="NCR" value={overview.ncr?.total} />
                    <StatPill label="DCR" value={overview.dcr?.total} />
                  </div>
                  <StatusRow title="Weld Stage Status" values={overview.weld?.stageStatus} />
                  <StatusRow title="NCR Workflow" values={overview.ncr?.workflow} />
                  <StatusRow title="NCR Status" values={overview.ncr?.status} />
                  <StatusRow title="DCR Overall" values={overview.dcr?.latestStatus?.overall} />
                </CardContent>
              </Card>
            </div>

            <Card className="border-amber-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Alerts and Exceptions
                </CardTitle>
                <CardDescription>Operational risk signals from overdue and stalled workflows with direct actions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                  <AlertSummaryCard title="Overdue Upload" value={alerts?.summary?.overdueUploadCount} description="Pending docs past upload due" />
                  <AlertSummaryCard title="Overdue Response" value={alerts?.summary?.overdueResponseCount} description="Awaiting approval past response due" />
                  <AlertSummaryCard title="Stalled NCR" value={alerts?.summary?.stalledNcrCount} description="Open NCR not updated" />
                  <AlertSummaryCard title="Stalled Weld Stage" value={alerts?.summary?.stalledWeldStageCount} description="Pending/submitted active stages" />
                  <AlertSummaryCard title="Stalled Transmission" value={alerts?.summary?.stalledTransmissionCount} description="Sent with pending client action" />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <TopAlertList
                    title="Top Overdue Upload"
                    rows={alerts?.details?.overdueUploadTop}
                    buildLabel={(row) => (
                      <>
                        <span className="font-semibold">{row.documentNumber}</span> ({row.documentName}) | Job: {row.jobNumber}
                      </>
                    )}
                    onOpen={(row) => openPath("/dcc/documents", { documentId: row.id })}
                  />
                  <TopAlertList
                    title="Top Overdue Response"
                    rows={alerts?.details?.overdueResponseTop}
                    buildLabel={(row) => (
                      <>
                        <span className="font-semibold">{row.documentNumber}</span> ({row.documentName}) | Job: {row.jobNumber}
                      </>
                    )}
                    onOpen={(row) => openPath("/dcc/document-approver", { documentId: row.id })}
                  />
                  <TopAlertList
                    title="Top Stalled NCR"
                    rows={alerts?.details?.stalledNcrTop}
                    buildLabel={(row) => (
                      <>
                        <span className="font-semibold">{row.ncrNo}</span> | Job: {row.jobNumber} | Stage: {row.currentStage}
                      </>
                    )}
                    onOpen={(row) => openPath("/ncr/create-ncr", { ncrId: row.id })}
                  />
                  <TopAlertList
                    title="Top Stalled Weld Stages"
                    rows={alerts?.details?.stalledWeldStageTop}
                    buildLabel={(row) => (
                      <>
                        <span className="font-semibold">{row.jointNo}</span> | Job: {row.jobNumber} | {row.stage} ({row.status})
                      </>
                    )}
                    onOpen={(row) => openPath("/view-weldingjoints", { jointId: row.jointId || row.id })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Throughput Trends
                    </CardTitle>
                    <CardDescription>Auto-refresh runs every 5 minutes, with extra refresh on focus and visibility.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {[7, 30, 90].map((days) => (
                      <Button
                        key={days}
                        size="sm"
                        variant={trendWindow === days ? "default" : "outline"}
                        onClick={() => onTrendWindowChange(days)}
                        disabled={isRefreshing || !!activeTask}
                      >
                        {days}D
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {trendChartData.length ? (
                  <ChartContainer config={chartConfig} className="h-[320px]">
                    <LineChart data={trendChartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatValue(v)} />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Line type="monotone" dataKey="dmsAssignments" stroke="var(--color-dmsAssignments)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="dmsUploads" stroke="var(--color-dmsUploads)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="ncrCreated" stroke="var(--color-ncrCreated)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="qualityReports" stroke="var(--color-qualityReports)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-slate-500">Trend data unavailable.</p>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <RecentJobsCard jobs={overview.portfolio?.recentJobs} onOpen={openPath} />
              <RecentActivityCard rows={overview.recentActivity} onOpen={(route) => openPath(route)} />
            </div>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Data Freshness</CardTitle>
                <CardDescription>
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                    <Gauge className="h-4 w-4" />
                    Overview snapshot generated at {formatDateTime(overview.generatedAt)}
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}
      </main>
    </>
  );
}

export default AdminDashboard;
