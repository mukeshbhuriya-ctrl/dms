import React, { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FormAlert } from "@/components/ui/form-alert"

const Stage8D = ({ initialData, inspectionData, isReview = false, stage = "stage8" }) => {
    const sPrefix = stage.replace('stage', 's');
    
    const [productionEngineerName, setProductionEngineerName] = useState("")
    const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString())
    const [ndtEngineer, setNdtEngineer] = useState("") 
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [userRole, setUserRole] = useState("")
    const [ndtEngineers, setNdtEngineers] = useState([])
    const [alert, setAlert] = useState({ show: false, type: 'success', message: '' })

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
        const fetchNdtEngineers = async () => {
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
                    setNdtEngineers(data.data || [])
                }
            } catch (error) {
                console.error("Error fetching Engineers:", error)
            }
        }
        fetchNdtEngineers()
    }, [])

    useEffect(() => {
        const inspData = inspectionData || initialData?.inspectionData;
        if (inspData) {
            if (inspData[`${sPrefix}_qc_eng_id`]) setNdtEngineer(inspData[`${sPrefix}_qc_eng_id`]);
            if (inspData[`${sPrefix}_prod_eng_name`]) setProductionEngineerName(inspData[`${sPrefix}_prod_eng_name`]);

            if (inspData[`${sPrefix}_data`]) {
                try {
                    const rawData = typeof inspData[`${sPrefix}_data`] === 'string' ? JSON.parse(inspData[`${sPrefix}_data`]) : inspData[`${sPrefix}_data`];
                    const sData = rawData?.d?.[sPrefix] || rawData?.d || rawData || {};

                    if (sData.productionEngineerName) setProductionEngineerName(sData.productionEngineerName);
                    if (sData.submissionDate) setTodayDate(sData.submissionDate);
                    if (!inspData[`${sPrefix}_qc_eng_id`] && sData.assignedQcEngineerId) setNdtEngineer(sData.assignedQcEngineerId);
                } catch (e) { console.error(`Error parsing ${sPrefix}_data`, e) }
            }
        }
    }, [initialData, inspectionData, stage]);

    const handleSubmit = async () => {
        setIsSubmitting(true)
        setAlert({ show: false, type: '', message: '' })
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
            const authData = localStorage.getItem("user_auth")
            let token = null, userId = null;

            if (authData) {
                const parsed = JSON.parse(authData)
                token = parsed?.payload?.token || parsed?.token
                userId = parsed?.payload?.user?.id || parsed?.user?.id
            }

            if (!ndtEngineer) {
                setAlert({ show: true, type: 'error', message: "Please select NDT Engineer" });
                setIsSubmitting(false);
                return;
            }

            const currentStageData = {
                assignedQcEngineerId: ndtEngineer,
                productionEngineerName,
                submissionDate: todayDate,
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
                setAlert({ show: true, type: 'success', message: "Stage submitted successfully" });
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
            let token = null, userId = null;

            if (authData) {
                const parsed = JSON.parse(authData)
                token = parsed?.payload?.token || parsed?.token
                userId = parsed?.payload?.user?.id || parsed?.user?.id
            }

            if (userRole === 'QC' && status === 'approved') {
                const inspData = inspectionData || initialData?.inspectionData;
                let existingData = {};
                if (inspData?.[`${sPrefix}_data`]) {
                    existingData = typeof inspData[`${sPrefix}_data`] === 'string' ? JSON.parse(inspData[`${sPrefix}_data`]) : inspData[`${sPrefix}_data`];
                }

                const currentStageData = {
                    assignedQcEngineerId: ndtEngineer,
                    productionEngineerName,
                    submissionDate: todayDate,
                };

                const finalData = {
                    ...existingData,
                    d: {
                        ...existingData?.d,
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

            const res = await fetch(`${backendUrl}/api/wpj/review-stage`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token ? `Bearer ${token}` : ""
                },
                body: JSON.stringify({
                    jointId: initialData?.id,
                    stage: stage,
                    status: status,
                    engineerId: userId,
                    role: 'QC'
                }),
                credentials: "include",
            });
            if (res.ok) {
                setAlert({ show: true, type: 'success', message: `Stage ${status} successfully` });
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

            <div className="border rounded-lg p-4 space-y-4 shadow-sm bg-card">
                <h3 className="font-semibold text-lg border-b pb-2">Basic Information</h3>
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

            <Card className="shadow-md w-full">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl flex items-center gap-2">
                        Post Weld Heat Treatment (PWHT)
                        {initialData?.pwht && (
                            <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                                Yes
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardHeader className="pt-0 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        Radiography Testing (RT)
                        {initialData?.pwht && (
                            <span className="text-xs text-muted-foreground font-normal">
                                (After PWHT)
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-0">
                    <div className="space-y-6 pt-6 border-t font-medium">
                        <h3 className="font-semibold text-lg">Set Up Inspection by</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label>Production Engineer Name:</Label>
                                <Input value={productionEngineerName} readOnly className="bg-muted uppercase" />
                            </div>
                            <div className="space-y-2">
                                <Label>Date:</Label>
                                <Input value={initialData?.inspectionData?.[`${sPrefix}_submitted_at`] ? new Date(initialData.inspectionData[`${sPrefix}_submitted_at`]).toLocaleDateString() : todayDate} readOnly className="bg-muted" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ndtEngineer">NDT Engineer:</Label>
                                <Select value={ndtEngineer} onValueChange={setNdtEngineer} disabled={isReview}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select NDT Engineer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ndtEngineers.map(eng => (
                                            <SelectItem key={eng.id} value={eng.id}>{eng.name?.toUpperCase()}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3 items-center border-t pt-6">
                            {!isReview ? (
                                <Button onClick={handleSubmit} className="min-w-[150px] shadow-sm hover:translate-y-[-1px] transition-all" disabled={isSubmitting}>
                                    {isSubmitting ? "Saving..." : `Save & Complete Stage 8`}
                                </Button>
                            ) : (
                                <>
                                    {(isReview || initialData?.inspectionData?.[`${sPrefix}_approved_at`]) && (
                                        <div className="flex items-center gap-2 mr-auto">
                                            <Label className="text-muted-foreground">Status:</Label>
                                            <span className="font-semibold text-green-600">
                                                Approved on {initialData?.inspectionData?.[`${sPrefix}_approved_at`] ? new Date(initialData.inspectionData[`${sPrefix}_approved_at`]).toLocaleDateString() : new Date().toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                    <Button onClick={() => handleReviewAction('rejected')} variant="outline" className="min-w-[100px] hover:bg-destructive/10" disabled={isSubmitting}>
                                        Reject
                                    </Button>
                                    <Button onClick={() => handleReviewAction('approved')} className="min-w-[100px] bg-primary hover:opacity-90 shadow-md" disabled={isSubmitting}>
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

export default Stage8D
