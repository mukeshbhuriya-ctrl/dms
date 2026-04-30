import { useState, useEffect, useMemo, useCallback } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"

import { SidebarTrigger } from "@/components/ui/sidebar"
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
import { Plus, Mail, ArrowLeft, Edit, X } from "lucide-react"
import { poApi } from "@/api/po.api"

const toUrlKey = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const normalizeKey = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")

function CommunicationMatrix() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: routeId } = useParams()
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
  const mode = useMemo(() => {
    if (location.pathname.includes("/edit/")) return "edit"
    if (location.pathname.includes("/view/")) return "view"
    if (location.pathname.endsWith("/create")) return "create"
    return "list"
  }, [location.pathname])
  const isReadOnly = mode === "view"

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

  const applyPoToForm = useCallback((po) => {
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

  const handleEdit = useCallback((po) => {
    navigate(`/communication-matrix/edit/${toUrlKey(po.po_number || "")}`, { state: { record: po } })
    applyPoToForm(po)
  }, [navigate, applyPoToForm])

  const handleView = useCallback((po) => {
    navigate(`/communication-matrix/view/${toUrlKey(po.po_number || "")}`, { state: { record: po } })
    applyPoToForm(po)
  }, [navigate, applyPoToForm])

  const handlePoChange = (poId) => {
    if (!poId) {
      setSelectedPoId("")
      setShrenoCommunication([{ name: "", email: "" }])
      setClientCommunication([{ name: "", email: "" }])
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-none"
            onClick={() => handleView(row)}
          >
            <span className="text-[11px] font-medium text-nowrap">View</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-none"
            onClick={() => handleEdit(row)}
          >
            <Edit className="h-3.5 w-3.5 mr-2" />
            <span className="text-[11px] font-medium text-nowrap">Edit Matrix</span>
          </Button>
        </div>
      ),
    },
  ], [handleEdit, handleView, filterOptions])


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

  useEffect(() => {
    const loadByPoNumber = async (poNumberParam) => {
      const decodedPoNumber = decodeURIComponent(poNumberParam || "")
      try {
        const response = await poApi.getPos({ page: 1, limit: 500, search: decodedPoNumber })
        let rows = response?.data || []
        let matched = rows.find((p) => String(p.po_number || "").trim() === String(decodedPoNumber).trim())
        if (!matched) {
          const normalized = normalizeKey(decodedPoNumber)
          matched = rows.find((p) => normalizeKey(p.po_number) === normalized)
        }
        if (!matched) {
          setError(`PO not found: ${decodedPoNumber}`)
          setView("list")
          return
        }
        applyPoToForm(matched)
      } catch {
        setError(`Unable to load PO: ${decodedPoNumber}`)
        setView("list")
      }
    }

    if (mode === "list") {
      setView("list")
      return
    }

    if (mode === "create") {
      setView("create")
      setSelectedPoId("")
      setShrenoCommunication([{ name: "", email: "" }])
      setClientCommunication([{ name: "", email: "" }])
      return
    }

    const row = location.state?.record
    if (row) {
      applyPoToForm(row)
    } else if (routeId) {
      loadByPoNumber(routeId)
    } else {
      setError("Please open edit/view from list once so data can load.")
      setView("list")
    }
  }, [mode, routeId, location.state, applyPoToForm])

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-bold tracking-tight text-slate-900">Communication Matrix</h1>
        </div>
        {view !== "list" && (
          <Button variant="outline" onClick={() => navigate("/communication-matrix/list")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
          </Button>
        )}
      </header>
      <main className={`flex-1 min-h-0 p-6 flex flex-col ${view === "list" ? "overflow-hidden" : "overflow-auto"}`}>
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
                  navigate("/communication-matrix/create")
                  setSelectedPoId("")
                  setShrenoCommunication([{ name: "", email: "" }])
                  setClientCommunication([{ name: "", email: "" }])
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
                        disabled={isLoading || isReadOnly}
                        placeholder="Select a Purchase Order..."
                        searchPlaceholder="Search PO number or customer..."
                      />
                    </div>
                  </CardContent>
                </Card>

                {selectedPoId && (
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
                          <Button type="button" variant="outline" size="sm" onClick={addShrenoCommunication} disabled={isReadOnly}>
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
                              disabled={isReadOnly}
                            />
                            <Input
                              placeholder="Email"
                              type="email"
                              value={contact.email}
                              onChange={(e) => handleShrenoCommunicationChange(index, "email", e.target.value)}
                              required
                              disabled={isReadOnly}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeShrenoCommunication(index)}
                              disabled={shrenoCommunication.length === 1 || isReadOnly}
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
                          <Button type="button" variant="outline" size="sm" onClick={addClientCommunication} disabled={isReadOnly}>
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
                              disabled={isReadOnly}
                            />
                            <Input
                              placeholder="Email"
                              type="email"
                              value={contact.email}
                              onChange={(e) => handleClientCommunicationChange(index, "email", e.target.value)}
                              required
                              disabled={isReadOnly}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeClientCommunication(index)}
                              disabled={clientCommunication.length === 1 || isReadOnly}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedPoId && !isReadOnly && (
                  <div className="flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedPoId("")
                        setShrenoCommunication([{ name: "", email: "" }])
                        setClientCommunication([{ name: "", email: "" }])
                      }}
                    >
                      Reset
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Saving..." : "Save Communication Matrix"}
                    </Button>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}

export default CommunicationMatrix
