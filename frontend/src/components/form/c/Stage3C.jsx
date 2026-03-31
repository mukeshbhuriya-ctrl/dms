import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormAlert } from "@/components/ui/form-alert"

const Stage3C = ({ initialData, isReview, stage = "stage3" }) => {
    const sPrefix = stage.replace('stage', 's');
    const [formData, setFormData] = useState({
        welderNumber: "",
        overlayPt: "",
        date: new Date().toLocaleDateString()
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
        return initialData?.jointCategory?.toLowerCase() || initialData?.joint_type?.toLowerCase() || 'c';
    }

    useEffect(() => {
        if (initialData?.inspectionData) {
            const categoryKey = getCategoryKey();
            const insp = initialData.inspectionData;

            if (insp[`${sPrefix}_data`]) {
                try {
                    const rawData = typeof insp[`${sPrefix}_data`] === 'string' ? JSON.parse(insp[`${sPrefix}_data`]) : insp[`${sPrefix}_data`];
                    const sData = rawData?.[categoryKey]?.[sPrefix] || rawData?.[categoryKey] || rawData || {};

                    setFormData(prev => ({
                        ...prev,
                        welderNumber: sData.welderNumber || prev.welderNumber,
                        overlayPt: sData.overlayPt || prev.overlayPt,
                        date: sData.date || prev.date,
                    }));

                    if (sData.productionEngineerName) setProductionEngineerName(sData.productionEngineerName);
                    if (sData.submissionDate) setTodayDate(sData.submissionDate);
                    if (sData.assignedQcEngineerId) setQeEngineer(sData.assignedQcEngineerId);

                } catch (e) {
                    console.error(`Error parsing ${sPrefix}_data`, e)
                }
            }
            // Fallback / Override from columns if JSON missing/incomplete
            if (insp[`${sPrefix}_qc_eng_id`] && !qeEngineer) setQeEngineer(insp[`${sPrefix}_qc_eng_id`]);
            if (insp[`${sPrefix}_prod_eng_name`]) setProductionEngineerName(insp[`${sPrefix}_prod_eng_name`]);
        }
    }, [initialData])

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
                setAlert({ show: true, type: "error", message: "Please select QE Engineer" });
                setIsSubmitting(false);
                return;
            }

            const categoryKey = getCategoryKey();

            // Fetch existing Stage Data
            let existingStageData = {};
            if (initialData?.inspectionData?.[`${sPrefix}_data`]) {
                existingStageData = typeof initialData.inspectionData[`${sPrefix}_data`] === 'string'
                    ? JSON.parse(initialData.inspectionData[`${sPrefix}_data`])
                    : initialData.inspectionData[`${sPrefix}_data`];
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
                    [sPrefix]: currentStageInnerData
                }
            };

            const payload = {
                jointId: initialData?.id,
                stage: stage,
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
                setAlert({ show: true, type: 'success', message: `${stage.replace('stage', 'Stage ')} submitted successfully` });
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
                if (initialData?.inspectionData?.[`${sPrefix}_data`]) {
                    existingStageData = typeof initialData.inspectionData[`${sPrefix}_data`] === 'string'
                        ? JSON.parse(initialData.inspectionData[`${sPrefix}_data`])
                        : initialData.inspectionData[`${sPrefix}_data`];
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
                        [sPrefix]: currentStageInnerData
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
                        data: stageData
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
                setAlert({ show: true, type: 'success', message: `${stage.replace('stage', 'Stage ')} ${status} successfully` });
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
        <div className="space-y-6">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Weld Visual</CardTitle>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Welder Number</Label>
                            <Input
                                value={formData.welderNumber}
                                placeholder='Enter Welder Number'
                                onChange={(e) => handleChange('welderNumber', e.target.value)}
                                disabled={isReview && userRole !== 'QC'}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Overlay PT (If applicable)</Label>
                            <Input
                                value={formData.overlayPt}
                                placeholder='Enter Overlay PT (If applicable)'
                                onChange={(e) => handleChange('overlayPt', e.target.value)}
                                disabled={isReview && userRole !== 'QC'}
                            />
                        </div>
                    </div>

                    {/* Set Up Inspection Section Matching Stage1.jsx */}
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
                                    value={initialData?.inspectionData?.[`${sPrefix}_submitted_at`] ? new Date(initialData.inspectionData[`${sPrefix}_submitted_at`]).toLocaleDateString() : todayDate}
                                    readOnly
                                    className="bg-muted"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>QE Engineer:</Label>
                                <Select value={qeEngineer} onValueChange={setQeEngineer} disabled={isReview}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select QE Engineer" />
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
                                    {isSubmitting ? "Saving..." : `Save & Complete ${stage.replace('stage', 'Stage ')}`}
                                </Button>
                            ) : (
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
        </div>
    )
}

export default Stage3C
