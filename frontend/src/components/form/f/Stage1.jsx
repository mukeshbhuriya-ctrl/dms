import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormAlert } from "@/components/ui/form-alert"
import api from "@/api/api.client"
import QCReviewSection from "@/components/wpj/QCReviewSection"

const Stage1F = ({ initialData, inspectionData, isReview = false, readOnly = false, onSuccess }) => {
    const [formData, setFormData] = useState({
        materialIdMarks: "Available",
        tackWelder: ""
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

    const getCategoryKey = () => initialData?.jointCategory?.toLowerCase() || initialData?.joint_type?.toLowerCase() || 'f';

    useEffect(() => {
        if (inspectionData) {
            const categoryKey = getCategoryKey();
            setQcRemarks(inspectionData.s1_remarks || "");

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

                    if (inspectionData.s1_assigned_qc_group_id) {
                        setSelectedQcGroupId(inspectionData.s1_assigned_qc_group_id);
                    } else if (s1Data.assignedQcGroupId) {
                        setSelectedQcGroupId(s1Data.assignedQcGroupId);
                    }

                } catch (e) {
                    console.error("Error parsing s1_data", e)
                }
            }
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
            if (inspectionData?.s1_data) {
                existingStageData = typeof inspectionData.s1_data === 'string'
                    ? JSON.parse(inspectionData.s1_data)
                    : inspectionData.s1_data;
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
                    s1: currentStageInnerData
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
                stage: "stage1",
                status: "pending",
                engineerId: userId,
                role: "PROD",
                data: stageData,
                basicInfo: basicInfo
            }

            const res = await api.post("/api/wpj/update-stage-status", payload);

            if (res.success) {
                setAlert({ show: true, type: 'success', message: "Stage 1 submitted successfully" });
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
                if (inspectionData?.s1_data) {
                    existingStageData = typeof inspectionData.s1_data === 'string'
                        ? JSON.parse(inspectionData.s1_data)
                        : inspectionData.s1_data;
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
                        s1: currentStageInnerData
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
                    stage: "stage1",
                    status: status,
                    engineerId: userId,
                    role: 'QC',
                    data: stageData,
                    basicInfo: basicInfo
                });
            }

            const res = await api.post("/api/wpj/review-stage", {
                jointId: initialData?.id,
                stage: "stage1",
                status: status,
                engineerId: userId,
                role: 'QC',
                remarks: qcRemarks
            });

            if (res.success) {
                setAlert({ show: true, type: 'success', message: `Stage 1 ${status} successfully` });
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
                                disabled={isReadOnly}
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
                                disabled={isReadOnly}
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
                    {!readOnly && (

                      <QCReviewSection
                        isReview={isReview}
                        userRole={userRole}
                        status={inspectionData?.s1_status}
                        remarks={qcRemarks}
                        setRemarks={setQcRemarks}
                        onAction={handleReviewAction}
                        isSubmitting={isSubmitting}
                        reviewDate={
                            inspectionData?.s1_approved_at ? new Date(inspectionData.s1_approved_at).toLocaleString() :
                                inspectionData?.s1_rejected_at ? new Date(inspectionData.s1_rejected_at).toLocaleString() : ""
                        }
                    />

                    )}

                    {!isReview && !readOnly && (
                        <div className="mt-12 flex justify-end pb-10">
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? "Processing..." : "Save & Complete Stage 1"}
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export default Stage1F
