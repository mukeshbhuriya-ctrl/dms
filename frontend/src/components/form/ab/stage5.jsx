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

function Stage5({ initialData, inspectionData, isReview = false, readOnly = false, onSuccess }) {
    
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

            if (inspectionData.s5_qc_group_id) {
                setSelectedQcGroupId(inspectionData.s5_qc_group_id);
              }
              if (inspectionData.s5_production_group_id && !selectedProdGroupId) {
                setSelectedProdGroupId(inspectionData.s5_production_group_id);
              }
            if (inspectionData.s5_prod_eng_name) {
                setProductionEngineerName(inspectionData.s5_prod_eng_name);
            }
            if (inspectionData.s5_remarks) {
                setQcRemarks(inspectionData.s5_remarks);
            }

            if (inspectionData.s5_data) {
                try {
                    const rawData = typeof inspectionData.s5_data === 'string' ? JSON.parse(inspectionData.s5_data) : inspectionData.s5_data;
                    const s5Data = rawData?.[categoryKey]?.s5 || rawData?.[categoryKey] || rawData || {};

                    if (s5Data?.productionEngineerName) setProductionEngineerName(s5Data.productionEngineerName);
                    if (s5Data?.submissionDate) setTodayDate(s5Data.submissionDate);

                    if (inspectionData.s5_qc_group_id) {
                setSelectedQcGroupId(inspectionData.s5_qc_group_id);
              }
              if (inspectionData.s5_production_group_id && !selectedProdGroupId) {
                setSelectedProdGroupId(inspectionData.s5_production_group_id);
              } else if (s5Data?.qcGroupId) {
                        setSelectedQcGroupId(s5Data.qcGroupId);
            }
            if (s5Data.productionGroupId) setSelectedProdGroupId(s5Data.productionGroupId);
                } catch (e) { }
            }
        }
    }, [inspectionData, initialData]);

    // ReadOnly Condition: Review mode AND not QC
    const isReadOnly = readOnly || (isReview && userRole !== 'QC');

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

            if (!selectedQcGroupId) {
                setError("Please select QC Group for Stage 5");
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
            if (initialData?.inspectionData?.s5_data) {
                existingData = typeof initialData.inspectionData.s5_data === 'string'
                    ? JSON.parse(initialData.inspectionData.s5_data)
                    : initialData.inspectionData.s5_data;
            }

            const currentStageData = {
                qcGroupId: selectedQcGroupId,
        productionGroupId: selectedProdGroupId,
                productionEngineerName,
                submissionDate: todayDate,
            };

            const finalData = {
                ...existingData,
                [categoryKey]: {
                    ...existingData[categoryKey],
                    s5: currentStageData
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
                stage: "stage5",
                status: "pending",
                engineerId: userId,
                role: "PROD",
                data: finalData,
                basicInfo: basicInfo
            }

            const res = await api.post("/api/wpj/update-stage-status", payload);

            if (res.success) {
                setSuccess("Stage 5 (PT) submitted successfully");
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
                let existingData = {};
                if (initialData?.inspectionData?.s5_data) {
                    existingData = typeof initialData.inspectionData.s5_data === 'string'
                        ? JSON.parse(initialData.inspectionData.s5_data)
                        : initialData.inspectionData.s5_data;
                }
                const currentStageData = {
                    qcGroupId: selectedQcGroupId,
        productionGroupId: selectedProdGroupId,
                    productionEngineerName,
                    submissionDate: todayDate,
                };
                const finalData = {
                    ...existingData,
                    [categoryKey]: {
                        ...existingData[categoryKey],
                        s5: currentStageData
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
                    stage: "stage5",
                    status: status,
                    engineerId: userId,
                    role: 'QC',
                    data: finalData,
                    basicInfo: basicInfo
                });
            }

            const res = await api.post("/api/wpj/review-stage", {
                jointId: initialData?.id,
                stage: "stage5",
                status: status,
                engineerId: userId,
                role: 'QC',
                remarks: qcRemarks
            });

            if (res.success) {
                setSuccess(`Stage 5 ${status} successfully`);
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
                    <CardTitle>Penetrant Testing (PT)</CardTitle>
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
                                value={initialData?.inspectionData?.s5_submitted_at ? new Date(initialData.inspectionData.s5_submitted_at).toLocaleDateString() : todayDate}
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
                status={initialData?.inspectionData?.s5_status}
                remarks={qcRemarks}
                setRemarks={setQcRemarks}
                onAction={handleReviewAction}
                isSubmitting={isSubmitting}
                reviewDate={
                    initialData?.inspectionData?.s5_approved_at ? new Date(initialData.inspectionData.s5_approved_at).toLocaleString() :
                    initialData?.inspectionData?.s5_rejected_at ? new Date(initialData.inspectionData.s5_rejected_at).toLocaleString() : ""
                }
            />

            )}

            {!isReview && !readOnly && (
                <div className="mt-12 flex justify-end pb-10">
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? "Processing..." : "Save & Complete Stage 5"}
                    </Button>
                </div>
            )}
        </div>
    )
}

export default Stage5



