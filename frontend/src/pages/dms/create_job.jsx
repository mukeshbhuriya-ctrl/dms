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
import { Plus, Trash2 } from "lucide-react"

function CreateJob() {
  const [formData, setFormData] = useState({
    customerId: "",
    locationId: "",
    poId: "",
  })
  // const [jobs, setJobs] = useState([
  //   {
  //     id: 1,
  //     jobNumber: "",
  //   },
  // ])
  const [jobs, setJobs] = useState([
    {
      id: 1,
      job_number: "",
      project_id: "",
      equipement_name: "",
      tag_number: "",
      code: "",
    },
  ])

  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  const [customers, setCustomers] = useState([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

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

  // Get POs for selected location
  const getPOsForLocation = (locationId) => {
    if (!formData.customerId || !locationId) return []
    const customer = customers.find((c) => c.id === formData.customerId)
    if (!customer) return []

    // Find the location in customer_locations
    const location = customer.customer_locations?.find((loc) => loc.id === locationId)
    return location?.pos || []
  }

  // Get available locations based on selected customer
  const availableLocations = formData.customerId
    ? getLocationsForCustomer(formData.customerId)
    : []

  // Get all POs from all customers (for direct PO selection)
  const getAllPOs = () => {
    const allPOs = []
    customers.forEach((customer) => {
      customer.customer_locations?.forEach((location) => {
        location.pos?.forEach((po) => {
          allPOs.push({
            ...po,
            customer_id: customer.id,
            customer_name: customer.customer_name || customer.name,
            location_id: location.id,
            location_name: location.location_name || location.name,
          })
        })
      })
    })
    return allPOs
  }

  // Get available POs based on selected location
  const availablePOs = formData.locationId
    ? getPOsForLocation(formData.locationId)
    : []

  // Get all POs for direct selection
  const allPOs = getAllPOs()

  // Handle customer change
  const handleCustomerChange = (customerId) => {
    setFormData((prev) => ({
      ...prev,
      customerId,
      locationId: "",
      poId: "",
    }))
    setError("")
  }

  // Handle location change
  const handleLocationChange = (locationId) => {
    setFormData((prev) => ({
      ...prev,
      locationId,
      poId: "",
    }))
    setError("")
  }

  // Handle PO change - auto-fill customer and location if PO is selected directly
  const handlePOChange = (poId) => {
    if (poId) {
      const selectedPO = allPOs.find((po) => po.id === poId)
      if (selectedPO) {
        // Auto-fill customer and location based on selected PO
        setFormData({
          customerId: selectedPO.customer_id,
          locationId: selectedPO.location_id,
          poId: poId,
        })
      } else {
        setFormData((prev) => ({
          ...prev,
          poId: poId,
        }))
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        poId: "",
      }))
    }
    setError("")
  }

  // Handle job number changes
  // const handleJobChange = (id, value) => {
  //   setJobs((prev) =>
  //     prev.map((job) => (job.id === id ? { ...job, jobNumber: value } : job))
  //   )
  //   if (error) setError("")
  // }

  // Handle job field changes
  const handleJobChange = (id, field, value) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === id ? { ...job, [field]: value } : job
      )
    )

    if (error) setError("")
  }

  // Add new job
  const addJob = () => {
    const newId = Math.max(...jobs.map((j) => j.id), 0) + 1
    setJobs((prev) => [
      ...prev,
      // {
      //   id: newId,
      //   jobNumber: "",
      // },
      {
        id: newId,
        job_number: "",
        project_id: "",
        equipement_name: "",
        tag_number: "",
        code: "",
      },
    ])
  }

  // Remove job
  const removeJob = (id) => {
    if (jobs.length > 1) {
      setJobs((prev) => prev.filter((job) => job.id !== id))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      // Validate jobs
      const validJobs = jobs.filter((job) => job.job_number.trim())
      if (validJobs.length === 0) {
        throw new Error("Please add at least one job number")
      }

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

      // Prepare jobs array
      // const jobsArray = validJobs.map((job) => ({
      //   job_number: job.job_number.trim(),
      // }))

      // Prepare jobs payload (send ALL fields)
      const jobsArray = validJobs.map((job) => ({
        job_number: job.job_number.trim(),
        project_id: job.project_id?.trim() || null,
        equipement_name: job.equipement_name?.trim() || null,
        tag_number: job.tag_number?.trim() || null,
        code: job.code?.trim() || null,
      }))

      // Prepare request body
      const requestBody = {
        customer_id: formData.customerId,
        customer_location_id: formData.locationId,
        po_id: formData.poId,
        jobs: jobsArray,
      }

      const headers = {
        "Content-Type": "application/json",
      }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const res = await fetch(`${backendUrl}/api/dcc/create-job`, {
        method: "POST",
        headers,
        credentials: "include",
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
            : payload?.message || "Failed to create jobs"
        throw new Error(message)
      }

      setSuccess(`Successfully created ${validJobs.length} job(s)!`)

      // Reset form after successful creation
      setFormData({
        customerId: "",
        locationId: "",
        poId: "",
      })
      setJobs([
        {
          id: 1,
          job_number: "",
          project_id: "",
          equipement_name: "",
          tag_number: "",
          code: "",
        },
      ])

      setTimeout(() => {
        setSuccess("")
      }, 3000)
    } catch (err) {
      setError(err?.message || "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  // Get selected PO details for display
  const selectedPO = formData.poId
    ? allPOs.find((po) => po.id === formData.poId) || availablePOs.find((po) => po.id === formData.poId)
    : null

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
              <h1 className="text-3xl font-bold mb-2">Create Job</h1>
              <p className="text-muted-foreground">
                Select customer, location, and PO, or directly select a PO to auto-fill customer and location.
              </p>
            </div>

            {/* Error and Success Messages */}
            {error && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-md">
                <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
              </div>
            )}

            {isLoadingCustomers ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground">Loading customers...</p>
                </CardContent>
              </Card>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="grid gap-6">
                  {/* Combined Selection Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Create Job</CardTitle>
                      <CardDescription>
                        Select customer, location, and purchase order. You can also select a PO directly to auto-fill customer and location. Add multiple job numbers at once.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Customer Selection */}
                      <div className="space-y-2">
                        <Label htmlFor="customerId">
                          Customer <span className="text-destructive">*</span>
                          {formData.poId && (
                            <span className="text-muted-foreground text-xs ml-2">(auto-filled)</span>
                          )}
                        </Label>
                        <Select
                          value={formData.customerId}
                          onValueChange={handleCustomerChange}
                          disabled={isLoading || isLoadingCustomers || !!formData.poId}
                          required
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a customer" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.customer_name || customer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Location Selection */}
                      {formData.customerId && (
                        <div className="space-y-2">
                          <Label htmlFor="locationId">
                            Location <span className="text-destructive">*</span>
                            {formData.poId && (
                              <span className="text-muted-foreground text-xs ml-2">(auto-filled)</span>
                            )}
                          </Label>
                          <Select
                            value={formData.locationId}
                            onValueChange={handleLocationChange}
                            disabled={isLoading || !formData.customerId || !!formData.poId}
                            required
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a location" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableLocations.length > 0 ? (
                                availableLocations.map((location) => (
                                  <SelectItem key={location.id} value={location.id}>
                                    <div className="flex flex-col">
                                      <span>{location.location_name}</span>
                                      {location.gst_number && (
                                        <span className="text-xs text-muted-foreground">
                                          GST: {location.gst_number}
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-location" disabled>
                                  No locations available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* PO Selection */}
                      <div className="space-y-2">
                        <Label htmlFor="poId">
                          Purchase Order <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={formData.poId}
                          onValueChange={handlePOChange}
                          disabled={isLoading || isLoadingCustomers}
                          required
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={
                              formData.locationId
                                ? "Select a purchase order for this location"
                                : "Select a purchase order (will auto-fill customer and location)"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {formData.locationId ? (
                              // Show POs filtered by location
                              availablePOs.length > 0 ? (
                                availablePOs.map((po) => (
                                  <SelectItem key={po.id} value={po.id}>
                                    {po.po_number}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-po" disabled>
                                  No purchase orders available for this location
                                </SelectItem>
                              )
                            ) : (
                              // Show all POs if no location selected (allows direct PO selection)
                              allPOs.length > 0 ? (
                                allPOs.map((po) => (
                                  <SelectItem key={po.id} value={po.id}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{po.po_number}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {po.customer_name} - {po.location_name}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-po" disabled>
                                  No purchase orders available
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        {selectedPO && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Selected PO: <strong>{selectedPO.po_number}</strong>
                            {selectedPO.po_date && (
                              <span className="ml-2">
                                (Date: {new Date(selectedPO.po_date).toLocaleDateString()})
                              </span>
                            )}
                          </p>
                        )}
                      </div>

                      {/* Jobs Section */}
                      {/* {formData.poId && (
                        <div className="space-y-4 pt-4 border-t">
                          <div className="space-y-2">
                            <Label>
                              Job Numbers <span className="text-destructive">*</span>
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Add one or more job numbers for this purchase order
                            </p>
                          </div>
                          <div className="space-y-4">
                            {jobs.map((job, index) => (
                              <div key={job.id} className="flex gap-2 items-start">
                                <div className="flex-1 space-y-2">
                                  <Label htmlFor={`job-${job.id}`} className="text-sm">
                                    Job Number {index + 1}{" "}
                                    {index === 0 && (
                                      <span className="text-destructive">*</span>
                                    )}
                                  </Label>
                                  <Input
                                    id={`job-${job.id}`}
                                    type="text"
                                    placeholder="Enter job number (e.g., JOB-001)"
                                    value={job.jobNumber}
                                    onChange={(e) =>
                                      handleJobChange(job.id, e.target.value)
                                    }
                                    required={index === 0}
                                    disabled={isLoading}
                                  />
                                </div>
                                {jobs.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => removeJob(job.id)}
                                    disabled={isLoading}
                                    className="mt-8"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={addJob}
                              disabled={isLoading}
                              className="w-full"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Another Job
                            </Button>
                          </div>
                        </div>
                      )} */}
                    </CardContent>
                  </Card>

                  {/* Job Detail */}
                  {formData.poId && (
                    <Card>
                      <CardHeader>
                        <div className="space-y-2">
                          <Label>
                            Job Details <span className="text-destructive">*</span>
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Enter the job details for this purchase
                          </p>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {jobs.map((job) => (
                            <div
                              key={job.id}
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Job Number */}
                                <div className="flex-1 space-y-2">
                                  <Label htmlFor={`job_number_${job.id}`} className="text-sm">
                                    Job Number <span className="text-destructive">*</span>
                                  </Label>
                                  <Input
                                    id={`job_number_${job.id}`}
                                    value={job.job_number}
                                    onChange={(e) =>
                                      handleJobChange(job.id, "job_number", e.target.value)
                                    }
                                    required
                                  />
                                </div>

                                {/* Project ID */}
                                <div className="flex-1 space-y-2">
                                  <Label htmlFor={`project_id_${job.id}`} className="text-sm">
                                    Project ID <span className="text-destructive">*</span>
                                  </Label>
                                  <Input
                                    id={`project_id_${job.id}`}
                                    value={job.project_id}
                                    onChange={(e) =>
                                      handleJobChange(job.id, "project_id", e.target.value)
                                    }
                                  />
                                </div>

                                {/* Equipment Name */}
                                <div className="flex-1 space-y-2">
                                  <Label htmlFor={`equipment_name_${job.id}`} className="text-sm">
                                    Equipment Name <span className="text-destructive">*</span>
                                  </Label>
                                  <Input
                                    id={`equipment_name_${job.id}`}
                                    value={job.equipement_name}
                                    onChange={(e) =>
                                      handleJobChange(job.id, "equipement_name", e.target.value)
                                    }
                                  />
                                </div>

                                {/* Tag Number */}
                                <div className="flex-1 space-y-2">
                                  <Label htmlFor={`tag_number_${job.id}`} className="text-sm">
                                    Tag Number <span className="text-destructive">*</span>
                                  </Label>
                                  <Input
                                    id={`tag_number_${job.id}`}
                                    value={job.tag_number}
                                    onChange={(e) =>
                                      handleJobChange(job.id, "tag_number", e.target.value)
                                    }
                                  />
                                </div>

                                {/* Code */}
                                <div className="flex-1 space-y-2">
                                  <Label htmlFor={`code_${job.id}`} className="text-sm">
                                    Code <span className="text-destructive">*</span>
                                  </Label>
                                  <Input
                                    id={`code_${job.id}`}
                                    value={job.code}
                                    onChange={(e) =>
                                      handleJobChange(job.id, "code", e.target.value)
                                    }
                                  />
                                </div>
                              </div>
                              {jobs.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => removeJob(job.id)}
                                  disabled={isLoading}
                                  className="mt-8"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                              <hr className="my-6 border-muted" />
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={addJob}
                            disabled={isLoading}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Another Job
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}


                  {/* Summary */}
                  {formData.poId && formData.customerId && formData.locationId && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Customer:</span>
                            <span className="font-medium">
                              {customers.find((c) => c.id === formData.customerId)
                                ?.customer_name ||
                                customers.find((c) => c.id === formData.customerId)?.name}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Location:</span>
                            <span className="font-medium">
                              {availableLocations.find(
                                (l) => l.id === formData.locationId
                              )?.location_name ||
                                availableLocations.find(
                                  (l) => l.id === formData.locationId
                                )?.name}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">PO Number:</span>
                            <span className="font-medium">
                              {selectedPO?.po_number || selectedPO?.poNumber}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Jobs:</span>
                            <span className="font-medium">
                              {jobs.filter((j) => j.job_number.trim()).length} job(s)
                            </span>
                          </div>
                          {jobs.filter((j) => j.job_number.trim()).length > 0 && (
                            <div className="mt-2 pt-2 border-t">
                              <span className="text-muted-foreground">Job Numbers:</span>
                              <ul className="list-disc list-inside mt-1">
                                {jobs
                                  .filter((j) => j.job_number.trim())
                                  .map((job, idx) => (
                                    <li key={job.id} className="font-medium">
                                      {job.job_number}
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Submit Buttons */}
                  {formData.poId && (
                    <div className="flex justify-end gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setFormData({
                            customerId: "",
                            locationId: "",
                            poId: "",
                          })
                          setJobs([
                            {
                              id: 1,
                              job_number: "",
                              project_id: "",
                              equipement_name: "",
                              tag_number: "",
                              code: "",
                            },
                          ])
                          setError("")
                          setSuccess("")
                        }}
                        disabled={isLoading}
                      >
                        Reset
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading
                          ? "Creating..."
                          : `Create ${jobs.filter((j) => j.job_number.trim()).length || ""} Job${jobs.filter((j) => j.job_number.trim()).length !== 1 ? "s" : ""}`}
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

export default CreateJob

