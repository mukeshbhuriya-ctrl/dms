import { useState, useEffect } from "react"
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
  CardDescription,
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
import { Plus, X, Copy } from "lucide-react"

function WeldingJoints() {
  const [formData, setFormData] = useState({
    weldPlanNo: "SHR/job1/WTP/1",
    jobNo: "",
    tagId: "",
    projectId: "",
    clientName: "",
    equipmentName: "",
    shrDrgNo: "",
    customerDrgNumber: "",
    codeOfConstruction: "",
  })
  const [tableRows, setTableRows] = useState([
    {
      id: 1,
      jointNo: "",
      jointType: "",
      joint: "",
      baseMetalThicknessPart1: "",
      baseMetalThicknessPart2: "",
      baseMetalSpecPart1: "",
      baseMetalSpecPart2: "",
      consumable: "",
      wpsNoPqrNo: "",
      process: "",
      impactTest: "",
      backChipReq: "",
      pwht: "",
      rt: "",
      pt: "",
      remarks: "",
    },
  ])
  const [isLoading, setIsLoading] = useState(false)

  const [jobs, setJobs] = useState([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Fetch jobs from API
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"

        // Get auth token
        const authData = localStorage.getItem("user_auth")
        let token = null
        if (authData) {
          try {
            const parsed = JSON.parse(authData)
            token = parsed?.payload?.token || parsed?.token
          } catch {
            // If parsing fails, continue without token
          }
        }

        const headers = {
          "Content-Type": "application/json",
        }
        if (token) {
          headers["Authorization"] = `Bearer ${token}`
        }

        const res = await fetch(`${backendUrl}/api/wpj/get-job-info`, {
          method: "GET",
          headers,
          credentials: "include",
        })

        const contentType = res.headers.get("content-type") || ""
        const payload = contentType.includes("application/json")
          ? await res.json()
          : await res.text()

        if (res.ok) {
          setJobs(payload?.data || [])
        } else {
          console.error("Failed to fetch jobs", payload)
          setError("Failed to load jobs")
        }
      } catch (err) {
        console.error("Error fetching jobs:", err)
        setError("Failed to load jobs")
      }
    }

    fetchJobs()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleJobChange = (jobNo) => {
    const selectedJob = jobs.find((job) => job.job_number === jobNo)
    setFormData((prev) => ({
      ...prev,
      jobNo,
      tagId: selectedJob?.tag_number || "",
      projectId: selectedJob?.project_id || "",
      clientName: selectedJob?.customer?.customer_name || "",
      equipmentName: selectedJob?.equipement_name || "",
      weldPlanNo: selectedJob?.next_weld_plan_no || prev.weldPlanNo, // Auto-fill with dynamic plan no
    }))
  }

  const handleTableRowChange = (id, field, value) => {
    setTableRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: value }

          // Clear Back Chip Req, PWHT, PT, RT if jointType is not A or B
          if (field === "jointType") {
            if (value !== "A" && value !== "B") {
              updatedRow.backChipReq = ""
              updatedRow.pwht = ""
              updatedRow.pt = ""
              updatedRow.rt = ""
            }
          }

          return updatedRow
        }
        return row
      })
    )
  }

  const addTableRow = () => {
    const newId = Math.max(...tableRows.map((r) => r.id), 0) + 1
    setTableRows((prev) => [
      ...prev,
      {
        id: newId,
        jointNo: "",
        jointType: "",
        joint: "",
        baseMetalThicknessPart1: "",
        baseMetalThicknessPart2: "",
        baseMetalSpecPart1: "",
        baseMetalSpecPart2: "",
        consumable: "",
        wpsNoPqrNo: "",
        process: "",
        impactTest: "",
        backChipReq: "",
        pwht: "",
        rt: "",
        pt: "",
        remarks: "",
      },
    ])
  }

  const removeTableRow = (id) => {
    if (tableRows.length > 1) {
      setTableRows((prev) => prev.filter((row) => row.id !== id))
    }
  }

  const duplicateTableRow = (id) => {
    const rowToDuplicate = tableRows.find((row) => row.id === id)
    if (rowToDuplicate) {
      const newId = Math.max(...tableRows.map((r) => r.id), 0) + 1
      setTableRows((prev) => [
        ...prev,
        {
          ...rowToDuplicate,
          id: newId,
          jointNo: "", // Blank joint no for duplicated row
        },
      ])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"

      const authData = localStorage.getItem("user_auth")
      let token = null
      if (authData) {
        try {
          const parsed = JSON.parse(authData)
          token = parsed?.payload?.token || parsed?.token
        } catch { }
      }

      const res = await fetch(`${backendUrl}/api/wpj/create-weld-joint-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          ...formData,
          tableRows
        }),
        credentials: "include"
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess("Welding Joint Plan created successfully!")
        handleReset()
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(data.message || "Failed to create plan")
        console.error("Submission failed:", data)
      }

    } catch (err) {
      console.error("Error submitting form:", err)
      setError("An error occurred during submission")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setFormData({
      weldPlanNo: "SHR/job1/WTP/1",
      jobNo: "",
      tagId: "",
      projectId: "",
      clientName: "",
      equipmentName: "",
      shrDrgNo: "",
      customerDrgNumber: "",
      codeOfConstruction: "",
    })
    setTableRows([
      {
        id: 1,
        jointNo: "",
        jointType: "",
        joint: "",
        baseMetalThicknessPart1: "",
        baseMetalThicknessPart2: "",
        baseMetalSpecPart1: "",
        baseMetalSpecPart2: "",
        consumable: "",
        wpsNoPqrNo: "",
        process: "",
        impactTest: "",
        backChipReq: "",
        pwht: "",
        rt: "",
        pt: "",
        remarks: "",
      },
    ])
    setIsLoading(false)
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto w-full overflow-x-hidden">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Create Welding Joints</h1>
              <p className="text-muted-foreground">
                Fill in the details to create a new Welding Joints plan.
              </p>
            </div>

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

            <form onSubmit={handleSubmit}>
              <div className="grid gap-6 w-full">
                {/* First Section: Job Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Job Information</CardTitle>
                    <CardDescription>
                      Select the job to auto-fill core details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="weldPlanNo">
                        Weld Plan No. <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="weldPlanNo"
                        name="weldPlanNo"
                        type="text"
                        placeholder="Enter weld plan number"
                        value={formData.weldPlanNo}
                        disabled={true}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jobNo">
                        Job No <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.jobNo}
                        onValueChange={handleJobChange}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select job number" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobs.map((job) => (
                            <SelectItem key={job.id} value={job.job_number}>
                              {job.job_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tagId">Tag ID</Label>
                      <Input
                        id="tagId"
                        name="tagId"
                        type="text"
                        placeholder="Auto-filled tag ID"
                        value={formData.tagId}
                        readOnly
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="projectId">Project ID</Label>
                      <Input
                        id="projectId"
                        name="projectId"
                        type="text"
                        placeholder="Auto-filled project ID"
                        value={formData.projectId}
                        readOnly
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientName">Client Name</Label>
                      <Input
                        id="clientName"
                        name="clientName"
                        type="text"
                        placeholder="Auto-filled client name"
                        value={formData.clientName}
                        readOnly
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="equipmentName">
                        EQUIPMENT NAME{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="equipmentName"
                        name="equipmentName"
                        type="text"
                        placeholder="Auto-filled equipment name"
                        value={formData.equipmentName}
                        readOnly
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Second Section: Drawing Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Drawing Information</CardTitle>
                    <CardDescription>
                      Enter drawing and construction details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shrDrgNo">
                        SHRENO DRG. NO.{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="shrDrgNo"
                        name="shrDrgNo"
                        type="text"
                        placeholder="Enter SHRENO drawing number"
                        value={formData.shrDrgNo}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerDrgNumber">
                        Customer DRG. NO.
                      </Label>
                      <Input
                        id="customerDrgNumber"
                        name="customerDrgNumber"
                        type="text"
                        placeholder="Enter customer drawing number (optional)"
                        value={formData.customerDrgNumber}
                        onChange={handleInputChange}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="codeOfConstruction">
                        CODE OF CONSTRUCTION{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="codeOfConstruction"
                        name="codeOfConstruction"
                        type="text"
                        placeholder="Enter code of construction"
                        value={formData.codeOfConstruction}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Third Section: Joint Details Table */}
                <Card className="w-full overflow-hidden">
                  <CardHeader>
                    <CardTitle>Joint Details</CardTitle>
                    <CardDescription>
                      Add joint details for the welding plan
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 flex flex-col gap-4 w-full">
                    <div className="rounded-md border overflow-y-auto max-h-[500px]">
                      <Table className="min-w-[1400px]">
                        <TableHeader>
                          {/* First row: Main headers with merged cells */}
                          <TableRow>
                            <TableHead
                              rowSpan={2}
                              className="w-[50px] align-middle"
                            >
                              S.No
                            </TableHead>
                            <TableHead
                              rowSpan={2}
                              className="sticky left-0 z-20 w-[110px] min-w-[110px] bg-background"
                            >
                              Joint No
                            </TableHead>
                            <TableHead rowSpan={2}>Joint Category</TableHead>
                            <TableHead rowSpan={2}>Joint</TableHead>
                            <TableHead
                              colSpan={2}
                              className="text-center border-x"
                            >
                              Base-Metal Thickness mm
                            </TableHead>
                            <TableHead
                              colSpan={2}
                              className="text-center border-x"
                            >
                              Base Metal Specification
                            </TableHead>
                            <TableHead rowSpan={2}>Consumable</TableHead>
                            <TableHead rowSpan={2}>WPS No/PQR No</TableHead>
                            <TableHead rowSpan={2}>Process</TableHead>
                            <TableHead rowSpan={2}>Impact Test</TableHead>
                            <TableHead rowSpan={2}>Back Chip Req</TableHead>
                            <TableHead rowSpan={2}>PWHT</TableHead>
                            <TableHead rowSpan={2}>RT</TableHead>
                            <TableHead rowSpan={2}>PT</TableHead>
                            <TableHead rowSpan={2}>Remarks</TableHead>
                            <TableHead rowSpan={2} className="w-[120px] align-middle">
                              Actions
                            </TableHead>
                          </TableRow>
                          {/* Second row: Sub-headers */}
                          <TableRow>
                            <TableHead className="text-center">
                              Part No. 1
                            </TableHead>
                            <TableHead className="text-center border-r">
                              Part No. 2
                            </TableHead>
                            <TableHead className="text-center">
                              Part No. 1
                            </TableHead>
                            <TableHead className="text-center border-r">
                              Part No. 2
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tableRows.length > 0 ? (
                            tableRows.map((row, index) => (
                              <TableRow key={row.id}>
                                <TableCell className="font-medium">
                                  {index + 1}
                                </TableCell>
                                <TableCell className="sticky left-0 z-20 w-[110px] min-w-[110px] bg-background">
                                  <Input
                                    placeholder="Joint No"
                                    value={row.jointNo}
                                    onChange={(e) =>
                                      handleTableRowChange(
                                        row.id,
                                        "jointNo",
                                        e.target.value
                                      )
                                    }
                                    disabled={isLoading}
                                    className="w-[90px] min-w-[90px]"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={row.jointType}
                                    onValueChange={(value) =>
                                      handleTableRowChange(row.id, "jointType", value)
                                    }
                                    disabled={isLoading}
                                  >
                                    <SelectTrigger className="w-[110px] min-w-[110px]">
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="A">A</SelectItem>
                                      <SelectItem value="B">B</SelectItem>
                                      <SelectItem value="C">C</SelectItem>
                                      <SelectItem value="D">D</SelectItem>
                                      <SelectItem value="F">F</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    placeholder="Joint"
                                    value={row.joint}
                                    onChange={(e) =>
                                      handleTableRowChange(
                                        row.id,
                                        "joint",
                                        e.target.value
                                      )
                                    }
                                    disabled={isLoading}
                                    className="w-[90px] min-w-[90px]"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    placeholder="Thickness Part 1"
                                    value={row.baseMetalThicknessPart1}
                                    onChange={(e) =>
                                      handleTableRowChange(
                                        row.id,
                                        "baseMetalThicknessPart1",
                                        e.target.value
                                      )
                                    }
                                    disabled={isLoading}
                                    className="w-[110px] min-w-[110px]"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    placeholder="Thickness Part 2"
                                    value={row.baseMetalThicknessPart2}
                                    onChange={(e) =>
                                      handleTableRowChange(
                                        row.id,
                                        "baseMetalThicknessPart2",
                                        e.target.value
                                      )
                                    }
                                    disabled={isLoading}
                                    className="w-[110px] min-w-[110px]"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    placeholder="Spec Part 1"
                                    value={row.baseMetalSpecPart1}
                                    onChange={(e) =>
                                      handleTableRowChange(
                                        row.id,
                                        "baseMetalSpecPart1",
                                        e.target.value
                                      )
                                    }
                                    disabled={isLoading}
                                    className="w-[130px] min-w-[130px]"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    placeholder="Spec Part 2"
                                    value={row.baseMetalSpecPart2}
                                    onChange={(e) =>
                                      handleTableRowChange(
                                        row.id,
                                        "baseMetalSpecPart2",
                                        e.target.value
                                      )
                                    }
                                    disabled={isLoading}
                                    className="w-[130px] min-w-[130px]"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    placeholder="Consumable"
                                    value={row.consumable}
                                    onChange={(e) =>
                                      handleTableRowChange(
                                        row.id,
                                        "consumable",
                                        e.target.value
                                      )
                                    }
                                    disabled={isLoading}
                                    className="w-[110px] min-w-[110px]"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    placeholder="WPS No/PQR No"
                                    value={row.wpsNoPqrNo}
                                    onChange={(e) =>
                                      handleTableRowChange(
                                        row.id,
                                        "wpsNoPqrNo",
                                        e.target.value
                                      )
                                    }
                                    disabled={isLoading}
                                    className="w-[110px] min-w-[110px]"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    placeholder="Process"
                                    value={row.process}
                                    onChange={(e) =>
                                      handleTableRowChange(
                                        row.id,
                                        "process",
                                        e.target.value
                                      )
                                    }
                                    disabled={isLoading}
                                    className="w-[90px] min-w-[90px]"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    placeholder="Impact Test"
                                    value={row.impactTest}
                                    onChange={(e) =>
                                      handleTableRowChange(
                                        row.id,
                                        "impactTest",
                                        e.target.value
                                      )
                                    }
                                    disabled={isLoading}
                                    className="w-[90px] min-w-[90px]"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={row.backChipReq}
                                    onValueChange={(value) =>
                                      handleTableRowChange(row.id, "backChipReq", value)
                                    }
                                    disabled={isLoading || (row.jointType !== "A" && row.jointType !== "B")}
                                  >
                                    <SelectTrigger className="w-[70px] min-w-[70px]">
                                      <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="yes">Yes</SelectItem>
                                      <SelectItem value="no">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={row.pwht}
                                    onValueChange={(value) =>
                                      handleTableRowChange(row.id, "pwht", value)
                                    }
                                    disabled={isLoading || (row.jointType !== "A" && row.jointType !== "B")}
                                  >
                                    <SelectTrigger className="w-[70px] min-w-[70px]">
                                      <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="yes">Yes</SelectItem>
                                      <SelectItem value="no">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={row.rt}
                                    onValueChange={(value) =>
                                      handleTableRowChange(row.id, "rt", value)
                                    }
                                    disabled={isLoading || (row.jointType !== "A" && row.jointType !== "B")}
                                  >
                                    <SelectTrigger className="w-[70px] min-w-[70px]">
                                      <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="yes">Yes</SelectItem>
                                      <SelectItem value="no">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={row.pt}
                                    onValueChange={(value) =>
                                      handleTableRowChange(row.id, "pt", value)
                                    }
                                    disabled={isLoading || (row.jointType !== "A" && row.jointType !== "B")}
                                  >
                                    <SelectTrigger className="w-[70px] min-w-[70px]">
                                      <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="yes">Yes</SelectItem>
                                      <SelectItem value="no">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    placeholder="Remarks"
                                    value={row.remarks}
                                    onChange={(e) =>
                                      handleTableRowChange(
                                        row.id,
                                        "remarks",
                                        e.target.value
                                      )
                                    }
                                    disabled={isLoading}
                                    className="w-[120px] min-w-[120px]"
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => duplicateTableRow(row.id)}
                                      disabled={isLoading}
                                      title="Duplicate Row"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeTableRow(row.id)}
                                      disabled={isLoading || tableRows.length === 1}
                                      title="Remove Row"
                                    >
                                      <X className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={17}
                                className="h-24 text-center"
                              >
                                No joint details added.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addTableRow}
                      disabled={isLoading}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Row
                    </Button>
                  </CardContent>
                </Card>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-4 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={isLoading}
                  >
                    Reset
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create Welding Joints"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default WeldingJoints