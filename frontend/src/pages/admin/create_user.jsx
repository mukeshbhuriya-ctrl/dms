import { useState, useEffect } from "react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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
  const [users, setUsers] = useState([])
  const [view, setView] = useState("list") // 'list' or 'create'
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error when user starts typing
    if (error) setError("")
  }

  // Fetch roles and users from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"

        // Get auth token
        const authData = localStorage.getItem("user_auth")
        let token = null
        if (authData) {
          try {
            const parsed = JSON.parse(authData)
            token = parsed?.payload?.token || parsed?.token
          } catch {
            // If parsing fails, continue without token
          }
        }

        const headers = {
          "Content-Type": "application/json",
        }
        if (token) {
          headers["Authorization"] = `Bearer ${token}`
        }

        // Fetch Roles
        const rolesRes = await fetch(`${backendUrl}/api/users/get-roles`, {
          method: "GET",
          headers, // Reuse headers
          credentials: "include",
        })

        const rolesContent = rolesRes.headers.get("content-type") || ""
        const rolesPayload = rolesContent.includes("application/json")
          ? await rolesRes.json()
          : await rolesRes.text()

        if (rolesRes.ok) {
          setRoles(rolesPayload?.data || [])
        } else {
          console.error("Failed to fetch roles", rolesPayload)
        }

        // Fetch Users
        const usersRes = await fetch(`${backendUrl}/api/users/get-users`, {
          method: "GET",
          headers, // Reuse headers
          credentials: "include",
        })

        const usersContent = usersRes.headers.get("content-type") || ""
        const usersPayload = usersContent.includes("application/json")
          ? await usersRes.json()
          : await usersRes.text()

        if (usersRes.ok) {
          setUsers(usersPayload?.data || [])
        } else {
          console.error("Failed to fetch users", usersPayload)
        }

      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err?.message || "Failed to load data")
      }
    }

    fetchData()
  }, []) // Fetch on mount

  // Function to refresh users list
  const refreshUsers = async () => {
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

      const res = await fetch(`${backendUrl}/api/users/get-users`, {
        method: "GET",
        headers,
        credentials: "include",
      })
      const data = await res.json()
      if (res.ok) setUsers(data?.data || [])
    } catch (err) {
      console.error("Error refreshing users:", err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"

      // Get auth token
      const authData = localStorage.getItem("user_auth")
      let token = null
      if (authData) {
        try {
          const parsed = JSON.parse(authData)
          token = parsed?.payload?.token || parsed?.token
        } catch {
          // If parsing fails, continue without token
        }
      }

      // Map form data to backend expected format
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

      // Updated endpoint to create-user (was create-customer)
      const res = await fetch(`${backendUrl}/api/users/create-user`, {
        method: "POST",
        headers,
        credentials: "include", // Include cookies for authentication
        body: JSON.stringify(requestBody),
      })

      const contentType = res.headers.get("content-type") || ""
      const payload = contentType.includes("application/json")
        ? await res.json()
        : await res.text()

      if (!res.ok) {
        const message =
          typeof payload === "string"
            ? payload
            : payload?.message || "Failed to create user"
        throw new Error(message)
      }

      setSuccess("User created successfully!")

      // Refresh list and switch view
      await refreshUsers()
      setTimeout(() => {
        setSuccess("")
        setView("list") // Switch back to list view
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
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">S.No</TableHead>
                          <TableHead>Employee ID</TableHead>
                          <TableHead>Full Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Role</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.length > 0 ? (
                          users.map((user, index) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell>{user.empid || "-"}</TableCell>
                              <TableCell>{user.name}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>{user.department || "-"}</TableCell>
                              <TableCell>
                                {user.user_roles?.map((ur) => ur.role?.name).join(", ") || "No Role"}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                              No users found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
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
