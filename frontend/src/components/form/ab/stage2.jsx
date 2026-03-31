import React, { useState, useEffect } from "react"
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

function Stage2({ initialData, isReview = false, stage = "stage2" }) {
  const [productionEngineerName, setProductionEngineerName] = useState("")
  const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString())
  const [backChipQcEngineer, setBackChipQcEngineer] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userRole, setUserRole] = useState("")
  const [qcEngineers, setQcEngineers] = useState([])

  const [alert, setAlert] = useState({ show: false, type: 'success', message: '' })
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

  const sPrefix = stage.replace('stage', 's');

  useEffect(() => {
    const authData = localStorage.getItem("user_auth")
    if (authData) {
      try {
        const parsed = JSON.parse(authData)
        const user = parsed?.payload?.user || parsed?.user
        if (user?.name) {
          if (!isReview) setProductionEngineerName(user.name)
        }
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

  const getCategoryKey = () => {
    return initialData?.jointCategory?.toLowerCase() || initialData?.joint_type?.toLowerCase() || 'c';
  }

  useEffect(() => {
    if (initialData) {
      setDisplayFields({
        msn: initialData.msnNumber || "",
        client: initialData.client || "",
        poNo: initialData.poNo || "",
      })

      const generatedReportNo = `R/${initialData.msnNumber || '000'}/${initialData.jointNo}/2`;

      setInputFields((prev) => ({
        ...prev,
        reportNo: prev.reportNo || generatedReportNo,
        tagNo: initialData.tagNo || "",
        equipment: initialData.equipment || "",
        projectsId: initialData.projectsId || "",
        lindeDrgNo: initialData.lindeDrgNo || "",
        drgNo: initialData.drgNo || "",
        code: initialData.code || "",
      }))

      if (initialData.inspectionData) {
        const categoryKey = getCategoryKey();
        const inspectionData = initialData.inspectionData;

        if (inspectionData[`${sPrefix}_qc_eng_id`]) {
          setBackChipQcEngineer(inspectionData[`${sPrefix}_qc_eng_id`]);
        }
        if (inspectionData[`${sPrefix}_prod_eng_name`]) {
          setProductionEngineerName(inspectionData[`${sPrefix}_prod_eng_name`]);
        }

        // Load Basic Info (from data_json)
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

        if (inspectionData[`${sPrefix}_data`]) {
          try {
            const rawData = typeof inspectionData[`${sPrefix}_data`] === 'string' ? JSON.parse(inspectionData[`${sPrefix}_data`]) : inspectionData[`${sPrefix}_data`];
            const sbcData = rawData?.[categoryKey]?.[sPrefix] || rawData?.[categoryKey] || rawData || {};

            if (sbcData?.productionEngineerName) setProductionEngineerName(sbcData.productionEngineerName);
            if (sbcData?.submissionDate) setTodayDate(sbcData.submissionDate);
            if (!inspectionData[`${sPrefix}_qc_eng_id`] && sbcData?.assignedQcEngineerId) {
              setBackChipQcEngineer(sbcData.assignedQcEngineerId);
            }
            // Legacy fallback check for inputFields in stage data if data_json missing
            if (sbcData?.inputFields && !inspectionData.data_json) {
              setInputFields(prev => ({ ...prev, ...sbcData.inputFields }));
            }
          } catch (e) { console.error(`Error parsing ${sPrefix}_data`, e) }
        }
      }
    }
  }, [initialData])

  // ReadOnly Condition: Review mode AND not QC
  const isReadOnly = isReview && userRole !== 'QC';

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setAlert({ show: false, type: '', message: '' });
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

      if (!backChipQcEngineer) {
        setAlert({ show: true, type: 'error', message: "Please select QC Engineer" });
        setIsSubmitting(false);
        return;
      }

      const categoryKey = getCategoryKey();

      let existingData = {};
      if (initialData?.inspectionData?.[`${sPrefix}_data`]) {
        existingData = typeof initialData.inspectionData[`${sPrefix}_data`] === 'string'
          ? JSON.parse(initialData.inspectionData[`${sPrefix}_data`])
          : initialData.inspectionData[`${sPrefix}_data`];
      }

      const currentStageData = {
        productionEngineerName,
        submissionDate: todayDate,
        assignedQcEngineerId: backChipQcEngineer
      };

      const finalData = {
        ...existingData,
        [categoryKey]: {
          ...existingData[categoryKey],
          [sPrefix]: currentStageData
        }
      };

      const basicInfo = {
        [categoryKey]: {
          ...displayFields,
          ...inputFields
        }
      };

      const payload = {
        jointId: initialData?.id,
        stage: stage,
        status: "pending",
        engineerId: userId,
        role: role,
        data: finalData,
        basicInfo: basicInfo
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
        setAlert({ show: true, type: 'success', message: "Back Chip submitted successfully" });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setAlert({ show: true, type: 'error', message: data.message || "Submission failed" });
      }

    } catch (error) {
      console.error(error);
      setAlert({ show: true, type: 'error', message: "Error submitting form" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleReviewAction = async (status) => {
    setIsSubmitting(true);
    setAlert({ show: false, type: '', message: '' });
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

      if (userRole === 'QC' && status === 'approved') {
        const categoryKey = getCategoryKey();

        let existingData = {};
        if (initialData?.inspectionData?.[`${sPrefix}_data`]) {
          existingData = typeof initialData.inspectionData[`${sPrefix}_data`] === 'string'
            ? JSON.parse(initialData.inspectionData[`${sPrefix}_data`])
            : initialData.inspectionData[`${sPrefix}_data`];
        }

        const currentStageData = {
          productionEngineerName,
          submissionDate: todayDate,
          assignedQcEngineerId: backChipQcEngineer
        };

        const finalData = {
          ...existingData,
          [categoryKey]: {
            ...existingData[categoryKey],
            [sPrefix]: currentStageData
          }
        };

        const basicInfo = {
          [categoryKey]: {
            ...displayFields,
            ...inputFields
          }
        };

        await fetch(`${backendUrl}/api/wpj/update-stage-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
          body: JSON.stringify({
            jointId: initialData?.id,
            stage: stage,
            status: status,
            engineerId: userId,
            role: 'QC',
            data: finalData,
            basicInfo: basicInfo
          }),
          credentials: "include",
        });
      }

      const payload = {
        jointId: initialData?.id,
        stage: stage,
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
        setAlert({ show: true, type: 'success', message: `Back Chip ${status} successfully` });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setAlert({ show: true, type: 'error', message: data.message || "Review action failed" });
      }
    } catch (error) {
      console.error(error);
      setAlert({ show: true, type: 'error', message: "Error processing review" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full mx-auto p-6 space-y-6">
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
                readOnly={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
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
                readOnly={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
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
                readOnly={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
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
                readOnly={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
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
                readOnly={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
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
                readOnly={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
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
                readOnly={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
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
                readOnly={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-6">
          <FormAlert type={alert.type} message={alert.message} />

          {/* Back chip section */}
          <div className="space-y-6 pt-6 border-t mt-6">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">Back chip</h3>
              {initialData?.back_chip_req && (
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600 ring-1 ring-inset ring-green-600/20">
                  Yes
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Production Engineer Name:</Label>
                <Input
                  type="text"
                  value={productionEngineerName}
                  placeholder="Production Engineer Name"
                  readOnly
                  className="bg-muted uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label>Date:</Label>
                <Input
                  type="text"
                  value={initialData?.inspectionData?.[`${sPrefix}_submitted_at`] ? new Date(initialData.inspectionData[`${sPrefix}_submitted_at`]).toLocaleDateString() : todayDate}
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
          </div>

          <div className="mt-6 flex justify-end gap-2 items-center">
            {!isReview ? (
              <Button onClick={() => handleSubmit()} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : `Save & Complete ${stage.replace('stage', 'Stage ')}`}
              </Button>
            ) : (
              <>
                {(isReview || initialData?.inspectionData?.[`${sPrefix}_approved_at`]) && (
                  <Input
                    type="text"
                    value={`Approve Date: ${initialData?.inspectionData?.[`${sPrefix}_approved_at`] ? new Date(initialData.inspectionData[`${sPrefix}_approved_at`]).toLocaleDateString() : new Date().toLocaleDateString()}`}
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
    </div>
  )
}

export default Stage2;
