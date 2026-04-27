import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileClock,
  FileSpreadsheet,
  FileText,
  FolderGit2,
  GitBranch,
  RefreshCw,
  ScrollText,
  Send,
  ShieldAlert,
  SquareStack,
  Wrench,
} from "lucide-react";
import { toast } from "react-toastify";

import commonApi from "@/api/common.api";
import job360Api from "@/api/job360.api";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const numberFmt = new Intl.NumberFormat("en-IN");

function formatValue(value) {
  const parsed = Number(value || 0);
  if (Number.isNaN(parsed)) return "0";
  return numberFmt.format(parsed);
}

function formatDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("attention") || normalized.includes("reject") || normalized.includes("open")) {
    return "bg-red-50 text-red-700 border-red-200";
  }
  if (normalized.includes("review") || normalized.includes("draft") || normalized.includes("active")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (
    normalized.includes("completed") ||
    normalized.includes("approved") ||
    normalized.includes("linked")
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (normalized.includes("not")) {
    return "bg-slate-100 text-slate-500 border-slate-200";
  }
  return "bg-blue-50 text-blue-700 border-blue-200";
}

function CountPill({ label, value }) {
  const displayValue = typeof value === "number" ? formatValue(value) : value;
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{displayValue || "N/A"}</p>
    </div>
  );
}

function KpiCard({ title, value, description, Icon }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold text-slate-700">{title}</CardTitle>
          {Icon ? <Icon className="h-4 w-4 text-slate-500" /> : null}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tracking-tight text-slate-900">
          {typeof value === "number" ? formatValue(value) : value}
        </p>
        <CardDescription className="mt-1 text-xs text-slate-500">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}

