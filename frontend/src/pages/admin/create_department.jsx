import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, ArrowLeft, Pencil, Trash2 } from "lucide-react"
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
import { FormAlert } from "@/components/ui/form-alert"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"

function CreateDepartment() {
    const navigate = useNavigate()
    const [formData, setFormData] = useState({
        name: "",
    })

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }))
        if (error) setError("")
    }
    // 'list' or 'create' or 'edit' - actually using 'create' for both create/edit form view
    const [view, setView] = useState("list")
    const [editingId, setEditingId] = useState(null)
    const [refreshKey, setRefreshKey] = useState(0)

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    // Delete Dialog State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [departmentToDelete, setDepartmentToDelete] = useState(null)

    const [columnFilters, setColumnFilters] = useState({})
    const [activeFilters, setActiveFilters] = useState({ records: [] })

    const fetchActiveFilters = useCallback(async () => {
        try {
            const res = await apiClient.get("/api/departments/filters")
            if (res.success) setActiveFilters(res.data)
        } catch (err) {
            console.error("Error fetching department filters:", err)
        }
    }, [])

    useEffect(() => {
        if (view === "list") {
            fetchActiveFilters()
        }
    }, [fetchActiveFilters, view, refreshKey])

    const activeDeptOptions = useMemo(() => {
        const depts = [...new Set((activeFilters.records || []).map(f => f.name))].filter(Boolean).sort()
        return depts.map(d => ({ label: d, value: d }))
    }, [activeFilters.records])

    const fetchDepartments = useCallback(async (params) => {
        try {
            const queryParams = { ...params };
            if (queryParams.columnFilters) {
                queryParams.columnFilters = JSON.stringify(queryParams.columnFilters);
            }
            const responseData = await apiClient.get('/api/departments', queryParams)
            return responseData;
        } catch (err) {
            console.error("Error fetching departments:", err)
            return { success: false, data: [], meta: {} }
        }
    }, [])

    const handleEdit = useCallback((department) => {
        setFormData({ name: department.name })
        setEditingId(department.id)
        setView("create")
        setError("")
        setSuccess("")
    }, [])

    const handleDeleteClick = useCallback((department) => {
        setDepartmentToDelete(department)
        setDeleteDialogOpen(true)
    }, [])

    const columns = useMemo(() => [
        {
            accessorKey: "name",
            header: "Department Name",
            filterType: "select",
            isMulti: true,
            filterOptions: activeDeptOptions
        },
        {
            accessorKey: "createdAt",
            header: "Created At",
            cell: (row) => new Date(row.createdAt).toLocaleDateString(),
        },
        {
            id: "actions",
            header: "Actions",
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(row)}
                        title="Edit"
                    >
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                        onClick={() => handleDeleteClick(row)}
                        title="Delete"
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                </div>
            ),
            enableSorting: false,
        },
    ], [handleEdit, handleDeleteClick, activeDeptOptions])

    const confirmDelete = async () => {
        if (!departmentToDelete) return

        try {
            await apiClient.delete(`/api/departments/${departmentToDelete.id}`)
            setRefreshKey(prev => prev + 1)
        } catch (err) {
            console.error("Error deleting department:", err)
            alert(err.message || "Error deleting department")
        } finally {
            setDeleteDialogOpen(false)
            setDepartmentToDelete(null)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        setSuccess("")
        setIsLoading(true)

        try {
            if (editingId) {
                await apiClient.put(`/api/departments/${editingId}`, formData)
            } else {
                await apiClient.post("/api/departments", formData)
            }

            setSuccess(editingId ? "Department updated successfully!" : "Department created successfully!")

            setTimeout(() => {
                setSuccess("")
                setView("list")
                setFormData({ name: "" })
                setEditingId(null)
                setRefreshKey(prev => prev + 1)
            }, 1000)

        } catch (err) {
            setError(err.message || "Something went wrong")
        } finally {
            setIsLoading(false)
        }
    }

    const handleExport = async () => {
        try {
            await exportApi.exportDepartments();
        } catch (err) {
            console.error("Export failed", err);
        }
    };

    return (
        <>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                </header>
                <main className="flex-1 flex flex-col overflow-auto p-6">
                        <div className="w-full flex-1 flex flex-col">
                            {view !== "list" && (
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h1 className="text-3xl font-bold mb-2">
                                        {editingId ? "Edit Department" : "Create Department"}
                                    </h1>
                                    <p className="text-muted-foreground">
                                        Enter department details below.
                                    </p>
                                </div>
                                <div>
                                    <Button variant="outline" onClick={() => setView("list")}>
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                                    </Button>
                                </div>
                            </div>
                            )}

                            {view === "list" ? (
                                <ProDataTable
                                    columns={columns}
                                    fetchData={fetchDepartments}
                                    onExport={handleExport}
                                    onAdd={() => setView("create")}
                                    onAddTooltip="Create Department"
                                    refreshKey={refreshKey}
                                    columnFilters={columnFilters}
                                    onFilterChange={(newFilters) => setColumnFilters(prev => ({ ...prev, ...newFilters }))}
                                />
                            ) : (
                            <div className="w-full">
                                <form onSubmit={handleSubmit}>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>{editingId ? "Edit Department" : "New Department"}</CardTitle>
                                            <CardDescription>
                                                Department name must be unique.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {error && <FormAlert type="error" message={error} />}
                                            {success && <FormAlert type="success" message={success} />}

                                            <div className="space-y-2">
                                                <Label htmlFor="name">
                                                    Department Name <span className="text-destructive">*</span>
                                                </Label>
                                                <Input
                                                    id="name"
                                                    name="name"
                                                    type="text"
                                                    placeholder="e.g. Human Resources"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    required
                                                    disabled={isLoading}
                                                />
                                            </div>
                                        </CardContent>
                                        {/* Buttons */}
                                        <div className="flex justify-end gap-4 p-6 pt-0">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setView("list")}
                                                disabled={isLoading}
                                            >
                                                Cancel
                                            </Button>
                                            <Button type="submit" disabled={isLoading}>
                                                {isLoading ? "Saving..." : (editingId ? "Update" : "Create")}
                                            </Button>
                                        </div>
                                    </Card>
                                </form>
                            </div>
                        )}
                    </div>
                </main>

                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Department</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete the department <strong>{departmentToDelete?.name}</strong>?
                                This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
        </>
    )
}

export default CreateDepartment
