import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormAlert } from "@/components/ui/form-alert"
import api from "@/api/api.client"
import QCReviewSection from "@/components/wpj/QCReviewSection"

const Stage2F = ({ initialData, inspectionData, isReview, onSuccess }) => {
    const [formData, setFormData] = useState({
        welderNumber: "",
        weldingProcess: ""
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

    const getCategoryKey = () => initialData?.joint_type?.toLowerCase() || initialData?.jointCategory?.toLowerCase() || 'f';

    useEffect(() => {
        if (inspectionData) {
            const categoryKey = getCategoryKey();
            setQcRemarks(inspectionData.s2_remarks || "");

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

                    if (inspectionData.s2_assigned_qc_group_id) {
                        setSelectedQcGroupId(inspectionData.s2_assigned_qc_group_id);
                    } else if (s2Data.assignedQcGroupId) {
                        setSelectedQcGroupId(s2Data.assignedQcGroupId);
                    }

                } catch (e) {
                    console.error("Error parsing s2_data", e)
                }
            }
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
            const authData = localStorage.getItem("user_auth")
            let userId = null;

            if (authData) {
                const parsed = JSON.parse(authData)
                userId = parsed?.payload?.user?.id || parsed?.user?.id
            }

            if (!selectedQcGroupId) {
                setAlert({ show: true, type: "error", message: "Please select QC Group" });
                setIsSubmitting(false);
                return;
            }

            const categoryKey = getCategoryKey();

            let existingStageData = {};
            if (inspectionData?.s2_data) {
                existingStageData = typeof inspectionData.s2_data === 'string'
                    ? JSON.parse(inspectionData.s2_data)
                    : inspectionData.s2_data;
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
                    s2: currentStageInnerData
                }
            };

            const basicInfo = {
                [categoryKey]: {
                    msnNumber: initialData?.msnNumber,
                    equipment: initialData?.equipment,
                    drgNo: initialData?.drgNo,
                    tagNo: initialData?.tagNo,
                }
            };

            const payload = {
                jointId: initialData?.id,
                stage: "stage2",
                status: "pending",
                engineerId: userId,
                role: "PROD",
                data: stageData,
                basicInfo: basicInfo
            }

            const res = await api.post("/api/wpj/update-stage-status", payload);

            if (res.success) {
                setAlert({ show: true, type: 'success', message: "Stage 2 submitted successfully" });
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
            const authData = localStorage.getItem("user_auth")
            let userId = null;

            if (authData) {
                const parsed = JSON.parse(authData)
                userId = parsed?.payload?.user?.id || parsed?.user?.id
            }

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
                    assignedQcGroupId: selectedQcGroupId,
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

                const basicInfo = {
                    [categoryKey]: {
                        msnNumber: initialData?.msnNumber,
                        equipment: initialData?.equipment,
                        drgNo: initialData?.drgNo,
                        tagNo: initialData?.tagNo,
                    }
                };

                await api.post("/api/wpj/update-stage-status", {
                    jointId: initialData?.id,
                    stage: "stage2",
                    status: status,
                    engineerId: userId,
                    role: 'QC',
                    data: stageData,
                    basicInfo: basicInfo
                });
            }

            const res = await api.post("/api/wpj/review-stage", {
                jointId: initialData?.id,
                stage: "stage2",
                status: status,
                engineerId: userId,
                role: 'QC',
                remarks: qcRemarks
            });

            if (res.success) {
                setAlert({ show: true, type: 'success', message: `Stage 2 ${status} successfully` });
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

                    {/* Shared QC Review Section */}
                    <QCReviewSection
                        isReview={isReview}
                        userRole={userRole}
                        status={inspectionData?.s2_status}
                        remarks={qcRemarks}
                        setRemarks={setQcRemarks}
                        onAction={handleReviewAction}
                        isSubmitting={isSubmitting}
                        reviewDate={
                            inspectionData?.s2_approved_at ? new Date(inspectionData.s2_approved_at).toLocaleString() :
                                inspectionData?.s2_rejected_at ? new Date(inspectionData.s2_rejected_at).toLocaleString() : ""
                        }
                    />

                    {!isReview && (
                        <div className="mt-12 flex justify-end pb-10">
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? "Processing..." : "Save & Complete Stage 2"}
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export default Stage2F
