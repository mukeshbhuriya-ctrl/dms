import { useState, useCallback } from "react"
import { AdminSidebar } from "@/components"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Plus, Edit, Trash2, ArrowLeft } from "lucide-react"
import { DataTable } from "@/components/shared/DataTable"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"
import { toast } from "react-toastify"
import { useParams } from "react-router-dom"

// ─── Config per lookup type ──────────────────────────────────────────────────
const LOOKUP_CONFIG = {
    rfq_type: { title: "RFQ Types", singular: "RFQ Type", description: "Manage RFQ type options for the RFQ Register form." },
    mode_of_enquiry: { title: "Mode of Enquiry", singular: "Mode of Enquiry", description: "Manage mode of enquiry options for the RFQ Register form." },
    mediator: { title: "Mediators", singular: "Mediator", description: "Manage Mediators." },
    estimator: { title: "Estimators", singular: "Estimator", description: "Manage Estimators." },
}

// ─── Main Page ──────────────────────────────────────────────────────────────
function RfqLookupManager() {
    const { type } = useParams()
    const config = LOOKUP_CONFIG[type]
    const isPersonType = type === "mediator" || type === "estimator"

    const [view, setView] = useState("list") // 'list' | 'create'
    const [editItem, setEditItem] = useState(null)
    const [inputValue, setInputValue] = useState("")
    const [emailValue, setEmailValue] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)

    const handleAdd = () => {
        setEditItem(null)
        setInputValue("")
        setEmailValue("")
        setView("create")
    }

    const handleEdit = (item) => {
        setEditItem(item)
        setInputValue(item.name)
        setEmailValue(item.email || "")
        setView("create")
    }

    const handleDelete = async (id) => {
        if (!window.confirm(`Are you sure you want to delete this ${config.singular}?`)) return
        try {
            const endpoint = isPersonType ? `/api/rfq/${type}s/${id}` : `/api/rfq/lookups/${id}`
            const res = await apiClient.delete(endpoint)
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
            if (isPersonType) {
                const payload = { name: inputValue.trim(), email: emailValue.trim() || null }
                if (editItem) {
                    res = await apiClient.put(`/api/rfq/${type}s/${editItem.id}`, payload)
                } else {
                    res = await apiClient.post(`/api/rfq/${type}s`, payload)
                }
            } else {
                if (editItem) {
                    res = await apiClient.put(`/api/rfq/lookups/${editItem.id}`, { name: inputValue.trim() })
                } else {
                    res = await apiClient.post("/api/rfq/lookups", { type, name: inputValue.trim() })
                }
            }
            if (res.success) {
                toast.success(editItem ? `${config.singular} updated` : `${config.singular} added`)
                setView("list")
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
        {
            header: "Actions",
            id: "actions",
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

    // ─── Fetch Data ──────────────────────────────────────────────────────────
    const fetchData = useCallback(async ({ page, limit, search }) => {
        try {
            if (isPersonType) {
                const res = await apiClient.get(`/api/rfq/${type}s`)
                let data = res.data || []
                if (search) {
                    const q = search.toLowerCase()
                    data = data.filter(
                        (u) => u.name.toLowerCase().includes(q) || (u.email && u.email.toLowerCase().includes(q))
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
        } catch (error) {
            console.error("fetchData failed:", error);
            return { data: [], meta: { total: 0, page, limit } }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, isPersonType, refreshKey])

    const handleExport = async () => {
        try {
            await exportApi.exportModule(type, `${config?.title.replace(/\s+/g, '_').toLowerCase()}_export.xlsx`);
        } catch (error) {
            console.error(`${config?.title} Export failed:`, error);
        }
    };

    if (!config) {
        return (
            <SidebarProvider>
                <AdminSidebar />
                <SidebarInset>
                    <div className="p-6">
                        <h1 className="text-2xl font-bold text-destructive">Invalid Lookup Type</h1>
                        <p className="text-muted-foreground mt-2">The requested lookup management page does not exist or has been removed.</p>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        )
    }

    return (
        <SidebarProvider>
            <AdminSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                </header>
                <main className="flex-1 overflow-auto p-6 flex flex-col">
                    <div className="flex-1 flex flex-col w-full">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h1 className="text-3xl font-bold mb-2">
                                    {view === "list" ? config.title : (editItem ? `Update ${config.singular}` : `Create ${config.singular}`)}
                                </h1>
                                <p className="text-muted-foreground">
                                    {view === "list" ? config.description : `Enter the details for the ${config.singular.toLowerCase()}.`}
                                </p>
                            </div>
                            <div>
                                {view === "list" ? (
                                    <Button onClick={handleAdd}>
                                        <Plus className="mr-2 h-4 w-4" /> Add {config.singular}
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
                                    <CardTitle>{config.title} List</CardTitle>
                                    <CardDescription>View and manage {config.title.toLowerCase()}.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <DataTable
                                        columns={isPersonType ? userColumns : lookupColumns}
                                        fetchData={fetchData}
                                        onExport={handleExport}
                                    />
                                </CardContent>
                            </Card>
                        ) : (
                            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{config.singular} Information</CardTitle>
                                        <CardDescription>
                                            Enter the basic details about the {config.singular.toLowerCase()}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="name">
                                                    Name <span className="text-destructive">*</span>
                                                </Label>
                                                <Input
                                                    id="name"
                                                    name="name"
                                                    type="text"
                                                    placeholder={`Enter ${config.singular.toLowerCase()} name`}
                                                    value={inputValue}
                                                    onChange={(e) => setInputValue(e.target.value)}
                                                    required
                                                    disabled={submitting}
                                                    autoFocus
                                                />
                                            </div>
                                            
                                            {isPersonType && (
                                                <div className="space-y-2">
                                                    <Label htmlFor="email">Email</Label>
                                                    <Input
                                                        id="email"
                                                        name="email"
                                                        type="email"
                                                        placeholder="user@example.com"
                                                        value={emailValue}
                                                        onChange={(e) => setEmailValue(e.target.value)}
                                                        disabled={submitting}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex justify-start gap-4 mt-6">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setInputValue("")
                                            setEmailValue("")
                                            setView("list")
                                        }}
                                        disabled={submitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={submitting}>
                                        {submitting ? (editItem ? "Updating..." : "Creating...") : (editItem ? "Update" : "Create")}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}

export default RfqLookupManager
