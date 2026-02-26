import { useState, useEffect, useMemo, useCallback } from "react"
import { AdminSidebar } from "@/components"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Plus, Trash2, ArrowLeft } from "lucide-react"
import { commonApi } from "@/api/common.api"
import apiClient from "@/api/api.client"

function CreateLocation() {
  const [view, setView] = useState("list") // 'list' or 'create'

  const [selectedCustomer, setSelectedCustomer] = useState("")
  const [locations, setLocations] = useState([
    {
      id: 1,
      location: "",
      customerNumber: "",
      gstNumber: "",
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)
  const [customers, setCustomers] = useState([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)

  const columns = useMemo(() => [
    {
      accessorKey: "customer.customer_name",
      header: "Customer",
    },
    {
      accessorKey: "location_name",
      header: "Location Name",
    },
    {
      accessorKey: "customer_number_as_per_sap",
      header: "SAP Number",
    },
    {
      accessorKey: "gst_number",
      header: "GST Number",
      cell: (row) => row.gst_number || "-",
    },
    {
      accessorKey: "createdAt",
      header: "Created Date",
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ], [])

  const fetchCustomerLocations = useCallback(async ({ page, limit, search, sorting }) => {
    try {
      const params = { page, limit }
      if (search) params.search = search
      if (sorting && sorting.length > 0) {
        params.sortBy = sorting[0].id
        params.sortOrder = sorting[0].desc ? "desc" : "asc"
      }

      const responseData = await apiClient.get('/api/dcc/get-customer-locations', params)

      if (responseData.success) {
        return {
          data: responseData.data || [],
          meta: responseData.meta || {}
        }
      } else {
        console.error("Failed to fetch locations", responseData)
        return { data: [], meta: {} }
      }
    } catch (err) {
      console.error("Error fetching locations:", err)
      return { data: [], meta: {} }
    }
  }, [])

  // Fetch customers for Dropdown
  const fetchCustomers = async () => {
    setIsLoadingCustomers(true)
    try {
      const responseData = await commonApi.getCustomers({ limit: 1000 })
      if (responseData.success) {
        setCustomers(responseData.data || [])
      } else {
        console.error("Failed to fetch customers", responseData)
      }
    } catch (err) {
      console.error("Error fetching customers:", err)
    } finally {
      setIsLoadingCustomers(false)
    }
  }

  useEffect(() => {
    if (view === "create") {
      fetchCustomers()
    }
  }, [view])

  const handleLocationChange = (id, field, value) => {
    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === id ? { ...loc, [field]: value } : loc
      )
    )
  }

  const addLocation = () => {
    const newId = Math.max(...locations.map((l) => l.id), 0) + 1
    setLocations((prev) => [
      ...prev,
      {
        id: newId,
        location: "",
        customerNumber: "",
        gstNumber: "",
      },
    ])
  }

  const removeLocation = (id) => {
    if (locations.length > 1) {
      setLocations((prev) => prev.filter((loc) => loc.id !== id))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      const locationsArray = locations.map((location) => ({
        location_name: location.location,
        customer_number_as_per_sap: location.customerNumber,
        gst_number: location.gstNumber,
      }))

      const requestBody = {
        customer_id: selectedCustomer,
        locations: locationsArray,
      }

      await apiClient.post('/api/dcc/create-customer-location', requestBody)

      setSuccess(`Successfully created ${locations.length} location(s)!`)

      // Reset form
      setSelectedCustomer("")
      setLocations([
        {
          id: 1,
          location: "",
          customerNumber: "",
          gstNumber: "",
        },
      ])

      // Refresh list and switch view
      setRefreshKey(prev => prev + 1)
      setTimeout(() => {
        setSuccess("")
        setView("list")
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
          <div className="max-w-6xl mx-auto w-full">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {view === "list" ? "Locations List" : "Create Location"}
                </h1>
                <p className="text-muted-foreground">
                  {view === "list"
                    ? "List of all customer locations"
                    : "Add one or more locations for a customer."}
                </p>
              </div>
              <div>
                {view === "list" ? (
                  <Button onClick={() => setView("create")}>
                    <Plus className="mr-2 h-4 w-4" /> Create Location
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
                  <CardTitle>Locations</CardTitle>
                  <CardDescription>View and manage locations.</CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={columns}
                    fetchData={fetchCustomerLocations}
                    key={refreshKey}
                  />
                </CardContent>
              </Card>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="grid gap-6">
                  {/* Customer Selection */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Select Customer</CardTitle>
                      <CardDescription>
                        Choose the customer for which you want to add locations
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {error && !selectedCustomer && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive mb-4">
                          {error}
                        </div>
                      )}
                      {success && (
                        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400 mb-4">
                          {success}
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="customer">
                          Customer <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={selectedCustomer}
                          onValueChange={setSelectedCustomer}
                          disabled={isLoading || isLoadingCustomers}
                          required
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                isLoadingCustomers
                                  ? "Loading customers..."
                                  : "Select a customer"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.length === 0 && !isLoadingCustomers ? (
                              <SelectItem value="no-customers" disabled>
                                No customers found
                              </SelectItem>
                            ) : (
                              customers.map((customer) => (
                                <SelectItem key={customer.id} value={String(customer.id)}>
                                  {customer.customer_name || customer.name || `Customer ${customer.id}`}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Locations Section */}
                  {selectedCustomer && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Locations</CardTitle>
                            <CardDescription>
                              Add one or more locations for the selected customer
                            </CardDescription>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addLocation}
                            disabled={isLoading}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Location
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {error && selectedCustomer && (
                          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {error}
                          </div>
                        )}
                        {locations.map((location, index) => (
                          <div
                            key={location.id}
                            className="p-4 border rounded-lg space-y-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold">
                                Location {index + 1}
                              </h3>
                              {locations.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeLocation(location.id)}
                                  disabled={isLoading}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`location-${location.id}`}>
                                Location <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id={`location-${location.id}`}
                                placeholder="Enter location name"
                                value={location.location}
                                onChange={(e) =>
                                  handleLocationChange(
                                    location.id,
                                    "location",
                                    e.target.value
                                  )
                                }
                                required
                                disabled={isLoading}
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor={`customerNumber-${location.id}`}>
                                  Customer Number (as per SAP){" "}
                                </Label>
                                <Input
                                  id={`customerNumber-${location.id}`}
                                  placeholder="Enter SAP customer number"
                                  value={location.customerNumber}
                                  onChange={(e) =>
                                    handleLocationChange(
                                      location.id,
                                      "customerNumber",
                                      e.target.value
                                    )
                                  }
                                  required
                                  disabled={isLoading}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`gstNumber-${location.id}`}>
                                  GST Number <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                  id={`gstNumber-${location.id}`}
                                  placeholder="Enter GST number"
                                  value={location.gstNumber}
                                  onChange={(e) =>
                                    handleLocationChange(
                                      location.id,
                                      "gstNumber",
                                      e.target.value
                                    )
                                  }
                                  required
                                  disabled={isLoading}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Submit Buttons */}
                  {selectedCustomer && (
                    <div className="flex justify-end gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedCustomer("")
                          setLocations([{ id: 1, location: "", customerNumber: "", gstNumber: "" }])
                        }}
                        disabled={isLoading}
                      >
                        Reset
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Creating..." : "Create Locations"}
                      </Button>
                    </div>
                  )}
                </div>
              </form>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default CreateLocation
