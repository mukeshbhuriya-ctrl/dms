import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { RefreshCw, GitPullRequest, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDcrOverview } from "@/api/dcr_analytics.api";
import { toast } from "sonner";

import DcrAnalyticsKpis from "./components/dcr_analytics_kpis";
import DcrMonthlyTrendChart from "./components/dcr_monthly_trend_chart";
import DcrRecordsTable from "./components/dcr_records_table";

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

export default function DcrAnalytics({ defaultView = "analytics" }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentView = searchParams.get("dcr_view") || defaultView;
  const urlMonth = searchParams.get("dcr_month") || "ALL";
  const urlStatus = searchParams.get("dcr_status") || "ALL";

  // Industry-standard Date Range Presets
  const [preset, setPreset] = useState("LAST_6_MONTHS");
  const initialDates = useMemo(() => getPresetDates("LAST_6_MONTHS"), []);
  const [startDate, setStartDate] = useState(initialDates.startDate);
  const [endDate, setEndDate] = useState(initialDates.endDate);

  const [isLoading, setIsLoading] = useState(false);
  const [overviewData, setOverviewData] = useState(null);

  // Handle Preset Change
  const handlePresetChange = (newPreset) => {
    setPreset(newPreset);
    if (newPreset !== "CUSTOM") {
      const { startDate: s, endDate: e } = getPresetDates(newPreset);
      setStartDate(s);
      setEndDate(e);
    }
  };

  const fetchOverview = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getDcrOverview({
        startDate,
        endDate,
      });
      if (res?.success && res?.data) {
        setOverviewData(res.data);
      } else {
        toast.error("Failed to load DCR analytics");
      }
    } catch (err) {
      console.error("Error loading DCR overview:", err);
      toast.error("Error connecting to DCR analytics engine");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const monthsList = useMemo(() => {
    return overviewData?.monthlySeries || [];
  }, [overviewData]);

  const kpis = overviewData?.kpis || {};

  // Navigation helpers
  const navigateToLedger = useCallback(
    ({ status = "ALL", month = "ALL" } = {}) => {
      const params = new URLSearchParams(searchParams);
      params.set("dcr_view", "ledger");
      if (status && status !== "ALL") params.set("dcr_status", status);
      else params.delete("dcr_status");
      if (month && month !== "ALL") params.set("dcr_month", month);
      else params.delete("dcr_month");
      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  const navigateBackToAnalytics = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete("dcr_view");
    params.delete("dcr_status");
    params.delete("dcr_month");
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  // Filtered Ledger Table (ProDataTable, Flat Screen)
  if (currentView === "ledger") {
    return (
      <DcrRecordsTable
        initialStartDate={startDate}
        initialEndDate={endDate}
        initialMonth={urlMonth}
        initialStatus={urlStatus}
        monthsList={monthsList}
        onBackToAnalytics={navigateBackToAnalytics}
      />
    );
  }

  // Clean, Minimal Analytics Dashboard with Industry-Standard Date Range Filter
  return (
    <div className="space-y-4">
      {/* ── Minimal Header Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <GitPullRequest className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">
            Month-Wise DCR Analytics
          </h2>
        </div>

        {/* Date Filter & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <Select value={preset} onValueChange={handlePresetChange}>
              <SelectTrigger className="h-7 w-[135px] text-xs bg-transparent border-0 shadow-none focus:ring-0 p-0 font-medium text-slate-700">
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
          </div>

          {preset === "CUSTOM" && (
            <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-400">From:</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-6 text-xs w-[115px] p-0 border-0 focus-visible:ring-0 shadow-none"
              />
              <span className="text-[11px] text-slate-400">To:</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-6 text-xs w-[115px] p-0 border-0 focus-visible:ring-0 shadow-none"
              />
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={fetchOverview}
            disabled={isLoading}
            className="h-8 w-8 p-0 text-xs text-slate-600 bg-white hover:bg-slate-50 border-slate-200 shadow-xs cursor-pointer"
            title="Refresh Overview"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <DcrAnalyticsKpis
        kpis={kpis}
        onNavigateToLedger={navigateToLedger}
      />

      {/* ── Monthly Trend Chart ── */}
      <DcrMonthlyTrendChart
        monthlyBreakdown={monthsList}
        onNavigateToLedger={navigateToLedger}
      />
    </div>
  );
}
