import React, { useState, useMemo } from "react"
import { PageContainer } from "@/components/layout/PageContainer"
import ProDataTable from "@/components/shared/ProDataTable"
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"
import { Plus, Edit2, Trash2, ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { SearchableSelect } from "@/components/shared/SearchableSelect"
import apiClient from "@/api/api.client"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import { CheckCircle2, XCircle } from "lucide-react"
import { ImportReviewDialog } from "@/components/shared/ImportReviewDialog"

function ListView({ onCreateClick }) {
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [importReview, setImportReview] = useState({ isOpen: false, data: [], summary: {} });
  const [isImporting, setIsImporting] = useState(false);

  const fetchData = async ({ page, limit, search, columnFilters }) => {
    try {
      const response = await apiClient.get('/api/maintenance/machines', {
        page,
        limit,
        search
      });
      // Map the snake_case data to camelCase for the frontend table
      const mappedData = response.data.map(m => ({
        ...m,
        machineNumber: m.machine_number,
        machineName: m.machine_name,
        modelNo: m.model_no,
        serialNumber: m.serial_number,
        mfgYear: m.mfg_year,
      }));
      return { data: mappedData, meta: response.meta };
    } catch (error) {
      toast.error(error.message || "Failed to fetch machines");
      return { data: [], meta: { total: 0, page: 1, totalPages: 1 } };
    }
  };

  const columns = useMemo(() => [
    {
      id: "machineNumber",
      accessorKey: "machineNumber",
      header: "Machine Number",
      filterType: "text",
      width: "120px"
    },
    {
      id: "machineName",
      accessorKey: "machineName",
      header: "Machine Name",
      filterType: "text",
      width: "250px"
    },
    {
      id: "type",
      accessorKey: "type",
      header: "Type",
      filterType: "select",
      filterOptions: [
        { label: "CNC", value: "CNC" },
        { label: "Lathe", value: "Lathe" },
        { label: "Rotator", value: "Rotator" },
      ],
      width: "120px"
    },
    {
      id: "modelNo",
      accessorKey: "modelNo",
      header: "Model No",
      filterType: "text",
      width: "150px"
    },
    {
      id: "serialNumber",
      accessorKey: "serialNumber",
      header: "Serial Number",
      filterType: "text",
      width: "150px"
    },
    {
      id: "make",
      accessorKey: "make",
      header: "Make",
      filterType: "text",
      width: "150px"
    },
    {
      id: "mfgYear",
      accessorKey: "mfgYear",
      header: "Mfg. Year",
      filterType: "text",
      width: "100px"
    },
    {
      id: "specifications",
      accessorKey: "specifications",
      header: "Specifications",
      filterType: "text",
      width: "200px"
    },
    {
      id: "actions",
      header: "Actions",
      width: "80px",
      cell: (row) => (
        <DataTableRowActions
          actions={[
            { label: "Edit Machine", icon: Edit2, onClick: () => console.log("Edit", row.id) },
            { type: "separator" },
            {
              label: "Delete Machine", icon: Trash2, onClick: async () => {
                if (window.confirm("Are you sure you want to delete this machine?")) {
                  try {
                    await apiClient.delete(`/api/maintenance/machines/${row.id}`);
                    toast.success("Machine deleted successfully");
                    setRefreshKey(prev => prev + 1);
                  } catch (error) {
                    toast.error(error.message || "Failed to delete machine");
                  }
                }
              }, color: "danger"
            },
          ]}
        />
      )
    }
  ], []);

  const handleImport = async (file) => {
    if (!file) return;

    const REQUIRED_HEADERS = [
      "Machine Number",
      "Machine Name",
      "Type",
      "Model No",
      "Serial Number",
      "Make",
      "Mfg Year",
      "Specifications"
    ];

    const reader = new FileReader();
    reader.onload = (e) => {
      const bstr = e.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const rawData = XLSX.utils.sheet_to_json(ws);

      if (rawData.length > 0) {
        const fileHeaders = Object.keys(rawData[0]);
        const missingHeaders = REQUIRED_HEADERS.filter(h => !fileHeaders.includes(h));
        if (missingHeaders.length > 0) {
          console.warn(`Excel missing columns: ${missingHeaders.join(", ")}`);
        }
      }

      const seenMachineNumbers = new Set();

      const validatedRows = rawData.map((row, index) => {
        const machineNumber = String(row["Machine Number"] || "").trim();
        const machineName = String(row["Machine Name"] || "").trim();
        const type = String(row["Type"] || "").trim() || "Other";
        
        const errors = [];
        if (!machineNumber) errors.push("Machine Number is required");
        else {
          if (seenMachineNumbers.has(machineNumber.toLowerCase())) {
            errors.push("Duplicate Machine Number in file");
          } else {
            seenMachineNumbers.add(machineNumber.toLowerCase());
          }
        }
        if (!machineName) errors.push("Machine Name is required");

        return {
          rowNo: index + 1,
          machineNumber,
          machineName,
          type,
          modelNo: String(row["Model No"] || "").trim(),
          serialNumber: String(row["Serial Number"] || "").trim(),
          make: String(row["Make"] || "").trim(),
          mfgYear: String(row["Mfg Year"] || "").trim(),
          specifications: String(row["Specifications"] || "").trim(),
          status: errors.length === 0 ? "valid" : "error",
          message: errors.length === 0 ? "Ready to import" : errors.join(" | ")
        };
      });

      setImportReview({
        isOpen: true,
        data: validatedRows,
        summary: {
          total: validatedRows.length,
          valid: validatedRows.filter(r => r.status === 'valid').length,
          error: validatedRows.filter(r => r.status === 'error').length
        }
      });
    };
    reader.readAsBinaryString(file);
  };

  const finalizeImport = async () => {
    const validRows = importReview.data.filter(r => r.status === 'valid');
    if (validRows.length === 0) return;

    setIsImporting(true);

    try {
      const response = await apiClient.post("/api/maintenance/machines/bulk", { machines: validRows });
      toast.success(`Successfully imported ${response.count || validRows.length} machines`);
      setImportReview({ isOpen: false, data: [], summary: {} });
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error("Error importing machines:", err);
      toast.error(err.message || "Failed to import machines");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "Machine Number", "Machine Name", "Type", "Model No", 
      "Serial Number", "Make", "Mfg Year", "Specifications"
    ];
    
    const sampleData = [
      headers,
      ["M-1234", "EXAMPLE LATHE", "Lathe", "EX-99", "SN-0001", "SHRENO", "2023", "Swing=500mm"]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Machines");
    XLSX.writeFile(wb, "Machine_Master_Template.xlsx");
    toast.info("Downloading template...");
  };

  return (
    <div className="h-full flex flex-col pt-4">
      <ProDataTable
        columns={columns}
        fetchData={fetchData}
        refreshKey={refreshKey}
        onAdd={onCreateClick}
        onAddTooltip="Add Machine Manually"
        onImport={handleImport}
        onDownloadTemplate={handleDownloadTemplate}
        globalSearchPlaceholder="Search machines by name or number..."
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        initialStickyColumns={["machineNumber"]}
      />

      <ImportReviewDialog
        open={importReview.isOpen}
        onOpenChange={(val) => setImportReview(prev => ({ ...prev, isOpen: val }))}
        title="Review Import"
        description="Valid rows will be directly imported into the system."
        data={importReview.data}
        columns={[
          { header: "Row", key: "rowNo", minWidth: "60px" },
          { header: "Machine No", key: "machineNumber", minWidth: "120px" },
          { header: "Machine Name", key: "machineName", minWidth: "150px" },
          { header: "Type", key: "type", minWidth: "100px" },
        ]}
        onConfirm={finalizeImport}
        isImporting={isImporting}
        totalCount={importReview.summary.total}
        validCount={importReview.summary.valid}
        errorCount={importReview.summary.error}
        confirmLabel={`Import ${importReview.summary.valid} Machines`}
      />
    </div>
  );
}

function CreateView({ onBack, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [machines, setMachines] = useState([
    {
      id: 1,
      machineNumber: "",
      machineName: "",
      type: "",
      modelNo: "",
      serialNumber: "",
      make: "",
      mfgYear: "",
      specifications: "",
    }
  ]);

  const handleMachineChange = (id, field, value) => {
    setMachines((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      )
    )
  };

  const addMachine = () => {
    const newId = Math.max(...machines.map((l) => l.id), 0) + 1
    setMachines((prev) => [
      ...prev,
      {
        id: newId,
        machineNumber: "",
        machineName: "",
        type: "",
        modelNo: "",
        serialNumber: "",
        make: "",
        mfgYear: "",
        specifications: "",
      },
    ])
  };

  const removeMachine = (id) => {
    if (machines.length > 1) {
      setMachines((prev) => prev.filter((m) => m.id !== id))
    }
  };

  const handleSubmit = async () => {
    // Basic validation
    const invalid = machines.some(m => !m.machineNumber || !m.machineName || !m.type);
    if (invalid) {
      toast.error("Please fill all mandatory fields (Number, Name, Type) for all rows");
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post("/api/maintenance/machines/bulk", { machines });
      toast.success("Machines created successfully");
      onSuccess();
    } catch (error) {
      toast.error(error.message || "Failed to create machines");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pt-2 pb-6">
      <div className="flex items-center justify-end shrink-0">
        <Button variant="outline" onClick={onBack} className="shadow-none h-9 text-slate-700 border-slate-200">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200 shrink-0">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Machines</CardTitle>
              <div className="text-xs text-slate-500 mt-1">Add one or more machines</div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addMachine} className="shadow-none bg-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Machine
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {machines.map((machine, index) => (
            <div key={machine.id} className="p-4 border border-slate-200 rounded-lg space-y-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-800 text-sm">Machine {index + 1}</h3>
                {machines.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeMachine(machine.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

                {/* Machine Number */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Machine Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. M-001"
                    value={machine.machineNumber}
                    onChange={(e) => handleMachineChange(machine.id, "machineNumber", e.target.value)}
                    className="bg-slate-50/50 focus-visible:ring-1 focus-visible:ring-blue-500 shadow-none"
                  />
                </div>

                {/* Machine Name */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Machine Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. SORAMILL FR 8000"
                    value={machine.machineName}
                    onChange={(e) => handleMachineChange(machine.id, "machineName", e.target.value)}
                    className="bg-slate-50/50 focus-visible:ring-1 focus-visible:ring-blue-500 shadow-none"
                  />
                </div>

                {/* Type */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={[
                      { label: "CNC", value: "CNC" },
                      { label: "Lathe", value: "Lathe" },
                      { label: "Rotator", value: "Rotator" },
                      { label: "Drill", value: "Drill" },
                      { label: "Milling", value: "Milling" },
                    ]}
                    value={machine.type}
                    onValueChange={(val) => handleMachineChange(machine.id, "type", val)}
                    placeholder="Select Type"
                    className="bg-slate-50/50 shadow-none border-slate-200"
                  />
                </div>

                {/* Model No */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Model No
                  </label>
                  <Input
                    placeholder="e.g. FR-8000"
                    value={machine.modelNo}
                    onChange={(e) => handleMachineChange(machine.id, "modelNo", e.target.value)}
                    className="bg-slate-50/50 focus-visible:ring-1 focus-visible:ring-blue-500 shadow-none"
                  />
                </div>

                {/* Serial Number */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Serial Number
                  </label>
                  <Input
                    placeholder="e.g. SN-12345"
                    value={machine.serialNumber}
                    onChange={(e) => handleMachineChange(machine.id, "serialNumber", e.target.value)}
                    className="bg-slate-50/50 focus-visible:ring-1 focus-visible:ring-blue-500 shadow-none"
                  />
                </div>

                {/* Make */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Make
                  </label>
                  <Input
                    placeholder="e.g. SORAMILL"
                    value={machine.make}
                    onChange={(e) => handleMachineChange(machine.id, "make", e.target.value)}
                    className="bg-slate-50/50 focus-visible:ring-1 focus-visible:ring-blue-500 shadow-none"
                  />
                </div>

                {/* Mfg. Year */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Mfg. Year
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 2015"
                    value={machine.mfgYear}
                    onChange={(e) => handleMachineChange(machine.id, "mfgYear", e.target.value)}
                    className="bg-slate-50/50 focus-visible:ring-1 focus-visible:ring-blue-500 shadow-none"
                  />
                </div>

                {/* Specifications */}
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Specifications
                  </label>
                  <Input
                    placeholder="e.g. X=8000, Y=3000, Z=1500"
                    value={machine.specifications}
                    onChange={(e) => handleMachineChange(machine.id, "specifications", e.target.value)}
                    className="bg-slate-50/50 focus-visible:ring-1 focus-visible:ring-blue-500 shadow-none"
                  />
                </div>

              </div>
            </div>
          ))}
          <div className="flex justify-start pt-2">
            <Button type="button" variant="outline" size="sm" onClick={addMachine} className="shadow-none bg-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Machine
            </Button>
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3 py-4">
          <Button variant="outline" onClick={onBack} className="shadow-none">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-slate-900 text-white hover:bg-slate-800 shadow-none">
            {isSubmitting ? "Saving..." : `Create Machine${machines.length > 1 ? "s" : ""}`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export function MachineMaster() {
  const [view, setView] = useState("list"); // "list" | "create"

  return (
    <PageContainer
      title={view === "list" ? "Machine Master" : ""}
      description={view === "list" ? "Manage factory machines and equipment for maintenance." : ""}
      breadcrumb={[
        { label: "Maintenance", path: "/maintenance" },
        { label: "Machine Master", path: "/maintenance/machines" },
      ]}
    >
      {view === "list" ? (
        <ListView
          onCreateClick={() => setView("create")}
        />
      ) : (
        <CreateView
          onBack={() => setView("list")}
          onSuccess={() => setView("list")}
        />
      )}
    </PageContainer>
  );
}
