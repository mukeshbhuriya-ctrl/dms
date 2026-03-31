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

function Stage3F({ initialData, inspectionData, isReview = false, stage = "stage3", }) {
    const [productionEngineerName, setProductionEngineerName] = useState("")
    const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString())
    const [ndtEngineer, setNdtEngineer] = useState("")
    // Extra fields
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

    const getCategoryKey = () => initialData?.joint_type?.toLowerCase() || initialData?.jointCategory?.toLowerCase() || 'f';

    useEffect(() => {
        if (inspectionData) {
            const categoryKey = getCategoryKey();
            const stagePrefix = stage === 'stage3' ? 's3' : 's4';
            const dataKey = `${stagePrefix}_data`;
            const ndtEngIdKey = `${stagePrefix}_qc_eng_id`;
            const prodEngNameKey = `${stagePrefix}_prod_eng_name`;

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
            const qcEngIdKey = `${stagePrefix}_qc_eng_id`;
            if (!inspectionData[ndtEngIdKey] && inspectionData[qcEngIdKey]) {
                setNdtEngineer(inspectionData[qcEngIdKey]);
            }

            if (inspectionData[prodEngNameKey]) setProductionEngineerName(inspectionData[prodEngNameKey]);

            if (inspectionData[dataKey]) {
                try {
                    const rawData = typeof inspectionData[dataKey] === 'string' ? JSON.parse(inspectionData[dataKey]) : inspectionData[dataKey];
                    const stageData = rawData?.[categoryKey]?.[stagePrefix] || rawData?.[categoryKey] || rawData || {};

                    if (stageData?.productionEngineerName) setProductionEngineerName(stageData.productionEngineerName);
                    if (stageData?.submissionDate) setTodayDate(stageData.submissionDate);

                    if (!inspectionData[ndtEngIdKey] && !inspectionData[qcEngIdKey]) {
                        if (stageData?.assignedQcEngineerId) setNdtEngineer(stageData.assignedQcEngineerId);
                        else if (stageData?.assignedNdtEngineerId) setNdtEngineer(stageData.assignedNdtEngineerId);
                    }

                    if (stageData?.postRtStatus) setPostRtStatus(stageData.postRtStatus);
                    if (stageData?.postPtStatus) setPostPtStatus(stageData.postPtStatus);

                } catch (e) { console.error(`Error parsing ${dataKey}`, e) }
            }
        }
    }, [inspectionData, initialData, stage]);

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
            const stagePrefix = stage === 'stage3' ? 's3' : 's4';
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
                assignedQcEngineerId: ndtEngineer,
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

            const payload = {
                jointId: initialData?.id,
                stage: stage,
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
                const stageName = stage === 'stage4' ? 'Stage 4' : 'Stage 3';
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
            const role = 'QC';

            if (authData) {
                const parsed = JSON.parse(authData)
                token = parsed?.payload?.token || parsed?.token
                userId = parsed?.payload?.user?.id || parsed?.user?.id
            }

            if (userRole === 'QC' && status === 'approved') {
                const categoryKey = getCategoryKey();
                const stagePrefix = stage === 'stage4' ? 's4' : 's3';
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
                    assignedQcEngineerId: ndtEngineer,
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
                stage: stage,
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
                const stageName = stage === 'stage4' ? 'Stage 4' : 'Stage 3';
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
                <CardHeader>
                    <CardTitle>Post Weld Heat Treatment (PWHT) {initialData?.pwht && (
                        <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                            Yes
                        </span>
                    )}</CardTitle>
                </CardHeader>
                <CardHeader>
                    {stage === "stage3" && initialData?.pwht && (
                        <CardTitle>Radiography Testing (RT) <span className="ml-2 text-xs text-muted-foreground">
                            (After PWHT)
                        </span></CardTitle>
                    )}

                    {stage === "stage4" && initialData?.pwht && (
                        <CardTitle>Penetrant Testing (PT) <span className="ml-2 text-xs text-muted-foreground">
                            (After PWHT)
                        </span></CardTitle>
                    )}
                </CardHeader>

                <CardContent className="space-y-2">
                    <div className="border-b pb-2"></div>
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Set Up Inspection by</h3>
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
                                    value={initialData?.inspectionData?.[`${stage === 'stage4' ? 's4' : 's3'}_submitted_at`] ? new Date(initialData.inspectionData[`${stage === 'stage4' ? 's4' : 's3'}_submitted_at`]).toLocaleDateString() : todayDate}
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
                                const stagePrefix = stage === 'stage4' ? 's4' : 's3';
                                const isStageApproved = initialData?.inspectionData?.[`${stagePrefix}_status`] === 'approved';

                                if (!isReview) {
                                    if (isStageApproved) return null;
                                    return (
                                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                                            {isSubmitting ? "Saving..." : `Save & Complete ${stage === 'stage4' ? 'Stage 4' : 'Stage 3'}`}
                                        </Button>
                                    )
                                } else {
                                    return (
                                        <>
                                            {(isReview || initialData?.inspectionData?.[`${stagePrefix}_approved_at`]) && (
                                                <Input
                                                    type="text"
                                                    value={`Approve Date: ${initialData?.inspectionData?.[`${stagePrefix}_approved_at`] ? new Date(initialData.inspectionData[`${stagePrefix}_approved_at`]).toLocaleDateString() : new Date().toLocaleDateString()}`}
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
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default Stage3F
