import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { RefreshCw, FileWarning, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getNcrOverview } from "@/api/ncr_analytics.api";
import { toast } from "sonner";

import NcrAnalyticsKpis from "./components/ncr_analytics_kpis";
import NcrMonthlyTrendChart from "./components/ncr_monthly_trend_chart";
import NcrRecordsTable from "./components/ncr_records_table";

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

export default function NcrAnalytics({ defaultView = "analytics" }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentView = searchParams.get("ncr_view") || defaultView;
  const urlMonth = searchParams.get("ncr_month") || "ALL";
  const urlStatus = searchParams.get("ncr_status") || "ALL";

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
      const res = await getNcrOverview({
        startDate,
        endDate,
      });
      if (res?.success && res?.data) {
        setOverviewData(res.data);
      } else {
        toast.error("Failed to load NCR analytics");
      }
    } catch (err) {
      console.error("Error loading NCR overview:", err);
      toast.error("Error connecting to NCR analytics engine");
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
      params.set("ncr_view", "ledger");
      if (status && status !== "ALL") params.set("ncr_status", status);
      else params.delete("ncr_status");
      if (month && month !== "ALL") params.set("ncr_month", month);
      else params.delete("ncr_month");
      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  const navigateBackToAnalytics = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete("ncr_view");
    params.delete("ncr_status");
    params.delete("ncr_month");
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  // Filtered Ledger Table (ProDataTable, Flat Screen)
  if (currentView === "ledger") {
    return (
      <NcrRecordsTable
        initialStartDate={startDate}
        initialEndDate={endDate}
        initialMonth={urlMonth}
        initialStatus={urlStatus}
        monthsList={monthsList}
        onBackToAnalytics={navigateBackToAnalytics}
      />
    );
  }

  // VIEW 3: Clean, Minimal Analytics Dashboard with Industry-Standard Date Range Filter
  return (
    <div className="space-y-4">
      {/* ── Header with Industry-Standard Date Filter & Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <FileWarning className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              NCR Analytics
            </h2>
            <p className="text-xs text-slate-500">
              Non-conformance reports, resolution velocity, and monthly trend analysis.
            </p>
          </div>
        </div>

        {/* Controls: Date Range Preset, Custom Date Pickers, Refresh, View All Records */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Calendar Preset Dropdown */}
          <Select value={preset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[155px] h-9 bg-white border-slate-300 text-xs font-semibold shadow-xs">
              <Calendar className="w-4 h-4 mr-1 text-slate-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESET_RANGES.map((r) => (
                <SelectItem key={r.id} value={r.id} className="text-xs">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Custom Date Range Pickers (shown when Custom Date Range is selected) */}
          {preset === "CUSTOM" && (
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-slate-300">
              <span className="text-[11px] font-medium text-slate-400">From:</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-7 w-[125px] text-xs px-1 border-0 focus-visible:ring-0 shadow-none"
              />
              <span className="text-[11px] font-medium text-slate-400">To:</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-7 w-[125px] text-xs px-1 border-0 focus-visible:ring-0 shadow-none"
              />
            </div>
          )}

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOverview}
            disabled={isLoading}
            className="h-9 px-3 text-xs gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          {/* View All Records Button */}
          <Button
            size="sm"
            onClick={() => navigateToLedger({ status: "ALL", month: "ALL" })}
            className="h-9 px-3.5 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>View All Records</span>
            {kpis.totalRaised !== undefined && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-blue-500 text-[10px] text-white font-semibold">
                {kpis.totalRaised}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* ── 4 Minimal KPI Cards (Click any card to view filtered records) ── */}
      <NcrAnalyticsKpis
        kpis={kpis}
        onNavigateToLedger={navigateToLedger}
      />

      {/* ── Monthly Trend Chart (Click any month bar to view records) ── */}
      <NcrMonthlyTrendChart
        monthlyBreakdown={monthsList}
        onNavigateToLedger={navigateToLedger}
      />
    </div>
  );
}
