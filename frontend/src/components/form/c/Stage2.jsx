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

function Stage2({ initialData, isReview = false, stage = "stage2" , onSuccess }) {
  const [productionEngineerName, setProductionEngineerName] = useState("")
  const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString())
  const [backChipQcEngineer, setBackChipQcEngineer] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userRole, setUserRole] = useState("")
  const [qcEngineers, setQcEngineers] = useState([])
  const [alert, setAlert] = useState({ show: false, type: 'success', message: '' })

  // Although only 3 fields are shown, we keep the state structure for consistent payloads and synchronization with initialData
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
      } catch (e) { console.error(e) }
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
        }
      } catch (error) { console.error(error) }
    }
    fetchQcEngineers()
  }, [])

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
          } catch (e) { console.error(e) }
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
          } catch (e) { console.error(e) }
        }
      }
    }
  }, [initialData])

  const isReadOnly = isReview && userRole !== 'QC';

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setAlert({ show: false, type: '', message: '' });
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
      const authData = localStorage.getItem("user_auth")
      let token = null, userId = null;

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
        role: 'PROD',
        data: finalData,
        basicInfo: basicInfo
      }

      const res = await fetch(`${backendUrl}/api/wpj/update-stage-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (res.ok) {
        setAlert({ show: true, type: 'success', message: "Back Chip submitted successfully" });
        setTimeout(() => { if (onSuccess) onSuccess(); }, 1500);
      } else {
        const data = await res.json();
        setAlert({ show: true, type: 'error', message: data.message || "Submission failed" });
      }
    } catch (error) {
      console.error(error);
      setAlert({ show: true, type: 'error', message: "Error submitting form" });
    } finally { setIsSubmitting(false); }
  }

  const handleReviewAction = async (status) => {
    setIsSubmitting(true);
    setAlert({ show: false, type: '', message: '' });
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
      const authData = localStorage.getItem("user_auth")
      let token = null, userId = null;

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

      const res = await fetch(`${backendUrl}/api/wpj/review-stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
        body: JSON.stringify({
          jointId: initialData?.id,
          stage: stage,
          status: status,
          engineerId: userId,
          role: 'QC'
        }),
        credentials: "include",
      });

      if (res.ok) {
        setAlert({ show: true, type: 'success', message: `Back Chip ${status} successfully` });
        setTimeout(() => { if (onSuccess) onSuccess(); }, 1500);
      } else {
        const data = await res.json();
        setAlert({ show: true, type: 'error', message: data.message || "Review action failed" });
      }
    } catch (error) {
      console.error(error);
      setAlert({ show: true, type: 'error', message: "Error processing review" });
    } finally { setIsSubmitting(false); }
  }

  return (
    <div className="w-full mx-auto p-6 space-y-6">
      <FormAlert type={alert.type} message={alert.message} />

      {/* Basic Information Section */}
      <div className="border rounded-lg p-4 space-y-4 shadow-sm bg-card">
        <h3 className="font-semibold text-lg border-b pb-2">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>Shreno Manufacturer sr. no.:</Label>
            <Input value={initialData?.msnNumber || ""} className="bg-muted" placeholder="MSN" readOnly />
          </div>
          <div className="space-y-2">
            <Label>Equipment Name & Tag Number:</Label>
            <Input value={`${initialData?.equipment || ""} ${initialData?.tagNo || ""}`} readOnly className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Drawing no. :</Label>
            <Input value={initialData?.drgNo || ""} readOnly className="bg-muted" />
          </div>
        </div>
      </div>

      <Card className="shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            Back chip
            {initialData?.back_chip_req && (
              <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                True
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          <div className="space-y-6 pt-6 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Production Engineer Name:</Label>
                <Input
                  type="text"
                  value={productionEngineerName}
                  placeholder="Production Engineer Name"
                  readOnly
                  className="bg-muted uppercase font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label>Date:</Label>
                <Input
                  type="text"
                  value={initialData?.inspectionData?.[`${sPrefix}_submitted_at`] 
                    ? new Date(initialData.inspectionData[`${sPrefix}_submitted_at`]).toLocaleDateString() 
                    : todayDate}
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
                  <SelectTrigger className="w-full focus:ring-2 focus:ring-primary">
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

          <div className="mt-8 flex justify-end gap-3 items-center border-t pt-6">
            {!isReview ? (
              <Button 
                onClick={handleSubmit} 
                className="min-w-[150px] shadow-sm hover:translate-y-[-1px] transition-all" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : `Save & Complete ${stage.replace('stage', 'Stage ')}`}
              </Button>
            ) : (
              <>
                {(isReview || initialData?.inspectionData?.[`${sPrefix}_approved_at`]) && (
                  <div className="flex items-center gap-2 mr-auto">
                    <Label className="text-muted-foreground">Status:</Label>
                    <span className="font-semibold text-green-600">
                      Approved on {initialData?.inspectionData?.[`${sPrefix}_approved_at`] 
                        ? new Date(initialData.inspectionData[`${sPrefix}_approved_at`]).toLocaleDateString() 
                        : new Date().toLocaleDateString()}
                    </span>
                  </div>
                )}
                <Button 
                  onClick={() => handleReviewAction('rejected')} 
                  variant="outline" 
                  className="min-w-[100px] hover:bg-destructive/10"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Processing..." : "Reject"}
                </Button>
                <Button 
                  onClick={() => handleReviewAction('approved')} 
                  className="min-w-[100px] bg-primary hover:opacity-90 shadow-md"
                  disabled={isSubmitting}
                >
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
