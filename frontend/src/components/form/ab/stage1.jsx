import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
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

function Stage1({ initialData, isReview = false }) {
  // First section - Display fields (read-only)
  const [displayFields, setDisplayFields] = useState({
    msn: "",
    client: "",
    poNo: "",
  })

  // First section - Input fields
  const [inputFields, setInputFields] = useState({
    reportNo: "",
    tagNo: "",
    equipment: "",
    projectsId: "",
    lindeDrgNo: "",
    drgNo: "",
    code: "",
    inspAgency: "",
  })

  useEffect(() => {
    if (initialData) {
      setDisplayFields({
        msn: initialData.msnNumber || "",
        client: initialData.client || "",
        poNo: initialData.poNo || "",
      })

      // Default load from initialData (root props)
      setInputFields((prev) => ({
        ...prev,
        tagNo: initialData.tagNo || "",
        equipment: initialData.equipment || "",
        projectsId: initialData.projectsId || "",
        lindeDrgNo: initialData.lindeDrgNo || "",
        drgNo: initialData.drgNo || "",
        code: initialData.code || "",
      }))

      // If Stage 1 data exists in inspectionData (e.g., from DB), override default fields
      if (initialData.inspectionData?.s1_data) {
        try {
          const savedData = typeof initialData.inspectionData.s1_data === 'string'
            ? JSON.parse(initialData.inspectionData.s1_data)
            : initialData.inspectionData.s1_data;

          if (savedData?.inputFields) {
            setInputFields(prev => ({
              ...prev,
              ...savedData.inputFields
            }));
          }
          if (savedData?.inspectionRows) {
            setInspectionRows(savedData.inspectionRows);
          }
        } catch (e) {
          console.error("Error parsing s1_data", e);
        }
      }
    }
  }, [initialData])

  // Second section - Fixed rows with predefined names
  const [inspectionRows, setInspectionRows] = useState([
    { id: 1, name: "Material Identification", value: "" },
    { id: 2, name: "Weld joint configuration", value: "" },
    { id: 3, name: "Root Gap", value: "" },
    { id: 4, name: "Root Face", value: "" },
    { id: 5, name: 'Degree for "V"', value: "" },
    { id: 6, name: "Offset", value: "" },
    { id: 7, name: "Alignment", value: "" },
    { id: 8, name: "Weld edge Visual", value: "" },
    { id: 9, name: "Length of the Shell", value: "" },
    { id: 10, name: "Outside circumference", value: "" },
    { id: 11, name: "Inside Gauge / Template", value: "" },
    { id: 12, name: "Verification", value: "" },
    { id: 13, name: "Outside Gauge /Template", value: "" },
    { id: 14, name: "verification (if Applicable)", value: "" },
    { id: 15, name: "Tack Welder Number", value: "" },
  ])

  // Third section
  const [productionEngineerName, setProductionEngineerName] = useState("")
  const [todayDate] = useState(new Date().toLocaleDateString())
  const [qeEngineer, setQeEngineer] = useState("")

  useEffect(() => {
    const authData = localStorage.getItem("user_auth")
    if (authData) {
      try {
        const parsed = JSON.parse(authData)
        const user = parsed?.payload?.user || parsed?.user
        if (user?.name) {
          setProductionEngineerName(user.name)
        }
      } catch (e) {
        console.error("Error parsing auth data", e)
      }
    }
  }, [])

  // Mock QE Engineers data
  const [qeEngineers, setQeEngineers] = useState([])

  useEffect(() => {
    const fetchQeEngineers = async () => {
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

        const res = await fetch(`${backendUrl}/api/users/by-role/QC_ENGINEER`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
          },
          credentials: "include",
        })
        const data = await res.json()
        if (res.ok && data.success) {
          setQeEngineers(data.data || [])
        } else {
          console.error("Failed to fetch QE Engineers:", data.message)
        }
      } catch (error) {
        console.error("Error fetching QE Engineers:", error)
      }
    }

    fetchQeEngineers()
  }, [])

  // Handle input field changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setInputFields((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Handle display field changes (if needed)
  const handleDisplayFieldChange = (e) => {
    const { name, value } = e.target
    setDisplayFields((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Handle inspection row changes (only value can be changed, name is fixed)
  const handleInspectionRowChange = (id, value) => {
    setInspectionRows(
      inspectionRows.map((row) =>
        row.id === id ? { ...row, value: value } : row
      )
    )
  }

  // Handle submission
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
      const authData = localStorage.getItem("user_auth")
      let token = null
      let userId = null;
      let role = 'PROD';

      if (authData) {
        const parsed = JSON.parse(authData)
        token = parsed?.payload?.token || parsed?.token
        userId = parsed?.payload?.user?.id || parsed?.user?.id
      }

      if (!qeEngineer) {
        alert("Please select QE Engineer");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        jointId: initialData?.id,
        stage: "stage1",
        status: "pending",
        engineerId: userId,
        role: role,
        data: {
          inputFields,
          inspectionRows,
          assignedQcEngineerId: qeEngineer
        }
      }

      const res = await fetch(`${backendUrl}/api/wpj/update-stage-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const data = await res.json();
      if (res.ok) {
        alert("Stage 1 submitted successfully");
        window.location.reload();
      } else {
        alert(data.message || "Submission failed");
      }

    } catch (error) {
      console.error(error);
      alert("Error submitting form");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleReviewAction = async (status) => {
    setIsSubmitting(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
      const authData = localStorage.getItem("user_auth")
      let token = null
      let userId = null;
      const role = 'QC'; // Assuming QC/NDT performing review

      if (authData) {
        const parsed = JSON.parse(authData)
        token = parsed?.payload?.token || parsed?.token
        userId = parsed?.payload?.user?.id || parsed?.user?.id
      }

      const payload = {
        jointId: initialData?.id,
        stage: "stage1",
        status: status, // 'approved' or 'rejected'
        engineerId: userId,
        role: role,
        data: {} // No data update during review, just status change
      }

      const res = await fetch(`${backendUrl}/api/wpj/update-stage-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Stage 1 ${status} successfully`);
        window.location.reload();
      } else {
        alert(data.message || "Review action failed");
      }
    } catch (error) {
      console.error(error);
      alert("Error processing review");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full mx-auto p-6 space-y-6">
      {/* First Section */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Display Fields (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="msn">MSN:</Label>
              <Input
                id="msn"
                name="msn"
                type="text"
                value={displayFields.msn}
                onChange={handleDisplayFieldChange}
                placeholder="MSN"
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">CLIENT:</Label>
              <Input
                id="client"
                name="client"
                type="text"
                value={displayFields.client}
                onChange={handleDisplayFieldChange}
                placeholder="CLIENT"
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="poNo">P.O. NO.:</Label>
              <Input
                id="poNo"
                name="poNo"
                type="text"
                value={displayFields.poNo}
                onChange={handleDisplayFieldChange}
                placeholder="P.O. NO."
                readOnly
                className="bg-muted"
              />
            </div>

            {/* Input Fields */}
            <div className="space-y-2">
              <Label htmlFor="reportNo">Report No:</Label>
              <Input
                id="reportNo"
                name="reportNo"
                type="text"
                value={inputFields.reportNo}
                onChange={handleInputChange}
                placeholder="Enter Report No"
                readOnly={isReview}
                className={isReview ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagNo">TAG NO.:</Label>
              <Input
                id="tagNo"
                name="tagNo"
                type="text"
                value={inputFields.tagNo}
                onChange={handleInputChange}
                placeholder="Enter TAG NO."
                readOnly={isReview}
                className={isReview ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment">EQUIPMENT:</Label>
              <Input
                id="equipment"
                name="equipment"
                type="text"
                value={inputFields.equipment}
                onChange={handleInputChange}
                placeholder="Enter EQUIPMENT"
                readOnly={isReview}
                className={isReview ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectsId">Projects ID:</Label>
              <Input
                id="projectsId"
                name="projectsId"
                type="text"
                value={inputFields.projectsId}
                onChange={handleInputChange}
                placeholder="Enter Projects ID"
                readOnly={isReview}
                className={isReview ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lindeDrgNo">Linde DRG No:</Label>
              <Input
                id="lindeDrgNo"
                name="lindeDrgNo"
                type="text"
                value={inputFields.lindeDrgNo}
                onChange={handleInputChange}
                placeholder="Enter Linde DRG No"
                readOnly={isReview}
                className={isReview ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="drgNo">DRG. NO.:</Label>
              <Input
                id="drgNo"
                name="drgNo"
                type="text"
                value={inputFields.drgNo}
                onChange={handleInputChange}
                placeholder="Enter DRG. NO."
                readOnly={isReview}
                className={isReview ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">CODE:</Label>
              <Input
                id="code"
                name="code"
                type="text"
                value={inputFields.code}
                onChange={handleInputChange}
                placeholder="Enter CODE"
                readOnly={isReview}
                className={isReview ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspAgency">INSP. AGENCY:</Label>
              <Input
                id="inspAgency"
                name="inspAgency"
                type="text"
                value={inputFields.inspAgency}
                onChange={handleInputChange}
                placeholder="Enter INSP. AGENCY"
                readOnly={isReview}
                className={isReview ? "bg-muted" : ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Second Section */}
      <Card>
        <CardHeader>
          <CardTitle>LONG SEAM / CIRCUMFERENCE SEAM INSPECTION REPORT</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Name</th>
                    <th className="text-left p-2 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectionRows.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="p-2">
                        <Input
                          type="text"
                          value={row.name}
                          readOnly
                          className="bg-muted w-full"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="text"
                          value={row.value}
                          onChange={(e) =>
                            handleInspectionRowChange(row.id, e.target.value)
                          }
                          placeholder="Enter value"
                          className={`w-full ${isReview ? "bg-muted" : ""}`}
                          readOnly={isReview}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Third Section */}
      <Card>
        <CardHeader>
          <CardTitle>Set Up Inspection by</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Production Engineer Name:</Label>
              <Input
                type="text"
                value={productionEngineerName}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>Date:</Label>
              <Input
                type="text"
                value={todayDate}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qeEngineer">QE Engineer:</Label>
              <Select value={qeEngineer} onValueChange={setQeEngineer} disabled={isReview}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select QE Engineer" />
                </SelectTrigger>
                <SelectContent>
                  {qeEngineers.map((engineer) => (
                    <SelectItem key={engineer.id} value={engineer.id}>
                      {engineer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            {!isReview ? (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save & Complete Stage 1"}
              </Button>
            ) : (
              <>
                <Button onClick={() => handleReviewAction('rejected')} variant="outline" disabled={isSubmitting}>
                  {isSubmitting ? "Processing..." : "Reject"}
                </Button>
                <Button onClick={() => handleReviewAction('approved')} className="bg-black hover:bg-gray-800 text-white" disabled={isSubmitting}>
                  {isSubmitting ? "Processing..." : "Approve"}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Stage1
