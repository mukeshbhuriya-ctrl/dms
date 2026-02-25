import { useState, Fragment } from "react"
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
import { Plus, Trash2 } from "lucide-react"

function HydroPresText() {
  // Get today's date
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  // Header section
  const [msmNumber, setMsmNumber] = useState("")
  const [poNo, setPoNo] = useState("")
  const [clientName, setClientName] = useState("")
  const [projectId, setProjectId] = useState("")
  const [equipmentName, setEquipmentName] = useState("")
  const [tagNo, setTagNo] = useState("")
  const [code, setCode] = useState("")

  // Handler for MSM change
  const handleMsmChange = (value) => {
    setMsmNumber(value)
    const selectedMsm = msmOptions.find((opt) => opt.id === value)
    const msnValue = selectedMsm?.value || ""

    // Set report number based on MSM selection
    if (msnValue) {
      setFormData((prev) => ({
        ...prev,
        reportNo: `SHR/${msnValue}/HYDRO/1`,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        reportNo: "",
      }))
    }

    // Populate static values based on MSM selection
    setPoNo(selectedMsm?.poNo || "")
    setClientName(selectedMsm?.clientName || "")
    setProjectId(selectedMsm?.projectId || "")
    setEquipmentName(selectedMsm?.equipmentName || "")
    setTagNo(selectedMsm?.tagNo || "")
    setCode(selectedMsm?.code || "")
  }

  // User input fields
  const [formData, setFormData] = useState({
    reportNo: "",
    shrDrgNo: "",
    customerDrgNo: "",
    constructionCode: "",
    chlorineContent: "",
    inspectionAgency: "",
    testPosition: "",
    procedureNo: "",
  })

  // Table rows
  const [tableRows, setTableRows] = useState([
    {
      id: 1,
      particulars: "",
      mawpIntExt: "",
      requiredTestPressure: "",
      actualTestPressure: "",
      holdingTime: "",
      testResult: "",
      gaugeDetails: [
        { range: "", idNo: "", calibrationDate: "", dueDate: "" },
        { range: "", idNo: "", calibrationDate: "", dueDate: "" },
      ],
    },
  ])

  // Remarks
  const [remarks, setRemarks] = useState([
    {
      id: 1,
      text:
        "NO PRESSURE DROP OR VISIBLE DEFORMATION OBSERVED DURING THE HOLDING TIME. NO LEAKAGE OBSERVED FROM ANY WELDED JOINTS.\nWITNESS FINAL EXTERNAL INSPECTION OF EQUIPMENT AT HYDROSTATIC PRESSURE DIVIDED BY 1.3 & CLOSED VISUAL INSPECTION CARRIED OUT - SATISFACTORY",
      editable: false,
    },
  ])

  // Mock data for dropdowns
  const msmOptions = [
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

  // Handle table row changes
  const handleRowChange = (id, field, value) => {
    setTableRows(
      tableRows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    )
  }

  const handleGaugeChange = (id, gaugeIndex, field, value) => {
    setTableRows(
      tableRows.map((row) => {
        if (row.id !== id) return row
        const nextGaugeDetails = row.gaugeDetails.map((gauge, index) =>
          index === gaugeIndex ? { ...gauge, [field]: value } : gauge
        )
        return { ...row, gaugeDetails: nextGaugeDetails }
      })
    )
  }

  // Add new row
  const addRow = () => {
    const newId = Math.max(...tableRows.map((row) => row.id), 0) + 1
    setTableRows([
      ...tableRows,
      {
        id: newId,
        particulars: "",
        mawpIntExt: "",
        requiredTestPressure: "",
        actualTestPressure: "",
        holdingTime: "",
        testResult: "",
        gaugeDetails: [
          { range: "", idNo: "", calibrationDate: "", dueDate: "" },
          { range: "", idNo: "", calibrationDate: "", dueDate: "" },
        ],
      },
    ])
  }

  // Remove row
  const removeRow = (id) => {
    if (tableRows.length > 1) {
      setTableRows(tableRows.filter((row) => row.id !== id))
    }
  }

  // Add new remark
  const addRemark = () => {
    const newId = Math.max(...remarks.map((remark) => remark.id), 0) + 1
    setRemarks([
      ...remarks,
      {
        id: newId,
        text: "",
        editable: true,
      },
    ])
  }

  // Update remark
  const updateRemark = (id, text) => {
    setRemarks(remarks.map((remark) => (remark.id === id ? { ...remark, text } : remark)))
  }

  // Remove remark
  const removeRemark = (id) => {
    if (remarks.length > 1) {
      setRemarks(remarks.filter((remark) => remark.id !== id))
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
              <h1 className="text-3xl font-bold mb-2">Hydrostatic Pressure Test Report</h1>
              <p className="text-muted-foreground">
                Create and manage hydrostatic pressure test reports.
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
                    <Label htmlFor="msmNumber">MSM Number:</Label>
                    <Select value={msmNumber} onValueChange={handleMsmChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select MSM Number" />
                      </SelectTrigger>
                      <SelectContent>
                        {msmOptions.map((msmOption) => (
                          <SelectItem key={msmOption.id} value={msmOption.id}>
                            {msmOption.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="todayDate">Today's Date:</Label>
                    <Input
                      id="todayDate"
                      type="text"
                      value={today}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reportNo">REPORT No.:</Label>
                    <Input
                      id="reportNo"
                      type="text"
                      value={formData.reportNo}
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
                      readOnly
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientName">Client Name:</Label>
                    <Input
                      id="clientName"
                      type="text"
                      value={clientName}
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

            {/* User Input Fields Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Test Details</CardTitle>
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
                    <Label htmlFor="constructionCode">CONSTRUCTION CODE:</Label>
                    <Input
                      id="constructionCode"
                      name="constructionCode"
                      type="text"
                      value={formData.constructionCode}
                      onChange={handleInputChange}
                      placeholder="Enter CONSTRUCTION CODE"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="chlorineContent">CHLORINE CONTENT:</Label>
                    <Input
                      id="chlorineContent"
                      name="chlorineContent"
                      type="text"
                      value={formData.chlorineContent}
                      onChange={handleInputChange}
                      placeholder="Enter CHLORINE CONTENT"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inspectionAgency">INSPECTION AGENCY:</Label>
                    <Input
                      id="inspectionAgency"
                      name="inspectionAgency"
                      type="text"
                      value={formData.inspectionAgency}
                      onChange={handleInputChange}
                      placeholder="Enter INSPECTION AGENCY"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="testPosition">TEST POSITION:</Label>
                    <Input
                      id="testPosition"
                      name="testPosition"
                      type="text"
                      value={formData.testPosition}
                      onChange={handleInputChange}
                      placeholder="Enter TEST POSITION"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="procedureNo">PROCEDURE No:</Label>
                    <Input
                      id="procedureNo"
                      name="procedureNo"
                      type="text"
                      value={formData.procedureNo}
                      onChange={handleInputChange}
                      placeholder="Enter PROCEDURE No"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Table Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Pressure Test Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr>
                          <th className="border border-gray-300 p-2 text-xs font-bold uppercase text-left">
                            PARTICULARS
                          </th>
                          <th className="border border-gray-300 p-2 text-xs font-bold uppercase text-left">
                            MAWP INT. / EXT.<br />PSI (g)
                          </th>
                          <th className="border border-gray-300 p-2 text-xs font-bold uppercase text-left">
                            REQUIRED TEST PRESSURE<br />PSI (Kg/Cm2) (g)
                          </th>
                          <th className="border border-gray-300 p-2 text-xs font-bold uppercase text-left">
                            ACTUAL TEST PRESSURE<br />Kg/Cm2 (g)
                          </th>
                          <th colSpan="4" className="border border-gray-300 p-2 text-xs font-bold uppercase text-center">
                            PRESSURE GAUGE DETAIL
                          </th>
                          <th className="border border-gray-300 p-2 text-xs font-bold uppercase text-left">
                            HOLDING TIME
                          </th>
                          <th className="border border-gray-300 p-2 text-xs font-bold uppercase text-left">
                            TEST RESULT
                          </th>
                          <th className="border border-gray-300 p-2 text-xs font-bold uppercase text-left w-20">
                            Action
                          </th>
                        </tr>
                        <tr>
                          <th className="border border-gray-300"></th>
                          <th className="border border-gray-300"></th>
                          <th className="border border-gray-300"></th>
                          <th className="border border-gray-300"></th>
                          <th className="border border-gray-300 p-2 text-xs font-bold uppercase text-left">
                            RANGE<br />(Kg/Cm2) (g)
                          </th>
                          <th className="border border-gray-300 p-2 text-xs font-bold uppercase text-left">
                            I.D No.
                          </th>
                          <th className="border border-gray-300 p-2 text-xs font-bold uppercase text-left">
                            DATE OF<br />CALIBRATION
                          </th>
                          <th className="border border-gray-300 p-2 text-xs font-bold uppercase text-left">
                            DATE OF DUE
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.map((row) => (
                          <Fragment key={row.id}>
                            <tr className="border-b">
                              <td className="border border-gray-300 p-2" rowSpan={2}>
                                <Input
                                  type="text"
                                  value={row.particulars}
                                  onChange={(e) =>
                                    handleRowChange(row.id, "particulars", e.target.value)
                                  }
                                  placeholder="Particulars"
                                  className="w-full text-xs border-0 focus-visible:ring-0"
                                />
                              </td>
                              <td className="border border-gray-300 p-2" rowSpan={2}>
                                <Input
                                  type="text"
                                  value={row.mawpIntExt}
                                  onChange={(e) =>
                                    handleRowChange(row.id, "mawpIntExt", e.target.value)
                                  }
                                  placeholder="MAWP"
                                  className="w-full text-xs border-0 focus-visible:ring-0"
                                />
                              </td>
                              <td className="border border-gray-300 p-2" rowSpan={2}>
                                <Input
                                  type="text"
                                  value={row.requiredTestPressure}
                                  onChange={(e) =>
                                    handleRowChange(row.id, "requiredTestPressure", e.target.value)
                                  }
                                  placeholder="Required"
                                  className="w-full text-xs border-0 focus-visible:ring-0"
                                />
                              </td>
                              <td className="border border-gray-300 p-2" rowSpan={2}>
                                <Input
                                  type="text"
                                  value={row.actualTestPressure}
                                  onChange={(e) =>
                                    handleRowChange(row.id, "actualTestPressure", e.target.value)
                                  }
                                  placeholder="Actual"
                                  className="w-full text-xs border-0 focus-visible:ring-0"
                                />
                              </td>
                              <td className="border border-gray-300 p-2">
                                <Input
                                  type="text"
                                  value={row.gaugeDetails[0]?.range ?? ""}
                                  onChange={(e) =>
                                    handleGaugeChange(row.id, 0, "range", e.target.value)
                                  }
                                  placeholder="Range"
                                  className="w-full text-xs border-0 focus-visible:ring-0"
                                />
                              </td>
                              <td className="border border-gray-300 p-2">
                                <Input
                                  type="text"
                                  value={row.gaugeDetails[0]?.idNo ?? ""}
                                  onChange={(e) =>
                                    handleGaugeChange(row.id, 0, "idNo", e.target.value)
                                  }
                                  placeholder="I.D No."
                                  className="w-full text-xs border-0 focus-visible:ring-0"
                                />
                              </td>
                              <td className="border border-gray-300 p-2">
                                <Input
                                  type="text"
                                  value={row.gaugeDetails[0]?.calibrationDate ?? ""}
                                  onChange={(e) =>
                                    handleGaugeChange(row.id, 0, "calibrationDate", e.target.value)
                                  }
                                  placeholder="Calibration Date"
                                  className="w-full text-xs border-0 focus-visible:ring-0"
                                />
                              </td>
                              <td className="border border-gray-300 p-2">
                                <Input
                                  type="text"
                                  value={row.gaugeDetails[0]?.dueDate ?? ""}
                                  onChange={(e) =>
                                    handleGaugeChange(row.id, 0, "dueDate", e.target.value)
                                  }
                                  placeholder="Due Date"
                                  className="w-full text-xs border-0 focus-visible:ring-0"
                                />
                              </td>
                              <td className="border border-gray-300 p-2" rowSpan={2}>
                                <Input
                                  type="text"
                                  value={row.holdingTime}
                                  onChange={(e) =>
                                    handleRowChange(row.id, "holdingTime", e.target.value)
                                  }
                                  placeholder="Holding Time"
                                  className="w-full text-xs border-0 focus-visible:ring-0"
                                />
                              </td>
                              <td className="border border-gray-300 p-2" rowSpan={2}>
                                <Input
                                  type="text"
                                  value={row.testResult}
                                  onChange={(e) =>
                                    handleRowChange(row.id, "testResult", e.target.value)
                                  }
                                  placeholder="Test Result"
                                  className="w-full text-xs border-0 focus-visible:ring-0"
                                />
                              </td>
                              <td className="border border-gray-300 p-2" rowSpan={2}>
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
                              </td>
                            </tr>
                            <tr className="border-b">
                              <td className="border border-gray-300 p-2">
                                <Input
                                  type="text"
                                  value={row.gaugeDetails[1]?.range ?? ""}
                                  onChange={(e) =>
                                    handleGaugeChange(row.id, 1, "range", e.target.value)
                                  }
                                  placeholder="Range"
                                  className="w-full text-xs border-0 focus-visible:ring-0"
                                />
                              </td>
                              <td className="border border-gray-300 p-2">
                                <Input
                                  type="text"
                                  value={row.gaugeDetails[1]?.idNo ?? ""}
                                  onChange={(e) =>
                                    handleGaugeChange(row.id, 1, "idNo", e.target.value)
                                  }
                                  placeholder="I.D No."
                                  className="w-full text-xs border-0 focus-visible:ring-0"
                                />
                              </td>
                              <td className="border border-gray-300 p-2">
                                <Input
                                  type="text"
                                  value={row.gaugeDetails[1]?.calibrationDate ?? ""}
                                  onChange={(e) =>
                                    handleGaugeChange(row.id, 1, "calibrationDate", e.target.value)
                                  }
                                  placeholder="Calibration Date"
                                  className="w-full text-xs border-0 focus-visible:ring-0"
                                />
                              </td>
                              <td className="border border-gray-300 p-2">
                                <Input
                                  type="text"
                                  value={row.gaugeDetails[1]?.dueDate ?? ""}
                                  onChange={(e) =>
                                    handleGaugeChange(row.id, 1, "dueDate", e.target.value)
                                  }
                                  placeholder="Due Date"
                                  className="w-full text-xs border-0 focus-visible:ring-0"
                                />
                              </td>
                            </tr>
                          </Fragment>
                        ))}
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

            {/* Remarks Section */}
            <Card>
              <CardHeader>
                <CardTitle>Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {remarks.map((remark) => (
                    <div key={remark.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Remark:</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeRemark(remark.id)}
                          disabled={remarks.length === 1 || !remark.editable}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Textarea
                        value={remark.text}
                        onChange={(e) => updateRemark(remark.id, e.target.value)}
                        disabled={!remark.editable}
                        className="min-h-[100px]"
                        placeholder="Enter remark"
                      />
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
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default HydroPresText
