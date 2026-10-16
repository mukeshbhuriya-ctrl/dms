import React, { useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, LogIn, Activity, BarChart2, Layers, TrendingUp } from "lucide-react";

const fmt = new Intl.NumberFormat("en-IN");

export default function UserActivityTrendChart({ series = [], onChartClick }) {
  // Chart mode: "grouped" (default) | "stacked" | "area"
  const [chartMode, setChartMode] = useState("grouped");

  const chartCategories = useMemo(() => series.map((s) => s.label), [series]);
  const loggedInData = useMemo(
    () => series.map((s) => (s.loggedInUsers !== undefined ? s.loggedInUsers : s.logins || 0)),
    [series]
  );
  const activeUserData = useMemo(() => series.map((s) => s.activeUsers || 0), [series]);
  const passiveUserData = useMemo(
    () => series.map((s) => Math.max(0, (s.loggedInUsers || s.logins || 0) - (s.activeUsers || 0))),
    [series]
  );

  // Aggregate summary metrics across the period
  const totals = useMemo(() => {
    let peakLoggedIn = 0;
    let peakActive = 0;
    let totalLoggedInSum = 0;
    let totalActiveSum = 0;

    series.forEach((s) => {
      const logged = s.loggedInUsers !== undefined ? s.loggedInUsers : s.logins || 0;
      const active = s.activeUsers || 0;
      if (logged > peakLoggedIn) peakLoggedIn = logged;
      if (active > peakActive) peakActive = active;
      totalLoggedInSum += logged;
      totalActiveSum += active;
    });

    const avgEngagementRate =
      totalLoggedInSum > 0 ? Math.round((totalActiveSum / totalLoggedInSum) * 100) : 0;

    return { peakLoggedIn, peakActive, avgEngagementRate };
  }, [series]);

  // Dynamic series based on selected mode
  const apexSeries = useMemo(() => {
    if (chartMode === "stacked") {
      return [
        {
          name: "Active Working Users",
          data: activeUserData,
        },
        {
          name: "Passive Users",
          data: passiveUserData,
        },
      ];
    }

    // Default "grouped" or "area"
    return [
      {
        name: "Total Logged-In Users",
        data: loggedInData,
      },
      {
        name: "Active Working Users",
        data: activeUserData,
      },
    ];
  }, [chartMode, loggedInData, activeUserData, passiveUserData]);

  const apexColors = useMemo(() => {
    if (chartMode === "stacked") {
      return ["#10b981", "#f59e0b"]; // Emerald (Active) + Amber (Passive)
    }
    return ["#0284c7", "#10b981"]; // Sky Blue (Logged in) + Emerald (Active working)
  }, [chartMode]);

  const apexOptions = useMemo(
    () => ({
      chart: {
        height: 310,
        type: chartMode === "area" ? "area" : "bar",
        stacked: chartMode === "stacked",
        fontFamily: "inherit",
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true,
          },
          export: {
            csv: { filename: `User_Daily_Activity_${new Date().toISOString().slice(0, 10)}` },
            svg: { filename: `User_Daily_Activity_${new Date().toISOString().slice(0, 10)}` },
            png: { filename: `User_Daily_Activity_${new Date().toISOString().slice(0, 10)}` },
          },
        },
        events: {
          dataPointSelection: (event, chartContext, config) => {
            const index = config.dataPointIndex;
            if (index >= 0 && series[index]) {
              onChartClick?.({
                activePayload: [{ payload: series[index] }],
              });
            }
          },
        },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: series.length > 20 ? "60%" : "44%",
          borderRadius: 4,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        width: chartMode === "area" ? 2.5 : 1,
        curve: "smooth",
        colors: chartMode === "area" ? undefined : ["transparent"],
      },
      fill: {
        type: chartMode === "area" ? "gradient" : "solid",
        opacity: chartMode === "area" ? [0.45, 0.6] : 0.95,
        gradient: {
          shade: "light",
          type: "vertical",
          opacityFrom: 0.55,
          opacityTo: 0.05,
          stops: [0, 100],
        },
      },
      colors: apexColors,
      legend: {
        position: "top",
        horizontalAlign: "left", // On top-left, so it never collides with toolbar
        fontSize: "12px",
        fontWeight: 600,
        markers: { radius: 12, width: 10, height: 10 },
        itemMargin: { horizontal: 10, vertical: 2 },
        offsetY: 2,
      },
      xaxis: {
        type: "category",
        categories: chartCategories,
        labels: {
          style: {
            colors: "#64748b",
            fontSize: "11px",
            fontWeight: 500,
          },
          rotate: series.length > 15 ? -45 : 0,
          rotateAlways: false,
        },
        axisBorder: { show: true, color: "#e2e8f0" },
        axisTicks: { show: false },
      },
      yaxis: {
        title: {
          text: "Unique Users",
          style: { color: "#64748b", fontSize: "11px", fontWeight: 600 },
        },
        labels: {
          style: { colors: "#64748b", fontSize: "11px" },
          formatter: (val) => Math.round(val),
        },
        min: 0,
        forceNiceScale: true,
      },
      tooltip: {
        shared: true,
        intersect: false,
        theme: "light",
        y: {
          formatter: (val) => (val !== undefined ? `${val} user${val === 1 ? "" : "s"}` : "0"),
        },
        style: { fontSize: "12px" },
      },
      grid: {
        borderColor: "#f1f5f9",
        strokeDashArray: 3,
        padding: { top: 0, right: 10, bottom: 0, left: 10 },
      },
    }),
    [chartMode, chartCategories, series, apexColors, onChartClick]
  );

  return (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardHeader className="pb-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Daily User Activity: Logged-In vs Actually Active Users
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Daily comparison of total logged-in presence against users actually performing modifying operations in the system. Click any bar to inspect users.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Switcher: Grouped Bars vs Stacked Bars vs Area */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <Button
                variant={chartMode === "grouped" ? "secondary" : "ghost"}
                size="xs"
                onClick={() => setChartMode("grouped")}
                className={`h-7 px-2 text-xs font-semibold gap-1 ${
                  chartMode === "grouped" ? "bg-white shadow-xs text-blue-700" : "text-slate-600"
                }`}
                title="Grouped Side-by-Side Comparison"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                Grouped
              </Button>
              <Button
                variant={chartMode === "stacked" ? "secondary" : "ghost"}
                size="xs"
                onClick={() => setChartMode("stacked")}
                className={`h-7 px-2 text-xs font-semibold gap-1 ${
                  chartMode === "stacked" ? "bg-white shadow-xs text-blue-700" : "text-slate-600"
                }`}
                title="Stacked (Active + Passive = Total)"
              >
                <Layers className="w-3.5 h-3.5" />
                Stacked
              </Button>
              <Button
                variant={chartMode === "area" ? "secondary" : "ghost"}
                size="xs"
                onClick={() => setChartMode("area")}
                className={`h-7 px-2 text-xs font-semibold gap-1 ${
                  chartMode === "area" ? "bg-white shadow-xs text-blue-700" : "text-slate-600"
                }`}
                title="Smooth Area Waves"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Area
              </Button>
            </div>

            {/* Quick Period Summary Badges */}
            <Badge
              variant="outline"
              className="text-[11px] font-semibold bg-sky-50 text-sky-800 border-sky-200 gap-1 py-1"
            >
              <LogIn className="w-3 h-3 text-sky-600" />
              Peak {totals.peakLoggedIn} Logged In
            </Badge>

            <Badge
              variant="outline"
              className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 border-emerald-200 gap-1 py-1"
            >
              <Activity className="w-3 h-3 text-emerald-600" />
              Peak {totals.peakActive} Active (Working)
            </Badge>

            <Badge
              variant="outline"
              className="text-[11px] font-semibold bg-indigo-50 text-indigo-800 border-indigo-200 gap-1 py-1"
            >
              {totals.avgEngagementRate}% Working Rate
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {series.length > 0 ? (
          <div className="w-full">
            <Chart
              options={apexOptions}
              series={apexSeries}
              type={chartMode === "area" ? "area" : "bar"}
              height={310}
            />
          </div>
        ) : (
          <div className="h-[240px] flex items-center justify-center text-sm text-slate-400">
            No user activity records found for this period.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
