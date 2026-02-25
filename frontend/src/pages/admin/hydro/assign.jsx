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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"

function HydroAssign() {
  // Get today's date
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  // First section - Dropdowns
  const [msn, setMsn] = useState("")
  const [client, setClient] = useState("")
  const [poNo, setPoNo] = useState("")
  const [equipment, setEquipment] = useState("")
  const [code, setCode] = useState("")
  const [measurementUnit, setMeasurementUnit] = useState("")

  // User input fields
  const [formData, setFormData] = useState({
    tagNo: "",
    drgNo: "",
    inspAgency: "",
  })

  // Description options for the table
  const descriptionOptions = [
    "OD",
    "OVALITY (Maximum)",
    "OUTSIDE CIRCUMFERANCE",
    "CROWN RADIUS (C.R)",
    "KNUCKLE RADIUS (K.R)",
    "STRAIGHT FACE",
    "DISH HEIGHT including SF",
    "NOMINAL THICKNESS",
    "MIN. THICKNESS",
    "CENTER HOLE",
    "Maximum OVER CROWNING",
    "Maximum UNDER CROWNING",
    "EDGE PREPARATION (Single \"V\" / DOUBLE \"V\")",
    "HEAT TREATMENT (YES/NO)",
    "MARKING",
    "VISUAL INSPECTION",
    "FORMING PROCESS",
    "NDT (LPT/MT)",
    "NDT (RT) (YES/NO)",
    "TEMPELATE VERIFICATION - INTERNAL",
    "TEMPELATE VERIFICATION - External (YES/NO)",
  ]

  // Main table rows
  const [tableRows, setTableRows] = useState(
    descriptionOptions.map((desc, index) => ({
      id: index + 1,
      srNo: index + 1,
      description: desc,
      asPerDrg: "",
      actual: "",
      remarks: "",
    }))
  )

  // Instrument Calibration Details table
  const [instrumentRows, setInstrumentRows] = useState([
    {
      id: 1,
      name: "",
      idNo: "",
      dueDate: "",
    },
  ])

  // Quality Engineer
  const [qualityEngineer, setQualityEngineer] = useState("")

  // Mock data for dropdowns
  const msnOptions = [
    {
      id: "1",
      value: "9924282053",
      clientName: "AIR PRODUCTS",
      poNo: "PO-001",
      equipment: "Equipment A",
      code: "CODE-001",
    },
    {
      id: "2",
      value: "9924282054",
      clientName: "Client 2",
      poNo: "PO-002",
      equipment: "Equipment B",
      code: "CODE-002",
    },
    {
      id: "3",
      value: "9924282055",
      clientName: "Client 3",
      poNo: "PO-003",
      equipment: "Equipment C",
      code: "CODE-003",
    },
  ]

  const qualityEngineers = [
    { id: "1", name: "John Doe", email: "john@example.com" },
    { id: "2", name: "Jane Smith", email: "jane@example.com" },
    { id: "3", name: "Bob Johnson", email: "bob@example.com" },
  ]

  // Handle MSN change to populate fields
  const handleMsnChange = (value) => {
    setMsn(value)
    const selectedMsn = msnOptions.find((option) => option.id === value)
    setEquipment(selectedMsn?.equipment || "")
    setCode(selectedMsn?.code || "")
    setClient(selectedMsn?.clientName || "")
    setPoNo(selectedMsn?.poNo || "")
  }

  // Handle input field changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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

  // Handle instrument table row changes
  const handleInstrumentRowChange = (id, field, value) => {
    setInstrumentRows(
      instrumentRows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    )
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
              <h1 className="text-3xl font-bold mb-2">Dish End Inspection Report</h1>
              <p className="text-muted-foreground">
                Create and manage dish end inspection reports.
              </p>
            </div>

            {/* First Section - Dropdowns */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
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
                    <Label htmlFor="date">Date:</Label>
                    <Input
                      id="date"
                      type="text"
                      value={today}
                      disabled
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
                    <Label htmlFor="tagNo">TAG NO.:</Label>
                    <Input
                      id="tagNo"
                      name="tagNo"
                      type="text"
                      value={formData.tagNo}
                      onChange={handleInputChange}
                      placeholder="Enter TAG NO."
                    />
                  </div>

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

                  <div className="space-y-2">
                    <Label htmlFor="inspAgency">INSP. AGENCY:</Label>
                    <Input
                      id="inspAgency"
                      name="inspAgency"
                      type="text"
                      value={formData.inspAgency}
                      onChange={handleInputChange}
                      placeholder="Enter INSP. AGENCY"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Third Section - Main Table */}
            <Card className="mb-6 w-full overflow-hidden">
              <CardHeader>
                <CardTitle>Inspection Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex flex-col gap-4 w-full">
                <div className="rounded-md border overflow-x-auto">
                  <Table className="min-w-[1200px]">
                    <TableHeader>
                      <TableRow className="bg-blue-100">
                        <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300">
                          SR NO.
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300">
                          DESCRIPTION
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300">
                          AS PER DRG.
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300">
                          <div className="flex flex-col gap-2">
                            <span>ACTUAL</span>
                            <Input
                              type="text"
                              value={measurementUnit}
                              onChange={(e) => setMeasurementUnit(e.target.value)}
                              placeholder="Vendor Dish End Number"
                              className="text-xs border-0 focus-visible:ring-0 bg-white"
                            />
                          </div>
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300">
                          REMARKS
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="p-2 border border-gray-300">
                            <div className="text-sm font-medium">{row.srNo}</div>
                          </TableCell>
                          <TableCell className="p-2 border border-gray-300">
                            <div className="text-sm">{row.description}</div>
                          </TableCell>
                          <TableCell className="p-2 border border-gray-300">
                            <Input
                              type="text"
                              value={row.asPerDrg}
                              onChange={(e) =>
                                handleRowChange(row.id, "asPerDrg", e.target.value)
                              }
                              placeholder="As Per DRG"
                              className="w-full text-xs border-0 focus-visible:ring-0"
                            />
                          </TableCell>
                          <TableCell className="p-2 border border-gray-300">
                            <Input
                              type="text"
                              value={row.actual}
                              onChange={(e) =>
                                handleRowChange(row.id, "actual", e.target.value)
                              }
                              placeholder="Actual"
                              className="w-full text-xs border-0 focus-visible:ring-0"
                            />
                          </TableCell>
                          <TableCell className="p-2 border border-gray-300">
                            <Input
                              type="text"
                              value={row.remarks}
                              onChange={(e) =>
                                handleRowChange(row.id, "remarks", e.target.value)
                              }
                              placeholder="Remarks"
                              className="w-full text-xs border-0 focus-visible:ring-0"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Fourth Section - Instrument Calibration Details */}
            <Card className="mb-6 w-full overflow-hidden">
              <CardHeader>
                <CardTitle>Instrument Calibration Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex flex-col gap-4 w-full">
                <div className="rounded-md border overflow-x-auto">
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

            {/* Fifth Section - Quality Engineer */}
            <Card>
              <CardHeader>
                <CardTitle>Quality Engineer Assignment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="qualityEngineer">Quality Engineer:</Label>
                    <Select value={qualityEngineer} onValueChange={setQualityEngineer}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Quality Engineer" />
                      </SelectTrigger>
                      <SelectContent>
                        {qualityEngineers.map((engineer) => (
                          <SelectItem key={engineer.id} value={engineer.id}>
                            <div className="flex flex-col">
                              <span>{engineer.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {engineer.email}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default HydroAssign
