import { useState, useCallback } from "react"
import { AdminSidebar } from "@/components"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Edit, Trash2 } from "lucide-react"
import { DataTable } from "@/components/shared/DataTable"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"
import { toast } from "react-toastify"
import { useParams } from "react-router-dom"

// ─── Config per lookup type ──────────────────────────────────────────────────
const LOOKUP_CONFIG = {
    rfq_type: { title: "RFQ Types", singular: "RFQ Type", description: "Manage RFQ type options for the RFQ Register form." },
    mode_of_enquiry: { title: "Mode of Enquiry", singular: "Mode of Enquiry", description: "Manage mode of enquiry options for the RFQ Register form." },
    remark: { title: "Remark Options", singular: "Remark", description: "Manage remark options for the RFQ Register form." },
    mediator: { title: "Mediators", singular: "Mediator", description: "View users who can act as mediators. Users are managed from the admin panel." },
    estimator: { title: "Estimators", singular: "Estimator", description: "View users who can act as estimators. Users are managed from the admin panel." },
}

// ─── Main Page ──────────────────────────────────────────────────────────────
function RfqLookupManager() {
    const { type } = useParams()
    const config = LOOKUP_CONFIG[type] || { title: "Lookups", singular: "Lookup", description: "" }
    const isUserType = type === "mediator" || type === "estimator"

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [inputValue, setInputValue] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)

    const handleAdd = () => {
        setEditItem(null)
        setInputValue("")
        setIsDialogOpen(true)
    }

    const handleEdit = (item) => {
        setEditItem(item)
        setInputValue(item.name)
        setIsDialogOpen(true)
    }

    const handleDelete = async (id) => {
        if (!window.confirm(`Are you sure you want to delete this ${config.singular}?`)) return
        try {
            const res = await apiClient.delete(`/api/rfq/lookups/${id}`)
            if (res.success) {
                toast.success(`${config.singular} deleted successfully`)
                setRefreshKey((k) => k + 1)
            }
        } catch (error) {
            toast.error(error.message || "Failed to delete")
        }
    }

    const handleSubmit = async () => {
        if (!inputValue.trim()) {
            toast.error("Name is required")
            return
        }
        try {
            setSubmitting(true)
            let res
            if (editItem) {
                res = await apiClient.put(`/api/rfq/lookups/${editItem.id}`, { name: inputValue.trim() })
            } else {
                res = await apiClient.post("/api/rfq/lookups", { type, name: inputValue.trim() })
            }
            if (res.success) {
                toast.success(editItem ? `${config.singular} updated` : `${config.singular} added`)
                setIsDialogOpen(false)
                setRefreshKey((k) => k + 1)
            }
        } catch (error) {
            toast.error(error.message || "Failed to save")
        } finally {
            setSubmitting(false)
        }
    }

    // ─── Columns ─────────────────────────────────────────────────────────────
    const lookupColumns = [
        { header: "Name", accessorKey: "name" },
        {
            id: "actions",
            header: "Actions",
            cell: (row) => (
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(row)} title="Edit">
                        <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(row.id)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ]

    const userColumns = [
        { header: "Name", accessorKey: "name" },
        { header: "Email", accessorKey: "email" },
    ]

    // ─── Fetch Data ──────────────────────────────────────────────────────────
    const fetchData = useCallback(async ({ page, limit, search }) => {
        if (isUserType) {
            const res = await apiClient.get("/api/rfq/users")
            let data = res.data || []
            if (search) {
                const q = search.toLowerCase()
                data = data.filter(
                    (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
                )
            }
            const start = (page - 1) * limit
            return {
                data: data.slice(start, start + limit),
                meta: { total: data.length, page, limit },
            }
        } else {
            const res = await apiClient.get(`/api/rfq/lookups/${type}`)
            let data = res.data || []
            if (search) {
                const q = search.toLowerCase()
                data = data.filter((d) => d.name.toLowerCase().includes(q))
            }
            const start = (page - 1) * limit
            return {
                data: data.slice(start, start + limit),
                meta: { total: data.length, page, limit },
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, isUserType, refreshKey])

    const handleExport = async () => {
        try {
            await exportApi.exportModule(type, `${config.title.replace(/\s+/g, '_').toLowerCase()}_export.xlsx`);
        } catch (error) {
            console.error(`${config.title} Export failed:`, error);
        }
    };

    return (
        <SidebarProvider>
            <AdminSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                </header>
                <main className="flex-1 overflow-auto p-6 flex flex-col">
                    <div className="flex-1 flex flex-col w-full">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-3xl font-bold mb-1">{config.title}</h1>
                                <p className="text-muted-foreground">{config.description}</p>
                            </div>
                            {!isUserType && (
                                <Button onClick={handleAdd}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add {config.singular}
                                </Button>
                            )}
                        </div>

                        <DataTable
                            columns={isUserType ? userColumns : lookupColumns}
                            fetchData={fetchData}
                            onExport={handleExport}
                        />
                    </div>
                </main>
            </SidebarInset>

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editItem ? `Edit ${config.singular}` : `Add ${config.singular}`}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder={`Enter ${config.singular} name`}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting ? "Saving..." : editItem ? "Update" : "Add"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </SidebarProvider>
    )
}

export default RfqLookupManager
