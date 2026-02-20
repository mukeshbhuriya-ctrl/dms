import { useState } from "react"
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Plus, Trash2, Type } from "lucide-react"

function MaterialHeatChart() {
  // First section - Dropdowns
  const [client, setClient] = useState("")
  const [msn, setMsn] = useState("")
  const [projectId, setProjectId] = useState("")
  const [equipmentName, setEquipmentName] = useState("")
  const [tagNo, setTagNo] = useState("")
  const [code, setCode] = useState("")

  // Second section - User input fields
  const [formData, setFormData] = useState({
    shrDrgNo: "",
    customerDrgNo: "",
    poNo: "",
    inspectionBy: "",
  })

  // Third section - Table rows
  const [tableRows, setTableRows] = useState([
    {
      id: 1,
      itemNo: "",
      description: "",
      size: "",
      materialSpecification: "",
      quantityUnit: "",
      heatNo: "",
      mtrNo: "",
      manufacturerName: "",
      remarks: "",
      isHeading: false,
      headingText: "",
    },
  ])

  // Mock data for dropdowns
  const msnOptions = [
    {
      id: "1",
      value: "9924282053",
      clientName: "AIR PRODUCTS",
      poNo: "PO-001",
      projectId: "PROJ-001",
      equipmentName: "Equipment A",
      tagNo: "TAG-001",
      code: "CODE-001",
    },
    {
      id: "2",
      value: "9924282054",
      clientName: "Client 2",
      poNo: "PO-002",
      projectId: "PROJ-002",
      equipmentName: "Equipment B",
      tagNo: "TAG-002",
      code: "CODE-002",
    },
    {
      id: "3",
      value: "9924282055",
      clientName: "Client 3",
      poNo: "PO-003",
      projectId: "PROJ-003",
      equipmentName: "Equipment C",
      tagNo: "TAG-003",
      code: "CODE-003",
    },
  ]

  // Handle input field changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Handle MSN change to populate static fields
  const handleMsnChange = (value) => {
    setMsn(value)
    const selectedMsn = msnOptions.find((option) => option.id === value)

    setClient(selectedMsn?.clientName || "")
    setProjectId(selectedMsn?.projectId || "")
    setEquipmentName(selectedMsn?.equipmentName || "")
    setTagNo(selectedMsn?.tagNo || "")
    setCode(selectedMsn?.code || "")
    setFormData((prev) => ({
      ...prev,
      poNo: selectedMsn?.poNo || "",
    }))
  }

  // Handle table row changes
  const handleRowChange = (id, field, value) => {
    setTableRows(
      tableRows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    )
  }

  // Add new row at the end
  const addRow = () => {
    const newId = Math.max(...tableRows.map((row) => row.id), 0) + 1
    setTableRows([
      ...tableRows,
      {
        id: newId,
        itemNo: "",
        description: "",
        size: "",
        materialSpecification: "",
        quantityUnit: "",
        heatNo: "",
        mtrNo: "",
        manufacturerName: "",
        remarks: "",
        isHeading: false,
        headingText: "",
      },
    ])
  }

  // Add row after a specific heading
  const addRowAfterHeading = (headingId) => {
    const newId = Math.max(...tableRows.map((row) => row.id), 0) + 1
    const headingIndex = tableRows.findIndex((row) => row.id === headingId)
    
    if (headingIndex !== -1) {
      const newRow = {
        id: newId,
        itemNo: "",
        description: "",
        size: "",
        materialSpecification: "",
        quantityUnit: "",
        heatNo: "",
        mtrNo: "",
        manufacturerName: "",
        remarks: "",
        isHeading: false,
        headingText: "",
      }
      
      // Find the last row that belongs to this heading (before next heading or end)
      let insertIndex = headingIndex + 1
      for (let i = headingIndex + 1; i < tableRows.length; i++) {
        if (tableRows[i].isHeading) {
          break
        }
        insertIndex = i + 1
      }
      
      const newRows = [...tableRows]
      newRows.splice(insertIndex, 0, newRow)
      setTableRows(newRows)
    }
  }

  // Toggle row to heading
  const toggleHeading = (id) => {
    setTableRows(
      tableRows.map((row) =>
        row.id === id
          ? {
              ...row,
              isHeading: !row.isHeading,
              headingText: row.isHeading ? "" : row.headingText,
            }
          : row
      )
    )
  }

  // Remove row
  const removeRow = (id) => {
    if (tableRows.length > 1) {
      setTableRows(tableRows.filter((row) => row.id !== id))
    }
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Material Heat Chart</h1>
              <p className="text-muted-foreground">
                Create and manage material heat chart information.
              </p>
            </div>

            {/* First Section - Dropdowns */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="msn">MSN:</Label>
                    <Select value={msn} onValueChange={handleMsnChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select MSN" />
                      </SelectTrigger>
                      <SelectContent>
                        {msnOptions.map((msnOption) => (
                          <SelectItem key={msnOption.id} value={msnOption.id}>
                            {msnOption.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="client">CLIENT:</Label>
                    <Input
                      id="client"
                      type="text"
                      value={client}
                      readOnly
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="poNo">PO. NO.:</Label>
                    <Input
                      id="poNo"
                      type="text"
                      value={formData.poNo}
                      readOnly
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="projectId">PROJECT ID:</Label>
                    <Input
                      id="projectId"
                      type="text"
                      value={projectId}
                      readOnly
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="equipmentName">EQUIPMENT NAME:</Label>
                    <Input
                      id="equipmentName"
                      type="text"
                      value={equipmentName}
                      readOnly
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tagNo">TAG NO.:</Label>
                    <Input
                      id="tagNo"
                      type="text"
                      value={tagNo}
                      readOnly
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="code">CODE:</Label>
                    <Input
                      id="code"
                      type="text"
                      value={code}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Second Section - User Input Fields */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Equipment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shrDrgNo">SHRENO DRG. NO.:</Label>
                    <Input
                      id="shrDrgNo"
                      name="shrDrgNo"
                      type="text"
                      value={formData.shrDrgNo}
                      onChange={handleInputChange}
                      placeholder="Enter SHRENO DRG. No."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerDrgNo">Customer DRG No:</Label>
                    <Input
                      id="customerDrgNo"
                      name="customerDrgNo"
                      type="text"
                      value={formData.customerDrgNo}
                      onChange={handleInputChange}
                      placeholder="Enter Customer DRG No"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inspectionBy">INSPECTION BY:</Label>
                    <Input
                      id="inspectionBy"
                      name="inspectionBy"
                      type="text"
                      value={formData.inspectionBy}
                      onChange={handleInputChange}
                      placeholder="Enter INSPECTION BY"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Third Section - Table */}
            <Card>
              <CardHeader>
                <CardTitle>Material Heat Chart Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2 font-medium text-xs">
                            ITEM NO./PART NO.
                          </th>
                          <th className="text-left p-2 font-medium text-xs">
                            DESCRIPTION
                          </th>
                          <th className="text-left p-2 font-medium text-xs">
                            SIZE
                          </th>
                          <th className="text-left p-2 font-medium text-xs">
                            MATERIAL SPECIFICATION
                          </th>
                          <th className="text-left p-2 font-medium text-xs">
                            QUANTITY / UNIT
                          </th>
                          <th className="text-left p-2 font-medium text-xs">
                            HEAT NO. / CAST NO./PLATE NO.
                          </th>
                          <th className="text-left p-2 font-medium text-xs">
                            MTR NO.
                          </th>
                          <th className="text-left p-2 font-medium text-xs">
                            MANUFACTURER NAME
                          </th>
                          <th className="text-left p-2 font-medium text-xs">
                            REMARKS NCR/DCR
                          </th>
                          <th className="text-left p-2 font-medium text-xs w-20">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.map((row) =>
                          row.isHeading ? (
                            <tr key={row.id} className="border-b bg-muted/30">
                              <td colSpan={8} className="p-2">
                                <Input
                                  type="text"
                                  value={row.headingText}
                                  onChange={(e) =>
                                    handleRowChange(
                                      row.id,
                                      "headingText",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Enter heading text"
                                  className="w-full font-semibold"
                                />
                              </td>
                              <td className="p-2">
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => addRowAfterHeading(row.id)}
                                    className="h-8 w-8"
                                    title="Add row after this heading"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => removeRow(row.id)}
                                    disabled={tableRows.length === 1}
                                    className="h-8 w-8"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            <tr key={row.id} className="border-b">
                              <td className="p-2">
                                <Input
                                  type="text"
                                  value={row.itemNo}
                                  onChange={(e) =>
                                    handleRowChange(row.id, "itemNo", e.target.value)
                                  }
                                  placeholder="Item No."
                                  className="w-full text-xs"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="text"
                                  value={row.description}
                                  onChange={(e) =>
                                    handleRowChange(
                                      row.id,
                                      "description",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Description"
                                  className="w-full text-xs"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="text"
                                  value={row.size}
                                  onChange={(e) =>
                                    handleRowChange(row.id, "size", e.target.value)
                                  }
                                  placeholder="Size"
                                  className="w-full text-xs"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="text"
                                  value={row.materialSpecification}
                                  onChange={(e) =>
                                    handleRowChange(
                                      row.id,
                                      "materialSpecification",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Material Spec"
                                  className="w-full text-xs"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="text"
                                  value={row.quantityUnit}
                                  onChange={(e) =>
                                    handleRowChange(
                                      row.id,
                                      "quantityUnit",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Quantity/Unit"
                                  className="w-full text-xs"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="text"
                                  value={row.heatNo}
                                  onChange={(e) =>
                                    handleRowChange(row.id, "heatNo", e.target.value)
                                  }
                                  placeholder="Heat No."
                                  className="w-full text-xs"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="text"
                                  value={row.mtrNo}
                                  onChange={(e) =>
                                    handleRowChange(row.id, "mtrNo", e.target.value)
                                  }
                                  placeholder="MTR No."
                                  className="w-full text-xs"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="text"
                                  value={row.manufacturerName}
                                  onChange={(e) =>
                                    handleRowChange(
                                      row.id,
                                      "manufacturerName",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Manufacturer"
                                  className="w-full text-xs"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="text"
                                  value={row.remarks}
                                  onChange={(e) =>
                                    handleRowChange(
                                      row.id,
                                      "remarks",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Remarks"
                                  className="w-full text-xs"
                                />
                              </td>
                              <td className="p-2">
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => toggleHeading(row.id)}
                                    className="h-8 w-8"
                                    title="Convert to heading"
                                  >
                                    <Type className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => removeRow(row.id)}
                                    disabled={tableRows.length === 1}
                                    className="h-8 w-8"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addRow}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Row
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default MaterialHeatChart
