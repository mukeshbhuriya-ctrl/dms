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
  const [productionEngineerName, setProductionEngineerName] = useState("")
  const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString())
  const [backChipQcEngineer, setBackChipQcEngineer] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [userRole, setUserRole] = useState("")

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
    lindeDrgNo: "", // storing CLIENT DRG here
    drgNo: "",      // storing SHRENO DRG NO here
    code: "",
    inspAgency: "",
  })

  useEffect(() => {
    const authData = localStorage.getItem("user_auth")
    if (authData) {
      try {
        const parsed = JSON.parse(authData)
        const user = parsed?.payload?.user || parsed?.user
        if (user?.name) {
          if (!isReview) setProductionEngineerName(user.name)
        }
        // Extract role for QC check
        const roles = parsed?.payload?.roles || parsed?.payload?.user?.roles || []
        const roleNames = roles.map(r => (typeof r === 'object' && r.name) ? r.name : r);
        if (roleNames.some(r => ['QC_ENGINEER', 'NDT_ENGINEER'].includes(r))) {
          setUserRole('QC')
        } else {
          setUserRole('PROD')
        }
      } catch (e) {
        console.error("Error parsing auth data", e)
      }
    }
  }, [isReview])

  // Populate Basic Info
  useEffect(() => {
    if (initialData) {
      setDisplayFields({
        msn: initialData.msnNumber || "",
        client: initialData.client || "",
        poNo: initialData.poNo || "",
      })

      // Auto-generate Report No logic (Placeholder pattern)
      const generatedReportNo = `R/${initialData.msnNumber || '000'}/${initialData.jointNo}/${stage.replace('stage', '')}`;

      setInputFields((prev) => ({
        ...prev,
        reportNo: prev.reportNo || generatedReportNo, // Only set if empty? Or overwrite? User said "auto generate and auto fill".
        tagNo: initialData.tagNo || "",
        equipment: initialData.equipment || "",
        projectsId: initialData.projectsId || "",
        lindeDrgNo: initialData.lindeDrgNo || "", // Client DRG
        drgNo: initialData.drgNo || "",       // Shreno DRG
        code: initialData.code || "",
        // inspAgency not in initialData, leave empty or prev
      }))
    }
  }, [initialData, stage])

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

  // Mock QC Engineers data
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

  // Helper to determine category key
  const getCategoryKey = () => {
        return initialData?.jointCategory?.toLowerCase() || initialData?.joint_type?.toLowerCase() || 'a';
    }

  useEffect(() => {
    // autofill data if available in inspectionData
    if (inspectionData) {
      const categoryKey = getCategoryKey();

      // 1. Load Basic Info (from data_json)
      if (inspectionData.data_json) {
        try {
          const rawBasic = typeof inspectionData.data_json === 'string' ? JSON.parse(inspectionData.data_json) : inspectionData.data_json;
          const basicInfo = rawBasic?.[categoryKey] || {};

          setInputFields(prev => ({
            ...prev,
            reportNo: basicInfo.reportNo || prev.reportNo,
            tagNo: basicInfo.tagNo || prev.tagNo,
            equipment: basicInfo.equipment || prev.equipment,
            projectsId: basicInfo.projectsId || prev.projectsId,
            lindeDrgNo: basicInfo.lindeDrgNo || prev.lindeDrgNo,
            drgNo: basicInfo.drgNo || prev.drgNo,
            code: basicInfo.code || prev.code,
            inspAgency: basicInfo.inspAgency || prev.inspAgency,
          }));
        } catch (e) { console.error("Error parsing data_json", e) }
      }

      const stagePrefix = stage === 'stage2' ? 's2' : 's3';

      if (inspectionData[`${stagePrefix}_prod_eng_name`]) {
        setProductionEngineerName(inspectionData[`${stagePrefix}_prod_eng_name`]);
      }

      if (inspectionData[`${stagePrefix}_data`]) {
        try {
          const rawData = typeof inspectionData[`${stagePrefix}_data`] === 'string'
            ? JSON.parse(inspectionData[`${stagePrefix}_data`])
            : inspectionData[`${stagePrefix}_data`];
          
          const savedData = rawData?.[categoryKey]?.[stagePrefix] || rawData?.[categoryKey] || rawData || {};

          if (savedData?.productionEngineerName) setProductionEngineerName(savedData.productionEngineerName);
          if (savedData?.submissionDate) setTodayDate(savedData.submissionDate);

          const isBackChipActive = stage === "stage2" && backChip === true;
          const isWeldVisualActive = (stage === "stage2" && backChip === false) || (stage === "stage3" && backChip === true);

          if (isBackChipActive) {
            if (inspectionData[`${stagePrefix}_qc_eng_id`]) {
              setBackChipQcEngineer(inspectionData[`${stagePrefix}_qc_eng_id`]);
            } else if (savedData?.assignedQcEngineerId) {
              setBackChipQcEngineer(savedData.assignedQcEngineerId);
            }
          }

          if (isWeldVisualActive) {
            if (inspectionData[`${stagePrefix}_welder_no`]) setWelderNo(inspectionData[`${stagePrefix}_welder_no`]);
            else if (savedData?.welderNo) setWelderNo(savedData.welderNo);

            if (inspectionData[`${stagePrefix}_welding_process`]) setWeldingProcess(inspectionData[`${stagePrefix}_welding_process`]);
            else if (savedData?.weldingProcess) setWeldingProcess(savedData.weldingProcess);

            if (inspectionData[`${stagePrefix}_qc_eng_id`]) {
              setWeldVisualQcEngineer(inspectionData[`${stagePrefix}_qc_eng_id`]);
            } else if (savedData?.assignedQcEngineerId) {
              setWeldVisualQcEngineer(savedData.assignedQcEngineerId);
            }
          }

          if (savedData?.inputFields && !inspectionData.data_json) {
            setInputFields(prev => ({ ...prev, ...savedData.inputFields }));
          }
        } catch (e) {
          console.error(`Error parsing ${stagePrefix}_data`, e);
        }
      }
    }
  }, [inspectionData, stage, initialData]);

  // ReadOnly Condition: Review mode AND not QC
  const isReadOnly = isReview && userRole !== 'QC';

  const shouldShowBackChipSection =
    stage === "stage2" && backChip === true
  const shouldShowWeldVisualSection =
    (stage === "stage2" && backChip === false) ||
    (stage === "stage3" && backChip === true)

  const handleSubmit = async () => {
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

      const currentStage = stage; // Dynamic stage2 or stage3
      const categoryKey = getCategoryKey();
      const stagePrefix = currentStage === 'stage2' ? 's2' : 's3';
      const stageKey = `${stagePrefix}_data`;

      let existingData = {};
      if (initialData?.inspectionData?.[stageKey]) {
        existingData = typeof initialData.inspectionData[stageKey] === 'string'
          ? JSON.parse(initialData.inspectionData[stageKey])
          : initialData.inspectionData[stageKey];
      }

      const currentStageData = {
        productionEngineerName,
        submissionDate: todayDate,
      };

      if (shouldShowBackChipSection) {
        if (!backChipQcEngineer) {
          alert("Please select QC Engineer");
          setIsSubmitting(false);
          return;
        }
        currentStageData.assignedQcEngineerId = backChipQcEngineer;
      }

      if (shouldShowWeldVisualSection) {
        if (!weldVisualQcEngineer) {
          alert("Please select QC Engineer for Weld Visual");
          setIsSubmitting(false);
          return;
        }
        currentStageData.welderNo = welderNo;
        currentStageData.weldingProcess = weldingProcess;
        currentStageData.assignedQcEngineerId = weldVisualQcEngineer;
      }

      const finalData = {
        ...existingData,
        [categoryKey]: {
          ...existingData[categoryKey],
          [stagePrefix]: currentStageData
        }
      };

      // Construct Basic Info


      const payload = {
        jointId: initialData?.id,
        stage: currentStage,
        status: "pending",
        engineerId: userId,
        role: role,
        data: finalData
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

  const handleReviewAction = async (status) => {
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

      const currentStage = stage; // Dynamic stage2 or stage3

      if (userRole === 'QC' && status === 'approved') {
        const categoryKey = getCategoryKey();
        const stagePrefix = currentStage === 'stage2' ? 's2' : 's3';
        const stageKey = `${stagePrefix}_data`;

        let existingData = {};
        if (initialData?.inspectionData?.[stageKey]) {
          existingData = typeof initialData.inspectionData[stageKey] === 'string'
            ? JSON.parse(initialData.inspectionData[stageKey])
            : initialData.inspectionData[stageKey];
        }

        const currentStageData = {
          productionEngineerName,
          submissionDate: todayDate,
        };
        
        if (shouldShowBackChipSection) {
          currentStageData.assignedQcEngineerId = backChipQcEngineer;
        }
        if (shouldShowWeldVisualSection) {
          currentStageData.welderNo = welderNo;
          currentStageData.weldingProcess = weldingProcess;
          currentStageData.assignedQcEngineerId = weldVisualQcEngineer;
        }

        const finalData = {
          ...existingData,
          [categoryKey]: {
            ...existingData[categoryKey],
            [stagePrefix]: currentStageData
          }
        };

        await fetch(`${backendUrl}/api/wpj/update-stage-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
          body: JSON.stringify({
            jointId: initialData?.id,
            stage: currentStage,
            status: status,
            engineerId: userId,
            role: 'QC',
            data: finalData
          }),
          credentials: "include",
        });
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
                readOnly
                className="bg-muted"
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
                readOnly
                className="bg-muted"
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
                readOnly
                className="bg-muted"
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
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lindeDrgNo">CLIENT DRG.:</Label>
              <Input
                id="lindeDrgNo"
                name="lindeDrgNo"
                type="text"
                value={inputFields.lindeDrgNo}
                onChange={handleInputChange}
                placeholder="Enter CLIENT DRG."
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="drgNo">SHRENO DRG NO.:</Label>
              <Input
                id="drgNo"
                name="drgNo"
                type="text"
                value={inputFields.drgNo}
                onChange={handleInputChange}
                placeholder="Enter SHRENO DRG NO."
                readOnly
                className="bg-muted"
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
                readOnly
                className="bg-muted"
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
                readOnly
                className="bg-muted"
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
                <Button onClick={() => handleSubmit()} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : `Save & Complete ${stage === 'stage2' ? 'Stage 2' : 'Stage 3'}`}
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
                  readOnly={isReadOnly}
                  className={isReadOnly ? "bg-muted" : ""}
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
                  readOnly={isReadOnly}
                  className={isReadOnly ? "bg-muted" : ""}
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
                <Button onClick={() => handleSubmit()} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : `Save & Complete ${stage === 'stage2' ? 'Stage 2' : 'Stage 3'}`}
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
      )}
    </div>
  )
}

export default Stage2
