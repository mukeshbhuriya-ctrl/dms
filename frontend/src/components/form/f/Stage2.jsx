import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormAlert } from "@/components/ui/form-alert"

const Stage2F = ({ initialData, inspectionData, isReview }) => {
    const [formData, setFormData] = useState({
        welderNumber: "",
        weldingProcess: ""
    })

    const [productionEngineerName, setProductionEngineerName] = useState("")
    const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString())
    const [qeEngineer, setQeEngineer] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [qeEngineers, setQeEngineers] = useState([])
    const [userRole, setUserRole] = useState("")

    const [alert, setAlert] = useState({ show: false, type: 'success', message: '' })

    useEffect(() => {
        const authData = localStorage.getItem("user_auth")
        if (authData) {
            try {
                const parsed = JSON.parse(authData)
                const user = parsed?.payload?.user || parsed?.user
                if (user?.name && !isReview) {
                    setProductionEngineerName(user.name)
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

    // Fetch QC Engineers
    useEffect(() => {
        const fetchQeEngineers = async () => {
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
                    setQeEngineers(data.data || [])
                }
            } catch (error) {
                console.error("Error fetching QE Engineers:", error)
            }
        }
        fetchQeEngineers()
    }, [])

    const getCategoryKey = () => 'f';

    useEffect(() => {
        if (inspectionData) {
            const categoryKey = getCategoryKey();

            // Try to load s2_data
            if (inspectionData.s2_data) {
                try {
                    const rawData = typeof inspectionData.s2_data === 'string' ? JSON.parse(inspectionData.s2_data) : inspectionData.s2_data;
                    const s2Data = rawData?.[categoryKey]?.s2 || rawData?.[categoryKey] || rawData || {};

                    setFormData(prev => ({
                        ...prev,
                        welderNumber: s2Data.welderNumber || prev.welderNumber,
                        weldingProcess: s2Data.weldingProcess || prev.weldingProcess
                    }));

                    if (s2Data.productionEngineerName) setProductionEngineerName(s2Data.productionEngineerName);
                    if (s2Data.submissionDate) setTodayDate(s2Data.submissionDate);
                    if (s2Data.assignedQcEngineerId) setQeEngineer(s2Data.assignedQcEngineerId);

                } catch (e) {
                    console.error("Error parsing s2_data", e)
                }
            }

            if (inspectionData.s2_qc_eng_id && !qeEngineer) setQeEngineer(inspectionData.s2_qc_eng_id);
            if (inspectionData.s2_prod_eng_name) setProductionEngineerName(inspectionData.s2_prod_eng_name);
        }
    }, [inspectionData])

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async () => {
        setIsSubmitting(true)
        setAlert({ show: false, type: 'success', message: '' })
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

            if (!qeEngineer) {
                setAlert({ show: true, type: "error", message: "Please select QC Engineer" });
                setIsSubmitting(false);
                return;
            }

            const categoryKey = getCategoryKey();

            // Fetch existing Stage Data
            let existingStageData = {};
            if (inspectionData?.s2_data) {
                existingStageData = typeof inspectionData.s2_data === 'string'
                    ? JSON.parse(inspectionData.s2_data)
                    : inspectionData.s2_data;
            }

            const currentStageInnerData = {
                ...formData,
                assignedQcEngineerId: qeEngineer,
                productionEngineerName: productionEngineerName,
                submissionDate: todayDate
            };

            const stageData = {
                ...existingStageData,
                [categoryKey]: {
                    ...existingStageData[categoryKey],
                    s2: currentStageInnerData
                }
            };

            const payload = {
                jointId: initialData?.id,
                stage: "stage2",
                status: "pending",
                engineerId: userId,
                role: role,
                data: stageData,
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
                setAlert({ show: true, type: 'success', message: "Stage 2 submitted successfully" });
                setTimeout(() => window.location.reload(), 1500);
            } else {
                setAlert({ show: true, type: 'error', message: data.message || "Submission failed" });
            }
        } catch (error) {
            console.error(error);
            setAlert({ show: true, type: 'error', message: "Error submitting form" });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleReviewAction = async (status) => {
        setIsSubmitting(true);
        setAlert({ show: false, type: 'success', message: '' })
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

            // If Approved by QC, save changes first
            if (userRole === 'QC' && status === 'approved') {
                const categoryKey = getCategoryKey();

                let existingStageData = {};
                if (inspectionData?.s2_data) {
                    existingStageData = typeof inspectionData.s2_data === 'string'
                        ? JSON.parse(inspectionData.s2_data)
                        : inspectionData.s2_data;
                }

                const currentStageInnerData = {
                    ...formData,
                    assignedQcEngineerId: qeEngineer,
                    productionEngineerName,
                    submissionDate: todayDate
                };

                const stageData = {
                    ...existingStageData,
                    [categoryKey]: {
                        ...existingStageData[categoryKey],
                        s2: currentStageInnerData
                    }
                };

                await fetch(`${backendUrl}/api/wpj/update-stage-status`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
                    body: JSON.stringify({
                        jointId: initialData?.id,
                        stage: "stage2",
                        status: status,
                        engineerId: userId,
                        role: 'QC',
                        data: stageData
                    }),
                    credentials: "include",
                });
            }

            const payload = {
                jointId: initialData?.id,
                stage: "stage2",
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
                setAlert({ show: true, type: 'success', message: `Stage 2 ${status} successfully` });
                setTimeout(() => window.location.reload(), 1500);
            } else {
                setAlert({ show: true, type: 'error', message: data.message || "Review action failed" });
            }
        } catch (error) {
            console.error(error);
            setAlert({ show: true, type: 'error', message: "Error processing review" });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Stage 2: WELD Visual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {alert.show && <FormAlert type={alert.type} message={alert.message} onClose={() => setAlert({ ...alert, show: false })} />}

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

                {/* Stage 2 Fields */}
                <div className="space-y-4 border-t pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Welder Number</Label>
                            <Input
                                value={formData.welderNumber}
                                onChange={(e) => handleChange('welderNumber', e.target.value)}
                                disabled={isReview && userRole !== 'QC'}
                                placeholder="Enter Welder Number"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Welding Process</Label>
                            <Input
                                value={formData.weldingProcess}
                                onChange={(e) => handleChange('weldingProcess', e.target.value)}
                                disabled={isReview && userRole !== 'QC'}
                                placeholder="Enter Welding Process"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-lg">Visual Inspection by</h3>
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
                                value={inspectionData?.s2_submitted_at ? new Date(inspectionData.s2_submitted_at).toLocaleDateString() : todayDate}
                                readOnly
                                className="bg-muted"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>QC Engineer:</Label>
                            <Select value={qeEngineer} onValueChange={setQeEngineer} disabled={isReview}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select QC Engineer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {qeEngineers.map((engineer) => (
                                        <SelectItem key={engineer.id} value={engineer.id}>
                                            {engineer.name?.toUpperCase()}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>



                    <div className="flex justify-end gap-2 items-center pt-4">
                        {!isReview ? (
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? "Saving..." : "Save & Complete Stage 2"}
                            </Button>
                        ) : (
                            <>
                                {(isReview || inspectionData?.s2_approved_at) && (
                                    <Input
                                        type="text"
                                        value={`Approve Date: ${inspectionData?.s2_approved_at ? new Date(inspectionData.s2_approved_at).toLocaleDateString() : new Date().toLocaleDateString()}`}
                                        readOnly
                                        className="bg-muted w-auto min-w-[200px] text-center h-9 font-medium"
                                        placeholder="Approve Date"
                                    />
                                )}
                                {!inspectionData?.s2_approved_at && (
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
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default Stage2F
