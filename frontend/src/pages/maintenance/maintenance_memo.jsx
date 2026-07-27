import React, { useState, useMemo } from "react"
import { PageContainer } from "@/components/layout/PageContainer"
import ProDataTable from "@/components/shared/ProDataTable"
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"
import { Plus, Eye, Paperclip, MessageSquare, ArrowLeft, UploadCloud, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription
} from "@/components/ui/card"
import { SearchableSelect } from "@/components/shared/SearchableSelect"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ----------------------------------------------------------------------
// 1. LIST VIEW
// ----------------------------------------------------------------------
function ListView({ onInitiateClick, onViewClick, data }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRows, setSelectedRows] = useState(new Set());

  // Dummy fetch function for ProDataTable
  const fetchData = async ({ page, limit, search }) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filteredData = [...data];
        if (search) {
          const lowerSearch = search.toLowerCase();
          filteredData = filteredData.filter(item => 
            item.machineName.toLowerCase().includes(lowerSearch) || 
            item.fault.toLowerCase().includes(lowerSearch) ||
            item.id.toLowerCase().includes(lowerSearch)
          );
        }
        resolve({
          data: filteredData.slice((page - 1) * limit, page * limit),
          meta: {
            total: filteredData.length,
            page,
            totalPages: Math.ceil(filteredData.length / limit),
          }
        });
      }, 500);
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Open": return "bg-red-100 text-red-700 border-red-200";
      case "In Progress": return "bg-amber-100 text-amber-700 border-amber-200";
      case "Resolved": return "bg-green-100 text-green-700 border-green-200";
      case "Closed": return "bg-slate-100 text-slate-700 border-slate-200";
      default: return "bg-slate-100 text-slate-700";
    }
  }

  const columns = useMemo(() => [
    {
      id: "id",
      accessorKey: "id",
      header: "Memo No",
      width: "120px",
      cell: (row) => <span className="font-bold text-slate-700">{row.id}</span>
    },
    {
      id: "date",
      accessorKey: "date",
      header: "Date",
      filterType: "date",
      width: "110px"
    },
    {
      id: "shift",
      accessorKey: "shift",
      header: "Shift",
      filterType: "select",
      filterOptions: [
        { label: "1", value: "1" },
        { label: "2", value: "2" },
        { label: "3", value: "3" },
      ],
      width: "80px"
    },
    {
      id: "informBy",
      accessorKey: "informBy",
      header: "Inform By",
      filterType: "text",
      width: "100px"
    },
    {
      id: "machineName",
      accessorKey: "machineName",
      header: "Machine Name",
      filterType: "text",
      width: "250px"
    },
    {
      id: "fault",
      accessorKey: "fault",
      header: "Fault Statement",
      filterType: "text",
      width: "300px",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="truncate text-slate-600" title={row.fault}>{row.fault}</span>
          {row.attachments && <Paperclip className="h-3 w-3 text-blue-500 shrink-0" />}
        </div>
      )
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      filterType: "select",
      filterOptions: [
        { label: "Open", value: "Open" },
        { label: "In Progress", value: "In Progress" },
        { label: "Resolved", value: "Resolved" },
        { label: "Closed", value: "Closed" },
      ],
      width: "120px",
      cell: (row) => (
        <Badge variant="outline" className={`${getStatusColor(row.status)} shadow-none text-[10px] h-5 tracking-wide uppercase font-bold`}>
          {row.status}
        </Badge>
      )
    },
    {
      id: "actions",
      header: "Actions",
      width: "80px",
      cell: (row) => {
        // Different label based on status
        const isMaintenanceAction = row.status === "Open" || row.status === "In Progress";
        return (
          <DataTableRowActions 
            actions={[
              { 
                label: isMaintenanceAction ? "Resolve Memo" : "View Details", 
                icon: isMaintenanceAction ? Clock : Eye, 
                onClick: () => onViewClick(row) 
              }
            ]}
          />
        )
      }
    }
  ], [onViewClick]);

  return (
    <div className="h-full flex flex-col pt-4">
      <ProDataTable
        columns={columns}
        fetchData={fetchData}
        refreshKey={refreshKey}
        onAdd={onInitiateClick}
        onAddTooltip="Initiate Memo"
        globalSearchPlaceholder="Search memos by machine or fault..."
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        initialStickyColumns={["id", "machineName"]}
      />
    </div>
  );
}

