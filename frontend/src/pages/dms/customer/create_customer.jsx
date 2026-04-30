import { useState, useEffect, useMemo, useCallback } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"

import { SidebarTrigger } from "@/components/ui/sidebar"
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
import ProDataTable from "@/components/shared/ProDataTable"
import { Plus, ArrowLeft, Edit } from "lucide-react"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"

const toSlug = (value = "") => String(value).trim().toLowerCase().replace(/\s+/g, "-")

function CreateCustomer() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: routeId } = useParams()
  const [view, setView] = useState("list") // 'list' or 'create'

  const [formData, setFormData] = useState({
    customerName: "",
    email: "",
    shortName: "",
    mobileNumber: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingId, setEditingId] = useState(null)

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
      const res = await apiClient.get("/api/dcc/get-customer-filters")
      if (res.success) setActiveFilters(res.data)
    } catch (err) {
      console.error("Error fetching customer filters:", err)
    }
  }, [])

  useEffect(() => {
    if (view === "list") {
      fetchActiveFilters()
    }
  }, [fetchActiveFilters, view, refreshKey])

  // Cascading Logic
  const activeCustomerOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.customer_short_name) {
      const selected = Array.isArray(columnFilters.customer_short_name) ? columnFilters.customer_short_name : [columnFilters.customer_short_name.toString()]
      filtered = filtered.filter(f => selected.includes(f.customer_short_name))
    }
    const names = [...new Set(filtered.map(f => f.customer_name))].filter(Boolean).sort()
    return names.map(n => ({ label: n, value: n }))
  }, [activeFilters.records, columnFilters.customer_short_name])

  const activeShortNameOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.customer_name) {
      const selected = Array.isArray(columnFilters.customer_name) ? columnFilters.customer_name : [columnFilters.customer_name.toString()]
      filtered = filtered.filter(f => selected.includes(f.customer_name))
    }
    const shorts = [...new Set(filtered.map(f => f.customer_short_name))].filter(Boolean).sort()
    return shorts.map(s => ({ label: s, value: s }))
  }, [activeFilters.records, columnFilters.customer_name])

  const populateFormFromCustomer = useCallback((customer) => {
    setFormData({
      customerName: customer.customer_name || "",
      email: customer.email || "",
      shortName: customer.customer_short_name || "",
      mobileNumber: customer.mobile || "",
    })
    setEditingId(customer.id)
    setView("create")
    setError("")
    setSuccess("")
  }, [])

  useEffect(() => {
    const loadCustomerByName = async (customerName) => {
      try {
        const response = await apiClient.get("/api/dcc/get-customers", {
          page: 1,
          limit: 200,
          search: customerName,
        })
        const rows = response?.data || []
        const matched = rows.find((c) => toSlug(c.customer_name) === toSlug(customerName))
        if (!matched) {
          setError(`Customer not found: ${customerName}`)
          return
        }
        populateFormFromCustomer(matched)
      } catch {
        setError(`Unable to load customer: ${customerName}`)
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
      if (row) populateFormFromCustomer(row)
      else if (routeId) loadCustomerByName(decodeURIComponent(routeId))
      else setError("Please open edit/view from the customer list once so data can load.")
    } else {
      setEditingId(null)
      setFormData({
        customerName: "",
        email: "",
        shortName: "",
        mobileNumber: "",
      })
    }
  }, [mode, routeId, location.state, populateFormFromCustomer])

  const handleEdit = useCallback((customer) => {
    navigate(`/customers/edit/${toSlug(customer.customer_name)}`, { state: { record: customer } })
  }, [navigate])

  const handleView = useCallback((customer) => {
    navigate(`/customers/view/${toSlug(customer.customer_name)}`, { state: { record: customer } })
  }, [navigate])

  const columns = useMemo(() => [
    {
      accessorKey: "customer_name",
      header: "Client",
      filterType: "select",
      isMulti: true,
      filterOptions: activeCustomerOptions
    },
    {
      accessorKey: "customer_short_name",
      header: "Short Name",
      filterType: "select",
      isMulti: true,
      filterOptions: activeShortNameOptions
    },
    {
      accessorKey: "email",
      header: "Email",
      filterType: "text"
    },
    {
      accessorKey: "mobile",
      header: "Mobile",
      cell: (row) => row.mobile || "-",
    },
    {
      accessorKey: "createdAt",
      header: "Created Date",
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleView(row)}>
            View
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleEdit(row)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      ),
    },
  ], [handleEdit, activeCustomerOptions, activeShortNameOptions, handleView])

  const fetchCustomers = useCallback(async (params) => {
    try {
      const queryParams = { ...params };
      if (queryParams.columnFilters) {
        queryParams.columnFilters = JSON.stringify(queryParams.columnFilters);
      }
      const responseData = await apiClient.get('/api/dcc/get-customers', queryParams)
      return responseData;
    } catch (err) {
      console.error("Error fetching customers:", err)
      return { success: false, data: [], meta: {} }
    }
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
      const requestBody = {
        customer_name: formData.customerName,
        customer_short_name: formData.shortName,
        email: formData.email,
        mobile: formData.mobileNumber,
      }

      let data;
      if (editingId) {
        data = await apiClient.put(`/api/dcc/update-customer/${editingId}`, requestBody)
      } else {
        data = await apiClient.post(`/api/dcc/create-customer`, requestBody)
      }

      if (!data.success) {
        throw new Error(data.message || (editingId ? "Failed to update client" : "Failed to create client"))
      }

      setSuccess(editingId ? "Client updated successfully!" : "Client created successfully!")
      setFormData({
        customerName: "",
        email: "",
        shortName: "",
        mobileNumber: "",
      })
      setEditingId(null)

      // Refresh list and switch to list view
      setRefreshKey(prev => prev + 1)
      setTimeout(() => {
        setSuccess("")
        navigate("/customers/list")
      }, 1500)

    } catch (err) {
      setError(err?.message || "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      await exportApi.exportCustomers();
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
                  {mode === "view" ? "View Client" : (editingId ? "Update Client" : "Create Client")}
                </h1>
                <p className="text-muted-foreground">
                  {mode === "view"
                    ? "Review the selected client profile."
                    : (editingId ? "Update the details of the selected client." : "Fill in the details to create a new client profile.")}
                </p>
              </div>
              <div>
                  <Button variant="outline" onClick={() => navigate("/customers/list")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                  </Button>
              </div>
            </div>
            )}

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
              <ProDataTable
                columns={columns}
                fetchData={fetchCustomers}
                onExport={handleExport}
                onAdd={() => navigate("/customers/create")}
                onAddTooltip="Create Client"
                refreshKey={refreshKey}
                columnFilters={columnFilters}
                onFilterChange={(newFilters) => setColumnFilters(prev => ({ ...prev, ...newFilters }))}
              />
            ) : (
              <form onSubmit={handleSubmit}>
                <Card>
                  <CardHeader>
                    <CardTitle>Client Information</CardTitle>
                    <CardDescription>
                      {mode === "view" ? "Read-only details of this client." : "Enter the basic details about the client"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerName">
                        Client <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="customerName"
                        name="customerName"
                        type="text"
                        placeholder="Enter customer name"
                        value={formData.customerName}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading || isReadOnly}
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
                          disabled={isLoading || isReadOnly}
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
                          disabled={isLoading || isReadOnly}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mobileNumber">
                        Mobile Number
                      </Label>
                      <Input
                        id="mobileNumber"
                        name="mobileNumber"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={formData.mobileNumber}
                        onChange={handleInputChange}
                        disabled={isLoading || isReadOnly}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Submit Buttons */}
                {!isReadOnly && (
                  <div className="flex justify-end gap-4 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/customers/list")}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update Client" : "Create Client")}
                    </Button>
                  </div>
                )}
              </form>
            )}
          </div>
        </main>
    </>
  )
}

export default CreateCustomer
