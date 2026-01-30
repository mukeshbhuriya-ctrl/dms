import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { AdminSidebar } from "@/components"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
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

function CreateCustomer() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    customerName: "",
    email: "",
    shortName: "",
    mobileNumber: "",
  })
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
        customer_name: formData.customerName,
        customer_short_name: formData.shortName,
        email: formData.email,
        mobile: formData.mobileNumber,
      }

      const headers = {
        "Content-Type": "application/json",
      }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const res = await fetch(`${backendUrl}/api/dcc/create-customer`, {
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
            : payload?.message || "Failed to create customer"
        throw new Error(message)
      }

      setSuccess("Customer created successfully!")
      
      // Reset form after successful creation
      setFormData({
        customerName: "",
        email: "",
        shortName: "",
        mobileNumber: "",
      })

      // Optionally navigate or show success message
      setTimeout(() => {
        setSuccess("")
        // You can navigate to customer list or stay on page
        // navigate("/admin/customers")
      }, 3000)
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
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Create Customer</h1>
              <p className="text-muted-foreground">
                Fill in the customer information below to create a new customer profile.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                  <CardDescription>
                    Enter the basic details about the customer
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

                  <div className="space-y-2">
                    <Label htmlFor="customerName">
                      Customer Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="customerName"
                      name="customerName"
                      type="text"
                      placeholder="Enter customer name"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="customer@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shortName">
                        Short Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="shortName"
                        name="shortName"
                        type="text"
                        placeholder="Enter short name"
                        value={formData.shortName}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

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
                </CardContent>
              </Card>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-4 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData({
                      customerName: "",
                      email: "",
                      shortName: "",
                      mobileNumber: "",
                    })
                  }}
                  disabled={isLoading}
                >
                  Reset
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Customer"}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default CreateCustomer

