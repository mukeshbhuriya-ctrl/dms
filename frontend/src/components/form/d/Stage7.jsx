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

function Stage7D({ initialData, inspectionData, isReview = false, stage = "stage7", type }) {
    const sPrefix = stage.replace('stage', 's');
    const [productionEngineerName, setProductionEngineerName] = useState("")
    const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString())
    const [ndtEngineer, setNdtEngineer] = useState("")
    // Extra fields for PWHT
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

            const stageNum = stage.replace('stage', '');
            const generatedReportNo = `R/${initialData.msnNumber || '000'}/${initialData.jointNo}/${stageNum}`;

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

    // Mock NDT Engineers
    const [ndtEngineers, setNdtEngineers] = useState([])

    useEffect(() => {
        const fetchNdtEngineers = async () => {
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
                    setNdtEngineers(data.data || [])
                } else {
                    console.error("Failed to fetch NDT Engineers:", data.message)
                }
            } catch (error) {
                console.error("Error fetching NDT Engineers:", error)
            }
        }

        fetchNdtEngineers()
    }, [])

    // Helper to determine category key
    const getCategoryKey = () => {
        return initialData?.jointCategory?.toLowerCase() || initialData?.joint_type?.toLowerCase() || 'd';
    }

    useEffect(() => {
        if (inspectionData) {
            const categoryKey = getCategoryKey();
            const dataKey = `${sPrefix}_data`;
            const ndtEngIdKey = `${sPrefix}_qc_eng_id`;
            const prodEngNameKey = `${sPrefix}_prod_eng_name`;
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

            if (inspectionData[ndtEngIdKey]) setNdtEngineer(inspectionData[ndtEngIdKey]);
            // Check for QC Eng ID if NDT not found (new schema)
            const qcEngIdKey = `${sPrefix}_qc_eng_id`;
            if (!inspectionData[ndtEngIdKey] && inspectionData[qcEngIdKey]) {
                setNdtEngineer(inspectionData[qcEngIdKey]);
            }

            if (inspectionData[prodEngNameKey]) setProductionEngineerName(inspectionData[prodEngNameKey]);

            // s7/s8 specific columns
            // Assuming no legacy s6 fallback needed for this component as it's new for 7/8

            if (inspectionData[dataKey]) {
                try {
                    const rawData = typeof inspectionData[dataKey] === 'string' ? JSON.parse(inspectionData[dataKey]) : inspectionData[dataKey];
                    // Check nested key: { ab: { s7: ... } }
                    const stageData = rawData?.[categoryKey]?.[sPrefix] || rawData?.[categoryKey] || rawData || {};

                    if (stageData?.productionEngineerName) setProductionEngineerName(stageData.productionEngineerName);
                    if (stageData?.submissionDate) setTodayDate(stageData.submissionDate);

                    if (!inspectionData[ndtEngIdKey] && !inspectionData[qcEngIdKey]) {
                        if (stageData?.assignedQcEngineerId) setNdtEngineer(stageData.assignedQcEngineerId);
                        else if (stageData?.assignedNdtEngineerId) setNdtEngineer(stageData.assignedNdtEngineerId);
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
    const isReadOnly = isReview && userRole !== 'QC';

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

            if (!ndtEngineer) {
                setError("Please select QC Engineer");
                setIsSubmitting(false);
                return;
            }

            const categoryKey = getCategoryKey();
            const dataKey = `${sPrefix}_data`;

            let existingData = {};
            if (initialData?.inspectionData?.[dataKey]) {
                existingData = typeof initialData.inspectionData[dataKey] === 'string'
                    ? JSON.parse(initialData.inspectionData[dataKey])
                    : initialData.inspectionData[dataKey];
            }

            const currentStageData = {
                postRtStatus,
                postPtStatus,
                assignedQcEngineerId: ndtEngineer, // Renamed from assignedNdtEngineerId
                productionEngineerName,
                submissionDate: todayDate,
                // inputFields removed
            };

            const finalData = {
                ...existingData,
                [categoryKey]: {
                    ...existingData[categoryKey],
                    [sPrefix]: currentStageData
                }
            };



            const payload = {
                jointId: initialData?.id,
                stage: stage, // Dynamic stage
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
                const stageName = stage.replace('stage', 'Stage ');
                setSuccess(`${stageName} submitted successfully`);
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
            const role = 'QC'; // Assuming QC/NDT performing review

            if (authData) {
                const parsed = JSON.parse(authData)
                token = parsed?.payload?.token || parsed?.token
                userId = parsed?.payload?.user?.id || parsed?.user?.id
            }

            if (userRole === 'QC' && status === 'approved') {
                // Save data before approving if edits made
                const categoryKey = getCategoryKey();
                const dataKey = `${sPrefix}_data`;

                let existingData = {};
                if (initialData?.inspectionData?.[dataKey]) {
                    existingData = typeof initialData.inspectionData[dataKey] === 'string'
                        ? JSON.parse(initialData.inspectionData[dataKey])
                        : initialData.inspectionData[dataKey];
                }

                const currentStageData = {
                    postRtStatus,
                    postPtStatus,
                    assignedQcEngineerId: ndtEngineer, // Renamed
                    productionEngineerName,
                    submissionDate: todayDate,
                    // inputFields removed
                };

                const finalData = {
                    ...existingData,
                    [categoryKey]: {
                        ...existingData[categoryKey],
                        [sPrefix]: currentStageData
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
                        data: finalData
                    }),
                    credentials: "include",
                });
            }

            const payload = {
                jointId: initialData?.id,
                stage: stage, // Dynamic
                status: status,
                engineerId: userId,
                role: role,
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
                const stageName = stage.replace('stage', 'Stage ');
                setSuccess(`${stageName} ${status} successfully`);
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
            <FormAlert type="error" message={error} />
            <FormAlert type="success" message={success} />
            <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg">Basic Information</h3>
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

            <Card>
                <CardHeader className="space-y-4 px-6 pt-6 pb-0">
                    <CardTitle className="flex items-center gap-2">
                        Post Weld Heat Treatment (PWHT) 
                        <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                            Yes
                        </span>
                    </CardTitle>

                    {type === "RT" && (
                        <CardTitle className="flex items-center gap-2">
                            Radiography Testing (RT) 
                            <span className="ml-2 text-xs text-muted-foreground">(After PWHT)</span>
                        </CardTitle>
                    )}

                    {type === "PT" && (
                        <CardTitle className="flex items-center gap-2">
                            Penetrant Testing (PT) 
                            <span className="ml-2 text-xs text-muted-foreground">(After PWHT)</span>
                        </CardTitle>
                    )}

                    <CardTitle className="pt-4">Set Up Inspection by</CardTitle>
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
                                value={initialData?.inspectionData?.[`${sPrefix}_submitted_at`] ? new Date(initialData.inspectionData[`${sPrefix}_submitted_at`]).toLocaleDateString() : todayDate}
                                readOnly
                                className="bg-muted"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ndtEngineer">NDT Engineer:</Label>
                            <Select value={ndtEngineer} onValueChange={setNdtEngineer} disabled={isReview}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select NDT Engineer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ndtEngineers.map((engineer) => (
                                        <SelectItem key={engineer.id} value={engineer.id}>
                                            {engineer.name?.toUpperCase()}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2 items-center">
                        {(() => {
                            const isStageApproved = initialData?.inspectionData?.[`${sPrefix}_status`] === 'approved';

                            if (!isReview) {
                                if (isStageApproved) return null; // Hide save button if approved
                                return (
                                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                                        {isSubmitting ? "Saving..." : `Save & Complete ${stage.replace('stage', 'Stage ')}`}
                                    </Button>
                                )
                            } else {
                                return (
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
                                        {!isStageApproved && (
                                            <>
                                                <Button onClick={() => handleReviewAction('rejected')} variant="outline" disabled={isSubmitting}>
                                                    {isSubmitting ? "Processing..." : "Reject"}
                                                </Button>
                                                <Button onClick={() => handleReviewAction('approved')} className="bg-black hover:bg-gray-800 text-white" disabled={isSubmitting}>
                                                    {isSubmitting ? "Processing..." : "Approve"}
                                                </Button>
                                            </>
                                        )}
                                    </>
                                )
                            }
                        })()}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default Stage7D
