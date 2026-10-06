import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import apiClient from '@/api/api.client';
import { Loader2, AlertCircle, FileText, Activity, ShieldAlert, Layers, BookOpen, LayoutTemplate, Target, Box, FlaskConical, ClipboardCheck, Microscope, TrendingUp, AlertTriangle } from 'lucide-react';

const MetricCard = ({ title, value, subtitle, subtitleIcon: SubIcon, subtitleColor = "green", icon: Icon, colorClass }) => {
  const subtitleColors = {
    green: "bg-[#ECFDF5] text-[#059669]", // Emerald
    red: "bg-[#FEF2F2] text-[#DC2626]", // Red
    orange: "bg-[#FFF7ED] text-[#EA580C]", // Orange
    blue: "bg-[#EFF6FF] text-[#2563EB]", // Blue
  };
  
  return (
    <Card className="shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border-slate-200/60 rounded-xl">
      <CardContent className="p-5 flex justify-between items-start">
        <div className="flex flex-col gap-2.5">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{title}</p>
          <h3 className="text-[32px] leading-none font-extrabold text-slate-900 tracking-tight">{value}</h3>
          {subtitle && (
            <div className="mt-1">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold ${subtitleColors[subtitleColor]}`}>
                {SubIcon && <SubIcon className="w-3 h-3" />}
                {subtitle}
              </span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </CardContent>
    </Card>
  );
};
const ModuleCard = ({ title, icon: Icon, stats, showDraft = false, iconClass, modulePath, customStatusMapping = {} }) => {
  const navigate = useNavigate();

  const handleStatClick = (statKey) => {
    if (modulePath && statKey !== 'total') {
      const mappedStatus = customStatusMapping[statKey] || statKey;
      navigate(`${modulePath}?status=${mappedStatus}`);
    }
  };

  return (
  <Card className="shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border-slate-200/60 rounded-xl hover:shadow-md transition-shadow group bg-white">
    <CardHeader className="pb-4 pt-5 px-5">
      <CardTitle className="text-[15px] font-bold flex items-center gap-3 text-slate-800">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="px-5 pb-6">
      <div className="space-y-4 mt-1">
        <div className="flex justify-between items-center text-[13px]">
          <span className="text-slate-500 font-medium">Total Records</span>
          <span className="font-extrabold text-slate-900">{stats?.total || 0}</span>
        </div>
        <div 
          onClick={() => handleStatClick('approved')}
          className="flex justify-between items-center text-[13px] group/row cursor-pointer hover:bg-slate-50 p-1 -mx-1 rounded transition-colors"
        >
          <span className="text-slate-500 font-medium group-hover/row:text-slate-700">Approved</span>
          <span className="font-extrabold text-[#059669]">{stats?.approved || 0}</span>
        </div>
        <div 
          onClick={() => handleStatClick('pending')}
          className="flex justify-between items-center text-[13px] group/row cursor-pointer hover:bg-slate-50 p-1 -mx-1 rounded transition-colors"
        >
          <span className="text-slate-500 font-medium group-hover/row:text-slate-700">Pending</span>
          <span className="font-extrabold text-[#EA580C]">{stats?.pending || 0}</span>
        </div>
        <div 
          onClick={() => handleStatClick('rejected')}
          className="flex justify-between items-center text-[13px] group/row cursor-pointer hover:bg-slate-50 p-1 -mx-1 rounded transition-colors"
        >
          <span className="text-slate-500 font-medium group-hover/row:text-slate-700">Rejected</span>
          <span className="font-extrabold text-[#DC2626]">{stats?.rejected || 0}</span>
        </div>
        {showDraft && (
          <div 
            onClick={() => handleStatClick('draft')}
            className="flex justify-between items-center text-[13px] group/row cursor-pointer hover:bg-slate-50 p-1 -mx-1 rounded transition-colors"
          >
            <span className="text-slate-500 font-medium group-hover/row:text-slate-700">Draft</span>
            <span className="font-extrabold text-slate-400">{stats?.draft || 0}</span>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
  );
};

const TodayModuleCard = ({ title, stats, icon: Icon, iconClass, pendingLabel = "Submitted", approvedLabel = "Cleared", showDraft = false, draftLabel = "Drafted", modulePath, customStatusMapping = {} }) => {
  const navigate = useNavigate();
  const pendingCount = stats?.today_pending || stats?.today_open_stages || 0;
  const approvedCount = stats?.today_approved || stats?.today_completed_reports || 0;
  const rejectedCount = stats?.today_rejected || 0;
  const draftCount = stats?.today_draft || stats?.today_total_plans || 0;

  const totalActivity = pendingCount + approvedCount + rejectedCount + (showDraft ? draftCount : 0);
  
  const handleStatClick = (statKey) => {
    if (modulePath) {
      const mappedStatus = customStatusMapping[statKey] || statKey;
      navigate(`${modulePath}?status=${mappedStatus}&date=today`);
    }
  };

  return (
    <Card className="relative overflow-hidden border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] rounded-xl transition-all duration-300 hover:shadow-lg hover:border-blue-200/60 group bg-white">
      {/* Subtle top gradient accent based on activity */}
      <div className={`absolute top-0 left-0 w-full h-1 ${totalActivity > 0 ? 'bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400' : 'bg-slate-100'}`} />
      
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconClass} transition-transform group-hover:scale-110 shadow-sm border border-white/50`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-[14px] font-bold text-slate-800 tracking-tight">{title}</h3>
          </div>
          {totalActivity > 0 && (
             <div className="relative flex h-2.5 w-2.5">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
             </div>
          )}
        </div>

        <div className="space-y-2.5">
           {showDraft && (
             <div 
               onClick={() => handleStatClick('draft')}
               className="flex items-center justify-between group/row cursor-pointer hover:bg-slate-50 p-1 -mx-1 rounded transition-colors"
             >
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest transition-colors group-hover/row:text-slate-700">{draftLabel}</span>
                <span className="text-[13px] font-extrabold text-slate-700 bg-slate-100/80 px-2.5 py-0.5 rounded-md border border-slate-200/60 min-w-[32px] text-center">{draftCount}</span>
             </div>
           )}
           <div 
             onClick={() => handleStatClick('pending')}
             className="flex items-center justify-between group/row cursor-pointer hover:bg-slate-50 p-1 -mx-1 rounded transition-colors"
           >
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest transition-colors group-hover/row:text-blue-600">{pendingLabel}</span>
              <span className="text-[13px] font-extrabold text-blue-700 bg-blue-50/80 border border-blue-100 px-2.5 py-0.5 rounded-md min-w-[32px] text-center">{pendingCount}</span>
           </div>
           <div 
             onClick={() => handleStatClick('approved')}
             className="flex items-center justify-between group/row cursor-pointer hover:bg-slate-50 p-1 -mx-1 rounded transition-colors"
           >
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest transition-colors group-hover/row:text-emerald-600">{approvedLabel}</span>
              <span className="text-[13px] font-extrabold text-emerald-700 bg-emerald-50/80 border border-emerald-100 px-2.5 py-0.5 rounded-md min-w-[32px] text-center">{approvedCount}</span>
           </div>
           <div 
             onClick={() => handleStatClick('rejected')}
             className="flex items-center justify-between group/row cursor-pointer hover:bg-slate-50 p-1 -mx-1 rounded transition-colors"
           >
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest transition-colors group-hover/row:text-red-600">Rejected</span>
              <span className={`text-[13px] font-extrabold px-2.5 py-0.5 rounded-md min-w-[32px] text-center ${rejectedCount > 0 ? 'text-red-700 bg-red-50/80 border border-red-100' : 'text-slate-400 bg-slate-50 border border-slate-100'}`}>{rejectedCount}</span>
           </div>
        </div>
      </CardContent>
    </Card>
  );
};

const QualityProductionDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('today');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/api/dashboard/quality-production/kpis');
        if (res && res.success) {
          setData(res.data);
        } else {
          setError(res?.message || 'Failed to load dashboard data');
        }
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 h-[calc(100vh-64px)] flex justify-center items-start pt-10">
        <div className="rounded-md border border-red-500/30 bg-red-500/10 text-red-600 p-4 flex gap-3 max-w-lg">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <div>
            <h3 className="font-bold">Error</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const { mhc, qap, hydrostatic, dish_end, tube_bundle, final_inspection, tube_sheet, welding } = data || {};

  return (
    <div className="p-6 space-y-6 bg-[#F8FAF9] h-[calc(100vh-64px)] overflow-y-auto">
      
      {/* HEADER & TOGGLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-[22px] font-extrabold text-slate-900 tracking-tight leading-tight">
              {viewMode === 'today' ? "Today's Overview" : "Overall Overview"}
            </h2>
            {viewMode === 'today' && (
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </div>
            )}
          </div>
          <p className="text-[13px] font-medium text-slate-500 mt-1">
            {viewMode === 'today' 
              ? "Real-time workflow activity across all active modules" 
              : "Monitor all-time workflow activity and inspection metrics"}
          </p>
        </div>
        
        <div className="w-[180px]">
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="bg-white border-slate-200/60 shadow-sm hover:bg-slate-50 transition-colors h-9 cursor-pointer">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today" className="font-medium cursor-pointer">Today's Overview</SelectItem>
              <SelectItem value="overall" className="font-medium cursor-pointer">Overall Overview</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {viewMode === 'today' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <TodayModuleCard 
            title="Welding Operations" 
            icon={Layers} 
            stats={welding} 
            iconClass="bg-[#ECFDF5] text-[#10B981]"
            pendingLabel="Stages Opened"
            approvedLabel="Reports Done"
            showDraft={true}
            draftLabel="New Plans"
            modulePath="/view-weldingjoints"
            customStatusMapping={{ pending: 'pending', approved: 'completed', draft: 'draft' }}
          />
          <TodayModuleCard 
            title="Material Heat Chart" 
            icon={LayoutTemplate} 
            stats={mhc} 
            iconClass="bg-[#FCE7F3] text-[#DB2777]"
            pendingLabel="Offered"
            approvedLabel="Approved"
            modulePath="/material-heat-chart"
            customStatusMapping={{ pending: 'Offered', approved: 'Approved', rejected: 'Rejected' }}
          />
          <TodayModuleCard 
            title="Quality Assurance Plan" 
            icon={BookOpen} 
            stats={qap} 
            iconClass="bg-[#F3E8FF] text-[#9333EA]"
            pendingLabel="Pending"
            approvedLabel="Published"
            modulePath="/create-qarp"
            customStatusMapping={{ pending: 'Pending', approved: 'Published', draft: 'draft' }}
          />
          <TodayModuleCard 
            title="Dish End Inspection" 
            icon={Target} 
            stats={dish_end} 
            iconClass="bg-[#ECFDF5] text-[#059669]"
            pendingLabel="Pending"
            approvedLabel="Approved"
            modulePath="/inspections/dish-end"
            customStatusMapping={{ pending: 'Pending', approved: 'Approved', draft: 'Draft' }}
          />
          <TodayModuleCard 
            title="Tube Bundle Inspection" 
            icon={Box} 
            stats={tube_bundle} 
            iconClass="bg-[#ECFEFF] text-[#0891B2]"
            pendingLabel="Pending"
            approvedLabel="Approved"
            modulePath="/inspections/tube-bundle"
            customStatusMapping={{ pending: 'Pending', approved: 'Approved', draft: 'Draft' }}
          />
          <TodayModuleCard 
            title="Hydrostatic Test" 
            icon={FlaskConical} 
            stats={hydrostatic} 
            iconClass="bg-[#FEF3C7] text-[#D97706]"
            pendingLabel="Pending"
            approvedLabel="Approved"
            modulePath="/hydrostatic-pressure-test"
            customStatusMapping={{ pending: 'pending', approved: 'approved', draft: 'draft' }}
          />
          <TodayModuleCard 
            title="Final Inspection" 
            icon={ClipboardCheck} 
            stats={final_inspection} 
            iconClass="bg-[#FFE4E6] text-[#E11D48]"
            pendingLabel="Pending"
            approvedLabel="Approved"
            modulePath="/inspections/final"
            customStatusMapping={{ pending: 'pending', approved: 'approved', draft: 'Draft' }}
          />
        </div>
      )}

      {viewMode === 'overall' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* SECTION 1: WELDING (All Time) */}
          <div>
            <h2 className="text-[17px] font-extrabold text-slate-900 mb-5 tracking-tight">Welding Operations Overview <span className="text-slate-400 font-medium text-sm ml-1">(All-Time)</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <MetricCard 
            title="Total Active Plans" 
            value={welding?.total_plans || 0} 
            subtitle="Active in production"
            subtitleIcon={TrendingUp}
            subtitleColor="blue"
            icon={FileText} 
            colorClass="bg-[#EFF6FF] text-[#3B82F6]" // Blue
          />
          <MetricCard 
            title="Total Weld Joints" 
            value={welding?.total_joints || 0} 
            subtitle="Across all plans"
            subtitleIcon={Activity}
            subtitleColor="green"
            icon={Layers} 
            colorClass="bg-[#ECFDF5] text-[#10B981]" // Emerald
          />
          <MetricCard 
            title="Currently Open Stages" 
            value={welding?.open_stages || 0} 
            subtitle="Pending / Submitted"
            subtitleIcon={AlertTriangle}
            subtitleColor="orange"
            icon={Activity} 
            colorClass="bg-[#F3E8FF] text-[#A855F7]" // Purple
          />
          <MetricCard 
            title="Completed Reports" 
            value={welding?.completed_reports || 0} 
            subtitle="Fully approved stages"
            subtitleIcon={TrendingUp}
            subtitleColor="green"
            icon={ShieldAlert} 
            colorClass="bg-[#FFF7ED] text-[#F97316]" // Orange
          />
        </div>
      </div>

      {/* SECTION 2: MODULES */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shadow-sm">
             <Target className="w-4 h-4" />
          </div>
          <h2 className="text-[18px] font-extrabold text-slate-900 tracking-tight">Quality & Inspection Modules <span className="text-slate-400 font-medium text-sm ml-1">(All-Time)</span></h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          
          <ModuleCard 
            title="Quality Assurance Plan" 
            icon={BookOpen} 
            stats={qap} 
            showDraft={true}
            iconClass="bg-[#F3E8FF] text-[#9333EA]" // Purple
            modulePath="/create-qarp"
            customStatusMapping={{ pending: 'Pending', approved: 'Published', draft: 'draft' }}
          />
          
          <ModuleCard 
            title="Material Heat Chart" 
            icon={LayoutTemplate} 
            stats={mhc} 
            iconClass="bg-[#FCE7F3] text-[#DB2777]" // Pink
            modulePath="/material-heat-chart"
            customStatusMapping={{ pending: 'Offered', approved: 'Approved', rejected: 'Rejected' }}
          />
          
          <ModuleCard 
            title="Dish End Inspection" 
            icon={Target} 
            stats={dish_end} 
            iconClass="bg-[#ECFDF5] text-[#059669]" // Emerald
            modulePath="/inspections/dish-end"
            customStatusMapping={{ pending: 'Pending', approved: 'Approved', draft: 'Draft' }}
          />

          <ModuleCard 
            title="Tube Bundle Inspection" 
            icon={Box} 
            stats={tube_bundle} 
            iconClass="bg-[#ECFEFF] text-[#0891B2]" // Cyan
            modulePath="/inspections/tube-bundle"
            customStatusMapping={{ pending: 'Pending', approved: 'Approved', draft: 'Draft' }}
          />

          <ModuleCard 
            title="Hydrostatic Test" 
            icon={FlaskConical} 
            stats={hydrostatic} 
            iconClass="bg-[#FEF3C7] text-[#D97706]" // Amber
            modulePath="/hydrostatic-pressure-test"
            customStatusMapping={{ pending: 'pending', approved: 'approved', draft: 'draft' }}
          />

          <ModuleCard 
            title="Final Inspection" 
            icon={ClipboardCheck} 
            stats={final_inspection} 
            iconClass="bg-[#FFE4E6] text-[#E11D48]" // Rose
            modulePath="/inspections/final"
            customStatusMapping={{ pending: 'pending', approved: 'approved', draft: 'Draft' }}
          />

          {/* Tube Sheet special card */}
          <Card className="shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border-slate-200/60 rounded-xl">
            <CardHeader className="pb-4 pt-5 px-5">
              <CardTitle className="text-[15px] font-bold flex items-center gap-3 text-slate-800">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#F1F5F9] text-[#475569]">
                  <Microscope className="w-4 h-4" />
                </div>
                Tube Sheet Insp.
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-6">
              <div className="space-y-4 mt-1">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-slate-500 font-medium">Total Logged Reports</span>
                  <span className="font-extrabold text-slate-900">{tube_sheet?.total || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
      </div>
      )}

    </div>
  );
};

export default QualityProductionDashboard;
