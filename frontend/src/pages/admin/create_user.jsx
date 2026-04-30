import { useState, useEffect, useMemo, useCallback } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"

import { SidebarTrigger } from "@/components/ui/sidebar"
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
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
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
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"

const toSlug = (value = "") => String(value).trim().toLowerCase().replace(/\s+/g, "-")

function CreateUser() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: routeId } = useParams()
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

  const [columnFilters, setColumnFilters] = useState({})
  const [activeFilters, setActiveFilters] = useState({ records: [] })

  const mode = useMemo(() => {
    if (location.pathname.includes("/edit/")) return "edit"
    if (location.pathname.includes("/view/")) return "view"
    if (location.pathname.endsWith("/create")) return "create"
    return "list"
  }, [location.pathname])

  const isReadOnly = mode === "view"

  const fetchActiveFilters = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/users/get-user-filters")
      if (res.success) setActiveFilters(res.data)
    } catch (err) {
      console.error("Error fetching user filters:", err)
    }
  }, [])

  useEffect(() => {
    if (view === "list") {
      fetchActiveFilters()
    }
  }, [fetchActiveFilters, view, refreshKey])

  // Cascading Logic
  const activeNameOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.department) {
      const selected = Array.isArray(columnFilters.department) ? columnFilters.department : [columnFilters.department.toString()]
      filtered = filtered.filter(f => selected.includes(f.department))
    }
    const names = [...new Set(filtered.map(f => f.name))].filter(Boolean).sort()
    return names.map(n => ({ label: n, value: n }))
  }, [activeFilters.records, columnFilters.department])

  const activeDeptOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.name) {
      const selected = Array.isArray(columnFilters.name) ? columnFilters.name : [columnFilters.name.toString()]
      filtered = filtered.filter(f => selected.includes(f.name))
    }
    const depts = [...new Set(filtered.map(f => f.department))].filter(Boolean).sort()
    return depts.map(d => ({ label: d, value: d }))
  }, [activeFilters.records, columnFilters.name])

  const activeEmailOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.name) {
      const selected = Array.isArray(columnFilters.name) ? columnFilters.name : [columnFilters.name.toString()]
      filtered = filtered.filter(f => selected.includes(f.name))
    }
    const emails = [...new Set(filtered.map(f => f.email))].filter(Boolean).sort()
    return emails.map(e => ({ label: e, value: e }))
  }, [activeFilters.records, columnFilters.name])

  const activeEmpIdOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.name) {
      const selected = Array.isArray(columnFilters.name) ? columnFilters.name : [columnFilters.name.toString()]
      filtered = filtered.filter(f => selected.includes(f.name))
    }
    const ids = [...new Set(filtered.map(f => f.empid))].filter(Boolean).sort()
    return ids.map(i => ({ label: i, value: i }))
  }, [activeFilters.records, columnFilters.name])

  const fetchUsers = useCallback(async (params) => {
    try {
      const queryParams = { ...params };
      if (queryParams.columnFilters) {
        queryParams.columnFilters = JSON.stringify(queryParams.columnFilters);
      }
      const responseData = await apiClient.get('/api/users/get-users', queryParams)
      return responseData;
    } catch (err) {
      console.error("Error fetching users:", err)
      return { success: false, data: [], meta: {} }
    }
  }, [])

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

  const populateFormFromUser = useCallback((user) => {
    setEditingId(user.id)
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
    setError("")
    setSuccess("")
  }, [])

  useEffect(() => {
    const loadUserByEmpId = async (empid) => {
      try {
        const response = await apiClient.get("/api/users/get-users", {
          page: 1,
          limit: 200,
          search: empid,
        })
        const userRows = response?.data || []
        const matched = userRows.find((u) => toSlug(u.empid) === toSlug(empid))
        if (!matched) {
          setError(`User not found for Employee ID: ${empid}`)
          return
        }
        populateFormFromUser(matched)
      } catch {
        setError(`Unable to load user for Employee ID: ${empid}`)
      }
    }

    if (mode === "list") {
      setView("list")
      setEditingId(null)
      return
    }

    setView("create")

    if (mode === "edit" || mode === "view") {
      const row = location.state?.record
      if (row) {
        populateFormFromUser(row)
      } else if (routeId) {
        loadUserByEmpId(routeId)
      } else {
        setError("Please open edit/view from the list once so data can load.")
      }
    } else {
      setEditingId(null)
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
    }
  }, [mode, routeId, location.state, populateFormFromUser])

  const handleEdit = (user) => {
    navigate(`/user/edit/${toSlug(user.empid)}`, { state: { record: user } })
  }

  const handleView = (user) => {
    navigate(`/user/view/${toSlug(user.empid)}`, { state: { record: user } })
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
      filterType: "select",
      isMulti: true,
      filterOptions: activeEmpIdOptions,
      cell: (row) => row.empid || "-",
    },
    {
      accessorKey: "name",
      header: "Full Name",
      filterType: "select",
      isMulti: true,
      filterOptions: activeNameOptions
    },
    {
      accessorKey: "email",
      header: "Email",
      filterType: "select",
      isMulti: true,
      filterOptions: activeEmailOptions
    },
    {
      accessorKey: "department",
      header: "Department",
      filterType: "select",
      isMulti: true,
      filterOptions: activeDeptOptions,
      cell: (row) => {
        return row.department?.name || "-";
      },
    },
    {
      accessorKey: "roles",
      header: "Role",
      cell: (row) => {
        const userRoles = row.user_roles?.map((ur) => ur.role?.name) || []
        return (
          <div className="flex flex-col overflow-hidden">
            <span
              className="truncate text-xs text-muted-foreground"
              title={userRoles.join(", ")}
            >
              {userRoles.slice(0, 2).join(", ")}
              {userRoles.length > 2 ? "..." : ""}
            </span>
          </div>
        )
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
            onClick={() => handleView(row)}
            title="View"
          >
            View
          </Button>
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
  ], [handleEdit, activeEmpIdOptions, activeNameOptions, activeEmailOptions, activeDeptOptions, handleView])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    // Manual validation for department since Select might not trigger native validation
    if (!formData.department || formData.department === "") {
      setError("Please select a department")
      setIsLoading(false)
      return
    }

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
        navigate("/user/list")
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
                  {mode === "view" ? "View User" : (editingId ? "Edit User" : "Create User")}
                </h1>
                <p className="text-muted-foreground">
                  Fill in the user information below.
                </p>
              </div>
              <div>
                  <Button variant="outline" onClick={() => navigate("/user/list")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                  </Button>
              </div>
            </div>
            )}

            {view === "list" ? (
              <ProDataTable
                columns={columns}
                fetchData={fetchUsers}
                onExport={handleExport}
                onAdd={() => navigate("/user/create")}
                onAddTooltip="Create User"
                refreshKey={refreshKey}
                columnFilters={columnFilters}
                onFilterChange={(newFilters) => setColumnFilters(prev => ({ ...prev, ...newFilters }))}
              />
            ) : (
              <div className="space-y-6">
                <form onSubmit={handleSubmit}>
                  <Card>
                    <CardHeader>
                      <CardTitle>{mode === "view" ? "User Information" : (editingId ? "Edit User" : "User Information")}</CardTitle>
                      <CardDescription>
                        {mode === "view" ? "Review user details." : (editingId ? "Update user details" : "Enter the details for the new user account")}
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
                          disabled={isLoading || isReadOnly}
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
                          disabled={isLoading || isReadOnly}
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
                          disabled={isLoading || isReadOnly}
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
                            disabled={isLoading || isReadOnly}
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
                          disabled={isLoading || isReadOnly}
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
                          disabled={isLoading || isReadOnly}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role">
                            Roles <span className="text-destructive">*</span>
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-between h-auto min-h-[40px] px-3 py-2 text-left" disabled={isLoading || isReadOnly}>
                                <div className="flex flex-wrap gap-1 max-w-[280px]">
                                  {formData.roles && formData.roles.length > 0 ? (
                                    Array.from(new Set(formData.roles)).map(roleId => {
                                      const roleObj = roles.find(r => r.id === roleId);
                                      return (
                                        <Badge key={roleId} variant="secondary" className="font-normal">
                                          {roleObj?.name || "Unknown"}
                                        </Badge>
                                      );
                                    })
                                  ) : (
                                    <span className="text-muted-foreground font-normal">Select roles</span>
                                  )}
                                </div>
                                <ChevronDownIcon className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                              <div className="p-2 border-b">
                                <p className="text-xs font-medium text-muted-foreground px-2 py-1 uppercase tracking-wider">Available Roles</p>
                              </div>
                              <div className="max-h-[300px] overflow-y-auto p-2">
                                {roles.length > 0 ? (
                                  roles.map((role) => (
                                    <div
                                      key={role.id}
                                      className="flex items-center space-x-3 space-y-0 rounded-md p-2 hover:bg-muted cursor-pointer"
                                    >
                                      <Checkbox
                                        id={`role-${role.id}`}
                                        checked={formData.roles?.includes(role.id)}
                                        onCheckedChange={(checked) => {
                                          setFormData(prev => {
                                            const currentRoles = prev.roles || [];
                                            const newRoles = checked
                                              ? [...new Set([...currentRoles, role.id])]
                                              : currentRoles.filter(id => id !== role.id);
                                            return {
                                              ...prev,
                                              roles: newRoles
                                            };
                                          });
                                        }}
                                      />
                                      <Label
                                        htmlFor={`role-${role.id}`}
                                        className="text-sm font-medium leading-none cursor-pointer flex-1 py-1"
                                      >
                                        {role.name}
                                      </Label>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-center p-4 text-muted-foreground">No roles found</p>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
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
                            disabled={isLoading || isReadOnly}
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
                  {!isReadOnly && (
                    <div className="flex justify-end gap-4 mt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/user/list")}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Saving..." : (editingId ? "Update User" : "Create User")}
                      </Button>
                    </div>
                  )}
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
    </>
  )
}

export default CreateUser
