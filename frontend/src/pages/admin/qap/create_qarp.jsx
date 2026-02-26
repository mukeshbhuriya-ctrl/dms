import { useState, useMemo } from "react"
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
import { Plus, Trash2, Type } from "lucide-react"

function CreateQARP() {
  // Get today's date
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  // Header section - Dropdowns
  const [client, setClient] = useState("")
  const [msn, setMsn] = useState("")
  const [poNo, setPoNo] = useState("")
  const [poDate, setPoDate] = useState("")

  // User input fields
  const [formData, setFormData] = useState({
    documentNo: "",
    drgNo: "",
    customerDrgNo: "",
    equipmentDescription: "",
    tagNo: "",
    code: "",
  })

  // Table rows
  const [tableRows, setTableRows] = useState([
    {
      id: 1,
      activity: "",
      typeMethodCheck: "",
      extent: "",
      acceptanceCriteria: "",
      referenceDocuments: "",
      verifyingDocument: "",
      shreno: "",
      assignedUser: "",
      clientTpia: "",
      remark: "",
      isHeading: true,
      headingText: "",
      parentHeaderId: null,
    },
  ])

  // Calculate serial numbers - headers get 1, 2, 3... and sub-items get 1.1, 1.2, 1.3...
  const getSerialNumbers = () => {
    let headerCounter = 0
    const result = []

    tableRows.forEach((row, index) => {
      if (row.isHeading) {
        headerCounter++
        result.push({
          ...row,
          serialNo: headerCounter.toString(),
          subSerialNo: null,
        })
      } else {
        // Find the most recent header before this row
        let currentHeaderCounter = 0
        let subCounter = 0

        for (let i = 0; i < index; i++) {
          if (tableRows[i].isHeading) {
            currentHeaderCounter++
            subCounter = 0
          } else if (currentHeaderCounter > 0) {
            subCounter++
          }
        }

        if (currentHeaderCounter > 0) {
          subCounter++
          result.push({
            ...row,
            serialNo: currentHeaderCounter.toString(),
            subSerialNo: `${currentHeaderCounter}.${subCounter}`,
          })
        } else {
          result.push({
            ...row,
            serialNo: null,
            subSerialNo: null,
          })
        }
      }
    })

    return result
  }

  // Mock data for dropdowns
  const clients = [
    { id: "1", name: "AIR PRODUCTS" },
    { id: "2", name: "Client 2" },
    { id: "3", name: "Client 3" },
  ]

  const msnOptions = [
    { id: "1", value: "9924282053" },
    { id: "2", value: "9924282054" },
    { id: "3", value: "9924282055" },
  ]

  // Handle MSN change to populate equipment, tag and code and set document no
  const handleMsnChange = (value) => {
    setMsn(value)
    const selected = msnOptions.find((m) => m.id === value)
    const msnValue = selected ? selected.value : ""

    if (value === "1") {
      setFormData((prev) => ({
        ...prev,
        equipmentDescription: "Equipment A",
        tagNo: "TAG-001",
        code: "CODE-001",
        documentNo: `SHR/${msnValue}/QAP/1`,
      }))
      setPoNo("PO-001")
      setPoDate("01-01-2026")
    } else if (value === "2") {
      setFormData((prev) => ({
        ...prev,
        equipmentDescription: "Equipment B",
        tagNo: "TAG-002",
        code: "CODE-002",
        documentNo: `SHR/${msnValue}/QAP/1`,
      }))
      setPoNo("PO-002")
      setPoDate("05-02-2026")
    } else if (value === "3") {
      setFormData((prev) => ({
        ...prev,
        equipmentDescription: "Equipment C",
        tagNo: "TAG-003",
        code: "CODE-003",
        documentNo: `SHR/${msnValue}/QAP/1`,
      }))
      setPoNo("PO-003")
      setPoDate("10-03-2026")
    } else {
      setFormData((prev) => ({
        ...prev,
        equipmentDescription: "",
        tagNo: "",
        code: "",
        documentNo: "",
      }))
      setPoNo("")
      setPoDate("")
    }
  }

  const users = [
    { id: "1", name: "John Doe", email: "john@example.com" },
    { id: "2", name: "Jane Smith", email: "jane@example.com" },
    { id: "3", name: "Bob Johnson", email: "bob@example.com" },
    { id: "4", name: "Alice Williams", email: "alice@example.com" },
    { id: "5", name: "Charlie Brown", email: "charlie@example.com" },
  ]


  const rowsWithSerialNumbers = useMemo(() => getSerialNumbers(), [tableRows])

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

  // Add new heading at the end
  const addRow = () => {
    const newId = Math.max(...tableRows.map((row) => row.id), 0) + 1
    setTableRows([
      ...tableRows,
      {
        id: newId,
        activity: "",
        typeMethodCheck: "",
        extent: "",
        acceptanceCriteria: "",
        referenceDocuments: "",
        verifyingDocument: "",
        shreno: "",
        assignedUser: "",
        clientTpia: "",
        ai: "",
        isHeading: true,
        headingText: "",
        parentHeaderId: null,
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
        activity: "",
        typeMethodCheck: "",
        extent: "",
        acceptanceCriteria: "",
        referenceDocuments: "",
        verifyingDocument: "",
        shreno: "",
        assignedUser: "",
        clientTpia: "",
        ai: "",
        isHeading: false,
        headingText: "",
        parentHeaderId: headingId,
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
            parentHeaderId: null,
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
        <main className="flex-1 overflow-auto p-6 flex flex-col">
          <div className="flex-1 flex flex-col w-full">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Quality Assurance Plan</h1>
              <p className="text-muted-foreground">
                Create and manage quality assurance plan information.
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
                    <Label htmlFor="client">Client:</Label>
                    <Select value={client} onValueChange={setClient}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((clientOption) => (
                          <SelectItem key={clientOption.id} value={clientOption.id}>
                            {clientOption.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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
                    <Label htmlFor="documentNo">Document No.:</Label>
                    <Input
                      id="documentNo"
                      name="documentNo"
                      type="text"
                      value={formData.documentNo}
                      readOnly
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="equipment">Equipment Name:</Label>
                    <Input
                      id="equipment"
                      type="text"
                      value={formData.equipmentDescription}
                      readOnly
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tagNo">Tag No.:</Label>
                    <Input
                      id="tagNo"
                      type="text"
                      value={formData.tagNo}
                      readOnly
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="code">CODE:</Label>
                    <Input
                      id="code"
                      type="text"
                      value={formData.code}
                      readOnly
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="poNo">P.O. No.:</Label>
                    <Input
                      id="poNo"
                      type="text"
                      value={poNo}
                      onChange={(e) => setPoNo(e.target.value)}
                      placeholder="Enter P.O. No."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="poDate">P.O. Date:</Label>
                    <Input
                      id="poDate"
                      type="text"
                      value={poDate}
                      onChange={(e) => setPoDate(e.target.value)}
                      placeholder="Enter P.O. Date"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Second Section - User Input Fields */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Document Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="drgNo">SHRENO DRG No.:</Label>
                    <Input
                      id="drgNo"
                      name="drgNo"
                      type="text"
                      value={formData.drgNo}
                      onChange={handleInputChange}
                      placeholder="Enter SHRENO DRG No."
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


                </div>
              </CardContent>
            </Card>

            {/* Third Section - Table */}
            <Card className="w-full overflow-hidden">
              <CardHeader>
                <CardTitle>Quality Assurance Plan Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex flex-col gap-4 w-full">
                <div className="rounded-md border overflow-y-auto max-h-[500px]">
                  <Table className="min-w-[1800px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="p-2 text-xs font-bold uppercase w-[80px]">
                          Sr. No.
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          Activity
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          Type / Method of Check /<br />Extent
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          Acceptance Criteria /<br />Reference Documents
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          Verifying Document
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          Shreno
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          Assigned User
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          Client /<br />TPIA
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase">
                          Remark
                        </TableHead>
                        <TableHead className="p-2 text-xs font-bold uppercase w-[120px]">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rowsWithSerialNumbers.map((row) =>
                        row.isHeading ? (
                          <TableRow key={row.id} className="bg-muted/30">
                            <TableCell className="p-2 font-medium">
                              {row.serialNo}
                            </TableCell>
                            <TableCell colSpan={8} className="p-2">
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
                            </TableCell>
                            <TableCell className="p-2">
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
                            </TableCell>
                          </TableRow>
                        ) : (
                          <TableRow key={row.id}>
                            <TableCell className="p-2 font-medium">
                              {row.subSerialNo || row.serialNo || "-"}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.activity}
                                onChange={(e) =>
                                  handleRowChange(row.id, "activity", e.target.value)
                                }
                                placeholder="Activity"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.typeMethodCheck}
                                onChange={(e) =>
                                  handleRowChange(row.id, "typeMethodCheck", e.target.value)
                                }
                                placeholder="Type / Method of Check"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.acceptanceCriteria}
                                onChange={(e) =>
                                  handleRowChange(row.id, "acceptanceCriteria", e.target.value)
                                }
                                placeholder="Acceptance Criteria"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.verifyingDocument}
                                onChange={(e) =>
                                  handleRowChange(row.id, "verifyingDocument", e.target.value)
                                }
                                placeholder="Verifying Document"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.shreno}
                                onChange={(e) =>
                                  handleRowChange(row.id, "shreno", e.target.value)
                                }
                                placeholder="Shreno"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={row.assignedUser}
                                onValueChange={(value) =>
                                  handleRowChange(row.id, "assignedUser", value)
                                }
                              >
                                <SelectTrigger className="w-full text-xs h-8">
                                  <SelectValue placeholder="Select user" />
                                </SelectTrigger>
                                <SelectContent>
                                  {users.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                      <div className="flex flex-col">
                                        <span>{user.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {user.email}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.clientTpia}
                                onChange={(e) =>
                                  handleRowChange(row.id, "clientTpia", e.target.value)
                                }
                                placeholder="Client / TPIA"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={row.remark}
                                onChange={(e) =>
                                  handleRowChange(row.id, "remark", e.target.value)
                                }
                                placeholder="Remark"
                                className="w-full text-xs border-0 focus-visible:ring-0"
                              />
                            </TableCell>
                            <TableCell>
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
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addRow}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Heading
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default CreateQARP
