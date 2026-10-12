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
import { Edit, Plus, Trash2, ArrowLeft, Archive, CheckCircle, XCircle } from "lucide-react"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"
import ProDataTable from "@/components/shared/ProDataTable"
import { Switch } from "@/components/ui/switch"
import ConfirmDialog from "@/components/shared/ConfirmDialog"

import { commonApi } from "@/api/common.api"
import { Badge } from "@/components/ui/badge"
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"
import { useAuth } from "@/context/AuthContext";
import { AccessControl } from "@/components/iam/access_control";

function CreateJob() {
  const { hasPermission } = useAuth()
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
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)
  const [isLoadingPOs, setIsLoadingPOs] = useState(false)
  
  const [customers, setCustomers] = useState([])
  const [locations, setLocations] = useState([])
  const [availablePOs, setAvailablePOs] = useState([])
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
    setError("")
    setSuccess("")
  }, [])

  const handleDelete = useCallback((job) => {
    setJobToDelete(job)
    setDeleteDialogOpen(true)
  }, [])

  const confirmDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await apiClient.delete(`/api/dcc/delete-job/${jobToDelete.id}`)
      if (res.success) {
        setSuccess("Job deleted successfully")
        setRefreshKey(prev => prev + 1)
        setDeleteDialogOpen(false)
      } else {
        setError(res.message || "Failed to delete job")
      }
    } catch (err) {
      setError(err.message || "Something went wrong")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleStatus = (job) => {
    setJobToToggle(job)
    setToggleDialogOpen(true)
  }

  const confirmToggleStatus = async () => {
    setIsToggling(true)
    try {
      const res = await apiClient.patch(`/api/dcc/jobs/toggle-status/${jobToToggle.id}`)
      if (res.success) {
        setSuccess(`Job ${res.data.is_active ? "activated" : "deactivated"} successfully`)
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

  const [columnFilters, setColumnFilters] = useState({ is_active: ["true"] })
  const [activeFilters, setActiveFilters] = useState({ records: [] })

  // Delete/Toggle States
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [jobToDelete, setJobToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [toggleDialogOpen, setToggleDialogOpen] = useState(false)
  const [jobToToggle, setJobToToggle] = useState(null)
  const [isToggling, setIsToggling] = useState(false)

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
      accessorKey: "is_active",
      header: "Status",
      filterType: "select",
      isMulti: true,
      filterOptions: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" }
      ],
      cell: (row) => row.is_active
        ? <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-medium">Active</Badge>
        : <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20 text-xs font-medium">Inactive</Badge>,
    },
    {
      id: "actions",
      header: "Actions",
      width: "60px",
      cell: (row) => {
        const actions = [
          { label: "Edit Job", icon: Edit, onClick: () => handleEdit(row) },
        ];
        
        if (hasPermission("job:management", "Delete")) {
          actions.push({ type: "separator" });
          actions.push({ 
            label: row.is_active ? "Deactivate Job" : "Activate Job", 
            icon: row.is_active ? XCircle : CheckCircle, 
            onClick: () => handleToggleStatus(row),
            color: row.is_active ? "danger" : "default"
          });
          actions.push({ type: "separator" });
          actions.push({ label: "Archive Job", icon: Archive, color: "danger", onClick: () => handleDelete(row) });
        }

        return (
          <div className="flex items-center justify-center">
            <DataTableRowActions actions={actions} />
          </div>
        );
      },
      enableSorting: false,
    },
  ], [handleEdit, activeCustomerOptions, activeLocationOptions, activePoOptions])

  const fetchJobsList = useCallback(async (params) => {
    const queryParams = { ...params };
    if (queryParams.columnFilters) {
      queryParams.columnFilters = JSON.stringify(queryParams.columnFilters);
    }
    const responseData = await apiClient.get('/api/dcc/get-jobs', queryParams)
    return responseData;
  }, [])

  // Fetch lightweight customers list on mount
  const fetchCustomers = async () => {
    setIsLoadingCustomers(true)
    try {
      const responseData = await commonApi.getCustomers()
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

  // Fetch locations from backend when customer changes
  const fetchLocations = async (customerId) => {
    if (!customerId) {
      setLocations([])
      return
    }
    setIsLoadingLocations(true)
    try {
      const res = await commonApi.getLocations({ customer_id: customerId })
      if (res.success) setLocations(res.data || [])
    } catch (err) {
      console.error("Error fetching locations:", err)
    } finally {
      setIsLoadingLocations(false)
    }
  }

  // Fetch POs from backend when customer/location changes
  const fetchPOs = async (customerId, locationId) => {
    if (!customerId) {
      setAvailablePOs([])
      return
    }
    setIsLoadingPOs(true)
    try {
      const params = { customer_id: customerId }
      if (locationId) params.location_id = locationId
      const res = await commonApi.getPos(params)
      if (res.success) setAvailablePOs(res.data || [])
    } catch (err) {
      console.error("Error fetching POs:", err)
    } finally {
      setIsLoadingPOs(false)
    }
  }

  useEffect(() => {
    if (view === "create") {
      fetchCustomers()
    }
  }, [view])

  useEffect(() => {
    fetchLocations(formData.customerId)
  }, [formData.customerId])

  useEffect(() => {
    fetchPOs(formData.customerId, formData.locationId)
  }, [formData.customerId, formData.locationId])

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
      const selectedPO = availablePOs.find((po) => po.id === poId)
      if (selectedPO) {
        setFormData((prev) => ({
          ...prev,
          poId: poId,
        }))
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
    <>
      <PageContainer scrollable={view !== "list"}>
        <div className="w-full flex-1 flex flex-col min-h-0 h-full">
          {view !== "list" && (
            <div className="flex justify-end items-center mb-4">
              <div>
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
              </div>
            </div>
          )}

          {view === "list" ? (
            <ProDataTable
              columns={columns}
              fetchData={fetchJobsList}
              onExport={handleExport}
              onAdd={() => setView("create")}
              onAddTooltip="Create Job"
              refreshKey={refreshKey}
              columnFilters={columnFilters}
              onFilterChange={(newFilters) => setColumnFilters(prev => ({ ...prev, ...newFilters }))}
            />
          ) : (
            <form onSubmit={handleSubmit} className="w-full">
              <div className="grid gap-6 w-full">
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
                            {locations.length > 0 ? (
                              locations.map((location) => (
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
                              <SelectItem value="no-location" disabled>
                                {isLoadingLocations ? "Loading..." : "No locations available"}
                              </SelectItem>
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
                          {availablePOs.map((po) => (
                            <SelectItem key={po.id} value={String(po.id)}>
                              {po.po_number} {po.customer?.customer_name ? `(${po.customer.customer_name})` : ""}
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
                                  disabled={!!editingId}
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
                    <AccessControl required="job:management:Create">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update Job" : "Create Jobs")}
                    </Button>
                    </AccessControl>
                  </div>
                )}
              </div>
            </form>
          )}

          <ConfirmDialog
            isOpen={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            onConfirm={confirmDelete}
            title="Archive"
            description={<span>Are you sure you want to archive <strong>{jobToDelete?.job_number}</strong>? This action will remove it from the active list.</span>}
            confirmText="Archive"
            variant="danger"
            isLoading={isDeleting}
          />

          <ConfirmDialog
            isOpen={toggleDialogOpen}
            onClose={() => setToggleDialogOpen(false)}
            onConfirm={confirmToggleStatus}
            title={jobToToggle?.is_active ? "Deactivate Job" : "Activate Job"}
            description={<span>Are you sure you want to {jobToToggle?.is_active ? "deactivate" : "activate"} Job <strong>{jobToToggle?.job_number}</strong>?</span>}
            confirmText={jobToToggle?.is_active ? "Deactivate" : "Activate"}
            variant={jobToToggle?.is_active ? "warning" : "success"}
            isLoading={isToggling}
          />
        </div>
      </PageContainer>
    </>
  )
}

export default CreateJob
