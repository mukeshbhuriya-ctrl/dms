import { useState, useMemo, useCallback, useEffect } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Pencil, Trash2, Edit, Archive } from "lucide-react"
import { Switch } from "@/components/ui/switch"
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => handleEdit(row)} title="Edit">
            <Edit className="h-4 w-4" />
          </Button>
          <Switch 
            checked={row.is_active} 
            onCheckedChange={() => handleToggleClick(row)}
          />
          <Button variant="outline" size="sm" className="text-destructive cursor-pointer hover:bg-destructive/10" onClick={() => handleDeleteClick(row)} title="Archive">
            <Archive className="h-4 w-4" />
              Archive
          </Button>
        </div>
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
        setView("list")
        setRefreshKey(prev => prev + 1)
        setFormData({ name: "" })
        setEditingId(null)
      }, 1000)
    } catch (err) {
      setError(err.message || "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
      <main className="flex-1 flex flex-col p-6 overflow-auto">
        <div className="w-full flex-1 flex flex-col">
          {view !== "list" && (
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold">{editingId ? "Edit Department" : "Create Department"}</h1>
                <p className="text-muted-foreground">Manage organizational units</p>
              </div>
              <Button variant="outline" onClick={() => setView("list")}>
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
                onAdd={() => setView("create")}
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
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && <div className="p-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded">{error}</div>}
                  {success && <div className="p-2 text-sm text-green-600 bg-green-500/10 border border-green-500/20 rounded">{success}</div>}
                  <div className="space-y-2">
                    <Label>Department Name</Label>
                    <Input 
                      value={formData.name} 
                      onChange={(e) => setFormData({ name: e.target.value })}
                      placeholder="e.g. Production, Quality, HR"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setView("list")} disabled={isLoading}>Cancel</Button>
                    <Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save Department"}</Button>
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
