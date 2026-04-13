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
import api from "@/api/api.client"
import QCReviewSection from "@/components/wpj/QCReviewSection"

const Stage2D = ({ initialData, inspectionData, isReview = false, stage = "stage2", onSuccess  }) => {
  const [productionEngineerName, setProductionEngineerName] = useState("")
  const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString())
  const [selectedQcGroupId, setSelectedQcGroupId] = useState("")
  const [qcRemarks, setQcRemarks] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userRole, setUserRole] = useState("")
  const [qcGroups, setQcGroups] = useState([])
  const [alert, setAlert] = useState({ show: false, type: 'success', message: '' })

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

  // Fetch QC Groups
  useEffect(() => {
    const fetchQcGroups = async () => {
      try {
        const response = await api.get('/api/qc-groups');
        if (response && response.success) {
          setQcGroups(response.data || []);
        }
      } catch (error) {
        console.error("Error fetching QC groups:", error);
      }
    };
    fetchQcGroups();
  }, []);

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

      const inspData = inspectionData || initialData?.inspectionData;
      if (inspData) {
        if (inspData[`${sPrefix}_assigned_qc_group_id`]) setSelectedQcGroupId(inspData[`${sPrefix}_assigned_qc_group_id`]);
        if (inspData[`${sPrefix}_remarks`]) setQcRemarks(inspData[`${sPrefix}_remarks`]);
        if (inspData[`${sPrefix}_prod_eng_name`]) setProductionEngineerName(inspData[`${sPrefix}_prod_eng_name`]);

        if (inspData.data_json) {
          try {
            const rawBasic = typeof inspData.data_json === 'string' ? JSON.parse(inspData.data_json) : inspData.data_json;
            const basicInfo = rawBasic?.d || {};

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

        if (inspData[`${sPrefix}_data`]) {
          try {
            const rawData = typeof inspData[`${sPrefix}_data`] === 'string' ? JSON.parse(inspData[`${sPrefix}_data`]) : inspData[`${sPrefix}_data`];
            const sData = rawData?.d?.[sPrefix] || rawData?.d || rawData || {};

            if (inspData[`${sPrefix}_assigned_qc_group_id`]) {
                setSelectedQcGroupId(inspData[`${sPrefix}_assigned_qc_group_id`]);
            } else if (sData.assignedQcGroupId) {
                setSelectedQcGroupId(sData.assignedQcGroupId);
            }
          } catch (e) { console.error(e) }
        }
      }
    }
  }, [initialData, inspectionData, stage]);

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setAlert({ show: false, type: '', message: '' })
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
      const authData = localStorage.getItem("user_auth")
      let token = null, userId = null;

      if (authData) {
        const parsed = JSON.parse(authData)
        token = parsed?.payload?.token || parsed?.token
        userId = parsed?.payload?.user?.id || parsed?.user?.id
      }

      if (!selectedQcGroupId) {
        setAlert({ show: true, type: 'error', message: "Please select QC Group" });
        setIsSubmitting(false);
        return;
      }

      const currentStageData = {
        assignedQcGroupId: selectedQcGroupId,
        productionEngineerName,
        submissionDate: todayDate,
      };

      const inspData = inspectionData || initialData?.inspectionData;
      let existingData = {};
      if (inspData?.[`${sPrefix}_data`]) {
        existingData = typeof inspData[`${sPrefix}_data`] === 'string' ? JSON.parse(inspData[`${sPrefix}_data`]) : inspData[`${sPrefix}_data`];
      }

      const finalData = {
        ...existingData,
        d: {
          ...existingData?.d,
          [sPrefix]: currentStageData
        }
      };

      const basicInfo = {
        d: {
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

      const res = await api.post("/api/wpj/update-stage-status", payload);

      if (res.success) {
        setAlert({ show: true, type: 'success', message: `Back Chip Submitted Successfully` });
        setTimeout(() => { if (onSuccess) onSuccess(); }, 1500);
      } else {
        setAlert({ show: true, type: 'error', message: res.message || "Submission failed" });
      }
    } catch (error) {
      console.error(error);
      setAlert({ show: true, type: 'error', message: "Error submitting form" });
    } finally { setIsSubmitting(false); }
  }

  const handleReviewAction = async (status) => {
    setIsSubmitting(true)
    setAlert({ show: false, type: '', message: '' })
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
        const currentStageData = {
          productionEngineerName,
          submissionDate: todayDate,
          assignedQcGroupId: selectedQcGroupId
        };

        const inspData = inspectionData || initialData?.inspectionData;
        let existingData = {};
        if (inspData?.[`${sPrefix}_data`]) {
          existingData = typeof inspData[`${sPrefix}_data`] === 'string' ? JSON.parse(inspData[`${sPrefix}_data`]) : inspData[`${sPrefix}_data`];
        }

        const finalData = {
          ...existingData,
          d: {
            ...existingData?.d,
            [sPrefix]: currentStageData
          }
        };

        const basicInfo = {
          d: {
            ...displayFields,
            ...inputFields
          }
        };

        await api.post("/api/wpj/update-stage-status", {
          jointId: initialData?.id,
          stage: stage,
          status: status,
          engineerId: userId,
          role: 'QC',
          data: finalData,
          basicInfo: basicInfo
        });
      }

      const res = await api.post("/api/wpj/review-stage", {
        jointId: initialData?.id,
        stage: stage,
        status: status,
        engineerId: userId,
        role: 'QC',
        remarks: qcRemarks
      });

      if (res.success) {
        setAlert({ show: true, type: 'success', message: `Back Chip ${status} Successfully` });
        setTimeout(() => { if (onSuccess) onSuccess(); }, 1500);
      } else {
        setAlert({ show: true, type: 'error', message: res.message || "Review action failed" });
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
                <Label htmlFor="selectedQcGroupId">QC Group Name:</Label>
                <Select
                  value={selectedQcGroupId}
                  onValueChange={setSelectedQcGroupId}
                  disabled={isReview}
                >
                  <SelectTrigger className="w-full focus:ring-2 focus:ring-primary">
                    <SelectValue placeholder="Select QC Group" />
                  </SelectTrigger>
                  <SelectContent>
                    {qcGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name?.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Shared QC Review & Approval Section */}
          <QCReviewSection
            isReview={isReview}
            userRole={userRole}
            status={initialData?.inspectionData?.[`${sPrefix}_status`]}
            remarks={qcRemarks}
            setRemarks={setQcRemarks}
            onAction={handleReviewAction}
            isSubmitting={isSubmitting}
            reviewDate={
              initialData?.inspectionData?.[`${sPrefix}_approved_at`] ? new Date(initialData.inspectionData[`${sPrefix}_approved_at`]).toLocaleString() :
                initialData?.inspectionData?.[`${sPrefix}_rejected_at`] ? new Date(initialData.inspectionData[`${sPrefix}_rejected_at`]).toLocaleString() : ""
            }
          />

          {!isReview && (
            <div className="mt-12 flex justify-end pb-10">
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : `Save & Complete ${stage.replace('stage', 'Stage ')}`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Stage2D;
