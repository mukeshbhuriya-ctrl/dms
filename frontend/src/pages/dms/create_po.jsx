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
import { Upload, X, Plus, Mail, ArrowLeft, FileText } from "lucide-react"

function CreatePO() {
  const [view, setView] = useState("list") // 'list' or 'create'

  const [formData, setFormData] = useState({
    customerId: "",
    locationId: "",
    poNumber: "",
    poDate: "",
  })

  const [selectedLocation, setSelectedLocation] = useState(null)
  const [poDocument, setPoDocument] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  const [customers, setCustomers] = useState([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)

  const [shrenoCommunication, setShrenoCommunication] = useState([
    { name: "", email: "" },
  ])
  const [clientCommunication, setClientCommunication] = useState([
    { name: "", email: "" },
  ])

  const columns = useMemo(() => [
    {
      accessorKey: "customer.customer_name",
      header: "Customer",
    },
    {
      accessorKey: "customer_location.location_name",
      header: "Location",
    },
    {
      accessorKey: "po_number",
      header: "PO Number",
    },
    {
      accessorKey: "po_date",
      header: "PO Date",
      cell: (row) => new Date(row.po_date).toLocaleDateString(),
    },
    {
      accessorKey: "po_doc_url",
      header: "Document",
      cell: (row) => row.po_doc_url ? (
        <a
          href={row.po_doc_url}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:underline flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <FileText className="h-3 w-3" /> View
        </a>
      ) : "-",
    },
    {
      accessorKey: "createdAt",
      header: "Created Date",
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ], [])

  const fetchPos = useCallback(async ({ page, limit, search, sorting }) => {
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

      const params = new URLSearchParams()
      params.append("page", page)
      params.append("limit", limit)
      if (search) params.append("search", search)
      if (sorting && sorting.length > 0) {
        params.append("sortBy", sorting[0].id)
        params.append("sortOrder", sorting[0].desc ? "desc" : "asc")
      }

      const res = await fetch(`${backendUrl}/api/dcc/get-pos?${params.toString()}`, {
        method: "GET",
        headers,
        credentials: "include",
      })

      const responseData = await res.json()

      if (res.ok && responseData.success) {
        return {
          data: responseData.data || [],
          meta: responseData.meta || {}
        }
      } else {
        console.error("Failed to fetch POs", responseData)
        return { data: [], meta: {} }
      }
    } catch (err) {
      console.error("Error fetching POs:", err)
      return { data: [], meta: {} }
    }
  }, [])

  // Fetch customers
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

      const res = await fetch(`${backendUrl}/api/dcc/get-customers?limit=1000`, {
        method: "GET",
        headers,
        credentials: "include",
      })

      const responseData = await res.json()
      if (res.ok && responseData.success) {
        setCustomers(responseData.data || [])
      } else {
        console.error("Failed to fetch customers", responseData)
      }
    } catch (err) {
      console.error("Error fetching customers:", err)
      setError(err?.message || "Failed to load customers")
    } finally {
      setIsLoadingCustomers(false)
    }
  }

  useEffect(() => {
    if (view === "create") {
      fetchCustomers()
    }
  }, [view])

  const getLocationsForCustomer = (customerId) => {
    const customer = customers.find((c) => c.id === customerId)
    return customer?.customer_locations || []
  }

  const handleCustomerChange = (customerId) => {
    setFormData((prev) => ({
      ...prev,
      customerId,
      locationId: "",
    }))
    setSelectedLocation(null)
    setError("")
  }

  const handleLocationChange = (locationId) => {
    const customerLocations = getLocationsForCustomer(formData.customerId)
    const location = customerLocations.find((loc) => loc.id === locationId)
    setFormData((prev) => ({
      ...prev,
      locationId,
    }))
    setSelectedLocation(location)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleDocumentUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPoDocument(file)
      setError("")
    }
  }

  const handleRemoveDocument = () => {
    setPoDocument(null)
    const fileInput = document.getElementById("documentUpload")
    if (fileInput) {
      fileInput.value = ""
    }
  }

  // Communication Matrix Handlers
  const handleShrenoCommunicationChange = (index, field, value) => {
    setShrenoCommunication((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleClientCommunicationChange = (index, field, value) => {
    setClientCommunication((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const addShrenoCommunication = () => {
    setShrenoCommunication((prev) => [...prev, { name: "", email: "" }])
  }

  const removeShrenoCommunication = (index) => {
    setShrenoCommunication((prev) => prev.filter((_, i) => i !== index))
  }

  const addClientCommunication = () => {
    setClientCommunication((prev) => [...prev, { name: "", email: "" }])
  }

  const removeClientCommunication = (index) => {
    setClientCommunication((prev) => prev.filter((_, i) => i !== index))
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

      const communicationMatrix = {
        shreno: shrenoCommunication
          .filter((contact) => contact.name && contact.email)
          .map((contact) => ({
            name: String(contact.name).trim(),
            email: String(contact.email).trim(),
          })),
        client: clientCommunication
          .filter((contact) => contact.name && contact.email)
          .map((contact) => ({
            name: String(contact.name).trim(),
            email: String(contact.email).trim(),
          })),
      }

      if (
        !communicationMatrix ||
        typeof communicationMatrix !== "object" ||
        !Array.isArray(communicationMatrix.shreno) ||
        !Array.isArray(communicationMatrix.client)
      ) {
        throw new Error("Invalid communication matrix format")
      }

      const formDataToSend = new FormData()
      formDataToSend.append("customer_id", formData.customerId)
      formDataToSend.append("customer_location_id", formData.locationId)
      formDataToSend.append("po_number", formData.poNumber)
      formDataToSend.append("po_date", formData.poDate)
      formDataToSend.append("communication_matrix", JSON.stringify(communicationMatrix))

      if (poDocument) {
        formDataToSend.append("po_document", poDocument)
      }

      const headers = {}
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const res = await fetch(`${backendUrl}/api/dcc/create-po`, {
        method: "POST",
        headers,
        credentials: "include",
        body: formDataToSend,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Failed to create PO")
      }

      setSuccess("PO created successfully!")

      // Reset form
      setFormData({
        customerId: "",
        locationId: "",
        poNumber: "",
        poDate: "",
      })
      setSelectedLocation(null)
      setPoDocument(null)
      setShrenoCommunication([{ name: "", email: "" }])
      setClientCommunication([{ name: "", email: "" }])

      const fileInput = document.getElementById("documentUpload")
      if (fileInput) fileInput.value = ""

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

  const availableLocations = formData.customerId
    ? getLocationsForCustomer(formData.customerId)
    : []

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
                  {view === "list" ? "Purchase Orders List" : "Create Purchase Order"}
                </h1>
                <p className="text-muted-foreground">
                  {view === "list"
                    ? "List of all purchase orders"
                    : "Fill in the purchase order information below."}
                </p>
              </div>
              <div>
                {view === "list" ? (
                  <Button onClick={() => setView("create")}>
                    <Plus className="mr-2 h-4 w-4" /> Create PO
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
                  <CardTitle>Purchase Orders</CardTitle>
                  <CardDescription>View and manage purchase orders.</CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={columns}
                    fetchData={fetchPos}
                    key={refreshKey}
                  />
                </CardContent>
              </Card>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="grid gap-6">
                  {/* Form Content */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Customer & Location</CardTitle>
                      <CardDescription>
                        Select the customer and location for this purchase order
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {error && !formData.customerId && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {error}
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="customerId">
                          Customer <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={formData.customerId}
                          onValueChange={handleCustomerChange}
                          disabled={isLoading || isLoadingCustomers}
                          required
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a customer" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={String(customer.id)}>
                                {customer.customer_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.customerId && (
                        <div className="space-y-2">
                          <Label htmlFor="locationId">
                            Location <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={formData.locationId}
                            onValueChange={handleLocationChange}
                            disabled={isLoading || !formData.customerId}
                            required
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a location" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableLocations.map((location) => (
                                <SelectItem
                                  key={location.id}
                                  value={String(location.id)}
                                  className="items-start"
                                >
                                  <div className="flex flex-col text-left">
                                    <span className="font-medium">{location.location_name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      GST: {location.gst_number || "N/A"}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {formData.locationId && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Purchase Order Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="poNumber">PO Number *</Label>
                            <Input
                              id="poNumber"
                              name="poNumber"
                              value={formData.poNumber}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="poDate">PO Date *</Label>
                            <Input
                              id="poDate"
                              name="poDate"
                              type="date"
                              value={formData.poDate}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>PO Document *</Label>
                          <div className="space-y-4">
                            <Label htmlFor="documentUpload" className="cursor-pointer">
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => document.getElementById("documentUpload").click()}
                                >
                                  <Upload className="h-4 w-4 mr-2" /> Upload Document
                                </Button>
                              </div>
                            </Label>
                            <input
                              id="documentUpload"
                              type="file"
                              accept=".pdf,.doc,.docx,.xls,.xlsx"
                              onChange={handleDocumentUpload}
                              className="hidden"
                            />
                            {poDocument && (
                              <div className="flex items-center gap-2 p-2 border rounded">
                                <span className="text-sm">{poDocument.name}</span>
                                <Button type="button" variant="ghost" size="sm" onClick={handleRemoveDocument}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {formData.locationId && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Communication Matrix</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Shreno */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h3 className="font-semibold flex items-center gap-2">
                              <Mail className="h-4 w-4" /> Shreno Communication
                            </h3>
                            <Button type="button" variant="outline" size="sm" onClick={addShrenoCommunication}>
                              <Plus className="h-4 w-4 mr-2" /> Add
                            </Button>
                          </div>
                          {shrenoCommunication.map((contact, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                              <Input
                                placeholder="Name"
                                value={contact.name}
                                onChange={(e) => handleShrenoCommunicationChange(index, "name", e.target.value)}
                                required
                              />
                              <Input
                                placeholder="Email"
                                type="email"
                                value={contact.email}
                                onChange={(e) => handleShrenoCommunicationChange(index, "email", e.target.value)}
                                required
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeShrenoCommunication(index)}
                                disabled={shrenoCommunication.length === 1}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        {/* Client */}
                        <div className="space-y-4 border-t pt-4">
                          <div className="flex justify-between items-center">
                            <h3 className="font-semibold flex items-center gap-2">
                              <Mail className="h-4 w-4" /> Client Communication
                            </h3>
                            <Button type="button" variant="outline" size="sm" onClick={addClientCommunication}>
                              <Plus className="h-4 w-4 mr-2" /> Add
                            </Button>
                          </div>
                          {clientCommunication.map((contact, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                              <Input
                                placeholder="Name"
                                value={contact.name}
                                onChange={(e) => handleClientCommunicationChange(index, "name", e.target.value)}
                                required
                              />
                              <Input
                                placeholder="Email"
                                type="email"
                                value={contact.email}
                                onChange={(e) => handleClientCommunicationChange(index, "email", e.target.value)}
                                required
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeClientCommunication(index)}
                                disabled={clientCommunication.length === 1}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {formData.locationId && (
                    <div className="flex justify-end gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setFormData({ customerId: "", locationId: "", poNumber: "", poDate: "" })
                          setSelectedLocation(null)
                          setPoDocument(null)
                        }}
                      >
                        Reset
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Creating..." : "Create PO"}
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

export default CreatePO
