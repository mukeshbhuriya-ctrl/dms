import React, { useMemo } from "react";
import Chart from "react-apexcharts";
import {
  Clock,
  ShieldAlert,
  ArrowRight,
  UserCheck,
  AlertTriangle,
  AlertCircle,
  Ban,
  BarChart3,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const BUCKET_CONFIG = {
  "0-10": {
    label: "0–10 Days",
    sublabel: "Active Accounts",
    color: "#10b981", // Emerald
    borderClass: "hover:border-emerald-400 hover:bg-emerald-50/20",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: UserCheck,
    textClass: "text-emerald-700",
  },
  "11-20": {
    label: "11–20 Days",
    sublabel: "Mild Inactivity",
    color: "#0284c7", // Sky/Blue
    borderClass: "hover:border-blue-400 hover:bg-blue-50/20",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Clock,
    textClass: "text-blue-700",
  },
  "21-30": {
    label: "21–30 Days",
    sublabel: "Moderate Risk",
    color: "#f59e0b", // Amber
    borderClass: "hover:border-amber-400 hover:bg-amber-50/20",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    icon: AlertTriangle,
    textClass: "text-amber-700",
  },
  "31-60": {
    label: "31–60 Days",
    sublabel: "Inactive Accounts",
    color: "#f97316", // Orange
    borderClass: "hover:border-orange-400 hover:bg-orange-50/20",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
    icon: AlertCircle,
    textClass: "text-orange-700",
  },
  "61-90": {
    label: "61–90 Days",
    sublabel: "Severe Inactivity",
    color: "#f43f5e", // Rose
    borderClass: "hover:border-rose-400 hover:bg-rose-50/20",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
    icon: ShieldAlert,
    textClass: "text-rose-700",
  },
  "90+": {
    label: "> 90 Days",
    sublabel: "Dormant / Abandoned",
    color: "#dc2626", // Red
    borderClass: "hover:border-red-400 hover:bg-red-50/20",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
    icon: Ban,
    textClass: "text-red-700",
  },
  never: {
    label: "Never Active",
    sublabel: "No Activity Recorded",
    color: "#64748b", // Slate
    borderClass: "hover:border-slate-400 hover:bg-slate-50/30",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
    icon: Clock,
    textClass: "text-slate-700",
  },
};

const BUCKET_KEYS = ["0-10", "11-20", "21-30", "31-60", "61-90", "90+", "never"];

export default function InactivityAgeingCards({ buckets = {}, totalUsers = 0, onSelectBucket }) {
  const chartCategories = useMemo(
    () => BUCKET_KEYS.map((k) => BUCKET_CONFIG[k].label),
    []
  );

  const chartData = useMemo(
    () => BUCKET_KEYS.map((k) => (buckets[k]?.count || 0)),
    [buckets]
  );

  const chartColors = useMemo(
    () => BUCKET_KEYS.map((k) => BUCKET_CONFIG[k].color),
    []
  );

  const apexSeries = useMemo(
    () => [
      {
        name: "Users",
        data: chartData,
      },
    ],
    [chartData]
  );

  const apexOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        height: 180,
        fontFamily: "inherit",
        toolbar: { show: false },
        events: {
          dataPointSelection: (event, chartContext, config) => {
            const index = config.dataPointIndex;
            if (index >= 0 && BUCKET_KEYS[index]) {
              onSelectBucket?.(BUCKET_KEYS[index]);
            }
          },
        },
      },
      plotOptions: {
        bar: {
          distributed: true,
          borderRadius: 4,
          borderRadiusApplication: "end",
          columnWidth: "40%",
          dataLabels: {
            position: "top",
          },
        },
      },
      colors: chartColors,
      dataLabels: {
        enabled: true,
        formatter: (val) => {
          if (!val) return "0";
          const pct = totalUsers > 0 ? Math.round((val / totalUsers) * 100) : 0;
          return `${val} (${pct}%)`;
        },
        offsetY: -18,
        style: {
          fontSize: "10px",
          fontWeight: 700,
          colors: ["#334155"],
        },
      },
      legend: { show: false },
      xaxis: {
        categories: chartCategories,
        labels: {
          style: {
            colors: "#64748b",
            fontSize: "11px",
            fontWeight: 600,
          },
        },
        axisBorder: { show: true, color: "#e2e8f0" },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: "#64748b", fontSize: "10px" },
          formatter: (v) => Math.round(v),
        },
      },
      tooltip: {
        theme: "light",
        y: {
          formatter: (val, { dataPointIndex }) => {
            const key = BUCKET_KEYS[dataPointIndex];
            const cfg = BUCKET_CONFIG[key];
            const pct = totalUsers > 0 ? ((val / totalUsers) * 100).toFixed(1) : 0;
            return `${val} users (${pct}%) - ${cfg.sublabel}`;
          },
        },
      },
      grid: {
        borderColor: "#f1f5f9",
        strokeDashArray: 3,
        padding: { top: 15, right: 10, bottom: 0, left: 10 },
      },
    }),
    [chartCategories, chartColors, totalUsers, onSelectBucket]
  );

  return (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Inactivity & Ageing Analysis
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Accounts categorized by days elapsed since their last login or modifying system action. Click any threshold to inspect users.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Visual ApexCharts Distribution Bar */}
        <div className="w-full bg-slate-50/50 p-2 rounded-lg border border-slate-100">
          <Chart options={apexOptions} series={apexSeries} type="bar" height={165} />
        </div>

        {/* 7 Color-coded Threshold Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {BUCKET_KEYS.map((key) => {
            const config = BUCKET_CONFIG[key] || {};
            const bucketData = buckets[key] || { count: 0 };
            const Icon = config.icon || Clock;
            const pct = totalUsers > 0 ? Math.round((bucketData.count / totalUsers) * 100) : 0;

            return (
              <div
                key={key}
                onClick={() => onSelectBucket?.(key)}
                className={`p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer transition-all duration-200 hover:shadow-md ${config.borderClass}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {config.label}
                  </span>
                  <Icon className={`w-3.5 h-3.5 ${config.textClass}`} />
                </div>
                <div className="mt-1.5 flex items-baseline justify-between gap-1">
                  <p className={`text-lg font-black tracking-tight ${config.textClass}`}>
                    {bucketData.count}
                  </p>
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 font-bold ${config.badgeClass}`}>
                    {pct}%
                  </Badge>
                </div>
                <p className="mt-0.5 text-[9px] text-slate-400 truncate">
                  {config.sublabel}
                </p>
                <p className="mt-1 text-[9px] font-semibold text-slate-600 flex items-center gap-0.5">
                  <span>View</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
