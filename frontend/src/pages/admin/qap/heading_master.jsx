import React, { useState, useCallback, useMemo } from "react"
import { toast } from "react-toastify"
import apiClient from "@/api/api.client"
import ProDataTable from "@/components/shared/ProDataTable"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { 
    Trash2, 
    Edit2, 
    Plus,
    SquarePen,
    Eye,
    ArrowLeft
} from "lucide-react"

const HeadingMaster = () => {
    const [view, setView] = useState("list") // "list" or "form"
    const [refreshKey, setRefreshKey] = useState(0)
    const [editingHeading, setEditingHeading] = useState(null)
    const [formData, setFormData] = useState({ name: "", is_active: true })
    const [submitting, setSubmitting] = useState(false)
    const [confirmData, setConfirmData] = useState({ isOpen: false })

    // Fetch Headings for ProDataTable
    const fetchData = useCallback(async (params) => {
        try {
            const res = await apiClient.get("/api/qap/master-headings/list", { params })
            return {
                data: res.data || [],
                meta: { total: res.data?.length || 0, page: 1, totalPages: 1 }
            }
        } catch (error) {
            console.error("Fetch error:", error)
            return { data: [], meta: { total: 0 } }
        }
    }, [])

    const handleAdd = () => {
        setEditingHeading(null)
        setFormData({ name: "", is_active: true })
        setView("form")
    }

    const handleEdit = (heading) => {
        setEditingHeading(heading)
        setFormData({ name: heading.name, is_active: heading.is_active })
        setView("form")
    }

    const handleBackToList = () => {
        setView("list")
        setEditingHeading(null)
        setFormData({ name: "", is_active: true })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.name.trim()) {
            toast.error("Heading name is required")
            return
        }

        try {
            setSubmitting(true)
            if (editingHeading) {
                await apiClient.put(`/api/qap/master-headings/update/${editingHeading.id}`, formData)
                toast.success("Heading updated successfully")
            } else {
                await apiClient.post("/api/qap/master-headings/create", formData)
                toast.success("Heading created successfully")
            }
            handleBackToList()
            setRefreshKey(prev => prev + 1)
        } catch (error) {
            toast.error(error.message || "Failed to save heading")
        } finally {
            setSubmitting(false)
        }
    }

    const handleToggleStatus = (heading) => {
        setConfirmData({
            isOpen: true,
            title: heading.is_active ? "Deactivate Heading" : "Activate Heading",
            description: `Are you sure you want to ${heading.is_active ? "deactivate" : "activate"} the heading "${heading.name}"?`,
            confirmText: heading.is_active ? "Deactivate" : "Activate",
            variant: heading.is_active ? "warning" : "success",
            onConfirm: async () => {
                try {
                    await apiClient.put(`/api/qap/master-headings/update/${heading.id}`, {
                        is_active: !heading.is_active
                    })
                    toast.success("Status updated successfully")
                    setRefreshKey(prev => prev + 1)
                } catch (error) {
                    toast.error(error.message || "Failed to update status")
                } finally {
                    setConfirmData({ isOpen: false })
                }
            }
        })
    }

    const handleDelete = (heading) => {
        setConfirmData({
            isOpen: true,
            title: "Archive Heading",
            description: `Are you sure you want to archive the heading "${heading.name}"? This action cannot be undone.`,
            confirmText: "Archive",
            variant: "danger",
            onConfirm: async () => {
                try {
                    await apiClient.delete(`/api/qap/master-headings/delete/${heading.id}`)
                    toast.success("Heading archived successfully")
                    setRefreshKey(prev => prev + 1)
                } catch (error) {
                    toast.error(error.message || "Failed to archive heading")
                } finally {
                    setConfirmData({ isOpen: false })
                }
            }
        })
    }

    const columns = useMemo(() => [
        {
            header: "ACTIVITY HEADING NAME",
            accessorKey: "name",
            className: "font-semibold text-slate-900 min-w-[300px]",
        },
        {
            header: "CREATED AT",
            accessorKey: "createdAt",
            width: "150px",
            cell: (row) => <span className="text-slate-500">{new Date(row.createdAt).toLocaleDateString("en-GB")}</span>
        },
        {
            header: "ACTIVE",
            accessorKey: "is_active",
            width: "140px",
            cell: (row) => (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Switch 
                        checked={row.is_active} 
                        onCheckedChange={() => handleToggleStatus(row)}
                        className={`${row.is_active ? 'data-[state=checked]:bg-emerald-500' : 'data-[state=unchecked]:bg-amber-500'}`}
                    />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${row.is_active ? "text-emerald-600" : "text-amber-600"}`}>
                        {row.is_active ? "Active" : "Inactive"}
                    </span>
                </div>
            )
        },
        {
            header: "ACTIONS",
            id: "actions",
            width: "350px",
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(row)} 
                        className="h-8 gap-1.5 border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-100 hover:bg-blue-50 shadow-none font-semibold px-3"
                    >
                        <SquarePen className="h-4 w-4" /> Edit
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDelete(row)} 
                        className="h-8 gap-1.5 border-slate-200 text-red-600 hover:border-red-100 hover:bg-red-50 shadow-none font-semibold px-3"
                    >
                        <Trash2 className="h-4 w-4" /> Archive
                    </Button>
                </div>
            )
        }
    ], [])

    return (
        <div className="flex flex-col h-screen bg-slate-50/30">
            {/* App Header */}
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white">
                <SidebarTrigger className="-ml-1" />
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto p-6 flex flex-col">
                <div className="flex-1 flex flex-col w-full">
                    {/* Page Header Section */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                                {view === "list" ? "Activity Heading Master" : (editingHeading ? "Edit Activity Heading" : "Create Activity Heading")}
                            </h2>
                        </div>
                        {view === "form" && (
                            <Button variant="outline" onClick={handleBackToList} className="h-9 gap-2">
                                <ArrowLeft className="h-4 w-4" /> Back to List
                            </Button>
                        )}
                    </div>

                    {/* Content Section */}
                    {view === "list" ? (
                        <div className="flex-1 flex flex-col min-h-0">
                            <ProDataTable
                                columns={columns}
                                fetchData={fetchData}
                                refreshKey={refreshKey}
                                onAdd={handleAdd}
                                onAddTooltip="Add New Heading"
                                onExport={() => {}}
                                globalSearchPlaceholder="Search heading name..."
                            />
                        </div>
                    ) : (
                        <Card className="w-full border-slate-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-xl font-bold text-slate-900">
                                    {editingHeading ? "Update Heading" : "New Activity Heading"}
                                </CardTitle>
                                <CardDescription>Enter the activity heading details</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6 w-full">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-sm font-semibold text-slate-700">Heading Name</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g. Welding, NDE & QC Procedures"
                                            className="h-10 border-slate-200 focus:ring-slate-900 w-full"
                                            required
                                            disabled={submitting}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 w-full">
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            onClick={handleBackToList} 
                                            disabled={submitting}
                                            className="h-10 px-6"
                                        >
                                            Cancel
                                        </Button>
                                        <Button 
                                            type="submit" 
                                            disabled={submitting} 
                                            className="h-10 bg-slate-900 hover:bg-slate-800 text-white px-8 font-semibold"
                                        >
                                            {submitting ? "Saving..." : (editingHeading ? "Update Heading" : "Save Heading")}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>

            <ConfirmDialog
                isOpen={confirmData.isOpen}
                title={confirmData.title}
                description={confirmData.description}
                confirmText={confirmData.confirmText}
                variant={confirmData.variant}
                onConfirm={confirmData.onConfirm}
                onCancel={() => setConfirmData({ isOpen: false })}
                isLoading={confirmData.isLoading}
            />
        </div>
    )
}

export default HeadingMaster
