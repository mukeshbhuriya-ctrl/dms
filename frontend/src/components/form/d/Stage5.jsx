import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormAlert } from "@/components/ui/form-alert"

const Stage5D = ({ initialData, inspectionData, isReview = false }) => {
    // Stage 5D: Inspection after full Welding
    const [productionEngineerName, setProductionEngineerName] = useState("")
    const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString())
    const [qcEngineer, setQcEngineer] = useState("") // s5_qc_eng_id
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [userRole, setUserRole] = useState("")
    const [qcEngineers, setQcEngineers] = useState([])

    const [formData, setFormData] = useState({
        visualInspection: "OK",
        rt: "Not Applicable",
        welderNo: "W-888",
        weldingProcess: "GTAW",
        filletSize: "5mm",
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
            const generatedReportNo = `R/${initialData.msnNumber || '000'}/${initialData.jointNo}/5`;
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

        const inspData = inspectionData || initialData?.inspectionData;

        if (inspData) {
            // Basic Info from data_json (CD)
            if (inspData.data_json) {
                try {
                    const rawBasic = typeof inspData.data_json === 'string'
                        ? JSON.parse(inspData.data_json)
                        : inspData.data_json;
                    const basicInfo = rawBasic?.cd || {};

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

            if (inspData.s5_qc_eng_id) setQcEngineer(inspData.s5_qc_eng_id);

            if (inspData.s5_data) {
                try {
                    const rawData = typeof inspData.s5_data === 'string' ? JSON.parse(inspData.s5_data) : inspData.s5_data;
                    const s5Data = rawData?.cd?.s5 || rawData?.cd || rawData || {}; // Nested key s5

                    if (s5Data.productionEngineerName) setProductionEngineerName(s5Data.productionEngineerName);
                    if (s5Data.submissionDate) setTodayDate(s5Data.submissionDate);
                    if (!inspData.s5_qc_eng_id && s5Data.assignedQcEngineerId) setQcEngineer(s5Data.assignedQcEngineerId);

                    setFormData(prev => ({
                        ...prev,
                        visualInspection: s5Data.visualInspection || "OK",
                        rt: s5Data.rt || "Not Applicable",
                        welderNo: s5Data.welderNo || "W-888",
                        weldingProcess: s5Data.weldingProcess || "GTAW",
                        filletSize: s5Data.filletSize || "5mm",
                        date: s5Data.date || prev.date
                    }));
                } catch (e) { console.error("Error parsing s5_data", e) }
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

            const currentStageData = {
                assignedQcEngineerId: qcEngineer,
                productionEngineerName,
                submissionDate: todayDate,
                ...formData
            };

            const inspData = inspectionData || initialData?.inspectionData;
            let existingData = {};
            if (inspData?.s5_data) {
                existingData = typeof inspData.s5_data === 'string' ? JSON.parse(inspData.s5_data) : inspData.s5_data;
            }

            const finalData = {
                ...existingData,
                cd: {
                    ...existingData?.cd,
                    s5: currentStageData
                }
            };

            const payload = {
                jointId: initialData?.id,
                stage: "stage5",
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
                setSuccess("Stage 5 Submitted Successfully");
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

            const inspData = inspectionData || initialData?.inspectionData;
            if (userRole === 'QC' && status === 'approved') {
                let existingData = {};
                if (inspData?.s5_data) {
                    existingData = typeof inspData.s5_data === 'string' ? JSON.parse(inspData.s5_data) : inspData.s5_data;
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
                        s5: currentStageData
                    }
                };
                await fetch(`${backendUrl}/api/wpj/update-stage-status`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
                    body: JSON.stringify({
                        jointId: initialData?.id,
                        stage: "stage5",
                        status: inspData?.s5_status || 'pending',
                        engineerId: userId,
                        role: 'QC',
                        data: finalData
                    }),
                    credentials: "include",
                });
            }

            const payload = {
                jointId: initialData?.id,
                stage: "stage5",
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
                setSuccess(`Stage 5 ${status} Successfully`);
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
                    <CardTitle>Stage 5: Inspection after full Welding</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="border rounded-lg p-4 space-y-4">
                        {/* Additional Info Section if any */}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Visual Inspection</Label>
                            <Select
                                value={formData.visualInspection}
                                onValueChange={(val) => handleFormChange('visualInspection', val)}
                                disabled={isReview}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OK">OK</SelectItem>
                                    <SelectItem value="Not OK">Not OK</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>R.T. (if applicable)</Label>
                            <Select
                                value={formData.rt}
                                onValueChange={(val) => handleFormChange('rt', val)}
                                disabled={isReview}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OK">OK</SelectItem>
                                    <SelectItem value="Not OK">Not OK</SelectItem>
                                    <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Welder No.</Label>
                            <Input
                                value={formData.welderNo}
                                onChange={(e) => handleFormChange('welderNo', e.target.value)}
                                disabled={isReview}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Welding process</Label>
                            <Input
                                value={formData.weldingProcess}
                                onChange={(e) => handleFormChange('weldingProcess', e.target.value)}
                                disabled={isReview}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Fillet size</Label>
                            <Input
                                value={formData.filletSize}
                                onChange={(e) => handleFormChange('filletSize', e.target.value)}
                                disabled={isReview}
                            />
                        </div>
                    </div>

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
                                    value={inspectionData?.s5_submitted_at ? new Date(inspectionData.s5_submitted_at).toLocaleDateString() : todayDate}
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
                                    {isSubmitting ? "Saving..." : "Save & Complete Stage 5"}
                                </Button>
                            ) : (
                                <>
                                    {(isReview || inspectionData?.s5_approved_at) && (
                                        <Input
                                            value={`Approve Date: ${inspectionData?.s5_approved_at ? new Date(inspectionData.s5_approved_at).toLocaleDateString() : new Date().toLocaleDateString()}`}
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

export default Stage5D
