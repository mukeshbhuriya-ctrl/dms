import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import SiteAdminSidebar from "@/components/sidebar/siteadmin"
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
import { Upload } from "lucide-react"

function CreateCompany() {
  const navigate = useNavigate()
  const [companyName, setCompanyName] = useState("")
  const [logo, setLogo] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [employeeId, setEmployeeId] = useState("")
  const [userPassword, setUserPassword] = useState("")
  const [userMobile, setUserMobile] = useState("")

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file")
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB")
        return
      }
      setLogo(file)
      setError("")
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!companyName.trim()) {
      setError("Company name is required")
      return
    }

    if (
      !userName.trim() ||
      !userEmail.trim() ||
      !employeeId.trim() ||
      !userPassword
    ) {
      setError("User name, email, employee ID, and password are required")
      return
    }

    setIsLoading(true)

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
      const formData = new FormData()
      formData.append("companyName", companyName.trim())
      if (logo) {
        formData.append("logo", logo)
      }
      formData.append("name", userName.trim())
      formData.append("email", userEmail.trim())
      formData.append("employee_id", employeeId.trim())
      formData.append("password", userPassword)
      if (userMobile.trim()) {
        formData.append("mobile", userMobile.trim())
      }

      const authData = localStorage.getItem("siteadmin_auth")
      let token = null
      if (authData) {
        try {
          const parsed = JSON.parse(authData)
          token = parsed?.payload?.token || parsed?.token
        } catch {
          // If parsing fails, continue without token
        }
      }

      const headers = {}
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const res = await fetch(
        `${backendUrl}/api/siteadmin/company/create-company`,
        {
          method: "POST",
          headers,
          body: formData,
        }
      )

      const contentType = res.headers.get("content-type") || ""
      const payload = contentType.includes("application/json")
        ? await res.json()
        : await res.text()

      if (!res.ok) {
        const message =
          typeof payload === "string"
            ? payload
            : payload?.message || "Failed to create company"
        throw new Error(message)
      }

      setSuccess("Company created successfully!")
      setCompanyName("")
      setLogo(null)
      setLogoPreview(null)
      setUserName("")
      setUserEmail("")
      setEmployeeId("")
      setUserPassword("")
      setUserMobile("")
      // Reset file input
      const fileInput = document.getElementById("logo")
      if (fileInput) {
        fileInput.value = ""
      }
    } catch (err) {
      setError(err?.message || "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SidebarProvider>
      <SiteAdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Create Company</h1>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          <Card className="mx-auto w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Create New Company</CardTitle>
              <CardDescription>
                Add a new company with name, logo, and user details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold">Company Details</h3>
                    <p className="text-xs text-muted-foreground">
                      Basic company information and logo
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="Enter company name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo">Company Logo</Label>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-4">
                        <Input
                          id="logo"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          disabled={isLoading}
                          className="cursor-pointer"
                        />
                      </div>
                      {logoPreview && (
                        <div className="relative w-32 h-32 border rounded-md overflow-hidden">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Accepted formats: JPG, PNG, GIF. Max size: 5MB
                    </p>
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold">User Details</h3>
                    <p className="text-xs text-muted-foreground">
                      Primary user for the company
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userName">User Name *</Label>
                    <Input
                      id="userName"
                      type="text"
                      placeholder="Enter full name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="userEmail">User Email *</Label>
                    <Input
                      id="userEmail"
                      type="email"
                      placeholder="name@company.com"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee ID *</Label>
                    <Input
                      id="employeeId"
                      type="text"
                      placeholder="EMP-001"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="userPassword">User Password *</Label>
                    <Input
                      id="userPassword"
                      type="password"
                      placeholder="Create a password"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="userMobile">User Mobile (optional)</Label>
                    <Input
                      id="userMobile"
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={userMobile}
                      onChange={(e) => setUserMobile(e.target.value)}
                      disabled={isLoading}
                      autoComplete="tel"
                    />
                  </div>
                </div>

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

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? "Creating..." : "Create Company & User"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default CreateCompany
