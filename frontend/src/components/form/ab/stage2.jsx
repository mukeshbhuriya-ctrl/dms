import React, { useState, useEffect } from "react"
import WpjService from '@/services/wpj.service';
import api from "@/api/api.client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
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
import { FormAlert } from "@/components/ui/form-alert"
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userRole, setUserRole] = useState("")
    const [qcRemarks, setQcRemarks] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
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
        if (inspectionData[`${sPrefix}_prod_eng_name`]) {
          setProductionEngineerName(inspectionData[`${sPrefix}_prod_eng_name`]);
        }
        if (inspectionData[`${sPrefix}_remarks`]) {
          setQcRemarks(inspectionData[`${sPrefix}_remarks`]);
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
            if (!inspectionData[`${sPrefix}_qc_group_id`] && sbcData?.qcGroupId) {
              setSelectedQcGroupId(sbcData.qcGroupId);
            }
            if (sbcData?.productionGroupId && !selectedProdGroupId) setSelectedProdGroupId(sbcData.productionGroupId);
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
  const isReadOnly = readOnly || (isReview && userRole !== 'QC');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");
    setSuccess("");
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

      if (!selectedQcGroupId) {
        setError("Please select QC Group");
        setIsSubmitting(false);
        return;
      }

       if (!selectedProdGroupId) {
         setError("Please select Production Group");
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
        setSuccess("Back Chip submitted successfully");
        setTimeout(() => { if (onSuccess) onSuccess(); }, 1500);
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
        role: role,
        remarks: qcRemarks,
        data: {}
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
        setSuccess(`Back Chip ${status} successfully`);
        setTimeout(() => { if (onSuccess) onSuccess(); }, 1500);
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
      <FormAlert type="error" message={error} />
      <FormAlert type="success" message={success} />
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="msn">MSN:</Label>
              <Input id="msn" name="msn" type="text" value={displayFields?.msn || ""} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">CLIENT:</Label>
              <Input id="client" name="client" type="text" value={displayFields?.client || ""} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="poNo">P.O. NO.:</Label>
              <Input id="poNo" name="poNo" type="text" value={displayFields?.poNo || ""} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportNo">Report No:</Label>
              <Input id="reportNo" name="reportNo" type="text" value={inputFields?.reportNo || ""} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagNo">TAG NO.:</Label>
              <Input id="tagNo" name="tagNo" type="text" value={inputFields?.tagNo || ""} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="equipment">EQUIPMENT:</Label>
              <Input id="equipment" name="equipment" type="text" value={inputFields?.equipment || ""} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectsId">Projects ID:</Label>
              <Input id="projectsId" name="projectsId" type="text" value={inputFields?.projectsId || ""} onChange={handleInputChange} placeholder="Enter Projects ID" readOnly={isReadOnly} className={isReadOnly ? "bg-muted" : ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lindeDrgNo">CLIENT DRG.:</Label>
              <Input id="lindeDrgNo" name="lindeDrgNo" type="text" value={inputFields?.lindeDrgNo || ""} onChange={handleInputChange} placeholder="Enter CLIENT DRG." readOnly={isReadOnly} className={isReadOnly ? "bg-muted" : ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drgNo">SHRENO DRG NO.:</Label>
              <Input id="drgNo" name="drgNo" type="text" value={inputFields?.drgNo || ""} onChange={handleInputChange} placeholder="Enter SHRENO DRG NO." readOnly={isReadOnly} className={isReadOnly ? "bg-muted" : ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">CODE:</Label>
              <Input id="code" name="code" type="text" value={inputFields?.code || ""} onChange={handleInputChange} placeholder="Enter CODE" readOnly={isReadOnly} className={isReadOnly ? "bg-muted" : ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspAgency">INSP. AGENCY:</Label>
              <Input id="inspAgency" name="inspAgency" type="text" value={inputFields?.inspAgency || ""} onChange={handleInputChange} placeholder="Enter INSP. AGENCY" readOnly={isReadOnly} className={isReadOnly ? "bg-muted" : ""} />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
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
        </CardContent>
      </Card>

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
        <div className="mt-12 flex justify-end pb-10">
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : `Save & Complete ${stage.replace('stage', 'Stage ')}`}
          </Button>
        </div>
      )}
    </div>
  )
}

export default Stage2;


