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

function ListView({ onCreateClick, data, setData }) {
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRows, setSelectedRows] = useState(new Set());

  // Dummy fetch function for ProDataTable
  const fetchData = async ({ page, limit, search, columnFilters }) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filteredData = [...data];
        
        if (search) {
          const lowerSearch = search.toLowerCase();
          filteredData = filteredData.filter(item => 
            item.machineName.toLowerCase().includes(lowerSearch) || 
            item.machineNumber.toLowerCase().includes(lowerSearch)
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
            { label: "Delete Machine", icon: Trash2, onClick: () => {
                const newData = data.filter(d => d.id !== row.id);
                setData(newData);
                setRefreshKey(prev => prev + 1);
            }, color: "danger" },
          ]}
        />
      )
    }
  ], [data, setData]);

  const handleImport = (file) => {
    console.log("Importing file:", file.name);
  };

  const handleDownloadTemplate = () => {
    console.log("Download template");
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
    </div>
  );
}

function CreateView({ onBack, onSuccess, data, setData }) {
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

  const handleSubmit = () => {
    console.log("Submitting new machines:", machines);
    const newMachinesData = machines.map((m, index) => ({
      ...m,
      id: `M${Date.now()}_${index}` // Using dummy id generation
    }));
    setData([...data, ...newMachinesData]);
    onSuccess();
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
          <Button onClick={handleSubmit} className="bg-slate-900 text-white hover:bg-slate-800 shadow-none">
            Create Machine{machines.length > 1 ? "s" : ""}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export function MachineMaster() {
  const [view, setView] = useState("list"); // "list" | "create"
  
  // Lifted state so newly created items persist across views
  const [data, setData] = useState([
    {
      id: "M001",
      machineNumber: "M-001",
      machineName: "SORAMILL FR 8000 CNC-9",
      type: "CNC",
      modelNo: "FR-8000",
      serialNumber: "SN-12345",
      make: "SORAMILL",
      mfgYear: "2015",
      specifications: "X=8000, Y=3000, Z=1500",
    },
    {
      id: "M002",
      machineNumber: "M-002",
      machineName: "MARUTI LATHE",
      type: "Lathe",
      modelNo: "ML-500",
      serialNumber: "SN-67890",
      make: "MARUTI",
      mfgYear: "2018",
      specifications: "Swing=500mm, Length=1500mm",
    },
    {
      id: "M003",
      machineNumber: "M-003",
      machineName: "TANK ROTATOR",
      type: "Rotator",
      modelNo: "TR-27",
      serialNumber: "SN-11223",
      make: "LOCAL",
      mfgYear: "2010",
      specifications: "Capacity=20T",
    },
  ]);

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
          data={data}
          setData={setData}
        />
      ) : (
        <CreateView 
          onBack={() => setView("list")} 
          onSuccess={() => setView("list")}
          data={data}
          setData={setData}
        />
      )}
    </PageContainer>
  );
}
