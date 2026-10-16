import React, { useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { Building2, ArrowRight, BarChart2, Table as TableIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const fmt = new Intl.NumberFormat("en-IN");

export default function DepartmentEngagementTable({ breakdown = [], onSelectDepartment }) {
  const [displayMode, setDisplayMode] = useState("chart"); // 'chart' | 'table' | 'both'

  const categories = useMemo(() => breakdown.map((d) => d.name || "Unknown"), [breakdown]);
  const activeSeries = useMemo(() => breakdown.map((d) => d.actuallyActiveUsers), [breakdown]);
  const passiveSeries = useMemo(() => breakdown.map((d) => d.passiveUsers), [breakdown]);
  const dormantSeries = useMemo(() => breakdown.map((d) => d.dormantUsers), [breakdown]);

  const apexSeries = useMemo(
    () => [
      {
        name: "Active Working Users",
        data: activeSeries,
      },
      {
        name: "Passive Users",
        data: passiveSeries,
      },
      {
        name: "Inactive Users",
        data: dormantSeries,
      },
    ],
    [activeSeries, passiveSeries, dormantSeries]
  );

  const apexOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        height: Math.max(220, breakdown.length * 36),
        stacked: true,
        stackType: "100%",
        fontFamily: "inherit",
        toolbar: {
          show: true,
          tools: {
            download: true,
          },
          export: {
            csv: { filename: `Dept_Engagement_${new Date().toISOString().slice(0, 10)}` },
            svg: { filename: `Dept_Engagement_${new Date().toISOString().slice(0, 10)}` },
            png: { filename: `Dept_Engagement_${new Date().toISOString().slice(0, 10)}` },
          },
        },
        events: {
          dataPointSelection: (event, chartContext, config) => {
            const index = config.dataPointIndex;
            if (index >= 0 && breakdown[index]) {
              onSelectDepartment?.(breakdown[index].id);
            }
          },
        },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 3,
          barHeight: "55%",
        },
      },
      stroke: {
        width: 1,
        colors: ["#fff"],
      },
      colors: ["#10b981", "#f59e0b", "#94a3b8"],
      xaxis: {
        categories: categories,
        labels: {
          formatter: (val) => `${val}%`,
          style: { colors: "#64748b", fontSize: "11px" },
        },
        axisBorder: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: "#334155", fontSize: "11px", fontWeight: 600 },
        },
      },
      tooltip: {
        theme: "light",
        y: {
          formatter: (val, { seriesIndex, dataPointIndex }) => {
            const dept = breakdown[dataPointIndex];
            const total = dept?.totalUsers || 1;
            const pct = Math.round((val / total) * 100);
            return `${val} users (${pct}%)`;
          },
        },
      },
      legend: {
        position: "top",
        horizontalAlign: "right",
        fontSize: "11px",
        fontWeight: 600,
        markers: { radius: 12 },
        itemMargin: { horizontal: 8, vertical: 0 },
      },
      grid: {
        borderColor: "#f1f5f9",
        strokeDashArray: 3,
        padding: { top: 0, right: 10, bottom: 0, left: 10 },
      },
    }),
    [categories, breakdown, onSelectDepartment]
  );

  return (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Department Engagement & Adoption
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Departmental breakdown comparing logged-in presence with active transactional system usage.
            </CardDescription>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <Button
              variant={displayMode === "chart" ? "secondary" : "ghost"}
              size="xs"
              onClick={() => setDisplayMode("chart")}
              className={`h-7 px-2.5 text-xs font-semibold gap-1 ${
                displayMode === "chart" ? "bg-white shadow-xs text-blue-700" : "text-slate-600"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              ApexChart
            </Button>
            <Button
              variant={displayMode === "table" ? "secondary" : "ghost"}
              size="xs"
              onClick={() => setDisplayMode("table")}
              className={`h-7 px-2.5 text-xs font-semibold gap-1 ${
                displayMode === "table" ? "bg-white shadow-xs text-blue-700" : "text-slate-600"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Ledger Table
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        {breakdown.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No department engagement data available for this timeframe.
          </div>
        ) : (
          <>
            {displayMode === "chart" && (
              <div className="w-full">
                <Chart
                  options={apexOptions}
                  series={apexSeries}
                  type="bar"
                  height={Math.max(220, breakdown.length * 36)}
                />
              </div>
            )}

            {displayMode === "table" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3 text-center">Total Users</th>
                      <th className="py-2.5 px-3 text-center">Logged In</th>
                      <th className="py-2.5 px-3 text-center">Active Working Users</th>
                      <th className="py-2.5 px-3 text-center">Passive Users</th>
                      <th className="py-2.5 px-3 text-center">Inactive Users</th>
                      <th className="py-2.5 px-3">Active Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {breakdown.map((dept) => (
                      <tr
                        key={dept.id}
                        onClick={() => onSelectDepartment?.(dept.id)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{dept.name}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                          {fmt.format(dept.totalUsers)}
                        </td>
                        <td className="py-2.5 px-3 text-center text-blue-700 font-semibold">
                          {fmt.format(dept.loggedInUsers)}
                        </td>
                        <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">
                          {fmt.format(dept.actuallyActiveUsers)}
                        </td>
                        <td className="py-2.5 px-3 text-center text-amber-600 font-semibold">
                          {fmt.format(dept.passiveUsers)}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-400">
                          {fmt.format(dept.dormantUsers)}
                        </td>
                        <td className="py-2.5 px-3 w-40">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, Math.max(0, dept.activityRate))}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-700 w-8 text-right">
                              {dept.activityRate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
