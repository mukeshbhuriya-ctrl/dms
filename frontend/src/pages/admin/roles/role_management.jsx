import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Trash2, ArrowLeft, MoreHorizontal, Save } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import ProDataTable from "@/components/shared/ProDataTable"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import apiClient from "@/api/api.client"
import PermissionMatrix from "@/components/iam/permission_matrix"
import { policiesToMatrix, matrixToPolicies } from "@/config/permissions"
import { MENU_CONFIG } from "@/config/roles"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"

export default function RoleManagement() {
  const [roles, setRoles] = useState([])
  const [view, setView] = useState("list")
  const [editingRole, setEditingRole] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    identifier: "",
    description: "",
    policies: []
  })

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  

  const fetchRoles = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/users/get-roles')
      setRoles(response?.data || [])
      return { success: true, data: response?.data || [], meta: { total: (response?.data || []).length } }
    } catch (err) {
      console.error("Error fetching roles:", err)
      return { success: false, data: [], meta: {} }
    }
  }, [])

  const resetForm = () => {
    setFormData({
      name: "",
      identifier: "",
      description: "",
      policies: []
    })
    setEditingRole(null)
  }

  const openForm = (role = null) => {
    if (role) {
      setEditingRole(role)
      setFormData({
        name: role.name || "",
        identifier: role.identifier || "",
        description: role.description || "",
        policies: role.policies || []
      })
    } else {
      resetForm()
    }
    setView("create")
  }

  const handleDeleteClick = (role) => {
    setRoleToDelete(role)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!roleToDelete) return
    setIsDeleting(true)
    try {
      await apiClient.delete(`/api/users/delete-role/${roleToDelete.id}`)
      toast.success("Role deleted successfully")
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      toast.error(error.message || "Failed to delete role")
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setRoleToDelete(null)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleMatrixChange = (moduleId, action, state) => {
    setFormData(prev => {
      const currentMatrix = policiesToMatrix(prev.policies || [], []);
      if (!currentMatrix[moduleId]) currentMatrix[moduleId] = {};
      currentMatrix[moduleId][action] = state;
      const newPolicies = matrixToPolicies(currentMatrix, false);
      return { ...prev, policies: newPolicies };
    });
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const requestBody = {
        name: formData.name,
        identifier: formData.identifier,
        description: formData.description,
        policies: formData.policies
      }

      if (editingRole) {
        await apiClient.put(`/api/users/update-role/${editingRole.id}`, requestBody)
        toast.success("Role updated successfully")
      } else {
        await apiClient.post("/api/users/create-role", requestBody)
        toast.success("Role created successfully")
      }

      resetForm()
      setView("list")
      setRefreshKey(prev => prev + 1)
    } catch (err) {
      toast.error(err?.message || "Failed to save role")
    } finally {
      setIsLoading(false)
    }
  }

  const columns = useMemo(() => [
    {
      accessorKey: "name",
      header: "Role Name",
      cell: (row) => <span className="font-medium">{row.name}</span>
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: (row) => row.description || <span className="text-muted-foreground italic">No description</span>
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: (row) => row.is_system_role 
        ? <Badge variant="secondary" className="bg-slate-100 text-slate-700">System Role</Badge>
        : <Badge variant="outline" className="text-blue-600">Custom Role</Badge>
    },
    {
      id: "actions",
      header: "Actions",
      width: "60px",
      cell: (row) => {
        const actions = [
          { label: "Edit Role", icon: Edit, onClick: () => openForm(row) }
        ];

        if (!row.is_system_role && (row._count?.user_roles || 0) === 0) {
          actions.push({ type: "separator" });
          actions.push({ label: "Delete Role", icon: Trash2, color: "danger", onClick: () => handleDeleteClick(row) });
        }

        return (
          <div className="flex items-center justify-center">
            <DataTableRowActions actions={actions} />
          </div>
        );
      },
      enableSorting: false,
    }
  ], [])

  return (
    <main className="flex-1 flex flex-col overflow-auto p-6">
      <div className="w-full flex-1 flex flex-col">
        {view === "list" ? (
          <>            
            <ProDataTable
              columns={columns}
              fetchData={fetchRoles}
              onAdd={() => openForm()}
              onAddTooltip="Create Role"
              refreshKey={refreshKey}
              searchPlaceholder="Search roles..."
            />
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{editingRole ? "Edit Role" : "Create New Role"}</h2>
                <p className="text-muted-foreground">
                  {editingRole 
                    ? "Update role details and customize permissions."
                    : "Define a new role and its module access permissions."
                  }
                </p>
              </div>
              <Button variant="outline" onClick={() => { resetForm(); setView("list"); }}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Roles
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Role Details</CardTitle>
                  <CardDescription>Basic information about the role.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Role Name <span className="text-destructive">*</span></Label>
                      <Input 
                        id="name" 
                        name="name" 
                        placeholder="e.g. Sales Manager" 
                        value={formData.name} 
                        onChange={handleInputChange} 
                        required 
                        disabled={isLoading} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="identifier">Role Identifier <span className="text-destructive">*</span></Label>
                      <Input 
                        id="identifier" 
                        name="identifier" 
                        placeholder="e.g. SALES_MANAGER" 
                        value={formData.identifier} 
                        onChange={handleInputChange} 
                        required 
                        disabled={isLoading || editingRole?.is_system_role} 
                        className="uppercase"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Input 
                        id="description" 
                        name="description" 
                        placeholder="Role description" 
                        value={formData.description} 
                        onChange={handleInputChange} 
                        disabled={isLoading} 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Permissions</CardTitle>
                  <CardDescription>Define what actions users with this role can perform across different modules.</CardDescription>
                </CardHeader>
                <CardContent>
                  <PermissionMatrix 
                    matrixState={policiesToMatrix(formData.policies, [])}
                    onChange={handleMatrixChange}
                    disabled={isLoading}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => { resetForm(); setView("list"); }} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="submit" className="cursor-pointer" disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Saving..." : (editingRole ? "Save Changes" : "Create Role")}
                </Button>
              </div>
            </form>
          </div>
        )}

        <ConfirmDialog
          isOpen={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={confirmDelete}
          title="Delete Role"
          description={<span>Are you sure you want to delete the role <strong>{roleToDelete?.name}</strong>? This action cannot be undone.</span>}
          confirmText="Delete"
          variant="danger"
          isLoading={isDeleting}
        />
      </div>
    </main>
  )
}
