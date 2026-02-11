import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { AdminSidebar } from "@/components"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Plus, ArrowLeft } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DataTable } from "@/components/shared/DataTable"

function CreateUser() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    employeeId: "",
    department: "",
    designation: "",
    mobileNumber: "",
    role: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [roles, setRoles] = useState([])
  const [view, setView] = useState("list") // 'list' or 'create'
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

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
  const [globalFilter, setGlobalFilter] = useState("")

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error when user starts typing
    if (error) setError("")
  }

  // Fetch roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
        const authData = localStorage.getItem("user_auth")
        let token = null
        if (authData) {
          try {
            const parsed = JSON.parse(authData)
            token = parsed?.payload?.token || parsed?.token
          } catch { }
        }

        const headers = { "Content-Type": "application/json" }
        if (token) headers["Authorization"] = `Bearer ${token}`

        const rolesRes = await fetch(`${backendUrl}/api/users/get-roles`, {
          method: "GET",
          headers,
          credentials: "include",
        })

        const rolesPayload = await rolesRes.json()

        if (rolesRes.ok) {
          setRoles(rolesPayload?.data || [])
        }
      } catch (err) {
        console.error("Error fetching roles:", err)
      }
    }
    fetchRoles()
  }, [])

  // Fetch Users for DataTable
  const fetchUsers = useCallback(async ({ page, limit, search, sorting }) => {
    try {
      setLoading(true)
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
      const authData = localStorage.getItem("user_auth")
      let token = null
      if (authData) {
        try {
          const parsed = JSON.parse(authData)
          token = parsed?.payload?.token || parsed?.token
        } catch { }
      }

      const headers = { "Content-Type": "application/json" }
      if (token) headers["Authorization"] = `Bearer ${token}`

      // Build Query Params
      const params = new URLSearchParams()
      params.append("page", page) // DataTable passes 1-based index
      params.append("limit", limit) // DataTable passes 'limit'
      if (search) params.append("search", search)
      if (sorting && sorting.length > 0) {
        params.append("sortBy", sorting[0].id)
        params.append("sortOrder", sorting[0].desc ? "desc" : "asc")
      }

      const res = await fetch(`${backendUrl}/api/users/get-users?${params.toString()}`, {
        method: "GET",
        headers,
        credentials: "include",
      })

      const responseData = await res.json()

      if (res.ok && responseData.success) {
        // Return data for DataTable to handle
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

  // Initial fetch handled by DataTable or manually?
  // DataTable calls fetchData on mount or change.

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
      cell: (row) => row.department || "-",
    },
    {
      accessorKey: "roles",
      header: "Role",
      cell: (row) => {
        return row.user_roles?.map((ur) => ur.role?.name).join(", ") || "No Role"
      },
      enableSorting: false,
    },
  ], [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
      const authData = localStorage.getItem("user_auth")
      let token = null
      if (authData) {
        try {
          const parsed = JSON.parse(authData)
          token = parsed?.payload?.token || parsed?.token
        } catch { }
      }

      const requestBody = {
        name: formData.fullName,
        email: formData.email,
        empid: formData.employeeId,
        mobile: formData.mobileNumber,
        password: formData.password,
        role_ids: formData.role ? [formData.role] : [],
        department: formData.department,
        designation: formData.designation,
      }

      const headers = {
        "Content-Type": "application/json",
      }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const res = await fetch(`${backendUrl}/api/users/create-user`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(requestBody),
      })

      const payload = await res.json()

      if (!res.ok) {
        const message = payload?.message || "Failed to create user"
        throw new Error(message)
      }

      setSuccess("User created successfully!")

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
          role: "",
          password: "",
        })
        // Trigger generic refresh? DataTable handles it via state change or refetch?
        // We can force a refresh by resetting pagination or similar, but simpler to just let it re-fetch when mounted/updated
        // Ideally, we can expose a refresh method from DataTable or just depend on pagination state.
        // For now, switching view to 'list' will re-render DataTable which might re-fetch if we reset something,
        // but `fetchData` is called by `useEffect` inside table.
        // To be safe, we can manually call fetchUsers if needed, but switching tabs might re-mount it.
      }, 1500)

    } catch (err) {
      setError(err?.message || "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto w-full">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {view === "list" ? "Users List" : "Create User"}
                </h1>
                <p className="text-muted-foreground">
                  {view === "list"
                    ? "List of all users in the system"
                    : "Fill in the user information below to create a new user account."}
                </p>
              </div>
              <div>
                {view === "list" ? (
                  <Button onClick={() => setView("create")}>
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
              <Card>
                <CardHeader>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>
                    View and manage system users.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={columns}
                    fetchData={fetchUsers}
                    initialData={data}
                    initialMeta={{
                      pageCount: pageCount,
                      totalItems: totalItems,
                    }}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <form onSubmit={handleSubmit}>
                  <Card>
                    <CardHeader>
                      <CardTitle>User Information</CardTitle>
                      <CardDescription>
                        Enter the details for the new user account
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
                          <Input
                            id="department"
                            name="department"
                            type="text"
                            placeholder="e.g., IT, HR, Operations"
                            value={formData.department}
                            onChange={handleInputChange}
                            required
                            disabled={isLoading}
                          />
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
                            Role <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={formData.role}
                            onValueChange={(value) =>
                              setFormData((prev) => ({ ...prev, role: value }))
                            }
                            disabled={isLoading}
                            required
                          >
                            <SelectTrigger id="role" className="w-full">
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Password */}
                      <div className="space-y-2">
                        <Label htmlFor="password">
                          Password <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="........"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
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
                          role: "",
                          password: "",
                        })
                      }}
                      disabled={isLoading}
                    >
                      Reset
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Creating..." : "Create User"}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default CreateUser
