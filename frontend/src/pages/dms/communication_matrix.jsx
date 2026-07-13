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
      cell: (row) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-none cursor-pointer"
            onClick={() => handleEdit(row)}
          >
            <Edit className="h-3.5 w-3.5 mr-2" />
            <span className="text-[11px] font-medium text-nowrap">Edit Matrix</span>
          </Button>
          {row.po_communication_matrix && Array.isArray(row.po_communication_matrix) && row.po_communication_matrix.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-slate-200 text-slate-600 hover:text-green-600 hover:border-green-200 transition-colors shadow-none cursor-pointer"
              onClick={() => handleClone(row)}
            >
              <Copy className="h-3.5 w-3.5 mr-2" />
              <span className="text-[11px] font-medium text-nowrap">Clone</span>
            </Button>
          )}
        </div>
      ),
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
          <Button className="cursor-pointer h-9 bg-white border-slate-200 text-slate-700 shadow-none" variant="outline" onClick={() => {
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
              <div className="grid gap-6 w-full pb-10">
                <Card className="w-full shadow-sm border-slate-200/80 rounded-xl overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50/80 border-b border-slate-100/60 pb-5">
                    <CardTitle className="text-lg font-bold text-slate-800">Select Purchase Order</CardTitle>
                    <CardDescription className="text-sm font-medium text-slate-500">
                      Choose the PO you want to define the communication matrix for.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    {error && (
                      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                      </div>
                    )}
                    {success && (
                      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
                        {success}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="poId" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Purchase Order <span className="text-red-500">*</span>
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
                  <Card className="w-full shadow-sm border-slate-200/80 rounded-xl overflow-hidden bg-white">
                    <CardHeader className="bg-slate-50/80 border-b border-slate-100/60 pb-5">
                      <CardTitle className="text-lg font-bold text-slate-800">Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                      {/* Shreno */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <Mail className="h-4 w-4 text-slate-400" /> Shreno Communication
                          </h3>
                          <Button className="h-8 bg-white border-slate-200 text-slate-700 shadow-none cursor-pointer" type="button" variant="outline" size="sm" onClick={addShrenoCommunication}>
                            <Plus className="h-4 w-4 mr-2 text-slate-400" /> Add
                          </Button>
                        </div>
                        {shrenoCommunication.map((contact, index) => (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 p-4 border border-slate-200/60 rounded-xl bg-slate-50/30">
                            <Input
                              placeholder="Name"
                              value={contact.name}
                              onChange={(e) => handleShrenoCommunicationChange(index, "name", e.target.value)}
                              className="h-10 bg-white border-slate-200 focus-visible:ring-blue-500 shadow-none text-sm transition-all"
                              required
                            />
                            <Input
                              placeholder="Email"
                              type="email"
                              value={contact.email}
                              onChange={(e) => handleShrenoCommunicationChange(index, "email", e.target.value)}
                              className="h-10 bg-white border-slate-200 focus-visible:ring-blue-500 shadow-none text-sm transition-all"
                              required
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => removeShrenoCommunication(index)}
                              disabled={shrenoCommunication.length === 1}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* Client */}
                      <div className="space-y-4 border-t border-slate-100/60 pt-6 mt-6">
                        <div className="flex justify-between items-center">
                          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <Mail className="h-4 w-4 text-slate-400" /> Client Communication
                          </h3>
                          <Button className="h-8 bg-white border-slate-200 text-slate-700 shadow-none cursor-pointer" type="button" variant="outline" size="sm" onClick={addClientCommunication}>
                            <Plus className="h-4 w-4 mr-2 text-slate-400" /> Add
                          </Button>
                        </div>
                        {clientCommunication.map((contact, index) => (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 p-4 border border-slate-200/60 rounded-xl bg-slate-50/30">
                            <Input
                              placeholder="Name"
                              value={contact.name}
                              onChange={(e) => handleClientCommunicationChange(index, "name", e.target.value)}
                              className="h-10 bg-white border-slate-200 focus-visible:ring-blue-500 shadow-none text-sm transition-all"
                              required
                            />
                            <Input
                              placeholder="Email"
                              type="email"
                              value={contact.email}
                              onChange={(e) => handleClientCommunicationChange(index, "email", e.target.value)}
                              className="h-10 bg-white border-slate-200 focus-visible:ring-blue-500 shadow-none text-sm transition-all"
                              required
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => removeClientCommunication(index)}
                              disabled={clientCommunication.length === 1}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                    
                    <div className="bg-slate-50 border-t border-slate-100/60 p-4 px-6 flex justify-end gap-3 mt-4">
                      <Button
                        className="h-10 px-6 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-none cursor-pointer"
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
                      <Button className="h-10 px-6 bg-blue-600 hover:bg-blue-700 shadow-none text-white font-medium cursor-pointer" type="submit" disabled={!selectedPoId || isLoading}>
                        {isLoading ? "Saving..." : "Save Communication Matrix"}
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            </form>
          )}
      </div>
    </PageContainer>
  )
}

export default CommunicationMatrix
