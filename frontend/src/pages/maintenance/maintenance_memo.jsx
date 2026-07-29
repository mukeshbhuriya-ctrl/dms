import React, { useState, useMemo, useEffect } from "react"
import { format } from "date-fns"
import apiClient from "@/api/api.client"
import { toast } from "react-toastify"
import { useAuth } from "@/context/AuthContext"
import { PageContainer } from "@/components/layout/PageContainer"
import ProDataTable from "@/components/shared/ProDataTable"
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"
import { Plus, Eye, Paperclip, MessageSquare, ArrowLeft, UploadCloud, Clock, CheckCircle, AlertCircle, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { X, FileText } from "lucide-react"
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
function ListView({ onInitiateClick, onViewClick, onEditClick, refreshListKey }) {
  const { user, roles } = useAuth();
  const [selectedRows, setSelectedRows] = useState(new Set());

  const fetchData = async ({ page, limit, search }) => {
    try {
      const response = await apiClient.get('/api/maintenance/memos/list', { page, limit, search });
      return response;
    } catch (error) {
      toast.error(error.message || "Failed to fetch memos");
      return { data: [], meta: { total: 0, page: 1, totalPages: 1 } };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "DRAFT": return "bg-slate-100 text-slate-500 border-slate-200";
      case "OPEN": return "bg-purple-100 text-purple-700 border-purple-200";
      case "UNDER BREAKDOWN": return "bg-amber-100 text-amber-700 border-amber-200";
      case "OK": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default: return "bg-slate-100 text-slate-700";
    }
  }

  const columns = useMemo(() => [
    {
      id: "id",
      accessorKey: "memo_no",
      header: "Memo No",
      width: "120px",
      cell: (row) => <span className="font-bold text-slate-700">{row.memo_no}</span>
    },
    {
      id: "date",
      accessorKey: "date",
      header: "Date",
      filterType: "date",
      width: "140px",
      cell: (row) => row.date ? new Date(row.date).toLocaleDateString("en-GB", { day: '2-digit', month: 'long', year: 'numeric' }) : "-"
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
      accessorKey: "creator.name",
      header: "Inform By",
      filterType: "text",
      width: "100px"
    },
    {
      id: "machineName",
      accessorKey: "machine_name",
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
        <div className="flex items-center gap-2 max-w-[260px]">
          <span className="truncate text-slate-600 font-medium flex-1">
            {row.fault}
          </span>
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
        { label: "Draft", value: "DRAFT" },
        { label: "Open", value: "OPEN" },
        { label: "Under Breakdown", value: "UNDER BREAKDOWN" },
        { label: "OK", value: "OK" },
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
        const isAdmin = roles?.includes('ADMIN');
        const isProduction = isAdmin || row.creator?.id === user?.id || roles?.includes('PRODUCTION_ENGINEER') || user?.employee_group?.group_type === 'PRODUCTION' || String(user?.department).toUpperCase().includes('PRODUCTION');
        const isMaintenance = isAdmin || roles?.includes('MAINTENANCE') || user?.employee_group?.group_type === 'MAINTENANCE' || String(user?.department).toUpperCase().includes('MAINTENANCE');

        // Different label based on status and user role
        const isMaintenanceAction = (row.status === "OPEN" || row.status === "UNDER BREAKDOWN") && isMaintenance;
        const canEdit = (row.status === "DRAFT" || row.status === "OPEN") && isProduction;
        const canVerify = row.status === "OK" && isProduction;
        
        const rowActions = [];
        
        // Unconditionally add View Memo for everyone to see the base issue
        rowActions.push({
          label: "View Memo",
          icon: Eye,
          onClick: () => onViewClick(row, "VIEW_INITIATE_READONLY")
        });

        // If resolution exists or is in progress, allow viewing it
        if (row.status === "UNDER BREAKDOWN" || row.status === "OK") {
          rowActions.push({
            label: "View Resolution",
            icon: Eye,
            onClick: () => onViewClick(row, "VIEW_RESOLUTION_READONLY")
          });
        }
        
        if (canEdit) {
          rowActions.push({ type: "separator" });
          rowActions.push({
            label: "Edit Memo",
            icon: Pencil,
            onClick: () => onEditClick(row)
          });
        }
        
        if (isMaintenanceAction) {
          rowActions.push({ type: "separator" });
          rowActions.push({
            label: "Resolve Memo",
            icon: Clock,
            onClick: () => onViewClick(row, "RESOLVE")
          });
        } else if (canVerify) {
          rowActions.push({ type: "separator" });
          rowActions.push({
            label: row.production_remarks ? "Update Remarks" : "Add Remarks",
            icon: MessageSquare,
            onClick: () => onViewClick(row, "VERIFY")
          });
        }

        return (
          <DataTableRowActions actions={rowActions} />
        )
      }
    }
  ], [onViewClick, user]);

  return (
    <div className="h-full flex flex-col pt-4">
      <ProDataTable
        columns={columns}
        fetchData={fetchData}
        refreshKey={refreshListKey}
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
function InitiateMemoView({ onBack, onSuccess, initialData, isReadOnly = false }) {
  const { user } = useAuth();
  const [machines, setMachines] = useState([]);
  const [groups, setGroups] = useState([]);
  const [formData, setFormData] = useState(() => {
    if (initialData) {
      return {
        ...initialData,
        date: initialData.date ? (typeof initialData.date === 'string' ? initialData.date.split('T')[0] : new Date(initialData.date).toISOString().split('T')[0]) : ''
      };
    }
    return {
      date: new Date().toISOString().split('T')[0],
      shift: "",
      production_group_id: "",
      maintenance_group_id: "",
      machine_id: "",
      machine_name: "",
      fault: ""
    };
  });
  
  const [attachments, setAttachments] = useState(() => {
    if (initialData?.attachments) {
      return initialData.attachments.map(att => ({
        id: att.id,
        name: att.original_filename,
        size: att.file_size ? (att.file_size / 1024).toFixed(2) + " KB" : "-",
        type: att.mime_type,
        uploadedAt: new Date(att.createdAt).toLocaleString(),
        url: att.file_url,
        isNew: false
      }));
    }
    return [];
  });
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState([]);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState(null);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const mRes = await apiClient.get('/api/maintenance/machines', { fetchAll: true });
        if (mRes.data) setMachines(mRes.data);

        const gRes = await apiClient.get('/api/employee-groups', { limit: 1000 });
        if (gRes.data) {
          setGroups(gRes.data);
          if (!initialData) {
            const myProdGroup = gRes.data.find(g => g.group_type === 'PRODUCTION' && g.users?.some(u => u.user.id === user?.id));
            if (myProdGroup) {
              setFormData(prev => ({ ...prev, production_group_id: myProdGroup.id }));
            }
          }
        }
      } catch (err) {
        toast.error("Failed to load dropdowns");
      }
    };
    fetchDropdowns();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    const newAttachments = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: (file.size / 1024).toFixed(2) + " KB",
      type: file.type,
      uploadedAt: new Date().toLocaleString(),
      file: file,
      url: URL.createObjectURL(file),
      isNew: true
    }))
    setAttachments(prev => [...prev, ...newAttachments])
  }

  const removeAttachment = (id, isNew) => {
    if (!isNew) {
      setDeletedAttachmentIds(prev => [...prev, id]);
    }
    setAttachments(prev => {
      const fileToRemove = prev.find(a => a.id === id);
      if (fileToRemove && fileToRemove.isNew && fileToRemove.url) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      return prev.filter(a => a.id !== id);
    })
  }

  const handleSave = async (status) => {
    const formDataToSend = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key] !== undefined && formData[key] !== null) {
          formDataToSend.append(key, formData[key]);
      }
    });
    formDataToSend.set('status', status);

    if (deletedAttachmentIds.length > 0) {
        formDataToSend.append('deletedAttachmentIds', JSON.stringify(deletedAttachmentIds));
    }

    const newFiles = attachments.filter(a => a.isNew);
    newFiles.forEach(fileObj => {
        formDataToSend.append('files', fileObj.file);
    });
    
    const savePromise = initialData 
        ? apiClient.put(`/api/maintenance/memos/update/${initialData.id}`, formDataToSend)
        : apiClient.post('/api/maintenance/memos/initiate', formDataToSend);

    savePromise
        .then((res) => {
            toast.success(res?.message || `Memo ${initialData ? 'updated' : 'created'} successfully!`);
            onSuccess();
        })
        .catch((err) => {
            toast.error(err?.message || 'Failed to process request.');
        });
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
          <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{initialData ? "Edit Maintenance Memo" : "Initiate Maintenance Memo"}</CardTitle>
          <CardDescription className="text-xs">Production department will fill out the fault statement to notify maintenance.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Machine Name <span className="text-red-500">*</span></label>
              <SearchableSelect
                options={machines.map(m => ({ label: m.machine_name, value: m.id }))}
                value={formData.machine_id}
                onValueChange={(val) => { const m = machines.find(x => x.id === val); handleInputChange("machine_id", val); if(m) handleInputChange("machine_name", m.machine_name); }}
                placeholder="Select machine..."
                className="bg-slate-50/50 shadow-none"
                disabled={isReadOnly}
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
                disabled={isReadOnly}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Date <span className="text-red-500">*</span></label>
              <Input type="date" value={formData.date} onChange={(e) => handleInputChange("date", e.target.value)} disabled={isReadOnly} className="bg-slate-50/50 shadow-none" />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Fault / Problem Statement <span className="text-red-500">*</span></label>
              <Textarea 
                placeholder="Describe the issue in detail..." 
                value={formData.fault}
                onChange={(e) => handleInputChange("fault", e.target.value)}
                disabled={isReadOnly}
                className="bg-slate-50/50 shadow-none min-h-[100px] resize-y [field-sizing:fixed]"
              />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments (Optional)
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="memo-attachments"
                  className="hidden"
                  multiple
                  onChange={handleFileChange}
                />
                
                {attachments.length > 0 ? (
                  <div className="border rounded-md divide-y overflow-hidden">
                    {attachments.map((file) => (
                      <div key={file.id} className="flex flex-col">
                        <div
                          className={`flex items-center justify-between p-3 transition-colors cursor-pointer ${selectedPreviewFile === file
                              ? "bg-primary/5 border-b"
                              : "bg-slate-50 hover:bg-slate-100"
                            }`}
                          onClick={() => setSelectedPreviewFile(selectedPreviewFile === file ? null : file)}
                        >
                          <div className="flex items-center gap-3 overflow-hidden flex-1">
                            <FileText className="h-5 w-5 text-blue-500 shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium truncate text-slate-700">{file.name}</span>
                              <span className="text-[10px] text-slate-400">{file.size} • {file.uploadedAt}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedPreviewFile === file ? (
                              <span className="text-xs text-primary font-medium mr-2">Close Preview</span>
                            ) : (
                              <span className="text-xs text-slate-500 font-medium mr-2">Click to Preview</span>
                            )}
                            {!isReadOnly && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0 z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (selectedPreviewFile === file) setSelectedPreviewFile(null);
                                  removeAttachment(file.id, file.isNew)
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {selectedPreviewFile === file && file.url && (
                          <div className="w-full h-[600px] animate-in slide-in-from-top-2 fade-in duration-300">
                            <iframe
                              src={file.url}
                              className="w-full h-full border-0 bg-white"
                              title="Document Preview"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                    {!isReadOnly && (
                      <div className="p-3 bg-slate-50 border-t flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50"
                          onClick={() => document.getElementById('memo-attachments').click()}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add More Files
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  !isReadOnly ? (
                    <div
                      className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => document.getElementById('memo-attachments').click()}
                    >
                      <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3">
                        <UploadCloud className="h-6 w-6 text-slate-400" />
                      </div>
                      <span className="text-sm font-medium text-slate-600">Click to upload or drag files here</span>
                      <span className="text-xs text-slate-400 mt-1">PDF, JPG, PNG up to 10MB each</span>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-slate-500 border border-dashed rounded-md bg-slate-50/50">
                      No attachments provided.
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Inform By <span className="text-red-500">*</span></label>
              <SearchableSelect
                options={[
                  { label: user?.name || "", value: "" }
                ]}
                value=""
                onValueChange={() => {}}
                disabled={true}
                placeholder={user?.name || ""}
                className="bg-slate-100 text-slate-500 shadow-none border-dashed opacity-70 cursor-not-allowed"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Inform To <span className="text-red-500">*</span></label>
              <SearchableSelect
                options={groups.filter(g => g.group_type === 'MAINTENANCE').map(g => ({ label: g.name, value: g.id }))}
                value={formData.maintenance_group_id}
                onValueChange={(val) => handleInputChange("maintenance_group_id", val)}
                placeholder="Select Maintenance Group"
                disabled={isReadOnly}
                className="bg-slate-50/50 shadow-none border-slate-200"
                required
              />
            </div>

          </div>
        </CardContent>
        {!isReadOnly && (
          <CardFooter className="bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3 py-4">
            <Button variant="outline" onClick={onBack} className="shadow-none bg-white cursor-pointer">
              Cancel
            </Button>
            <Button variant="outline" onClick={() => handleSave("DRAFT")} className="shadow-none bg-white border-slate-200 cursor-pointer">
              Save as Draft
            </Button>
            <Button onClick={() => handleSave("OPEN")} className="bg-blue-600 text-white hover:bg-blue-700 shadow-none cursor-pointer">
              {initialData && initialData.status !== "DRAFT" ? "Save Changes" : "Submit Request"}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

// ----------------------------------------------------------------------
// 3. STAGE 2: RESOLVE MEMO VIEW (MAINTENANCE)
// ----------------------------------------------------------------------
const toLocalDatetimeStr = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  return isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd'T'HH:mm");
};

const toLocalDateStr = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  return isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd");
};

function ResolveMemoView({ onBack, onSuccess, memo, isReadOnly = false, isVerifyMode = false }) {
  const [users, setUsers] = useState([]);
  const [resolution, setResolution] = useState({
    action_taken: memo.action_taken || "",
    attended_by_id: memo.attended_by_id || "",
    activity_type: memo.activity_type || "",
    material_consumed: memo.material_consumed || false,
    received_time: memo.received_time ? toLocalDatetimeStr(memo.received_time) : (memo.createdAt ? toLocalDatetimeStr(memo.createdAt) : ""),
    attended_time: memo.attended_time ? toLocalDatetimeStr(memo.attended_time) : "",
    completion_time: memo.completion_time ? toLocalDatetimeStr(memo.completion_time) : "",
    completion_date: memo.completion_date ? toLocalDateStr(memo.completion_date) : toLocalDateStr(new Date().toISOString()),
    man_hrs_technician: memo.man_hrs_technician || "",
    man_hrs_management: memo.man_hrs_management || "",
    total_man_hrs: memo.total_man_hrs || "",
    breakdown_hrs: memo.breakdown_hrs || "",
    status: memo.status === "OPEN" ? "UNDER BREAKDOWN" : memo.status,
    maintenance_remarks: memo.maintenance_remarks || "",
  });

  const [production_remarks, setProdRemarks] = useState(memo.production_remarks || "");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await apiClient.get('/api/users/by-role/MAINTENANCE');
        if (res.data) setUsers(res.data);
      } catch (err) {
        toast.error("Failed to load users");
      }
    };
    fetchUsers();
  }, []);

  const handleResChange = (field, value) => {
    setResolution(prev => {
      const next = { ...prev, [field]: value };
      if (field === "man_hrs_technician" || field === "man_hrs_management") {
        const tech = parseFloat(next.man_hrs_technician) || 0;
        const mgt = parseFloat(next.man_hrs_management) || 0;
        next.total_man_hrs = tech + mgt;
      }
      return next;
    });
  };

  const handleUpdate = async () => {
    try {
      await apiClient.put(`/api/maintenance/memos/resolve/${memo.id}`, resolution);
      toast.success("Resolution submitted successfully");
      onSuccess();
    } catch (err) {
      toast.error(err.message || "Failed to submit resolution");
    }
  };

  return (
    <div className="flex flex-col gap-4 pt-2 pb-6 w-full">
      <div className="flex items-center justify-end shrink-0">
        <Button variant="outline" onClick={onBack} className="shadow-none h-9 text-slate-700 border-slate-200 bg-white">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List
        </Button>
      </div>

      <div className="flex flex-col gap-6 w-full">
        
        {/* Top Section: High-Density Ticket Header (Context) */}
        <div className="bg-white border border-slate-200 shadow-none rounded-none flex flex-col">
          {/* Context Header Strip */}
          <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Production Request Reference</span>
                <span className="text-sm font-bold tracking-wide">{memo.memo_no}</span>
              </div>
              <Badge variant="outline" className={`uppercase text-[10px] tracking-wide font-bold ${memo.status === 'OPEN' ? 'bg-purple-100 text-purple-700 border-purple-200' : memo.status === 'OK' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                {memo.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="text-slate-300">Date: {memo.date?.split('T')[0]}</span>
              <Badge variant="secondary" className="bg-slate-700 hover:bg-slate-700 text-slate-100 border-none uppercase tracking-widest text-[10px]">
                Shift {memo.shift}
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* Metadata (Left) */}
            <div className="p-6 lg:col-span-1 flex flex-col gap-6">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Affected Machine</div>
                <div className="text-sm font-bold text-slate-900 break-words">{memo.machine_name}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Inform By</div>
                  <div className="text-sm font-semibold text-slate-800 break-words">{memo.creator?.name}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Inform To</div>
                  <div className="text-sm font-semibold text-slate-800 break-words">{memo.maintenance_group?.name || "Maintenance"}</div>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Paperclip className="h-3 w-3" /> Attachments
                </div>
                <div className="flex flex-col gap-2">
                  {memo.attachments && memo.attachments.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {memo.attachments.map(att => (
                        <a key={att.id} href={att.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-blue-600 hover:underline p-1.5 rounded-md hover:bg-blue-50 transition-colors w-max">
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{att.original_filename}</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-slate-500 bg-slate-50 font-normal shadow-none border-dashed pointer-events-none w-max">
                      No attachments provided
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Critical Fault Area (Right) */}
            <div className="p-6 lg:col-span-2 bg-white flex flex-col h-full">
              <div className="flex items-center gap-2 text-[10px] font-bold text-red-600 uppercase tracking-widest mb-4">
                <AlertCircle className="h-3.5 w-3.5" />
                Reported Fault / Problem Statement
              </div>
              <div className="text-sm text-slate-900 font-medium leading-relaxed whitespace-pre-wrap break-words max-h-[160px] overflow-y-auto pr-2">
                {memo.fault}
              </div>
            </div>
          </div>
        </div>

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
                  <Input type="datetime-local" value={resolution.received_time} disabled className="bg-slate-100 border-dashed text-slate-600 shadow-none pointer-events-none" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Attended Time</label>
                  <Input type="datetime-local" value={resolution.attended_time} onChange={e => handleResChange("attended_time", e.target.value)} disabled={isReadOnly || isVerifyMode} className="bg-slate-50/50 shadow-none" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Completion Time</label>
                  <Input type="datetime-local" value={resolution.completion_time} onChange={e => handleResChange("completion_time", e.target.value)} disabled={isReadOnly || isVerifyMode} className="bg-slate-50/50 shadow-none" />
                </div>

                {/* Details */}
                <div className="flex flex-col gap-2 md:col-span-3">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Action Taken <span className="text-red-500">*</span></label>
                  <Textarea 
                    value={resolution.action_taken} 
                    onChange={e => handleResChange("action_taken", e.target.value)} 
                    placeholder="Describe what was fixed..."
                    disabled={isReadOnly || isVerifyMode}
                    className="bg-slate-50/50 shadow-none min-h-[80px] resize-y [field-sizing:fixed]" 
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Attended By</label>
                  <SearchableSelect
                    options={users.map(u => ({ label: u.name, value: u.id }))}
                    value={resolution.attended_by_id}
                    onValueChange={(val) => handleResChange("attended_by_id", val)}
                    placeholder="Select Engineer"
                    className="bg-slate-50/50 shadow-none border-slate-200"
                    disabled={isReadOnly || isVerifyMode}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Activity Type</label>
                  <SearchableSelect
                    options={[
                      { label: "M - Mechanical", value: "M" },
                      { label: "E - Electrical", value: "E" },
                      { label: "M/E - Mechanical/Electrical", value: "M/E" },
                      { label: "E/M - Electrical/Mechanical", value: "E/M" },
                      { label: "PM - Preventive", value: "PM" },
                      { label: "MIS - Miscellaneous", value: "MIS" },
                      { label: "IMP - Improvement", value: "IMP" },
                    ]}
                    value={resolution.activity_type}
                    onValueChange={(val) => handleResChange("activity_type", val)}
                    placeholder="Select Type"
                    className="bg-slate-50/50 shadow-none border-slate-200"
                    disabled={isReadOnly || isVerifyMode}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Material Consumed?</label>
                  <Select disabled={isReadOnly || isVerifyMode} value={resolution.material_consumed ? "yes" : "no"} onValueChange={(val) => handleResChange("material_consumed", val === "yes")}>
                    <SelectTrigger className="bg-slate-50/50 shadow-none border-slate-200 w-full">
                      <SelectValue placeholder="Select Yes/No" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">YES</SelectItem>
                      <SelectItem value="no">NO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Hours Tracker */}
                <div className="md:col-span-3 border-t border-slate-100 pt-4 mt-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Hours Tracking</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Man Hrs (Tech)</label>
                      <Input type="number" value={resolution.man_hrs_technician} onChange={e => handleResChange("man_hrs_technician", e.target.value)} disabled={isReadOnly || isVerifyMode} className="bg-slate-50/50 shadow-none" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Man Hrs (Mgt)</label>
                      <Input type="number" value={resolution.man_hrs_management} onChange={e => handleResChange("man_hrs_management", e.target.value)} disabled={isReadOnly || isVerifyMode} className="bg-slate-50/50 shadow-none" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Total Man Hrs</label>
                      <Input type="number" value={resolution.total_man_hrs} onChange={e => handleResChange("total_man_hrs", e.target.value)} disabled={isReadOnly || isVerifyMode} className="bg-slate-50/50 shadow-none" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Breakdown Hrs</label>
                      <Input type="number" value={resolution.breakdown_hrs} onChange={e => handleResChange("breakdown_hrs", e.target.value)} disabled={isReadOnly || isVerifyMode} className="bg-slate-50/50 shadow-none" />
                    </div>
                  </div>
                </div>

                {/* Completion Status */}
                <div className="md:col-span-3 border-t border-slate-100 pt-4 mt-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Status</label>
                    <Select disabled={isReadOnly || isVerifyMode} value={resolution.status} onValueChange={(val) => handleResChange("status", val)}>
                      <SelectTrigger className="bg-slate-50/50 shadow-none border-slate-200 font-semibold w-full">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OK">OK</SelectItem>
                        <SelectItem value="UNDER BREAKDOWN">Under Breakdown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Remarks</label>
                    <Textarea 
                      value={resolution.maintenance_remarks} 
                      onChange={e => handleResChange("maintenance_remarks", e.target.value)} 
                      placeholder="Any additional remarks..."
                      disabled={isReadOnly || isVerifyMode}
                      className="bg-slate-50/50 shadow-none min-h-[60px] resize-y [field-sizing:fixed]" 
                    />
                  </div>
                </div>

              </div>
            </CardContent>
            {!(isReadOnly || isVerifyMode) && (
              <CardFooter className="bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3 py-4 shrink-0">
                <Button variant="outline" onClick={onBack} className="shadow-none bg-white cursor-pointer">
                  Cancel
                </Button>
                <Button onClick={handleUpdate} className="bg-blue-600 text-white hover:bg-blue-700 shadow-none cursor-pointer">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {resolution.status === "OK" ? "Submit Resolution" : "Save Progress"}
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Production Remarks Section */}
          {memo.status === "OK" && (
            <Card className="shadow-none border-slate-200 bg-white rounded-none mt-6">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Production Remarks</CardTitle>
                <CardDescription className="text-xs text-slate-500">Add any final remarks regarding the machine's operation after maintenance.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Final Production Remarks</label>
                  <Textarea 
                    value={production_remarks} 
                    onChange={e => setProdRemarks(e.target.value)} 
                    placeholder="Confirm if the machine is running okay..."
                    disabled={isReadOnly}
                    className="bg-slate-50/50 shadow-none min-h-[80px] resize-y [field-sizing:fixed]" 
                  />
                </div>
              </CardContent>
              {!isReadOnly && (
                <CardFooter className="bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3 py-4 shrink-0">
                  <Button 
                    onClick={async () => {
                      try {
                        await apiClient.put(`/api/maintenance/memos/verify/${memo.id}`, { production_remarks });
                        toast.success("Remark saved successfully");
                        onSuccess();
                      } catch (err) {
                        toast.error("Failed to save remark");
                      }
                    }} 
                    className="bg-blue-600 text-white hover:bg-blue-700 shadow-none cursor-pointer"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save Remark
                  </Button>
                </CardFooter>
              )}
            </Card>
          )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MAIN EXPORT
// ----------------------------------------------------------------------
export function MaintenanceMemo() {
  const [view, setView] = useState("list"); 
  const [activeMemo, setActiveMemo] = useState(null);
  const [refreshListKey, setRefreshListKey] = useState(0);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isVerifyMode, setIsVerifyMode] = useState(false);

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
          onInitiateClick={() => {
            setActiveMemo(null);
            setIsReadOnly(false);
            setIsVerifyMode(false);
            setView("initiate");
          }} 
          onViewClick={async (memo, actionType) => {
            try {
              const response = await apiClient.get(`/api/maintenance/memos/${memo.id}`);
              setActiveMemo(response.data || response);
              
              setIsReadOnly(false);
              setIsVerifyMode(false);
              
              if (actionType === "VIEW_INITIATE_READONLY") {
                setIsReadOnly(true);
                setView("initiate");
              } else if (actionType === "VIEW_RESOLUTION_READONLY") {
                setIsReadOnly(true);
                setView("resolve");
              } else if (actionType === "VERIFY") {
                setIsVerifyMode(true);
                setView("resolve");
              } else {
                setView("resolve");
              }
            } catch (error) {
              toast.error("Failed to load memo details");
            }
          }}
          onEditClick={async (memo) => {
            try {
              const response = await apiClient.get(`/api/maintenance/memos/${memo.id}`);
              setActiveMemo(response.data || response);
              setIsReadOnly(false);
              setIsVerifyMode(false);
              setView("initiate");
            } catch (error) {
              toast.error("Failed to load memo details");
            }
          }}
          refreshListKey={refreshListKey}
        />
      )}
      
      {view === "initiate" && (
        <InitiateMemoView 
          onBack={() => setView("list")}
          onSuccess={() => { setRefreshListKey(k => k+1); setView("list"); }}
          initialData={activeMemo}
          isReadOnly={isReadOnly}
        />
      )}

      {view === "resolve" && activeMemo && (
        <ResolveMemoView
          onBack={() => {
            setActiveMemo(null);
            setView("list");
          }}
          onSuccess={() => {
            setRefreshListKey(k => k+1);
            setActiveMemo(null);
            setView("list");
          }}
          memo={activeMemo}
          isReadOnly={isReadOnly}
          isVerifyMode={isVerifyMode}
        />
      )}
    </PageContainer>
  );
}