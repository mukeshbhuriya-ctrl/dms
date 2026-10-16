import React, { useMemo } from "react";
import Chart from "react-apexcharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, ArrowRight } from "lucide-react";

export default function NcrMonthlyTrendChart({
  monthlyBreakdown = [],
  onNavigateToLedger,
}) {
  const categories = useMemo(
    () => monthlyBreakdown.map((m) => m.shortLabel || m.label),
    [monthlyBreakdown]
  );
  const raisedData = useMemo(
    () => monthlyBreakdown.map((m) => m.totalRaised || 0),
    [monthlyBreakdown]
  );
  const closedData = useMemo(
    () => monthlyBreakdown.map((m) => m.closedCount || 0),
    [monthlyBreakdown]
  );
  const openData = useMemo(
    () => monthlyBreakdown.map((m) => m.openCount || 0),
    [monthlyBreakdown]
  );

  const series = useMemo(
    () => [
      { name: "Raised", data: raisedData },
      { name: "Closed", data: closedData },
      { name: "Open", data: openData },
    ],
    [raisedData, closedData, openData]
  );

  const options = useMemo(
    () => ({
      chart: {
        height: 290,
        type: "bar",
        fontFamily: "inherit",
        toolbar: { show: false },
        events: {
          dataPointSelection: (event, chartContext, config) => {
            const index = config.dataPointIndex;
            if (index >= 0 && monthlyBreakdown[index]) {
              const target = monthlyBreakdown[index];
              onNavigateToLedger?.({ month: target.key, status: "ALL" });
            }
          },
        },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: monthlyBreakdown.length > 8 ? "50%" : "38%",
          borderRadius: 3,
        },
      },
      dataLabels: { enabled: false },
      stroke: { show: true, width: 1, colors: ["transparent"] },
      colors: ["#3b82f6", "#10b981", "#f59e0b"],
      legend: {
        position: "top",
        horizontalAlign: "left",
        fontSize: "12px",
        markers: { radius: 12 },
        itemMargin: { horizontal: 8, vertical: 0 },
      },
      xaxis: {
        categories,
        labels: {
          style: { colors: "#64748b", fontSize: "11px" },
          rotate: monthlyBreakdown.length > 10 ? -45 : 0,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        title: {
          text: "Number of NCRs",
          style: { color: "#64748b", fontSize: "11px", fontWeight: 500 },
        },
        labels: {
          formatter: (val) => Math.round(val),
          style: { colors: "#64748b", fontSize: "11px" },
        },
        min: 0,
        forceNiceScale: true,
      },
      grid: {
        borderColor: "#f1f5f9",
        strokeDashArray: 3,
      },
      tooltip: {
        shared: true,
        intersect: false,
        theme: "light",
        y: {
          formatter: (val) => `${val} NCRs`,
        },
      },
    }),
    [categories, monthlyBreakdown, onNavigateToLedger]
  );

  return (
    <Card className="border-slate-200 bg-white shadow-xs">
      <CardHeader className="pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            Monthly NCR Trend
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Click any month bar to inspect its records in the ledger.
          </CardDescription>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigateToLedger?.({ month: "ALL", status: "ALL" })}
          className="h-8 px-3 text-xs font-semibold text-blue-700 bg-blue-50/50 border-blue-200 hover:bg-blue-100/60 gap-1.5 cursor-pointer"
        >
          <span>View All Records</span>
          <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
        </Button>
      </CardHeader>

      <CardContent className="pt-2 pb-2">
        {monthlyBreakdown.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-slate-400 text-xs">
            No records for this timeframe.
          </div>
        ) : (
          <Chart options={options} series={series} type="bar" height={290} />
        )}
      </CardContent>
    </Card>
  );
}
