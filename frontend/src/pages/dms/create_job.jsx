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
import { Plus, Trash2, ArrowLeft, Edit } from "lucide-react"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"

function CreateJob() {
  const [view, setView] = useState("list") // 'list' or 'create'

  const [formData, setFormData] = useState({
    customerId: "",
    locationId: "",
    poId: "",
  })

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
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingId, setEditingId] = useState(null)

  const handleEdit = useCallback((job) => {
    setFormData({
      customerId: String(job.customer?.id || ""),
      locationId: String(job.customer_location?.id || ""),
      poId: String(job.po?.id || ""),
    })
    setJobs([{
      id: 1,
      job_number: job.job_number || "",
      project_id: job.project_id || "",
      equipement_name: job.equipement_name || "",
      tag_number: job.tag_number || "",
      code: job.code || "",
    }])
    setEditingId(job.id)
    setView("create")
    setError("")
    setSuccess("")
  }, [])

  const columns = useMemo(() => [
    {
      accessorKey: "job_number",
      header: "Job Number",
    },
    {
      accessorKey: "customer.customer_name",
      header: "Customer",
    },
    {
      accessorKey: "customer_location.location_name",
      header: "Location",
    },
    {
      accessorKey: "po.po_number",
      header: "PO Number",
    },
    {
      accessorKey: "project_id",
      header: "Project ID",
      cell: (row) => row.project_id || "-",
    },
    {
      accessorKey: "equipement_name",
      header: "Equipment",
      cell: (row) => row.equipement_name || "-",
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleEdit(row)}
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      ),
    },
  ], [handleEdit])

  const fetchJobs = useCallback(async ({ page, limit, search, sorting }) => {
    try {
      const params = { page, limit }
      if (search) params.search = search
      if (sorting && sorting.length > 0) {
        params.sortBy = sorting[0].id
        params.sortOrder = sorting[0].desc ? "desc" : "asc"
      }

      const responseData = await apiClient.get('/api/dcc/get-jobs', params)

      if (responseData.success) {
        return {
          data: responseData.data || [],
          meta: responseData.meta || {}
        }
      } else {
        console.error("Failed to fetch jobs", responseData)
        return { data: [], meta: {} }
      }
    } catch (err) {
      console.error("Error fetching jobs:", err)
      return { data: [], meta: {} }
    }
  }, [])

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const responseData = await apiClient.get('/api/dcc/get-customers', { limit: 1000 })
      if (responseData.success) {
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

  const getPOsForLocation = (locationId) => {
    if (!formData.customerId || !locationId) return []
    const customer = customers.find((c) => c.id === formData.customerId)
    if (!customer) return []
    const location = customer.customer_locations?.find((loc) => loc.id === locationId)
    return location?.pos || []
  }

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

  const availableLocations = formData.customerId
    ? getLocationsForCustomer(formData.customerId)
    : []

  const availablePOs = formData.locationId
    ? getPOsForLocation(formData.locationId)
    : []

  const allPOs = getAllPOs()

  const handleCustomerChange = (customerId) => {
    setFormData((prev) => ({
      ...prev,
      customerId,
      locationId: "",
      poId: "",
    }))
    setError("")
  }

  const handleLocationChange = (locationId) => {
    setFormData((prev) => ({
      ...prev,
      locationId,
      poId: "",
    }))
    setError("")
  }

  const handlePOChange = (poId) => {
    if (poId) {
      const selectedPO = allPOs.find((po) => po.id === poId)
      if (selectedPO) {
        setFormData({
          customerId: selectedPO.customer_id,
          locationId: selectedPO.location_id,
          poId: poId,
        })
      } else {
        setFormData((prev) => ({ ...prev, poId }))
      }
    } else {
      setFormData((prev) => ({ ...prev, poId: "" }))
    }
    setError("")
  }

  const handleJobChange = (id, field, value) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === id ? { ...job, [field]: value } : job
      )
    )
    if (error) setError("")
  }

  const addJob = () => {
    const newId = Math.max(...jobs.map((j) => j.id), 0) + 1
    setJobs((prev) => [
      ...prev,
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
      if (editingId) {
        const updateBody = {
          job_number: jobs[0].job_number.trim(),
          project_id: jobs[0].project_id?.trim() || null,
          equipement_name: jobs[0].equipement_name?.trim() || null,
          tag_number: jobs[0].tag_number?.trim() || null,
          code: jobs[0].code?.trim() || null,
        }
        await apiClient.put(`/api/dcc/update-job/${editingId}`, updateBody)
        setSuccess("Job updated successfully!")
      } else {
        const validJobs = jobs.filter((job) => job.job_number.trim())
        if (validJobs.length === 0) {
          throw new Error("Please add at least one job number")
        }

        const jobsArray = validJobs.map((job) => ({
          job_number: job.job_number.trim(),
          project_id: job.project_id?.trim() || null,
          equipement_name: job.equipement_name?.trim() || null,
          tag_number: job.tag_number?.trim() || null,
          code: job.code?.trim() || null,
        }))

        const requestBody = {
          customer_id: formData.customerId,
          customer_location_id: formData.locationId,
          po_id: formData.poId,
          jobs: jobsArray,
        }

        await apiClient.post('/api/dcc/create-job', requestBody)
        setSuccess(`Successfully created ${validJobs.length} job(s)!`)
      }

      // Reset form
      setFormData({ customerId: "", locationId: "", poId: "" })
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
      setEditingId(null)

      // Refresh list and switch view
      setRefreshKey(prev => prev + 1)
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

  const handleExport = async () => {
    try {
      await exportApi.exportJobs();
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 flex flex-col overflow-auto p-6">
          <div className="w-full flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {view === "list" ? "Manage Jobs" : (editingId ? "Update Job" : "Create Job")}
                </h1>
                <p className="text-muted-foreground">
                  {view === "list"
                    ? "List of all created jobs"
                    : (editingId ? "Update the details for the selected job." : "Select customer, location, and PO to create jobs.")}
                </p>
              </div>
              <div>
                {view === "list" ? (
                  <Button onClick={() => {
                    setEditingId(null)
                    setFormData({ customerId: "", locationId: "", poId: "" })
                    setJobs([{ id: 1, job_number: "", project_id: "", equipement_name: "", tag_number: "", code: "" }])
                    setView("create")
                  }}>
                    <Plus className="mr-2 h-4 w-4" /> Create Job
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => {
                    setView("list")
                    setFormData({ customerId: "", locationId: "", poId: "" })
                    setJobs([{
                      id: 1,
                      job_number: "",
                      project_id: "",
                      equipement_name: "",
                      tag_number: "",
                      code: "",
                    }])
                    setEditingId(null)
                  }}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                  </Button>
                )}
              </div>
            </div>

            {view === "list" ? (
              <Card className="flex-1 flex flex-col">
                <CardHeader>
                  <CardTitle>Jobs</CardTitle>
                  <CardDescription>View and manage jobs.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <DataTable
                    columns={columns}
                    fetchData={fetchJobs}
                    onExport={handleExport}
                  />
                </CardContent>
              </Card>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="grid gap-6">
                  {/* Selection Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Job Details Selection</CardTitle>
                      <CardDescription>
                        Select Purchase Order to proceed
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="customerId">
                          Customer <span className="text-destructive">*</span>
                          {formData.poId && <span className="text-muted-foreground text-xs ml-2">(auto-filled)</span>}
                        </Label>
                        <Select
                          value={formData.customerId}
                          onValueChange={handleCustomerChange}
                          disabled={isLoading || isLoadingCustomers || !!formData.poId || !!editingId}
                          required
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a customer" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={String(customer.id)}>
                                {customer.customer_name || customer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.customerId && (
                        <div className="space-y-2">
                          <Label htmlFor="locationId">
                            Location <span className="text-destructive">*</span>
                            {formData.poId && <span className="text-muted-foreground text-xs ml-2">(auto-filled)</span>}
                          </Label>
                          <Select
                            value={formData.locationId}
                            onValueChange={handleLocationChange}
                            disabled={isLoading || !formData.customerId || !!formData.poId || !!editingId}
                            required
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a location" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableLocations.length > 0 ? (
                                availableLocations.map((location) => (
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
                                ))
                              ) : (
                                <SelectItem value="no-location" disabled>No locations available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="poId">
                          Purchase Order <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={formData.poId}
                          onValueChange={handlePOChange}
                          disabled={isLoading || isLoadingCustomers || !!editingId}
                          required
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a purchase order" />
                          </SelectTrigger>
                          <SelectContent>
                            {allPOs.map((po) => (
                              <SelectItem key={po.id} value={String(po.id)}>
                                {po.po_number} ({po.customer_name})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Job Details Card */}
                  {formData.poId && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Job Details</CardTitle>
                        <CardDescription>
                          Enter the job details for this purchase order
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {jobs.map((job) => (
                            <div key={job.id}>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Job Number <span className="text-destructive">*</span></Label>
                                  <Input
                                    value={job.job_number}
                                    onChange={(e) => handleJobChange(job.id, "job_number", e.target.value)}
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Project ID</Label>
                                  <Input
                                    value={job.project_id}
                                    onChange={(e) => handleJobChange(job.id, "project_id", e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Equipment Name <span className="text-destructive">*</span></Label>
                                  <Input
                                    value={job.equipement_name}
                                    onChange={(e) => handleJobChange(job.id, "equipement_name", e.target.value)}
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Tag Number <span className="text-destructive">*</span></Label>
                                  <Input
                                    value={job.tag_number}
                                    onChange={(e) => handleJobChange(job.id, "tag_number", e.target.value)}
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Code</Label>
                                  <Input
                                    value={job.code}
                                    onChange={(e) => handleJobChange(job.id, "code", e.target.value)}
                                  />
                                </div>
                              </div>
                              {(!editingId && jobs.length > 1) && (
                                <Button type="button" variant="outline" size="icon" onClick={() => removeJob(job.id)} className="mt-4">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                              <hr className="my-6" />
                            </div>
                          ))}
                          <Button type="button" variant="outline" onClick={addJob} className={`w-full ${editingId ? 'hidden' : ''}`}>
                            <Plus className="h-4 w-4 mr-2" /> Add Another Job
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {(formData.poId || editingId) && (
                    <div className="flex justify-end gap-4">
                      <Button type="button" variant="outline" onClick={() => {
                        if (!editingId) {
                          setFormData({ customerId: "", locationId: "", poId: "" })
                        }
                        setJobs([{ id: 1, job_number: "", project_id: "", equipement_name: "", tag_number: "", code: "" }])
                        if (editingId) {
                          setEditingId(null)
                          setView("list")
                        }
                      }}>
                        {editingId ? "Cancel" : "Reset"}
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update Job" : "Create Jobs")}
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
