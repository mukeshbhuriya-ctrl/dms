import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { AdminSidebar } from "@/components"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
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
import { DataTable } from "@/components/shared/DataTable"
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

    // DataTable State
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }))
        if (error) setError("")
    }

    // Fetch Departments
    const fetchDepartments = useCallback(async () => {
        try {
            setLoading(true)
            const responseData = await apiClient.get('/api/departments')

            if (responseData.success) {
                return {
                    data: responseData.data || [],
                    meta: {
                        total: responseData.data?.length || 0,
                        page: 1,
                        totalPages: 1
                    }
                }
            } else {
                return { data: [], meta: {} }
            }
        } catch (err) {
            console.error("Error fetching departments:", err)
            return { data: [], meta: {} }
        } finally {
            setLoading(false)
        }
    }, [])

    const columns = useMemo(() => [
        {
            accessorKey: "name",
            header: "Department Name",
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
    ], [])

    const handleEdit = (department) => {
        setFormData({ name: department.name })
        setEditingId(department.id)
        setView("create")
        setError("")
        setSuccess("")
    }

    const handleDeleteClick = (department) => {
        setDepartmentToDelete(department)
        setDeleteDialogOpen(true)
    }

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
        <SidebarProvider>
            <AdminSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                </header>
                <main className="flex-1 flex flex-col overflow-auto p-6">
                    <div className="w-full flex-1 flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h1 className="text-3xl font-bold mb-2">
                                    {view === "list" ? "Department Management" : (editingId ? "Edit Department" : "Create Department")}
                                </h1>
                                <p className="text-muted-foreground">
                                    {view === "list"
                                        ? "Manage organization departments"
                                        : "Enter department details below."}
                                </p>
                            </div>
                            <div>
                                {view === "list" ? (
                                    <Button onClick={() => {
                                        setFormData({ name: "" })
                                        setEditingId(null)
                                        setView("create")
                                    }}>
                                        <Plus className="mr-2 h-4 w-4" /> Create Department
                                    </Button>
                                ) : (
                                    <Button variant="outline" onClick={() => setView("list")}>
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                                    </Button>
                                )}
                            </div>
                        </div>

                        {view === "list" ? (
                            <Card className="flex-1 flex flex-col">
                                <CardHeader>
                                    <CardTitle>Departments</CardTitle>
                                    <CardDescription>
                                        List of all departments.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <DataTable
                                        columns={columns}
                                        fetchData={fetchDepartments}
                                        initialData={data}
                                        onExport={handleExport}
                                    />
                                </CardContent>
                            </Card>
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

            </SidebarInset>
        </SidebarProvider>
    )
}

export default CreateDepartment
