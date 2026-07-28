import React, { useState, useMemo } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import ProDataTable from "@/components/shared/ProDataTable";
import { DataTableRowActions } from "@/components/shared/DataTableRowActions";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Plus, Eye, ArrowLeft, Trash2, Edit, Save, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

// ----------------------------------------------------------------------
// DUMMY DATA
// ----------------------------------------------------------------------
const dummyMasterPlans = [
  { id: "PM-2026", year: "2026-2027", docNo: "F-MNT-02", revNo: "0", revDate: "04-01-2022", preparedBy: "YSP/NP/BGP", status: "Active", progress: 25 },
  { id: "PM-2025", year: "2025-2026", docNo: "F-MNT-02", revNo: "1", revDate: "04-01-2022", preparedBy: "YSP/NP/BGP", status: "Locked", progress: 100 },
];

const dummyMachinesList = [
  { label: "SAFOP LATHE (CNC-07)", value: "1" },
  { label: "ELGAMILL (UM-1)", value: "2" },
  { label: "SORAMILL FR 8000 (CNC-09)", value: "3" },
  { label: "GEMINIS 780 (CNC-08)", value: "4" },
  { label: "DORRIES VTL (VTL-02)", value: "5" },
];

// ----------------------------------------------------------------------
// 1. MASTER LIST VIEW
// ----------------------------------------------------------------------
function ListView({ onCreateClick, onEditClick, onViewClick }) {
  const [refreshKey] = useState(0);

  const fetchPlans = async ({ page, limit, search }) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filteredData = [...dummyMasterPlans];
        if (search) {
          const lowerSearch = search.toLowerCase();
          filteredData = filteredData.filter(item => 
            item.year.toLowerCase().includes(lowerSearch) || 
            item.id.toLowerCase().includes(lowerSearch)
          );
        }
        resolve({
          data: filteredData.slice((page - 1) * limit, page * limit),
          meta: { total: filteredData.length, page, totalPages: Math.ceil(filteredData.length / limit) }
        });
      }, 400);
    });
  };

  const columns = useMemo(() => [
    {
      id: "id",
      accessorKey: "id",
      header: "Plan ID",
      cell: (row) => <span className="font-bold text-slate-700">{row.id}</span>
    },
    {
      id: "year",
      accessorKey: "year",
      header: "Plan Year",
      cell: (row) => <span className="font-semibold text-slate-900">{row.year}</span>
    },
    { id: "docNo", accessorKey: "docNo", header: "Doc No" },
    { id: "revNo", accessorKey: "revNo", header: "Rev. No", cell: (row) => <Badge variant="outline" className="bg-slate-50">{row.revNo || "0"}</Badge> },
    { id: "revDate", accessorKey: "revDate", header: "Rev Date" },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant="outline" className={row.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}>
          {row.status}
        </Badge>
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <DataTableRowActions 
          actions={[
            { label: row.status === "Active" ? "Edit Schedule" : "View Schedule", icon: row.status === "Active" ? Edit : Eye, onClick: () => onEditClick(row) }
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
    </div>
  );
}

// ----------------------------------------------------------------------
// 2. CREATE / EDIT PLAN VIEW (TABULAR FORM)
// ----------------------------------------------------------------------
function CreateEditView({ plan, onBack, onSuccess }) {
  const [formData, setFormData] = useState({
    year: plan?.year || "",
    docNo: plan?.docNo || "F-MNT-02",
    revDate: plan?.revDate || "2022-01-04",
    revNo: plan?.revNo || "0",
    preparedBy: plan?.preparedBy || "YSP/NP/BGP",
    approvedBy: "MBJ"
  });

  // Default row structure based on screenshot
  const [tableRows, setTableRows] = useState([
    { id: 1, machineId: "1", q1Plan: "2026-06-01", q1Done: "2026-06-08", q2Plan: "2026-09-01", q2Done: "", q3Plan: "2026-12-01", q3Done: "", q4Plan: "2027-03-01", q4Done: "" },
    { id: 2, machineId: "2", q1Plan: "2026-06-02", q1Done: "2026-06-20", q2Plan: "2026-09-02", q2Done: "", q3Plan: "2026-12-02", q3Done: "", q4Plan: "2027-03-02", q4Done: "" },
  ]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRowChange = (id, field, value) => {
    setTableRows(
      tableRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const addTableRow = (index) => {
    const newRow = {
      id: Date.now(),
      machineId: "",
      q1Plan: "", q1Done: "",
      q2Plan: "", q2Done: "",
      q3Plan: "", q3Done: "",
      q4Plan: "", q4Done: "",
    };
    const newRows = [...tableRows];
    newRows.splice(index + 1, 0, newRow);
    setTableRows(newRows);
  };

  const removeTableRow = (id) => {
    if (tableRows.length > 1) {
      setTableRows(tableRows.filter((row) => row.id !== id));
    }
  };

  const isReadOnly = plan?.status === "Locked";

  // Reusable Date Cell for the Matrix
  const DateCell = ({ planValue, doneValue, onPlanChange, onDoneChange, disabled }) => {
    const isNA = doneValue === "N/A";
    
    return (
      <div className="flex gap-1 min-w-[220px]">
        <div className="flex-1 space-y-1">
          <Input 
            type="date" 
            value={planValue} 
            onChange={(e) => onPlanChange(e.target.value)}
            disabled={disabled}
            className="h-8 text-xs bg-slate-50 border-slate-200" 
            title="Plan Date"
          />
        </div>
        <div className="flex-1 space-y-1 relative group">
          {isNA ? (
            <div className="h-8 flex items-center justify-center bg-amber-50 border border-amber-200 rounded-md cursor-pointer" onClick={() => !disabled && onDoneChange("")}>
              <span className="text-[10px] font-bold text-amber-600">NOT AV</span>
            </div>
          ) : (
            <Input 
              type="date" 
              value={doneValue} 
              onChange={(e) => onDoneChange(e.target.value)}
              disabled={disabled}
              className="h-8 text-xs font-semibold text-emerald-700 bg-white" 
              title="Done Date"
            />
          )}
          
          {/* Quick toggle for NA */}
          {!disabled && !isNA && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[9px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap z-50 cursor-pointer" onClick={() => onDoneChange("N/A")}>
              Mark N/A
            </div>
          )}
        </div>
      </div>
    );
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
        <CardHeader className="bg-white border-b border-slate-100 pb-4">
          <CardTitle className="text-lg font-bold text-slate-800">
            {plan ? `Edit PM Schedule ${plan.year}` : "Create New PM Schedule"}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Manage machine maintenance plans and actual done dates.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Metadata Section */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-6 bg-slate-50/50 border-b border-slate-100">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600 uppercase">Plan Year</Label>
              <Select value={formData.year} onValueChange={(val) => setFormData({...formData, year: val})} disabled={isReadOnly}>
                <SelectTrigger className="h-9 text-sm bg-white"><SelectValue placeholder="Select Year" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026-2027">2026-2027</SelectItem>
                  <SelectItem value="2027-2028">2027-2028</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600 uppercase">Document No</Label>
              <Input name="docNo" value={formData.docNo} onChange={handleInputChange} disabled={isReadOnly} className="h-9 text-sm bg-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600 uppercase">Revision No</Label>
              <Input type="number" name="revNo" value={formData.revNo} onChange={handleInputChange} disabled={isReadOnly} className="h-9 text-sm bg-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600 uppercase">Revision Date</Label>
              <Input type="date" name="revDate" value={formData.revDate} onChange={handleInputChange} disabled={isReadOnly} className="h-9 text-sm bg-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600 uppercase">Prepared By</Label>
              <Input name="preparedBy" value={formData.preparedBy} onChange={handleInputChange} disabled={isReadOnly} className="h-9 text-sm bg-white" />
            </div>
          </div>

          {/* Tabular Form Section */}
          <div className="overflow-x-auto">
            <Table className="border-b border-slate-200">
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead className="w-[50px] text-center text-xs font-bold text-slate-700">Sr.No</TableHead>
                  <TableHead className="min-w-[250px] text-xs font-bold text-slate-700 border-x border-slate-200">Machine Name</TableHead>
                  <TableHead className="text-center bg-blue-50/50 border-r border-slate-200">
                    <div className="text-xs font-bold text-blue-900 mb-1">JUN_26 (Q1)</div>
                    <div className="flex justify-between px-6 text-[10px] text-blue-600 font-semibold"><span>PLAN DATE</span><span>DONE DATE</span></div>
                  </TableHead>
                  <TableHead className="text-center bg-blue-50/50 border-r border-slate-200">
                    <div className="text-xs font-bold text-blue-900 mb-1">SEP_26 (Q2)</div>
                    <div className="flex justify-between px-6 text-[10px] text-blue-600 font-semibold"><span>PLAN DATE</span><span>DONE DATE</span></div>
                  </TableHead>
                  <TableHead className="text-center bg-blue-50/50 border-r border-slate-200">
                    <div className="text-xs font-bold text-blue-900 mb-1">DEC_26 (Q3)</div>
                    <div className="flex justify-between px-6 text-[10px] text-blue-600 font-semibold"><span>PLAN DATE</span><span>DONE DATE</span></div>
                  </TableHead>
                  <TableHead className="text-center bg-blue-50/50">
                    <div className="text-xs font-bold text-blue-900 mb-1">MAR_27 (Q4)</div>
                    <div className="flex justify-between px-6 text-[10px] text-blue-600 font-semibold"><span>PLAN DATE</span><span>DONE DATE</span></div>
                  </TableHead>
                  {!isReadOnly && <TableHead className="w-[100px] text-center text-xs font-bold text-slate-700">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.map((row, index) => (
                  <TableRow key={row.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="text-center font-medium text-slate-500 text-xs">
                      {index + 1}
                    </TableCell>
                    <TableCell className="border-x border-slate-100 p-2">
                      <Select 
                        value={row.machineId} 
                        onValueChange={(val) => handleRowChange(row.id, "machineId", val)}
                        disabled={isReadOnly}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white font-semibold text-slate-800 shadow-none border-slate-200">
                          <SelectValue placeholder="Select Machine..." />
                        </SelectTrigger>
                        <SelectContent>
                          {dummyMachinesList.map(m => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    
                    {/* Q1 */}
                    <TableCell className="p-2 border-r border-slate-100 align-top">
                      <DateCell 
                        planValue={row.q1Plan} doneValue={row.q1Done}
                        onPlanChange={(val) => handleRowChange(row.id, "q1Plan", val)}
                        onDoneChange={(val) => handleRowChange(row.id, "q1Done", val)}
                        disabled={isReadOnly}
                      />
                    </TableCell>
                    
                    {/* Q2 */}
                    <TableCell className="p-2 border-r border-slate-100 align-top">
                      <DateCell 
                        planValue={row.q2Plan} doneValue={row.q2Done}
                        onPlanChange={(val) => handleRowChange(row.id, "q2Plan", val)}
                        onDoneChange={(val) => handleRowChange(row.id, "q2Done", val)}
                        disabled={isReadOnly}
                      />
                    </TableCell>
                    
                    {/* Q3 */}
                    <TableCell className="p-2 border-r border-slate-100 align-top">
                      <DateCell 
                        planValue={row.q3Plan} doneValue={row.q3Done}
                        onPlanChange={(val) => handleRowChange(row.id, "q3Plan", val)}
                        onDoneChange={(val) => handleRowChange(row.id, "q3Done", val)}
                        disabled={isReadOnly}
                      />
                    </TableCell>

                    {/* Q4 */}
                    <TableCell className="p-2 align-top">
                      <DateCell 
                        planValue={row.q4Plan} doneValue={row.q4Done}
                        onPlanChange={(val) => handleRowChange(row.id, "q4Plan", val)}
                        onDoneChange={(val) => handleRowChange(row.id, "q4Done", val)}
                        disabled={isReadOnly}
                      />
                    </TableCell>

                    {!isReadOnly && (
                      <TableCell className="p-2 align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => addTableRow(index)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeTableRow(row.id)} disabled={tableRows.length === 1}>
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
            <div className="p-4 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full mt-2 cursor-pointer"
                onClick={() => addTableRow(tableRows.length - 1)}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Machine Row
              </Button>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between bg-white border-t border-slate-100 p-6">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
             <CheckCircle className="w-4 h-4 text-emerald-500" /> Auto-saving enabled
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack} className="shadow-none border-slate-200">Cancel</Button>
            {!isReadOnly && (
              <Button onClick={onSuccess} className="shadow-none bg-blue-700 hover:bg-blue-800 text-white">
                Save PM Schedule
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}


// ----------------------------------------------------------------------
// MAIN EXPORT
// ----------------------------------------------------------------------
export function PreventiveMaintenance() {
  const [view, setView] = useState("list"); // list, create_edit
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
