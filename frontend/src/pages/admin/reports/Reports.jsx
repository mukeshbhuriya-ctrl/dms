import { PageContainer } from "@/components/layout/PageContainer";
import React, { useState, useEffect, useRef } from 'react';
;
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
  X,
  Database,
  UserPlus,
  History,
  FolderLock,
  Send,
  LayoutGrid
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
  const [activeTab, setActiveTab] = useState('Engineering/Quality');
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
        
        // DMS Modules
        case 'doc_assign': res = await exportApi.exportModule('document-assign', params, 'document_assignment_register.xlsx'); break;
        case 'doc_upload': res = await exportApi.exportModule('document-version', params, 'document_upload_log.xlsx'); break;
        case 'doc_approver': res = await exportApi.exportModule('document-approver', params, 'document_approver_register.xlsx'); break;
        case 'doc_transmission': res = await exportApi.exportModule('transmission', params, 'transmission_log.xlsx'); break;

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

  const categories = [
    { name: 'Engineering/Quality', icon: FileText },
    { name: 'DMS Core', icon: Database },
    { name: 'Operations', icon: LayoutGrid },
    { name: 'Marketing', icon: Search },
    { name: 'Admin', icon: Settings2 },
  ];

  const reportModules = [
    // Engineering/Quality
    { id: 'ncr', title: 'NCR Report', description: 'Non-Conformance Reports', icon: FileText, category: 'Engineering/Quality' },
    { id: 'dcr', title: 'DCR Report', description: 'Design Change Request reports', icon: Settings2, category: 'Engineering/Quality' },
    { id: 'wjp', title: 'Weld Joint Plan', description: 'Consolidated Weld Joint Plans', icon: Layers, category: 'Engineering/Quality' },
    { id: 'wjd', title: 'Weld Joint Details', description: 'Detailed individual joint inspection data', icon: CheckCircle2, category: 'Engineering/Quality' },
    { id: 'mhc', title: 'Material Heat Chart', description: 'Full Material Heat Chart data', icon: ClipboardCheck, category: 'Engineering/Quality' },
    { id: 'qap', title: 'QAP Report', description: 'Quality Assurance Plan reports', icon: FileDown, category: 'Engineering/Quality' },
    
    // DMS Core
    { id: 'doc_assign', title: 'Assign Document', description: 'Document Assignment Tracking', icon: UserPlus, category: 'DMS Core' },
    { id: 'doc_upload', title: 'Upload Documents', description: 'Activity log of all document uploads', icon: History, category: 'DMS Core' },
    { id: 'doc_approver', title: 'Document Approver', description: 'Internal approval status and history', icon: FolderLock, category: 'DMS Core' },
    { id: 'doc_transmission', title: 'Transmissions', description: 'Transmission creation logs', icon: Send, category: 'DMS Core' },

    // Operations
    { id: 'hydro', title: 'Hydro Test', description: 'Hydrostatic Test Inspection reports', icon: Droplets, category: 'Operations' },
    { id: 'dishend', title: 'Dish End Report', description: 'Dish End Inspection reports', icon: Layers, category: 'Operations' },
    { id: 'final', title: 'Final Inspection', description: 'Final Inspection reports', icon: ClipboardCheck, category: 'Operations' },
    
    // Marketing
    { id: 'rfq', title: 'RFQ Register', description: 'Quotation and Enquiry Register', icon: Search, category: 'Marketing' },
    
    // Admin
    { id: 'users', title: 'User List', description: 'Export all system users and roles', icon: Users, category: 'Admin' },
    { id: 'customers', title: 'Customer List', description: 'Export all customers and contact info', icon: Building2, category: 'Admin' },
    { id: 'jobs', title: 'Job Register', description: 'Export all jobs and status', icon: Briefcase, category: 'Admin' },
    { id: 'locations', title: 'Locations', description: 'Export all customer locations', icon: Search, category: 'Admin' },
    { id: 'departments', title: 'Departments', description: 'Export all departments', icon: Building2, category: 'Admin' },
  ];

  const filteredModules = reportModules.filter(m => m.category === activeTab);

  return (
    <>

        <PageContainer>
{/* Simple Tab Switcher */}
            <div className="flex items-center gap-2 border-b border-gray-200">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setActiveTab(cat.name)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all border-b-2 ${
                    activeTab === cat.name 
                      ? 'border-slate-900 text-slate-900' 
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-gray-300'
                  }`}
                >
                  <cat.icon className="h-4 w-4" />
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredModules.map((module) => {
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
</PageContainer>
    </>
  );
};

export default Reports;
