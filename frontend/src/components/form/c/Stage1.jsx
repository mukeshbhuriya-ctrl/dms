import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormAlert } from "@/components/ui/form-alert"
import api from "@/api/api.client"
import QCReviewSection from "@/components/wpj/QCReviewSection"

const Stage1C = ({ initialData, isReview = false, readOnly = false, onSuccess }) => {
    const [formData, setFormData] = useState({
        materialIdMarks: "",
        nozzleNumber: "",
        tackWelder: "",
        visualInspection: "",
        lSeamRt: "",
        nozzleSize: "",
        totalLength: "",
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
    const [mhcItems, setMhcItems] = useState([])
    const [selectedPart1, setSelectedPart1] = useState("")
    const [selectedPart2, setSelectedPart2] = useState("")

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

    // Fetch Approved MHC Items
    useEffect(() => {
        const fetchMhcItems = async () => {
            const msn = initialData?.msnNumber;
            if (!msn || msn === '-') return;

            try {
                const res = await api.get(`/api/mhc/approved-items-by-msn/${msn}`);
                if (res.success) {
                    setMhcItems(res.data || []);
                }
            } catch (error) {
                console.error("Error fetching MHC items:", error);
            }
        };
        fetchMhcItems();
    }, [initialData?.msnNumber]);

    const handlePartSelection = (partType, itemId) => {
        if (partType === 'part1') {
            setSelectedPart1(itemId);
        } else {
            setSelectedPart2(itemId);
        }
    }

    // Auto-populate Nozzle Number and Size based on selections
    useEffect(() => {
        // Skip during initial load if we already have inspection data but no selection has been made yet
        if (!mhcItems.length) return;
        if (!selectedPart1 && !selectedPart2) return;

        const item1 = mhcItems.find(i => i.id === selectedPart1);
        const item2 = mhcItems.find(i => i.id === selectedPart2);

        const desc1 = item1 ? `${item1.item_no || ''} - ${item1.description || ''}`.trim() : "";
        const desc2 = item2 ? `${item2.item_no || ''} - ${item2.description || ''}`.trim() : "";
        
        const size1 = item1?.size || "";
        const size2 = item2?.size || "";

        setFormData(prev => ({
            ...prev,
            nozzleNumber: [desc1, desc2].filter(Boolean).join(" | "),
            nozzleSize: [size1, size2].filter(Boolean).join(" | ")
        }));
    }, [selectedPart1, selectedPart2, mhcItems]);

    const getCategoryKey = () => {
        return initialData?.jointCategory?.toLowerCase() || initialData?.joint_type?.toLowerCase() || 'c';
    }

    useEffect(() => {
        if (initialData?.inspectionData) {
            const categoryKey = getCategoryKey();
            const insp = initialData.inspectionData;

            if (insp.s1_data) {
                try {
                    const rawData = typeof insp.s1_data === 'string' ? JSON.parse(insp.s1_data) : insp.s1_data;
                    const s1Data = rawData?.[categoryKey]?.s1 || rawData?.[categoryKey] || rawData || {};

                    setFormData(prev => ({
                        ...prev,
                        materialIdMarks: s1Data.materialIdMarks || prev.materialIdMarks,
                        nozzleNumber: s1Data.nozzleNumber || prev.nozzleNumber,
                        tackWelder: s1Data.tackWelder || prev.tackWelder,
                        visualInspection: s1Data.visualInspection || prev.visualInspection,
                        lSeamRt: s1Data.lSeamRt || prev.lSeamRt,
                        nozzleSize: s1Data.nozzleSize || prev.nozzleSize,
                        totalLength: s1Data.totalLength || prev.totalLength,
                        date: s1Data.date || prev.date,
                    }));

                    if (s1Data.productionEngineerName) setProductionEngineerName(s1Data.productionEngineerName);
                    if (s1Data.submissionDate) setTodayDate(s1Data.submissionDate);

                    if (insp.s1_assigned_qc_group_id) {
                        setSelectedQcGroupId(insp.s1_assigned_qc_group_id);
                    } else if (s1Data.assignedQcGroupId) {
                        setSelectedQcGroupId(s1Data.assignedQcGroupId);
                    }

                } catch (e) {
                    console.error("Error parsing s1_data", e)
                }
            }
            // Fallback / Override from columns if JSON missing/incomplete
            if (insp.s1_remarks) setQcRemarks(insp.s1_remarks);
            if (insp.s1_prod_eng_name) setProductionEngineerName(insp.s1_prod_eng_name);
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
            if (initialData?.inspectionData?.s1_data) {
                existingStageData = typeof initialData.inspectionData.s1_data === 'string'
                    ? JSON.parse(initialData.inspectionData.s1_data)
                    : initialData.inspectionData.s1_data;
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
                role: role,
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
                if (initialData?.inspectionData?.s1_data) {
                    existingStageData = typeof initialData.inspectionData.s1_data === 'string'
                        ? JSON.parse(initialData.inspectionData.s1_data)
                        : initialData.inspectionData.s1_data;
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


    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Material Identification Marks & Setup</CardTitle>
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

                {/* Stage 1: Material Identification Section */}
                <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold text-lg">I. Material Identification</h3>

                    {/* MHC Part Selection - Hidden for QC */}
                    {userRole !== 'QC' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg border border-dashed">
                            <div className="space-y-2">
                                <Label className="text-primary">Part 1 Selection (ITEM NO./PART NO.)</Label>
                                <Select 
                                    key={`part1-${mhcItems.length}-${selectedPart1}`}
                                    value={selectedPart1} 
                                    onValueChange={(val) => handlePartSelection('part1', val)} 
                                    disabled={isReview && userRole !== 'QC'}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Part 1" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {mhcItems.map(item => (
                                            <SelectItem key={item.id} value={item.id}>
                                                {item.item_no} {item.description ? `- ${item.description}` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-primary">Part 2 Selection (ITEM NO./PART NO.)</Label>
                                <Select 
                                    key={`part2-${mhcItems.length}-${selectedPart2}`}
                                    value={selectedPart2} 
                                    onValueChange={(val) => handlePartSelection('part2', val)} 
                                    disabled={isReview && userRole !== 'QC'}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Part 2 (Nozzle)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {mhcItems.map(item => (
                                            <SelectItem key={item.id} value={item.id}>
                                                {item.item_no} {item.description ? `- ${item.description}` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Characteristics to be checked</Label>
                            <Input value={initialData?.jointNo || ""} readOnly className="bg-muted font-bold" />
                        </div>
                        <div className="space-y-2">
                            <Label>Nozzle Number</Label>
                            <Input
                                value={formData.nozzleNumber}
                                placeholder='Enter Nozzle Number'
                                onChange={(e) => handleChange('nozzleNumber', e.target.value)}
                                disabled={isReview && userRole !== 'QC'}
                            />
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
                    </div>
                </div>

                {/* Stage 2: Setup Section */}
                <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold text-lg">II. Set Up</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label>Tack Welder</Label>
                            <Input
                                value={formData.tackWelder}
                                placeholder='Enter Tack Welder'
                                onChange={(e) => handleChange('tackWelder', e.target.value)}
                                disabled={isReview && userRole !== 'QC'}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Visual Inspection</Label>
                            <Select
                                value={formData.visualInspection}
                                onValueChange={(val) => handleChange('visualInspection', val)}
                                disabled={isReview && userRole !== 'QC'}
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
                            <Label>Acceptance of L-Seam RT</Label>
                            <Select
                                value={formData.lSeamRt}
                                onValueChange={(val) => handleChange('lSeamRt', val)}
                                disabled={isReview && userRole !== 'QC'}
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
                    </div>

                    <div className="border p-4 rounded-md space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">Dimensions</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nozzle Size</Label>
                                <Input
                                    value={formData.nozzleSize}
                                    placeholder='Enter Nozzle Size'
                                    onChange={(e) => handleChange('nozzleSize', e.target.value)}
                                    disabled={isReview && userRole !== 'QC'}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Total Length</Label>
                                <Input
                                    value={formData.totalLength}
                                    placeholder='Enter Total Length'
                                    onChange={(e) => handleChange('totalLength', e.target.value)}
                                    disabled={isReview && userRole !== 'QC'}
                                />
                            </div>
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
                                value={initialData?.inspectionData?.s1_submitted_at ? new Date(initialData.inspectionData.s1_submitted_at).toLocaleDateString() : todayDate}
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
                        status={initialData?.inspectionData?.s1_status}
                        remarks={qcRemarks}
                        setRemarks={setQcRemarks}
                        onAction={handleReviewAction}
                        isSubmitting={isSubmitting}
                        reviewDate={
                            initialData?.inspectionData?.s1_approved_at ? new Date(initialData.inspectionData.s1_approved_at).toLocaleString() :
                                initialData?.inspectionData?.s1_rejected_at ? new Date(initialData.inspectionData.s1_rejected_at).toLocaleString() : ""
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

export default Stage1C
