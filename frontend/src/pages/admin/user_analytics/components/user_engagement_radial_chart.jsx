import React, { useMemo } from "react";
import Chart from "react-apexcharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Gauge, CheckCircle2, AlertTriangle, Users } from "lucide-react";

export default function UserEngagementRadialChart({ kpis = {} }) {
  const {
    loginRate = 0,
    activeRate = 0,
    passiveRate = 0,
    totalRegistered = 0,
    loggedInUsers = 0,
    actuallyActiveUsers = 0,
    passiveUsers = 0,
  } = kpis;

  const apexSeries = useMemo(() => [loginRate, activeRate, passiveRate], [loginRate, activeRate, passiveRate]);

  const apexOptions = useMemo(
    () => ({
      chart: {
        height: 290,
        type: "radialBar",
        fontFamily: "inherit",
      },
      plotOptions: {
        radialBar: {
          offsetY: 0,
          startAngle: 0,
          endAngle: 270,
          hollow: {
            margin: 5,
            size: "30%",
            background: "transparent",
            image: undefined,
          },
          dataLabels: {
            name: {
              show: false,
            },
            value: {
              show: false,
            },
          },
          track: {
            background: "#f1f5f9",
            strokeWidth: "100%",
          },
        },
      },
      colors: ["#38bdf8", "#10b981", "#f59e0b"],
      labels: ["Logged-In Users", "Active Working Users", "Passive Users"],
      legend: {
        show: true,
        floating: true,
        fontSize: "11px",
        fontWeight: 600,
        position: "left",
        offsetX: 0,
        offsetY: 10,
        labels: {
          useSeriesColors: true,
        },
        markers: {
          size: 0,
        },
        formatter: (seriesName, opts) => {
          return `${seriesName}: ${opts.w.globals.series[opts.seriesIndex]}%`;
        },
        itemMargin: {
          vertical: 3,
        },
      },
      tooltip: {
        enabled: true,
        theme: "light",
        y: {
          formatter: (val) => `${val}%`,
        },
      },
    }),
    []
  );

  return (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-emerald-600" />
          User Engagement & Adoption Gauge
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          User adoption breakdown measuring active system involvement.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-[60%] flex items-center justify-center">
            <Chart options={apexOptions} series={apexSeries} type="radialBar" height={280} />
          </div>

          <div className="w-full sm:w-[40%] space-y-2.5 border-t sm:border-t-0 sm:border-l border-slate-100 sm:pl-4 pt-3 sm:pt-0">
            <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-900">Logged-In Users</span>
                <span className="text-xs font-black text-blue-700">{loginRate}%</span>
              </div>
              <p className="text-[10px] text-blue-600 mt-0.5">
                {loggedInUsers} of {totalRegistered} registered users logged in
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-900">Active Working Users</span>
                <span className="text-xs font-black text-emerald-700">{activeRate}%</span>
              </div>
              <p className="text-[10px] text-emerald-600 mt-0.5">
                {actuallyActiveUsers} users modified or created documents/records
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-900">Passive Users</span>
                <span className="text-xs font-black text-amber-700">{passiveRate}%</span>
              </div>
              <p className="text-[10px] text-amber-600 mt-0.5">
                {passiveUsers} logged in without modifying records
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
