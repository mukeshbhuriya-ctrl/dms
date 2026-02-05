import { useState, useEffect } from "react"
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

function Stage6({ initialData, inspectionData, isReview = false }) {
    const [productionEngineerName, setProductionEngineerName] = useState("")
    const [todayDate] = useState(new Date().toLocaleDateString())
    const [qcEngineer, setQcEngineer] = useState("")
    // Extra fields for PWHT
    const [postRtStatus, setPostRtStatus] = useState("NA") // NA, Pending, Approved
    const [postPtStatus, setPostPtStatus] = useState("NA")

    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        const authData = localStorage.getItem("user_auth")
        if (authData) {
            try {
                const parsed = JSON.parse(authData)
                const user = parsed?.payload?.user || parsed?.user
                if (user?.name) {
                    setProductionEngineerName(user.name)
                }
            } catch (e) {
                console.error("Error parsing auth data", e)
            }
        }
    }, [])

    // Mock QC Engineers
    const [qcEngineers, setQcEngineers] = useState([])

    useEffect(() => {
        const fetchQcEngineers = async () => {
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
                } else {
                    console.error("Failed to fetch QC Engineers:", data.message)
                }
            } catch (error) {
                console.error("Error fetching QC Engineers:", error)
            }
        }

        fetchQcEngineers()
    }, [])

    useEffect(() => {
        if (inspectionData) {
            if (inspectionData.s6_qc_eng_id) setQcEngineer(inspectionData.s6_qc_eng_id);
            if (inspectionData.s6_post_rt_status) setPostRtStatus(inspectionData.s6_post_rt_status);
            if (inspectionData.s6_post_pt_status) setPostPtStatus(inspectionData.s6_post_pt_status);
            if (inspectionData.s6_prod_eng_name) setProductionEngineerName(inspectionData.s6_prod_eng_name);
        }
    }, [inspectionData]);

    const handleSubmit = async () => {
        setIsSubmitting(true)
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

            if (!qcEngineer) {
                alert("Please select QC Engineer");
                setIsSubmitting(false);
                return;
            }

            const payload = {
                jointId: initialData?.id,
                stage: "stage6",
                status: "pending",
                engineerId: userId,
                role: role,
                data: {
                    postRtStatus,
                    postPtStatus,
                    assignedQcEngineerId: qcEngineer
                }
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
                alert("Stage 6 (PWHT) submitted successfully");
                window.location.reload();
            } else {
                alert(data.message || "Submission failed");
            }

        } catch (error) {
            console.error(error);
            alert("Error submitting form");
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleReviewAction = async (status) => {
        setIsSubmitting(true);
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
            const authData = localStorage.getItem("user_auth")
            let token = null
            let userId = null;
            const role = 'QC'; // Assuming QC/NDT performing review

            if (authData) {
                const parsed = JSON.parse(authData)
                token = parsed?.payload?.token || parsed?.token
                userId = parsed?.payload?.user?.id || parsed?.user?.id
            }

            const payload = {
                jointId: initialData?.id,
                stage: "stage6",
                status: status,
                engineerId: userId,
                role: role,
                data: {}
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
                alert(`Stage 6 ${status} successfully`);
                window.location.reload();
            } else {
                alert(data.message || "Review action failed");
            }
        } catch (error) {
            console.error(error);
            alert("Error processing review");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="w-full mx-auto p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Post Weld Heat Treatment (PWHT)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <div className="space-y-2">
                            <Label htmlFor="postRt">Post PWHT RT Status:</Label>
                            <Select value={postRtStatus} onValueChange={setPostRtStatus} disabled={isReview}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NA">Not Applicable</SelectItem>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Approved">Approved</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="postPt">Post PWHT PT Status:</Label>
                            <Select value={postPtStatus} onValueChange={setPostPtStatus} disabled={isReview}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NA">Not Applicable</SelectItem>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Approved">Approved</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Production Engineer Name:</Label>
                            <Input
                                type="text"
                                value={productionEngineerName}
                                readOnly
                                className="bg-muted uppercase"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Date:</Label>
                            <Input
                                type="text"
                                value={todayDate}
                                readOnly
                                className="bg-muted"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="qcEngineer">QC Engineer:</Label>
                            <Select value={qcEngineer} onValueChange={setQcEngineer} disabled={isReview}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select QC Engineer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {qcEngineers.map((engineer) => (
                                        <SelectItem key={engineer.id} value={engineer.id}>
                                            {engineer.name?.toUpperCase()}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        {!isReview ? (
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? "Saving..." : "Save & Complete Stage 6"}
                            </Button>
                        ) : (
                            <>
                                <Button onClick={() => handleReviewAction('rejected')} variant="outline" disabled={isSubmitting}>
                                    {isSubmitting ? "Processing..." : "Reject"}
                                </Button>
                                <Button onClick={() => handleReviewAction('approved')} className="bg-black hover:bg-gray-800 text-white" disabled={isSubmitting}>
                                    {isSubmitting ? "Processing..." : "Approve"}
                                </Button>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default Stage6
