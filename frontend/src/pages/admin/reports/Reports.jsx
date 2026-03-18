import React, { useState, useEffect, useRef } from 'react';
import { AdminSidebar } from "@/components";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  FileDown,
  Calendar as CalendarIcon,
  Clock,
  Filter,
  FileText,
  ClipboardCheck,
  Layers,
  Droplets,
  Settings2,
  Search,
  CheckCircle2,
  Users,
  Building2,
  Briefcase,
  AlertCircle,
  ChevronDown,
  RefreshCw,
  X
} from "lucide-react";
import { exportApi } from "@/api/export.api";
import { toast } from "react-toastify";

const Reports = () => {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summary, setSummary] = useState({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);

  // Fetch summary whenever dates change
  const fetchSummary = async () => {
    try {
      setIsLoadingSummary(true);
      const res = await exportApi.getReportSummary({ startDate, endDate });
      if (res.success) {
        setSummary(res.data);
      }
    } catch (error) {
      console.error("fetchSummary error:", error);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [startDate, endDate]);

  // Click outside to close filter dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const setDatePreset = (preset) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'today':
        // Values already set to today
        break;
      case 'yesterday':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case 'thisWeek':
        start.setDate(today.getDate() - today.getDay());
        break;
      case 'thisMonth':
        start.setDate(1);
        break;
      case 'lastMonth':
        start.setMonth(today.getMonth() - 1);
        start.setDate(1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      default:
        break;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleDownload = async (module, title) => {
    const count = summary[module] || 0;

    if (count === 0) {
      toast.warning(`No data found for ${title} in the selected range.`);
      return;
    }

    try {
      setIsDownloading(true);
      const params = { startDate, endDate };
      let res;

      switch (module) {
        case 'ncr': res = await exportApi.exportModule('ncr', params, 'ncr_report.xlsx'); break;
        case 'dcr': res = await exportApi.exportModule('dcr', params, 'dcr_report.xlsx'); break;
        case 'wjp': res = await exportApi.exportModule('weld-joint-plan', params, 'weld_joint_plan_report.xlsx'); break;
        case 'wjd': res = await exportApi.exportModule('weld-joint', params, 'weld_joint_details_report.xlsx'); break;
        case 'mhc': res = await exportApi.exportMHC(params); break;
        case 'qap': res = await exportApi.exportQAP(params); break;
        case 'hydro': res = await exportApi.exportHydro(params); break;
        case 'dishend': res = await exportApi.exportDishEnd(params); break;
        case 'final': res = await exportApi.exportFinalInspection(params); break;
        case 'rfq': res = await exportApi.exportModule('rfq-register', params, 'rfq_register_report.xlsx'); break;
        case 'users': res = await exportApi.exportUsers(params); break;
        case 'customers': res = await exportApi.exportCustomers(params); break;
        case 'jobs': res = await exportApi.exportJobs(params); break;
        case 'locations': res = await exportApi.exportLocations(params); break;
        case 'departments': res = await exportApi.exportDepartments(params); break;
        default: break;
      }

      if (res?.success) {
        toast.success(`${title} downloaded successfully`);
      }
    } catch (error) {
      console.error(error);
      toast.error(`Error downloading ${title}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const reportModules = [
    { id: 'ncr', title: 'NCR Report', description: 'Non-Conformance Reports', icon: FileText },
    { id: 'dcr', title: 'DCR Report', description: 'Design Change Request reports', icon: Settings2 },
    { id: 'wjp', title: 'Weld Joint Plan', description: 'Consolidated Weld Joint Plans', icon: Layers },
    { id: 'wjd', title: 'Weld Joint Details', description: 'Detailed individual joint inspection data', icon: CheckCircle2 },
    { id: 'mhc', title: 'Material Heat Chart', description: 'Full Material Heat Chart data', icon: ClipboardCheck },
    { id: 'qap', title: 'QAP Report', description: 'Quality Assurance Plan reports', icon: FileDown },
    { id: 'hydro', title: 'Hydro Test', description: 'Hydrostatic Test Inspection reports', icon: Droplets },
    { id: 'dishend', title: 'Dish End Report', description: 'Dish End Inspection reports', icon: Layers },
    { id: 'final', title: 'Final Inspection', description: 'Final Inspection reports', icon: ClipboardCheck },
    { id: 'rfq', title: 'RFQ Register', description: 'Quotation and Enquiry Register', icon: Search },
    { id: 'users', title: 'User List', description: 'Export all system users and roles', icon: Users },
    { id: 'customers', title: 'Customer List', description: 'Export all customers and contact info', icon: Building2 },
    { id: 'jobs', title: 'Job Register', description: 'Export all jobs and status', icon: Briefcase },
    { id: 'locations', title: 'Locations', description: 'Export all customer locations', icon: Search },
    { id: 'departments', title: 'Departments', description: 'Export all departments', icon: Building2 },
  ];

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-6 bg-white shadow-sm">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-xl font-bold tracking-tight">Reports</h1>
          </div>

          <div className="relative" ref={filterRef}>
            <Button
              variant="outline"
              className="flex items-center gap-2 border-slate-200"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <Filter className="h-4 w-4" />
              <span>{startDate && endDate ? `${startDate} to ${endDate}` : 'Filter by Date'}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </Button>

            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-[400px] bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-6 space-y-6">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-bold text-slate-800">Date Filtering</h3>
                  <Button variant="ghost" size="icon" onClick={() => setIsFilterOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {['today', 'yesterday', 'thisWeek', 'thisMonth', 'lastMonth'].map((p) => (
                      <Button
                        key={p}
                        variant="ghost"
                        size="sm"
                        className="justify-start font-medium text-xs uppercase tracking-wider h-9"
                        onClick={() => setDatePreset(p)}
                      >
                        {p.replace(/([A-Z])/g, ' $1')}
                      </Button>
                    ))}
                  </div>

                  <div className="h-px bg-slate-100" />

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400">START DATE</Label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400">END DATE</Label>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="link"
                        size="sm"
                        className="text-red-500 font-bold text-[10px] uppercase h-8"
                        onClick={() => { setStartDate(''); setEndDate(''); }}
                      >
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        className="bg-slate-900 h-8 text-xs font-bold"
                        onClick={() => setIsFilterOpen(false)}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 flex flex-col">
          <div className="flex-1 flex flex-col w-full">

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportModules.map((module) => {
                const count = summary[module.id] || 0;
                return (
                  <Card key={module.id} className="border border-slate-200 shadow-none hover:shadow-sm transition-shadow bg-white flex flex-col">
                    <CardHeader className="p-5 pb-2">
                      <div className="flex items-start justify-between">
                        <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600">
                          <module.icon className="h-5 w-5" />
                        </div>
                        {isLoadingSummary ? (
                          <div className="h-2 w-12 bg-slate-100 animate-pulse rounded" />
                        ) : (
                          <Badge variant="outline" className={`text-[10px] font-bold border-slate-200 ${count > 0 ? 'text-blue-600 bg-blue-50/50' : 'text-slate-400'}`}>
                            {count} RECORDS
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="mt-4 text-base font-bold text-slate-900 tracking-tight">{module.title}</CardTitle>
                      <CardDescription className="text-xs text-slate-500 mt-1">{module.description}</CardDescription>
                    </CardHeader>

                    <CardFooter className="p-5 pt-4 mt-auto">
                      <Button
                        variant="outline"
                        className={`w-full h-10 font-bold text-xs uppercase tracking-wider transition-all ${count > 0
                            ? 'border-slate-300 hover:bg-slate-900 hover:text-white'
                            : 'opacity-50 cursor-not-allowed bg-slate-50 text-slate-400'
                          }`}
                        onClick={() => handleDownload(module.id, module.title)}
                        disabled={isDownloading || (!isLoadingSummary && count === 0)}
                      >
                        {isDownloading ? (
                          <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                        ) : (
                          <FileDown className="h-4 w-4 mr-2" />
                        )}
                        Download Excel
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>

          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Reports;
