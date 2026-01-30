import { useState, useEffect } from "react"
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
import { Upload, X, Plus, Mail } from "lucide-react"

function CreatePO() {
  const [formData, setFormData] = useState({
    customerId: "",
    locationId: "",
    poNumber: "",
    poDate: "",
  })
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [poDocument, setPoDocument] = useState(null) // Single file for po_doc_url
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  const [customers, setCustomers] = useState([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [shrenoCommunication, setShrenoCommunication] = useState([
    { name: "", email: "" },
  ])
  const [clientCommunication, setClientCommunication] = useState([
    { name: "", email: "" },
  ])

  // Fetch customers from API
  useEffect(() => {
    const fetchCustomers = async () => {
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

        const res = await fetch(`${backendUrl}/api/dcc/get-customers`, {
          method: "GET",
          headers,
          credentials: "include",
        })

        const contentType = res.headers.get("content-type") || ""
        const payload = contentType.includes("application/json")
          ? await res.json()
          : await res.text()

        if (!res.ok) {
          const message =
            typeof payload === "string"
              ? payload
              : payload?.message || "Failed to fetch customers"
          throw new Error(message)
        }

        // Extract customers from response
        const customersData = payload?.data || payload?.customers || []
        setCustomers(customersData)
      } catch (err) {
        console.error("Error fetching customers:", err)
        setError(err?.message || "Failed to load customers")
      } finally {
        setIsLoadingCustomers(false)
      }
    }

    fetchCustomers()
  }, [])

  // Get locations for selected customer
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
    // Reset file input
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

      // Prepare communication matrix - ensure it's always a valid object
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

      // Validate communication matrix structure
      if (
        !communicationMatrix ||
        typeof communicationMatrix !== "object" ||
        !Array.isArray(communicationMatrix.shreno) ||
        !Array.isArray(communicationMatrix.client)
      ) {
        throw new Error("Invalid communication matrix format")
      }

      // Create FormData to send file along with other data
      const formDataToSend = new FormData()
      
      // Add text fields
      formDataToSend.append("customer_id", formData.customerId)
      formDataToSend.append("customer_location_id", formData.locationId)
      formDataToSend.append("po_number", formData.poNumber)
      formDataToSend.append("po_date", formData.poDate)
      
      // Send communication_matrix as JSON string - backend should parse it
      // If backend uses multer or similar, it will be available as string in req.body
      // Backend needs to: const communication_matrix = JSON.parse(req.body.communication_matrix)
      formDataToSend.append("communication_matrix", JSON.stringify(communicationMatrix))
      
      // Add file if provided
      if (poDocument) {
        formDataToSend.append("po_document", poDocument) // Backend will handle file upload
      }

      const headers = {}
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
      // Don't set Content-Type header - browser will set it with boundary for FormData

      const res = await fetch(`${backendUrl}/api/dcc/create-po`, {
        method: "POST",
        headers,
        credentials: "include",
        body: formDataToSend, // Send FormData instead of JSON
      })

      const contentType = res.headers.get("content-type") || ""
      const payload = contentType.includes("application/json")
        ? await res.json()
        : await res.text()

      if (!res.ok) {
        const message =
          typeof payload === "string"
            ? payload
            : payload?.message || "Failed to create PO"
        throw new Error(message)
      }

      setSuccess("PO created successfully!")
      
      // Reset form after successful creation
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
      
      // Reset file input
      const fileInput = document.getElementById("documentUpload")
      if (fileInput) {
        fileInput.value = ""
      }

      setTimeout(() => {
        setSuccess("")
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
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Create Purchase Order</h1>
              <p className="text-muted-foreground">
                Fill in the purchase order information below.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid gap-6">
                {/* Customer and Location Selection */}
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
                    {success && (
                      <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
                        {success}
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
                            {availableLocations.length === 0 ? (
                              <SelectItem value="no-locations" disabled>
                                No locations found for this customer
                              </SelectItem>
                            ) : (
                              availableLocations.map((location) => (
                                <SelectItem key={location.id} value={String(location.id)}>
                                  <div className="flex flex-col">
                                    <span>{location.location_name || location.name}</span>
                                    {location.gst_number && (
                                      <span className="text-xs text-muted-foreground">
                                        GST: {location.gst_number}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {selectedLocation && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Selected Location: <strong>{selectedLocation.location_name || selectedLocation.name}</strong>
                            {selectedLocation.gst_number && (
                              <> | GST Number: <strong>{selectedLocation.gst_number}</strong></>
                            )}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* PO Details */}
                {formData.locationId && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Purchase Order Details</CardTitle>
                      <CardDescription>
                        Enter the purchase order information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="poNumber">
                          PO Number <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="poNumber"
                          name="poNumber"
                          type="text"
                          placeholder="Enter PO number"
                          value={formData.poNumber}
                          onChange={handleInputChange}
                          required
                          disabled={isLoading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="poDate">
                          PO Date <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="poDate"
                          name="poDate"
                          type="date"
                          value={formData.poDate}
                          onChange={handleInputChange}
                          required
                          disabled={isLoading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="poDocuments">
                          PO Document <span className="text-destructive">*</span>
                        </Label>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="documentUpload" className="cursor-pointer">
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() =>
                                    document.getElementById("documentUpload").click()
                                  }
                                  disabled={isLoading}
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  Upload Document
                                </Button>
                              </div>
                            </Label>
                            <input
                              id="documentUpload"
                              type="file"
                              accept=".pdf,.doc,.docx,.xls,.xlsx"
                              onChange={handleDocumentUpload}
                              className="hidden"
                              disabled={isLoading}
                            />
                            <p className="text-sm text-muted-foreground mt-2">
                              Upload PO document (PDF, DOC, DOCX, XLS, XLSX)
                            </p>
                          </div>

                          {poDocument && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Uploaded Document</p>
                              <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Upload className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{poDocument.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({(poDocument.size / 1024).toFixed(2)} KB)
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleRemoveDocument}
                                  disabled={isLoading}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* PO Communication Matrix */}
                {formData.locationId && (
                  <Card>
                    <CardHeader>
                      <CardTitle>PO Communication Matrix</CardTitle>
                      <CardDescription>
                        Add communication contacts for Shreno and Client side
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Shreno Communication */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              <Mail className="h-5 w-5" />
                              Shreno Communication
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Add Shreno team members for communication
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addShrenoCommunication}
                            disabled={isLoading}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Contact
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {shrenoCommunication.map((contact, index) => (
                            <div
                              key={index}
                              className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg"
                            >
                              <div className="space-y-2">
                                <Label htmlFor={`shreno-name-${index}`}>
                                  Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                  id={`shreno-name-${index}`}
                                  type="text"
                                  placeholder="Enter name"
                                  value={contact.name}
                                  onChange={(e) =>
                                    handleShrenoCommunicationChange(
                                      index,
                                      "name",
                                      e.target.value
                                    )
                                  }
                                  disabled={isLoading}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`shreno-email-${index}`}>
                                  Email <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                  id={`shreno-email-${index}`}
                                  type="email"
                                  placeholder="Enter email"
                                  value={contact.email}
                                  onChange={(e) =>
                                    handleShrenoCommunicationChange(
                                      index,
                                      "email",
                                      e.target.value
                                    )
                                  }
                                  disabled={isLoading}
                                  required
                                />
                              </div>
                              <div className="flex items-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeShrenoCommunication(index)}
                                  disabled={
                                    isLoading || shrenoCommunication.length === 1
                                  }
                                  className="text-destructive hover:text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t"></div>

                      {/* Client Side Communication */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              <Mail className="h-5 w-5" />
                              Client Side Communication
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Add client team members for communication
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addClientCommunication}
                            disabled={isLoading}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Contact
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {clientCommunication.map((contact, index) => (
                            <div
                              key={index}
                              className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg"
                            >
                              <div className="space-y-2">
                                <Label htmlFor={`client-name-${index}`}>
                                  Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                  id={`client-name-${index}`}
                                  type="text"
                                  placeholder="Enter name"
                                  value={contact.name}
                                  onChange={(e) =>
                                    handleClientCommunicationChange(
                                      index,
                                      "name",
                                      e.target.value
                                    )
                                  }
                                  disabled={isLoading}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`client-email-${index}`}>
                                  Email <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                  id={`client-email-${index}`}
                                  type="email"
                                  placeholder="Enter email"
                                  value={contact.email}
                                  onChange={(e) =>
                                    handleClientCommunicationChange(
                                      index,
                                      "email",
                                      e.target.value
                                    )
                                  }
                                  disabled={isLoading}
                                  required
                                />
                              </div>
                              <div className="flex items-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeClientCommunication(index)}
                                  disabled={
                                    isLoading || clientCommunication.length === 1
                                  }
                                  className="text-destructive hover:text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Submit Buttons */}
                {formData.locationId && (
                  <div className="flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
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
                        setError("")
                        setSuccess("")
                        // Reset file input
                        const fileInput = document.getElementById("documentUpload")
                        if (fileInput) {
                          fileInput.value = ""
                        }
                      }}
                      disabled={isLoading}
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
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default CreatePO

