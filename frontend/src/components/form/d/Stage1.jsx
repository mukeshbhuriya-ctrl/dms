import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormAlert } from "@/components/ui/form-alert"

const Stage1D = ({ initialData, inspectionData, isReview = false, stage = "stage1" }) => {
    const sPrefix = stage.replace('stage', 's');
    
    const [productionEngineerName, setProductionEngineerName] = useState("")
    const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString())
    const [qcEngineer, setQcEngineer] = useState("") 
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [userRole, setUserRole] = useState("")
    const [qcEngineers, setQcEngineers] = useState([])
    const [alert, setAlert] = useState({ show: false, type: 'success', message: '' })

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
                    setQcEngineers(data.data || [])
                }
            } catch (error) {
                console.error("Error fetching QE Engineers:", error)
            }
        }
        fetchQeEngineers()
    }, [])

    useEffect(() => {
        const inspData = inspectionData || initialData?.inspectionData;
        if (inspData) {
            if (inspData[`${sPrefix}_qc_eng_id`]) setQcEngineer(inspData[`${sPrefix}_qc_eng_id`]);
            if (inspData[`${sPrefix}_prod_eng_name`]) setProductionEngineerName(inspData[`${sPrefix}_prod_eng_name`]);

            if (inspData[`${sPrefix}_data`]) {
                try {
                    const rawData = typeof inspData[`${sPrefix}_data`] === 'string' ? JSON.parse(inspData[`${sPrefix}_data`]) : inspData[`${sPrefix}_data`];
                    const sData = rawData?.d?.[sPrefix] || rawData?.d || rawData || {};

                    if (sData.productionEngineerName) setProductionEngineerName(sData.productionEngineerName);
                    if (sData.submissionDate) setTodayDate(sData.submissionDate);
                    if (!inspData[`${sPrefix}_qc_eng_id`] && sData.assignedQcEngineerId) setQcEngineer(sData.assignedQcEngineerId);

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

            if (!qcEngineer) {
                setAlert({ show: true, type: 'error', message: "Please select QC Engineer" });
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

            const payload = {
                jointId: initialData?.id,
                stage: stage,
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

            if (res.ok) {
                setAlert({ show: true, type: 'success', message: `${stage.replace('stage', 'Stage ')} Submitted Successfully` });
                setTimeout(() => window.location.reload(), 1500);
            } else {
                const data = await res.json();
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

            const payload = {
                jointId: initialData?.id,
                stage: stage,
                status: status,
                engineerId: userId,
                role: 'QC'
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
            if (res.ok) {
                setAlert({ show: true, type: 'success', message: `${stage.replace('stage', 'Stage ')} ${status} Successfully` });
                setTimeout(() => window.location.reload(), 1500);
            } else {
                const data = await res.json();
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
                                <Label>QC Engineer:</Label>
                                <Select value={qcEngineer} onValueChange={setQcEngineer} disabled={isReview}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select QC Engineer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {qcEngineers.map(eng => (
                                            <SelectItem key={eng.id} value={eng.id}>{eng.name?.toUpperCase()}</SelectItem>
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
                                            value={`Approve Date: ${initialData?.inspectionData?.[`${sPrefix}_approved_at`] ? new Date(initialData.inspectionData[`${sPrefix}_approved_at`]).toLocaleDateString() : new Date().toLocaleDateString()}`}
                                            readOnly
                                            className="bg-muted w-auto min-w-[200px] text-center font-medium"
                                        />
                                    )}
                                    <Button onClick={() => handleReviewAction('rejected')} variant="outline" disabled={isSubmitting}>
                                        Reject
                                    </Button>
                                    <Button onClick={() => handleReviewAction('approved')} className="bg-black hover:bg-gray-800 text-white" disabled={isSubmitting}>
                                        Approve
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

export default Stage1D
