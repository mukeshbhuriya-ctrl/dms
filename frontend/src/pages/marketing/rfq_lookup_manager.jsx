import { PageContainer } from "@/components/layout/PageContainer";
import { useState, useCallback, useMemo, useEffect } from "react"
import ProDataTable from "@/components/shared/ProDataTable"
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
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
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null })

    const [columnFilters, setColumnFilters] = useState({})
    const [activeFilters, setActiveFilters] = useState({ records: [] })

    const handleAdd = useCallback(() => {
        setEditItem(null)
        setInputValue("")
        setEmailValue("")
        setView("create")
    }, [])

    const handleEdit = useCallback((item) => {
        setEditItem(item)
        setInputValue(item.name)
        setEmailValue(item.email || "")
        setView("create")
    }, [])

    const handleDelete = useCallback((id) => {
        setConfirmDelete({ isOpen: true, id })
    }, [])

    const executeDelete = async () => {
        const id = confirmDelete.id
        if (!id) return
        try {
            const endpoint = isPersonType ? `/api/rfq/${type}s/${id}` : `/api/rfq/lookups/${id}`
            const res = await apiClient.delete(endpoint)
            if (res.success) {
                toast.success(`${config?.singular} deleted successfully`)
                setRefreshKey((k) => k + 1)
            }
        } catch (error) {
            toast.error(error.message || "Failed to delete")
        } finally {
            setConfirmDelete({ isOpen: false, id: null })
        }
    }

    const fetchActiveFilters = useCallback(async () => {
        try {
            const endpoint = isPersonType ? `/api/rfq/${type}s/filters` : `/api/rfq/lookups/${type}/filters`
            const res = await apiClient.get(endpoint)
            if (res.success) setActiveFilters(res.data)
        } catch (err) {
            console.error(`Error fetching ${type} filters:`, err)
        }
    }, [isPersonType, type])

    useEffect(() => {
        if (view === "list" && config) {
            fetchActiveFilters()
        }
    }, [fetchActiveFilters, view, config, refreshKey])

    const activeNameOptions = useMemo(() => {
        const names = [...new Set((activeFilters.records || []).map(f => f.name))].filter(Boolean).sort()
        return names.map(n => ({ label: n, value: n }))
    }, [activeFilters.records])

    const activeEmailOptions = useMemo(() => {
        if (!isPersonType) return []
        const emails = [...new Set((activeFilters.records || []).map(f => f.email))].filter(Boolean).sort()
        return emails.map(e => ({ label: e, value: e }))
    }, [activeFilters.records, isPersonType])

    const columns = useMemo(() => {
        const base = [
            {
                accessorKey: "name",
                header: "Name",
                filterType: "select",
                isMulti: true,
                filterOptions: activeNameOptions
            }
        ]
        if (isPersonType) {
            base.push({
                accessorKey: "email",
                header: "Email",
                filterType: "select",
                isMulti: true,
                filterOptions: activeEmailOptions
            })
        }
        base.push({
            id: "actions",
            header: "Actions",
            width: "60px",
            cell: (row) => {
                const actions = [
                    {
                        label: "Edit",
                        icon: Edit,
                        onClick: () => handleEdit(row)
                    },
                    { type: "separator" },
                    {
                        label: "Delete",
                        icon: Trash2,
                        onClick: () => handleDelete(row.id),
                        className: "text-red-600 hover:text-red-700 hover:bg-red-50"
                    }
                ];
                return (
                    <div className="flex items-center justify-center">
                        <DataTableRowActions actions={actions} />
                    </div>
                );
            }
        })
        return base
    }, [activeNameOptions, activeEmailOptions, isPersonType, handleEdit, handleDelete])

    const fetchData = useCallback(async (params) => {
        try {
            const queryParams = { ...params };
            if (queryParams.columnFilters) {
                queryParams.columnFilters = JSON.stringify(queryParams.columnFilters);
            }
            const endpoint = isPersonType ? `/api/rfq/${type}s` : `/api/rfq/lookups/${type}`
            const responseData = await apiClient.get(endpoint, queryParams)
            return responseData;
        } catch (error) {
            console.error("fetchData failed:", error);
            return { success: false, data: [], meta: { total: 0 } }
        }
    }, [type, isPersonType])

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

    const handleExport = async () => {
        try {
            await exportApi.exportModule(type, `${config?.title.replace(/\s+/g, '_').toLowerCase()}_export.xlsx`);
        } catch (error) {
            console.error(`${config?.title} Export failed:`, error);
        }
    };

    if (!config) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-destructive">Invalid Lookup Type</h1>
                <p className="text-muted-foreground mt-2">The requested lookup management page does not exist or has been removed.</p>
            </div>
        )
    }

    return (
        <>
            <PageContainer>
<div className="flex-1 flex flex-col w-full">
                    {view !== "list" && (<div className="flex justify-end mb-4"><div><Button variant="outline" onClick={() => setView("list")}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                            </Button>
                        </div>
                    </div>
                    )}

                    {view === "list" ? (
                        <ProDataTable
                            columns={columns}
                            fetchData={fetchData}
                            onExport={handleExport}
                            onAdd={handleAdd}
                            onAddTooltip={`Add ${config.singular}`}
                            refreshKey={refreshKey}
                            columnFilters={columnFilters}
                            onFilterChange={(newFilters) => setColumnFilters(prev => ({ ...prev, ...newFilters }))}
                        />
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
                
                <ConfirmDialog
                    isOpen={confirmDelete.isOpen}
                    onClose={() => setConfirmDelete({ isOpen: false, id: null })}
                    onConfirm={executeDelete}
                    title={`Delete ${config?.singular}`}
                    description={`Are you sure you want to delete this ${config?.singular}? This action cannot be undone.`}
                    confirmText="Delete"
                    variant="danger"
                />
</PageContainer>
        </>
    )
}

export default RfqLookupManager
