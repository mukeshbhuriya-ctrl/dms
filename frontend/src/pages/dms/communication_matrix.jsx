import { PageContainer } from "@/components/layout/PageContainer"
import { useState, useEffect, useMemo, useCallback } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/shared/SearchableSelect"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import ProDataTable from "@/components/shared/ProDataTable"
import { Plus, Mail, ArrowLeft, Edit, X, Copy } from "lucide-react"
import { poApi } from "@/api/po.api"
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"

function CommunicationMatrix() {
  const [view, setView] = useState("list") // 'list' or 'create'

  const [isLoading, setIsLoading] = useState(false)
  const [pos, setPos] = useState([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [columnFilters, setColumnFilters] = useState({})
  const [filterOptions, setFilterOptions] = useState({
    customers: [],
    locations: [],
    pos: []
  })

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await poApi.getPoFilters()
        if (res.success) {
          setFilterOptions(res.data)
        }
      } catch (err) {
        console.error("Error fetching filters:", err)
      }
    }
    fetchFilters()
  }, [])

  const [selectedPoId, setSelectedPoId] = useState("")
  const [isCloning, setIsCloning] = useState(false)
  
  const [shrenoCommunication, setShrenoCommunication] = useState([
    { name: "", email: "" },
  ])
  const [clientCommunication, setClientCommunication] = useState([
    { name: "", email: "" },
  ])

  const fetchPos = useCallback(async ({ page, limit, search, columnFilters }) => {
    try {
      const params = { page, limit }
      if (search) params.search = search
      
      // Map column filters to backend params
      if (columnFilters) {
        if (columnFilters.po_number) params.po_id = columnFilters.po_number;
        if (columnFilters.customer_name) params.customer_id = columnFilters.customer_name;
        if (columnFilters.location_name) params.location_id = columnFilters.location_name;
      }

      const responseData = await poApi.getPos(params)

      if (responseData.success) {
        setPos(responseData.data || [])
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

  const handleEdit = useCallback((po) => {
    setIsCloning(false)
    setSelectedPoId(po.id)

    // Parse matrix
    const shreno = []
    const client = []
    if (po.po_communication_matrix && Array.isArray(po.po_communication_matrix)) {
      po.po_communication_matrix.forEach(contact => {
        if (contact.type === 'shreno') shreno.push({ name: contact.name, email: contact.email })
        if (contact.type === 'client') client.push({ name: contact.name, email: contact.email })
      })
    }
    setShrenoCommunication(shreno.length ? shreno : [{ name: "", email: "" }])
    setClientCommunication(client.length ? client : [{ name: "", email: "" }])

    setView("create")
    setError("")
    setSuccess("")
  }, [])

  const handleClone = useCallback((po) => {
    setIsCloning(true)
    setSelectedPoId("")

    // Parse matrix
    const shreno = []
    const client = []
    if (po.po_communication_matrix && Array.isArray(po.po_communication_matrix)) {
      po.po_communication_matrix.forEach(contact => {
        if (contact.type === 'shreno') shreno.push({ name: contact.name, email: contact.email })
        if (contact.type === 'client') client.push({ name: contact.name, email: contact.email })
      })
    }
    setShrenoCommunication(shreno.length ? shreno : [{ name: "", email: "" }])
    setClientCommunication(client.length ? client : [{ name: "", email: "" }])

    setView("create")
    setError("")
    setSuccess("")
  }, [])

  const handlePoChange = (poId) => {
    if (!poId) {
      setSelectedPoId("")
      if (!isCloning) {
        setShrenoCommunication([{ name: "", email: "" }])
        setClientCommunication([{ name: "", email: "" }])
      }
      return
    }
    
    if (isCloning) {
      setSelectedPoId(poId)
      return
    }

    const po = pos.find(p => String(p.id) === String(poId))
    if (po) {
      handleEdit(po)
    } else {
      setSelectedPoId(poId)
      setShrenoCommunication([{ name: "", email: "" }])
      setClientCommunication([{ name: "", email: "" }])
    }
  }

  const poOptions = useMemo(() => {
    return pos.map(po => ({
      value: String(po.id),
      label: `${po.po_number} - ${po.customer?.customer_name}`
    }));
  }, [pos]);

  const columns = useMemo(() => [
    {
      id: "po_number",
      accessorKey: "po_number",
      header: "PO Number",
      filterType: "select",
      filterOptions: filterOptions.pos,
    },
    {
      id: "customer_name",
      accessorKey: "customer.customer_name",
      header: "Customer",
      filterType: "select",
      filterOptions: filterOptions.customers,
    },
    {
      id: "location_name",
      accessorKey: "customer_location.location_name",
      header: "Location",
      filterType: "select",
      filterOptions: filterOptions.locations,
    },
    {
      id: "po_date",
      accessorKey: "po_date",
      header: "PO Date",
      cell: (row) => row.po_date ? new Date(row.po_date).toLocaleDateString() : "N/A",
    },
    {
      id: "actions",
      header: "Actions",
      width: "60px",
      cell: (row) => {
        const actions = [
          { label: "Edit Matrix", icon: Edit, onClick: () => handleEdit(row) },
        ];
        
        if (row.po_communication_matrix && Array.isArray(row.po_communication_matrix) && row.po_communication_matrix.length > 0) {
          actions.push({ label: "Clone", icon: Copy, onClick: () => handleClone(row) });
        }
        
        return (
          <div className="flex items-center justify-center">
            <DataTableRowActions actions={actions} />
          </div>
        );
      },
    },
  ], [handleEdit, handleClone, filterOptions])


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

    if (!selectedPoId) {
      setError("Please select a PO")
      return
    }

    setIsLoading(true)

    try {
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
      
      const payload = {
        communication_matrix: JSON.stringify(communicationMatrix)
      };

      await poApi.updatePoCommunicationMatrix(selectedPoId, payload)
      setSuccess("Communication matrix updated successfully!")

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

  return (
    <PageContainer 
      className={view === "list" ? "overflow-hidden" : "overflow-y-auto"} 
    >
      {view !== "list" && (
        <div className="flex justify-end mb-4 shrink-0">
          <Button className="cursor-pointer" variant="outline" onClick={() => {
            setView("list")
            setIsCloning(false)
          }}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
          </Button>
        </div>
      )}
      <div className={`w-full flex-1 min-h-0 flex flex-col ${view === "list" ? "overflow-hidden" : ""}`}>
        {view === "list" ? (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <ProDataTable
                columns={columns}
                fetchData={fetchPos}
                refreshKey={refreshKey}
                columnFilters={columnFilters}
                onFilterChange={setColumnFilters}
                onAdd={() => {
                  setSelectedPoId("")
                  setShrenoCommunication([{ name: "", email: "" }])
                  setClientCommunication([{ name: "", email: "" }])
                  setIsCloning(false)
                  setView("create")
                }}
                onAddTooltip="Create New Matrix"
                globalSearchPlaceholder="Search PO Number, Customer..."
              />
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Select Purchase Order</CardTitle>
                    <CardDescription>
                      Choose the PO you want to define the communication matrix for.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {error && (
                      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                      </div>
                    )}
                    {success && (
                      <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-600">
                        {success}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="poId">
                        Purchase Order <span className="text-destructive">*</span>
                      </Label>
                      <SearchableSelect
                        options={poOptions}
                        value={selectedPoId}
                        onValueChange={handlePoChange}
                        disabled={isLoading}
                        placeholder="Select a Purchase Order..."
                        searchPlaceholder="Search PO number or customer..."
                      />
                    </div>
                  </CardContent>
                </Card>

                {(selectedPoId || isCloning) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Shreno */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold flex items-center gap-2">
                            <Mail className="h-4 w-4" /> Shreno Communication
                          </h3>
                          <Button className="cursor-pointer" type="button" variant="outline" size="sm" onClick={addShrenoCommunication}>
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
                          <Button className="cursor-pointer" type="button" variant="outline" size="sm" onClick={addClientCommunication}>
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

                {(selectedPoId || isCloning) && (
                  <div className="flex justify-end gap-4 py-1">
                    <Button
                      className="cursor-pointer"
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedPoId("")
                        setShrenoCommunication([{ name: "", email: "" }])
                        setClientCommunication([{ name: "", email: "" }])
                        setIsCloning(false)
                      }}
                    >
                      Reset
                    </Button>
                    <Button className="cursor-pointer" type="submit" disabled={!selectedPoId || isLoading}>
                      {isLoading ? "Saving..." : "Save Communication Matrix"}
                    </Button>
                  </div>
                )}
              </div>
            </form>
          )}
      </div>
    </PageContainer>
  )
}

export default CommunicationMatrix
