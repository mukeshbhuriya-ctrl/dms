import React, { useMemo } from "react";
import Chart from "react-apexcharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Layers } from "lucide-react";

const fmt = new Intl.NumberFormat("en-IN");

const DONUT_COLORS = [
  "#6366f1", // Indigo
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#64748b", // Slate
];

export default function ModuleActivityDonutChart({ moduleDistribution = [], totalOperations = 0 }) {
  const chartLabels = useMemo(
    () => moduleDistribution.map((m) => (m.module ? m.module.toUpperCase() : "GENERAL")),
    [moduleDistribution]
  );

  const chartSeries = useMemo(
    () => moduleDistribution.map((m) => m.count),
    [moduleDistribution]
  );

  const apexOptions = useMemo(
    () => ({
      chart: {
        type: "donut",
        height: 290,
        fontFamily: "inherit",
        toolbar: {
          show: true,
          tools: {
            download: true,
          },
          export: {
            csv: { filename: `Module_Activity_${new Date().toISOString().slice(0, 10)}` },
            svg: { filename: `Module_Activity_${new Date().toISOString().slice(0, 10)}` },
            png: { filename: `Module_Activity_${new Date().toISOString().slice(0, 10)}` },
          },
        },
      },
      labels: chartLabels,
      colors: DONUT_COLORS.slice(0, Math.max(1, chartLabels.length)),
      plotOptions: {
        pie: {
          donut: {
            size: "70%",
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: "12px",
                fontWeight: 600,
                color: "#64748b",
                offsetY: -5,
              },
              value: {
                show: true,
                fontSize: "20px",
                fontWeight: 800,
                color: "#0f172a",
                offsetY: 5,
                formatter: (val) => fmt.format(Number(val)),
              },
              total: {
                show: true,
                label: "Total Actions",
                fontSize: "11px",
                fontWeight: 600,
                color: "#64748b",
                formatter: () => fmt.format(totalOperations),
              },
            },
          },
        },
      },
      dataLabels: {
        enabled: false,
      },
      legend: {
        position: "bottom",
        horizontalAlign: "center",
        fontSize: "11px",
        fontWeight: 500,
        markers: { radius: 12 },
        itemMargin: { horizontal: 6, vertical: 2 },
        formatter: (seriesName, opts) => {
          const val = opts.w.globals.series[opts.seriesIndex];
          const pct = totalOperations > 0 ? Math.round((val / totalOperations) * 100) : 0;
          return `${seriesName}: ${fmt.format(val)} (${pct}%)`;
        },
      },
      stroke: {
        width: 2,
        colors: ["#ffffff"],
      },
      tooltip: {
        theme: "light",
        y: {
          formatter: (val) => {
            const pct = totalOperations > 0 ? ((val / totalOperations) * 100).toFixed(1) : 0;
            return `${fmt.format(val)} actions (${pct}%)`;
          },
        },
      },
    }),
    [chartLabels, totalOperations]
  );

  return (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          Productivity by Functional Module
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Distribution of modifying operations across DMS system domains.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {chartSeries.length > 0 && totalOperations > 0 ? (
          <div className="w-full flex items-center justify-center">
            <Chart options={apexOptions} series={chartSeries} type="donut" height={280} />
          </div>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-xs text-slate-400">
            No modifying audit records recorded in this timeframe.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
