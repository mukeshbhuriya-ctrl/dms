import { PageContainer } from "@/components/layout/PageContainer";
import { useState, useMemo, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Pencil, Trash2, Edit, Archive, Settings, EyeOff, Eye } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import ProDataTable from "@/components/shared/ProDataTable"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import apiClient from "@/api/api.client"

function CreateDepartment() {
  const [formData, setFormData] = useState({ name: "" })
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

  useEffect(() => {
    if (view === "list") fetchActiveFilters()
  }, [fetchActiveFilters, view, refreshKey])

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
    setFormData({ name: "" })
    setEditingId(null)
    setError("")
    setSuccess("")
  }, [])

  const handleEdit = (dept) => {
    setEditingId(dept.id)
    setFormData({ name: dept.name })
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
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-md">
              <span className="sr-only">Open menu</span>
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 shadow-lg rounded-xl border border-slate-100">
            <DropdownMenuLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem onClick={() => handleEdit(row)} className="cursor-pointer text-sm py-2">
              <Edit className="mr-2 h-4 w-4 text-blue-600" />
              <span>Edit Department</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem onClick={() => handleToggleClick(row)} className="cursor-pointer text-sm py-2">
              {row.is_active ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4 text-amber-600" />
                  <span className="text-amber-700 font-medium">Deactivate</span>
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">Activate</span>
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDeleteClick(row)} className="cursor-pointer text-sm py-2 group hover:bg-red-50 focus:bg-red-50">
              <Archive className="mr-2 h-4 w-4 text-red-500 group-hover:text-red-600" />
              <span className="text-red-600 font-medium group-hover:text-red-700">Archive</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
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
              <Button variant="outline" onClick={() => { resetForm(); setView("list"); }}>
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
            <div className="space-y-6 w-full pb-10">
              <form onSubmit={handleSubmit}>
                <Card className="w-full shadow-sm border-slate-200/80 rounded-xl overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50/80 border-b border-slate-100/60 pb-5">
                    <CardTitle className="text-lg font-bold text-slate-800">{editingId ? "Edit Department" : "New Department"}</CardTitle>
                    <CardDescription className="text-sm font-medium text-slate-500">Enter the department name</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    {error && <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">{error}</div>}
                    {success && <div className="p-3 text-sm text-green-600 bg-green-500/10 border border-green-500/20 rounded-md">{success}</div>}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Department Name <span className="text-red-500">*</span></Label>
                      <Input 
                        value={formData.name} 
                        onChange={(e) => setFormData({ name: e.target.value })}
                        placeholder="e.g. Production, Quality, HR"
                        required
                        disabled={isLoading}
                        className="h-10 bg-slate-50/50 border-slate-200 focus-visible:ring-blue-500 shadow-none text-sm transition-all"
                      />
                    </div>
                  </CardContent>
                  {/* Proper Enterprise Card Footer */}
                  <div className="bg-slate-50 border-t border-slate-100/60 p-4 px-6 flex justify-end gap-3 mt-4">
                    <Button type="button" variant="outline" className="h-10 px-6 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-none" onClick={() => { resetForm(); setView("list"); }} disabled={isLoading}>Cancel</Button>
                    <Button type="submit" className="h-10 px-6 bg-blue-600 hover:bg-blue-700 shadow-none text-white font-medium" disabled={isLoading}>{isLoading ? "Saving..." : (editingId ? "Update Department" : "Save Department")}</Button>
                  </div>
                </Card>
              </form>
            </div>
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
