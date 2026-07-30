import React, { useState, useMemo, useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import ProDataTable from "@/components/shared/ProDataTable";
import { DataTableRowActions } from "@/components/shared/DataTableRowActions";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Plus, Eye, ArrowLeft, Trash2, Edit, Save, CheckCircle, Copy, Archive, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import apiClient from "@/api/api.client";
import { format } from "date-fns";

// ----------------------------------------------------------------------
// 1. MASTER LIST VIEW
// ----------------------------------------------------------------------
function ListView({ onCreateClick, onEditClick, onViewClick }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [cloneDialog, setCloneDialog] = useState({ isOpen: false, plan: null, nextYear: "" });
  const [actionDialog, setActionDialog] = useState({ isOpen: false, type: "", plan: null });

  const fetchPlans = async ({ page, limit, search }) => {
    try {
      const res = await apiClient.get('/api/maintenance/pm-plans', {
        page, limit, search
      });
      return res;
    } catch (error) {
      console.error("Error fetching PM plans:", error);
      return { data: [], meta: { total: 0 } };
    }
  };

  const handleCloneClick = (plan) => {
    const nextYear = (parseInt(plan.year.split('-')[0]) + 1) + "-" + (parseInt(plan.year.split('-')[1]) + 1);
    setCloneDialog({ isOpen: true, plan, nextYear });
  };

  const confirmClone = async () => {
    try {
      await apiClient.post('/api/maintenance/pm-plans/clone', { old_plan_id: cloneDialog.plan.id, new_year: cloneDialog.nextYear });
      setRefreshKey(prev => prev + 1);
      setCloneDialog({ isOpen: false, plan: null, nextYear: "" });
    } catch (e) {
      console.error("Clone failed", e);
    }
  };

  const handleActionClick = (type, plan) => {
    setActionDialog({ isOpen: true, type, plan });
  };

  const confirmAction = async () => {
    try {
      if (actionDialog.type === "archive") {
        await apiClient.delete(`/api/maintenance/pm-plans/${actionDialog.plan.id}`);
      } else if (actionDialog.type === "toggle") {
        await apiClient.patch(`/api/maintenance/pm-plans/toggle-status/${actionDialog.plan.id}`);
      }
      setRefreshKey(prev => prev + 1);
      setActionDialog({ isOpen: false, type: "", plan: null });
    } catch (e) {
      console.error("Action failed", e);
    }
  };

  const columns = useMemo(() => [
    {
      id: "id",
      accessorKey: "id",
      header: "Plan ID",
      cell: (row) => <span className="font-bold text-slate-700 text-xs">{row.id.slice(0, 8).toUpperCase()}</span>
    },
    {
      id: "year",
      accessorKey: "year",
      header: "Plan Year",
      cell: (row) => <span className="font-semibold text-slate-900">{row.year}</span>
    },
    { id: "doc_no", accessorKey: "doc_no", header: "Doc No" },
    { id: "rev_no", accessorKey: "rev_no", header: "Rev. No", cell: (row) => <Badge variant="outline" className="bg-slate-50">{row.rev_no || "0"}</Badge> },
    { id: "rev_date", accessorKey: "rev_date", header: "Rev Date", cell: (row) => row.rev_date ? format(new Date(row.rev_date), 'dd-MM-yyyy') : '' },
    {
      id: "is_active",
      accessorKey: "is_active",
      header: "Active",
      cell: (row) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${row.is_active ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
          {row.is_active ? "Active" : "Inactive"}
        </span>
      )
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant="outline" className={row.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}>
          {row.status}
        </Badge>
      )
    },
    {
      id: "progress",
      accessorKey: "progress",
      header: "Progress",
      cell: (row) => (
        <div className="flex items-center gap-2 w-full max-w-[100px]">
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: `${row.progress || 0}%` }} />
          </div>
          <span className="text-[10px] font-bold text-slate-500">{row.progress || 0}%</span>
        </div>
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <DataTableRowActions 
          actions={[
            { label: "Edit Schedule", icon: Edit, onClick: () => onEditClick(row) },
            { label: "Clone Next Year", icon: Copy, onClick: () => handleCloneClick(row) },
            { type: "separator" },
            { 
              label: row.is_active ? "Deactivate" : "Activate", 
              icon: row.is_active ? XCircle : CheckCircle2, 
              onClick: () => handleActionClick("toggle", row),
              className: row.is_active ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            },
            { 
              label: "Archive", 
              icon: Archive, 
              onClick: () => handleActionClick("archive", row),
              className: "text-red-600 hover:text-red-700 hover:bg-red-50"
            },
          ]} 
        />
      )
    }
  ], [onEditClick]);

  return (
    <div className="h-full flex flex-col pt-4">
      <ProDataTable
        columns={columns}
        fetchData={fetchPlans}
        refreshKey={refreshKey}
        onAdd={onCreateClick}
        onAddTooltip="Create New Plan"
        globalSearchPlaceholder="Search plans by year or ID..."
      />

      <ConfirmDialog
        isOpen={cloneDialog.isOpen}
        onClose={() => setCloneDialog({ isOpen: false, plan: null, nextYear: "" })}
        onConfirm={confirmClone}
        title="Clone PM Schedule"
        description={`Are you sure you want to clone the PM Schedule for ${cloneDialog.plan?.year} into the new financial year ${cloneDialog.nextYear}? This will copy all machines and carry forward all frequencies.`}
        confirmText="Yes, Clone Schedule"
        cancelText="Cancel"
        variant="info"
      />

      <ConfirmDialog
        isOpen={actionDialog.isOpen}
        onClose={() => setActionDialog({ isOpen: false, type: "", plan: null })}
        onConfirm={confirmAction}
        title={actionDialog.type === "archive" ? "Archive PM Schedule" : (actionDialog.plan?.is_active ? "Deactivate PM Schedule" : "Activate PM Schedule")}
        description={
          actionDialog.type === "archive" 
            ? `Are you sure you want to archive the PM Schedule for ${actionDialog.plan?.year}? This will hide it from the active list.`
            : `Are you sure you want to ${actionDialog.plan?.is_active ? "deactivate" : "activate"} the PM Schedule for ${actionDialog.plan?.year}?`
        }
        confirmText={actionDialog.type === "archive" ? "Archive" : (actionDialog.plan?.is_active ? "Deactivate" : "Activate")}
        cancelText="Cancel"
        variant={actionDialog.type === "archive" ? "danger" : "warning"}
      />
    </div>
  );
}

