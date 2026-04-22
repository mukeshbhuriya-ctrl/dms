import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CircleCheck,
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
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const fmt = new Intl.NumberFormat("en-IN");

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

function AdminDashboard() {
  const navigate = useNavigate();

  const [overview, setOverview] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [trends, setTrends] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [trendWindow, setTrendWindow] = useState(30);

  const fetchDashboard = async ({ silent = false, days = trendWindow } = {}) => {
    try {
      if (silent) setIsRefreshing(true);
      else setIsLoading(true);

      const [overviewRes, alertsRes, trendsRes] = await Promise.all([
        adminDashboardApi.getOverview(),
        adminDashboardApi.getAlerts({ stalledDays: 7 }),
        adminDashboardApi.getTrends({ days }),
      ]);

      setOverview(overviewRes?.data || null);
      setAlerts(alertsRes?.data || null);
      setTrends(trendsRes?.data || null);
    } catch (error) {
      toast.error(error?.message || "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard({ days: trendWindow });
  }, []);

  const onTrendWindowChange = async (days) => {
    setTrendWindow(days);
    await fetchDashboard({ silent: true, days });
  };

  const openPath = (path, params = {}) => {
    const search = new URLSearchParams(params).toString();
    navigate(search ? `${path}?${search}` : path);
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

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchDashboard({ silent: true, days: trendWindow })}
          disabled={isRefreshing || isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </header>

      <main className="flex-1 overflow-auto p-6">
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
                      Throughput Trends
                    </CardTitle>
                    <CardDescription>Workload and movement trends for last 7/30/90 days.</CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    {[7, 30, 90].map((days) => (
                      <Button
                        key={days}
                        size="sm"
                        variant={trendWindow === days ? "default" : "outline"}
                        onClick={() => onTrendWindowChange(days)}
                        disabled={isRefreshing}
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
