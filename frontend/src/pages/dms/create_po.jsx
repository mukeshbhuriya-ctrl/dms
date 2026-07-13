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
import { DocumentPreviewDialog } from "@/components/shared/DocumentPreviewDialog"
import { Upload, Plus, ArrowLeft, FileText, Edit, X, Eye, History, Archive } from "lucide-react"
import { poApi } from "@/api/po.api"
import { exportApi } from "@/api/export.api"
import { commonApi } from "@/api/common.api"
import apiClient from "@/api/api.client"
import { Switch } from "@/components/ui/switch"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { Trash2 } from "lucide-react"
import { useCheckAdmin } from "@/hooks/useCheckAdmin"
import { useAuth } from "@/context/AuthContext"

function CreatePO() {
  const isAdmin = useCheckAdmin()
  const { roles } = useAuth()
  const canArchive = roles?.some(role => ["ADMIN", "MARKETING", "DCC", "TAXATION"].includes(role))

  const [view, setView] = useState("list") // 'list', 'create', or 'attachments'
  const [selectedHistoryPo, setSelectedHistoryPo] = useState(null)

  const [formData, setFormData] = useState({
    customerId: "",
    locationId: "",
    poNumber: "",
    poDate: "",
  })

  const [selectedLocation, setSelectedLocation] = useState(null)
  const [poDocument, setPoDocument] = useState(null)
  const [existingDocUrl, setExistingDocUrl] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)
  const [customers, setCustomers] = useState([])
  const [locations, setLocations] = useState([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)

  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [activePreviewUrl, setActivePreviewUrl] = useState(null)
  const [activePreviewDoc, setActivePreviewDoc] = useState(null)

  const [editingId, setEditingId] = useState(null)
  const [editingPo, setEditingPo] = useState(null)

  const [columnFilters, setColumnFilters] = useState({ is_active: ["true"] })
  const [activeFilters, setActiveFilters] = useState({ records: [] })

  // Delete/Toggle States
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [poToDelete, setPoToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [toggleDialogOpen, setToggleDialogOpen] = useState(false)
  const [poToToggle, setPoToToggle] = useState(null)
  const [isToggling, setIsToggling] = useState(false)

  const [deleteAttachmentDialogOpen, setDeleteAttachmentDialogOpen] = useState(false)
  const [attachmentToDelete, setAttachmentToDelete] = useState(null)
  const [isDeletingAttachment, setIsDeletingAttachment] = useState(false)

  const fetchActiveFilters = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/dcc/get-po-filters")
      if (res.success) setActiveFilters(res.data)
    } catch (err) {
      console.error("Error fetching PO filters:", err)
    }
  }, [])

  useEffect(() => {
    if (view === "list") {
      fetchActiveFilters()
    }
  }, [fetchActiveFilters, view, refreshKey])

  // Reverse Auto-Selection
  useEffect(() => {
    if (!activeFilters.records || activeFilters.records.length === 0) return

    const updates = {}
    if (columnFilters.po_number && Array.isArray(columnFilters.po_number) && columnFilters.po_number.length === 1) {
      const selectedPo = columnFilters.po_number[0]
      const match = activeFilters.records.find(r => r.po_number?.toString() === selectedPo?.toString())
      if (match) {
        if (!columnFilters.customer_name || columnFilters.customer_name.length === 0) updates.customer_name = [match.customer_name]
        if (!columnFilters.location_name || columnFilters.location_name.length === 0) updates.location_name = [match.location_name]
      }
    }

    if (Object.keys(updates).length > 0) {
      setColumnFilters(prev => ({ ...prev, ...updates }))
    }
  }, [columnFilters.po_number, activeFilters.records])

  // Cascading Logic
  const activeCustomerOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.po_number) {
      const selected = Array.isArray(columnFilters.po_number) ? columnFilters.po_number : [columnFilters.po_number.toString()]
      filtered = filtered.filter(f => selected.includes(f.po_number?.toString()))
    }
    if (columnFilters.location_name) {
      const selected = Array.isArray(columnFilters.location_name) ? columnFilters.location_name : [columnFilters.location_name.toString()]
      filtered = filtered.filter(f => selected.includes(f.location_name?.toString()))
    }
    const clients = [...new Set(filtered.map(f => f.customer_name))].filter(Boolean).sort()
    return clients.map(c => ({ label: c, value: c }))
  }, [activeFilters.records, columnFilters.po_number, columnFilters.location_name])

  const activeLocationOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.customer_name) {
      const selected = Array.isArray(columnFilters.customer_name) ? columnFilters.customer_name : [columnFilters.customer_name.toString()]
      filtered = filtered.filter(f => selected.includes(f.customer_name?.toString()))
    }
    if (columnFilters.po_number) {
      const selected = Array.isArray(columnFilters.po_number) ? columnFilters.po_number : [columnFilters.po_number.toString()]
      filtered = filtered.filter(f => selected.includes(f.po_number?.toString()))
    }
    const locs = [...new Set(filtered.map(f => f.location_name))].filter(Boolean).sort()
    return locs.map(l => ({ label: l, value: l }))
  }, [activeFilters.records, columnFilters.customer_name, columnFilters.po_number])

  const activePoOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.customer_name) {
      const selected = Array.isArray(columnFilters.customer_name) ? columnFilters.customer_name : [columnFilters.customer_name.toString()]
      filtered = filtered.filter(f => selected.includes(f.customer_name?.toString()))
    }
    if (columnFilters.location_name) {
      const selected = Array.isArray(columnFilters.location_name) ? columnFilters.location_name : [columnFilters.location_name.toString()]
      filtered = filtered.filter(f => selected.includes(f.location_name?.toString()))
    }
    const pos = [...new Set(filtered.map(f => f.po_number))].filter(Boolean).sort()
    return pos.map(p => ({ label: p, value: p }))
  }, [activeFilters.records, columnFilters.customer_name, columnFilters.location_name])

  const resetForm = useCallback(() => {
    setFormData({
      customerId: "",
      locationId: "",
      poNumber: "",
      poDate: "",
    })
    setSelectedLocation(null)
    setPoDocument(null)
    setExistingDocUrl(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setEditingId(null)
    setEditingPo(null)
    setError("")
    setSuccess("")

    const fileInput = document.getElementById("documentUpload")
    if (fileInput) fileInput.value = ""
  }, [previewUrl])

  const handleEdit = useCallback(async (po) => {
    setFormData({
      customerId: String(po.customer_id),
      locationId: String(po.customer_location_id),
      poNumber: po.po_number || "",
      poDate: po.po_date ? new Date(po.po_date).toISOString().split('T')[0] : "",
    })

    if (po.customer_location) {
      setLocations([po.customer_location])
      setSelectedLocation(po.customer_location)
    }

    setExistingDocUrl(po.po_doc_url)
    setPoDocument(null)
    setPreviewUrl(null)
    setEditingId(po.id)
    setEditingPo(po)
    setView("create")
    setError("")
    setSuccess("")
  }, [])

  const handleDelete = useCallback((po) => {
    setPoToDelete(po)
    setDeleteDialogOpen(true)
  }, [])

  const confirmDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await apiClient.delete(`/api/dcc/delete-po/${poToDelete.id}`)
      if (res.success) {
        setSuccess("PO deleted successfully")
        setRefreshKey(prev => prev + 1)
        setDeleteDialogOpen(false)
      } else {
        setError(res.message || "Failed to delete PO")
      }
    } catch (err) {
      setError(err.message || "Something went wrong")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleStatus = (po) => {
    setPoToToggle(po)
    setToggleDialogOpen(true)
  }

  const confirmToggleStatus = async () => {
    setIsToggling(true)
    try {
      const res = await apiClient.patch(`/api/dcc/pos/toggle-status/${poToToggle.id}`)
      if (res.success) {
        setSuccess(`PO ${res.data.is_active ? "activated" : "deactivated"} successfully`)
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

  const confirmDeleteAttachment = async () => {
    setIsDeletingAttachment(true)
    try {
      const res = await apiClient.delete(`/api/dcc/delete-po-attachment/${attachmentToDelete.id}`)
      if (res.success) {
        setSuccess("Attachment deleted successfully")
        setRefreshKey(prev => prev + 1)
        setDeleteAttachmentDialogOpen(false)
      } else {
        setError(res.message || "Failed to delete attachment")
      }
    } catch (err) {
      setError(err.message || "Something went wrong")
    } finally {
      setIsDeletingAttachment(false)
    }
  }

  const columns = useMemo(() => [
    {
      accessorKey: "po_number",
      header: "PO No",
      filterType: "select",
      isMulti: true,
      filterOptions: activePoOptions
    },
    {
      accessorKey: "location_name",
      header: "Location",
      filterType: "select",
      isMulti: true,
      filterOptions: activeLocationOptions,
      cell: (row) => row.customer_location?.location_name || "-"
    },
    {
      accessorKey: "customer_name",
      header: "Client",
      filterType: "select",
      isMulti: true,
      filterOptions: activeCustomerOptions,
      cell: (row) => row.customer?.customer_name || "-"
    },
    {
      accessorKey: "po_date",
      header: "PO Date",
      cell: (row) => new Date(row.po_date).toLocaleDateString(),
    },
    {
      accessorKey: "po_doc_url",
      header: "Document",
      cell: (row) => {
        let displayUrl = row.po_doc_url;
        let displayName = "Document";
        let isImage = false;

        if (row.po_attachment_history && row.po_attachment_history.length > 0) {
          const latestHistory = row.po_attachment_history[0];
          const attachments = latestHistory.po_attachments || [];
          if (attachments.length > 0) {
            const doc = attachments[0];
            if (doc.url) {
              displayUrl = doc.url;
              displayName = doc.name || doc.filename || "Document";
            }
          }
        }

        if (displayUrl) {
          const fileExt = displayUrl.split(".").pop()?.toLowerCase();
          isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExt);
        }

        return displayUrl ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-800 hover:bg-transparent p-0 flex items-center gap-1 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setActivePreviewUrl(displayUrl);
              setActivePreviewDoc({ documentName: displayName, isImage });
              setIsPreviewOpen(true);
            }}
          >
            <FileText className="h-3 w-3" /> Preview
          </Button>
        ) : "-";
      },
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
            className={`${row.is_active ? 'data-[state=checked]:bg-emerald-500' : 'data-[state=unchecked]:bg-amber-500'}`}
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            title="Edit"
            onClick={() => handleEdit(row)}
            className="cursor-pointer"
          >
            <Edit className="h-4 w-4" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            title="Attachments"
            onClick={() => {
              setSelectedHistoryPo(row);
              setView("attachments");
            }}
          >
            <History className="h-4 w-4" /> Attachments
          </Button>
          {canArchive && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive cursor-pointer hover:text-destructive"
              title="Archive"
              onClick={() => handleDelete(row)}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
          )}
        </div>
      ),
    },
  ], [handleEdit, activeCustomerOptions, activeLocationOptions, activePoOptions, isAdmin, canArchive])

  const fetchPos = useCallback(async (params) => {
    try {
      const queryParams = { ...params };
      if (queryParams.columnFilters) {
        queryParams.columnFilters = JSON.stringify(queryParams.columnFilters);
      }
      const responseData = await apiClient.get('/api/dcc/get-pos', queryParams)
      return responseData;
    } catch (err) {
      console.error("Error fetching POs:", err)
      return { success: false, data: [], meta: {} }
    }
  }, [])

  // Fetch customers
  const fetchCustomers = async () => {
    setIsLoadingCustomers(true)
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

  const fetchLocations = async (customerId) => {
    if (!customerId) {
      setLocations([])
      return
    }
    setIsLoadingLocations(true)
    try {
      const responseData = await apiClient.get('/api/dcc/get-customer-locations', { limit: 1000, customer_id: customerId })
      if (responseData.success) {
        setLocations(responseData.data || [])
      } else {
        setLocations([])
        console.error("Failed to fetch locations", responseData)
      }
    } catch (err) {
      console.error("Error fetching locations:", err)
      setError(err?.message || "Failed to load locations")
      setLocations([])
    } finally {
      setIsLoadingLocations(false)
    }
  }

  useEffect(() => {
    if (view === "create") {
      fetchCustomers()
    }
  }, [view])

  const handleCustomerChange = (customerId) => {
    setFormData((prev) => ({
      ...prev,
      customerId,
      locationId: "",
    }))
    setSelectedLocation(null)
    setError("")
    fetchLocations(customerId)
  }

  const handleLocationChange = (locationId) => {
    const location = locations.find((loc) => loc.id === locationId)
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
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPoDocument(file)
      setPreviewUrl(URL.createObjectURL(file))
      setError("")
    }
  }

  const handleRemoveDocument = () => {
    setPoDocument(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    const fileInput = document.getElementById("documentUpload")
    if (fileInput) {
      fileInput.value = ""
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append("customer_id", formData.customerId)
      formDataToSend.append("customer_location_id", formData.locationId)
      formDataToSend.append("po_number", formData.poNumber)
      formDataToSend.append("po_date", formData.poDate)

      if (poDocument) {
        formDataToSend.append("po_document", poDocument)
      }

      if (editingId) {
        await apiClient.put(`/api/dcc/update-po/${editingId}`, formDataToSend)
        setSuccess("PO updated successfully!")
      } else {
        await apiClient.post('/api/dcc/create-po', formDataToSend)
        setSuccess("PO created successfully!")
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

  const availableLocations = locations

  const handleExport = async () => {
    try {
      await exportApi.exportModule('po');
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("PO Export failed:", error);
    }
  };

  return (
    <>
      <main className="flex-1 flex flex-col overflow-auto p-6">
        <div className="w-full flex-1 flex flex-col">
          {view !== "list" && (
            <div className="flex justify-end items-center mb-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { resetForm(); setView("list"); }}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                </Button>
              </div>
            </div>
          )}

          {view === "list" ? (
            <ProDataTable
              columns={columns}
              fetchData={fetchPos}
              onExport={handleExport}
              onAdd={() => { resetForm(); setView("create"); }}
              onAddTooltip="Create PO"
              refreshKey={refreshKey}
              columnFilters={columnFilters}
              onFilterChange={(newFilters) => setColumnFilters(prev => ({ ...prev, ...newFilters }))}
            />
          ) : view === "attachments" ? (
            <ProDataTable
              columns={[
                {
                  accessorKey: "revision",
                  header: "Attachment",
                  cell: (row) => `${row.revision}`
                },
                {
                  accessorKey: "createdAt",
                  header: "Created Date",
                  cell: (row) => {
                    const d = new Date(row.createdAt);
                    return d.toLocaleString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(',', '');
                  }
                },
                {
                  id: "actions",
                  header: "Actions",
                  cell: (row) => {
                    const attachments = row.po_attachments || [];
                    if (attachments.length === 0) return "-";
                    const doc = attachments[0];
                    const fileExt = doc.filename?.split(".").pop()?.toLowerCase();
                    const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExt);

                    return (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="cursor-pointer"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePreviewUrl(doc.url);
                            setActivePreviewDoc({
                              documentName: doc.name || doc.filename || "Attachment",
                              isImage
                            });
                            setIsPreviewOpen(true);
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAttachmentToDelete(row);
                            setDeleteAttachmentDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  }
                }
              ]}
              fetchData={async (params) => {
                if (!selectedHistoryPo?.id) return { data: [], meta: { pageCount: 0, total: 0 } };
                try {
                  const response = await apiClient.get(`/api/dcc/get-po-attachments/${selectedHistoryPo.id}`);
                  const records = response?.data || [];
                  return {
                    data: records,
                    meta: {
                      page: 1,
                      totalPages: 1,
                      total: records.length,
                    }
                  };
                } catch (e) {
                  console.error("Failed to fetch po attachments", e);
                  return { data: [], meta: { page: 1, totalPages: 0, total: 0 } };
                }
              }}
              searchPlaceholder="Search..."
            />
          ) : (
            <div className="space-y-6 w-full pb-10">
              <form onSubmit={handleSubmit}>
                <div className="grid gap-6 w-full">
                  {/* Customer & Location Card */}
                  <Card className="w-full shadow-sm border-slate-200/80 rounded-xl overflow-hidden bg-white">
                    <CardHeader className="bg-slate-50/80 border-b border-slate-100/60 pb-5">
                      <CardTitle className="text-lg font-bold text-slate-800">Customer & Location</CardTitle>
                      <CardDescription className="text-sm font-medium text-slate-500">
                        Select the customer and location for this purchase order
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                      {error && !formData.customerId && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive mb-4">
                          {error}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="customerId" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                            Customer <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={formData.customerId}
                            onValueChange={handleCustomerChange}
                            disabled={isLoading || isLoadingCustomers || !!editingId}
                            required
                          >
                            <SelectTrigger className="w-full h-10 bg-slate-50/50 border-slate-200 focus:ring-blue-500 shadow-none text-sm">
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
                            <Label htmlFor="locationId" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                              Location <span className="text-red-500">*</span>
                            </Label>
                            <Select
                              value={formData.locationId}
                              onValueChange={handleLocationChange}
                              disabled={isLoading || isLoadingLocations || !formData.customerId || !!editingId}
                              required
                            >
                              <SelectTrigger className="w-full h-10 bg-slate-50/50 border-slate-200 focus:ring-blue-500 shadow-none text-sm">
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
                      </div>
                    </CardContent>
                  </Card>

                  {/* Purchase Order Details Card */}
                  {formData.locationId && (
                    <Card className="w-full shadow-sm border-slate-200/80 rounded-xl overflow-hidden bg-white">
                      <CardHeader className="bg-slate-50/80 border-b border-slate-100/60 pb-5">
                        <CardTitle className="text-lg font-bold text-slate-800">Purchase Order Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="poNumber" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                              PO Number <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="poNumber"
                              name="poNumber"
                              value={formData.poNumber}
                              onChange={handleInputChange}
                              required
                              className="h-10 bg-white border-slate-200 focus-visible:ring-blue-500 shadow-none text-sm transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="poDate" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                              PO Date <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="poDate"
                              name="poDate"
                              type="date"
                              value={formData.poDate}
                              onChange={handleInputChange}
                              required
                              className="h-10 bg-white border-slate-200 focus-visible:ring-blue-500 shadow-none text-sm transition-all"
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                            PO Document <span className="text-red-500">*</span>
                          </Label>
                          <div className="space-y-4">
                            <Label htmlFor="documentUpload" className="cursor-pointer inline-block">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 bg-white border-slate-200 text-slate-700 shadow-none"
                                onClick={() => document.getElementById("documentUpload").click()}
                              >
                                <Upload className="h-4 w-4 mr-2 text-slate-500" /> Upload Document
                              </Button>
                            </Label>
                            <input
                              id="documentUpload"
                              type="file"
                              accept=".pdf,.doc,.docx,.xls,.xlsx"
                              onChange={handleDocumentUpload}
                              className="hidden"
                            />

                            {editingPo?.po_attachment_history?.length > 0 ? (
                              <div className="flex flex-col gap-2 mt-4">
                                <span className="text-xs font-bold text-slate-700 uppercase">Attachment History</span>
                                {editingPo.po_attachment_history.map((history, idx) => {
                                  const attachments = history.po_attachments || [];
                                  if (attachments.length === 0) return null;
                                  const doc = attachments[0];
                                  return (
                                    <div key={idx} className="flex flex-col gap-2 p-3 border border-slate-200 rounded-lg mb-2 bg-slate-50/50">
                                      <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                          <span className="text-sm font-medium text-slate-800">Rev {history.revision}: {doc.name || doc.filename || "Attachment"}</span>
                                          <span className="text-[11px] text-slate-500 mt-1">{new Date(history.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 bg-white border-slate-200"
                                            onClick={() => {
                                              const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(doc.url?.split(".").pop()?.toLowerCase());
                                              setActivePreviewUrl(doc.url)
                                              setActivePreviewDoc({ documentName: doc.name || doc.filename, isImage })
                                              setIsPreviewOpen(true)
                                            }}
                                          >
                                            <Eye className="h-4 w-4 mr-2 text-slate-500" /> Preview
                                          </Button>
                                          {doc.url && (
                                            <a href={doc.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs flex items-center px-2 font-medium">
                                              <FileText className="h-3 w-3 mr-1" /> Open
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              existingDocUrl && !poDocument && (
                                <div className="flex flex-col gap-2 p-4 border border-slate-200 rounded-lg mt-4 bg-slate-50/50">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-800">Current Document</span>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 bg-white border-slate-200"
                                        onClick={() => {
                                          setActivePreviewUrl(existingDocUrl)
                                          setActivePreviewDoc({ filePath: existingDocUrl })
                                          setIsPreviewOpen(true)
                                        }}
                                      >
                                        <Eye className="h-4 w-4 mr-2 text-slate-500" /> Preview
                                      </Button>
                                      <a href={existingDocUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs flex items-center px-2 font-medium">
                                        <FileText className="h-3 w-3 mr-1" /> Open
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              )
                            )}

                            {poDocument && (
                              <div className="flex flex-col gap-2 p-4 border border-blue-200 rounded-lg bg-blue-50/30">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-slate-800">{poDocument.name}</span>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-8 bg-white border-slate-200"
                                      onClick={() => {
                                        setActivePreviewUrl(previewUrl)
                                        setActivePreviewDoc({ mimeType: poDocument.type, documentName: poDocument.name })
                                        setIsPreviewOpen(true)
                                      }}
                                    >
                                      <Eye className="h-4 w-4 mr-2 text-slate-500" /> Preview
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={handleRemoveDocument} className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>

                      {/* Footer Actions */}
                      <div className="bg-slate-50 border-t border-slate-100/60 p-4 px-6 flex justify-end gap-3 mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 px-6 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-none"
                          onClick={() => {
                            if (!editingId) {
                              setFormData({ customerId: "", locationId: "", poNumber: "", poDate: "" })
                              setSelectedLocation(null)
                            }
                            setPoDocument(null)
                            if (previewUrl) {
                              URL.revokeObjectURL(previewUrl)
                              setPreviewUrl(null)
                            }
                            if (editingId) {
                              setEditingId(null)
                              setEditingPo(null)
                              setView("list")
                            }
                          }}
                          disabled={isLoading}
                        >
                          {editingId ? "Cancel" : "Reset"}
                        </Button>
                        <Button type="submit" className="h-10 px-6 bg-blue-600 hover:bg-blue-700 shadow-none text-white font-medium" disabled={isLoading}>
                          {isLoading ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update PO" : "Create PO")}
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Archive"
        description={<span>Are you sure you want to archive <strong>{poToDelete?.po_number}</strong>? This action will remove it from the active list.</span>}
        confirmText="Archive"
        variant="danger"
        isLoading={isDeleting}
      />

      <ConfirmDialog
        isOpen={toggleDialogOpen}
        onClose={() => setToggleDialogOpen(false)}
        onConfirm={confirmToggleStatus}
        title={poToToggle?.is_active ? "Deactivate PO" : "Activate PO"}
        description={<span>Are you sure you want to {poToToggle?.is_active ? "deactivate" : "activate"} PO <strong>{poToToggle?.po_number}</strong>?</span>}
        confirmText={poToToggle?.is_active ? "Deactivate" : "Activate"}
        variant={poToToggle?.is_active ? "warning" : "success"}
        isLoading={isToggling}
      />

      <DocumentPreviewDialog
        isOpen={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        previewUrl={activePreviewUrl}
        activePreviewDoc={activePreviewDoc}
      />
      <ConfirmDialog
        isOpen={deleteAttachmentDialogOpen}
        onClose={() => setDeleteAttachmentDialogOpen(false)}
        onConfirm={confirmDeleteAttachment}
        title="Delete Attachment"
        description={<span>Are you sure you want to permanently delete revision <strong>{attachmentToDelete?.revision}</strong>? This action cannot be undone.</span>}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeletingAttachment}
      />
    </>
  )
}

export default CreatePO
