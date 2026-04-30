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
import { Edit, Plus, Trash2, ArrowLeft } from "lucide-react"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"
import ProDataTable from "@/components/shared/ProDataTable"

const toSlug = (value = "") => String(value).trim().toLowerCase().replace(/\s+/g, "-")

function CreateJob() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: routeId } = useParams()
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
      const res = await apiClient.get("/api/dcc/get-manage-job-filters")
      if (res.success) setActiveFilters(res.data)
    } catch (err) {
      console.error("Error fetching active filters:", err)
    }
  }, [])

  useEffect(() => {
    if (view === "list") {
      fetchActiveFilters()
    }
  }, [fetchActiveFilters, view, refreshKey])

  // Auto-selection for reverse cascading
  useEffect(() => {
    if (!activeFilters.records || activeFilters.records.length === 0) return

    const updates = {}
    
    // Reverse Auto-Selection from Job Number (MSN)
    if (columnFilters.job_number && Array.isArray(columnFilters.job_number) && columnFilters.job_number.length === 1) {
      const selectedJob = columnFilters.job_number[0]
      const match = activeFilters.records.find(r => r.job_number?.toString() === selectedJob?.toString())
      if (match) {
        if (!columnFilters.customer || columnFilters.customer.length === 0) updates.customer = [match.customer]
        if (!columnFilters.po_number || columnFilters.po_number.length === 0) updates.po_number = [match.po_number]
        if (!columnFilters.location || columnFilters.location.length === 0) updates.location = [match.location]
      }
    } 
    // Reverse Auto-Selection from PO Number
    else if (columnFilters.po_number && Array.isArray(columnFilters.po_number) && columnFilters.po_number.length === 1) {
      const selectedPo = columnFilters.po_number[0]
      const match = activeFilters.records.find(r => r.po_number?.toString() === selectedPo?.toString())
      if (match) {
        if (!columnFilters.customer || columnFilters.customer.length === 0) updates.customer = [match.customer]
        if (!columnFilters.location || columnFilters.location.length === 0) updates.location = [match.location]
      }
    }

    if (Object.keys(updates).length > 0) {
      setColumnFilters(prev => ({ ...prev, ...updates }))
    }
  }, [columnFilters.job_number, columnFilters.po_number, activeFilters.records])

  // Cascading Logic
  const activeJobOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.customer) {
      const selected = Array.isArray(columnFilters.customer) ? columnFilters.customer : [columnFilters.customer.toString()]
      filtered = filtered.filter(c => selected.includes(c.customer?.toString()))
    }
    if (columnFilters.location) {
      const selected = Array.isArray(columnFilters.location) ? columnFilters.location : [columnFilters.location.toString()]
      filtered = filtered.filter(c => selected.includes(c.location?.toString()))
    }
    if (columnFilters.po_number) {
      const selected = Array.isArray(columnFilters.po_number) ? columnFilters.po_number : [columnFilters.po_number.toString()]
      filtered = filtered.filter(c => selected.includes(c.po_number?.toString()))
    }
    const jobs = [...new Set(filtered.map(c => c.job_number))].filter(Boolean).sort()
    return jobs.map(j => ({ label: j, value: j }))
  }, [activeFilters.records, columnFilters.customer, columnFilters.location, columnFilters.po_number])

  const activeCustomerOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.job_number) {
      const selected = Array.isArray(columnFilters.job_number) ? columnFilters.job_number : [columnFilters.job_number.toString()]
      filtered = filtered.filter(c => selected.includes(c.job_number?.toString()))
    }
    if (columnFilters.po_number) {
      const selected = Array.isArray(columnFilters.po_number) ? columnFilters.po_number : [columnFilters.po_number.toString()]
      filtered = filtered.filter(c => selected.includes(c.po_number?.toString()))
    }
    const clients = [...new Set(filtered.map(c => c.customer))].filter(Boolean).sort()
    return clients.map(c => ({ label: c, value: c }))
  }, [activeFilters.records, columnFilters.job_number, columnFilters.po_number])

  const activeLocationOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.job_number) {
      const selected = Array.isArray(columnFilters.job_number) ? columnFilters.job_number : [columnFilters.job_number.toString()]
      filtered = filtered.filter(c => selected.includes(c.job_number?.toString()))
    }
    if (columnFilters.customer) {
      const selected = Array.isArray(columnFilters.customer) ? columnFilters.customer : [columnFilters.customer.toString()]
      filtered = filtered.filter(c => selected.includes(c.customer?.toString()))
    }
    if (columnFilters.po_number) {
      const selected = Array.isArray(columnFilters.po_number) ? columnFilters.po_number : [columnFilters.po_number.toString()]
      filtered = filtered.filter(c => selected.includes(c.po_number?.toString()))
    }
    const locs = [...new Set(filtered.map(c => c.location))].filter(Boolean).sort()
    return locs.map(l => ({ label: l, value: l }))
  }, [activeFilters.records, columnFilters.job_number, columnFilters.customer, columnFilters.po_number])

  const activePoOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.job_number) {
      const selected = Array.isArray(columnFilters.job_number) ? columnFilters.job_number : [columnFilters.job_number.toString()]
      filtered = filtered.filter(c => selected.includes(c.job_number?.toString()))
    }
    if (columnFilters.customer) {
      const selected = Array.isArray(columnFilters.customer) ? columnFilters.customer : [columnFilters.customer.toString()]
      filtered = filtered.filter(c => selected.includes(c.customer?.toString()))
    }
    const pos = [...new Set(filtered.map(c => c.po_number))].filter(Boolean).sort()
    return pos.map(p => ({ label: p, value: p }))
  }, [activeFilters.records, columnFilters.job_number, columnFilters.customer])

  useEffect(() => {
    const loadJobByNumber = async (jobNumber) => {
      try {
        const response = await apiClient.get("/api/dcc/get-jobs", {
          page: 1,
          limit: 200,
          search: jobNumber,
        })
        const rows = response?.data || []
        const matched = rows.find((j) => toSlug(j.job_number) === toSlug(jobNumber))
        if (!matched) {
          setError(`Job not found: ${jobNumber}`)
          return
        }
        handleEdit(matched)
      } catch {
        setError(`Unable to load job: ${jobNumber}`)
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
      if (row) handleEdit(row)
      else if (routeId) loadJobByNumber(decodeURIComponent(routeId))
      else setError("Please open edit/view from the jobs list once so data can load.")
    } else {
      setEditingId(null)
      setFormData({ customerId: "", locationId: "", poId: "" })
      setJobs([{ id: 1, job_number: "", project_id: "", equipement_name: "", tag_number: "", code: "" }])
    }
  }, [mode, routeId, location.state, handleEdit])

  const handleView = useCallback((job) => {
    navigate(`/jobs/view/${toSlug(job.job_number)}`, { state: { record: job } })
  }, [navigate])

  const columns = useMemo(() => [
    {
      accessorKey: "job_number",
      header: "job Number",
      filterType: "select",
      isMulti: true,
      filterOptions: activeJobOptions
    },
    {
      accessorKey: "customer",
      header: "Client",
      filterType: "select",
      isMulti: true,
      filterOptions: activeCustomerOptions,
      cell: (row) => row.customer?.customer_name || "-"
    },
    {
      accessorKey: "po_number",
      header: "PO No",
      filterType: "select",
      isMulti: true,
      filterOptions: activePoOptions,
      cell: (row) => row.po?.po_number || "-"
    },
    {
      accessorKey: "location",
      header: "Location",
      filterType: "select",
      isMulti: true,
      filterOptions: activeLocationOptions,
      cell: (row) => row.customer_location?.location_name || "-"
    },

    {
      accessorKey: "project_id",
      header: "Project ID",
      filterType: "text",
      cell: (row) => row.project_id || "-",
    },
    {
      accessorKey: "equipment",
      header: "Equipment",
      filterType: "text",
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleView(row)}>
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/jobs/edit/${toSlug(row.job_number)}`, { state: { record: row } })}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      ),
    },
  ], [activeCustomerOptions, activeLocationOptions, activePoOptions, handleView, navigate])

  const fetchJobsList = useCallback(async (params) => {
    const queryParams = { ...params };
    if (queryParams.columnFilters) {
      queryParams.columnFilters = JSON.stringify(queryParams.columnFilters);
    }
    const responseData = await apiClient.get('/api/dcc/get-jobs', queryParams)
    return responseData;
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
        navigate("/jobs/list")
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
                  {mode === "view" ? "View Job" : (editingId ? "Update Job" : "Create Job")}
                </h1>
                <p className="text-muted-foreground">
                  {mode === "view"
                    ? "Review the selected job details."
                    : (editingId ? "Update the details for the selected job." : "Select customer, location, and PO to create jobs.")}
                </p>
              </div>
              <div>
                <Button variant="outline" onClick={() => {
                  navigate("/jobs/list")
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
              </div>
            </div>
          )}

          {view === "list" ? (
            <ProDataTable
              columns={columns}
              fetchData={fetchJobsList}
              onExport={handleExport}
              onAdd={() => navigate("/jobs/create")}
              onAddTooltip="Create Job"
              refreshKey={refreshKey}
              columnFilters={columnFilters}
              onFilterChange={(newFilters) => setColumnFilters(prev => ({ ...prev, ...newFilters }))}
            />
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid gap-6">
                {/* Selection Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Job Details Selection</CardTitle>
                    <CardDescription>
                      {mode === "view" ? "Selected purchase order context." : "Select Purchase Order to proceed"}
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
                        disabled={isLoading || isLoadingCustomers || !!formData.poId || !!editingId || isReadOnly}
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
                          disabled={isLoading || !formData.customerId || !!formData.poId || !!editingId || isReadOnly}
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
                        disabled={isLoading || isLoadingCustomers || !!editingId || isReadOnly}
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
                        {mode === "view" ? "Read-only job details for this purchase order." : "Enter the job details for this purchase order"}
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
                                  disabled={isReadOnly || !!editingId}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Project ID</Label>
                                <Input
                                  value={job.project_id}
                                  onChange={(e) => handleJobChange(job.id, "project_id", e.target.value)}
                                  disabled={isReadOnly}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Equipment Name <span className="text-destructive">*</span></Label>
                                <Input
                                  value={job.equipement_name}
                                  onChange={(e) => handleJobChange(job.id, "equipement_name", e.target.value)}
                                  disabled={isReadOnly}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Tag Number <span className="text-destructive">*</span></Label>
                                <Input
                                  value={job.tag_number}
                                  onChange={(e) => handleJobChange(job.id, "tag_number", e.target.value)}
                                  disabled={isReadOnly}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Code</Label>
                                <Input
                                  value={job.code}
                                  onChange={(e) => handleJobChange(job.id, "code", e.target.value)}
                                  disabled={isReadOnly}
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
                        <Button type="button" variant="outline" onClick={addJob} disabled={isReadOnly} className={`w-full ${editingId ? 'hidden' : ''}`}>
                          <Plus className="h-4 w-4 mr-2" /> Add Another Job
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {(formData.poId || editingId) && !isReadOnly && (
                  <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => {
                      if (!editingId) {
                        setFormData({ customerId: "", locationId: "", poId: "" })
                      }
                      setJobs([{ id: 1, job_number: "", project_id: "", equipement_name: "", tag_number: "", code: "" }])
                      if (editingId) {
                        setEditingId(null)
                        navigate("/jobs/list")
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
    </>
  )
}

export default CreateJob
