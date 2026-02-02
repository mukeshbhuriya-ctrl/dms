import { useState, useEffect } from "react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, ArrowLeft } from "lucide-react"

function CreateCustomer() {
  const navigate = useNavigate()
  const [view, setView] = useState("list") // 'list' or 'create'
  const [customers, setCustomers] = useState([])

  const [formData, setFormData] = useState({
    customerName: "",
    email: "",
    shortName: "",
    mobileNumber: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Fetch Customers
  const fetchCustomers = async () => {
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

      const headers = {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
      }

      const res = await fetch(`${backendUrl}/api/dcc/get-customers`, {
        method: "GET",
        headers,
        credentials: "include",
      })

      const data = await res.json()
      if (res.ok) {
        setCustomers(data.data || [])
      } else {
        console.error("Failed to fetch customers", data)
      }
    } catch (err) {
      console.error("Error fetching customers:", err)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (error) setError("")
  }

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
        customer_name: formData.customerName,
        customer_short_name: formData.shortName,
        email: formData.email,
        mobile: formData.mobileNumber,
      }

      const headers = {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
      }

      const res = await fetch(`${backendUrl}/api/dcc/create-customer`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(requestBody),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Failed to create customer")
      }

      setSuccess("Customer created successfully!")
      setFormData({
        customerName: "",
        email: "",
        shortName: "",
        mobileNumber: "",
      })

      // Refresh list and switch to list view
      fetchCustomers()
      setTimeout(() => {
        setSuccess("")
        setView("list")
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
                  {view === "list" ? "Customers List" : "Create Customer"}
                </h1>
                <p className="text-muted-foreground">
                  {view === "list"
                    ? "List of all customers in the system"
                    : "Fill in the details to create a new customer profile."}
                </p>
              </div>
              <div>
                {view === "list" ? (
                  <Button onClick={() => setView("create")}>
                    <Plus className="mr-2 h-4 w-4" /> Create Customer
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setView("list")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                  </Button>
                )}
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
                {success}
              </div>
            )}

            {view === "list" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Customers List</CardTitle>
                  <CardDescription>View and manage customers.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">S.No</TableHead>
                        <TableHead>Customer Name</TableHead>
                        <TableHead>Short Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead className="text-right">Created Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.length > 0 ? (
                        customers.map((customer, index) => (
                          <TableRow key={customer.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="font-medium">{customer.customer_name}</TableCell>
                            <TableCell>{customer.customer_short_name}</TableCell>
                            <TableCell>{customer.email}</TableCell>
                            <TableCell>{customer.mobile || "-"}</TableCell>
                            <TableCell className="text-right">
                              {new Date(customer.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No customers found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <form onSubmit={handleSubmit}>
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Information</CardTitle>
                    <CardDescription>
                      Enter the basic details about the customer
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default CreateCustomer
