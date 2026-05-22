import React, { useState, useEffect } from "react"
import WpjService from '@/services/wpj.service';
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

function Stage2({ initialData, isReview = false, readOnly = false, stage = "stage2" , onSuccess }) {
  
    const [qcGroups, setQcGroups] = useState([]);
    const [productionGroups, setProductionGroups] = useState([]);

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const [qcRes, prodRes, myGroupsRes] = await Promise.all([
                    WpjService.getEmployeeGroups('QUALITY'),
                    WpjService.getEmployeeGroups('PRODUCTION'),
                    WpjService.getMyGroups()
                ]);
                if (qcRes?.success) setQcGroups(qcRes.data || []);
                if (prodRes?.success) setProductionGroups(prodRes.data || []);
                
                if (myGroupsRes?.success && myGroupsRes.data) {
                    const myQcGroup = myGroupsRes.data.find(g => g.group_type === 'QUALITY' || g.type === 'QUALITY');
                    const myProdGroup = myGroupsRes.data.find(g => g.group_type === 'PRODUCTION' || g.type === 'PRODUCTION');
                    
                    // QC Group is intentionally NOT auto-selected based on user request
                    if (myProdGroup) {
                        setSelectedProdGroupId(prev => prev || myProdGroup.id);
                    }
                }
            } catch (err) {
                console.error("Error fetching groups:", err);
            }
        };
        fetchGroups();
    }, []);

    const [productionEngineerName, setProductionEngineerName] = useState("")
  const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString())
  const [selectedQcGroupId, setSelectedQcGroupId] = useState("")
    const [selectedProdGroupId, setSelectedProdGroupId] = useState("");
  const [qcRemarks, setQcRemarks] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
  const [userRole, setUserRole] = useState("")
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

  // Fetch QC Groups
  useEffect(() => {
    const fetchQcGroups = async () => {
      try {
        const response = await api.get('/api/employee-groups');
        if (response && response.success) {
          setQcGroups(response.data || []);
        }
      } catch (error) {
        console.error("Error fetching QC groups:", error);
      }
    };
    fetchQcGroups();
  }, []);

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

      // Fetch dynamic report NO from dedicated API if not already present in inspection data
      if (!initialData.inspectionData?.reportNo) {
        api.get(`/api/wpj/report-no/${initialData.id}`).then(res => {
          if (res.success && res.reportNo) {
            setInputFields(prev => ({ ...prev, reportNo: res.reportNo }));
          }
        }).catch(err => console.error("Error fetching report no", err));
      }

      setInputFields((prev) => ({
        ...prev,
        reportNo: initialData.inspectionData?.reportNo || prev.reportNo || "",
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

        if (inspectionData[`${sPrefix}_qc_group_id`]) {
                setSelectedQcGroupId(inspectionData[`${sPrefix}_qc_group_id`]);
              }
              if (inspectionData[`${sPrefix}_production_group_id`] && !selectedProdGroupId) {
                setSelectedProdGroupId(inspectionData[`${sPrefix}_production_group_id`]);
              }
        if (inspectionData[`${sPrefix}_remarks`]) {
          setQcRemarks(inspectionData[`${sPrefix}_remarks`]);
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
            if (inspectionData[`${sPrefix}_qc_group_id`]) {
                setSelectedQcGroupId(inspectionData[`${sPrefix}_qc_group_id`]);
              } else if (sbcData?.qcGroupId) {
                setSelectedQcGroupId(sbcData.qcGroupId);
              }
              
              if (inspectionData[`${sPrefix}_production_group_id`] && !selectedProdGroupId) {
                setSelectedProdGroupId(inspectionData[`${sPrefix}_production_group_id`]);
              } else if (sbcData?.productionGroupId && !selectedProdGroupId) {
                setSelectedProdGroupId(sbcData.productionGroupId);
              }
          } catch (e) { console.error(e) }
        }
      }
    }
  }, [initialData])

  const isReadOnly = readOnly || (isReview && userRole !== 'QC');

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

      if (!selectedQcGroupId) {
        setAlert({ show: true, type: 'error', message: "Please select QC Group" });
        setIsSubmitting(false);
        return;
      }

            if (!selectedProdGroupId) {
                setAlert({ show: true, type: 'error', message: "Please select Production Group" });
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
        qcGroupId: selectedQcGroupId,
        productionGroupId: selectedProdGroupId,
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

      const res = await api.post("/api/wpj/update-stage-status", payload);

      if (res.success) {
        setAlert({ show: true, type: 'success', message: "Back Chip submitted successfully" });
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
          qcGroupId: selectedQcGroupId,
        productionGroupId: selectedProdGroupId,
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
        setAlert({ show: true, type: 'success', message: `Back Chip ${status} successfully` });
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
              <Label htmlFor="productionGroup">Production Group Name:</Label>
              <Select value={selectedProdGroupId} onValueChange={setSelectedProdGroupId} disabled={isReview}>
                <SelectTrigger id="productionGroup" className="w-full">
                  <SelectValue placeholder="Select Production Group" />
                </SelectTrigger>
                <SelectContent>
                  {productionGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name?.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Label>QC Group Name:</Label>
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
          {!readOnly && (

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

          )}

          {!isReview && !readOnly && (
            <div className="mt-12 flex justify-end pb-10 gap-3 border-t pt-6">
              <Button
                onClick={handleSubmit}
                className="min-w-[150px] shadow-sm hover:translate-y-[-1px] transition-all"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : `Save & Complete ${stage.replace('stage', 'Stage ')}`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Stage2;


