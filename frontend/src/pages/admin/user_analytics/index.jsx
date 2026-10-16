import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Users,
  Activity,
  Calendar,
  RefreshCw,
  LogIn,
  Clock,
  Building2,
  FileText,
  Filter,
} from "lucide-react";
import apiClient from "@/api/api.client";
import userAnalyticsApi from "@/api/user_analytics.api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

import UserAnalyticsKpis from "./components/user_analytics_kpis";
import UserActivityTrendChart from "./components/user_activity_trend_chart";
import UserEngagementRadialChart from "./components/user_engagement_radial_chart";
import ModuleActivityDonutChart from "./components/module_activity_donut_chart";
import InactivityAgeingCards from "./components/inactivity_ageing_cards";
import DepartmentEngagementTable from "./components/department_engagement_table";
import UserLoginRecordsTable from "./components/user_login_records_table";
import UserProductivityTable from "./components/user_productivity_table";
import UserInactivityRosterTable from "./components/user_inactivity_roster_table";

const PRESET_RANGES = [
  { id: "LAST_7_DAYS", label: "Last 7 Days", days: 7 },
  { id: "LAST_30_DAYS", label: "Last 30 Days", days: 30 },
  { id: "CUSTOM", label: "Custom Range", days: null },
];

function getPresetDates(presetId) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  let start = new Date(now);

  const preset = PRESET_RANGES.find((p) => p.id === presetId);
  const days = preset?.days || 30;

  if (presetId === "THIS_YEAR") {
    start = new Date(now.getFullYear(), 0, 1);
  } else {
    start.setDate(now.getDate() - days);
    start.setHours(0, 0, 0, 0);
  }

  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

