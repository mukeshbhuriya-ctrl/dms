import { useState, useEffect, useMemo, useCallback } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"

import { SidebarTrigger } from "@/components/ui/sidebar"
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
import ProDataTable from "@/components/shared/ProDataTable"
import { Plus, Trash2, ArrowLeft, Edit } from "lucide-react"
import { commonApi } from "@/api/common.api"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"

const toSlug = (value = "") => String(value).trim().toLowerCase().replace(/\s+/g, "-")

function CreateLocation() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: routeId } = useParams()
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
      const res = await apiClient.get("/api/dcc/get-location-filters")
      if (res.success) setActiveFilters(res.data)
    } catch (err) {
      console.error("Error fetching location filters:", err)
    }
  }, [])

  useEffect(() => {
    if (view === "list") {
      fetchActiveFilters()
    }
  }, [fetchActiveFilters, view, refreshKey])

  // Cascading Logic
  const activeClientOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.location_name) {
      const selected = Array.isArray(columnFilters.location_name) ? columnFilters.location_name : [columnFilters.location_name.toString()]
      filtered = filtered.filter(f => selected.includes(f.location_name))
    }
    const names = [...new Set(filtered.map(f => f.customer_name))].filter(Boolean).sort()
    return names.map(n => ({ label: n, value: n }))
  }, [activeFilters.records, columnFilters.location_name])

  const activeLocationOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.customer_name) {
      const selected = Array.isArray(columnFilters.customer_name) ? columnFilters.customer_name : [columnFilters.customer_name.toString()]
      filtered = filtered.filter(f => selected.includes(f.customer_name))
    }
    const locs = [...new Set(filtered.map(f => f.location_name))].filter(Boolean).sort()
    return locs.map(l => ({ label: l, value: l }))
  }, [activeFilters.records, columnFilters.customer_name])

  const populateFromLocation = useCallback((locationItem) => {
    setSelectedCustomer(String(locationItem.customer_id))
    setLocations([
      {
        id: 1,
        location: locationItem.location_name || "",
        customerNumber: locationItem.customer_number_as_per_sap || "",
        gstNumber: locationItem.gst_number || "",
      }
    ])
    setEditingId(locationItem.id)
    setView("create")
    setError("")
    setSuccess("")
  }, [])

  useEffect(() => {
    const loadLocationByName = async (locationName) => {
      try {
        const response = await apiClient.get("/api/dcc/get-customer-locations", {
          page: 1,
          limit: 200,
          search: locationName,
        })
        const rows = response?.data || []
        const matched = rows.find((l) => toSlug(l.location_name) === toSlug(locationName))
        if (!matched) {
          setError(`Location not found: ${locationName}`)
          return
        }
        populateFromLocation(matched)
      } catch {
        setError(`Unable to load location: ${locationName}`)
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
      if (row) populateFromLocation(row)
      else if (routeId) loadLocationByName(decodeURIComponent(routeId))
      else setError("Please open edit/view from the location list once so data can load.")
    } else {
      setEditingId(null)
      setSelectedCustomer("")
      setLocations([{ id: 1, location: "", customerNumber: "", gstNumber: "" }])
    }
  }, [mode, routeId, location.state, populateFromLocation])

  const handleEdit = useCallback((locationItem) => {
    navigate(`/locations/edit/${toSlug(locationItem.location_name)}`, { state: { record: locationItem } })
  }, [navigate])

  const handleView = useCallback((locationItem) => {
    navigate(`/locations/view/${toSlug(locationItem.location_name)}`, { state: { record: locationItem } })
  }, [navigate])

  const columns = useMemo(() => [
    {
      accessorKey: "customer_name",
      header: "Client",
      filterType: "select",
      isMulti: true,
      filterOptions: activeClientOptions,
      cell: (row) => row.customer?.customer_name || "-"
    },
    {
      accessorKey: "location_name",
      header: "Location Name",
      filterType: "select",
      isMulti: true,
      filterOptions: activeLocationOptions
    },
    {
      accessorKey: "customer_number_as_per_sap",
      header: "SAP Number",
      filterType: "text"
    },
    {
      accessorKey: "gst_number",
      header: "GST Number",
      filterType: "text",
      cell: (row) => row.gst_number || "-",
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
  ], [handleEdit, activeClientOptions, activeLocationOptions, handleView])

  const fetchCustomerLocations = useCallback(async (params) => {
    try {
      const queryParams = { ...params };
      if (queryParams.columnFilters) {
        queryParams.columnFilters = JSON.stringify(queryParams.columnFilters);
      }
      const responseData = await apiClient.get('/api/dcc/get-customer-locations', queryParams)
      return responseData;
    } catch (err) {
      console.error("Error fetching locations:", err)
      return { success: false, data: [], meta: {} }
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
      if (editingId) {
        const updateBody = {
          location_name: locations[0].location,
          customer_number_as_per_sap: locations[0].customerNumber,
          gst_number: locations[0].gstNumber,
        }
        await apiClient.put(`/api/dcc/update-customer-location/${editingId}`, updateBody)
        setSuccess("Location updated successfully!")
      } else {
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
      }

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
      setEditingId(null)

      // Refresh list and switch view
      setRefreshKey(prev => prev + 1)
      setTimeout(() => {
        setSuccess("")
        navigate("/locations/list")
      }, 1500)

    } catch (err) {
      setError(err?.message || "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      await exportApi.exportLocations();
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
                  {mode === "view" ? "View Location" : (editingId ? "Update Location" : "Create Location")}
                </h1>
                <p className="text-muted-foreground">
                  {mode === "view"
                    ? "Review the selected location details."
                    : (editingId ? "Update the details for the selected location." : "Add one or more locations for a client.")}
                </p>
              </div>
              <div>
                  <Button variant="outline" onClick={() => navigate("/locations/list")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                  </Button>
              </div>
            </div>
            )}

            {view === "list" ? (
              <ProDataTable
                columns={columns}
                fetchData={fetchCustomerLocations}
                onExport={handleExport}
                onAdd={() => navigate("/locations/create")}
                onAddTooltip="Create Location"
                refreshKey={refreshKey}
                columnFilters={columnFilters}
                onFilterChange={(newFilters) => setColumnFilters(prev => ({ ...prev, ...newFilters }))}
              />
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="grid gap-6">
                  {/* Client Selection */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Select Client</CardTitle>
                      <CardDescription>
                        {mode === "view"
                          ? "Client associated with this location."
                          : "Choose the client for which you want to add locations"}
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
                          Client <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={selectedCustomer}
                          onValueChange={setSelectedCustomer}
                          disabled={isLoading || isLoadingCustomers || !!editingId || isReadOnly}
                          required
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                isLoadingCustomers
                                  ? "Loading clients..."
                                  : "Select a client"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.length === 0 && !isLoadingCustomers ? (
                              <SelectItem value="no-customers" disabled>
                                No clients found
                              </SelectItem>
                            ) : (
                              customers.map((customer) => (
                                <SelectItem key={customer.id} value={String(customer.id)}>
                                  {customer.customer_name || customer.name || `Client ${customer.id}`}
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
                              {mode === "view"
                                ? "Read-only details of this location."
                                : "Add one or more locations for the selected client"}
                            </CardDescription>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addLocation}
                            disabled={isLoading || isReadOnly}
                            className={editingId ? "hidden" : ""}
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
                              {(!editingId && locations.length > 1) && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeLocation(location.id)}
                                  disabled={isLoading || isReadOnly}
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
                                disabled={isLoading || isReadOnly}
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
                                  disabled={isLoading || isReadOnly}
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
                                  disabled={isLoading || isReadOnly}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Submit Buttons */}
                  {selectedCustomer && !isReadOnly && (
                    <div className="flex justify-end gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (!editingId) setSelectedCustomer("")
                          setLocations([{ id: 1, location: "", customerNumber: "", gstNumber: "" }])
                          if (editingId) {
                            setEditingId(null)
                            navigate("/locations/list")
                          }
                        }}
                        disabled={isLoading}
                      >
                        {editingId ? "Cancel" : "Reset"}
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update Location" : "Create Locations")}
                      </Button>
                    </div>
                  )}
                </div>
              </form>
            )}
          </div>
        </main>
    </>
  )
}

export default CreateLocation
