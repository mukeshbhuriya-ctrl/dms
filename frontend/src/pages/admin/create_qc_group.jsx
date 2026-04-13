import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, ArrowLeft, Pencil, Trash2, ChevronDown, Check, Search, X } from "lucide-react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { DataTable } from "@/components/shared/DataTable"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
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

const MultiSelectFilter = ({ options, value, onChange, placeholder }) => {
    const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleOption = (val) => {
        const newVal = selectedValues.includes(val)
            ? selectedValues.filter(v => v !== val)
            : [...selectedValues, val];
        onChange(newVal);
    };

    const clearFilters = (e) => {
        e.stopPropagation();
        onChange([]);
        setSearchTerm("");
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="h-10 text-sm font-normal w-full justify-between px-3 bg-white"
                >
                    <div className="flex items-center gap-2 truncate mr-1">
                        {selectedValues.length === 0 ? (
                            <span className="text-slate-400">{placeholder}</span>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm text-[11px]">
                                    {selectedValues.length}
                                </span>
                                <span className="truncate">{options.find(o => o.value === selectedValues[0])?.label}</span>
                                {selectedValues.length > 1 && <span className="text-slate-400">...</span>}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center">
                        {selectedValues.length > 0 && (
                            <X
                                className="h-4 w-4 mr-2 text-slate-400 hover:text-slate-600 pointer-events-auto"
                                onClick={clearFilters}
                            />
                        )}
                        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <div className="flex flex-col h-[300px]">
                    <div className="p-2 border-b">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search..."
                                className="h-9 pl-8 text-sm shadow-none border-none focus-visible:ring-0"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
                        {filteredOptions.length === 0 ? (
                            <div className="p-4 text-sm text-center text-slate-500">No results found.</div>
                        ) : (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt.value}
                                    className="flex items-center space-x-2 px-2 py-2 hover:bg-slate-100 rounded-sm cursor-pointer"
                                    onClick={() => toggleOption(opt.value)}
                                >
                                    <Checkbox
                                        checked={selectedValues.includes(opt.value)}
                                        onCheckedChange={() => toggleOption(opt.value)}
                                        className="h-4 w-4"
                                    />
                                    <span className="text-sm truncate flex-1">{opt.label}</span>
                                    {selectedValues.includes(opt.value) && <Check className="h-4 w-4 text-primary shrink-0" />}
                                </div>
                            ))
                        )}
                    </div>
                    {selectedValues.length > 0 && (
                        <div className="p-2 border-t mt-auto">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full h-8 text-xs text-slate-500 hover:text-red-600"
                                onClick={clearFilters}
                            >
                                Clear Selections
                            </Button>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

function CreateQcGroup() {
    const navigate = useNavigate()
    const [formData, setFormData] = useState({
        name: "",
        user_ids: []
    })
    const [view, setView] = useState("list")
    const [editingId, setEditingId] = useState(null)
    const [refreshKey, setRefreshKey] = useState(0)

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    const [qcEngineers, setQcEngineers] = useState([])
    const [isLoadingEngineers, setIsLoadingEngineers] = useState(false)

    // Delete Dialog State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [groupToDelete, setGroupToDelete] = useState(null)

    // Fetch QC Engineers for selection
    useEffect(() => {
        const fetchEngineers = async () => {
            setIsLoadingEngineers(true)
            try {
                // Fetch only QC_ENGINEER role as requested
                const response = await apiClient.get('/api/users/by-role/QC_ENGINEER')
                if (response.success) {
                    setQcEngineers(response.data || [])
                }
            } catch (err) {
                console.error("Error fetching QC engineers:", err)
            } finally {
                setIsLoadingEngineers(false)
            }
        }
        if (view === "create") {
            fetchEngineers()
        }
    }, [view])

    // Options for SearchableSelect
    const engineerOptions = useMemo(() => {
        return qcEngineers.map(user => ({
            value: user.id.toString(),
            label: `${user.name} (${user.empid})`
        }))
    }, [qcEngineers])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }))
        if (error) setError("")
    }

    const handleEngineerChange = (userIds) => {
        setFormData(prev => ({
            ...prev,
            user_ids: userIds
        }))
        if (error) setError("")
    }

    // Fetch QC Groups
    const fetchQcGroups = useCallback(async ({ page, limit, search, sorting }) => {
        try {
            const params = { page, limit }
            if (search) params.search = search
            if (sorting && sorting.length > 0) {
                params.sortBy = sorting[0].id
                params.sortOrder = sorting[0].desc ? "desc" : "asc"
            }

            const responseData = await apiClient.get('/api/qc-groups', params)

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
            console.error("Error fetching QC groups:", err)
            return { data: [], meta: {} }
        }
    }, [])

    const columns = useMemo(() => [
        {
            accessorKey: "name",
            header: "Group Name",
        },
        {
            id: "engineers",
            header: "QC Engineers",
            cell: (row) => {
                const names = row.users?.map(u => u.user?.name).filter(Boolean) || []
                if (names.length === 0) return "No engineers assigned"
                if (names.length <= 2) return names.join(", ")
                return `${names.slice(0, 2).join(", ")} + ${names.length - 2} more`
            }
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

    const handleEdit = (group) => {
        const userIds = group.users?.map(u => u.user_id.toString()) || []
        setFormData({ name: group.name, user_ids: userIds })
        setEditingId(group.id)
        setView("create")
        setError("")
        setSuccess("")
    }

    const handleDeleteClick = (group) => {
        setGroupToDelete(group)
        setDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        if (!groupToDelete) return

        try {
            await apiClient.delete(`/api/qc-groups/${groupToDelete.id}`)
            setRefreshKey(prev => prev + 1)
        } catch (err) {
            console.error("Error deleting QC group:", err)
            alert(err.message || "Error deleting QC group")
        } finally {
            setDeleteDialogOpen(false)
            setGroupToDelete(null)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        setSuccess("")
        setIsLoading(true)

        if (formData.user_ids.length === 0) {
            setError("Please select at least one QC Engineer")
            setIsLoading(false)
            return
        }

        try {
            if (editingId) {
                await apiClient.put(`/api/qc-groups/${editingId}`, formData)
            } else {
                await apiClient.post("/api/qc-groups", formData)
            }

            setSuccess(editingId ? "QC Group updated successfully!" : "QC Group created successfully!")

            setTimeout(() => {
                setSuccess("")
                setView("list")
                setFormData({ name: "", user_ids: [] })
                setEditingId(null)
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
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
            </header>
            <main className="flex-1 flex flex-col overflow-auto p-6">
                <div className="w-full flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">
                                {view === "list" ? "Manage QC Groups" : (editingId ? "Update QC Group" : "Create QC Group")}
                            </h1>
                            <p className="text-muted-foreground">
                                {view === "list"
                                    ? "List of all defined QC groups"
                                    : "Define a group and assign QC Engineers to it."}
                            </p>
                        </div>
                        <div>
                            {view === "list" ? (
                                <Button onClick={() => {
                                    setFormData({ name: "", user_ids: [] })
                                    setEditingId(null)
                                    setView("create")
                                }}>
                                    <Plus className="mr-2 h-4 w-4" /> Create QC Group
                                </Button>
                            ) : (
                                <Button variant="outline" onClick={() => {
                                    setView("list")
                                    setEditingId(null)
                                    setFormData({ name: "", user_ids: [] })
                                }}>
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                                </Button>
                            )}
                        </div>
                    </div>

                    {view === "list" ? (
                        <Card className="flex-1 flex flex-col">
                            <CardHeader>
                                <CardTitle>QC Groups</CardTitle>
                                <CardDescription>
                                    View and manage QC group definitions.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <DataTable
                                    columns={columns}
                                    fetchData={fetchQcGroups}
                                    refreshKey={refreshKey}
                                />
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="w-full">
                            <form onSubmit={handleSubmit}>
                                <div className="grid gap-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>QC Group Details</CardTitle>
                                            <CardDescription>
                                                Select QC Engineers to proceed
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            {error && <FormAlert type="error" message={error} />}
                                            {success && <FormAlert type="success" message={success} />}

                                            <div className="space-y-2">
                                                <Label htmlFor="name">
                                                    Group Name <span className="text-destructive">*</span>
                                                </Label>
                                                <Input
                                                    id="name"
                                                    name="name"
                                                    type="text"
                                                    placeholder="e.g. Mechanical QC Team"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    required
                                                    disabled={isLoading}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="qcEngineers">
                                                    QC Engineers <span className="text-destructive">*</span>
                                                </Label>
                                                <MultiSelectFilter
                                                    options={engineerOptions}
                                                    value={formData.user_ids}
                                                    onChange={handleEngineerChange}
                                                    placeholder={isLoadingEngineers ? "Loading engineers..." : "Select QC Engineers"}
                                                />
                                            </div>
                                        </CardContent>
                                        <div className="flex justify-end gap-4 p-6 pt-0">
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                disabled={isLoading}
                                                onClick={() => {
                                                    setView("list")
                                                    setEditingId(null)
                                                    setFormData({ name: "", user_ids: [] })
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                            <Button type="submit" disabled={isLoading}>
                                                {isLoading ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update Group" : "Create Group")}
                                            </Button>
                                        </div>
                                    </Card>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </main>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete QC Group</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the group <strong>{groupToDelete?.name}</strong>?
                            This action cannot be undone and will remove all engineer mappings for this group.
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

export default CreateQcGroup