function SectionCard({ title, description, status, actionLabel, onAction, children }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/70">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-900">{title}</CardTitle>
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusTone(status)}`}>
                {status}
              </span>
            </div>
            <CardDescription className="text-xs text-slate-500">{description}</CardDescription>
          </div>
          {actionLabel ? (
            <Button variant="outline" size="sm" className="h-8 gap-1 bg-white text-xs" onClick={onAction}>
              {actionLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">{children}</CardContent>
    </Card>
  );
}

function SimpleTable({ columns, rows, emptyTitle, emptyDescription }) {
  if (!rows?.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-100">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, index) => (
            <tr key={row.id || `${columns[0]?.key || "row"}-${index}`} className="hover:bg-slate-50/60">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-xs text-slate-700">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QualityModuleCard({ title, module, actionLabel, onAction }) {
  return (
    <SectionCard
      title={title}
      description="Status and latest reports for this quality module."
      status={module.status}
      actionLabel={actionLabel}
      onAction={onAction}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <CountPill label="Total Reports" value={module.total} />
        <CountPill label="Approved" value={module.counts.approved} />
        <CountPill label="Pending" value={module.counts.pending + module.counts.submitted + module.counts.draft} />
      </div>
      <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">Approval Progress</span>
          <span className="font-semibold text-slate-500">{module.approvedPercent}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${module.approvedPercent}%` }} />
        </div>
      </div>
      <SimpleTable
        columns={[
          { key: "no", label: "Report No" },
          { key: "status", label: "Status", render: (row) => <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${statusTone(row.status)}`}>{row.status}</span> },
          { key: "date", label: "Date", render: (row) => formatDate(row.date) },
        ]}
        rows={module.recent}
        emptyTitle="No reports yet"
        emptyDescription="This module has not been started for the selected job."
      />
    </SectionCard>
  );
}

export default function JobOverview() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isJobsLoading, setIsJobsLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const response = await commonApi.getJobs();
        const options = (response.data || []).map((job) => ({
          value: job.id,
          label: `${job.job_number} ${job.equipement_name ? `(${job.equipement_name})` : ""}`,
          rawJobNumber: job.job_number,
        }));
        setJobs(options);
        if (options.length > 0) {
          setSelectedJobId((currentValue) => currentValue || options[0].value);
        }
      } catch {
        toast.error("Failed to load jobs");
      } finally {
        setIsJobsLoading(false);
      }
    }

    fetchJobs();
  }, []);

  useEffect(() => {
    async function fetchSnapshot() {
      if (!selectedJobId) {
        setData(null);
        return;
      }

      setIsLoading(true);
      try {
        const response = await job360Api.getJobOverviewSnapshot(selectedJobId);
        setData(response.data || response);
      } catch (error) {
        setData(null);
        toast.error(error?.message || error?.data?.message || "Failed to load Job Overview");
      } finally {
        setIsLoading(false);
      }
    }

    fetchSnapshot();
  }, [selectedJobId]);

  const refreshSnapshot = async () => {
    if (!selectedJobId) return;
    setIsLoading(true);
    try {
      const response = await job360Api.getJobOverviewSnapshot(selectedJobId);
      setData(response.data || response);
      toast.success("Job overview refreshed");
    } catch (error) {
      toast.error(error?.message || error?.data?.message || "Failed to refresh Job Overview");
    } finally {
      setIsLoading(false);
    }
  };

  const navTo = (path, params = {}) => {
    const search = new URLSearchParams(params).toString();
    navigate(search ? `${path}?${search}` : path);
  };

  const selectedJobOption = jobs.find((job) => job.value === selectedJobId);
  const modules = data?.modules;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <SidebarTrigger className="-ml-2" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Job Overview</h1>
            <p className="text-xs text-slate-500">Job-centric snapshot across every linked module.</p>
          </div>
        </div>
      </header>

      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-slate-50/50 p-6">
        {!selectedJobId ? (
          <div className="flex h-[40vh] flex-col items-center justify-center text-center">
            <FolderGit2 className="mb-4 h-12 w-12 text-slate-300" />
            <h2 className="text-xl font-semibold text-slate-700">Select a Job</h2>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              Choose a job number to open the complete module overview for that job.
            </p>
          </div>
        ) : isLoading && !data ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="border-slate-200">
                  <CardContent className="h-28 animate-pulse bg-slate-100" />
                </Card>
              ))}
            </div>
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="border-slate-200">
                <CardContent className="h-56 animate-pulse bg-slate-100" />
              </Card>
            ))}
          </div>
        ) : data ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <SearchableSelect
                  options={jobs}
                  value={selectedJobId}
                  onValueChange={setSelectedJobId}
                  placeholder={isJobsLoading ? "Loading jobs..." : "Select Job Number..."}
                  disabled={isJobsLoading || isLoading}
                  className="min-w-0"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 self-start md:self-auto"
                disabled={!selectedJobId || isLoading}
                onClick={refreshSnapshot}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            <Card className="overflow-hidden border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/70">
                <CardTitle className="text-base font-bold text-slate-900">Job Details</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Primary identity and reference details for the selected job.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 bg-white p-6">
                <div className="grid gap-4 border-b border-slate-100 pb-5 md:grid-cols-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Job Number</p>
                    <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                      {data.job.jobNumber || selectedJobOption?.rawJobNumber || "Selected Job"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Customer</p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-800">{data.job.customerName}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">PO Number</p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-800">{data.job.poNumber}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <CountPill label="Equipment" value={data.job.equipmentName} />
                  <CountPill label="Tag No" value={data.job.tagNo} />
                  <CountPill label="Project ID" value={data.job.projectId} />
                  <CountPill label="Code" value={data.job.code} />
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/70">
                <CardTitle className="text-base font-bold text-slate-900">Overview Stats</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Fast read indicators across all linked job modules.
                </CardDescription>
              </CardHeader>
              <CardContent className="bg-white p-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <KpiCard title="Modules Complete" value={data.overview.completedModules} description={`Out of ${data.overview.totalModules} tracked modules`} Icon={CheckCircle2} />
                  <KpiCard title="Need Attention" value={data.overview.attentionModules} description="Modules with review, blockers, or open issues" Icon={AlertTriangle} />
                  <KpiCard title="Linked Drawings" value={data.overview.linkedDrawings} description="Drawing-master linked documents for this job" Icon={GitBranch} />
                  <KpiCard title="Quality Reports" value={data.overview.totalQualityReports} description="Across MHC, QAP, Hydro, Dish End, and Final Inspection" Icon={ShieldAlert} />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard title="DMS Documents" value={modules.dms.total} description={`${modules.dms.completionPercent}% documentation progress`} Icon={FileText} />
              <KpiCard title="Transmissions" value={modules.transmissions.total} description={`${modules.transmissions.totalDocuments} linked documents sent to client flows`} Icon={Send} />
              <KpiCard title="DTN Records" value={modules.dtn.total} description={`${modules.dtn.counts.sent || 0} distributed transmittals`} Icon={ScrollText} />
              <KpiCard title="Weld Plans" value={modules.wpj.plans} description={`${modules.wpj.totalJoints} active joints linked to this job`} Icon={Wrench} />
            </div>

            <div className="space-y-6">
              <SectionCard
                title="DMS"
                description="Assignment, upload, and approval health for job-linked documents."
                status={modules.dms.status}
                actionLabel="Open Documents"
                onAction={() => navTo("/dcc/documents", { jobId: data.job.id })}
              >
                <div className="grid gap-3 sm:grid-cols-5">
                  <CountPill label="Total" value={modules.dms.counts.total} />
                  <CountPill label="Pending" value={modules.dms.counts.pending} />
                  <CountPill label="Uploaded" value={modules.dms.counts.uploaded} />
                  <CountPill label="Approved" value={modules.dms.counts.approved} />
                  <CountPill label="Rejected" value={modules.dms.counts.rejected} />
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Documentation Completion</span>
                    <span className="font-semibold text-slate-500">{modules.dms.completionPercent}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${modules.dms.completionPercent}%` }} />
                  </div>
                </div>
                <SimpleTable
                  columns={[
                    { key: "documentNo", label: "Document No" },
                    { key: "documentName", label: "Title" },
                    { key: "versionNo", label: "Version", render: (row) => `V${row.versionNo}` },
                    { key: "status", label: "Status", render: (row) => <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${statusTone(row.status)}`}>{row.status}</span> },
                    { key: "date", label: "Uploaded", render: (row) => formatDate(row.date) },
                  ]}
                  rows={modules.dms.recentUploads}
                  emptyTitle="No document activity"
                  emptyDescription="No uploaded versions were found for this job yet."
                />
              </SectionCard>

              <SectionCard
                title="Transmissions"
                description="Client-facing document package snapshot for this job."
                status={modules.transmissions.status}
                actionLabel="Open Client Status"
                onAction={() => navTo("/dcc/client-approval-status", { jobId: data.job.id })}
              >
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <CountPill label="Packages" value={modules.transmissions.total} />
                  <CountPill label="Documents" value={modules.transmissions.totalDocuments} />
                  <CountPill label="Pending" value={modules.transmissions.counts.pending} />
                  <CountPill label="Sent" value={modules.transmissions.counts.sent} />
                  <CountPill label="Approved" value={modules.transmissions.counts.approved} />
                  <CountPill label="Rejected" value={modules.transmissions.counts.rejected} />
                </div>
                <SimpleTable
                  columns={[
                    { key: "no", label: "Transmission No" },
                    { key: "status", label: "Internal", render: (row) => <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${statusTone(row.status)}`}>{row.status}</span> },
                    { key: "clientStatus", label: "Client", render: (row) => <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${statusTone(row.clientStatus)}`}>{row.clientStatus}</span> },
                    { key: "documents", label: "Docs" },
                    { key: "date", label: "Date", render: (row) => formatDate(row.date) },
                  ]}
                  rows={modules.transmissions.recent}
                  emptyTitle="No transmissions"
                  emptyDescription="No transmitted packages were found for this job yet."
                />
              </SectionCard>

              <SectionCard
                title="Drawing Transmittal"
                description="DTN issue and distribution state for drawings linked to this job."
                status={modules.dtn.status}
                actionLabel="Open DTN"
                onAction={() => navTo("/dtn/drawing-transmittal", { jobId: data.job.id })}
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <CountPill label="Total DTNs" value={modules.dtn.total} />
                  <CountPill label="Draft" value={modules.dtn.counts.draft} />
                  <CountPill label="Distributed" value={modules.dtn.counts.sent} />
                </div>
                <SimpleTable
                  columns={[
                    { key: "refNo", label: "Ref No" },
                    { key: "status", label: "Status", render: (row) => <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${statusTone(row.status)}`}>{row.status}</span> },
                    { key: "itemsCount", label: "Items" },
                    { key: "date", label: "Date", render: (row) => formatDate(row.date) },
                  ]}
                  rows={modules.dtn.recent}
                  emptyTitle="No DTN activity"
                  emptyDescription="No drawing transmittals were found for this job yet."
                />
              </SectionCard>

              <SectionCard
                title="Drawing Master"
                description="Linked drawings, revisions, and recent drawing-level activity."
                status={modules.drawingMaster.status}
                actionLabel="Open Drawing Master"
                onAction={() => navTo("/dtn/drawing-master", { jobId: data.job.id })}
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <CountPill label="Linked Drawings" value={modules.drawingMaster.counts.linkedDocuments} />
                  <CountPill label="Recent Revisions" value={modules.drawingMaster.counts.revisions} />
                  <CountPill label="Recent Activities" value={modules.drawingMaster.counts.activities} />
                </div>
                <SimpleTable
                  columns={[
                    { key: "documentNo", label: "Drawing No" },
                    { key: "documentName", label: "Title" },
                    { key: "versionNo", label: "Version", render: (row) => `V${row.versionNo}` },
                    { key: "date", label: "Date", render: (row) => formatDate(row.date) },
                  ]}
                  rows={modules.drawingMaster.recentRevisions}
                  emptyTitle="No revision history"
                  emptyDescription="No drawing revisions were found for documents linked to this job."
                />
              </SectionCard>
            </div>

            <SectionCard
              title="Welding Pipeline"
              description="Plan coverage and stage clearance across all joints linked to this job."
              status={modules.wpj.status}
              actionLabel="Open Welding Joints"
              onAction={() => navTo("/view-weldingjoints", { type: "job", value: data.job.id })}
            >
              <div className="grid gap-3 md:grid-cols-4">
                <CountPill label="Plans" value={modules.wpj.plans} />
                <CountPill label="Total Joints" value={modules.wpj.totalJoints} />
                <CountPill label="S3 Approved" value={modules.wpj.stages.s3.approved} />
                <CountPill label="Pending Stages" value={modules.wpj.stages.s1.pending + modules.wpj.stages.s2.pending + modules.wpj.stages.s3.pending} />
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                {["s1", "s2", "s3"].map((stageKey) => {
                  const stage = modules.wpj.stages[stageKey];
                  const titleMap = {
                    s1: "S1 Visual Clearance",
                    s2: "S2 NDT Clearance",
                    s3: "S3 Final Release",
                  };
                  const approvedPercent = modules.wpj.totalJoints ? Math.round((stage.approved / modules.wpj.totalJoints) * 100) : 0;

                  return (
                    <div key={stageKey} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">{titleMap[stageKey]}</p>
                        <span className="text-xs font-semibold text-slate-500">{approvedPercent}%</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-slate-800 transition-all" style={{ width: `${approvedPercent}%` }} />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <CountPill label="Approved" value={stage.approved} />
                        <CountPill label="Pending" value={stage.pending + stage.submitted} />
                        <CountPill label="Rejected" value={stage.rejected} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <SimpleTable
                columns={[
                  { key: "no", label: "Plan No" },
                  { key: "drg", label: "Drawing No" },
                  { key: "code", label: "Code" },
                  { key: "date", label: "Created", render: (row) => formatDate(row.date) },
                ]}
                rows={modules.wpj.recentPlans}
                emptyTitle="No weld plans"
                emptyDescription="No welding plans have been created for this job yet."
              />
            </SectionCard>

            <div className="space-y-6">
              <QualityModuleCard title="Material Heat Chart" module={modules.mhc} actionLabel="Open MHC" onAction={() => navTo("/material-heat-chart", { jobId: data.job.id })} />
              <QualityModuleCard title="Quality Assurance Plan" module={modules.qap} actionLabel="Open QAP" onAction={() => navTo("/create-qarp", { jobId: data.job.id })} />
              <QualityModuleCard title="Hydrostatic Pressure Test" module={modules.hydro} actionLabel="Open Hydro" onAction={() => navTo("/hydrostatic-pressure-test", { jobId: data.job.id })} />
              <QualityModuleCard title="Dish End Inspection" module={modules.dishEnd} actionLabel="Open Dish End" onAction={() => navTo("/inspections/dish-end", { jobId: data.job.id })} />
              <QualityModuleCard title="Final Inspection" module={modules.finalInspection} actionLabel="Open Final Inspection" onAction={() => navTo("/inspections/final", { jobId: data.job.id })} />

              <SectionCard
                title="Unified Quality Timeline"
                description="Latest activity across all quality and inspection modules."
                status="Cross Module"
              >
                <SimpleTable
                  columns={[
                    { key: "type", label: "Module" },
                    { key: "no", label: "Report No" },
                    { key: "status", label: "Status", render: (row) => <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${statusTone(row.status)}`}>{row.status}</span> },
                    { key: "date", label: "Date", render: (row) => formatDate(row.date) },
                  ]}
                  rows={modules.qualityTimeline}
                  emptyTitle="No quality timeline"
                  emptyDescription="No quality events have been recorded for this job yet."
                />
              </SectionCard>
            </div>

            <div className="space-y-6">
              <SectionCard
                title="Design Change Request"
                description="Current design change workflow and latest submitted DCRs."
                status={modules.dcr.status}
                actionLabel="Open DCR"
                onAction={() => navTo("/dcr/dcr-request", { jobId: data.job.id })}
              >
                <div className="grid gap-3 sm:grid-cols-4">
                  <CountPill label="Total" value={modules.dcr.total} />
                  <CountPill label="Approved" value={modules.dcr.counts.approved} />
                  <CountPill label="Pending" value={modules.dcr.counts.pending + modules.dcr.counts.submitted + modules.dcr.counts.draft} />
                  <CountPill label="Rejected" value={modules.dcr.counts.rejected} />
                </div>
                <SimpleTable
                  columns={[
                    { key: "no", label: "DCR No" },
                    { key: "drgNo", label: "Drawing" },
                    { key: "status", label: "Status", render: (row) => <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${statusTone(row.status)}`}>{row.status}</span> },
                    { key: "date", label: "Date", render: (row) => formatDate(row.date) },
                  ]}
                  rows={modules.dcr.recent}
                  emptyTitle="No DCR records"
                  emptyDescription="No design change requests were found for this job."
                />
              </SectionCard>

              <SectionCard
                title="Non-Conformance Report"
                description="Open NCR load and the latest records in the workflow."
                status={modules.ncr.status}
                actionLabel="Open NCR"
                onAction={() => navTo("/ncr/create-ncr", { jobId: data.job.id })}
              >
                <div className="grid gap-3 sm:grid-cols-4">
                  <CountPill label="Open" value={modules.ncr.counts.open} />
                  <CountPill label="Closed" value={modules.ncr.counts.closed} />
                  <CountPill label="Draft" value={modules.ncr.counts.draft} />
                  <CountPill label="Pending" value={modules.ncr.counts.pending} />
                </div>
                <SimpleTable
                  columns={[
                    { key: "no", label: "NCR No" },
                    { key: "stage", label: "Stage", render: (row) => `Stage ${row.stage}` },
                    { key: "status", label: "Status", render: (row) => <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${statusTone(row.status)}`}>{row.status}</span> },
                    { key: "date", label: "Date", render: (row) => formatDate(row.date) },
                  ]}
                  rows={modules.ncr.recent}
                  emptyTitle="No NCR records"
                  emptyDescription="No NCRs were found for this job."
                />
              </SectionCard>

              <SectionCard
                title="Commercial Snapshot"
                description="PO-linked RFQ and quotation state tied back to the job."
                status={modules.rfq.status}
                actionLabel="Open RFQ Register"
                onAction={() => navTo("/marketing/rfq-register", { po: data.job.poNumber })}
              >
                {modules.rfq.record ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CountPill label="Quotation No" value={modules.rfq.record.quotationNo} />
                      <CountPill label="Quoted Items" value={modules.rfq.counts.quotedItems} />
                      <CountPill label="Quoted Value" value={`INR ${formatValue(modules.rfq.record.quotedValue)}`} />
                      <CountPill label="PO Value" value={`INR ${formatValue(modules.rfq.record.poValue)}`} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Shreno Status</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{modules.rfq.record.shrenoStatus || "N/A"}</p>
                      </div>
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Client Status</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{modules.rfq.record.clientStatus || "N/A"}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Enquiry Date</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{formatDate(modules.rfq.record.enqDate)}</p>
                      </div>
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Target Date</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{formatDate(modules.rfq.record.targetDate)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="No RFQ linked to this job"
                    description="This section uses the job's purchase order to locate the latest commercial record."
                  />
                )}
              </SectionCard>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard title="Review Queue" value={modules.dcr.counts.pending + modules.ncr.counts.open + modules.transmissions.counts.pending} description="Open review points across DCR, NCR, and transmission flows" Icon={FileClock} />
              <KpiCard title="Drawing Activity" value={modules.drawingMaster.counts.activities} description="Recent drawing-level audit events" Icon={GitBranch} />
              <KpiCard title="Quality Pending" value={modules.mhc.counts.pending + modules.qap.counts.pending + modules.hydro.counts.pending + modules.dishEnd.counts.pending + modules.finalInspection.counts.pending} description="Pending approvals across quality modules" Icon={FileSpreadsheet} />
              <KpiCard title="Job Health" value={data.overview.attentionModules === 0 ? "Stable" : "Active Review"} description="Overall reading based on module statuses and open issues" Icon={SquareStack} />
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}
