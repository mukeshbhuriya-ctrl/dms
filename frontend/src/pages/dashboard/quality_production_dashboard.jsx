import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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

const ModuleCard = ({ title, icon: Icon, stats, showDraft = false, iconClass }) => (
  <Card className="shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border-slate-200/60 rounded-xl">
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
        <div className="flex justify-between items-center text-[13px]">
          <span className="text-slate-500 font-medium">Approved</span>
          <span className="font-extrabold text-[#059669]">{stats?.approved || 0}</span>
        </div>
        <div className="flex justify-between items-center text-[13px]">
          <span className="text-slate-500 font-medium">Pending</span>
          <span className="font-extrabold text-[#EA580C]">{stats?.pending || 0}</span>
        </div>
        <div className="flex justify-between items-center text-[13px]">
          <span className="text-slate-500 font-medium">Rejected</span>
          <span className="font-extrabold text-[#DC2626]">{stats?.rejected || 0}</span>
        </div>
        {showDraft && (
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-slate-500 font-medium">Draft</span>
            <span className="font-extrabold text-slate-400">{stats?.draft || 0}</span>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

const QualityProductionDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      
      {/* SECTION 1: WELDING */}
      <div>
        <h2 className="text-[17px] font-bold text-slate-900 mb-4 tracking-tight">1. Welding Operations Overview</h2>
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
        <h2 className="text-[17px] font-bold text-slate-900 mb-4 tracking-tight">2. Quality & Inspection Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          
          <ModuleCard 
            title="Quality Assurance Plan" 
            icon={BookOpen} 
            stats={qap} 
            showDraft={true}
            iconClass="bg-[#F3E8FF] text-[#9333EA]" // Purple
          />
          
          <ModuleCard 
            title="Material Heat Chart" 
            icon={LayoutTemplate} 
            stats={mhc} 
            iconClass="bg-[#FCE7F3] text-[#DB2777]" // Pink
          />
          
          <ModuleCard 
            title="Dish End Inspection" 
            icon={Target} 
            stats={dish_end} 
            iconClass="bg-[#ECFDF5] text-[#059669]" // Emerald
          />

          <ModuleCard 
            title="Tube Bundle Inspection" 
            icon={Box} 
            stats={tube_bundle} 
            iconClass="bg-[#ECFEFF] text-[#0891B2]" // Cyan
          />

          <ModuleCard 
            title="Hydrostatic Test" 
            icon={FlaskConical} 
            stats={hydrostatic} 
            iconClass="bg-[#FEF3C7] text-[#D97706]" // Amber
          />

          <ModuleCard 
            title="Final Inspection" 
            icon={ClipboardCheck} 
            stats={final_inspection} 
            iconClass="bg-[#FFE4E6] text-[#E11D48]" // Rose
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
  );
};

export default QualityProductionDashboard;
