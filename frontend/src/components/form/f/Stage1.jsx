import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormAlert } from "@/components/ui/form-alert"
import { Checkbox } from "@/components/ui/checkbox"

const Stage1F = ({ initialData, inspectionData, isReview, onSuccess  }) => {
    const [formData, setFormData] = useState({
        materialIdMarks: "Available",
        tackWelder: ""
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


    const getCategoryKey = () => {
        return initialData?.jointCategory?.toLowerCase() || initialData?.joint_type?.toLowerCase() || 'f';
    }

    useEffect(() => {
        if (inspectionData) {
            const categoryKey = getCategoryKey();

            // Try to load s1_data
            if (inspectionData.s1_data) {
                try {
                    const rawData = typeof inspectionData.s1_data === 'string' ? JSON.parse(inspectionData.s1_data) : inspectionData.s1_data;
                    const s1Data = rawData?.[categoryKey]?.s1 || rawData?.[categoryKey] || rawData || {};

                    setFormData(prev => ({
                        ...prev,
                        materialIdMarks: s1Data.materialIdMarks || prev.materialIdMarks,
                        tackWelder: s1Data.tackWelder || prev.tackWelder
                    }));

                    if (s1Data.productionEngineerName) setProductionEngineerName(s1Data.productionEngineerName);
                    if (s1Data.submissionDate) setTodayDate(s1Data.submissionDate);
                    if (s1Data.assignedQcEngineerId) setQeEngineer(s1Data.assignedQcEngineerId);

                } catch (e) {
                    console.error("Error parsing s1_data", e)
                }
            }

            if (inspectionData.s1_qc_eng_id && !qeEngineer) setQeEngineer(inspectionData.s1_qc_eng_id);
            if (inspectionData.s1_prod_eng_name) setProductionEngineerName(inspectionData.s1_prod_eng_name);
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
            if (inspectionData?.s1_data) {
                existingStageData = typeof inspectionData.s1_data === 'string'
                    ? JSON.parse(inspectionData.s1_data)
                    : inspectionData.s1_data;
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
                    s1: currentStageInnerData
                }
            };

            const basicInfo = {
                [categoryKey]: {
                    msnNumber: initialData?.msnNumber,
                    equipment: initialData?.equipment,
                    drgNo: initialData?.drgNo,
                }
            };

            const payload = {
                jointId: initialData?.id,
                stage: "stage1",
                status: "pending",
                engineerId: userId,
                role: role,
                data: stageData,
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
                setAlert({ show: true, type: 'success', message: "Stage 1 submitted successfully" });
                setTimeout(() => { if (onSuccess) onSuccess(); }, 1500);
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
                if (inspectionData?.s1_data) {
                    existingStageData = typeof inspectionData.s1_data === 'string'
                        ? JSON.parse(inspectionData.s1_data)
                        : inspectionData.s1_data;
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
                        s1: currentStageInnerData
                    }
                };

                await fetch(`${backendUrl}/api/wpj/update-stage-status`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
                    body: JSON.stringify({
                        jointId: initialData?.id,
                        stage: "stage1",
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
                stage: "stage1",
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
                setAlert({ show: true, type: 'success', message: `Stage 1 ${status} successfully` });
                setTimeout(() => { if (onSuccess) onSuccess(); }, 1500);
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
                <CardTitle>Stage 1: Set Up</CardTitle>
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

                {/* Stage 1 Fields */}
                <div className="space-y-4 border-t pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Characteristics to be checked</Label>
                            <Input value={initialData?.jointNo || ""} readOnly className="bg-muted font-bold" />
                        </div>
                        <div className="space-y-2">
                            <Label>Material identification Marks</Label>
                            <Select
                                value={formData.materialIdMarks}
                                onValueChange={(val) => handleChange('materialIdMarks', val)}
                                disabled={isReview && userRole !== 'QC'}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Available">Available</SelectItem>
                                    <SelectItem value="Not Available">Not Available</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Tack Welder</Label>
                            <Input
                                value={formData.tackWelder}
                                onChange={(e) => handleChange('tackWelder', e.target.value)}
                                disabled={isReview && userRole !== 'QC'}
                                placeholder="Enter Tack Welder Name/ID"
                            />
                        </div>
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
                                value={inspectionData?.s1_submitted_at ? new Date(inspectionData.s1_submitted_at).toLocaleDateString() : todayDate}
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
                                {isSubmitting ? "Saving..." : "Save & Complete Stage 1"}
                            </Button>
                        ) : (
                            <>
                                {(isReview || inspectionData?.s1_approved_at) && (
                                    <Input
                                        type="text"
                                        value={`Approve Date: ${inspectionData?.s1_approved_at ? new Date(inspectionData.s1_approved_at).toLocaleDateString() : new Date().toLocaleDateString()}`}
                                        readOnly
                                        className="bg-muted w-auto min-w-[200px] text-center h-9 font-medium"
                                        placeholder="Approve Date"
                                    />
                                )}
                                {!inspectionData?.s1_approved_at && (
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

export default Stage1F
