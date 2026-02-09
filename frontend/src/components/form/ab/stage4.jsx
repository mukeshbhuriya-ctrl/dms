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

function Stage4({ initialData, inspectionData, isReview = false }) {
    const [productionEngineerName, setProductionEngineerName] = useState("")
    const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString())
    const [ndtEngineer, setNdtEngineer] = useState("")
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

            const generatedReportNo = `R/${initialData.msnNumber || '000'}/${initialData.jointNo}/4`;

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

                // Stage 4 requires NDT Engineer. User requested to use QC_ENGINEER list for this.
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
        if (initialData?.jointCategory === 'C' || initialData?.jointCategory === 'D') return 'cd';
        return 'ab';
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

            if (inspectionData.s4_qc_eng_id) {
                setNdtEngineer(inspectionData.s4_qc_eng_id);
            }
            if (inspectionData.s4_prod_eng_name) {
                setProductionEngineerName(inspectionData.s4_prod_eng_name);
            }

            if (inspectionData.s4_data) {
                try {
                    const rawData = typeof inspectionData.s4_data === 'string' ? JSON.parse(inspectionData.s4_data) : inspectionData.s4_data;
                    // Check nested s4 key: { ab: { s4: ... } } or legacy
                    const s4Data = rawData?.[categoryKey]?.s4 || rawData?.[categoryKey] || rawData || {};

                    if (s4Data?.productionEngineerName) setProductionEngineerName(s4Data.productionEngineerName);
                    if (s4Data?.submissionDate) setTodayDate(s4Data.submissionDate);
                    if (!inspectionData.s4_qc_eng_id && s4Data?.assignedQcEngineerId) {
                        setNdtEngineer(s4Data.assignedQcEngineerId);
                    }
                    // Legacy fallback check for older NDT key
                    if (!inspectionData.s4_qc_eng_id && !s4Data?.assignedQcEngineerId && s4Data?.assignedNdtEngineerId) {
                        setNdtEngineer(s4Data.assignedNdtEngineerId);
                    }

                    // Legacy fallback
                    if (s4Data?.inputFields && !inspectionData.data_json) {
                        setInputFields(prev => ({ ...prev, ...s4Data.inputFields }));
                    }
                } catch (e) { console.error("Error parsing s4_data", e) }
            }
        }
    }, [inspectionData, initialData]);

    // ReadOnly Condition: Review mode AND not QC
    const isReadOnly = isReview && userRole !== 'QC';

    const handleSubmit = async () => {
        setIsSubmitting(true)
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
            const authData = localStorage.getItem("user_auth")
            let token = null
            let userId = null;
            let role = 'PROD'; // Default submitter

            if (authData) {
                const parsed = JSON.parse(authData)
                token = parsed?.payload?.token || parsed?.token
                userId = parsed?.payload?.user?.id || parsed?.user?.id
            }

            if (!ndtEngineer) {
                alert("Please select NDT Engineer");
                setIsSubmitting(false);
                return;
            }

            const categoryKey = getCategoryKey();
            let existingData = {};
            if (initialData?.inspectionData?.s4_data) {
                existingData = typeof initialData.inspectionData.s4_data === 'string'
                    ? JSON.parse(initialData.inspectionData.s4_data)
                    : initialData.inspectionData.s4_data;
            }

            const currentStageData = {
                assignedQcEngineerId: ndtEngineer, // Renamed from assignedNdtEngineerId
                productionEngineerName,
                submissionDate: todayDate,
                // inputFields removed
            };

            const finalData = {
                ...existingData,
                [categoryKey]: {
                    ...existingData[categoryKey],
                    s4: currentStageData
                }
            };



            const payload = {
                jointId: initialData?.id,
                stage: "stage4",
                status: "pending", // Pending approval
                engineerId: userId,
                role: role, // PROD
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
                setSuccess("Stage 4 (RT) submitted successfully");
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
                let existingData = {};
                if (initialData?.inspectionData?.s4_data) {
                    existingData = typeof initialData.inspectionData.s4_data === 'string'
                        ? JSON.parse(initialData.inspectionData.s4_data)
                        : initialData.inspectionData.s4_data;
                }
                const currentStageData = {
                    assignedQcEngineerId: ndtEngineer, // Renamed
                    productionEngineerName,
                    submissionDate: todayDate,
                    // inputFields removed
                };
                const finalData = {
                    ...existingData,
                    [categoryKey]: {
                        ...existingData[categoryKey],
                        s4: currentStageData
                    }
                };



                await fetch(`${backendUrl}/api/wpj/update-stage-status`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
                    body: JSON.stringify({
                        jointId: initialData?.id,
                        stage: "stage4",
                        status: initialData?.inspectionData?.s4_status || 'pending',
                        engineerId: userId,
                        role: 'QC',
                        data: finalData
                    }),
                    credentials: "include",
                });
            }

            const payload = {
                jointId: initialData?.id,
                stage: "stage4",
                status: status,
                engineerId: userId,
                role: role,
                data: {}
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
                setSuccess(`Stage 4 ${status} successfully`);
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
                    <CardTitle>Radiography Testing (RT)</CardTitle>
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
                                value={initialData?.inspectionData?.s4_submitted_at ? new Date(initialData.inspectionData.s4_submitted_at).toLocaleDateString() : todayDate}
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
                        {!isReview ? (
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? "Saving..." : "Save & Complete Stage 4"}
                            </Button>
                        ) : (
                            <>
                                {(isReview || initialData?.inspectionData?.s4_approved_at) && (
                                    <Input
                                        type="text"
                                        value={`Approve Date: ${initialData?.inspectionData?.s4_approved_at ? new Date(initialData.inspectionData.s4_approved_at).toLocaleDateString() : new Date().toLocaleDateString()}`}
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

export default Stage4
