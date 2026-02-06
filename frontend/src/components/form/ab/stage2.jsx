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
import { FormAlert } from "@/components/ui/form-alert"


function Stage2({ backChip = false, stage = "stage2", initialData, inspectionData, isReview = false }) {
  // Back chip section
  // Back chip section
  const [productionEngineerName, setProductionEngineerName] = useState("")
  const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString())
  const [backChipQcEngineer, setBackChipQcEngineer] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Basic Info State
  const [displayFields, setDisplayFields] = useState({
    msn: "",
    client: "",
    poNo: "",
  })

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
    if (isReview) return;
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

  // Populate Basic Info
  useEffect(() => {
    if (initialData) {
      setDisplayFields({
        msn: initialData.msnNumber || "",
        client: initialData.client || "",
        poNo: initialData.poNo || "",
      })

      setInputFields((prev) => ({
        ...prev,
        tagNo: initialData.tagNo || "",
        equipment: initialData.equipment || "",
        projectsId: initialData.projectsId || "",
        lindeDrgNo: initialData.lindeDrgNo || "",
        drgNo: initialData.drgNo || "",
        code: initialData.code || "",
      }))
    }
  }, [initialData])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setInputFields((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleDisplayFieldChange = (e) => {
    const { name, value } = e.target
    setDisplayFields((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Weld Visual Inspection section
  const [weldVisualQcEngineer, setWeldVisualQcEngineer] = useState("")
  const [welderNo, setWelderNo] = useState("")
  const [weldingProcess, setWeldingProcess] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Mock QC Engineers data - In real app, fetch this or pass as prop
  const [qcEngineers, setQcEngineers] = useState([])

  useEffect(() => {
    const fetchQcEngineers = async () => {
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
          setQcEngineers(data.data || [])
        } else {
          console.error("Failed to fetch QC Engineers:", data.message)
        }
      } catch (error) {
        console.error("Error fetching QC Engineers:", error)
      }
    }

    fetchQcEngineers()
  }, [])

  useEffect(() => {
    // autofill data if available in inspectionData
    if (inspectionData) {
      if (stage === 'stage2') {
        // Prioritize column data for QC, fallback to parsed data later if needed
        if (inspectionData.s2_qc_eng_id) {
          setBackChipQcEngineer(inspectionData.s2_qc_eng_id);
        }
        // Pre-fill Prod Name from injected data
        if (inspectionData.s2_prod_eng_name) {
          setProductionEngineerName(inspectionData.s2_prod_eng_name);
        }

        if (inspectionData.s2_data) {
          try {
            const s2Data = typeof inspectionData.s2_data === 'string' ? JSON.parse(inspectionData.s2_data) : inspectionData.s2_data;
            if (s2Data?.productionEngineerName) setProductionEngineerName(s2Data.productionEngineerName);
            if (s2Data?.submissionDate) setTodayDate(s2Data.submissionDate);
            // Fallback for QC ID if column data was missing
            if (!inspectionData.s2_qc_eng_id && s2Data?.assignedQcEngineerId) {
              setBackChipQcEngineer(s2Data.assignedQcEngineerId);
            }
          } catch (e) { console.error("Error parsing s2_data", e) }
        }
      }

      if (stage === 'stage3') {
        if (inspectionData.s3_qc_eng_id) setWeldVisualQcEngineer(inspectionData.s3_qc_eng_id);
        // Pre-fill Prod Name from injected data
        if (inspectionData.s3_prod_eng_name) {
          setProductionEngineerName(inspectionData.s3_prod_eng_name);
        }

        let loadedWelderNo = inspectionData.s3_welder_no || "";
        let loadedWeldingProcess = inspectionData.s3_welding_process || "";

        if (inspectionData.s3_data) {
          try {
            const savedData = typeof inspectionData.s3_data === 'string'
              ? JSON.parse(inspectionData.s3_data)
              : inspectionData.s3_data;
            if (savedData?.welderNo) {
              loadedWelderNo = savedData.welderNo;
            }
            if (savedData?.weldingProcess) {
              loadedWeldingProcess = savedData.weldingProcess;
            }
            if (savedData?.productionEngineerName) setProductionEngineerName(savedData.productionEngineerName);
            if (savedData?.submissionDate) setTodayDate(savedData.submissionDate);

            if (!inspectionData.s3_qc_eng_id && savedData?.assignedQcEngineerId) {
              setWeldVisualQcEngineer(savedData.assignedQcEngineerId);
            }
          } catch (e) {
            console.error("Error parsing s3_data", e);
          }
        }

        if (loadedWelderNo) setWelderNo(loadedWelderNo);
        if (loadedWeldingProcess) setWeldingProcess(loadedWeldingProcess);
      }
    }
  }, [inspectionData, stage]);

  // For stage3 with backChip: true, show Weld Visual Inspection section only
  // For stage2: backChip: true shows Back chip, backChip: false shows Weld Visual Inspection
  const shouldShowBackChipSection =
    stage === "stage2" && backChip === true
  const shouldShowWeldVisualSection =
    (stage === "stage2" && backChip === false) ||
    (stage === "stage3" && backChip === true)

  const handleSubmit = async (currentStage) => {
    setIsSubmitting(true);
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

      const payload = {
        jointId: initialData?.id,
        stage: currentStage,
        status: "pending",
        engineerId: userId,
        role: role,
        role: role,
        data: {
          inputFields
        }
      }

      if (currentStage === 'stage2') {
        if (!backChipQcEngineer) {
          alert("Please select QC Engineer");
          setIsSubmitting(false);
          return;
        }
        payload.data = {
          assignedQcEngineerId: backChipQcEngineer,
          productionEngineerName: productionEngineerName,
          submissionDate: todayDate
        };
      }

      if (currentStage === 'stage3') {
        payload.data = {
          welderNo,
          weldingProcess,
          assignedQcEngineerId: weldVisualQcEngineer,
          productionEngineerName: productionEngineerName,
          submissionDate: todayDate
        };
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
        setSuccess(`${currentStage} submitted successfully`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setError(data.message || "Submission failed");
      }

    } catch (error) {
      console.error(error);
      setError("Error submitting form");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleReviewAction = async (status, currentStage) => {
    setIsSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
      const authData = localStorage.getItem("user_auth")
      let token = null
      let userId = null;
      const role = 'QC';

      if (authData) {
        const parsed = JSON.parse(authData)
        token = parsed?.payload?.token || parsed?.token
        userId = parsed?.payload?.user?.id || parsed?.user?.id
      }

      const payload = {
        jointId: initialData?.id,
        stage: currentStage,
        status: status,
        engineerId: userId,
        role: role
      }

      const res = await fetch(`${backendUrl}/api/wpj/review-stage`, {
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
        setSuccess(`${currentStage} ${status} successfully`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setError(data.message || "Review action failed");
      }
    } catch (error) {
      console.error(error);
      setError("Error processing review");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full mx-auto p-6 space-y-6">
      {/* Basic Information Section */}
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
      {/* Section 1: Back chip - Only show for stage2 with backChip = true */}
      {shouldShowBackChipSection && (
        <Card>
          <CardHeader>
            <CardTitle>
              Back chip{" "}
              {backChip && (
                <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                  Yes
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Production Engineer Name:</Label>
                <Input
                  type="text"
                  value={productionEngineerName}
                  readOnly
                  className="bg-muted uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label>Date:</Label>
                <Input
                  type="text"
                  value={initialData?.inspectionData?.s2_submitted_at ? new Date(initialData.inspectionData.s2_submitted_at).toLocaleDateString() : todayDate}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="backChipQcEngineer">QC Engineer Name:</Label>
                <Select
                  value={backChipQcEngineer}
                  onValueChange={setBackChipQcEngineer}
                  disabled={isReview}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select QC Engineer" />
                  </SelectTrigger>
                  <SelectContent>
                    {qcEngineers.map((engineer) => (
                      <SelectItem key={engineer.id} value={engineer.id}>
                        {engineer.name?.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2 items-center">
              {!isReview ? (
                <Button onClick={() => handleSubmit('stage2')} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save & Complete Stage 2"}
                </Button>
              ) : (
                <>
                  {(isReview || initialData?.inspectionData?.s2_approved_at) && (
                    <Input
                      type="text"
                      value={`Approve Date: ${initialData?.inspectionData?.s2_approved_at ? new Date(initialData.inspectionData.s2_approved_at).toLocaleDateString() : new Date().toLocaleDateString()}`}
                      readOnly
                      className="bg-muted w-auto min-w-[200px] text-center h-9 font-medium"
                      placeholder="Approve Date"
                    />
                  )}
                  <Button onClick={() => handleReviewAction('rejected', 'stage2')} variant="outline" disabled={isSubmitting}>
                    {isSubmitting ? "Processing..." : "Reject"}
                  </Button>
                  <Button onClick={() => handleReviewAction('approved', 'stage2')} className="bg-black hover:bg-gray-800 text-white" disabled={isSubmitting}>
                    {isSubmitting ? "Processing..." : "Approve"}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 2: Weld Visual Inspection by - Show for stage2 with backChip = false OR stage3 with backChip = true */}
      {shouldShowWeldVisualSection && (
        <Card>
          <CardHeader>
            <CardTitle>Weld Visual Inspection by</CardTitle>
          </CardHeader>
          <CardContent>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="welderNo">Welder No.:</Label>
                <Input
                  id="welderNo"
                  type="text"
                  value={welderNo}
                  onChange={(e) => setWelderNo(e.target.value)}
                  placeholder="Enter Welder No."
                  readOnly={isReview}
                  className={isReview ? "bg-muted" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weldingProcess">Welding Process:</Label>
                <Input
                  id="weldingProcess"
                  type="text"
                  value={weldingProcess}
                  onChange={(e) => setWeldingProcess(e.target.value)}
                  placeholder="Enter Welding Process"
                  readOnly={isReview}
                  className={isReview ? "bg-muted" : ""}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Production Engineer Name:</Label>
                <Input
                  type="text"
                  value={productionEngineerName}
                  readOnly
                  className="bg-muted uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label>Date:</Label>
                <Input
                  type="text"
                  value={initialData?.inspectionData?.s3_submitted_at ? new Date(initialData.inspectionData.s3_submitted_at).toLocaleDateString() : todayDate}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weldVisualQcEngineer">QC Engineer Name:</Label>
                <Select
                  value={weldVisualQcEngineer}
                  onValueChange={setWeldVisualQcEngineer}
                  disabled={isReview}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select QC Engineer" />
                  </SelectTrigger>
                  <SelectContent>
                    {qcEngineers.map((engineer) => (
                      <SelectItem key={engineer.id} value={engineer.id}>
                        {engineer.name?.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2 items-center">
              {!isReview ? (
                <Button onClick={() => handleSubmit('stage3')} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save & Complete Stage 3"}
                </Button>
              ) : (
                <>
                  {(isReview || initialData?.inspectionData?.s3_approved_at) && (
                    <Input
                      type="text"
                      value={`Approve Date: ${initialData?.inspectionData?.s3_approved_at ? new Date(initialData.inspectionData.s3_approved_at).toLocaleDateString() : new Date().toLocaleDateString()}`}
                      readOnly
                      className="bg-muted w-auto min-w-[200px] text-center h-9 font-medium"
                      placeholder="Approve Date"
                    />
                  )}
                  <Button onClick={() => handleReviewAction('rejected', 'stage3')} variant="outline" disabled={isSubmitting}>
                    {isSubmitting ? "Processing..." : "Reject"}
                  </Button>
                  <Button onClick={() => handleReviewAction('approved', 'stage3')} className="bg-black hover:bg-gray-800 text-white" disabled={isSubmitting}>
                    {isSubmitting ? "Processing..." : "Approve"}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Stage2
