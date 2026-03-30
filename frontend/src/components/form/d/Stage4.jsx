import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { FormAlert } from "@/components/ui/form-alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const Stage4D = ({ initialData, inspectionData, isReview = false, stage = "stage4" }) => {
    const sPrefix = stage.replace('stage', 's');
    // Stage 4D: Nozzle Set-Up
    const [productionEngineerName, setProductionEngineerName] = useState("")
    const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString())
    const [qcEngineer, setQcEngineer] = useState("") // s4_qc_eng_id
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [userRole, setUserRole] = useState("")
    const [qcEngineers, setQcEngineers] = useState([])

    const [formData, setFormData] = useState({
        tackWelder: "",
        materialId: "",
        lSeamNdt: "",
        cleaning: "",
        grooveAngle: "",
        rootFace: "",
        rootGap: "",
        projection: "",
        pcdHole: "",
        rfPad: "",
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

    // Load Data
    useEffect(() => {
        if (initialData) {
            setDisplayFields({
                msn: initialData.msnNumber || "",
                client: initialData.client || "",
                poNo: initialData.poNo || "",
            })
            const generatedReportNo = `R/${initialData.msnNumber || '000'}/${initialData.jointNo}/${sPrefix.replace('s', '')}`;
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
                    const basicInfo = rawBasic?.[initialData?.jointCategory?.toLowerCase() || initialData?.joint_type?.toLowerCase() || 'd'] || {};

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

            if (inspData[`${sPrefix}_qc_eng_id`]) setQcEngineer(inspData[`${sPrefix}_qc_eng_id`]);

            // Flat columns from reconstructed inspection object (new schema)
            if (inspData[`${sPrefix}_prod_eng_name`]) setProductionEngineerName(inspData[`${sPrefix}_prod_eng_name`]);

            if (inspData[`${sPrefix}_data`]) {
                try {
                    const rawData = typeof inspData[`${sPrefix}_data`] === 'string' ? JSON.parse(inspData[`${sPrefix}_data`]) : inspData[`${sPrefix}_data`];
                    const catKey = initialData?.joint_type?.toLowerCase() || initialData?.jointCategory?.toLowerCase() || 'd';
                    const sData = rawData?.[catKey]?.[sPrefix] || rawData?.[catKey] || rawData || {};

                    if (sData.productionEngineerName) setProductionEngineerName(sData.productionEngineerName);
                    if (sData.submissionDate) setTodayDate(sData.submissionDate);
                    if (!inspData[`${sPrefix}_qc_eng_id`] && sData.assignedQcEngineerId) setQcEngineer(sData.assignedQcEngineerId);

                    setFormData(prev => ({
                        ...prev,
                        tackWelder: sData.tackWelder || "",
                        materialId: sData.materialId || "",
                        lSeamNdt: sData.lSeamNdt || "",
                        cleaning: sData.cleaning || "",
                        grooveAngle: sData.grooveAngle || "",
                        rootFace: sData.rootFace || "",
                        rootGap: sData.rootGap || "",
                        projection: sData.projection || "",
                        pcdHole: sData.pcdHole || "",
                        rfPad: sData.rfPad || "",
                        date: sData.date || prev.date
                    }));
                } catch (e) { console.error(`Error parsing ${sPrefix}_data`, e) }
            }
            if (inspData[`${sPrefix}_status`] && !qcEngineer) setQcEngineer(inspData[`${sPrefix}_qc_eng_id`]);
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
            if (inspData?.[`${sPrefix}_data`]) {
                existingData = typeof inspData[`${sPrefix}_data`] === 'string' ? JSON.parse(inspData[`${sPrefix}_data`]) : inspData[`${sPrefix}_data`];
            }

            const finalData = {
                ...existingData,
                [initialData?.jointCategory?.toLowerCase() || initialData?.joint_type?.toLowerCase() || 'd']: {
                    ...existingData?.cd,
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

            const data = await res.json();
            if (res.ok) {
                setSuccess(`${stage.replace('stage', 'Stage ')} Submitted Successfully`);
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
                if (inspData?.[`${sPrefix}_data`]) {
                    existingData = typeof inspData[`${sPrefix}_data`] === 'string' ? JSON.parse(inspData[`${sPrefix}_data`]) : inspData[`${sPrefix}_data`];
                }
                const currentStageData = {
                    assignedQcEngineerId: qcEngineer,
                    productionEngineerName,
                    submissionDate: todayDate,
                    ...formData
                };
                const finalData = {
                    ...existingData,
                    [initialData?.jointCategory?.toLowerCase() || initialData?.joint_type?.toLowerCase() || 'd']: {
                        ...existingData?.cd,
                        [sPrefix]: currentStageData
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
                        data: finalData
                    }),
                    credentials: "include",
                });
            }

            const payload = {
                jointId: initialData?.id,
                stage: stage,
                status: status,
                engineerId: userId,
                role: 'QC',
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
                setSuccess(`${stage.replace('stage', 'Stage ')} ${status} Successfully`);
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
                    <CardTitle>{stage.replace('stage', 'Stage ')}: Nozzle Set-Up</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Tack Welder</Label>
                            <Input
                                value={formData.tackWelder}
                                placeholder='Enter Tack Welder'
                                onChange={(e) => handleFormChange('tackWelder', e.target.value)}
                                disabled={isReview && userRole !== 'QC'}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Material identification of Shell / Dish / Nozzle / RF Pad</Label>
                            <Select
                                value={formData.materialId}
                                onValueChange={(val) => handleFormChange('materialId', val)}
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
                            <Label>L-Seam NDT (if applicable)</Label>
                            <Select
                                value={formData.lSeamNdt}
                                onValueChange={(val) => handleFormChange('lSeamNdt', val)}
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
                        <div className="space-y-2">
                            <Label>Cleaning of Nozzle & Weld Area</Label>
                            <Select
                                value={formData.cleaning}
                                onValueChange={(val) => handleFormChange('cleaning', val)}
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
                            <Label>Groove Angle</Label>
                            <Input
                                value={formData.grooveAngle}
                                placeholder='Enter Groove Angle'
                                onChange={(e) => handleFormChange('grooveAngle', e.target.value)}
                                disabled={isReview && userRole !== 'QC'}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Root face</Label>
                            <Input
                                value={formData.rootFace}
                                placeholder='Enter Root Face'
                                onChange={(e) => handleFormChange('rootFace', e.target.value)}
                                disabled={isReview && userRole !== 'QC'}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Root Gap</Label>
                            <Input
                                value={formData.rootGap}
                                placeholder='Enter Root Gap'
                                onChange={(e) => handleFormChange('rootGap', e.target.value)}
                                disabled={isReview && userRole !== 'QC'}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Projection from Reference line to Flange face</Label>
                            <Input
                                value={formData.projection}
                                placeholder='Enter Projection'
                                onChange={(e) => handleFormChange('projection', e.target.value)}
                                disabled={isReview && userRole !== 'QC'}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>PCD hole OFF center / ON center</Label>
                            <Select
                                value={formData.pcdHole}
                                onValueChange={(val) => handleFormChange('pcdHole', val)}
                                disabled={isReview && userRole !== 'QC'}
                            >
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OFF center">OFF center</SelectItem>
                                    <SelectItem value="ON center">ON center</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>RF pad setup as applicable</Label>
                            <Select
                                value={formData.rfPad}
                                onValueChange={(val) => handleFormChange('rfPad', val)}
                                disabled={isReview && userRole !== 'QC'}
                            >
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Applicable">Applicable</SelectItem>
                                    <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                                </SelectContent>
                            </Select>
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
                                    value={inspectionData?.[`${sPrefix}_submitted_at`] ? new Date(inspectionData[`${sPrefix}_submitted_at`]).toLocaleDateString() : todayDate}
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
                                    {(isReview || inspectionData?.[`${sPrefix}_approved_at`]) && (
                                        <Input
                                            value={`Approve Date: ${inspectionData?.[`${sPrefix}_approved_at`] ? new Date(inspectionData[`${sPrefix}_approved_at`]).toLocaleDateString() : new Date().toLocaleDateString()}`}
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

export default Stage4D
