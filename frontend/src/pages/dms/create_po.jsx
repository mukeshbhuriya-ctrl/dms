import { useState, useEffect, useMemo, useCallback } from "react"

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
import { DataTable } from "@/components/shared/DataTable"
import { DocumentPreviewDialog } from "@/components/shared/DocumentPreviewDialog"
import { Upload, Plus, ArrowLeft, FileText, Edit, X, Eye, History } from "lucide-react"
import { poApi } from "@/api/po.api"
import { exportApi } from "@/api/export.api"
import { commonApi } from "@/api/common.api"
import apiClient from "@/api/api.client"

function CreatePO() {
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



  const handleEdit = useCallback(async (po) => {
    // Populate form logic
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
            className="text-blue-600 hover:text-blue-800 hover:bg-transparent p-0 flex items-center gap-1"
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
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(row)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedHistoryPo(row);
              setView("attachments");
            }}
          >
            <History className="h-4 w-4 mr-1" />
            History
          </Button>
        </div>
      ),
    },
  ], [handleEdit])

  const fetchPos = useCallback(async ({ page, limit, search, sorting }) => {
    try {
      const params = { page, limit }
      if (search) params.search = search
      if (sorting && sorting.length > 0) {
        params.sortBy = sorting[0].id
        params.sortOrder = sorting[0].desc ? "desc" : "asc"
      }

      const responseData = await poApi.getPos(params)

      if (responseData.success) {
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
      const responseData = await commonApi.getLocations({ limit: 1000, customer_id: customerId })
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
      } else if (existingDocUrl) {
        formDataToSend.append("po_doc_url", existingDocUrl)
      }

      if (editingId) {
        await apiClient.put(`/api/dcc/update-po/${editingId}`, formDataToSend)
        setSuccess("PO updated successfully!")
      } else {
        await poApi.createPo(formDataToSend)
        setSuccess("PO created successfully!")
      }

      // Reset form
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

      const fileInput = document.getElementById("documentUpload")
      if (fileInput) fileInput.value = ""

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
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 flex flex-col overflow-auto p-6">
          <div className="w-full flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {view === "list" ? "Purchase Orders" : view === "create" ? (editingId ? "Edit Purchase Order" : "Create Purchase Order") : `PO Attachments: ${selectedHistoryPo?.po_number || ""}`}
                </h1>
                <p className="text-muted-foreground">
                  {view === "list"
                    ? "Manage your purchase orders"
                    : view === "create" 
                      ? "Enter the details for the new purchase order" 
                      : "View history of attachments for this purchase order"}
                </p>
              </div>
              <div className="flex gap-2">
                {view !== "list" && (
                  <Button variant="outline" onClick={() => {
                    setView("list");
                    setEditingId(null);
                    setSelectedHistoryPo(null);
                  }}>
                    Back to List
                  </Button>
                )}
                {view === "list" && (
                  <Button onClick={() => {
                    setEditingId(null)
                    setEditingPo(null)
                    setFormData({ customerId: "", locationId: "", poNumber: "", poDate: "" })
                    setSelectedLocation(null)
                    setPoDocument(null)
                    setExistingDocUrl(null)
                    if (previewUrl) {
                      URL.revokeObjectURL(previewUrl)
                      setPreviewUrl(null)
                    }

                    setView("create")
                  }}>
                    <Plus className="mr-2 h-4 w-4" /> Create PO
                  </Button>
                )}
              </div>
            </div>

            {view === "list" && (
              <DataTable
                columns={columns}
                fetchData={fetchPos}
                searchPlaceholder="Search POs..."
                refreshKey={refreshKey}
              />
            )}
            
            {view === "attachments" && (
              <DataTable
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
                        <Button
                          variant="outline"
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
                      );
                    }
                  }
                ]}
                fetchData={async (params) => {
                  if (!selectedHistoryPo?.id) return { data: [], meta: { pageCount: 0, total: 0 } };
                  try {
                    const response = await poApi.getPoAttachments(selectedHistoryPo.id);
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
                disablePagination={true}
              />
            )}

            {view === "create" && (
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
                          disabled={isLoading || isLoadingCustomers || !!editingId}
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
                            disabled={isLoading || isLoadingLocations || !formData.customerId || !!editingId}
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
                            {editingPo?.po_attachment_history?.length > 0 ? (
                              <div className="flex flex-col gap-2 mt-4">
                                <span className="text-sm font-medium">Attachment History</span>
                                {editingPo.po_attachment_history.map((history, idx) => {
                                  const attachments = history.po_attachments || [];
                                  if (attachments.length === 0) return null;
                                  const doc = attachments[0];
                                  return (
                                    <div key={idx} className="flex flex-col gap-2 p-3 border rounded mb-2 bg-gray-50/50">
                                      <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                          <span className="text-sm font-medium">Rev {history.revision}: {doc.name || doc.filename || "Attachment"}</span>
                                          <span className="text-xs text-muted-foreground">{new Date(history.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(doc.url?.split(".").pop()?.toLowerCase());
                                              setActivePreviewUrl(doc.url)
                                              setActivePreviewDoc({ documentName: doc.name || doc.filename, isImage })
                                              setIsPreviewOpen(true)
                                            }}
                                          >
                                            <Eye className="h-4 w-4 mr-2" /> Preview
                                          </Button>
                                          {doc.url && (
                                            <a href={doc.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm flex items-center">
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
                                <div className="flex flex-col gap-2 p-4 border rounded mt-4">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Current Document</span>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setActivePreviewUrl(existingDocUrl)
                                          setActivePreviewDoc({ filePath: existingDocUrl })
                                          setIsPreviewOpen(true)
                                        }}
                                      >
                                        <Eye className="h-4 w-4 mr-2" /> Preview
                                      </Button>
                                      <a href={existingDocUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm flex items-center">
                                        <FileText className="h-3 w-3 mr-1" /> Open
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              )
                            )}
                            {poDocument && (
                              <div className="flex flex-col gap-2 p-4 border rounded">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">{poDocument.name}</span>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setActivePreviewUrl(previewUrl)
                                        setActivePreviewDoc({ mimeType: poDocument.type, documentName: poDocument.name })
                                        setIsPreviewOpen(true)
                                      }}
                                    >
                                      <Eye className="h-4 w-4 mr-2" /> Preview
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={handleRemoveDocument}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
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
                      >
                        {editingId ? "Cancel" : "Reset"}
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update PO" : "Create PO")}
                      </Button>
                    </div>
                  )}
                </div>
              </form>
            )}
          </div>
        </main>

        <DocumentPreviewDialog
          isOpen={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          previewUrl={activePreviewUrl}
          activePreviewDoc={activePreviewDoc}
        />
    </>
  )
}

export default CreatePO
