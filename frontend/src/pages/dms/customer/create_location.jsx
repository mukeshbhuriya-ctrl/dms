import { PageContainer } from "@/components/layout/PageContainer";
import { useState, useEffect, useMemo, useCallback } from "react"

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
import { Plus, Trash2, ArrowLeft, Edit, Archive } from "lucide-react"
import { commonApi } from "@/api/common.api"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"
import { Switch } from "@/components/ui/switch"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { useCheckAdmin } from "@/hooks/useCheckAdmin"

function CreateLocation() {
  const isAdmin = useCheckAdmin()
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

  const [columnFilters, setColumnFilters] = useState({ is_active: ["true"] })
  const [activeFilters, setActiveFilters] = useState({ records: [] })

  // Delete/Toggle States
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [locationToDelete, setLocationToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [toggleDialogOpen, setToggleDialogOpen] = useState(false)
  const [locationToToggle, setLocationToToggle] = useState(null)
  const [isToggling, setIsToggling] = useState(false)

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

  const resetForm = useCallback(() => {
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
    setError("")
    setSuccess("")
  }, [])

  const handleEdit = useCallback((locationItem) => {
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

  const handleDelete = useCallback((locationItem) => {
    setLocationToDelete(locationItem)
    setDeleteDialogOpen(true)
  }, [])

  const confirmDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await apiClient.delete(`/api/dcc/delete-customer-location/${locationToDelete.id}`)
      if (res.success) {
        setSuccess("Location deleted successfully")
        setRefreshKey(prev => prev + 1)
        setDeleteDialogOpen(false)
      } else {
        setError(res.message || "Failed to delete location")
      }
    } catch (err) {
      setError(err.message || "Something went wrong")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleStatus = (locationItem) => {
    setLocationToToggle(locationItem)
    setToggleDialogOpen(true)
  }

  const confirmToggleStatus = async () => {
    setIsToggling(true)
    try {
      const res = await apiClient.patch(`/api/dcc/locations/toggle-status/${locationToToggle.id}`)
      if (res.success) {
        setSuccess(`Location ${res.data.is_active ? "activated" : "deactivated"} successfully`)
        setRefreshKey(prev => prev + 1)
        setToggleDialogOpen(false)
      } else {
        setError(res.message || "Failed to toggle status")
      }
    } catch (err) {
      setError(err.message || "Something went wrong")
    } finally {
      setIsToggling(false)
    }
  }

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
      accessorKey: "is_active",
      header: "Status",
      filterType: "select",
      isMulti: true,
      filterOptions: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" }
      ],
      cell: (row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={row.is_active}
            disabled={!isAdmin}
            onCheckedChange={() => handleToggleStatus(row)}
            className={`cursor-pointer ${row.is_active ? 'data-[state=checked]:bg-emerald-500' : 'data-[state=unchecked]:bg-amber-500'}`}
          />
          <span className={`text-xs font-medium ${row.is_active ? "text-emerald-600" : "text-amber-600"}`}>
            {row.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="cursor-pointer"
            size="sm"
            title="Edit"
            onClick={() => handleEdit(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive cursor-pointer hover:text-destructive"
              title="Archive"
              onClick={() => handleDelete(row)}
            >
              <Archive className="h-4 w-4" />
              Archive
            </Button>
          )}
        </div>
      ),
    },
  ], [handleEdit, activeClientOptions, activeLocationOptions])

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

      setTimeout(() => {
        resetForm()
        setView("list")
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
        <main className="flex-1 flex flex-col overflow-auto p-6">
          <div className="w-full flex-1 flex flex-col">
            {view !== "list" && (
            <div className="flex justify-end items-center mb-4">
              <div>
                  <Button variant="outline" onClick={() => { resetForm(); setView("list"); }}>
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
                onAdd={() => { resetForm(); setView("create"); }}
                onAddTooltip="Create Location"
                refreshKey={refreshKey}
                columnFilters={columnFilters}
                onFilterChange={(newFilters) => setColumnFilters(prev => ({ ...prev, ...newFilters }))}
              />
            ) : (
              <div className="space-y-6 w-full pb-10">
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-6 w-full">
                    {/* Client Selection */}
                    <Card className="w-full shadow-sm border-slate-200/80 rounded-xl overflow-hidden bg-white">
                      <CardHeader className="bg-slate-50/80 border-b border-slate-100/60 pb-5">
                        <CardTitle className="text-lg font-bold text-slate-800">Select Client</CardTitle>
                        <CardDescription className="text-sm font-medium text-slate-500">
                          Choose the client for which you want to add locations
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6">
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
                          <Label htmlFor="customer" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                            Client <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={selectedCustomer}
                            onValueChange={setSelectedCustomer}
                            disabled={isLoading || isLoadingCustomers || !!editingId}
                            required
                          >
                            <SelectTrigger className="w-full h-10 bg-slate-50/50 border-slate-200 focus:ring-blue-500 shadow-none text-sm">
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
                      <Card className="w-full shadow-sm border-slate-200/80 rounded-xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/80 border-b border-slate-100/60 pb-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg font-bold text-slate-800">Locations</CardTitle>
                              <CardDescription className="text-sm font-medium text-slate-500">
                                Add one or more locations for the selected client
                              </CardDescription>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addLocation}
                              disabled={isLoading}
                              className={`h-9 bg-white border-slate-200 text-slate-700 shadow-none ${editingId ? "hidden" : ""}`}
                            >
                              <Plus className="h-4 w-4 mr-2 text-slate-500" />
                              Add Location
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                          {error && selectedCustomer && (
                            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive mb-4">
                              {error}
                            </div>
                          )}
                          <div className="space-y-4">
                            {locations.map((location, index) => (
                              <div
                                key={location.id}
                                className="p-5 border border-slate-200 rounded-lg space-y-5 bg-slate-50/30"
                              >
                                <div className="flex items-center justify-between">
                                  <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wider">
                                    Location {index + 1}
                                  </h3>
                                  {(!editingId && locations.length > 1) && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeLocation(location.id)}
                                      disabled={isLoading}
                                      className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor={`location-${location.id}`} className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                    Location Name <span className="text-red-500">*</span>
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
                                    className="h-10 bg-white border-slate-200 focus-visible:ring-blue-500 shadow-none text-sm transition-all"
                                  />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                    <Label htmlFor={`customerNumber-${location.id}`} className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                      SAP Customer Number
                                    </Label>
                                    <Input
                                      id={`customerNumber-${location.id}`}
                                      placeholder="Enter SAP number"
                                      value={location.customerNumber}
                                      onChange={(e) =>
                                        handleLocationChange(
                                          location.id,
                                          "customerNumber",
                                          e.target.value
                                        )
                                      }
                                      disabled={isLoading}
                                      className="h-10 bg-white border-slate-200 focus-visible:ring-blue-500 shadow-none text-sm transition-all"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`gstNumber-${location.id}`} className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                      GST Number <span className="text-red-500">*</span>
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
                                      className="h-10 bg-white border-slate-200 focus-visible:ring-blue-500 shadow-none text-sm transition-all"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>

                        {/* Proper Enterprise Card Footer */}
                        <div className="bg-slate-50 border-t border-slate-100/60 p-4 px-6 flex justify-end gap-3 mt-4">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 px-6 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-none"
                            onClick={() => { resetForm(); setView("list"); }}
                            disabled={isLoading}
                          >
                            {editingId ? "Cancel" : "Cancel"}
                          </Button>
                          <Button type="submit" className="h-10 px-6 bg-blue-600 hover:bg-blue-700 shadow-none text-white font-medium" disabled={isLoading}>
                            {isLoading ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update Location" : "Create Locations")}
                          </Button>
                        </div>
                      </Card>
                    )}
                  </div>
                </form>
              </div>
            )}

            <ConfirmDialog
              isOpen={deleteDialogOpen}
              onClose={() => setDeleteDialogOpen(false)}
              onConfirm={confirmDelete}
              title="Archive Location"
              description={<span>Are you sure you want to archive <strong>{locationToDelete?.location_name}</strong>? This action will remove the location from the active list.</span>}
              confirmText="Archive"
              variant="danger"
              isLoading={isDeleting}
            />

            <ConfirmDialog
              isOpen={toggleDialogOpen}
              onClose={() => setToggleDialogOpen(false)}
              onConfirm={confirmToggleStatus}
              title={locationToToggle?.is_active ? "Deactivate Location" : "Activate Location"}
              description={<span>Are you sure you want to {locationToToggle?.is_active ? "deactivate" : "activate"} <strong>{locationToToggle?.location_name}</strong>?</span>}
              confirmText={locationToToggle?.is_active ? "Deactivate" : "Activate"}
              variant={locationToToggle?.is_active ? "warning" : "success"}
              isLoading={isToggling}
            />
          </div>
        </main>
    </>
  )
}

export default CreateLocation
