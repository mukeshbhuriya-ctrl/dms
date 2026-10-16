import React, { useMemo, useState, useCallback, useEffect } from "react";
import ProDataTable from "@/components/shared/ProDataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  FilterX,
  Building2,
  Calendar,
} from "lucide-react";
import { getNcrRecords, exportNcrRecords, downloadNcrPdf } from "@/api/ncr_analytics.api";
import { toast } from "sonner";

const resolveRow = (row) => row?.original || row;

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return String(dateStr);
  }
}

export default function NcrRecordsTable({
  initialStartDate,
  initialEndDate,
  initialMonth = "ALL",
  initialStatus = "ALL",
  monthsList = [],
  onBackToAnalytics,
}) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    setSelectedMonth(initialMonth);
  }, [initialMonth]);

  useEffect(() => {
    setStatusFilter(initialStatus);
  }, [initialStatus]);

  const handleResetFilters = useCallback(() => {
    setSelectedMonth("ALL");
    setStatusFilter("ALL");
    setTableRefreshKey((k) => k + 1);
  }, []);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      toast.info("Preparing Excel export...");
      const params = {
        startDate: initialStartDate,
        endDate: initialEndDate,
        month: selectedMonth !== "ALL" ? selectedMonth : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      };
      const blob = await exportNcrRecords(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NCR_Register_${selectedMonth !== "ALL" ? selectedMonth : "ALL"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Excel downloaded successfully");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to generate Excel export");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async (item, e) => {
    e?.stopPropagation();
    try {
      setDownloadingId(item.id);
      toast.info(`Downloading PDF for ${item.ncr_no}...`);
      const blob = await downloadNcrPdf(item.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NCR_${item.ncr_no || item.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${item.ncr_no} PDF`);
    } catch (err) {
      console.error("PDF download error:", err);
      toast.error(`Failed to download PDF`);
    } finally {
      setDownloadingId(null);
    }
  };

  const fetchTableData = useCallback(
    async ({ page, limit, search, sortBy, sortOrder }) => {
      try {
        const params = {
          page,
          limit,
          search: search || undefined,
          sortBy: sortBy || "date",
          sortOrder: sortOrder || "desc",
          startDate: initialStartDate,
          endDate: initialEndDate,
          month: selectedMonth !== "ALL" ? selectedMonth : undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
        };

        const res = await getNcrRecords(params);
        if (res?.success) {
          const rows = Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
          const total =
            res.meta?.total ??
            res.pagination?.total ??
            res.data?.pagination?.total ??
            rows.length;
          const totalPages =
            res.meta?.totalPages ??
            res.pagination?.totalPages ??
            res.data?.pagination?.totalPages ??
            1;

          return {
            data: rows,
            meta: {
              total,
              totalPages,
              page,
            },
            total,
            totalPages,
          };
        }
        return { data: [], meta: { total: 0, totalPages: 1, page: 1 }, total: 0, totalPages: 1 };
      } catch (err) {
        console.error("Failed to fetch NCR records:", err);
        toast.error("Failed to load NCR records");
        return { data: [], meta: { total: 0, totalPages: 1, page: 1 }, total: 0, totalPages: 1 };
      }
    },
    [initialStartDate, initialEndDate, selectedMonth, statusFilter]
  );

  const columns = useMemo(
    () => [
      {
        accessorKey: "ncr_no",
        header: "NCR Number & Date",
        enableSorting: true,
        cell: (row) => {
          const item = resolveRow(row);
          return (
            <div className="flex flex-col">
              <span className="font-bold text-xs text-blue-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>{item.ncr_no}</span>
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">
                {formatDate(item.date || item.createdAt)}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "monthTag",
        header: "Month",
        enableSorting: false,
        cell: (row) => {
          const item = resolveRow(row);
          return (
            <Badge
              variant="outline"
              className="bg-slate-50 text-slate-700 border-slate-200 text-[11px] font-semibold whitespace-nowrap"
            >
              <Calendar className="w-3 h-3 mr-1 text-slate-400" />
              {item.monthTag || "—"}
            </Badge>
          );
        },
      },
      {
        accessorKey: "client",
        header: "Client & Job",
        enableSorting: true,
        cell: (row) => {
          const item = resolveRow(row);
          return (
            <div className="flex flex-col max-w-[200px]">
              <div className="flex items-center gap-1 text-xs font-semibold text-slate-900 truncate">
                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate" title={item.client}>{item.client}</span>
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                <span>Job: {item.job_number || "—"}</span>
                {item.po_no && item.po_no !== "—" && (
                  <span className="ml-1 text-slate-400">| PO: {item.po_no}</span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "description",
        header: "Non-Conformance Description",
        enableSorting: false,
        cell: (row) => {
          const item = resolveRow(row);
          return (
            <div
              className="text-xs text-slate-700 max-w-[280px] line-clamp-2"
              title={item.description}
            >
              {item.description || "—"}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        enableSorting: true,
        cell: (row) => {
          const item = resolveRow(row);
          if (item.status === "CLOSED" || item.is_closed) {
            return (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold gap-1 whitespace-nowrap">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Closed
              </Badge>
            );
          }
          if (item.status === "REJECTED" || item.is_rejected) {
            return (
              <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] font-bold gap-1 whitespace-nowrap">
                <XCircle className="w-3 h-3 text-red-600" />
                Rejected
              </Badge>
            );
          }
          return (
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold gap-1 whitespace-nowrap">
              <Clock className="w-3 h-3 text-amber-600" />
              Open / In-Review
            </Badge>
          );
        },
      },
      {
        accessorKey: "turnaroundDays",
        header: "Time Taken",
        enableSorting: true,
        cell: (row) => {
          const item = resolveRow(row);
          const days = item.turnaroundDays;
          if (days === null || days === undefined) return <span className="text-xs text-slate-400">—</span>;
          const isClosed = item.status === "CLOSED" || item.is_closed;
          return (
            <span
              className={`text-xs font-semibold ${
                isClosed ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {days}d {isClosed ? "resolved" : "elapsed"}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        width: "90px",
        cell: (row) => {
          const item = resolveRow(row);
          const isDownloading = downloadingId === item.id;
          return (
            <div className="flex items-center justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => handleDownloadPdf(item, e)}
                disabled={isDownloading}
                className="h-7 px-2.5 text-xs font-medium text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 gap-1.5 cursor-pointer shadow-none"
                title="Download Official PDF Report"
              >
                <Download className={`w-3.5 h-3.5 text-emerald-600 ${isDownloading ? "animate-bounce" : ""}`} />
                <span>PDF</span>
              </Button>
            </div>
          );
        },
      },
    ],
    [downloadingId]
  );

  return (
    <div className="w-full">
      {/* ── ProDataTable with customToolbarActions (Zero extra section box above table) ── */}
      <ProDataTable
        columns={columns}
        fetchData={fetchTableData}
        refreshKey={tableRefreshKey}
        globalSearchPlaceholder="Search by NCR number, client, job..."
        customToolbarActions={
          <div className="flex items-center gap-2 flex-wrap">
  
            {/* Month Filter */}
            <Select
              value={selectedMonth}
              onValueChange={(val) => {
                setSelectedMonth(val);
                setTableRefreshKey((k) => k + 1);
              }}
            >
              <SelectTrigger className="w-[130px] h-9 text-xs bg-white font-medium border-slate-200 shadow-none">
                <SelectValue placeholder="All Months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Months</SelectItem>
                {monthsList.map((m) => (
                  <SelectItem key={m.key} value={m.key} className="text-xs">
                    {m.label} ({m.totalRaised})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setTableRefreshKey((k) => k + 1);
              }}
            >
              <SelectTrigger className="w-[120px] h-9 text-xs bg-white font-medium border-slate-200 shadow-none">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Status</SelectItem>
                <SelectItem value="OPEN" className="text-xs">Open</SelectItem>
                <SelectItem value="CLOSED" className="text-xs">Closed</SelectItem>
                <SelectItem value="REJECTED" className="text-xs">Rejected</SelectItem>
              </SelectContent>
            </Select>

            {(selectedMonth !== "ALL" || statusFilter !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 px-2 text-xs text-slate-500 hover:text-slate-900 gap-1 cursor-pointer"
                title="Reset Filters"
              >
                <FilterX className="w-3.5 h-3.5" />
                <span>Reset</span>
              </Button>
            )}

            {/* Excel Export Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={isExporting}
              className="h-9 px-3 text-xs font-semibold text-emerald-800 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 gap-1.5 cursor-pointer shadow-none"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 text-emerald-700 ${isExporting ? "animate-spin" : ""}`} />
              <span>Excel</span>
            </Button>
            {onBackToAnalytics && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBackToAnalytics}
                className="h-9 px-3 text-xs font-semibold text-slate-700 bg-white border-slate-200 hover:bg-slate-100 gap-1.5 cursor-pointer shadow-none"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
                <span>Back to Dashboard</span>
              </Button>
            )}
          </div>
        }
      />
    </div>
  );
}
