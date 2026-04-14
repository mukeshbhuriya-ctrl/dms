import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormAlert } from "@/components/ui/form-alert"
import api from "@/api/api.client"
import QCReviewSection from "@/components/wpj/QCReviewSection"

const Stage1D = ({ initialData, inspectionData, isReview = false, readOnly = false, stage = "stage1", onSuccess }) => {
    const sPrefix = stage.replace('stage', 's');

    const [productionEngineerName, setProductionEngineerName] = useState("")
    const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString())
    const [selectedQcGroupId, setSelectedQcGroupId] = useState("")
    const [qcRemarks, setQcRemarks] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [userRole, setUserRole] = useState("")
    const [qcGroups, setQcGroups] = useState([])
    const [alert, setAlert] = useState({ show: false, type: 'success', message: '' })
    const [mhcItems, setMhcItems] = useState([])
    const [selectedPart1, setSelectedPart1] = useState("")
    const [selectedPart2, setSelectedPart2] = useState("")

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

    useEffect(() => {
        const inspData = inspectionData || initialData?.inspectionData;
        if (inspData) {
            if (inspData[`${sPrefix}_assigned_qc_group_id`]) setSelectedQcGroupId(inspData[`${sPrefix}_assigned_qc_group_id`]);
            if (inspData[`${sPrefix}_remarks`]) setQcRemarks(inspData[`${sPrefix}_remarks`]);
            if (inspData[`${sPrefix}_prod_eng_name`]) setProductionEngineerName(inspData[`${sPrefix}_prod_eng_name`]);

            if (inspData[`${sPrefix}_data`]) {
                try {
                    const rawData = typeof inspData[`${sPrefix}_data`] === 'string' ? JSON.parse(inspData[`${sPrefix}_data`]) : inspData[`${sPrefix}_data`];
                    const sData = rawData?.d?.[sPrefix] || rawData?.d || rawData || {};

                    if (sData.productionEngineerName) setProductionEngineerName(sData.productionEngineerName);
                    if (sData.submissionDate) setTodayDate(sData.submissionDate);

                    if (inspData[`${sPrefix}_assigned_qc_group_id`]) {
                        setSelectedQcGroupId(inspData[`${sPrefix}_assigned_qc_group_id`]);
                    } else if (sData.assignedQcGroupId) {
                        setSelectedQcGroupId(sData.assignedQcGroupId);
                    }

                    setFormData(prev => ({
                        ...prev,
                        materialIdMarks: sData.materialIdMarks || "",
                        nozzleNumber: sData.nozzleNumber || "",
                        tackWelder: sData.tackWelder || "",
                        visualInspection: sData.visualInspection || "",
                        lSeamRt: sData.lSeamRt || "",
                        nozzleSize: sData.nozzleSize || "",
                        totalLength: sData.totalLength || "",
                        date: sData.date || prev.date
                    }));
                } catch (e) { console.error(`Error parsing ${sPrefix}_data`, e) }
            }
        }
    }, [initialData, inspectionData, stage]);

    const isReadOnly = isReview && userRole !== 'QC';

    const handleFormChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async () => {
        setIsSubmitting(true)
        setAlert({ show: false, type: '', message: '' })
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

            if (!selectedQcGroupId) {
                setAlert({ show: true, type: 'error', message: "Please select QC Group" });
                setIsSubmitting(false);
                return;
            }

            const currentStageData = {
                assignedQcGroupId: selectedQcGroupId,
                productionEngineerName,
                submissionDate: todayDate,
                ...formData
            };

            const inspData = inspectionData || initialData?.inspectionData;
            let existingData = {};
            if (inspData?.[`${sPrefix}_data`]) {
                existingData = typeof inspData[`${sPrefix}_data`] === 'string' ? JSON.parse(inspData[`${sPrefix}_data`]) : inspData[`${sPrefix}_data`];
            }

            const finalData = {
                ...existingData,
                d: {
                    ...existingData?.d,
                    [sPrefix]: currentStageData
                }
            };

            const basicInfo = {
                d: {
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
                role: 'PROD',
                data: finalData,
                basicInfo: basicInfo
            }

            const res = await api.post("/api/wpj/update-stage-status", payload);

            if (res.success) {
                setAlert({ show: true, type: 'success', message: `${stage.replace('stage', 'Stage ')} Submitted Successfully` });
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
        setIsSubmitting(true)
        setAlert({ show: false, type: '', message: '' })
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

            // If Approved by QC, save changes first (Standard pattern)
            if (status === 'approved') {
                const currentStageData = {
                    assignedQcGroupId: selectedQcGroupId,
                    productionEngineerName,
                    submissionDate: todayDate,
                    ...formData
                };

                const inspData = inspectionData || initialData?.inspectionData;
                let existingData = {};
                if (inspData?.[`${sPrefix}_data`]) {
                    existingData = typeof inspData[`${sPrefix}_data`] === 'string' ? JSON.parse(inspData[`${sPrefix}_data`]) : inspData[`${sPrefix}_data`];
                }

                const finalData = {
                    ...existingData,
                    d: {
                        ...existingData?.d,
                        [sPrefix]: currentStageData
                    }
                };

                const basicInfo = {
                    d: {
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
                    data: finalData,
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
                setAlert({ show: true, type: 'success', message: `${stage.replace('stage', 'Stage ')} ${status} Successfully` });
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
        <div className="w-full mx-auto p-6 space-y-6">
            {alert.show && <FormAlert type={alert.type} message={alert.message} />}

            {/* Basic Information Section */}
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
                    <CardTitle>Material Identification Marks & Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* I. Material Identification Section */}
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
                                        disabled={isReadOnly}
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
                                        disabled={isReadOnly}
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
                                    onChange={(e) => handleFormChange('nozzleNumber', e.target.value)}
                                    disabled={isReadOnly}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Material identification Marks</Label>
                                <Select
                                    value={formData.materialIdMarks}
                                    onValueChange={(val) => handleFormChange('materialIdMarks', val)}
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
                        </div>
                    </div>

                    {/* II. Set Up Section */}
                    <div className="space-y-4 border-t pt-4">
                        <h3 className="font-semibold text-lg">II. Set Up</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label>Tack Welder</Label>
                                <Input
                                    value={formData.tackWelder}
                                    placeholder='Enter Tack Welder'
                                    onChange={(e) => handleFormChange('tackWelder', e.target.value)}
                                    disabled={isReadOnly}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Visual Inspection</Label>
                                <Select
                                    value={formData.visualInspection}
                                    onValueChange={(val) => handleFormChange('visualInspection', val)}
                                    disabled={isReadOnly}
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
                                    onValueChange={(val) => handleFormChange('lSeamRt', val)}
                                    disabled={isReadOnly}
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
                                        onChange={(e) => handleFormChange('nozzleSize', e.target.value)}
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Total Length</Label>
                                    <Input
                                        value={formData.totalLength}
                                        placeholder='Enter Total Length'
                                        onChange={(e) => handleFormChange('totalLength', e.target.value)}
                                        disabled={isReadOnly}
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
                                <Input value={productionEngineerName} readOnly className="bg-muted uppercase" />
                            </div>
                            <div className="space-y-2">
                                <Label>Date:</Label>
                                <Input value={todayDate} readOnly className="bg-muted" />
                            </div>
                            <div className="space-y-2">
                                <Label>QC Group Name:</Label>
                                <Select value={selectedQcGroupId} onValueChange={setSelectedQcGroupId} disabled={isReview}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select QC Group" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {qcGroups.map(group => (
                                            <SelectItem key={group.id} value={group.id}>{group.name?.toUpperCase()}</SelectItem>
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

export default Stage1D
