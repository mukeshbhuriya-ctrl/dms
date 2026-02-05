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

function Stage5({ initialData, inspectionData, isReview = false }) {
    const [productionEngineerName, setProductionEngineerName] = useState("")
    const [todayDate] = useState(new Date().toLocaleDateString())
    const [ndtEngineer, setNdtEngineer] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

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

    // Mock NDT Engineers
    const [ndtEngineers, setNdtEngineers] = useState([])

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

                // Stage 5 requires NDT Engineer. User requested to use QC_ENGINEER list for this.
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
                } else {
                    console.error("Failed to fetch NDT Engineers:", data.message)
                }
            } catch (error) {
                console.error("Error fetching NDT Engineers:", error)
            }
        }

        fetchNdtEngineers()
    }, [])

    useEffect(() => {
        if (inspectionData) {
            // Pre-fill Prod Name from injected data
            if (inspectionData.s5_prod_eng_name) {
                setProductionEngineerName(inspectionData.s5_prod_eng_name);
            }
            if (inspectionData.s5_ndt_eng_id) {
                setNdtEngineer(inspectionData.s5_ndt_eng_id);
            }
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

            if (!ndtEngineer) {
                alert("Please select NDT Engineer");
                setIsSubmitting(false);
                return;
            }

            const payload = {
                jointId: initialData?.id,
                stage: "stage5",
                status: "pending",
                engineerId: userId,
                role: role,
                data: {
                    assignedNdtEngineerId: ndtEngineer
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
                setSuccess("Stage 5 (PT) submitted successfully");
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
        setIsSubmitting(true);
        setError("");
        setSuccess("");
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
                stage: "stage5",
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
                setSuccess(`Stage 5 ${status} successfully`);
                setTimeout(() => window.location.reload(), 1500);
            } else {
                setError(data.message || "Review action failed");
            }
        } catch (error) {
            console.error(error);
            setError("Error processing review");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="w-full mx-auto p-6 space-y-6">
            <FormAlert type="error" message={error} />
            <FormAlert type="success" message={success} />
            <Card>
                <CardHeader>
                    <CardTitle>Penetrant Testing (PT)</CardTitle>
                </CardHeader>
                <CardContent>
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
                            <Label htmlFor="ndtEngineer">NDT Engineer:</Label>
                            <Select value={ndtEngineer} onValueChange={setNdtEngineer} disabled={isReview}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select NDT Engineer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ndtEngineers.map((engineer) => (
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
                                {isSubmitting ? "Saving..." : "Save & Complete Stage 5"}
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

export default Stage5
