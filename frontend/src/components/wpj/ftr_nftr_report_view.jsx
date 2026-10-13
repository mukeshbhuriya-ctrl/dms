import React, { useState, useMemo, useCallback } from "react";
import ProDataTable from "@/components/shared/ProDataTable";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import apiClient from "@/api/api.client";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";

const getJointCategoryBadge = (category) => {
  const cat = (category || "").toUpperCase();
  if (cat === "A") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
        A
      </span>
    );
  } else if (cat === "B") {
    return (
      <span className="inline-flex items-center rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-600 dark:text-orange-400">
        B
      </span>
    );
  } else if (cat === "C") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
        C
      </span>
    );
  } else if (cat === "D") {
    return (
      <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-600 dark:text-purple-400">
        D
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-500/10 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
      {category || "-"}
    </span>
  );
};

export default function FtrNftrReportView({ selectedPlanDetails, onBack, refreshKey = 0 }) {
  const [qualityTypeFilter, setQualityTypeFilter] = useState("ALL"); // 'ALL' | 'FTR' | 'NFTR'

  const fetchQualityMetricsData = useCallback(
    async ({ page, limit, search }) => {
      try {
        const planId = selectedPlanDetails?.id;
        const type = qualityTypeFilter || "ALL";
        const url = `/api/wpj/reports/quality-metrics?type=${type}${planId ? `&plan_id=${planId}` : ""}`;
        const res = await apiClient.get(url);
        let data = res.data || [];

        if (search) {
          const q = search.toLowerCase();
          data = data.filter((item) =>
            Object.values(item).some((val) => String(val || "").toLowerCase().includes(q))
          );
        }

        const total = data.length;
        const p = page || 1;
        const l = limit || 10;
        const start = (p - 1) * l;
        const paginated = data.slice(start, start + l);

        return {
          data: paginated,
          meta: { total, page: p, limit: l, totalPages: Math.max(1, Math.ceil(total / l)) },
        };
      } catch (err) {
        console.error("Error fetching quality metrics:", err);
        return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
      }
    },
    [selectedPlanDetails?.id, qualityTypeFilter, refreshKey]
  );

  const handleQualityExport = useCallback(async () => {
    try {
      const planId = selectedPlanDetails?.id;
      const type = qualityTypeFilter || "ALL";
      const url = `/api/wpj/reports/quality-metrics?type=${type}${planId ? `&plan_id=${planId}` : ""}`;
      const res = await apiClient.get(url);
      const rows = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);

      if (rows.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        const sheetName = `${type} Metrics`;
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        const colWidths = [
          { wch: 10 }, // Type
          { wch: 15 }, // Job No
          { wch: 22 }, // Plan No
          { wch: 12 }, // Joint No
          { wch: 10 }, // Category
          { wch: 14 }, // Stage Name
          { wch: 12 }, // Status
          { wch: 20 }, // Prod Engineer
          { wch: 20 }, // QC Engineer
          { wch: 20 }, // Submitted At
          { wch: 20 }, // Approved At
          { wch: 20 }, // Rejected At
          { wch: 25 }, // Remarks
        ];
        worksheet["!cols"] = colWidths;

        const planNoClean = (selectedPlanDetails?.weld_plan_no || "All_Plans").replace(/[^a-zA-Z0-9_-]/g, "_");
        XLSX.writeFile(workbook, `Weld_Plan_${planNoClean}_${type}_Report.xlsx`);
        toast.success(`Exported ${type} Report successfully!`, { theme: "colored" });
      } else {
        toast.info("No data available to export.", { theme: "colored" });
      }
    } catch (err) {
      console.error("Quality metrics export error:", err);
      toast.error("Failed to export quality metrics report.");
    }
  }, [selectedPlanDetails?.id, selectedPlanDetails?.weld_plan_no, qualityTypeFilter]);

  const columns = useMemo(
    () => [
      {
        id: "type",
        accessorKey: "Type",
        header: "Metric",
        width: "90px",
        cell: (row) => {
          const isFTR = row.Type === "FTR";
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                isFTR
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {row.Type}
            </span>
          );
        },
      },
      {
        accessorKey: "Job No",
        header: "Job No",
      },
      {
        accessorKey: "Plan No",
        header: "Plan No",
      },
      {
        accessorKey: "Joint No",
        header: "Joint No",
      },
      {
        accessorKey: "Category",
        header: "Category",
        cell: (row) => getJointCategoryBadge(row.Category),
      },
      {
        accessorKey: "Stage Name",
        header: "Stage Name",
        cell: (row) => {
          const name = row["Stage Name"] || "";
          return <span className="capitalize font-medium text-slate-700">{name.replace("stage", "Stage ")}</span>;
        },
      },
      {
        accessorKey: "Status",
        header: "Status",
        cell: (row) => {
          const status = (row.Status || "").toLowerCase();
          const isApproved = status === "approved";
          const isRejected = status === "rejected";
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                isApproved
                  ? "bg-emerald-100 text-emerald-800"
                  : isRejected
                  ? "bg-red-100 text-red-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {row.Status}
            </span>
          );
        },
      },
      {
        accessorKey: "Production Engineer",
        header: "Prod Engineer",
        cell: (row) => row["Production Engineer"] || "-",
      },
      {
        accessorKey: "QC Engineer",
        header: "QC Engineer",
        cell: (row) => row["QC Engineer"] || "-",
      },
      {
        accessorKey: "Submitted At",
        header: "Submitted At",
        cell: (row) => (row["Submitted At"] ? new Date(row["Submitted At"]).toLocaleDateString() : "-"),
      },
      {
        accessorKey: "Approved At",
        header: "Approved At",
        cell: (row) => (row["Approved At"] ? new Date(row["Approved At"]).toLocaleDateString() : "-"),
      },
      {
        accessorKey: "Rejected At",
        header: "Rejected At",
        cell: (row) => (row["Rejected At"] ? new Date(row["Rejected At"]).toLocaleDateString() : "-"),
      },
      {
        accessorKey: "Remarks",
        header: "Remarks",
        cell: (row) => row.Remarks || "-",
      },
    ],
    []
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full w-full gap-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 pb-1 border-b border-slate-100">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-sm font-semibold tracking-tight text-slate-800">
              FTR / NFTR Quality Report
            </h2>
            <span className="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              {selectedPlanDetails?.weld_plan_no}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
            <span>
              Job: <span className="font-medium text-slate-700">{selectedPlanDetails?.job?.job_number || "-"}</span>
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Equipment:{" "}
              <span className="font-medium text-slate-700">
                {selectedPlanDetails?.equipment_name || selectedPlanDetails?.job?.equipement_name || "-"}
              </span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="shadow-none h-7 px-2.5 text-xs text-slate-700 border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Plans
          </Button>
        </div>
      </div>

      <ProDataTable
        columns={columns}
        fetchData={fetchQualityMetricsData}
        refreshKey={`${refreshKey}_${qualityTypeFilter}`}
        globalSearchPlaceholder="Search joint no, stage, status, engineer..."
        customToolbarActions={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md shadow-xs bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setQualityTypeFilter("ALL")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-sm transition-colors cursor-pointer",
                  qualityTypeFilter === "ALL"
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setQualityTypeFilter("FTR")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-sm transition-colors cursor-pointer",
                  qualityTypeFilter === "FTR"
                    ? "bg-white text-emerald-700 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-emerald-700"
                )}
              >
                FTR
              </button>
              <button
                type="button"
                onClick={() => setQualityTypeFilter("NFTR")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-sm transition-colors cursor-pointer",
                  qualityTypeFilter === "NFTR"
                    ? "bg-white text-rose-700 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-rose-700"
                )}
              >
                NFTR
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleQualityExport}
              className="h-9 bg-white hover:bg-slate-50 text-slate-700 shadow-none cursor-pointer"
            >
              <Download className="mr-2 h-4 w-4" /> Export Excel
            </Button>
          </div>
        }
      />
    </div>
  );
}