// ----------------------------------------------------------------------
// 2. CREATE / EDIT PLAN VIEW (TABULAR FORM)
// ----------------------------------------------------------------------
function CreateEditView({ plan, onBack, onSuccess }) {
  const [machinesList, setMachinesList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [intendedStatus, setIntendedStatus] = useState('PENDING');

  const currentYear = new Date().getFullYear();
  const defaultYear = new Date().getMonth() >= 3 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
  const yearOptions = [
    `${currentYear - 1}-${currentYear}`,
    `${currentYear}-${currentYear + 1}`,
    `${currentYear + 1}-${currentYear + 2}`,
    `${currentYear + 2}-${currentYear + 3}`
  ];

  const [formData, setFormData] = useState({
    id: plan?.id || "",
    year: plan?.year || defaultYear,
    doc_no: plan?.doc_no || "F-MNT-02",
    rev_date: plan?.rev_date ? new Date(plan.rev_date).toISOString().split('T')[0] : "",
    rev_no: plan?.rev_no || "0",
    frequency: plan?.frequency || "QUARTERLY",
    preparer_ids: plan?.signers?.map(p => p.user_id) || [],
    approved_by_id: plan?.approved_by_id || "",
  });

  const getColumnsForFrequency = (freq) => {
    switch (freq) {
      case "MONTHLY":
        return [
          { key: "m1", label: "APR (M1)" }, { key: "m2", label: "MAY (M2)" }, { key: "m3", label: "JUN (M3)" },
          { key: "m4", label: "JUL (M4)" }, { key: "m5", label: "AUG (M5)" }, { key: "m6", label: "SEP (M6)" },
          { key: "m7", label: "OCT (M7)" }, { key: "m8", label: "NOV (M8)" }, { key: "m9", label: "DEC (M9)" },
          { key: "m10", label: "JAN (M10)" }, { key: "m11", label: "FEB (M11)" }, { key: "m12", label: "MAR (M12)" },
        ];
      case "HALF_YEARLY":
        return [{ key: "h1", label: "SEP (H1)" }, { key: "h2", label: "MAR (H2)" }];
      case "QUARTERLY":
      default:
        return [
          { key: "q1", label: "JUN (Q1)" },
          { key: "q2", label: "SEP (Q2)" },
          { key: "q3", label: "DEC (Q3)" },
          { key: "q4", label: "MAR (Q4)" },
        ];
    }
  };

  const columns = getColumnsForFrequency(formData.frequency);

  const generateInitialEvents = (freq) => {
    const cols = getColumnsForFrequency(freq);
    const events = {};
    cols.forEach(c => {
      events[`${c.key}Plan`] = "";
      events[`${c.key}Done`] = "";
    });
    return events;
  };

  const [tableRows, setTableRows] = useState(() => {
    if (!plan?.id) return Array.from({ length: 5 }, (_, i) => ({ id: Date.now() + i, machineId: "", ...generateInitialEvents(plan?.frequency || "QUARTERLY") }));
    return [];
  });

  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        // Safely fetch machines
        try {
          const macRes = await apiClient.get('/api/maintenance/machines', { limit: 1000 });
          setMachinesList(macRes.data?.map(m => ({ label: m.machine_name, value: m.id })) || []);
        } catch (e) {
          console.error("Failed to fetch machines", e);
        }
        
        // Safely fetch users
        try {
          const allUsr = await apiClient.get('/api/users/by-role/MAINTENANCE');
          const users = allUsr.data || [];
          setUsersList(users.map(u => ({ label: u.name, value: u.id })));
        } catch (e) {
          console.error("Failed to fetch users", e);
        }

        if (plan?.id) {
          const planRes = await apiClient.get(`/api/maintenance/pm-plans/${plan.id}`);
          const fullPlan = planRes.data;
          
          if (fullPlan.schedules && fullPlan.schedules.length > 0) {
            const mappedRows = fullPlan.schedules.map((sched, idx) => {
              const row = { id: sched.id || Date.now() + idx, machineId: sched.machine_id };
              const cols = getColumnsForFrequency(fullPlan.frequency);
              cols.forEach((c, i) => {
                const ev = sched.events[i];
                row[`${c.key}Plan`] = ev?.plan_date ? ev.plan_date.split('T')[0] : "";
                row[`${c.key}Done`] = ev?.status === 'NOT_AVAILABLE' ? "N/A" : (ev?.done_date ? ev.done_date.split('T')[0] : "");
                row[`${c.key}Id`] = ev?.id;
              });
              return row;
            });
            setTableRows(mappedRows);
          } else {
            setTableRows(Array.from({ length: 12 }, (_, i) => ({ id: Date.now() + i, machineId: "", ...generateInitialEvents(fullPlan.frequency) })));
          }
        }
      } catch (err) {
        console.error("Error fetching form dependencies", err);
      }
    };
    fetchDependencies();
  }, [plan]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFrequencyChange = (val) => {
    setFormData(prev => ({ ...prev, frequency: val }));
    setTableRows(prev => prev.map(row => ({ id: row.id, machineId: row.machineId, ...generateInitialEvents(val) })));
  };

  const handleRowChange = (id, field, value) => {
    setTableRows(
      tableRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const addTableRow = (index) => {
    const newRow = { id: Date.now(), machineId: "", ...generateInitialEvents(formData.frequency) };
    const newRows = [...tableRows];
    newRows.splice(index + 1, 0, newRow);
    setTableRows(newRows);
  };

  const removeTableRow = (id) => {
    if (tableRows.length > 1) {
      setTableRows(tableRows.filter((row) => row.id !== id));
    }
  };

  const handleSubmit = async (targetStatus = 'PENDING') => {
    if (!formData.preparer_ids || formData.preparer_ids.length === 0) {
      alert("Please select at least one Preparer before saving.");
      return;
    }
    if (!formData.approved_by_id) {
      alert("Please select an Approver before saving.");
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        ...formData,
        status: targetStatus,
        schedules: tableRows.map(row => {
          const cols = getColumnsForFrequency(formData.frequency);
          const events = cols.map(c => {
             const doneVal = row[`${c.key}Done`];
             return {
               key: c.key,
               planDate: row[`${c.key}Plan`] || null,
               doneDate: doneVal === "N/A" ? null : (doneVal || null),
               status: doneVal === "N/A" ? "NOT_AVAILABLE" : (doneVal ? "DONE" : "PENDING")
             };
          });
          return { machineId: row.machineId, events };
        })
      };

      await apiClient.post('/api/maintenance/pm-plans', payload);
      onSuccess();
    } catch (error) {
      console.error("Failed to save plan", error);
      alert("Failed to save plan: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const isReadOnly = plan?.status === "LOCKED";

  const DateCell = ({ planValue, doneValue, onPlanChange, onDoneChange, disabled }) => {
    const isNA = doneValue === "N/A";
    return (
      <div className="flex gap-1 min-w-[220px]">
        <div className="flex-1 space-y-1">
          <Input 
            type="date" 
            value={planValue || ""} 
            onChange={(e) => onPlanChange(e.target.value)}
            disabled={disabled}
            className="h-8 text-xs bg-slate-50 border-slate-200 rounded-none" 
            title="Plan Date"
          />
        </div>
        <div className="flex-1 space-y-1 relative group">
          {isNA ? (
            <div className="h-8 flex items-center justify-center bg-amber-50 border border-amber-200 rounded-none cursor-pointer" onClick={() => !disabled && onDoneChange("")}>
              <span className="text-[10px] font-bold text-amber-600">NOT AV</span>
            </div>
          ) : (
            <Input 
              type="date" 
              value={doneValue || ""} 
              onChange={(e) => onDoneChange(e.target.value)}
              disabled={disabled}
              className="h-8 text-xs font-semibold text-emerald-700 bg-white rounded-none" 
              title="Done Date"
            />
          )}
          {!disabled && !isNA && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[9px] px-2 py-0.5 rounded-none shadow-none whitespace-nowrap z-50 cursor-pointer" onClick={() => onDoneChange("N/A")}>
              Mark N/A
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSubmit(intendedStatus);
  };

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-4 pt-2 pb-6 w-full">
      <div className="flex items-center justify-between shrink-0 pb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {plan ? `Edit PM Schedule ${plan.year}` : "Create New PM Schedule"}
          </h2>
          <p className="text-sm text-slate-500">
            Manage machine maintenance plans and actual done dates.
          </p>
        </div>
        <Button variant="outline" onClick={onBack} className="shadow-none h-9 text-slate-700 border-slate-200 bg-white rounded-md">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List
        </Button>
      </div>

      {/* SECTION 1: BASIC INFORMATION */}
      <Card className="shadow-none border border-slate-200 bg-white rounded-md overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 py-4">
          <CardTitle className="text-sm font-bold text-slate-800">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600 uppercase">Plan Year</Label>
              <Select name="year" value={formData.year} onValueChange={(val) => setFormData({...formData, year: val})} disabled={isReadOnly}>
                <SelectTrigger className="w-full h-9 text-sm bg-slate-50 border-slate-200 rounded-none"><SelectValue placeholder="Select Year" /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600 uppercase">Frequency</Label>
              <Select value={formData.frequency} onValueChange={handleFrequencyChange} disabled={isReadOnly || !!plan?.id}>
                <SelectTrigger className="w-full h-9 text-sm bg-slate-50 border-slate-200 rounded-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600 uppercase">Document No</Label>
              <Input name="doc_no" value={formData.doc_no} onChange={handleInputChange} disabled={isReadOnly} className="h-9 text-sm bg-slate-50 border-slate-200 rounded-none" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600 uppercase">Revision No</Label>
              <Input type="number" name="rev_no" value={formData.rev_no} onChange={handleInputChange} disabled={isReadOnly} className="h-9 text-sm bg-slate-50 border-slate-200 rounded-none" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600 uppercase">Revision Date</Label>
              <Input type="date" name="rev_date" value={formData.rev_date} onChange={handleInputChange} disabled={isReadOnly} className="h-9 text-sm bg-slate-50 border-slate-200 rounded-none" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: PM SCHEDULE GRID */}
      <Card className="shadow-none border border-slate-200 bg-white rounded-md overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 py-4">
          <CardTitle className="text-sm font-bold text-slate-800">PM Schedule</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="border-b border-slate-200">
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead className="w-[50px] text-center text-xs font-bold text-slate-700">#</TableHead>
                  <TableHead className="min-w-[250px] text-xs font-bold text-slate-700 border-x border-slate-200 sticky left-0 bg-slate-100 z-10">Machine Name</TableHead>
                  {columns.map((col) => (
                    <TableHead key={col.key} className="text-center bg-blue-50/50 border-r border-slate-200">
                      <div className="text-xs font-bold text-blue-900 mb-1">{col.label}</div>
                      <div className="flex justify-between px-6 text-[10px] text-blue-600 font-semibold"><span>PLAN DATE</span><span>DONE DATE</span></div>
                    </TableHead>
                  ))}
                  {!isReadOnly && <TableHead className="w-[100px] text-center text-xs font-bold text-slate-700 sticky right-0 bg-slate-100 z-10 shadow-[-1px_0_5px_-2px_rgba(0,0,0,0.1)]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.map((row, index) => (
                  <TableRow key={row.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="text-center font-medium text-slate-500 text-xs">{index + 1}</TableCell>
                    <TableCell className="border-x border-slate-100 p-2 sticky left-0 bg-white z-10 shadow-[1px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <SearchableSelect
                        options={machinesList}
                        value={row.machineId}
                        onValueChange={(val) => handleRowChange(row.id, "machineId", val)}
                        placeholder="Select Machine..."
                        disabled={isReadOnly}
                        required={true}
                        className="h-8 rounded-none text-xs"
                      />
                    </TableCell>
                    {columns.map((col) => (
                      <TableCell key={col.key} className="p-2 border-r border-slate-100 align-top">
                        <DateCell 
                          planValue={row[`${col.key}Plan`]} 
                          doneValue={row[`${col.key}Done`]}
                          onPlanChange={(val) => handleRowChange(row.id, `${col.key}Plan`, val)}
                          onDoneChange={(val) => handleRowChange(row.id, `${col.key}Done`, val)}
                          disabled={isReadOnly}
                        />
                      </TableCell>
                    ))}
                    {!isReadOnly && (
                      <TableCell className="p-2 align-middle sticky right-0 bg-white z-10 shadow-[-1px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" onClick={() => addTableRow(index)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md" onClick={() => removeTableRow(row.id)} disabled={tableRows.length === 1}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!isReadOnly && (
            <div className="p-4 pt-2 border-t border-slate-100 bg-slate-50/50">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full mt-2 cursor-pointer rounded-md border-1 text-slate-500 hover:text-blue-600 hover:border-blue-300 bg-white"
                onClick={() => addTableRow(tableRows.length - 1)}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Machine Row
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 3: SIGNATURES */}
      <Card className="shadow-none border border-slate-200 bg-white rounded-md overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 py-4">
          <CardTitle className="text-sm font-bold text-slate-800">Signatures & Approval</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600 uppercase">Prepared By <span className="text-destructive">*</span></Label>
              <SearchableSelect
                options={usersList}
                value={formData.preparer_ids}
                onValueChange={(val) => setFormData({...formData, preparer_ids: val})}
                placeholder="Select Preparers"
                multi={true}
                disabled={isReadOnly}
                required={true}
                className="h-9 rounded-md bg-slate-50 border-slate-200 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600 uppercase">Approved By <span className="text-destructive">*</span></Label>
              <SearchableSelect
                options={usersList}
                value={formData.approved_by_id}
                onValueChange={(val) => setFormData({...formData, approved_by_id: val})}
                placeholder="Select Approver"
                multi={false}
                disabled={isReadOnly}
                required={true}
                className="h-9 rounded-md bg-slate-50 border-slate-200 text-sm"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center bg-white border-t border-slate-100 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
             <CheckCircle className="w-4 h-4 text-emerald-500" /> Auto-saving enabled
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack} disabled={loading} className="shadow-none border-slate-200 rounded-md">Cancel</Button>
            {!isReadOnly && (
              <>
                <Button type="submit" variant="outline" onClick={() => setIntendedStatus('DRAFT')} disabled={loading} className="shadow-none border-slate-200 rounded-md bg-white">
                  {loading ? "Saving..." : "Save as Draft"}
                </Button>
                <Button type="submit" onClick={() => setIntendedStatus('PENDING')} disabled={loading} className="shadow-none bg-blue-700 hover:bg-blue-800 text-white rounded-md">
                  {loading ? (plan?.id ? "Updating..." : "Submitting...") : (plan?.id ? "Update Schedule" : "Submit Schedule")}
                </Button>
              </>
            )}
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}

// ----------------------------------------------------------------------
// MAIN EXPORT
// ----------------------------------------------------------------------
export function PreventiveMaintenance() {
  const [view, setView] = useState("list");
  const [activePlan, setActivePlan] = useState(null);

  const breadcrumb = [
    { label: "Maintenance", path: "/maintenance" },
    { label: "PM Schedule", path: "/maintenance/pm-schedule", active: view === "list" },
  ];

  if (view === "create_edit") breadcrumb.push({ label: activePlan ? `Edit ${activePlan.year}` : "Create Plan", path: "#", active: true });

  return (
    <PageContainer
      title={view === "list" ? "Preventive Maintenance Plans" : activePlan ? `Edit ${activePlan.year} Schedule` : "Create Schedule"}
      description="Manage yearly preventive maintenance schedules using the tabular matrix."
      breadcrumb={breadcrumb}
    >
      {view === "list" && (
        <ListView 
          onCreateClick={() => { setActivePlan(null); setView("create_edit"); }} 
          onEditClick={(plan) => { setActivePlan(plan); setView("create_edit"); }}
          onViewClick={(plan) => { setActivePlan(plan); setView("create_edit"); }}
        />
      )}
      {view === "create_edit" && (
        <CreateEditView 
          plan={activePlan} 
          onBack={() => { setView("list"); setActivePlan(null); }} 
          onSuccess={() => setView("list")} 
        />
      )}
    </PageContainer>
  );
}
