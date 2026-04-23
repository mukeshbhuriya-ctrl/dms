import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, ExternalLink, FileText, AlertTriangle, PenTool, CircleCheck, Building2, Send, Wrench, FolderGit2, CheckCircle2, Box, Layers } from "lucide-react";
import { toast } from "react-toastify";
import commonApi from "@/api/common.api";
import job360Api from "@/api/job360.api";

const fmt = new Intl.NumberFormat("en-IN");
function formatValue(value) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "0";
  return fmt.format(num);
}

function KpiCard({ title, value, description, Icon }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-700">{title}</CardTitle>
          {Icon && <Icon className="h-4 w-4 text-slate-500" />}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tracking-tight text-slate-900">{typeof value === 'number' ? formatValue(value) : value}</p>
        <CardDescription className="mt-1 text-xs text-slate-500">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

function StatusRow({ title, entries }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {!entries || Object.keys(entries).length === 0 ? (
        <p className="text-sm text-slate-400">No records</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {Object.entries(entries).map(([label, count]) => (
            <span
              key={`${title}-${label}`}
              className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 uppercase"
            >
              {label}: {typeof count === 'number' ? formatValue(count) : count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ value, max, label, colorClass = "bg-blue-600" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
     <div className="mt-3">
        <div className="flex justify-between text-xs mb-1">
           <span className="font-semibold text-slate-700">{label}</span>
           <span className="font-medium text-slate-500">{formatValue(value)} / {formatValue(max)} <span className="text-slate-400 ml-1">({pct}%)</span></span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
           <div className={`h-full ${colorClass} rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
     </div>
  );
}

function QualityCheck({ label, status, onNav }) {
  const st = status?.toUpperCase() || "";
  const isApproved = st.includes('APPROVED');
  const isPending = st.includes('PENDING') || st.includes('REVIEW');
  const isIgnored = st.includes('DRAFT') || st === 'CREATED';
  
  let icon = <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  let textColor = "text-slate-900";
  if (isPending) {
     icon = <AlertTriangle className="h-4 w-4 text-amber-500" />;
  } else if (isIgnored) {
     icon = <CircleCheck className="h-4 w-4 text-slate-300" />;
     textColor = "text-slate-500";
  }

  return (
    <div className="flex items-center gap-4 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors px-2 -mx-2 rounded">
      <div className="w-6 shrink-0 flex justify-center">
         {icon}
      </div>
      <div className="flex-1 min-w-0">
         <p className={`text-[13px] font-semibold ${textColor}`}>{label}</p>
         <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{status}</p>
      </div>
      <div className="shrink-0">
         <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px]" onClick={onNav}>
             Open <ExternalLink className="h-3 w-3" />
         </Button>
      </div>
    </div>
  )
}

export default function JobOverview() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isJobsLoading, setIsJobsLoading] = useState(true);

  // Load Job Dropdown
  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await commonApi.getJobs();
        const opts = (res.data || []).map((j) => ({
          value: j.id,
          label: `${j.job_number} ${j.equipement_name ? `(${j.equipement_name})` : ""}`,
          rawJobNumber: j.job_number
        }));
        setJobs(opts);
        // Default selection: If a job is available and none is selected, pick the first one
        if (opts.length > 0 && !selectedJobId) {
          setSelectedJobId(opts[0].value);
        }
      } catch (err) {
        toast.error("Failed to load jobs");
      } finally {
        setIsJobsLoading(false);
      }
    }
    fetchJobs();
  }, []);

  // Fetch Snapshot
  const fetchSnapshot = useCallback(async (jobId, isRefresh = false) => {
    if (!jobId) return;
    setIsLoading(true);
    try {
      const res = await job360Api.getJobOverviewSnapshot(jobId);
      setData(res);
      if (isRefresh) toast.success("Snapshot refreshed");
    } catch (err) {
      setData(null);
      toast.error(err?.response?.data?.message || "Failed to load Job Overview");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      fetchSnapshot(selectedJobId);
    } else {
      setData(null);
    }
  }, [selectedJobId, fetchSnapshot]);

  const navTo = (path, params = {}) => {
    const search = new URLSearchParams(params).toString();
    navigate(search ? `${path}?${search}` : path);
  };

  // Fragment wrapper to perfectly mirror dashboard.jsx structure without gray background
  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-6">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-2" />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Job Overview</h1>
          </div>
        </div>

        <div className="flex items-center gap-4 w-[400px]">
          <div className="flex-1">
            <SearchableSelect
              options={jobs}
              value={selectedJobId}
              onValueChange={setSelectedJobId}
              placeholder={isJobsLoading ? "Loading jobs..." : "Select Job Number..."}
              disabled={isJobsLoading || isLoading}
            />
          </div>
          <Button
             variant="outline"
             size="icon"
             disabled={!selectedJobId || isLoading}
             onClick={() => fetchSnapshot(selectedJobId, true)}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        {!selectedJobId ? (
          <div className="flex h-[40vh] flex-col items-center justify-center text-center">
            <FolderGit2 className="h-12 w-12 text-slate-300 mb-4" />
            <h2 className="text-xl font-semibold text-slate-700">Select a Job</h2>
            <p className="text-sm text-slate-500 max-w-sm mt-2">
              Choose a specific Job Number from the header dropdown to view its full overview.
            </p>
          </div>
        ) : isLoading && !data ? (
          <div className="space-y-6">
             <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                   <Card key={idx} className="border-slate-200">
                      <CardContent className="h-28 animate-pulse bg-slate-100" />
                   </Card>
                ))}
             </div>
             {Array.from({ length: 3 }).map((_, idx) => (
                <Card key={idx} className="border-slate-200">
                   <CardContent className="h-40 animate-pulse bg-slate-100" />
                </Card>
             ))}
          </div>
        ) : data ? (
          <div className="space-y-4">
            
            {/* Extremely compact Top Header Row */}
            {/* Extremely compact Top Header Row */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pb-5 mb-1 pt-1 border-b border-slate-200">
               <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">JOB / MSN</span>
                  <span className="text-xl font-extrabold tracking-tight text-slate-900">{jobs.find(j => j.value === selectedJobId)?.rawJobNumber || 'Selected Job'}</span>
               </div>
               <div className="hidden md:block w-px h-6 bg-slate-200"></div>
               <div className="flex flex-col justify-center">
                  <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-0.5">CUSTOMER</span>
                  <span className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-slate-400" />{data.job.customerName}</span>
               </div>
               <div className="flex flex-col justify-center">
                  <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-0.5">PURCHASE ORDER</span>
                  <span className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-slate-400" />{data.job.poNumber}</span>
               </div>
               <div className="flex flex-col justify-center">
                  <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-0.5">EQUIPMENT / TAG</span>
                  <span className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5"><Box className="h-3.5 w-3.5 text-slate-400" />{data.job.equipmentName}</span>
               </div>
            </div>

            {/* Quick Metrics KPI Row */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <KpiCard title="Linked Docs" value={data.dms.total} description={`DMS Registry`} Icon={FileText} />
              <KpiCard title="Active Weld Plans" value={data.wpj.plans} description={`Coverage for ${data.wpj.totalJoints} joints`} Icon={Wrench} />
              <KpiCard title="Open Exceptions" value={data.exceptions.ncr.open + data.exceptions.dcr.pending} description={`Open NCRs & DCRs`} Icon={AlertTriangle} />
              <KpiCard title="Quality Reports" value={
                  (data.quality.mhc.count || 0) + 
                  (data.quality.qap.count || 0) + 
                  (data.quality.hydro.count || 0) + 
                  (data.quality.dishEnd.count || 0) + 
                  (data.quality.finalInsp.count || 0)
              } description="Across inspection checkpoints" Icon={CheckCircle2} />
            </div>

            {/* MODULE CONSOLE 1: DTN (Drawing Transmittals) */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 bg-slate-50/50">
                   <div>
                      <CardTitle className="text-sm font-bold">Drawing Transmittal Notes (DTN)</CardTitle>
                      <CardDescription className="text-xs font-medium">Tracking physical and digital drawing dispatches.</CardDescription>
                   </div>
                   <Button size="sm" variant="outline" className="h-7 text-xs shadow-sm bg-white" onClick={() => navTo('/dtn/drawing-transmittal')}>DTN Console</Button>
              </CardHeader>
              <CardContent className="p-0">
                 <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                    <div className="p-4 flex flex-col items-center justify-center bg-white">
                        <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">TOTAL DTNs</p>
                        <p className="text-2xl font-black text-slate-800">{formatValue(data.dtn.total)}</p>
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center bg-white">
                        <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">DRAFT</p>
                        <p className="text-2xl font-black text-amber-600">{formatValue(data.dtn.draft)}</p>
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center bg-white">
                        <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">DISTRIBUTED</p>
                        <p className="text-2xl font-black text-emerald-600">{formatValue(data.dtn.sent)}</p>
                    </div>
                 </div>
                 <div className="p-0 bg-white overflow-x-auto">
                    {data.dtn.recentTransmittals?.length > 0 ? (
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-5 py-3 font-bold text-[10px] uppercase text-slate-500 tracking-wider">Ref No</th>
                                    <th className="px-5 py-3 font-bold text-[10px] uppercase text-slate-500 tracking-wider">Date</th>
                                    <th className="px-5 py-3 font-bold text-[10px] uppercase text-slate-500 tracking-wider">Status</th>
                                    <th className="px-5 py-3 font-bold text-[10px] uppercase text-slate-500 tracking-wider">Items</th>
                                    <th className="px-5 py-3 font-bold text-[10px] uppercase text-slate-500 tracking-wider">Intents</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.dtn.recentTransmittals.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group border-b border-slate-50">
                                        <td className="px-5 py-3 font-semibold text-slate-800 text-xs">{t.ref_no}</td>
                                        <td className="px-5 py-3 text-slate-600 text-[12px]">{new Date(t.date).toLocaleDateString()}</td>
                                        <td className="px-5 py-3 text-[10px] font-bold uppercase">{t.status || 'Draft'}</td>
                                        <td className="px-5 py-3 text-[12px]">{t.itemsCount} Docs</td>
                                        <td className="px-5 py-3 flex gap-1">
                                            {t.intents.slice(0, 2).map((it, idx) => (
                                                <span key={idx} className="bg-slate-100 px-1 py-0.5 rounded text-[8px] font-bold">{it}</span>
                                            ))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <div className="p-6 text-center text-xs text-slate-400 italic">No recent activity</div>}
                 </div>
              </CardContent>
            </Card>

            {/* MODULE CONSOLE 2: DMS (Documents) */}
            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
                   <div>
                      <CardTitle className="text-sm">Document Management System (DMS)</CardTitle>
                      <CardDescription className="text-xs">Master assignment index and linked documents.</CardDescription>
                   </div>
                   <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navTo('/dcc/documents', { jobId: data.job.id })}>Open Matrix</Button>
              </CardHeader>
              <CardContent className="pt-4">
                 <div className="space-y-4">
                    <StatusRow title="DMS Workflow Status" entries={{ "Pending": data.dms.pending, "Uploaded": data.dms.uploaded, "Approved": data.dms.approved, "Rejected": data.dms.rejected }} />
                    <ProgressBar value={(data.dms.approved || 0) + (data.dms.uploaded || 0)} max={data.dms.total} label="Project Documentation Completion" colorClass="bg-blue-600" />
                 </div>
              </CardContent>
            </Card>

            {/* MODULE CONSOLE 3: Exceptions (DCR & NCR) */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 bg-slate-50/50">
                   <div>
                      <CardTitle className="text-sm font-bold">Engineering Exceptions (NCR / DCR)</CardTitle>
                      <CardDescription className="text-xs font-medium">Non-conformities and design change requests.</CardDescription>
                   </div>
                   <div className="flex gap-2">
                       <Button size="sm" variant="outline" className="h-7 text-xs bg-white" onClick={() => navTo('/ncr/view-ncr', { jobId: data.job.id })}>NCR Logs</Button>
                       <Button size="sm" variant="outline" className="h-7 text-xs bg-white" onClick={() => navTo('/dcr/view-dcr', { jobId: data.job.id })}>DCR Logs</Button>
                   </div>
              </CardHeader>
              <CardContent className="p-0">
                 <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
                    <div className="p-4 flex flex-col items-center justify-center bg-white">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">OPEN NCRs</p>
                        <p className="text-2xl font-black text-red-600">{formatValue(data.exceptions.ncr.open)}</p>
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center bg-white">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">PENDING DCRs</p>
                        <p className="text-2xl font-black text-amber-600">{formatValue(data.exceptions.dcr.pending)}</p>
                    </div>
                 </div>
                 <div className="p-0 bg-white overflow-x-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-slate-100">
                        {/* Recent NCRs */}
                        <div className="p-0">
                            <p className="px-4 py-2 border-b text-[10px] font-bold text-slate-500 uppercase bg-slate-50/30">Latest NCR Action Items</p>
                            {data.exceptions.recentNcrs?.length > 0 ? (
                                <table className="w-full text-xs">
                                    <tbody className="divide-y divide-slate-50">
                                        {data.exceptions.recentNcrs.map(n => (
                                            <tr key={n.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-2 font-bold">{n.no}</td>
                                                <td className="px-4 py-2 text-slate-500">Stage {n.stage}</td>
                                                <td className="px-4 py-2 text-right"><span className="p-1 rounded bg-slate-100 font-bold uppercase text-[9px]">{n.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : <p className="p-4 text-[10px] italic text-slate-400">No active NCRs</p>}
                        </div>
                        {/* Recent DCRs */}
                        <div className="p-0">
                            <p className="px-4 py-2 border-b text-[10px] font-bold text-slate-500 uppercase bg-slate-50/30">Latest DCR Submissions</p>
                            {data.exceptions.recentDcrs?.length > 0 ? (
                                <table className="w-full text-xs">
                                    <tbody className="divide-y divide-slate-50">
                                        {data.exceptions.recentDcrs.map(d => (
                                            <tr key={d.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-2 font-bold">{d.no}</td>
                                                <td className="px-4 py-2 text-slate-500">{new Date(d.date).toLocaleDateString()}</td>
                                                <td className="px-4 py-2 text-right"><span className="p-1 rounded bg-slate-100 font-bold uppercase text-[9px]">{d.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : <p className="p-4 text-[10px] italic text-slate-400">No active DCRs</p>}
                        </div>
                    </div>
                 </div>
              </CardContent>
            </Card>

            {/* MODULE CONSOLE 4: Quality & Inspection (MHC, QAP, etc) */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 bg-slate-50/50">
                   <div>
                      <CardTitle className="text-sm font-bold">Quality & Inspection Protocols</CardTitle>
                      <CardDescription className="text-xs font-medium">Compliance verification and operational checkpoints.</CardDescription>
                   </div>
              </CardHeader>
              <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-5 divide-x divide-slate-100 border-b border-slate-100 text-center">
                     <div className="p-3"><p className="text-[9px] font-bold text-slate-500 uppercase">MHC</p><p className="text-xs font-bold text-slate-900">{data.quality.mhc.status}</p></div>
                     <div className="p-3"><p className="text-[9px] font-bold text-slate-500 uppercase">QAP</p><p className="text-xs font-bold text-slate-900">{data.quality.qap.status}</p></div>
                     <div className="p-3"><p className="text-[9px] font-bold text-slate-500 uppercase">Hydro</p><p className="text-xs font-bold text-slate-900">{data.quality.hydro.status}</p></div>
                     <div className="p-3"><p className="text-[9px] font-bold text-slate-500 uppercase">Dish End</p><p className="text-xs font-bold text-slate-900">{data.quality.dishEnd.status}</p></div>
                     <div className="p-3"><p className="text-[9px] font-bold text-slate-500 uppercase">Final Insp</p><p className="text-xs font-bold text-slate-900">{data.quality.finalInsp.status}</p></div>
                  </div>
                  <div className="p-0 bg-white">
                     <p className="px-4 py-2 border-b text-[10px] font-bold text-slate-500 uppercase bg-slate-50/30">Unified Quality Activity Timeline</p>
                     {data.quality.timeline?.length > 0 ? (
                         <table className="w-full text-xs">
                             <tbody className="divide-y divide-slate-50">
                                 {data.quality.timeline.map((r, i) => (
                                     <tr key={i} className="hover:bg-slate-50">
                                         <td className="px-4 py-3"><span className="bg-slate-900 text-white px-1.5 py-0.5 rounded-[3px] text-[8px] font-bold">{r.type}</span></td>
                                         <td className="px-4 py-3 font-semibold">{r.no}</td>
                                         <td className="px-4 py-3 text-slate-500">{new Date(r.date).toLocaleDateString()}</td>
                                         <td className="px-4 py-3 text-right"><span className={`p-1 rounded font-bold uppercase text-[9px] ${r.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{r.status}</span></td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     ) : <p className="p-6 text-center text-xs text-slate-400 italic">No quality records detected</p>}
                  </div>
              </CardContent>
            </Card>

            {/* MODULE CONSOLE 5: Welding Pipeline (WPJ) */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 bg-slate-50/50">
                   <div>
                      <CardTitle className="text-sm font-bold">Welding Pipeline (WPJ)</CardTitle>
                      <CardDescription className="text-xs font-medium">Joint tracking and NDT inspection progression.</CardDescription>
                   </div>
                   <Button size="sm" variant="outline" className="h-7 text-xs bg-white shadow-sm" onClick={() => navTo('/view-weldingjoints', { type: 'job', value: data.job.id })}>WPJ Console</Button>
              </CardHeader>
              <CardContent className="p-0 pt-0">
                  <div className="p-4 border-b border-slate-100 bg-white grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="flex flex-col justify-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Active Joints</p>
                        <p className="text-3xl font-black text-slate-800">{formatValue(data.wpj.totalJoints)}</p>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase mt-1">Spanning {data.wpj.plans} engineering plans</p>
                     </div>
                     <div className="space-y-3">
                        <ProgressBar value={data.wpj.s1.completed} max={data.wpj.totalJoints} label="S1: Visual Clearance" colorClass="bg-slate-500" />
                        <ProgressBar value={data.wpj.s2.completed} max={data.wpj.totalJoints} label="S2: NDT (RT/PT) Clearance" colorClass="bg-slate-700" />
                        <ProgressBar value={data.wpj.s3.completed} max={data.wpj.totalJoints} label="S3: Final Weld Release" colorClass="bg-emerald-600" />
                     </div>
                  </div>
                  <div className="p-0 bg-white overflow-x-auto">
                    <p className="px-4 py-2 border-b text-[10px] font-bold text-slate-500 uppercase bg-slate-50/30">Detailed Weld Plans</p>
                    {data.wpj.recentPlans?.length > 0 ? (
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-4 py-2 font-bold text-[9px] uppercase text-slate-500">Plan No</th>
                                    <th className="px-4 py-2 font-bold text-[9px] uppercase text-slate-500">Drg No</th>
                                    <th className="px-4 py-2 font-bold text-[9px] uppercase text-slate-500">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data.wpj.recentPlans.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 font-bold text-slate-800">{p.no}</td>
                                        <td className="px-4 py-2 text-slate-600">{p.drg}</td>
                                        <td className="px-4 py-2 text-slate-400">{new Date(p.date).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <p className="p-6 text-center text-xs text-slate-400 italic">No plans registered</p>}
                  </div>
              </CardContent>
            </Card>

            {/* MODULE CONSOLE 6: Marketing (RFQ) */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
               <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 bg-slate-50/50">
                    <div>
                       <CardTitle className="text-sm font-bold">Commercial & Marketing Snapshot</CardTitle>
                       <CardDescription className="text-xs font-medium">RFQ mappings and commercial status.</CardDescription>
                    </div>
               </CardHeader>
               <CardContent className="p-4 bg-white">
                  {data.rfq ? (
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="rounded-lg border border-slate-100 p-4 bg-slate-50/50">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">RFQ Reference</p>
                           <p className="text-lg font-bold text-slate-900">{data.rfq.rfqNo}</p>
                           <p className="text-[10px] text-slate-500 mt-1">Logged on {new Date(data.rfq.enqDate).toLocaleDateString()}</p>
                        </div>
                        <div className="rounded-lg border border-slate-100 p-4 bg-slate-50/50">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Contract Value</p>
                           <p className="text-lg font-bold text-emerald-700">₹ {formatValue(data.rfq.quotedValue)}</p>
                        </div>
                        <div className="rounded-lg border border-slate-100 p-4 bg-slate-50/50">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pipeline Status</p>
                           <div className="flex gap-2 mt-1">
                              <span className="bg-white border border-slate-200 px-2 py-1 rounded text-[10px] font-bold uppercase">{data.rfq.shrenoStatus}</span>
                              <span className="bg-white border border-slate-200 px-2 py-1 rounded text-[10px] font-bold uppercase">{data.rfq.clientStatus}</span>
                           </div>
                        </div>
                     </div>
                  ) : <div className="p-10 text-center text-slate-400 italic text-xs">No commercial RFQ records linked to this PO context.</div>}
               </CardContent>
            </Card>

          </div>
        ) : null}
      </main>
    </>
  );
}
