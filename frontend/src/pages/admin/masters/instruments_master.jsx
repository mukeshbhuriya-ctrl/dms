import { useState, useCallback } from "react";
import ProDataTable from "@/components/shared/ProDataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { getMockInstruments, saveMockInstruments } from "@/data/mockInstruments";
import { ModuleHeader } from "@/components/shared/ModuleHeader";

export default function InstrumentsMaster() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [formData, setFormData] = useState({
    name: "",
    id_no: "",
    due_date: ""
  });

  const fetchData = useCallback(async ({ page, limit, search }) => {
    let data = getMockInstruments();
    
    if (search) {
      const s = search.toLowerCase();
      data = data.filter(i => 
        i.name.toLowerCase().includes(s) || 
        i.id_no.toLowerCase().includes(s)
      );
    }
    
    const total = data.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const paginatedData = data.slice(start, start + limit);

    return {
      data: paginatedData,
      meta: { total, page, totalPages }
    };
  }, []);

  const handleOpenDialog = (instrument = null) => {
    if (instrument && instrument.id) {
      setEditingId(instrument.id);
      setFormData({
        name: instrument.name,
        id_no: instrument.id_no,
        due_date: instrument.due_date
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", id_no: "", due_date: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.id_no || !formData.due_date) return;
    
    let instruments = getMockInstruments();
    let updated;
    if (editingId) {
      updated = instruments.map(i => i.id === editingId ? { ...formData, id: editingId } : i);
    } else {
      const newId = instruments.length > 0 ? Math.max(...instruments.map(i => i.id)) + 1 : 1;
      updated = [...instruments, { ...formData, id: newId }];
    }
    
    saveMockInstruments(updated);
    setRefreshTrigger(prev => prev + 1);
    setIsDialogOpen(false);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this instrument?")) {
      let instruments = getMockInstruments();
      const updated = instruments.filter(i => i.id !== id);
      saveMockInstruments(updated);
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const columns = [
    { accessorKey: "name", header: "Instrument Name" },
    { accessorKey: "id_no", header: "ID No. / SR No." },
    { accessorKey: "due_date", header: "Due Date" },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleOpenDialog(row)}>Edit</Button>
          <Button variant="destructive" size="sm" onClick={() => handleDelete(row.id)}>Delete</Button>
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50">
      <ModuleHeader 
        title="Instrument Details" 
        description="Manage instruments and their calibration due dates." 
      />

      <main className="flex-1 overflow-auto p-6 flex flex-col">
        <ProDataTable 
          columns={columns}
          fetchData={fetchData}
          onAdd={() => handleOpenDialog()}
          onAddTooltip="Add Instrument"
          globalSearchPlaceholder="Search instruments..."
          refreshKey={refreshTrigger}
        />
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Instrument" : "Add Instrument"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Instrument Name</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="e.g., Vernier Calipers" 
              />
            </div>
            <div className="space-y-2">
              <Label>ID No. / SR No.</Label>
              <Input 
                value={formData.id_no} 
                onChange={e => setFormData({...formData, id_no: e.target.value})} 
                placeholder="e.g., VC-001" 
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input 
                type="date"
                value={formData.due_date} 
                onChange={e => setFormData({...formData, due_date: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} className="bg-[#E46B00] hover:bg-[#CC6000] text-black font-semibold">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
