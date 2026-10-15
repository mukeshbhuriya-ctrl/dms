import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Calendar,
  RefreshCw,
  Download,
  Filter,
  X,
  FileText,
  ExternalLink,
  BarChart3,
  TrendingUp,
  Briefcase,
  Users,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Info
} from "lucide-react";
import {
  BarChart,
  Bar,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";

import adminDashboardApi from "@/api/admin-dashboard.api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProDataTable from "@/components/shared/ProDataTable";

const fmt = new Intl.NumberFormat("en-IN");

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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

const PRESET_RANGES = [
  { id: "LAST_6_MONTHS", label: "Last 6 Months" },
  { id: "THIS_MONTH", label: "This Month" },
  { id: "LAST_MONTH", label: "Last Month" },
  { id: "LAST_30_DAYS", label: "Last 30 Days" },
  { id: "LAST_90_DAYS", label: "Last 90 Days" },
  { id: "THIS_YEAR", label: "Year to Date" },
  { id: "CUSTOM", label: "Custom Date Range" },
];

function getPresetDates(presetId) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  let start = new Date(now);

  switch (presetId) {
    case "THIS_MONTH":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "LAST_MONTH":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end.setTime(new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime());
      break;
    case "LAST_30_DAYS":
      start.setDate(start.getDate() - 30);
      break;
    case "LAST_90_DAYS":
      start.setDate(start.getDate() - 90);
      break;
    case "THIS_YEAR":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case "LAST_6_MONTHS":
    default:
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      break;
  }
  start.setHours(0, 0, 0, 0);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export default function DmsUploadAnalytics({ defaultView = "analytics" }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Navigation-driven view state ("analytics" | "records")
  const currentView = searchParams.get("view") || defaultView;
  const urlStatus = searchParams.get("status") || "ALL";
  const urlMonth = searchParams.get("month") || null;

  // Date Filter State
  const [preset, setPreset] = useState("LAST_6_MONTHS");
  const initialDates = useMemo(() => getPresetDates("LAST_6_MONTHS"), []);
  const [startDate, setStartDate] = useState(initialDates.startDate);
  const [endDate, setEndDate] = useState(initialDates.endDate);

  // Analytics API Data
  const [analytics, setAnalytics] = useState(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);

  // Track in-flight request
  const inFlightRef = useRef(false);

  // Handle Preset Change
  const handlePresetChange = (newPreset) => {
    setPreset(newPreset);
    if (newPreset !== "CUSTOM") {
      const { startDate: s, endDate: e } = getPresetDates(newPreset);
      setStartDate(s);
      setEndDate(e);
    }
  };

  // Fetch Analytics Data
  const fetchAnalytics = useCallback(async () => {
    if (inFlightRef.current) return;
    try {
      inFlightRef.current = true;
      setIsLoadingAnalytics(true);
      const res = await adminDashboardApi.getDmsUploadAnalytics({
        startDate,
        endDate,
      });
      if (res?.success) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch DMS upload analytics:", err);
      toast.error(err?.message || "Failed to load upload analytics");
    } finally {
      inFlightRef.current = false;
      setIsLoadingAnalytics(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Navigate to Table Ledger view on stat click
  const navigateToRecords = (statusFilter = "ALL", monthVal = null) => {
    const params = new URLSearchParams(searchParams);
    params.set("view", "records");
    if (statusFilter && statusFilter !== "ALL") {
      params.set("status", statusFilter);
    } else {
      params.delete("status");
    }
    if (monthVal) {
      params.set("month", monthVal);
    } else {
      params.delete("month");
    }
    setSearchParams(params);
    setTableRefreshKey((prev) => prev + 1);
  };

  // Navigate back to Analytics Dashboard view
  const navigateBackToAnalytics = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("view");
    params.delete("status");
    params.delete("month");
    setSearchParams(params);
  };

  // Clear filters while staying on records view
  const handleClearFiltersInRecords = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("status");
    params.delete("month");
    setSearchParams(params);
    setTableRefreshKey((prev) => prev + 1);
  };

  // Chart Click: Navigate to records for the clicked month
  const handleChartClick = (data) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const clickedMonth = data.activePayload[0].payload.month;
      navigateToRecords("ALL", clickedMonth);
    }
  };

  // Dynamic table title based on active filter in URL
  const getTableTitle = () => {
    if (urlMonth && urlStatus !== "ALL") {
      return `${urlStatus.replace(/_/g, " ")} Uploads (${urlMonth})`;
    }
    if (urlMonth) {
      return `Document Uploads (${urlMonth})`;
    }
    switch (urlStatus) {
      case "ON_TIME":
        return "On-Time Document Uploads";
      case "DELAYED":
        return "Delayed Document Uploads";
      case "PENDING_ON_TRACK":
        return "Pending Documents (On-Track)";
      case "PENDING_OVERDUE":
        return "Pending Documents (Overdue)";
      case "UPLOADED":
        return "Total Uploaded Documents";
      default:
        return "";
    }
  };

  const getTableDescription = () => {
    if (urlStatus === "ON_TIME") {
      return "Documents uploaded on or before target deadline (meeting SLA).";
    }
    if (urlStatus === "DELAYED") {
      return "Documents uploaded after target deadline (breaching SLA).";
    }
    if (urlStatus === "PENDING_ON_TRACK") {
      return "Assigned documents awaiting upload with active SLA deadlines in future.";
    }
    if (urlStatus === "PENDING_OVERDUE") {
      return "Assigned documents not yet uploaded that have exceeded target deadline.";
    }
    if (urlStatus === "UPLOADED") {
      return "All document versions uploaded within the selected timeframe.";
    }
    return "Complete list of documents matching your active date range and filter criteria.";
  };

  // Fetch Data function for ProDataTable
  const fetchTableData = useCallback(
    async ({ page, limit, search, columnFilters }) => {
      try {
        const res = await adminDashboardApi.getDmsUploadRecords({
          startDate,
          endDate,
          statusFilter: urlStatus,
          month: urlMonth || undefined,
          search: search || undefined,
          page,
          limit: limit || 10,
        });

        if (res?.success) {
          return {
            data: res.data || [],
            meta: res.meta || {
              total: res.totalRecords || (res.data ? res.data.length : 0),
              totalPages: res.totalPages || 1,
              page: res.currentPage || page || 1,
            },
          };
        }
        return { data: [], meta: { total: 0, totalPages: 1, page: 1 } };
      } catch (err) {
        console.error("ProDataTable fetch error:", err);
        toast.error("Failed to load upload records");
        return { data: [], meta: { total: 0, totalPages: 1, page: 1 } };
      }
    },
    [startDate, endDate, urlStatus, urlMonth]
  );

  // Excel Export Handler
  const handleExport = async () => {
    try {
      toast.info("Generating Excel export...");
      const res = await adminDashboardApi.exportDmsUploadRecords({
        startDate,
        endDate,
        statusFilter: urlStatus,
        month: urlMonth || undefined,
      });

      const blob = new Blob([res], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `DMS_Upload_Tracking_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      link.remove();
      toast.success("Excel export downloaded successfully");
    } catch (err) {
      console.error("Excel export error:", err);
      toast.error(err?.message || "Failed to export records");
    }
  };

  // Columns definition for ProDataTable
  const columns = useMemo(
    () => [
      {
        accessorKey: "documentNumber",
        header: "Document No.",
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900">{row.documentNumber}</span>
            <span className="text-[11px] text-slate-500 truncate max-w-[200px]" title={row.documentName}>
              {row.documentName}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "versionNo",
        header: "Version",
        width: "80px",
        cell: (row) => (
          <Badge variant="outline" className="font-mono text-xs font-semibold bg-slate-50 text-slate-700">
            v{row.versionNo}
          </Badge>
        ),
      },
      {
        accessorKey: "jobNumber",
        header: "Job No. & Customer",
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-medium text-slate-800">{row.jobNumber}</span>
            <span className="text-[11px] text-slate-500 truncate max-w-[180px]" title={row.customerName}>
              {row.customerShortName || row.customerName}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "uploaderName",
        header: "Assigned / Uploader",
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-medium text-slate-800">{row.uploaderName}</span>
            {row.uploaderEmpId && (
              <span className="text-[11px] font-mono text-slate-400">ID: {row.uploaderEmpId}</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "assignedAt",
        header: "Assigned Date",
        cell: (row) => formatDate(row.assignedAt),
      },
      {
        accessorKey: "plannedDeadline",
        header: "SLA / Target Deadline",
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-medium text-slate-800">{formatDate(row.plannedDeadline)}</span>
            <span className="text-[11px] text-slate-500">
              {row.uploadDueDays !== null ? `${row.uploadDueDays}d SLA window` : "No SLA"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "uploadedAt",
        header: "Actual Upload Date",
        cell: (row) => (
          <div>
            {row.isUploaded ? (
              <span className="font-medium text-slate-800">{formatDateTime(row.uploadedAt)}</span>
            ) : (
              <span className="inline-flex items-center text-xs text-amber-600 font-medium">
                <Clock className="w-3 h-3 mr-1" />
                Pending Upload
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "slaStatus",
        header: "SLA Compliance",
        cell: (row) => {
          if (row.slaStatus === "ON_TIME") {
            return (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-medium text-[11px] gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {row.slaLabel}
              </Badge>
            );
          }
          if (row.slaStatus === "DELAYED") {
            return (
              <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 font-medium text-[11px] gap-1">
                <AlertTriangle className="w-3 h-3 text-red-600" />
                {row.slaLabel}
              </Badge>
            );
          }
          if (row.slaStatus === "PENDING_OVERDUE") {
            return (
              <Badge className="bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 font-semibold text-[11px] gap-1 animate-pulse">
                <ShieldAlert className="w-3 h-3 text-rose-600" />
                {row.slaLabel}
              </Badge>
            );
          }
          return (
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 font-medium text-[11px] gap-1">
              <Clock className="w-3 h-3 text-amber-600" />
              {row.slaLabel}
            </Badge>
          );
        },
      },
      {
        accessorKey: "currentWorkflowStatus",
        header: "Workflow State",
        cell: (row) => (
          <Badge variant="outline" className="text-slate-600 font-normal text-[11px]">
            {row.currentWorkflowStatus}
          </Badge>
        ),
      },
      {
        accessorKey: "actions",
        header: "Action",
        cell: (row) => (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => navigate(`/dcc/documents?documentId=${row.id}`)}
              title="Open Document in VDR"
            >
              Open
              <ExternalLink className="h-3 w-3" />
            </Button>
            {row.fileUrl && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50"
                onClick={() => window.open(row.fileUrl, "_blank")}
                title="View/Download File"
              >
                <Download className="h-3 w-3" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [navigate]
  );


  const summary = analytics?.summary || {};
  const monthlySeries = analytics?.monthlySeries || [];

  // ── VIEW 1: Dedicated Document Ledger View (Opened via navigation, no scroll wrap) ──
  // ── VIEW 1: Dedicated Document Ledger View (Actions in table toolbar, no outer card wrapper) ──
  if (currentView === "records") {
    return (
      <ProDataTable
        columns={columns}
        fetchData={fetchTableData}
        refreshKey={tableRefreshKey}
        customToolbarActions={
          <div className="flex items-center gap-2 flex-wrap">
           
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900">
                {getTableTitle()}
              </span>
              {urlStatus !== "ALL" && (
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-semibold">
                  {urlStatus.replace(/_/g, " ")}
                </Badge>
              )}
              {urlMonth && (
                <Badge variant="outline" className="text-[11px] font-semibold text-slate-700">
                  Month: {urlMonth}
                </Badge>
              )}
            </div>

            {(urlStatus !== "ALL" || urlMonth) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearFiltersInRecords}
                className="h-9 text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-50 gap-1 font-medium"
              >
                <X className="w-3.5 h-3.5" />
                Show All Records
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs bg-white text-slate-700 border-slate-300 hover:bg-slate-50 font-medium"
              onClick={handleExport}
            >
              <Download className="w-3.5 h-3.5" />
              Export to Excel
            </Button>
             <Button
              variant="outline"
              size="sm"
              onClick={navigateBackToAnalytics}
              className="h-9 px-2.5 text-xs font-semibold gap-1.5 text-slate-700 hover:text-slate-900 bg-white border-slate-300 hover:bg-slate-100 shadow-none"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>
          </div>
        }
        globalSearchPlaceholder="Search by doc no, title, job, customer, uploader..."
        showSelectionColumn={false}
      />
    );
  }

  // ── VIEW 2: High-Level Analytics & Graphs Dashboard (Stats only, no table) ──
  return (
    <div className="space-y-4">
      {/* ── Minimal Header & Filter Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-white border border-slate-200/90 rounded-xl shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-blue-50 text-blue-600 shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight whitespace-nowrap">
            DMS Documents Upload Analytics
          </h2>
        </div>

        {/* Date Preset & Custom Picker Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={preset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[145px] h-8 text-xs bg-white font-medium border-slate-300 cursor-pointer hover:bg-slate-50">
              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent>
              {PRESET_RANGES.map((r) => (
                <SelectItem key={r.id} value={r.id} className="text-xs">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {preset === "CUSTOM" && (
            <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-300">
              <span className="text-[11px] font-medium text-slate-400">From:</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-7 w-[120px] text-xs px-1 border-0 focus-visible:ring-0"
              />
              <span className="text-[11px] font-medium text-slate-400">To:</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-7 w-[120px] text-xs px-1 border-0 focus-visible:ring-0"
              />
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
            onClick={() => {
              fetchAnalytics();
              setTableRefreshKey((prev) => prev + 1);
            }}
            disabled={isLoadingAnalytics}
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAnalytics ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            className="h-8 px-3 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs cursor-pointer"
            onClick={() => navigateToRecords("ALL")}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>View All Records</span>
            {summary.totalDocuments !== undefined && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-blue-500 text-[10px] text-white font-semibold">
                {fmt.format(summary.totalDocuments || 0)}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* ── Interactive Click-to-Filter KPI Cards (Grid of 5) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* Card 1: Total Uploads */}
        <Card
          onClick={() => navigateToRecords("UPLOADED")}
          className="cursor-pointer transition-all duration-200 hover:shadow-md border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 bg-white"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Uploads
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Upload className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
              {fmt.format(summary.totalUploaded || 0)}
            </p>
            <p className="mt-1 text-[11px] text-blue-600 font-medium flex items-center gap-1">
              <span>View uploaded records</span>
              <ArrowRight className="w-3 h-3" />
            </p>
          </CardContent>
        </Card>

        {/* Card 2: On-Time Uploads */}
        <Card
          onClick={() => navigateToRecords("ON_TIME")}
          className="cursor-pointer transition-all duration-200 hover:shadow-md border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20 bg-white"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                On-Time Uploads
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <p className="text-2xl font-black text-emerald-700 tracking-tight">
                {fmt.format(summary.onTimeUploaded || 0)}
              </p>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                {summary.onTimeRate || 0}% SLA
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
              <span>View on-time records</span>
              <ArrowRight className="w-3 h-3" />
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Delayed Uploads */}
        <Card
          onClick={() => navigateToRecords("DELAYED")}
          className="cursor-pointer transition-all duration-200 hover:shadow-md border-slate-200 hover:border-red-400 hover:bg-red-50/20 bg-white"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Delayed Uploads
              </span>
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <p className="text-2xl font-black text-red-600 tracking-tight">
                {fmt.format(summary.delayedUploaded || 0)}
              </p>
              {Number(summary.avgDelayDays || 0) > 0 && (
                <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">
                  ~{summary.avgDelayDays}d late
                </Badge>
              )}
            </div>
            <p className="mt-1 text-[11px] text-red-600 font-medium flex items-center gap-1">
              <span>View delayed records</span>
              <ArrowRight className="w-3 h-3" />
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Pending (On-Track) */}
        <Card
          onClick={() => navigateToRecords("PENDING_ON_TRACK")}
          className="cursor-pointer transition-all duration-200 hover:shadow-md border-slate-200 hover:border-amber-400 hover:bg-amber-50/20 bg-white"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Pending (On-Track)
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-amber-600 tracking-tight">
              {fmt.format(summary.pendingOnTrack || 0)}
            </p>
            <p className="mt-1 text-[11px] text-amber-600 font-medium flex items-center gap-1">
              <span>View on-track records</span>
              <ArrowRight className="w-3 h-3" />
            </p>
          </CardContent>
        </Card>

        {/* Card 5: Pending (Overdue) */}
        <Card
          onClick={() => navigateToRecords("PENDING_OVERDUE")}
          className="cursor-pointer transition-all duration-200 hover:shadow-md border-slate-200 hover:border-rose-400 hover:bg-rose-50/20 bg-white"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Pending (Overdue)
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-rose-600 tracking-tight">
              {fmt.format(summary.pendingOverdue || 0)}
            </p>
            <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center gap-1">
              <span>View overdue records</span>
              <ArrowRight className="w-3 h-3" />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Month-Wise Volume & SLA Breakdown Chart ── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Month-Wise Document Uploads vs SLA Delivery
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Click any month bar to open its filtered document records.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {monthlySeries.length > 0 ? (
            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={monthlySeries}
                  onClick={handleChartClick}
                  margin={{ top: 10, right: 20, bottom: 0, left: -10 }}
                  className="cursor-pointer"
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                  />
                  <YAxis
                    yAxisId="left"
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    unit="%"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#10b981" }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs space-y-1">
                          <p className="font-bold text-slate-900 mb-1">{item.label}</p>
                          <div className="flex justify-between gap-4 text-emerald-600">
                            <span>On-Time:</span>
                            <span className="font-bold">{item.onTimeUploads}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-red-600">
                            <span>Delayed:</span>
                            <span className="font-bold">{item.delayedUploads}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-slate-700 pt-1 border-t border-slate-100">
                            <span>Total Uploads:</span>
                            <span className="font-bold">{item.totalUploads}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-blue-600 font-bold">
                            <span>SLA Rate:</span>
                            <span>{item.onTimeRate}%</span>
                          </div>
                          <p className="text-[10px] text-blue-600 font-semibold mt-1 flex items-center gap-1">
                            Click to open {item.label} records →
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: "12px", fontSize: "11px" }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="onTimeUploads"
                    name="On-Time Uploads"
                    stackId="uploads"
                    fill="#10b981"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="delayedUploads"
                    name="Delayed Uploads"
                    stackId="uploads"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="onTimeRate"
                    name="On-Time Rate %"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#0284c7" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-slate-400">
              No upload data recorded for the selected date range.
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
