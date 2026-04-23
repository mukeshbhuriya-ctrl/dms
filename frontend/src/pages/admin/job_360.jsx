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

export default function Job360Dashboard() {
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
      const res = await job360Api.getJob360Snapshot(jobId);
      setData(res);
      if (isRefresh) toast.success("Snapshot refreshed");
    } catch (err) {
      setData(null);
      toast.error(err?.response?.data?.message || "Failed to load job snapshot");
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
              Choose a specific Job Number from the header dropdown to view its full snapshot.
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

            {/* FULL WIDTH Module Cards */}
            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
                   <div>
                      <CardTitle className="text-sm">Document Management System (DMS)</CardTitle>
                      <CardDescription className="text-xs">Master assignment index and linked documents.</CardDescription>
                   </div>
                   <div className="flex gap-2 mt-0">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navTo('/dcc/documents', { jobId: data.job.id })}>Open Matrix</Button>
                   </div>
              </CardHeader>
              <CardContent className="pt-4">
                 <div className="flex flex-col md:flex-row gap-8">
                    <div className="w-full">
                       <StatusRow title="DMS Workflow Status" entries={{ "Pending Upload": data.dms.pending, "Awaiting Appr.": data.dms.uploaded, "Approved": data.dms.approved, "Rejected": data.dms.rejected }} />
                       <div className="mt-4">
                          <ProgressBar value={(data.dms.approved || 0) + (data.dms.uploaded || 0)} max={data.dms.total} label="DMS Pipeline Progression" colorClass="bg-blue-600" />
                       </div>
                    </div>
                 </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 bg-slate-50/50">
                   <div>
                      <CardTitle className="text-sm font-bold">Drawing Transmittal Notes (DTN)</CardTitle>
                      <CardDescription className="text-xs font-medium">Tracking physical and digital drawing dispatches.</CardDescription>
                   </div>
                   <Button size="sm" variant="outline" className="h-7 text-xs shadow-sm bg-white" onClick={() => navTo('/dtn/drawing-transmittal')}>DTN Console</Button>
              </CardHeader>
              <CardContent className="p-0">
                 {/* Top KPI row specific to DTN */}
                 <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                    <div className="p-4 flex flex-col items-center justify-center bg-white">
                        <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">TOTAL DTNs</p>
                        <p className="text-2xl font-black text-slate-800">{formatValue(data.dtn.total)}</p>
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center bg-white">
                        <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">AWAITING DISPATCH (DRAFT)</p>
                        <p className="text-2xl font-black text-amber-600">{formatValue(data.dtn.draft)}</p>
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center bg-white">
                        <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">DISTRIBUTED (SENT)</p>
                        <p className="text-2xl font-black text-emerald-600">{formatValue(data.dtn.sent)}</p>
                    </div>
                 </div>

                 {/* Recent Transmittals Data Table */}
                 <div className="p-0 bg-white overflow-x-auto">
                    {data.dtn.recentTransmittals && data.dtn.recentTransmittals.length > 0 ? (
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-5 py-3 font-bold text-[10px] uppercase text-slate-500 tracking-wider">Ref No</th>
                                    <th className="px-5 py-3 font-bold text-[10px] uppercase text-slate-500 tracking-wider">Date</th>
                                    <th className="px-5 py-3 font-bold text-[10px] uppercase text-slate-500 tracking-wider">Status</th>
                                    <th className="px-5 py-3 font-bold text-[10px] uppercase text-slate-500 tracking-wider">Items Embedded</th>
                                    <th className="px-5 py-3 font-bold text-[10px] uppercase text-slate-500 tracking-wider">Intents</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.dtn.recentTransmittals.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-5 py-3 font-semibold text-slate-800 text-xs group-hover:text-blue-600 transition-colors cursor-pointer" onClick={() => navTo('/dtn/drawing-transmittal')}>{t.ref_no}</td>
                                        <td className="px-5 py-3 text-slate-600 text-[13px]">{new Date(t.date).toLocaleDateString()}</td>
                                        <td className="px-5 py-3">
                                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${t.status?.toLowerCase() === 'draft' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                {t.status || 'Draft'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-slate-600 text-[13px] font-semibold">{t.itemsCount} Documents</td>
                                        <td className="px-5 py-3">
                                            <div className="flex gap-1.5 flex-wrap items-center">
                                                {t.intents.slice(0, 2).map((intent, idx) => (
                                                    <span key={idx} className="bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider">{intent}</span>
                                                ))}
                                                {t.intents.length > 2 && (
                                                    <span className="bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider">+{t.intents.length - 2}</span>
                                                )}
                                                {t.intents.length === 0 && <span className="text-slate-400 text-[10px] italic">Not Specified</span>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-10 text-center bg-slate-50/50">
                            <Layers className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                            <p className="text-sm font-semibold text-slate-500">No transmittals generated for this job yet.</p>
                            <Button size="sm" variant="outline" className="mt-4 shadow-sm h-8" onClick={() => navTo('/dtn/drawing-transmittal')}>Create First DTN</Button>
                        </div>
                    )}
                 </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
                   <div>
                      <CardTitle className="text-sm">Welding Pipeline (WPJ)</CardTitle>
                      <CardDescription className="text-xs">Joint tracking and NDT inspection progression.</CardDescription>
                   </div>
                   <Button size="sm" variant="outline" className="h-7 text-xs mt-0" onClick={() => navTo('/view-weldingjoints', { type: 'job', value: data.job.id })}>WPJ Console</Button>
              </CardHeader>
              <CardContent className="pt-4">
                 <div className="flex flex-col md:flex-row gap-8">
                    <div className="w-full md:w-1/3">
                       <div className="rounded border border-slate-200 bg-slate-50 p-4 h-full flex flex-col justify-center">
                          <p className="text-xs font-semibold text-slate-500 uppercase">Registered Joints</p>
                          <p className="text-3xl font-extrabold text-slate-900 mt-1">{formatValue(data.wpj.totalJoints)}</p>
                          <p className="text-xs text-slate-500 mt-1">across {formatValue(data.wpj.plans)} weld plans</p>
                       </div>
                    </div>
                    <div className="flex-1 space-y-2">
                       <ProgressBar value={data.wpj.s1.completed} max={data.wpj.totalJoints} label="Phase S1 Status (Fit-up & Visual)" colorClass="bg-slate-700" />
                       <ProgressBar value={data.wpj.s2.completed} max={data.wpj.totalJoints} label="Phase S2 Status (RT/NDT Clearances)" colorClass="bg-slate-800" />
                       <ProgressBar value={data.wpj.s3.completed} max={data.wpj.totalJoints} label="Phase S3 Status (Final Release)" colorClass="bg-emerald-600" />
                    </div>
                 </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
                   <div>
                      <CardTitle className="text-sm">Quality Assurance Checklist</CardTitle>
                      <CardDescription className="text-xs">Mandatory product checkout and sign-offs.</CardDescription>
                   </div>
              </CardHeader>
              <CardContent className="pt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-1">
                     <QualityCheck label="1. Quality Assurance Plan (QAP)" status={data.quality.qap.status} onNav={() => navTo('/qap/view')} />
                     <QualityCheck label="2. Material Heat Chart (MHC)" status={data.quality.mhc.status} onNav={() => navTo('/mhc/view-mhc')} />
                     <QualityCheck label="3. Hydrostatic Test Execution" status={data.quality.hydro.status} onNav={() => navTo('/hydro-test/view')} />
                     <QualityCheck label="4. Dish End Log Validation" status={data.quality.dishEnd.status} onNav={() => navTo('/inspection-report/dish-end')} />
                     <QualityCheck label="5. Final Inspection Clearance" status={data.quality.finalInsp.status} onNav={() => navTo('/inspection-report/final-inspection')} />
                  </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
                   <div>
                      <CardTitle className="text-sm">Engineering Exceptions (NCR / DCR)</CardTitle>
                      <CardDescription className="text-xs">Identified non-conformities and change request deviations.</CardDescription>
                   </div>
                   <div className="flex gap-2 mt-0">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navTo('/ncr/view-ncr', { jobId: data.job.id })}>NCR Logs</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navTo('/dcr/view-dcr', { jobId: data.job.id })}>DCR Logs</Button>
                   </div>
              </CardHeader>
              <CardContent className="pt-4">
                 <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1">
                       <StatusRow title="NCR Workflow Summary" entries={{ "Open (Requires Action)": data.exceptions.ncr.open, "Closed / Resolved": data.exceptions.ncr.closed }} />
                       <div className="mt-4 pt-3 border-t border-slate-100">
                          {data.exceptions.ncr.open > 0 ? (
                             <div className="flex items-center gap-2 text-red-600 font-semibold bg-red-50 px-3 py-2 rounded">
                                <AlertTriangle className="h-4 w-4" /> Action Required: {data.exceptions.ncr.open} Open NCRs
                             </div>
                          ) : (
                             <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> All logged NCRs are closed.</p>
                          )}
                       </div>
                    </div>
                    <div className="w-px bg-slate-100 hidden md:block"></div>
                    <div className="flex-1">
                       <StatusRow title="DCR Workflow Summary" entries={{ "Pending Engineering/QC": data.exceptions.dcr.pending, "Fully Approved": data.exceptions.dcr.approved }} />
                       <div className="mt-4 pt-3 border-t border-slate-100">
                          {data.exceptions.dcr.pending > 0 ? (
                             <div className="flex items-center gap-2 text-amber-600 font-semibold bg-amber-50 px-3 py-2 rounded">
                                <AlertTriangle className="h-4 w-4" /> Pending Approval: {data.exceptions.dcr.pending} DCRs
                             </div>
                          ) : (
                             <p className="text-xs font-semibold text-slate-500 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Processed {data.exceptions.dcr.approved} DCRs.</p>
                          )}
                       </div>
                    </div>
                 </div>
              </CardContent>
            </Card>

          </div>
        ) : null}
      </main>
    </>
  );
}
