import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  CircleCheck,
  Clock3,
  ExternalLink,
  FileStack,
  FolderGit2,
  Gauge,
  RefreshCw,
  Send,
  Users,
  Wrench,
} from "lucide-react";
import { toast } from "react-toastify";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import adminDashboardApi from "@/api/admin-dashboard.api";
import { useNotifications } from "@/context/NotificationContext";
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

function statusEntries(mapObj = {}) {
  return Object.entries(mapObj).sort((a, b) => b[1] - a[1]);
}

function getSeverity(days) {
  if (days >= 14) {
    return {
      label: "High",
      badgeClass: "border-red-300 bg-red-100 text-red-700",
      cardClass: "border-red-200 bg-red-50",
    };
  }

  if (days >= 7) {
    return {
      label: "Medium",
      badgeClass: "border-amber-300 bg-amber-100 text-amber-700",
      cardClass: "border-amber-200 bg-amber-50",
    };
  }

  return {
    label: "Low",
    badgeClass: "border-yellow-300 bg-yellow-100 text-yellow-700",
    cardClass: "border-yellow-200 bg-yellow-50",
  };
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

function KpiCard({ title, value, description, Icon }) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-700">{title}</CardTitle>
          <Icon className="h-4 w-4 text-slate-500" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight text-slate-900">{formatValue(value)}</p>
        <CardDescription className="mt-1 text-xs text-slate-500">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

function AlertSummaryCard({ title, value, description }) {
  const cardTone = Number(value || 0) > 0 ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white";

  return (
    <div className={`rounded-md border p-3 ${cardTone}`}>
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{formatValue(value)}</p>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  );
}

function TopAlertList({ title, rows, buildLabel, onOpen }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {rows?.length ? (
        <div className="space-y-2">
          {rows.slice(0, 5).map((row, idx) => {
            const days = Number(row?.delayedDays || row?.stalledDays || 0);
            const severity = getSeverity(days);

            return (
              <div key={row.id || `${title}-${idx}`} className={`rounded-md border p-2 text-xs text-slate-800 ${severity.cardClass}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p>{buildLabel(row)}</p>
                    <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-semibold ${severity.badgeClass}`}>
                      {severity.label} Risk ({days}d)
                    </span>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => onOpen(row)}>
                    Open
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-400">No active alerts</p>
      )}
    </div>
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

  const getVisual = (severity, read) => {
    switch (severity) {
      case "critical":
        return {
          Icon: AlertTriangle,
          iconTone: read ? "text-red-400" : "text-red-600",
        };
      case "warning":
        return {
          Icon: AlertTriangle,
          iconTone: read ? "text-amber-400" : "text-amber-600",
        };
      case "success":
        return {
          Icon: CircleCheck,
          iconTone: read ? "text-emerald-400" : "text-emerald-600",
        };
      default:
        return {
          Icon: Bell,
          iconTone: read ? "text-slate-400" : "text-slate-600",
        };
    }
  };

  const buildOneLine = (n) => {
    const title = String(n?.title || "").trim();
    const message = String(n?.message || "").trim();
    if (!title) return message || "Notification";
    if (!message) return title;
    if (message.toLowerCase().startsWith(title.toLowerCase())) return message;
    return `${title}: ${message}`;
  };

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
            Minimal live feed for workflow events and approvals.
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
                (() => {
                  const visual = getVisual(n.severity, n.read);
                  const VisualIcon = visual.Icon;

                  return (
                    <div
                      key={n.id}
                      className={`border-b py-3 ${n.read ? "opacity-75" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <VisualIcon className={`h-4 w-4 shrink-0 ${visual.iconTone}`} />
                        <p className="min-w-0 flex-1 truncate text-sm text-slate-800">
                          {buildOneLine(n)}
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
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 rounded px-2 text-[11px]"
                              onClick={() => markRead(n.id)}
                            >
                              Read
                            </Button>
                          )}
                          {n.actionPath && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 rounded px-2 text-[11px]"
                              onClick={() => onOpenAction(n)}
                            >
                              Open
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()
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
    addNotification,
  } = useNotifications();

  const [overview, setOverview] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [trends, setTrends] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [trendWindow, setTrendWindow] = useState(30);

  const [activeTask, setActiveTask] = useState(null);

  const requestInFlightRef = useRef(false);

  const pushNotification = useCallback((payload) => {
    addNotification(payload).catch(() => {
      // keep dashboard flow resilient even when notifications API is unavailable
    });
  }, [addNotification]);

  const openPath = useCallback((path, params = {}) => {
    const search = new URLSearchParams(params).toString();
    navigate(search ? `${path}?${search}` : path);
  }, [navigate]);

  const openFromNotification = useCallback((n) => {
    if (!n.actionPath) return;
    markRead(n.id);
    setDrawerOpen(false);
    openPath(n.actionPath, n.actionParams || {});
  }, [markRead, openPath]);

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
      const doneMessage = `${successMessage} (${elapsed}s)`;
      toast.success(doneMessage);
    } catch (error) {
      const errorText = error?.message || failureMessage;
      toast.error(errorText);
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
      fetchDashboard({ silent: true, days: trendWindow, source: "auto" }).catch(() => {});
    }, AUTO_REFRESH_MS);

    const onFocus = () => {
      fetchDashboard({ silent: true, days: trendWindow, source: "focus" }).catch(() => {});
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchDashboard({ silent: true, days: trendWindow, source: "visible" }).catch(() => {});
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
        title: "Organizations",
        value: overview.totals?.customers,
        description: "Total active customers",
        Icon: Building2,
      },
      {
        title: "Users",
        value: overview.totals?.users,
        description: "Registered company users",
        Icon: Users,
      },
      {
        title: "Jobs",
        value: overview.totals?.jobs,
        description: "Total jobs in system",
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
        Icon: Send,
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
      fullLabel: label,
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
    qualityReports: { label: "Quality Reports", color: "#7c3aed" },
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-semibold">Admin Control Dashboard</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onManualRefresh}
            disabled={isRefreshing || isLoading || !!activeTask}
            className="gap-2"
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

      <main className="flex-1 overflow-auto p-6">
        {activeTask && (
          <Card className="mb-4 border-blue-200 bg-blue-50">
            <CardContent className="flex items-center gap-2 p-3 text-sm text-blue-800">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>{activeTask.label}...</span>
            </CardContent>
          </Card>
        )}

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

            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle>DMS Snapshot</CardTitle>
                  <CardDescription>Assignment, revision, transmission and client lifecycle statuses.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StatusRow title="Assignment Status" values={overview.dms?.assignmentStatus} />
                  <StatusRow title="Version Status" values={overview.dms?.versionStatus} />
                  <StatusRow title="Transmission Status" values={overview.dms?.transmissionStatus} />
                  <StatusRow title="Transmission Client Status" values={overview.dms?.transmissionClientStatus} />
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle>Quality and Inspection</CardTitle>
                  <CardDescription>Status distribution across MHC, QAP, hydro and inspection reports.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StatusRow title="MHC" values={overview.quality?.mhcStatus} />
                  <StatusRow title="QAP" values={overview.quality?.qapStatus} />
                  <StatusRow title="Hydro" values={overview.quality?.hydroStatus} />
                  <StatusRow title="Dish End" values={overview.quality?.dishEndStatus} />
                  <StatusRow title="Final Inspection" values={overview.quality?.finalInspectionStatus} />
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle>Engineering Workflows</CardTitle>
                  <CardDescription>Weld stage progress and NCR/DCR current state.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Active Weld Stages</p>
                      <p className="text-xl font-bold text-slate-900">{formatValue(overview.weld?.activeWeldStages)}</p>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Total Weld Stages</p>
                      <p className="text-xl font-bold text-slate-900">{formatValue(overview.weld?.weldStages)}</p>
                    </div>
                  </div>
                  <StatusRow title="Weld Stage Status" values={overview.weld?.stageStatus} />
                  <StatusRow title="NCR Workflow" values={overview.ncr?.workflow} />
                  <StatusRow title="NCR Status" values={overview.ncr?.status} />
                  <StatusRow title="DCR Overall (Latest)" values={overview.dcr?.latestStatus?.overall} />
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle>Commercial and DTN</CardTitle>
                  <CardDescription>RFQ commercial snapshot and drawing transmittal lifecycle.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Quoted Value</p>
                      <p className="text-xl font-bold text-slate-900">Rs {formatValue(overview.rfq?.financials?.totalQuoted)}</p>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Win %</p>
                      <p className="text-xl font-bold text-slate-900">{overview.rfq?.financials?.winPercentage || "0.00"}%</p>
                    </div>
                  </div>
                  <StatusRow title="RFQ Client Status" values={overview.rfq?.clientStatus} />
                  <StatusRow title="RFQ Shreno Status" values={overview.rfq?.shrenoStatus} />
                  <StatusRow title="DTN Transmittal Status" values={overview.dtn?.drawingTransmittalStatus} />
                </CardContent>
              </Card>
            </div>

            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Alerts and Exceptions
                </CardTitle>
                <CardDescription>Operational risk signals from overdue and stalled workflows with direct module actions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                        <span className="font-semibold">{row.documentNumber}</span> ({row.documentName}) | Job: {row.jobNumber} | Owner: {row.owner}
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
                        <span className="font-semibold">{row.ncrNo}</span> | Job: {row.jobNumber} | Stage: {row.currentStage} | Status: {row.workflowStatus}
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

            <Card className="border-slate-200">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Throughput Trends (shadcn chart)
                    </CardTitle>
                    <CardDescription>Auto-refresh enabled every 30s, plus focus and visibility refresh.</CardDescription>
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

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Data Freshness</CardTitle>
                <CardDescription>
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                    <Gauge className="h-4 w-4" />
                    Overview snapshot: {overview.generatedAt ? new Date(overview.generatedAt).toLocaleString() : "N/A"}
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