// ----------------------------------------------------------------------
// 2. STAGE 1: INITIATE MEMO VIEW (PRODUCTION)
// ----------------------------------------------------------------------
function InitiateMemoView({ onBack, onSuccess, data, setData }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: "",
    informBy: "Current User", // Normally from Auth Context
    informTo: "",
    machineName: "",
    fault: "",
    attachments: false
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const newMemo = {
      ...formData,
      id: `MEM-00${data.length + 1}`,
      status: "Open",
      actionTaken: "",
    };
    setData([newMemo, ...data]);
    onSuccess();
  };

  return (
    <div className="flex flex-col gap-4 pt-2 pb-6 w-full">
      <div className="flex items-center justify-end shrink-0">
        <Button variant="outline" onClick={onBack} className="shadow-none h-9 text-slate-700 border-slate-200 bg-white">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200 shrink-0 bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Initiate Maintenance Memo</CardTitle>
          <CardDescription className="text-xs">Production department will fill out the fault statement to notify maintenance.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Machine Name <span className="text-red-500">*</span></label>
              <SearchableSelect
                options={[
                  { label: "A/SORAMILL FR 8000 CNC-9", value: "A/SORAMILL FR 8000 CNC-9" },
                  { label: "B/KUMLA ROLLING( BP-05)", value: "B/KUMLA ROLLING( BP-05)" },
                  { label: "B/HASS VF-5", value: "B/HASS VF-5" },
                  { label: "A/PROARC CNC", value: "A/PROARC CNC" },
                ]}
                value={formData.machineName}
                onValueChange={(val) => handleInputChange("machineName", val)}
                placeholder="Select machine..."
                className="bg-slate-50/50 shadow-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Shift <span className="text-red-500">*</span></label>
              <SearchableSelect
                options={[
                  { label: "Shift 1", value: "1" },
                  { label: "Shift 2", value: "2" },
                  { label: "Shift 3", value: "3" },
                  { label: "General", value: "General" },
                ]}
                value={formData.shift}
                onValueChange={(val) => handleInputChange("shift", val)}
                placeholder="Select Shift"
                className="bg-slate-50/50 shadow-none border-slate-200"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Date <span className="text-red-500">*</span></label>
              <Input type="date" value={formData.date} onChange={(e) => handleInputChange("date", e.target.value)} className="bg-slate-50/50 shadow-none" />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Fault / Problem Statement <span className="text-red-500">*</span></label>
              <Textarea 
                placeholder="Describe the issue in detail..." 
                value={formData.fault}
                onChange={(e) => handleInputChange("fault", e.target.value)}
                className="bg-slate-50/50 shadow-none min-h-[100px] resize-y [field-sizing:fixed]"
              />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Attachments (Optional)</label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 flex flex-col items-center justify-center text-slate-500 bg-slate-50/50 hover:bg-slate-100 transition-colors cursor-pointer">
                <UploadCloud className="h-8 w-8 mb-2 text-slate-400" />
                <span className="text-sm font-medium">Click to upload or drag and drop</span>
                <span className="text-xs text-slate-400 mt-1">PNG, JPG, PDF up to 10MB</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Inform By (Auto) <span className="text-red-500">*</span></label>
              <SearchableSelect
                options={[
                  { label: "Current User", value: "Current User" }
                ]}
                value={formData.informBy}
                onValueChange={() => {}}
                disabled={true}
                placeholder="Current User"
                className="bg-slate-100 text-slate-500 shadow-none border-dashed opacity-70 cursor-not-allowed"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Inform To <span className="text-red-500">*</span></label>
              <SearchableSelect
                options={[
                  { label: "Mechanical Dept", value: "Mechanical Dept" },
                  { label: "Electrical Dept", value: "Electrical Dept" },
                  { label: "Utilities", value: "Utilities" },
                ]}
                value={formData.informTo}
                onValueChange={(val) => handleInputChange("informTo", val)}
                placeholder="Select Maintenance Group"
                className="bg-slate-50/50 shadow-none border-slate-200"
                required
              />
            </div>

          </div>
        </CardContent>
        <CardFooter className="bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3 py-4">
          <Button variant="outline" onClick={onBack} className="shadow-none bg-white">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-blue-600 text-white hover:bg-blue-700 shadow-none cursor-pointer">
            Submit
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// ----------------------------------------------------------------------
// 3. STAGE 2: RESOLVE MEMO VIEW (MAINTENANCE)
// ----------------------------------------------------------------------
function ResolveMemoView({ onBack, onSuccess, memo, data, setData }) {
  // Maintenance resolution form state
  const [resolution, setResolution] = useState({
    actionTaken: memo.actionTaken || "",
    attendedBy: memo.attendedBy || "",
    activityType: memo.activityType || "",
    materialConsumed: memo.materialConsumed || false,
    receivedTime: memo.receivedTime || "",
    attendedTime: memo.attendedTime || "",
    compTime: memo.compTime || "",
    compDate: memo.compDate || new Date().toISOString().split('T')[0],
    manHrsTech: memo.manHrsTech || "",
    manHrsMgt: memo.manHrsMgt || "",
    totalManHrs: memo.totalManHrs || "",
    breakdownHrs: memo.breakdownHrs || "",
    status: memo.status === "Open" ? "UNDER BREAKDOWN" : memo.status,
    remarks: memo.remarks || "",
  });

  const handleResChange = (field, value) => {
    setResolution(prev => {
      const next = { ...prev, [field]: value };
      // Auto calc total man hours if tech/mgt changes
      if (field === "manHrsTech" || field === "manHrsMgt") {
        const tech = parseFloat(next.manHrsTech) || 0;
        const mgt = parseFloat(next.manHrsMgt) || 0;
        next.totalManHrs = tech + mgt;
      }
      return next;
    });
  };

  const handleUpdate = () => {
    const updatedData = data.map(m => {
      if (m.id === memo.id) {
        return { ...m, ...resolution };
      }
      return m;
    });
    setData(updatedData);
    onSuccess();
  };

  return (
    <div className="flex flex-col gap-4 pt-2 pb-6 w-full">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">{memo.id}</h2>
          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 uppercase text-[10px] tracking-wide font-bold">{resolution.status}</Badge>
        </div>
        <Button variant="outline" onClick={onBack} className="shadow-none h-9 text-slate-700 border-slate-200 bg-white">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List
        </Button>
      </div>

      <div className="flex flex-col gap-6 w-full">
        
        {/* Top Section: Problem Statement (Read-Only) */}
        <Card className="shadow-none border-slate-200 bg-white rounded-none">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Initiate Maintenance Memo</CardTitle>
            <CardDescription className="text-xs">Production department will fill out the fault statement to notify maintenance.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Machine Name <span className="text-red-500">*</span></label>
                <div className="px-3 py-2 border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-800 flex items-center min-h-[36px]">
                  {memo.machineName}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Shift <span className="text-red-500">*</span></label>
                <div className="px-3 py-2 border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-800 flex items-center min-h-[36px]">
                  {memo.shift}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Date <span className="text-red-500">*</span></label>
                <div className="px-3 py-2 border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-800 flex items-center min-h-[36px]">
                  {memo.date}
                </div>
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Fault / Problem Statement <span className="text-red-500">*</span></label>
                <div className="px-3 py-3 border border-slate-200 bg-slate-50/50 text-sm text-slate-800 min-h-[100px] whitespace-pre-wrap">
                  {memo.fault}
                </div>
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Attachments (Optional)</label>
                <div className="border border-dashed border-slate-200 p-6 flex flex-col items-center justify-center text-slate-500 bg-slate-50/50">
                  <span className="text-sm font-medium text-slate-400">No attachments provided</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Inform By (Auto) <span className="text-red-500">*</span></label>
                <div className="px-3 py-2 border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-800 flex items-center min-h-[36px]">
                  {memo.informBy}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Inform To <span className="text-red-500">*</span></label>
                <div className="px-3 py-2 border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-800 flex items-center min-h-[36px]">
                  {memo.informTo || "Maintenance"}
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Bottom Section: Maintenance Resolution Form */}
        <Card className="shadow-none border-slate-200 bg-white rounded-none">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Maintenance Resolution Form</CardTitle>
            <CardDescription className="text-xs">Fill out the action taken, hours, and resolve the memo.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6">
                
                {/* Timeline */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Received Time</label>
                  <Input type="time" value={resolution.receivedTime} onChange={e => handleResChange("receivedTime", e.target.value)} className="bg-slate-50/50 shadow-none" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Attended Time</label>
                  <Input type="time" value={resolution.attendedTime} onChange={e => handleResChange("attendedTime", e.target.value)} className="bg-slate-50/50 shadow-none" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Completion Time</label>
                  <Input type="time" value={resolution.compTime} onChange={e => handleResChange("compTime", e.target.value)} className="bg-slate-50/50 shadow-none" />
                </div>

                {/* Details */}
                <div className="flex flex-col gap-2 md:col-span-3">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Action Taken <span className="text-red-500">*</span></label>
                  <Textarea 
                    value={resolution.actionTaken} 
                    onChange={e => handleResChange("actionTaken", e.target.value)} 
                    placeholder="Describe what was fixed..."
                    className="bg-slate-50/50 shadow-none min-h-[80px] resize-y [field-sizing:fixed]" 
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Attended By</label>
                  <Input placeholder="e.g. PP/VP/JR" value={resolution.attendedBy} onChange={e => handleResChange("attendedBy", e.target.value)} className="bg-slate-50/50 shadow-none" />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Activity Type</label>
                  <SearchableSelect
                    options={[
                      { label: "M - Mechanical", value: "M" },
                      { label: "E - Electrical", value: "E" },
                      { label: "PM - Preventive", value: "PM" },
                      { label: "MIS - Miscellaneous", value: "MIS" },
                      { label: "IMP - Improvement", value: "IMP" },
                    ]}
                    value={resolution.activityType}
                    onValueChange={(val) => handleResChange("activityType", val)}
                    placeholder="Select Type"
                    className="bg-slate-50/50 shadow-none border-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Material Consumed?</label>
                  <SearchableSelect
                    options={[
                      { label: "YES", value: "yes" },
                      { label: "NO", value: "no" }
                    ]}
                    value={resolution.materialConsumed ? "yes" : "no"}
                    onValueChange={(val) => handleResChange("materialConsumed", val === "yes")}
                    placeholder="Select Yes/No"
                    className="bg-slate-50/50 shadow-none border-slate-200"
                  />
                </div>

                {/* Hours Tracker */}
                <div className="md:col-span-3 border-t border-slate-100 pt-4 mt-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Hours Tracking</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Man Hrs (Tech)</label>
                      <Input type="number" value={resolution.manHrsTech} onChange={e => handleResChange("manHrsTech", e.target.value)} className="bg-slate-50/50 shadow-none" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Man Hrs (Mgt)</label>
                      <Input type="number" value={resolution.manHrsMgt} onChange={e => handleResChange("manHrsMgt", e.target.value)} className="bg-slate-50/50 shadow-none" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Total Man Hrs</label>
                      <Input type="number" disabled value={resolution.totalManHrs} className="bg-slate-100 border-dashed text-slate-600 shadow-none" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Breakdown Hrs</label>
                      <Input type="number" value={resolution.breakdownHrs} onChange={e => handleResChange("breakdownHrs", e.target.value)} className="bg-slate-50/50 shadow-none" />
                    </div>
                  </div>
                </div>

                {/* Completion Status */}
                <div className="md:col-span-3 border-t border-slate-100 pt-4 mt-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Completion Date</label>
                    <Input type="date" value={resolution.compDate} onChange={e => handleResChange("compDate", e.target.value)} className="bg-slate-50/50 shadow-none" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Memo Status</label>
                    <SearchableSelect
                      options={[
                        { label: "OK", value: "OK" },
                        { label: "UNDER BREAKDOWN", value: "UNDER BREAKDOWN" },
                      ]}
                      value={resolution.status}
                      onValueChange={(val) => handleResChange("status", val)}
                      placeholder="Status"
                      className="bg-slate-50/50 shadow-none border-slate-200 font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Remarks</label>
                    <Textarea 
                      value={resolution.remarks} 
                      onChange={e => handleResChange("remarks", e.target.value)} 
                      placeholder="Any additional remarks..."
                      className="bg-slate-50/50 shadow-none min-h-[60px] resize-y [field-sizing:fixed]" 
                    />
                  </div>
                </div>

              </div>
            </CardContent>
            <CardFooter className="bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3 py-4 shrink-0">
              <Button variant="outline" onClick={onBack} className="shadow-none bg-white">
                Cancel
              </Button>
              <Button onClick={handleUpdate} className="bg-slate-900 text-white hover:bg-slate-800 shadow-none">
                <CheckCircle className="h-4 w-4 mr-2" />
                Update & Save
              </Button>
            </CardFooter>
          </Card>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MAIN EXPORT
// ----------------------------------------------------------------------
export function MaintenanceMemo() {
  const [view, setView] = useState("list"); // 'list', 'initiate', 'resolve'
  const [activeMemo, setActiveMemo] = useState(null);

  const [data, setData] = useState([
    {
      id: "MEM-001",
      date: "2026-06-01",
      shift: "1",
      informBy: "YP",
      informTo: "Mechanical Dept",
      machineName: "B/KUMLA ROLLING( BP-05)",
      fault: "Bottom roller moves downward",
      actionTaken: "Bottom roller cylinder ram seal change",
      attendedBy: "PP/VP/JR",
      activityType: "M",
      materialRequired: true,
      receivedTime: "09:10",
      attendedTime: "09:10",
      compTime: "15:15",
      compDate: "2026-06-06",
      manHrsTech: 24,
      manHrsMgt: 10,
      totalManHrs: 34,
      breakdownHrs: 80,
      status: "Closed",
      attachments: true
    },
    {
      id: "MEM-002",
      date: "2026-06-01",
      shift: "1",
      informBy: "MBJ",
      informTo: "Electrical Dept",
      machineName: "A/SORAMILL FR 8000 CNC-9",
      fault: "HHU not working",
      actionTaken: "cable disconnected, connection done",
      attendedBy: "NP/MR",
      activityType: "E",
      materialRequired: false,
      receivedTime: "10:00",
      attendedTime: "10:00",
      compTime: "12:00",
      compDate: "2026-06-01",
      manHrsTech: 1,
      manHrsMgt: 1,
      totalManHrs: 2,
      breakdownHrs: 1,
      status: "Resolved",
      attachments: false
    },
    {
      id: "MEM-003",
      date: "2026-06-03",
      shift: "1",
      informBy: "MBJ",
      informTo: "Mechanical Dept",
      machineName: "A/PROARC CNC",
      fault: "No axis movement",
      actionTaken: "",
      status: "Open",
      attachments: false
    }
  ]);

  return (
    <PageContainer
      title={view === "list" ? "Maintenance Memos" : ""}
      description={view === "list" ? "Track and resolve maintenance requests." : ""}
      breadcrumb={[
        { label: "Maintenance", path: "/maintenance" },
        { label: "Memos", path: "/maintenance/memo" },
      ]}
    >
      {view === "list" && (
        <ListView 
          onInitiateClick={() => setView("initiate")} 
          onViewClick={(memo) => {
            setActiveMemo(memo);
            setView("resolve");
          }}
          data={data}
        />
      )}
      
      {view === "initiate" && (
        <InitiateMemoView 
          onBack={() => setView("list")}
          onSuccess={() => setView("list")}
          data={data}
          setData={setData}
        />
      )}

      {view === "resolve" && activeMemo && (
        <ResolveMemoView
          onBack={() => {
            setActiveMemo(null);
            setView("list");
          }}
          onSuccess={() => {
            setActiveMemo(null);
            setView("list");
          }}
          memo={activeMemo}
          data={data}
          setData={setData}
        />
      )}
    </PageContainer>
  );
}
