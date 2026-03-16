import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { AdminSidebar } from "@/components"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Plus, ArrowLeft, Pencil, Trash2 } from "lucide-react"
import { ChevronDownIcon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"

function CreateUser() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    employeeId: "",
    department: "",
    designation: "",
    mobileNumber: "",
    roles: [],
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [roles, setRoles] = useState([])
  const [departments, setDepartments] = useState([])
  const [departmentMap, setDepartmentMap] = useState({}) // ID -> Name map
  const [view, setView] = useState("list") // 'list' or 'create'
  const [editingId, setEditingId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)

  // DataTable State
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageCount, setPageCount] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [sorting, setSorting] = useState([])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error when user starts typing
    if (error) setError("")
  }

  // Fetch roles and departments
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Roles
        const rolesPayload = await apiClient.get('/api/users/get-roles');
        setRoles(rolesPayload?.data || []);

        // Fetch Departments
        const deptsPayload = await apiClient.get('/api/departments');
        const fetchedDepts = deptsPayload?.data || [];
        setDepartments(fetchedDepts);
        
        // Create ID -> Name Map
        const map = {};
        fetchedDepts.forEach(d => {
          map[d.id] = d.name;
          map[d.name] = d.name;
        });
        setDepartmentMap(map);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    }
    fetchData();
  }, []);

  // Fetch Users for DataTable
  const fetchUsers = useCallback(async ({ page, limit, search, sorting }) => {
    try {
      setLoading(true)
      const params = { page, limit }
      if (search) params.search = search
      if (sorting && sorting.length > 0) {
        params.sortBy = sorting[0].id
        params.sortOrder = sorting[0].desc ? "desc" : "asc"
      }

      const responseData = await apiClient.get('/api/users/get-users', params)

      if (responseData.success) {
        return {
          data: responseData.data || [],
          meta: responseData.meta || {}
        }
      } else {
        console.error("Failed to fetch users", responseData)
        return { data: [], meta: {} }
      }
    } catch (err) {
      console.error("Error fetching users:", err)
      return { data: [], meta: {} }
    } finally {
      setLoading(false)
    }
  }, [])

  const handleEdit = (user) => {
    setEditingId(user.id)
    // user.department might be ID or Name. The Select expects Name.
    // Use departmentMap to ensure we get the Name if it's an ID.
    // If it's already a name, the map (ID->Name AND Name->Name) handles it or we fallback to user.department
    const deptName = departmentMap[user.department] || user.department || "";

    setFormData({
      fullName: user.name || "",
      email: user.email || "",
      employeeId: user.empid || "",
      department: user.department_id || "",
      designation: user.designation || "",
      mobileNumber: user.mobile || "",
      roles: user.user_roles?.map(ur => ur.role_id) || [], // Map to Role IDs
      password: "", // Leave blank usually
    })
    setView("create")
    setError("")
    setSuccess("")
  }

  const handleDeleteClick = (user) => {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!userToDelete) return

    try {
      await apiClient.delete(`/api/users/delete-user/${userToDelete.id}`)
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      console.error("Delete user error", error)
      alert(error.message || "Failed to delete user")
    } finally {
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  const columns = useMemo(() => [
    {
      accessorKey: "empid",
      header: "Employee ID",
      cell: (row) => row.empid || "-",
    },
    {
      accessorKey: "name",
      header: "Full Name",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: (row) => {
        return row.department?.name || "-";
      },
    },
    {
      accessorKey: "roles",
      header: "Role",
      cell: (row) => {
        return row.user_roles?.map((ur) => ur.role?.name).join(", ") || "No Role"
      },
      enableSorting: false,
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
    }
  ], [departmentMap])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      const requestBody = {
        name: formData.fullName,
        email: formData.email,
        empid: formData.employeeId,
        mobile: formData.mobileNumber,
        password: formData.password,
        role_ids: formData.roles || [],
        department: formData.department,
        designation: formData.designation,
      }

      let payload;
      if (editingId) {
        payload = await apiClient.put(`/api/users/update-user/${editingId}`, requestBody)
      } else {
        payload = await apiClient.post("/api/users/create-user", requestBody)
      }

      setSuccess(editingId ? "User updated successfully!" : "User created successfully!")

      // Refresh list and switch view
      setTimeout(() => {
        setSuccess("")
        setView("list")
        setFormData({
          fullName: "",
          email: "",
          employeeId: "",
          department: "",
          designation: "",
          mobileNumber: "",
          roles: [],
          password: "",
        })
        setEditingId(null)
        setRefreshKey(prev => prev + 1)
      }, 1000)

    } catch (err) {
      setError(err?.message || "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      await exportApi.exportUsers();
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
                  {view === "list" ? "Users List" : (editingId ? "Edit User" : "Create User")}
                </h1>
                <p className="text-muted-foreground">
                  {view === "list"
                    ? "List of all users in the system"
                    : "Fill in the user information below."}
                </p>
              </div>
              <div>
                {view === "list" ? (
                  <Button onClick={() => {
                    setFormData({
                      fullName: "",
                      email: "",
                      employeeId: "",
                      department: "",
                      designation: "",
                      mobileNumber: "",
                      roles: [],
                      password: "",
                    })
                    setEditingId(null)
                    setView("create")
                  }}>
                    <Plus className="mr-2 h-4 w-4" /> Create User
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
                  <CardTitle>Users</CardTitle>
                  <CardDescription>
                    View and manage system users.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <DataTable
                    columns={columns}
                    fetchData={fetchUsers}
                    onExport={handleExport}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <form onSubmit={handleSubmit}>
                  <Card>
                    <CardHeader>
                      <CardTitle>{editingId ? "Edit User" : "User Information"}</CardTitle>
                      <CardDescription>
                        {editingId ? "Update user details" : "Enter the details for the new user account"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {error && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {error}
                        </div>
                      )}

                      {success && (
                        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
                          {success}
                        </div>
                      )}

                      {/* Full Name */}
                      <div className="space-y-2">
                        <Label htmlFor="fullName">
                          Full Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="fullName"
                          name="fullName"
                          type="text"
                          placeholder="Enter full name"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          required
                          disabled={isLoading}
                        />
                      </div>

                      {/* Email & Employee ID */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">
                            Email <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="superadmin@gmail.com"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="employeeId">
                            Employee ID <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="employeeId"
                            name="employeeId"
                            type="text"
                            placeholder="Enter employee ID"
                            value={formData.employeeId}
                            onChange={handleInputChange}
                            required
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      {/* Department & Designation */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="department">
                            Department <span className="text-destructive">*</span>
                          </Label>
                          {/* Use Select for single department selection */}
                          <Select
                            value={formData.department}
                            onValueChange={(value) =>
                              setFormData((prev) => ({ ...prev, department: value }))
                            }
                            disabled={isLoading}
                            required
                          >
                            <SelectTrigger id="department" className="w-full">
                              <SelectValue placeholder="Select a department" />
                            </SelectTrigger>
                            <SelectContent>
                              {departments.length > 0 ? (
                                departments.map((dept) => (
                                  <SelectItem key={dept.id} value={dept.id}>
                                    {dept.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-dept" disabled>
                                  No departments found
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="designation">
                            Designation <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="designation"
                            name="designation"
                            type="text"
                            placeholder="e.g., Manager, Developer, Analyst"
                            value={formData.designation}
                            onChange={handleInputChange}
                            required
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      {/* Mobile & Role */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="mobileNumber">
                            Mobile Number <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="mobileNumber"
                            name="mobileNumber"
                            type="tel"
                            placeholder="+1 (555) 000-0000"
                            value={formData.mobileNumber}
                            onChange={handleInputChange}
                            required
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role">
                            Roles <span className="text-destructive">*</span>
                          </Label>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" className="w-full justify-between" disabled={isLoading}>
                                {formData.roles && formData.roles.length > 0
                                  ? `${formData.roles.length} role(s) selected`
                                  : "Select roles"}
                                <ChevronDownIcon className="ml-2 h-4 w-4 opacity-50" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56">
                              {roles.map((role) => (
                                <DropdownMenuCheckboxItem
                                  key={role.id}
                                  checked={formData.roles?.includes(role.id)}
                                  onCheckedChange={(checked) => {
                                    setFormData(prev => {
                                      const currentRoles = prev.roles || [];
                                      return {
                                        ...prev,
                                        roles: checked
                                          ? [...currentRoles, role.id]
                                          : currentRoles.filter(id => id !== role.id)
                                      };
                                    });
                                  }}
                                >
                                  {role.name}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Password */}
                      <div className="space-y-2">
                        <Label htmlFor="password">
                          Password {editingId ? "(Leave blank to keep current)" : <span className="text-destructive">*</span>}
                        </Label>
                        <div className="relative">
                          <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="........"
                            value={formData.password}
                            onChange={handleInputChange}
                            required={!editingId}
                            disabled={isLoading}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="sr-only">
                              {showPassword ? "Hide password" : "Show password"}
                            </span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Submit Buttons */}
                  <div className="flex justify-end gap-4 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setFormData({
                          fullName: "",
                          email: "",
                          employeeId: "",
                          department: "",
                          designation: "",
                          mobileNumber: "",
                          roles: [],
                          password: "",
                        })
                        setView("list")
                        setEditingId(null)
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Saving..." : (editingId ? "Update User" : "Create User")}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete User</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete <strong>{userToDelete?.name}</strong>?
                    This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default CreateUser
