import { PageContainer } from "@/components/layout/PageContainer";
import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import ProDataTable from "@/components/shared/ProDataTable"
import { Plus, ArrowLeft, Edit, Archive, CheckCircle, XCircle } from "lucide-react"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"
import { Switch } from "@/components/ui/switch"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"
import { useAuth } from "@/context/AuthContext";
import { AccessControl } from "@/components/iam/access_control";

function CreateCustomer() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [view, setView] = useState("list") // 'list' or 'create'

  const [formData, setFormData] = useState({
    customerName: "",
    email: "",
    shortName: "",
    mobileNumber: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingId, setEditingId] = useState(null)

  const [columnFilters, setColumnFilters] = useState({ is_active: ["true"] })
  const [activeFilters, setActiveFilters] = useState({ records: [] })

  // Delete/Toggle States
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [toggleDialogOpen, setToggleDialogOpen] = useState(false)
  const [customerToToggle, setCustomerToToggle] = useState(null)
  const [isToggling, setIsToggling] = useState(false)

  const fetchActiveFilters = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/dcc/get-customer-filters")
      if (res.success) setActiveFilters(res.data)
    } catch (err) {
      console.error("Error fetching customer filters:", err)
    }
  }, [])

  useEffect(() => {
    if (view === "list") {
      fetchActiveFilters()
    }
  }, [fetchActiveFilters, view, refreshKey])

  // Cascading Logic
  const activeCustomerOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.customer_short_name) {
      const selected = Array.isArray(columnFilters.customer_short_name) ? columnFilters.customer_short_name : [columnFilters.customer_short_name.toString()]
      filtered = filtered.filter(f => selected.includes(f.customer_short_name))
    }
    const names = [...new Set(filtered.map(f => f.customer_name))].filter(Boolean).sort()
    return names.map(n => ({ label: n, value: n }))
  }, [activeFilters.records, columnFilters.customer_short_name])

  const activeShortNameOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.customer_name) {
      const selected = Array.isArray(columnFilters.customer_name) ? columnFilters.customer_name : [columnFilters.customer_name.toString()]
      filtered = filtered.filter(f => selected.includes(f.customer_name))
    }
    const shorts = [...new Set(filtered.map(f => f.customer_short_name))].filter(Boolean).sort()
    return shorts.map(s => ({ label: s, value: s }))
  }, [activeFilters.records, columnFilters.customer_name])

  const resetForm = useCallback(() => {
    setFormData({
      customerName: "",
      email: "",
      shortName: "",
      mobileNumber: "",
    })
    setEditingId(null)
    setError("")
    setSuccess("")
  }, [])

  const handleEdit = useCallback((customer) => {
    setFormData({
      customerName: customer.customer_name || "",
      email: customer.email || "",
      shortName: customer.customer_short_name || "",
      mobileNumber: customer.mobile || "",
    })
    setEditingId(customer.id)
    setView("create")
    setError("")
    setSuccess("")
  }, [])

  const handleDelete = useCallback((customer) => {
    setCustomerToDelete(customer)
    setDeleteDialogOpen(true)
  }, [])

  const confirmDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await apiClient.delete(`/api/dcc/delete-customer/${customerToDelete.id}`)
      if (res.success) {
        setSuccess("Customer deleted successfully")
        setRefreshKey(prev => prev + 1)
        setDeleteDialogOpen(false)
      } else {
        setError(res.message || "Failed to delete customer")
      }
    } catch (err) {
      setError(err.message || "Something went wrong")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleStatus = (customer) => {
    setCustomerToToggle(customer)
    setToggleDialogOpen(true)
  }

  const confirmToggleStatus = async () => {
    setIsToggling(true)
    try {
      const res = await apiClient.patch(`/api/dcc/customers/toggle-status/${customerToToggle.id}`)
      if (res.success) {
        setSuccess(`Customer ${res.data.is_active ? "activated" : "deactivated"} successfully`)
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
      filterOptions: activeCustomerOptions
    },
    {
      accessorKey: "customer_short_name",
      header: "Short Name",
      filterType: "select",
      isMulti: true,
      filterOptions: activeShortNameOptions
    },
    {
      accessorKey: "email",
      header: "Email",
      filterType: "text"
    },
    {
      accessorKey: "mobile",
      header: "Mobile",
      cell: (row) => row.mobile || "-",
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
          { label: "Edit Client", icon: Edit, onClick: () => handleEdit(row) },
        ];
        
        if (hasPermission("customer:customer", "Delete")) {
          actions.push({ type: "separator" });
          actions.push({ 
            label: row.is_active ? "Deactivate Client" : "Activate Client", 
            icon: row.is_active ? XCircle : CheckCircle, 
            onClick: () => handleToggleStatus(row),
            color: row.is_active ? "danger" : "default"
          });
          actions.push({ type: "separator" });
          actions.push({ label: "Archive Client", icon: Archive, color: "danger", onClick: () => handleDelete(row) });
        }

        return (
          <div className="flex items-center justify-center">
            <DataTableRowActions actions={actions} />
          </div>
        );
      },
      enableSorting: false,
    },
  ], [handleEdit, activeCustomerOptions, activeShortNameOptions])

  const fetchCustomers = useCallback(async (params) => {
    try {
      const queryParams = { ...params };
      if (queryParams.columnFilters) {
        queryParams.columnFilters = JSON.stringify(queryParams.columnFilters);
      }
      const responseData = await apiClient.get('/api/dcc/get-customers', queryParams)
      return responseData;
    } catch (err) {
      console.error("Error fetching customers:", err)
      return { success: false, data: [], meta: {} }
    }
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (error) setError("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      const requestBody = {
        customer_name: formData.customerName,
        customer_short_name: formData.shortName,
        email: formData.email,
        mobile: formData.mobileNumber,
      }

      let data;
      if (editingId) {
        data = await apiClient.put(`/api/dcc/update-customer/${editingId}`, requestBody)
      } else {
        data = await apiClient.post(`/api/dcc/create-customer`, requestBody)
      }

      if (!data.success) {
        throw new Error(data.message || (editingId ? "Failed to update client" : "Failed to create client"))
      }

      setSuccess(editingId ? "Client updated successfully!" : "Client created successfully!")
      
      setRefreshKey(prev => prev + 1)
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
      await exportApi.exportCustomers();
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

            {error && (
              <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
                {success}
              </div>
            )}

            {view === "list" ? (
              <ProDataTable
                columns={columns}
                fetchData={fetchCustomers}
                onExport={handleExport}
                onAdd={hasPermission("admin:customers:Create") ? () => { resetForm(); setView("create"); } : undefined}
                onAddTooltip="Create Client"
                refreshKey={refreshKey}
                columnFilters={columnFilters}
                onFilterChange={(newFilters) => setColumnFilters(prev => ({ ...prev, ...newFilters }))}
              />
            ) : (
              <form onSubmit={handleSubmit} className="w-full">
                <Card className="w-full shadow-none border-slate-200">
                  <CardHeader>
                    <CardTitle>Client Information</CardTitle>
                    <CardDescription>
                      Enter the basic details about the client
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerName">
                        Client <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="customerName"
                        name="customerName"
                        type="text"
                        placeholder="Enter customer name"
                        value={formData.customerName}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">
                          Email <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="customer@example.com"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shortName">
                          Short Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="shortName"
                          name="shortName"
                          type="text"
                          placeholder="Enter short name"
                          value={formData.shortName}
                          onChange={handleInputChange}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mobileNumber">
                        Mobile Number
                      </Label>
                      <Input
                        id="mobileNumber"
                        name="mobileNumber"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={formData.mobileNumber}
                        onChange={handleInputChange}
                        disabled={isLoading}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-4 mt-6">
                  <Button
                    type="button"
                    className="cursor-pointer"
                    variant="outline"
                    onClick={() => { resetForm(); setView("list"); }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <AccessControl required="customer:customer:Create">
                    <Button type="submit" disabled={isLoading} className="cursor-pointer">
                      {isLoading ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update Client" : "Create Client")}
                    </Button>
                  </AccessControl>
                </div>
              </form>
            )}

            <ConfirmDialog
              isOpen={deleteDialogOpen}
              onClose={() => setDeleteDialogOpen(false)}
              onConfirm={confirmDelete}
              title="Archive Client"
              description={<span>Are you sure you want to archive <strong>{customerToDelete?.customer_name}</strong>? This action will remove the client from the active list.</span>}
              confirmText="Archive"
              variant="danger"
              isLoading={isDeleting}
            />

            <ConfirmDialog
              isOpen={toggleDialogOpen}
              onClose={() => setToggleDialogOpen(false)}
              onConfirm={confirmToggleStatus}
              title={customerToToggle?.is_active ? "Deactivate Client" : "Activate Client"}
              description={<span>Are you sure you want to {customerToToggle?.is_active ? "deactivate" : "activate"} <strong>{customerToToggle?.customer_name}</strong>?</span>}
              confirmText={customerToToggle?.is_active ? "Deactivate" : "Activate"}
              variant={customerToToggle?.is_active ? "warning" : "success"}
              isLoading={isToggling}
            />
          </div>
        </main>
    </>
  )
}

export default CreateCustomer
