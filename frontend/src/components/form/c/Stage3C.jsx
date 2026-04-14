import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormAlert } from "@/components/ui/form-alert"
import api from "@/api/api.client"
import QCReviewSection from "@/components/wpj/QCReviewSection"

const Stage3C = ({ initialData, isReview = false, readOnly = false, stage = "stage3", onSuccess  }) => {
    const sPrefix = stage.replace('stage', 's');
    const [formData, setFormData] = useState({
        welderNumber: "",
        overlayPt: "",
        date: new Date().toLocaleDateString()
    })

    const [productionEngineerName, setProductionEngineerName] = useState("")
    const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString())
    const [selectedQcGroupId, setSelectedQcGroupId] = useState("")
    const [qcRemarks, setQcRemarks] = useState("")
    const [qcGroups, setQcGroups] = useState([])
    const [isSubmitting, setIsSubmitting] = useState(false)
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

    // Fetch QC Groups
    useEffect(() => {
        const fetchQcGroups = async () => {
            try {
                const response = await api.get('/api/qc-groups');
                if (response && response.success) {
                    setQcGroups(response.data || []);
                }
            } catch (error) {
                console.error("Error fetching QC groups:", error);
            }
        };
        fetchQcGroups();
    }, []);

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
                    
                    if (insp[`${sPrefix}_assigned_qc_group_id`]) {
                        setSelectedQcGroupId(insp[`${sPrefix}_assigned_qc_group_id`]);
                    } else if (sData.assignedQcGroupId) {
                        setSelectedQcGroupId(sData.assignedQcGroupId);
                    }

                } catch (e) {
                    console.error(`Error parsing ${sPrefix}_data`, e)
                }
            }
            // Fallback / Override from columns if JSON missing/incomplete
            if (insp[`${sPrefix}_remarks`]) setQcRemarks(insp[`${sPrefix}_remarks`]);
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

            if (!selectedQcGroupId) {
                setAlert({ show: true, type: "error", message: "Please select QC Group" });
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
                assignedQcGroupId: selectedQcGroupId,
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

            const basicInfo = {
                [categoryKey]: {
                    msnNumber: initialData?.msnNumber,
                    equipment: initialData?.equipment,
                    drgNo: initialData?.drgNo,
                }
            };

            const payload = {
                jointId: initialData?.id,
                stage: stage,
                status: "pending",
                engineerId: userId,
                role: "PROD",
                data: stageData,
                basicInfo: basicInfo
            }

            const res = await api.post("/api/wpj/update-stage-status", payload);

            if (res.success) {
                setAlert({ show: true, type: 'success', message: `${stage.replace('stage', 'Stage ')} submitted successfully` });
                setTimeout(() => { if (onSuccess) onSuccess(); }, 1500);
            } else {
                setAlert({ show: true, type: 'error', message: res.message || "Submission failed" });
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
                    assignedQcGroupId: selectedQcGroupId,
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

                const basicInfo = {
                    [categoryKey]: {
                        msnNumber: initialData?.msnNumber,
                        equipment: initialData?.equipment,
                        drgNo: initialData?.drgNo,
                    }
                };

                await api.post("/api/wpj/update-stage-status", {
                    jointId: initialData?.id,
                    stage: stage,
                    status: status,
                    engineerId: userId,
                    role: 'QC',
                    data: stageData,
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
                setAlert({ show: true, type: 'success', message: `${stage.replace('stage', 'Stage ')} ${status} successfully` });
                setTimeout(() => { if (onSuccess) onSuccess(); }, 1500);
            } else {
                setAlert({ show: true, type: 'error', message: res.message || "Review action failed" });
            }
        } catch (error) {
            console.error(error);
            setAlert({ show: true, type: 'error', message: "Error processing review" });
        } finally {
            setIsSubmitting(false);
        }
    }


      const isReadOnly = readOnly || (isReview && userRole !== 'QC');

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
                                disabled={isReadOnly}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Overlay PT (If applicable)</Label>
                            <Input
                                value={formData.overlayPt}
                                placeholder='Enter Overlay PT (If applicable)'
                                onChange={(e) => handleChange('overlayPt', e.target.value)}
                                disabled={isReadOnly}
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

                        {/* Shared QC Review & Approval Section */}
                        {!readOnly && (

                          <QCReviewSection
                            isReview={isReview}
                            userRole={userRole}
                            status={initialData?.inspectionData?.[`${sPrefix}_status`]}
                            remarks={qcRemarks}
                            setRemarks={setQcRemarks}
                            onAction={handleReviewAction}
                            isSubmitting={isSubmitting}
                            reviewDate={
                                initialData?.inspectionData?.[`${sPrefix}_approved_at`] ? new Date(initialData.inspectionData[`${sPrefix}_approved_at`]).toLocaleString() :
                                    initialData?.inspectionData?.[`${sPrefix}_rejected_at`] ? new Date(initialData.inspectionData[`${sPrefix}_rejected_at`]).toLocaleString() : ""
                            }
                        />

                        )}

                        {!isReview && !readOnly && (
                            <div className="mt-12 flex justify-end pb-10">
                                <Button onClick={handleSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? "Processing..." : `Save & Complete ${stage.replace('stage', 'Stage ')}`}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default Stage3C
