import { PageContainer } from "@/components/layout/PageContainer";
import { useState, useMemo, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Pencil, Trash2, Edit, Archive, CheckCircle, XCircle, ChevronDown, X } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import ProDataTable from "@/components/shared/ProDataTable"
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import apiClient from "@/api/api.client"
import { AccessControl } from "@/components/iam/access_control";

function CreateDepartment() {
  const [formData, setFormData] = useState({ name: "", hod_ids: [] })
  const [users, setUsers] = useState([])
  const [searchUser, setSearchUser] = useState("")
  const [view, setView] = useState("list")
  const [editingId, setEditingId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Dialog States
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deptToDelete, setDeptToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [toggleDialogOpen, setToggleDialogOpen] = useState(false)
  const [deptToToggle, setDeptToToggle] = useState(null)
  const [isToggling, setIsToggling] = useState(false)

  const [columnFilters, setColumnFilters] = useState({ is_active: ["true"] })
  const [activeFilters, setActiveFilters] = useState({ records: [] })

  const fetchActiveFilters = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/departments/filters")
      if (res.success) setActiveFilters(res.data)
    } catch (err) {
      console.error("Error fetching filters:", err)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/users/get-users?limit=1000");
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }, []);

  useEffect(() => {
    if (view === "list") fetchActiveFilters()
    fetchUsers()
  }, [fetchActiveFilters, fetchUsers, view, refreshKey])

  const nameOptions = useMemo(() => {
    const names = [...new Set((activeFilters.records || []).map(r => r.name))].filter(Boolean).sort()
    return names.map(n => ({ label: n, value: n }))
  }, [activeFilters.records])

  const fetchData = useCallback(async (params) => {
    try {
      const queryParams = { ...params }
      if (queryParams.columnFilters) {
        queryParams.columnFilters = JSON.stringify(queryParams.columnFilters)
      }
      return await apiClient.get("/api/departments", queryParams)
    } catch (err) {
      console.error("Fetch error:", err)
      return { success: false, data: [], meta: {} }
    }
  }, [])

  const resetForm = useCallback(() => {
    setFormData({ name: "", hod_ids: [] })
    setEditingId(null)
    setSearchUser("")
    setError("")
    setSuccess("")
  }, [])

  const handleEdit = (dept) => {
    setEditingId(dept.id)
    setFormData({ 
        name: dept.name,
        hod_ids: dept.department_hods?.map(h => h.user.id) || []
    })
    setView("create")
    setError("")
    setSuccess("")
  }

  const handleDeleteClick = (dept) => {
    setDeptToDelete(dept)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    setIsDeleting(true)
    try {
      await apiClient.delete(`/api/departments/${deptToDelete.id}`)
      setRefreshKey(prev => prev + 1)
    } catch (err) {
      setError(err.message || "Failed to delete")
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleToggleClick = (dept) => {
    setDeptToToggle(dept)
    setToggleDialogOpen(true)
  }

  const confirmToggle = async () => {
    setIsToggling(true)
    try {
      await apiClient.patch(`/api/departments/toggle-status/${deptToToggle.id}`)
      setRefreshKey(prev => prev + 1)
    } catch (err) {
      setError(err.message || "Failed to toggle status")
    } finally {
      setIsToggling(false)
      setToggleDialogOpen(false)
    }
  }

  const columns = useMemo(() => [
    {
      accessorKey: "name",
      header: "Department Name",
      filterType: "select",
      isMulti: true,
      filterOptions: nameOptions,
    },
    {
      id: "hods",
      header: "HOD(s)",
      cell: (row) => {
          if (!row.department_hods || row.department_hods.length === 0) return <span className="text-muted-foreground text-sm">None</span>;
          return (
              <div className="flex flex-wrap gap-1">
                  {row.department_hods.map(h => (
                      <Badge key={h.user.id} variant="secondary" className="font-normal">
                          {h.user.name}
                      </Badge>
                  ))}
              </div>
          );
      },
      enableSorting: false,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      filterType: "select",
      isMulti: true,
      filterOptions: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" },
      ],
      cell: (row) => row.is_active
        ? <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-medium">Active</Badge>
        : <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20 text-xs font-medium">Inactive</Badge>,
    },
    {
      id: "actions",
      header: "Actions",
      width: "60px",
      cell: (row) => {
        const actions = [
          { label: "Edit Department", icon: Edit, onClick: () => handleEdit(row) },
          { type: "separator" },
          { 
            label: row.is_active ? "Deactivate" : "Activate", 
            icon: row.is_active ? XCircle : CheckCircle, 
            onClick: () => handleToggleClick(row),
            color: row.is_active ? "danger" : "default"
          },
          { type: "separator" },
          { label: "Archive", icon: Archive, color: "danger", onClick: () => handleDeleteClick(row) }
        ];
        return (
          <div className="flex items-center justify-center">
            <DataTableRowActions actions={actions} />
          </div>
        );
      },
      enableSorting: false,
    }
  ], [nameOptions])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")
    try {
      if (editingId) {
        await apiClient.put(`/api/departments/${editingId}`, formData)
        setSuccess("Department updated successfully")
      } else {
        await apiClient.post("/api/departments", formData)
        setSuccess("Department created successfully")
      }
      setTimeout(() => {
        resetForm()
        setView("list")
        setRefreshKey(prev => prev + 1)
      }, 1000)
    } catch (err) {
      setError(err.message || "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <main className="flex-1 flex flex-col p-6 overflow-auto">
        <div className="w-full flex-1 flex flex-col">
          {view !== "list" && (
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-muted-foreground">Manage organizational units</p>
              </div>
              <Button variant="outline" className="cursor-pointer" onClick={() => { resetForm(); setView("list"); }}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
              </Button>
            </div>
          )}

          {view === "list" ? (
            <>
              {error && (
                <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <ProDataTable
                columns={columns}
                fetchData={fetchData}
                onAdd={() => { resetForm(); setView("create"); }}
                onAddTooltip="Add Department"
                refreshKey={refreshKey}
                columnFilters={columnFilters}
                onFilterChange={setColumnFilters}
              />
            </>
          ) : (
            <Card className="w-full">
              <CardHeader>
                <CardTitle>{editingId ? "Edit Department" : "New Department"}</CardTitle>
                <CardDescription>Enter the department name</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && <div className="p-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded">{error}</div>}
                  {success && <div className="p-2 text-sm text-green-600 bg-green-500/10 border border-green-500/20 rounded">{success}</div>}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="space-y-2">
                      <Label>Department Name</Label>
                      <Input 
                        value={formData.name} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Production, Quality, HR"
                        required
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="space-y-2">
                    <Label>Heads of Department (HODs)</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between font-normal text-slate-600">
                                Select HODs...
                                <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                            <div className="p-2 border-b">
                                <Input 
                                    placeholder="Search users..." 
                                    value={searchUser}
                                    onChange={(e) => setSearchUser(e.target.value)}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
                                {users.filter(u => u.name.toLowerCase().includes(searchUser.toLowerCase())).map(u => (
                                    <div 
                                        key={u.id}
                                        className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded-md cursor-pointer"
                                        onClick={() => {
                                            if (formData.hod_ids.includes(u.id)) {
                                                setFormData({ ...formData, hod_ids: formData.hod_ids.filter(id => id !== u.id) });
                                            } else {
                                                setFormData({ ...formData, hod_ids: [...formData.hod_ids, u.id] });
                                            }
                                        }}
                                    >
                                        <Checkbox 
                                            checked={formData.hod_ids.includes(u.id)}
                                            onCheckedChange={() => {}} // Handled by parent div
                                        />
                                        <Label className="text-sm font-normal cursor-pointer flex-1">
                                            {u.name} {u.empid ? `(${u.empid})` : ''}
                                        </Label>
                                    </div>
                                ))}
                                {users.length === 0 && <p className="text-xs text-muted-foreground text-center p-2">No users found.</p>}
                            </div>
                        </PopoverContent>
                    </Popover>
                    {formData.hod_ids.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap pt-2">
                            {formData.hod_ids.map(id => {
                                const u = users.find(user => user.id === id);
                                if (!u) return null;
                                return (
                                    <Badge key={id} variant="secondary" className="flex items-center gap-1 bg-slate-100">
                                        {u.name}
                                        <X 
                                            className="h-3 w-3 cursor-pointer text-slate-500 hover:text-slate-800" 
                                            onClick={() => setFormData({ ...formData, hod_ids: formData.hod_ids.filter(hid => hid !== id) })}
                                        />
                                    </Badge>
                                );
                            })}
                        </div>
                    )}

                  </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" className="cursor-pointer" variant="outline" onClick={() => { resetForm(); setView("list"); }} disabled={isLoading}>Cancel</Button>
                    <AccessControl required="admin:departments:Create">
                      <Button type="submit" className="cursor-pointer" disabled={isLoading}>
                        {isLoading ? "Saving..." : (editingId ? "Update Department" : "Save Department")}
                      </Button>
                    </AccessControl>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Dialogs */}
          <ConfirmDialog 
            isOpen={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            onConfirm={confirmDelete}
            title="Archive Department"
            description={<span>Are you sure you want to archive <strong>{deptToDelete?.name}</strong>? This action will remove it from the active list.</span>}
            confirmText="Archive"
            variant="danger"
            isLoading={isDeleting}
          />

          <ConfirmDialog
            isOpen={toggleDialogOpen}
            onClose={() => setToggleDialogOpen(false)}
            onConfirm={confirmToggle}
            title={deptToToggle?.is_active ? "Deactivate Department" : "Activate Department"}
            description={<span>Confirm {deptToToggle?.is_active ? "deactivation" : "activation"} for <strong>{deptToToggle?.name}</strong>.</span>}
            confirmText={deptToToggle?.is_active ? "Deactivate" : "Activate"}
            variant="warning"
            isLoading={isToggling}
          />
        </div>
      </main>
    </>
  )
}

export default CreateDepartment
