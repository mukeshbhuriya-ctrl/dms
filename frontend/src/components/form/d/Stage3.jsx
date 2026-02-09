import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { FormAlert } from "@/components/ui/form-alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const Stage3D = ({ initialData, inspectionData, isReview = false }) => {
    // Stage 3D: Nozzle Opening Inspection
    const [productionEngineerName, setProductionEngineerName] = useState("")
    const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString())
    const [qcEngineer, setQcEngineer] = useState("") // s3_qc_eng_id
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [userRole, setUserRole] = useState("")
    const [qcEngineers, setQcEngineers] = useState([])

    const [formData, setFormData] = useState({
        nozzleNumber: "N1",
        openingSize: "100mm",
        orientation: "0",
        elevation: "1500mm",
        edgePreparation: "V-Groove",
        date: new Date().toLocaleDateString()
    })

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

    // Auth & Role Check
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

    // Fetch QC Engineers
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
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": token ? `Bearer ${token}` : ""
                    }
                })
                const data = await res.json()
                if (res.ok && data.success) {
                    setQcEngineers(data.data || [])
                }
            } catch (error) { console.error("Error fetching QC Engineers:", error) }
        }
        fetchQcEngineers()
    }, [])

    // Load Data
    useEffect(() => {
        if (initialData) {
            setDisplayFields({
                msn: initialData.msnNumber || "",
                client: initialData.client || "",
                poNo: initialData.poNo || "",
            })
            const generatedReportNo = `R/${initialData.msnNumber || '000'}/${initialData.jointNo}/3`;
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

        // Use inspectionData passed as prop OR fall back to initialData.inspectionData
        const inspData = inspectionData || initialData?.inspectionData;

        if (inspData) {
            // Basic Info from data_json (CD)
            if (inspData.data_json) {
                try {
                    const rawBasic = typeof inspData.data_json === 'string'
                        ? JSON.parse(inspData.data_json)
                        : inspData.data_json;
                    const basicInfo = rawBasic?.cd || {}; // Key is 'cd' for this category

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

            if (inspData.s3_qc_eng_id) setQcEngineer(inspData.s3_qc_eng_id);

            if (inspData.s3_data) {
                try {
                    const rawData = typeof inspData.s3_data === 'string' ? JSON.parse(inspData.s3_data) : inspData.s3_data;
                    // Nested key: { cd: { s3: ... } }
                    const s3Data = rawData?.cd?.s3 || rawData?.cd || rawData || {};

                    if (s3Data.productionEngineerName) setProductionEngineerName(s3Data.productionEngineerName);
                    if (s3Data.submissionDate) setTodayDate(s3Data.submissionDate);
                    // Legacy check if saved inside JSON
                    if (!inspData.s3_qc_eng_id && s3Data.assignedQcEngineerId) setQcEngineer(s3Data.assignedQcEngineerId);

                    setFormData(prev => ({
                        ...prev,
                        nozzleNumber: s3Data.nozzleNumber || "",
                        openingSize: s3Data.openingSize || "",
                        orientation: s3Data.orientation || "",
                        elevation: s3Data.elevation || "",
                        edgePreparation: s3Data.edgePreparation || "",
                        date: s3Data.date || prev.date
                    }));
                } catch (e) { console.error("Error parsing s3_data", e) }
            }
        }
    }, [initialData, inspectionData]);

    const handleFormChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setInputFields((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async () => {
        setIsSubmitting(true)
        setError("")
        setSuccess("")
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

            if (!qcEngineer) {
                setError("Please select QC Engineer");
                setIsSubmitting(false);
                return;
            }

            // Prepare Data
            const currentStageData = {
                assignedQcEngineerId: qcEngineer,
                productionEngineerName,
                submissionDate: todayDate,
                ...formData
            };

            // Need to merge with existing C/D data structure
            const inspData = inspectionData || initialData?.inspectionData;
            let existingData = {};
            if (inspData?.s3_data) {
                existingData = typeof inspData.s3_data === 'string' ? JSON.parse(inspData.s3_data) : inspData.s3_data;
            }

            // Structure: { cd: { s3: ... } }
            const finalData = {
                ...existingData,
                cd: {
                    ...existingData?.cd,
                    s3: currentStageData
                }
            };

            const payload = {
                jointId: initialData?.id,
                stage: "stage3",
                status: "pending",
                engineerId: userId,
                role: 'PROD',
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
                setSuccess("Stage 3 Submitted Successfully");
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
        setIsSubmitting(true)
        setError("")
        setSuccess("")
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

            // If Approving, simplify save first if needed, or just status update
            // Ideally we save latest data on approve too
            const inspData = inspectionData || initialData?.inspectionData;
            if (userRole === 'QC' && status === 'approved') {
                // Save logic similar to Submit
                let existingData = {};
                if (inspData?.s3_data) {
                    existingData = typeof inspData.s3_data === 'string' ? JSON.parse(inspData.s3_data) : inspData.s3_data;
                }
                const currentStageData = {
                    assignedQcEngineerId: qcEngineer,
                    productionEngineerName,
                    submissionDate: todayDate,
                    ...formData
                };
                const finalData = {
                    ...existingData,
                    cd: {
                        ...existingData?.cd,
                        s3: currentStageData
                    }
                };
                // Silent save
                await fetch(`${backendUrl}/api/wpj/update-stage-status`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
                    body: JSON.stringify({
                        jointId: initialData?.id,
                        stage: "stage3",
                        status: inspData?.s3_status || 'pending',
                        engineerId: userId,
                        role: 'QC',
                        data: finalData
                    }),
                    credentials: "include",
                });
            }


            const payload = {
                jointId: initialData?.id,
                stage: "stage3",
                status: status,
                engineerId: userId,
                role: 'QC',
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
                setSuccess(`Stage 3 ${status} Successfully`);
                setTimeout(() => window.location.reload(), 1500);
            } else {
                setError(data.message || "Review action failed");
            }

        } catch (error) {
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

            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Stage 3: Nozzle Opening Inspection</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Nozzle Number</Label>
                            <Input
                                value={formData.nozzleNumber}
                                onChange={(e) => handleFormChange('nozzleNumber', e.target.value)}
                                disabled={isReview}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Opening size</Label>
                            <Input
                                value={formData.openingSize}
                                onChange={(e) => handleFormChange('openingSize', e.target.value)}
                                disabled={isReview}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Orientation (°)</Label>
                            <Input
                                value={formData.orientation}
                                onChange={(e) => handleFormChange('orientation', e.target.value)}
                                disabled={isReview}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Elevation</Label>
                            <Input
                                value={formData.elevation}
                                onChange={(e) => handleFormChange('elevation', e.target.value)}
                                disabled={isReview}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Edge preparation</Label>
                            <Input
                                value={formData.edgePreparation}
                                onChange={(e) => handleFormChange('edgePreparation', e.target.value)}
                                disabled={isReview}
                            />
                        </div>
                    </div>

                    {/* Set Up Inspection Section */}
                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="font-semibold text-lg">Set Up Inspection by</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Production Engineer Name:</Label>
                                <Input
                                    value={productionEngineerName}
                                    readOnly
                                    className="bg-muted uppercase"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Date:</Label>
                                <Input
                                    value={inspectionData?.s3_submitted_at ? new Date(inspectionData.s3_submitted_at).toLocaleDateString() : todayDate}
                                    readOnly
                                    className="bg-muted"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>QC Engineer:</Label>
                                <Select value={qcEngineer} onValueChange={setQcEngineer} disabled={isReview}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select QC Engineer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {qcEngineers.map(eng => (
                                            <SelectItem key={eng.id} value={eng.id}>{eng.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 items-center pt-4">
                            {!isReview ? (
                                <Button onClick={handleSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? "Saving..." : "Save & Complete Stage 3"}
                                </Button>
                            ) : (
                                <>
                                    {(isReview || inspectionData?.s3_approved_at) && (
                                        <Input
                                            value={`Approve Date: ${inspectionData?.s3_approved_at ? new Date(inspectionData.s3_approved_at).toLocaleDateString() : new Date().toLocaleDateString()}`}
                                            readOnly
                                            className="bg-muted w-auto min-w-[200px] text-center"
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
                    </div>
                </CardContent>
            </Card>
        </div >
    )
}

export default Stage3D
