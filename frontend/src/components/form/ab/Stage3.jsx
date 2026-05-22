import WpjService from '@/services/wpj.service';
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
import api from "@/api/api.client"
import QCReviewSection from "@/components/wpj/QCReviewSection"

function Stage3({ initialData, inspectionData, isReview = false, readOnly = false, stage = "stage3" , onSuccess }) {
  
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

      // Auto-generate Report No logic
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

    const [selectedQcGroupId, setSelectedQcGroupId] = useState("")
    const [selectedProdGroupId, setSelectedProdGroupId] = useState("");
  const [qcRemarks, setQcRemarks] = useState("")
  const [welderNo, setWelderNo] = useState("")
  const [weldingProcess, setWeldingProcess] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    return initialData?.joint_type?.toLowerCase() || 'a';
  }

  useEffect(() => {
    if (inspectionData) {
      const categoryKey = getCategoryKey();

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
        } catch (e) { }
      }

      if (inspectionData.s3_prod_eng_name) {
        setProductionEngineerName(inspectionData.s3_prod_eng_name);
      }

      if (inspectionData.s3_remarks) {
        setQcRemarks(inspectionData.s3_remarks);
      }

      if (inspectionData.s3_data) {
        try {
          const rawData = typeof inspectionData.s3_data === 'string'
            ? JSON.parse(inspectionData.s3_data)
            : inspectionData.s3_data;
          
          const savedData = rawData?.[categoryKey]?.s3 || rawData?.[categoryKey] || rawData || {};

          if (savedData?.productionEngineerName) setProductionEngineerName(savedData.productionEngineerName);
          if (savedData?.submissionDate) setTodayDate(savedData.submissionDate);

          if (inspectionData.s3_welder_no) setWelderNo(inspectionData.s3_welder_no);
          else if (savedData?.welderNo) setWelderNo(savedData.welderNo);

          if (inspectionData.s3_welding_process) setWeldingProcess(inspectionData.s3_welding_process);
          else if (savedData?.weldingProcess) setWeldingProcess(savedData.weldingProcess);

          if (inspectionData.s3_qc_group_id) {
            setSelectedQcGroupId(inspectionData.s3_qc_group_id);
          } else if (savedData?.qcGroupId) {
            setSelectedQcGroupId(savedData.qcGroupId);
            if (savedData.productionGroupId) setSelectedProdGroupId(savedData.productionGroupId);
          }
        } catch (e) { }
      }
    }
  }, [inspectionData, initialData]);

  const isReadOnly = readOnly || (isReview && userRole !== 'QC');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
      const authData = localStorage.getItem("user_auth")
      let token = null
      let userId = null;

      if (authData) {
        const parsed = JSON.parse(authData)
        token = parsed?.payload?.token || parsed?.token
        userId = parsed?.payload?.user?.id || parsed?.user?.id
      }

      if (!selectedQcGroupId) {
        setError("Please select QC Group for Weld Visual");
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
      if (initialData?.inspectionData?.s3_data) {
        existingData = typeof initialData.inspectionData.s3_data === 'string'
          ? JSON.parse(initialData.inspectionData.s3_data)
          : initialData.inspectionData.s3_data;
      }

      const currentStageData = {
        productionEngineerName,
        submissionDate: todayDate,
        welderNo,
        weldingProcess,
        qcGroupId: selectedQcGroupId,
        productionGroupId: selectedProdGroupId,
      };

      const finalData = {
        ...existingData,
        [categoryKey]: {
          ...existingData[categoryKey],
          s3: currentStageData
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
        stage: "stage3",
        status: "pending",
        engineerId: userId,
        role: "PROD",
        data: finalData,
        basicInfo: basicInfo
      }

      const res = await api.post("/api/wpj/update-stage-status", payload);

      if (res.success) {
        setSuccess("Stage 3 submitted successfully");
        setTimeout(() => { if (onSuccess) onSuccess(); }, 1500);
      } else {
        setError(res.message || "Submission failed");
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
    setError(""); setSuccess("");
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
      const authData = localStorage.getItem("user_auth")
      let token = null
      let userId = null;

      if (authData) {
        const parsed = JSON.parse(authData)
        token = parsed?.payload?.token || parsed?.token
        userId = parsed?.payload?.user?.id || parsed?.user?.id
      }

      if (userRole === 'QC' && status === 'approved') {
        const categoryKey = getCategoryKey();
        let existingData = {};
        if (initialData?.inspectionData?.s3_data) {
          existingData = typeof initialData.inspectionData.s3_data === 'string'
            ? JSON.parse(initialData.inspectionData.s3_data)
            : initialData.inspectionData.s3_data;
        }

        const currentStageData = {
          productionEngineerName,
          submissionDate: todayDate,
          welderNo,
          weldingProcess,
          qcGroupId: selectedQcGroupId,
        productionGroupId: selectedProdGroupId,
        };

        const finalData = {
          ...existingData,
          [categoryKey]: {
            ...existingData[categoryKey],
            s3: currentStageData
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
            stage: "stage3",
            status: status,
            engineerId: userId,
            role: 'QC',
            data: finalData,
            basicInfo: basicInfo
        });
      }

      const res = await api.post("/api/wpj/review-stage", {
          jointId: initialData?.id,
          stage: "stage3",
          status: status,
          engineerId: userId,
          role: 'QC',
          remarks: qcRemarks
      });

      if (res.success) {
        setSuccess(`Stage 3 ${status} successfully`);
        setTimeout(() => { if (onSuccess) onSuccess(); }, 1500);
      } else {
        setError(res.message || "Review action failed");
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
      <FormAlert show={!!error} type="error" message={error} onClose={() => setError("")} />
      <FormAlert show={!!success} type="success" message={success} onClose={() => setSuccess("")} />

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>MSN:</Label><Input value={displayFields.msn} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label>CLIENT:</Label><Input value={displayFields.client} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label>P.O. NO.:</Label><Input value={displayFields.poNo} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label>Report No:</Label><Input value={inputFields.reportNo} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label>TAG NO.:</Label><Input value={inputFields.tagNo} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label>EQUIPMENT:</Label><Input value={inputFields.equipment} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label>Projects ID:</Label><Input value={inputFields.projectsId} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label>CLIENT DRG.:</Label><Input value={inputFields.lindeDrgNo} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label>SHRENO DRG NO.:</Label><Input value={inputFields.drgNo} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label>CODE:</Label><Input value={inputFields.code} readOnly className="bg-muted" /></div>
            <div className="space-y-2"><Label>INSP. AGENCY:</Label><Input value={inputFields.inspAgency} readOnly className="bg-muted" /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weld Visual Inspection by</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Welder No.:</Label>
              <Input
                value={welderNo}
                onChange={(e) => setWelderNo(e.target.value)}
                placeholder="Enter Welder No."
                readOnly={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Welding Process:</Label>
              <Input
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
                value={initialData?.inspectionData?.s3_submitted_at ? new Date(initialData.inspectionData.s3_submitted_at).toLocaleDateString() : todayDate}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>QC Group Name:</Label>
              <Select value={selectedQcGroupId} onValueChange={setSelectedQcGroupId} disabled={isReview}>
                <SelectTrigger className="w-full">
                   <SelectValue placeholder="Select QC Group" />
                </SelectTrigger>
                <SelectContent>
                  {qcGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>{group.name?.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shared QC Review & Approval Section */}
      {!readOnly && (

        <QCReviewSection
        isReview={isReview}
        userRole={userRole}
        status={initialData?.inspectionData?.s3_status}
        remarks={qcRemarks}
        setRemarks={setQcRemarks}
        onAction={handleReviewAction}
        isSubmitting={isSubmitting}
        reviewDate={
             initialData?.inspectionData?.s3_approved_at ? new Date(initialData.inspectionData.s3_approved_at).toLocaleString() :
             initialData?.inspectionData?.s3_rejected_at ? new Date(initialData.inspectionData.s3_rejected_at).toLocaleString() : ""
        }
      />

      )}

      {!isReview && !readOnly && (
        <div className="mt-12 flex justify-end pb-10">
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : `Save & Complete Stage 3`}
          </Button>
        </div>
      )}
    </div>
  )
}

export default Stage3;



