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

function Stage6({ initialData, inspectionData, isReview = false, readOnly = false, stage = "stage6", onSuccess }) {
    
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
    const [postRtStatus, setPostRtStatus] = useState("NA") // NA, Pending, Approved
    const [postPtStatus, setPostPtStatus] = useState("NA")

    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
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
        lindeDrgNo: "",
        drgNo: "",
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

    // Helper to determine category key
    const getCategoryKey = () => {
        return initialData?.jointCategory?.toLowerCase() || initialData?.joint_type?.toLowerCase() || 'a';
    }

    useEffect(() => {
        if (inspectionData) {
            const categoryKey = getCategoryKey();
            const stagePrefix = stage === 'stage7' ? 's7' : 's6';
            const dataKey = `${stagePrefix}_data`;
            const ndtEngIdKey = `${stagePrefix}_qc_engineer_id`;
            const prodEngNameKey = `${stagePrefix}_prod_eng_name`;
            // Note: s7 might not have post_rt_status fields in DB schema columns, 
            // but s6 has s6_post_rt_status. We should check if s7 has them or if they rely on JSON.
            // Assuming s7 relies on JSON or reuses s6 columns (unlikely for different stages).
            // For now, I will read from JSON primarily.

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

            if (inspectionData[`${stagePrefix}_qc_group_id`]) {
                setSelectedQcGroupId(inspectionData[`${stagePrefix}_qc_group_id`]);
            }
            if (inspectionData[`${stagePrefix}_remarks`]) {
                setQcRemarks(inspectionData[`${stagePrefix}_remarks`]);
            }

            if (inspectionData[prodEngNameKey]) setProductionEngineerName(inspectionData[prodEngNameKey]);

            // s6 specific columns (legacy) - s7 might not have these column equivalents
            if (stage === 'stage6') {
                if (inspectionData.s6_post_rt_status) setPostRtStatus(inspectionData.s6_post_rt_status);
                if (inspectionData.s6_post_pt_status) setPostPtStatus(inspectionData.s6_post_pt_status);
            }

            if (inspectionData[dataKey]) {
                try {
                    const rawData = typeof inspectionData[dataKey] === 'string' ? JSON.parse(inspectionData[dataKey]) : inspectionData[dataKey];
                    // Check nested key: { ab: { s6: ... } } or legacy
                    const stageData = rawData?.[categoryKey]?.[stagePrefix] || rawData?.[categoryKey] || rawData || {};

                    if (stageData?.productionEngineerName) setProductionEngineerName(stageData.productionEngineerName);
                    if (stageData?.submissionDate) setTodayDate(stageData.submissionDate);

                    if (inspectionData[`${stagePrefix}_qc_group_id`]) {
                        setSelectedQcGroupId(inspectionData[`${stagePrefix}_qc_group_id`]);
                    } else if (stageData?.qcGroupId) {
                        setSelectedQcGroupId(stageData.qcGroupId);
            if (stageData.productionGroupId) setSelectedProdGroupId(stageData.productionGroupId);
                    }

                    if (stageData?.postRtStatus) setPostRtStatus(stageData.postRtStatus);
                    if (stageData?.postPtStatus) setPostPtStatus(stageData.postPtStatus);

                    // Legacy fallback
                    if (stageData?.inputFields && !inspectionData.data_json) {
                        setInputFields(prev => ({ ...prev, ...stageData.inputFields }));
                    }
                } catch (e) { console.error(`Error parsing ${dataKey}`, e) }
            }
        }
    }, [inspectionData, initialData, stage]);

    // ReadOnly Condition: Review mode AND not QC
    const isReadOnly = readOnly || (isReview && userRole !== 'QC');

    const handleSubmit = async () => {
        setIsSubmitting(true)
        setError("")
        setSuccess("")
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
            const stagePrefix = stage === 'stage7' ? 's7' : 's6';
            const dataKey = `${stagePrefix}_data`;

            let existingData = {};
            if (initialData?.inspectionData?.[dataKey]) {
                existingData = typeof initialData.inspectionData[dataKey] === 'string'
                    ? JSON.parse(initialData.inspectionData[dataKey])
                    : initialData.inspectionData[dataKey];
            }

            const currentStageData = {
                postRtStatus,
                postPtStatus,
                qcGroupId: selectedQcGroupId,
        productionGroupId: selectedProdGroupId,
                productionEngineerName,
                submissionDate: todayDate,
            };

            const finalData = {
                ...existingData,
                [categoryKey]: {
                    ...existingData[categoryKey],
                    [stagePrefix]: currentStageData
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
                role: "PROD",
                data: finalData,
                basicInfo: basicInfo
            }

            const res = await api.post("/api/wpj/update-stage-status", payload);

            if (res.success) {
                const stageName = stage === 'stage7' ? 'Stage 7 (Hardness)' : 'Stage 6 (PWHT)';
                setSuccess(`${stageName} submitted successfully`);
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
        setError("");
        setSuccess("");
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

            if (userRole === 'QC' && status === 'approved') {
                const categoryKey = getCategoryKey();
                const stagePrefix = stage === 'stage7' ? 's7' : 's6';
                const dataKey = `${stagePrefix}_data`;

                let existingData = {};
                if (initialData?.inspectionData?.[dataKey]) {
                    existingData = typeof initialData.inspectionData[dataKey] === 'string'
                        ? JSON.parse(initialData.inspectionData[dataKey])
                        : initialData.inspectionData[dataKey];
                }

                const currentStageData = {
                    postRtStatus,
                    postPtStatus,
                    qcGroupId: selectedQcGroupId,
        productionGroupId: selectedProdGroupId,
                    productionEngineerName,
                    submissionDate: todayDate,
                };

                const finalData = {
                    ...existingData,
                    [categoryKey]: {
                        ...existingData[categoryKey],
                        [stagePrefix]: currentStageData
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
                const stageName = stage === 'stage7' ? 'Stage 7' : 'Stage 6';
                setSuccess(`${stageName} ${status} successfully`);
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
            <FormAlert type="error" message={error} />
            <FormAlert type="success" message={success} />
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
            <Card>
                <CardHeader>
                    <CardTitle>Post Weld Heat Treatment (PWHT) {initialData?.pwht && (
                        <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                            Yes
                        </span>
                    )}</CardTitle>
                </CardHeader>
                <CardHeader>
                    {stage === "stage6" && initialData?.pwht && (
                        <CardTitle>Radiography Testing (RT) <span className="ml-2 text-xs text-muted-foreground">
                            (After PWHT)
                        </span></CardTitle>
                    )}

                    {stage === "stage7" && initialData?.pwht && (
                        <CardTitle>Penetrant Testing (PT) <span className="ml-2 text-xs text-muted-foreground">
                            (After PWHT)
                        </span></CardTitle>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
              <Label htmlFor="productionGroup">Production Group:</Label>
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
                                value={initialData?.inspectionData?.[`${stage === 'stage7' ? 's7' : 's6'}_submitted_at`] ? new Date(initialData.inspectionData[`${stage === 'stage7' ? 's7' : 's6'}_submitted_at`]).toLocaleDateString() : todayDate}
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
                                        <SelectItem key={group.id} value={group.id}>
                                            {group.name?.toUpperCase()}
                                        </SelectItem>
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
                status={initialData?.inspectionData?.[`${stage === 'stage7' ? 's7' : 's6'}_status`]}
                remarks={qcRemarks}
                setRemarks={setQcRemarks}
                onAction={handleReviewAction}
                isSubmitting={isSubmitting}
                reviewDate={
                    initialData?.inspectionData?.[`${stage === 'stage7' ? 's7' : 's6'}_approved_at`] ? new Date(initialData.inspectionData[`${stage === 'stage7' ? 's7' : 's6'}_approved_at`]).toLocaleString() :
                    initialData?.inspectionData?.[`${stage === 'stage7' ? 's7' : 's6'}_rejected_at`] ? new Date(initialData.inspectionData[`${stage === 'stage7' ? 's7' : 's6'}_rejected_at`]).toLocaleString() : ""
                }
            />

            )}

            {!isReview && !readOnly && (
                <div className="mt-12 flex justify-end pb-10">
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? "Processing..." : `Save & Complete ${stage === 'stage7' ? 'Stage 7' : 'Stage 6'}`}
                    </Button>
                </div>
            )}
        </div>
    )
}

export default Stage6



