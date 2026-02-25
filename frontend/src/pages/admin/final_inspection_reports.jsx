import { useState } from "react"
import { AdminSidebar } from "@/components"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"

function FinalInspectionReports() {
  // Get today's date
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  // Header section
  const [msn, setMsn] = useState("")
  const [client, setClient] = useState("")
  const [poNo, setPoNo] = useState("")
  const [tagNo, setTagNo] = useState("")
  const [equipment, setEquipment] = useState("")
  const [code, setCode] = useState("")

  // User input fields
  const [formData, setFormData] = useState({
    drgNo: "",
  })

  // First table rows (DESCRIPTION, REQUIRED, ACTUAL, REMARKS)
  const [table1Rows, setTable1Rows] = useState([
    {
      id: 1,
      description: "",
      required: "",
      actual: "",
      remarks: "",
    },
  ])

  // Second table rows (NOZZLE MARK, ORIENTATION, SIZE, etc.)
  const [table2Rows, setTable2Rows] = useState([
    {
      id: 1,
      nozzleMark: "",
      orientation: "",
      size: "",
      location: "",
      elevationApproved: "",
      projectionApproved: "",
      elevationActual: "",
      projectionActual: "",
    },
  ])

  // Third table rows (PART NO, DESCRIPTION, etc.)
  const [table3Rows, setTable3Rows] = useState([
    {
      id: 1,
      partNo: "",
      description: "",
      orientationApproved: "",
      elevationApproved: "",
      projectionApproved: "",
      elevationActual: "",
      projectionActual: "",
    },
  ])

  // Remarks
  const [remarks, setRemarks] = useState([
    {
      id: 1,
      text: "All dimensions are in mm unless otherwise specified.",
    },
    {
      id: 2,
      text: "All other dimensions are checked as per approved drawing and found satisfactory.",
    },
    {
      id: 3,
      text: "Abbreviation: TL: Tan Line, CL: Center Line, GF: Gasket face, FF: Flange face, VOD: Vessel Outside Diameter, VCL: Vessel center line, OD: Outside diameter, TTL : Top tan line, BTL: Bottom tan line, QTY.: Quantity, I/S: Inside, O/S: Outside, NCL:Nozzle center line, BWL: Bottom Weld line, TWL: Top weld line, APD: As Per Drawing",
    },
  ])

  // Instrument Calibration Details table
  const [instrumentRows, setInstrumentRows] = useState([
    {
      id: 1,
      name: "",
      idNo: "",
      dueDate: "",
    },
  ])

  // Mock data for dropdowns
  const msnOptions = [
    {
      id: "1",
      value: "9924282053",
      clientName: "AIR PRODUCTS",
      poNo: "PO-001",
      tagNo: "TAG-001",
      equipment: "Equipment A",
      code: "CODE-001",
    },
    {
      id: "2",
      value: "9924282054",
      clientName: "Client 2",
      poNo: "PO-002",
      tagNo: "TAG-002",
      equipment: "Equipment B",
      code: "CODE-002",
    },
    {
      id: "3",
      value: "9924282055",
      clientName: "Client 3",
      poNo: "PO-003",
      tagNo: "TAG-003",
      equipment: "Equipment C",
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

  const handleMsnChange = (value) => {
    setMsn(value)
    const selectedMsn = msnOptions.find((option) => option.id === value)
    setClient(selectedMsn?.clientName || "")
    setPoNo(selectedMsn?.poNo || "")
    setTagNo(selectedMsn?.tagNo || "")
    setEquipment(selectedMsn?.equipment || "")
    setCode(selectedMsn?.code || "")
  }

  // Handle table 1 row changes
  const handleTable1RowChange = (id, field, value) => {
    setTable1Rows(
      table1Rows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    )
  }

  // Handle table 2 row changes
  const handleTable2RowChange = (id, field, value) => {
    setTable2Rows(
      table2Rows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    )
  }

  // Handle table 3 row changes
  const handleTable3RowChange = (id, field, value) => {
    setTable3Rows(
      table3Rows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    )
  }

  // Handle instrument table row changes
  const handleInstrumentRowChange = (id, field, value) => {
    setInstrumentRows(
      instrumentRows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    )
  }

  // Handle remarks changes
  const handleRemarkChange = (id, value) => {
    setRemarks(
      remarks.map((remark) =>
        remark.id === id ? { ...remark, text: value } : remark
      )
    )
  }

  // Add table 1 row
  const addTable1Row = () => {
    const newId = Math.max(...table1Rows.map((row) => row.id), 0) + 1
    setTable1Rows([
      ...table1Rows,
      {
        id: newId,
        description: "",
        required: "",
        actual: "",
        remarks: "",
      },
    ])
  }

  // Remove table 1 row
  const removeTable1Row = (id) => {
    if (table1Rows.length > 1) {
      setTable1Rows(table1Rows.filter((row) => row.id !== id))
    }
  }

  // Add table 2 row
  const addTable2Row = () => {
    const newId = Math.max(...table2Rows.map((row) => row.id), 0) + 1
    setTable2Rows([
      ...table2Rows,
      {
        id: newId,
        nozzleMark: "",
        orientation: "",
        size: "",
        location: "",
        elevationApproved: "",
        projectionApproved: "",
        elevationActual: "",
        projectionActual: "",
      },
    ])
  }

  // Remove table 2 row
  const removeTable2Row = (id) => {
    if (table2Rows.length > 1) {
      setTable2Rows(table2Rows.filter((row) => row.id !== id))
    }
  }

  // Add table 3 row
  const addTable3Row = () => {
    const newId = Math.max(...table3Rows.map((row) => row.id), 0) + 1
    setTable3Rows([
      ...table3Rows,
      {
        id: newId,
        partNo: "",
        description: "",
        orientationApproved: "",
        elevationApproved: "",
        projectionApproved: "",
        elevationActual: "",
        projectionActual: "",
      },
    ])
  }

  // Remove table 3 row
  const removeTable3Row = (id) => {
    if (table3Rows.length > 1) {
      setTable3Rows(table3Rows.filter((row) => row.id !== id))
    }
  }

  // Add instrument row
  const addInstrumentRow = () => {
    const newId = Math.max(...instrumentRows.map((row) => row.id), 0) + 1
    setInstrumentRows([
      ...instrumentRows,
      {
        id: newId,
        name: "",
        idNo: "",
        dueDate: "",
      },
    ])
  }

  // Remove instrument row
  const removeInstrumentRow = (id) => {
    if (instrumentRows.length > 1) {
      setInstrumentRows(instrumentRows.filter((row) => row.id !== id))
    }
  }

  // Add remark
  const addRemark = () => {
    const newId = Math.max(...remarks.map((r) => r.id), 0) + 1
    setRemarks([
      ...remarks,
      {
        id: newId,
        text: "",
      },
    ])
  }

  // Remove remark
  const removeRemark = (id) => {
    if (remarks.length > 1) {
      setRemarks(remarks.filter((r) => r.id !== id))
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
              <h1 className="text-3xl font-bold mb-2">Final Inspection Reports</h1>
              <p className="text-muted-foreground">
                Create and manage final inspection reports.
              </p>
            </div>

            {/* Header Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Report Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <Label htmlFor="poNo">P.O. NO.:</Label>
                    <Input
                      id="poNo"
                      type="text"
                      value={poNo}
                      readOnly
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">DATE:</Label>
                    <Input
                      id="date"
                      type="text"
                      value={today}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tagNo">TAG NO:</Label>
                    <Input
                      id="tagNo"
                      type="text"
                      value={tagNo}
                      readOnly
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="equipment">EQUIPMENT:</Label>
                    <Input
                      id="equipment"
                      type="text"
                      value={equipment}
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

            {/* User Input Fields Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Equipment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="drgNo">DRG. NO.:</Label>
                    <Input
                      id="drgNo"
                      name="drgNo"
                      type="text"
                      value={formData.drgNo}
                      onChange={handleInputChange}
                      placeholder="Enter DRG. NO."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* First Table Section */}
            <Card className="mb-6 w-full overflow-hidden">
              <CardHeader>
                <CardTitle>Inspection Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex flex-col gap-4 w-full">
                <div className="rounded-md border overflow-y-auto max-h-[500px]">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          DESCRIPTION
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          REQUIRED
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          ACTUAL
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          REMARKS
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase w-[120px]">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {table1Rows.length > 0 ? (
                        table1Rows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.description}
                                onChange={(e) =>
                                  handleTable1RowChange(row.id, "description", e.target.value)
                                }
                                placeholder="Description"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.required}
                                onChange={(e) =>
                                  handleTable1RowChange(row.id, "required", e.target.value)
                                }
                                placeholder="Required"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.actual}
                                onChange={(e) =>
                                  handleTable1RowChange(row.id, "actual", e.target.value)
                                }
                                placeholder="Actual"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.remarks}
                                onChange={(e) =>
                                  handleTable1RowChange(row.id, "remarks", e.target.value)
                                }
                                placeholder="Remarks"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTable1Row(row.id)}
                                disabled={table1Rows.length === 1}
                                title="Remove Row"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            No inspection details added.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addTable1Row}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Row
                </Button>
              </CardContent>
            </Card>

            {/* Second Table Section - Nozzle Details */}
            <Card className="mb-6 w-full overflow-hidden">
              <CardHeader>
                <CardTitle>Nozzle Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex flex-col gap-4 w-full">
                <div className="rounded-md border overflow-y-auto max-h-[500px]">
                  <Table className="min-w-[1200px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          NOZZLE MARK
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          ORIENTATION
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          SIZE
                        </TableHead>
                        <TableHead
                          colSpan={3}
                          className="p-2 text-xs font-bold uppercase text-center"
                        >
                          DIMENSION AS PER APPROVED DRAWING
                        </TableHead>
                        <TableHead
                          colSpan={2}
                          className="p-2 text-xs font-bold uppercase text-center"
                        >
                          DIMENSION AT ACTUAL MEASURE
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase w-[120px]">
                          Actions
                        </TableHead>
                      </TableRow>
                      <TableRow>
                        <TableHead></TableHead>
                        <TableHead></TableHead>
                        <TableHead></TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          LOCATION
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          ELEVATION
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          PROJECTION
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          ELEVATION
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          PROJECTION
                        </TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {table2Rows.length > 0 ? (
                        table2Rows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.nozzleMark}
                                onChange={(e) =>
                                  handleTable2RowChange(row.id, "nozzleMark", e.target.value)
                                }
                                placeholder="Nozzle Mark"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.orientation}
                                onChange={(e) =>
                                  handleTable2RowChange(row.id, "orientation", e.target.value)
                                }
                                placeholder="Orientation"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.size}
                                onChange={(e) =>
                                  handleTable2RowChange(row.id, "size", e.target.value)
                                }
                                placeholder="Size"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.location}
                                onChange={(e) =>
                                  handleTable2RowChange(row.id, "location", e.target.value)
                                }
                                placeholder="Location"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.elevationApproved}
                                onChange={(e) =>
                                  handleTable2RowChange(row.id, "elevationApproved", e.target.value)
                                }
                                placeholder="Elevation"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.projectionApproved}
                                onChange={(e) =>
                                  handleTable2RowChange(row.id, "projectionApproved", e.target.value)
                                }
                                placeholder="Projection"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.elevationActual}
                                onChange={(e) =>
                                  handleTable2RowChange(row.id, "elevationActual", e.target.value)
                                }
                                placeholder="Elevation"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.projectionActual}
                                onChange={(e) =>
                                  handleTable2RowChange(row.id, "projectionActual", e.target.value)
                                }
                                placeholder="Projection"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTable2Row(row.id)}
                                disabled={table2Rows.length === 1}
                                title="Remove Row"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={9} className="h-24 text-center">
                            No nozzle details added.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addTable2Row}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Row
                </Button>
              </CardContent>
            </Card>

            {/* Third Table Section - Part Details */}
            <Card className="mb-6 w-full overflow-hidden">
              <CardHeader>
                <CardTitle>Part Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex flex-col gap-4 w-full">
                <div className="rounded-md border overflow-y-auto max-h-[500px]">
                  <Table className="min-w-[1200px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          PART NO
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          DESCRIPTION
                        </TableHead>
                        <TableHead
                          colSpan={3}
                          className="p-2 text-xs font-bold uppercase text-center"
                        >
                          DIMENSION AS PER APPROVED DRAWING
                        </TableHead>
                        <TableHead
                          colSpan={2}
                          className="p-2 text-xs font-bold uppercase text-center"
                        >
                          DIMENSION AT ACTUAL MEASURE
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase w-[120px]">
                          Actions
                        </TableHead>
                      </TableRow>
                      <TableRow>
                        <TableHead></TableHead>
                        <TableHead></TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          ORIENTATION
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          ELEVATION
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          PROJECTION
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          ELEVATION
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          PROJECTION
                        </TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {table3Rows.length > 0 ? (
                        table3Rows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.partNo}
                                onChange={(e) =>
                                  handleTable3RowChange(row.id, "partNo", e.target.value)
                                }
                                placeholder="Part No"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.description}
                                onChange={(e) =>
                                  handleTable3RowChange(row.id, "description", e.target.value)
                                }
                                placeholder="Description"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.orientationApproved}
                                onChange={(e) =>
                                  handleTable3RowChange(row.id, "orientationApproved", e.target.value)
                                }
                                placeholder="Orientation"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.elevationApproved}
                                onChange={(e) =>
                                  handleTable3RowChange(row.id, "elevationApproved", e.target.value)
                                }
                                placeholder="Elevation"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.projectionApproved}
                                onChange={(e) =>
                                  handleTable3RowChange(row.id, "projectionApproved", e.target.value)
                                }
                                placeholder="Projection"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.elevationActual}
                                onChange={(e) =>
                                  handleTable3RowChange(row.id, "elevationActual", e.target.value)
                                }
                                placeholder="Elevation"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.projectionActual}
                                onChange={(e) =>
                                  handleTable3RowChange(row.id, "projectionActual", e.target.value)
                                }
                                placeholder="Projection"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTable3Row(row.id)}
                                disabled={table3Rows.length === 1}
                                title="Remove Row"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="h-24 text-center">
                            No part details added.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addTable3Row}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Row
                </Button>
              </CardContent>
            </Card>

            {/* Remarks Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Label>REMARK:</Label>
                  {remarks.map((remark, index) => (
                    <div key={remark.id} className="flex gap-2 items-start">
                      <div className="flex-shrink-0 pt-2">
                        <span className="text-sm font-medium">{index + 1}</span>
                      </div>
                      <Textarea
                        value={remark.text}
                        onChange={(e) => handleRemarkChange(remark.id, e.target.value)}
                        className="min-h-[60px] flex-1"
                        placeholder="Enter remark"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRemark(remark.id)}
                        disabled={remarks.length === 1}
                        className="mt-2"
                        title="Remove Remark"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addRemark}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Remark
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Instrument Calibration Details Table */}
            <Card className="mb-6 w-full overflow-hidden">
              <CardHeader>
                <CardTitle>Instrument Calibration Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex flex-col gap-4 w-full">
                <div className="rounded-md border overflow-y-auto max-h-[500px]">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          NAME
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          ID NO. / SR NO.
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          DUE DATE
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase w-[120px]">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {instrumentRows.length > 0 ? (
                        instrumentRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.name}
                                onChange={(e) =>
                                  handleInstrumentRowChange(row.id, "name", e.target.value)
                                }
                                placeholder="Name"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.idNo}
                                onChange={(e) =>
                                  handleInstrumentRowChange(row.id, "idNo", e.target.value)
                                }
                                placeholder="ID No. / SR No."
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.dueDate}
                                onChange={(e) =>
                                  handleInstrumentRowChange(row.id, "dueDate", e.target.value)
                                }
                                placeholder="Due Date"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeInstrumentRow(row.id)}
                                disabled={instrumentRows.length === 1}
                                title="Remove Row"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            No instrument calibration details added.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addInstrumentRow}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Row
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default FinalInspectionReports
