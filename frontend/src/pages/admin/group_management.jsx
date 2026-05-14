import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, ArrowLeft, Pencil, Trash2, ChevronDown, Check, Search, X, Eye, Edit, Archive, Users } from "lucide-react"
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { FormAlert } from "@/components/ui/form-alert"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"

const MultiSelectFilter = ({ options, value, onChange, placeholder, disabled }) => {
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
                    disabled={disabled}
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
                                <span className="truncate">
                                    {options.find(o => o.value === selectedValues[0])?.label || selectedValues[0]}
                                </span>
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

function GroupManagement() {
    const navigate = useNavigate()
    const [formData, setFormData] = useState({
        name: "",
        group_type: "QUALITY",
        user_ids: []
    })
    const [view, setView] = useState("list")
    const [editingId, setEditingId] = useState(null)
    const [refreshKey, setRefreshKey] = useState(0)

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    const [eligibleUsers, setEligibleUsers] = useState([])
    const [isLoadingUsers, setIsLoadingUsers] = useState(false)

    // Selected Group for detail views
    const [selectedGroup, setSelectedGroup] = useState(null)

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [groupToDelete, setGroupToDelete] = useState(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const [toggleDialogOpen, setToggleDialogOpen] = useState(false)
    const [groupToToggle, setGroupToToggle] = useState(null)
    const [isToggling, setIsToggling] = useState(false)

    const [columnFilters, setColumnFilters] = useState({ is_active: ["true"] })
    const [activeFilters, setActiveFilters] = useState({ records: [] })

    const [groupTypes, setGroupTypes] = useState([])

    useEffect(() => {
        const fetchGroupTypes = async () => {
            try {
                const res = await apiClient.get("/api/employee-groups/types")
                if (res.success) setGroupTypes(res.data)
            } catch (err) {
                console.error("Error fetching group types:", err)
            }
        }
        fetchGroupTypes()
    }, [])

    const handleViewClick = useCallback((group) => {
        setSelectedGroup(group)
        setView('members')
    }, [])

    const resetForm = useCallback(() => {
        setFormData({ name: "", group_type: "QUALITY", user_ids: [] })
        setEditingId(null)
        setSelectedGroup(null)
        setError("")
        setSuccess("")
    }, [])

    const handleEdit = useCallback((group) => {
        const userIds = group.users?.map(u => u.user_id.toString()) || []
        setFormData({ name: group.name, group_type: group.group_type, user_ids: userIds })
        setEditingId(group.id)
        setView("create")
        setError("")
        setSuccess("")
    }, [])

    const handleDeleteClick = useCallback((group) => {
        setGroupToDelete(group)
        setDeleteDialogOpen(true)
    }, [])

    const handleToggleClick = useCallback((group) => {
        setGroupToToggle(group)
        setToggleDialogOpen(true)
    }, [])

    const fetchActiveFilters = useCallback(async () => {
        try {
            const res = await apiClient.get("/api/employee-groups/filters")
            if (res.success) setActiveFilters(res.data)
        } catch (err) {
            console.error("Error fetching group filters:", err)
        }
    }, [])

    useEffect(() => {
        if (view === "list") {
            fetchActiveFilters()
        }
    }, [fetchActiveFilters, view, refreshKey])

    const activeGroupNameOptions = useMemo(() => {
        const names = [...new Set((activeFilters.records || []).map(f => f.name))].filter(Boolean).sort()
        return names.map(n => ({ label: n, value: n }))
    }, [activeFilters.records])

    const activeTypeOptions = useMemo(() => {
        const types = [...new Set((activeFilters.records || []).map(f => f.group_type))].filter(Boolean).sort()
        return types.map(t => ({ label: t, value: t }))
    }, [activeFilters.records])

    // Fetch users based on selected group type
    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoadingUsers(true)
            try {
                const targetType = groupTypes.find(t => t.value === formData.group_type)
                const role = targetType?.role || "USER"
                
                const response = await apiClient.get(`/api/users/by-role/${role}`)
                if (response.success) {
                    setEligibleUsers(response.data || [])
                }
            } catch (err) {
                console.error("Error fetching eligible users:", err)
            } finally {
                setIsLoadingUsers(false)
            }
        }
        if (view === "create" && formData.group_type) {
            fetchUsers()
        }
    }, [view, formData.group_type])

    const userOptions = useMemo(() => {
        return eligibleUsers.map(user => ({
            value: user.id.toString(),
            label: `${user.name} (${user.empid})`
        }))
    }, [eligibleUsers])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }))
        if (error) setError("")
    }

    const handleTypeChange = (value) => {
        setFormData(prev => ({
            ...prev,
            group_type: value,
            user_ids: [] // Reset users when type changes
        }))
        if (error) setError("")
    }

    const handleUserChange = (userIds) => {
        setFormData(prev => ({
            ...prev,
            user_ids: userIds
        }))
        if (error) setError("")
    }

    const fetchGroups = useCallback(async (params) => {
        try {
            const queryParams = { ...params };
            if (queryParams.columnFilters) {
                queryParams.columnFilters = JSON.stringify(queryParams.columnFilters);
            }
            const responseData = await apiClient.get('/api/employee-groups', queryParams)
            return responseData;
        } catch (err) {
            console.error("Error fetching employee groups:", err)
            return { success: false, data: [], meta: {} }
        }
    }, [])

    const columns = useMemo(() => [
        {
            accessorKey: "name",
            header: "Group Name",
            filterType: "select",
            isMulti: true,
            filterOptions: activeGroupNameOptions
        },
        {
            accessorKey: "group_type",
            header: "Type",
            filterType: "select",
            isMulti: true,
            filterOptions: activeTypeOptions,
            cell: (row) => (
                <Badge variant="outline" className="capitalize">
                    {row.group_type?.toLowerCase() || "N/A"}
                </Badge>
            )
        },
        {
            accessorKey: "createdAt",
            header: "Created At",
            cell: (row) => new Date(row.createdAt).toLocaleDateString(),
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
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewClick(row)}
                        title="View members"
                        className="cursor-pointer"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(row)}
                        title="Edit"
                        className="cursor-pointer"
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Switch 
                        checked={row.is_active} 
                        onCheckedChange={() => handleToggleClick(row)}
                        title={row.is_active ? "Deactivate" : "Activate"}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive cursor-pointer hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                        onClick={() => handleDeleteClick(row)}
                        title="Archive"
                    >
                        <Archive className="h-4 w-4" />
                        Archive
                    </Button>
                </div>
            ),
            enableSorting: false,
        },
    ], [handleViewClick, handleEdit, handleDeleteClick, handleToggleClick, activeGroupNameOptions, activeTypeOptions])

    const memberColumns = useMemo(() => [
        {
            accessorKey: "user.name",
            header: "Employee Name",
            cell: (row) => row.user?.name || "N/A"
        },
        {
            accessorKey: "user.empid",
            header: "Employee ID",
            cell: (row) => row.user?.empid || "N/A"
        },
        {
            accessorKey: "user.user_roles",
            header: "Role",
            cell: (row) => row.user?.user_roles?.[0]?.role?.name || "N/A"
        }
    ], [])

    const fetchMembersData = useCallback(async ({ page, limit, search }) => {
        if (!selectedGroup || !selectedGroup.users) return { data: [], meta: { total: 0, page: 1, totalPages: 1 } }
        
        let filtered = [...selectedGroup.users]
        if (search) {
            const lowSearch = search.toLowerCase()
            filtered = filtered.filter(u => 
                (u.user?.name || "").toLowerCase().includes(lowSearch) ||
                (u.user?.empid || "").toLowerCase().includes(lowSearch)
            )
        }

        const total = filtered.length
        const totalPages = Math.ceil(total / limit) || 1
        const paginated = filtered.slice((page - 1) * limit, page * limit)

        return {
            data: paginated,
            meta: { total, page, totalPages }
        }
    }, [selectedGroup])

    const confirmDelete = async () => {
        if (!groupToDelete) return
        setIsDeleting(true)
        try {
            await apiClient.delete(`/api/employee-groups/${groupToDelete.id}`)
            setRefreshKey(prev => prev + 1)
        } catch (err) {
            console.error("Error deleting group:", err)
            setError(err.message || "Error deleting group")
        } finally {
            setIsDeleting(false)
            setDeleteDialogOpen(false)
            setGroupToDelete(null)
        }
    }

    const confirmToggle = async () => {
        if (!groupToToggle) return
        setIsToggling(true)
        try {
            await apiClient.patch(`/api/employee-groups/toggle-status/${groupToToggle.id}`)
            setRefreshKey(prev => prev + 1)
        } catch (err) {
            console.error("Error toggling group status:", err)
            setError(err.message || "Error toggling status")
        } finally {
            setIsToggling(false)
            setToggleDialogOpen(false)
            setGroupToToggle(null)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        setSuccess("")
        setIsLoading(true)

        if (formData.user_ids.length === 0) {
            setError("Please select at least one member")
            setIsLoading(false)
            return
        }

        try {
            if (editingId) {
                await apiClient.put(`/api/employee-groups/${editingId}`, formData)
            } else {
                await apiClient.post("/api/employee-groups", formData)
            }

            setSuccess(editingId ? "Group updated successfully!" : "Group created successfully!")

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

    const handleExport = async () => {
        try {
            // Use existing export utility if available or generic
            await exportApi.exportQcGroups() // Temporary: replace with generic if needed
        } catch (err) {
            console.error("Export failed", err)
        }
    }

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
                                {view === "members" ? `Members: ${selectedGroup?.name}` : (editingId ? "Update Group" : "Create Group")}
                            </h1>
                            <p className="text-muted-foreground">
                                {view === "members"
                                    ? "Personnel assigned to this group."
                                    : "Define a group and assign employees to it."}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {view === "members" && (
                                <Button variant="outline" onClick={() => handleEdit(selectedGroup)}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit Group
                                </Button>
                            )}
                            <Button variant="outline" onClick={() => { resetForm(); setView("list"); }}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                            </Button>
                        </div>
                    </div>
                    )}

                    {view === "list" ? (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h1 className="text-2xl font-bold">Group Management</h1>
                                    <p className="text-sm text-muted-foreground">Manage Quality, Production, and other multi-user groups.</p>
                                </div>
                            </div>
                            {error && (
                                <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                    {error}
                                </div>
                            )}
                            <ProDataTable
                                columns={columns}
                                fetchData={fetchGroups}
                                onAdd={() => { resetForm(); setView("create"); }}
                                onAddTooltip="Create New Group"
                                onExport={handleExport}
                                refreshKey={refreshKey}
                                columnFilters={columnFilters}
                                onFilterChange={(newFilters) => setColumnFilters(prev => ({ ...prev, ...newFilters }))}
                            />
                        </>
                    ) : view === "members" ? (
                        <ProDataTable
                            columns={memberColumns}
                            fetchData={fetchMembersData}
                            refreshKey={refreshKey}
                        />
                    ) : (
                        <div className="w-full">
                            <form onSubmit={handleSubmit}>
                                <div className="grid gap-6">
                                    <Card className="w-full border-primary/20 shadow-lg">
                                        <CardHeader className="bg-primary/5">
                                            <CardTitle className="flex items-center gap-2 text-primary">
                                                <Users className="h-5 w-5" />
                                                Group Configuration
                                            </CardTitle>
                                            <CardDescription>
                                                Configure group name, type, and assigned members
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6 pt-6">
                                            {error && <FormAlert type="error" message={error} />}
                                            {success && <FormAlert type="success" message={success} />}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label htmlFor="type">
                                                        Group Type <span className="text-destructive">*</span>
                                                    </Label>
                                                    <Select 
                                                        value={formData.group_type} 
                                                        onValueChange={handleTypeChange}
                                                        disabled={isLoading || !!editingId}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select Group Type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {groupTypes.map(type => (
                                                                <SelectItem key={type.value} value={type.value}>
                                                                    {type.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="name">
                                                        Group Name <span className="text-destructive">*</span>
                                                    </Label>
                                                    <Input
                                                        id="name"
                                                        name="name"
                                                        type="text"
                                                        placeholder="e.g. Mechanical QC Team A"
                                                        value={formData.name}
                                                        onChange={handleInputChange}
                                                        required
                                                        disabled={isLoading}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="users">
                                                    Assigned Members <span className="text-destructive">*</span>
                                                </Label>
                                                <MultiSelectFilter
                                                    options={userOptions}
                                                    value={formData.user_ids}
                                                    onChange={handleUserChange}
                                                    placeholder={isLoadingUsers ? "Loading eligible users..." : `Select ${formData.group_type.toLowerCase()} members`}
                                                    disabled={isLoadingUsers}
                                                />
                                                <p className="text-[11px] text-muted-foreground mt-1">
                                                    Only users with the relevant role for this group type are shown.
                                                </p>
                                            </div>
                                        </CardContent>
                                        <div className="flex justify-end gap-4 p-6 pt-0">
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                disabled={isLoading}
                                                onClick={() => { resetForm(); setView("list"); }}
                                            >
                                                Cancel
                                            </Button>
                                            <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90">
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

          {/* Dialogs */}
          <ConfirmDialog
            isOpen={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            onConfirm={confirmDelete}
            title="Archive Group"
            description={<span>Are you sure you want to archive the group <strong>{groupToDelete?.name}</strong>? This action will remove it from the active list.</span>}
            confirmText="Archive"
            variant="danger"
            isLoading={isDeleting}
          />

          <ConfirmDialog 
            isOpen={toggleDialogOpen}
            onClose={() => setToggleDialogOpen(false)}
            onConfirm={confirmToggle}
            title={groupToToggle?.is_active ? "Deactivate Group" : "Activate Group"}
            description={<span>Confirm {groupToToggle?.is_active ? "deactivation" : "activation"} for <strong>{groupToToggle?.name}</strong>.</span>}
            confirmText={groupToToggle?.is_active ? "Deactivate" : "Activate"}
            variant="warning"
            isLoading={isToggling}
          />
        </>
    )
}

export default GroupManagement