export default function UserManagementAnalytics({ defaultView = "analytics" }) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read view and filters from URL or default
  const currentView = searchParams.get("view") || defaultView;
  const urlStatus = searchParams.get("status") || "ALL";
  const urlTier = searchParams.get("tier") || "ALL";
  const urlBucket = searchParams.get("bucket") || "ALL";
  const urlDept = searchParams.get("dept") || "ALL";

  // Date filters
  const [preset, setPreset] = useState("LAST_30_DAYS");
  const [dateRange, setDateRange] = useState(() => getPresetDates("LAST_30_DAYS"));
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Departments list for filter
  const [departments, setDepartments] = useState([]);

  // Analytics data
  const [isLoading, setIsLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [departmentBreakdown, setDepartmentBreakdown] = useState([]);
  const [inactivityData, setInactivityData] = useState(null);

  // Load departments once
  useEffect(() => {
    let isMounted = true;
    apiClient
      .get("/api/departments")
      .then((res) => {
        if (isMounted) {
          const list = Array.isArray(res) ? res : res?.data || [];
          setDepartments(list);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch overview & analytics data
  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        department_id: urlDept !== "ALL" ? urlDept : undefined,
      };

      const [overviewRes, trendsRes, deptsRes, inactivityRes] = await Promise.all([
        userAnalyticsApi.getUserOverview(params),
        userAnalyticsApi.getUserTrends(params),
        userAnalyticsApi.getUserDepartments(params),
        userAnalyticsApi.getUserInactivity({ department_id: params.department_id }),
      ]);

      setOverview(overviewRes.data);
      setTrends(trendsRes.data?.series || []);
      setDepartmentBreakdown(deptsRes.data?.breakdown || []);
      setInactivityData(inactivityRes.data);
    } catch (err) {
      toast.error("Failed to load user analytics data");
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, urlDept]);

  useEffect(() => {
    if (currentView === "analytics") {
      loadAnalytics();
    }
  }, [currentView, loadAnalytics]);

  // Date preset change handler
  const handlePresetChange = (newPreset) => {
    setPreset(newPreset);
    if (newPreset !== "CUSTOM") {
      const dates = getPresetDates(newPreset);
      setDateRange(dates);
    }
  };

  const handleApplyCustomDates = () => {
    if (!customStart || !customEnd) {
      toast.warning("Please select both start and end dates");
      return;
    }
    setDateRange({
      startDate: customStart,
      endDate: customEnd,
    });
  };

  // Navigation helpers
  const navigateToView = (viewName, extraParams = {}) => {
    const params = new URLSearchParams(searchParams);
    params.set("view", viewName);
    Object.entries(extraParams).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    setSearchParams(params);
  };

  const navigateBackToAnalytics = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("view");
    params.delete("status");
    params.delete("tier");
    params.delete("bucket");
    setSearchParams(params);
  };

  // ── VIEW 1: User Login Records Table (ProDataTable, No Card Wrap) ──
  if (currentView === "logins") {
    return (
      <UserLoginRecordsTable
        initialStatus={urlStatus}
        initialDepartmentId={urlDept !== "ALL" ? urlDept : null}
        initialStartDate={dateRange.startDate}
        initialEndDate={dateRange.endDate}
        onBackToAnalytics={navigateBackToAnalytics}
      />
    );
  }

  // ── VIEW 2: User Productivity & Audit Table (ProDataTable, No Card Wrap) ──
  if (currentView === "productivity") {
    return (
      <UserProductivityTable
        initialTier={urlTier}
        initialDepartmentId={urlDept !== "ALL" ? urlDept : null}
        initialStartDate={dateRange.startDate}
        initialEndDate={dateRange.endDate}
        onBackToAnalytics={navigateBackToAnalytics}
      />
    );
  }

  // ── VIEW 3: Inactivity Ageing Roster Table (ProDataTable, No Card Wrap) ──
  if (currentView === "inactivity") {
    return (
      <UserInactivityRosterTable
        initialBucket={urlBucket}
        initialDepartmentId={urlDept !== "ALL" ? urlDept : null}
        onBackToAnalytics={navigateBackToAnalytics}
      />
    );
  }

  // ── VIEW 4: High-Level Analytics & Graphs Dashboard ──
  return (
    <div className="space-y-4">
      {/* ── Minimal Header & Filter Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-white border border-slate-200/90 rounded-xl shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight whitespace-nowrap">
              User Management & Activity Analytics
            </h2>
          </div>
        </div>

        {/* Global Filter Controls & Ledger Navigation Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <Select
            value={urlDept}
            onValueChange={(val) => {
              const params = new URLSearchParams(searchParams);
              if (val !== "ALL") params.set("dept", val);
              else params.delete("dept");
              setSearchParams(params);
            }}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs bg-white font-medium border-slate-300">
              <Building2 className="w-3.5 h-3.5 mr-1 text-slate-500" />
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id} className="text-xs">
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Preset Filter */}
          <Select value={preset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-white font-medium border-slate-300">
              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
              <SelectValue placeholder="Timeframe" />
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
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-6 w-28 text-[11px] p-1 border-0"
              />
              <span className="text-[11px] text-slate-400">to</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-6 w-28 text-[11px] p-1 border-0"
              />
              <Button size="xs" onClick={handleApplyCustomDates} className="h-6 px-2 text-[10px]">
                Apply
              </Button>
            </div>
          )}

          {/* Quick Ledgers Links */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateToView("logins")}
            className="h-8 px-2.5 text-xs font-semibold gap-1.5 text-blue-700 bg-white border-blue-200 hover:bg-blue-50"
          >
            <LogIn className="w-3.5 h-3.5" />
            Login Records
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateToView("productivity")}
            className="h-8 px-2.5 text-xs font-semibold gap-1.5 text-emerald-700 bg-white border-emerald-200 hover:bg-emerald-50"
          >
            <Activity className="w-3.5 h-3.5" />
            Audit Records
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateToView("inactivity")}
            className="h-8 px-2.5 text-xs font-semibold gap-1.5 text-amber-700 bg-white border-amber-200 hover:bg-amber-50"
          >
            <Clock className="w-3.5 h-3.5" />
            Inactivity Roster
          </Button>

          {/* Manual Refresh */}
          <Button
            variant="ghost"
            size="icon"
            onClick={loadAnalytics}
            disabled={isLoading}
            className="h-8 w-8 text-slate-500 hover:text-slate-800"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ── 5 Engagement KPIs ── */}
      <UserAnalyticsKpis
        kpis={overview?.kpis || {}}
        onNavigateToLogins={(status) => navigateToView("logins", { status })}
        onNavigateToProductivity={(tier) => navigateToView("productivity", { tier })}
        onNavigateToInactivity={(bucket) => navigateToView("inactivity", { bucket })}
      />

      {/* ── Visual Analytics Section ── */}
      <div className="grid grid-cols-1 gap-4">
        {/* Daily Activity Mixed Timeline */}
        <UserActivityTrendChart
          series={trends}
          onChartClick={(data) => {
            if (data?.activePayload?.[0]?.payload?.date) {
              const d = data.activePayload[0].payload.date;
              navigateToView("logins", { startDate: d, endDate: d });
            }
          }}
        />

        {/* 2-Column Visual Gauges & Module Breakdown (ApexCharts) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <UserEngagementRadialChart kpis={overview?.kpis || {}} />
          <ModuleActivityDonutChart
            moduleDistribution={overview?.moduleDistribution || []}
            totalOperations={overview?.kpis?.totalAuditOperations || 0}
          />
        </div>

        {/* Inactivity Decay Distribution (Apex Distributed Column + 7 Cards) */}
        <InactivityAgeingCards
          buckets={inactivityData?.buckets || {}}
          totalUsers={inactivityData?.totalUsers || 0}
          onSelectBucket={(bucket) => navigateToView("inactivity", { bucket })}
        />

        {/* Departmental Adoption Comparison (Apex 100% Stacked Bar + Ledger Table) */}
        <DepartmentEngagementTable
          breakdown={departmentBreakdown}
          onSelectDepartment={(deptId) => {
            const params = new URLSearchParams(searchParams);
            params.set("dept", deptId);
            setSearchParams(params);
          }}
        />
      </div>
    </div>
  );
}
