import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { FormAlert } from "@/components/ui/form-alert"

function Stage7({ initialData, isReview = false }) {
    const [remarks, setRemarks] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    useEffect(() => {
        if (initialData?.inspectionData) {
            // Check if remarks are directly available (if backed supports it) or in s7_data
            let loadedRemarks = initialData.inspectionData.s7_remarks || "";

            if (!loadedRemarks && initialData.inspectionData.s7_data) {
                try {
                    const savedData = typeof initialData.inspectionData.s7_data === 'string'
                        ? JSON.parse(initialData.inspectionData.s7_data)
                        : initialData.inspectionData.s7_data;
                    if (savedData?.remarks) {
                        loadedRemarks = savedData.remarks;
                    }
                } catch (e) {
                    console.error("Error parsing s7_data", e);
                }
            }
            if (loadedRemarks) setRemarks(loadedRemarks);
        }
    }, [initialData]);

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

            const payload = {
                jointId: initialData?.id,
                stage: "stage7",
                status: "pending", // Pending approval if workflow requires it
                engineerId: userId,
                role: 'PROD',
                data: {
                    remarks
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
                setSuccess("Stage 7 (Final) submitted successfully!");
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
        setError("")
        setSuccess("")
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

            const payload = {
                jointId: initialData?.id,
                stage: "stage7",
                status: status,
                engineerId: userId,
                role: role,
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
                setSuccess(`Stage 7 ${status} successfully`);
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
                    <CardTitle>Final Inspection</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="remarks">Final Remarks:</Label>
                            <Input
                                id="remarks"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Enter any final remarks"
                                readOnly={isReview}
                                className={isReview ? "bg-muted" : ""}
                            />
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            {!isReview ? (
                                <Button onClick={handleSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? "Completing..." : "Complete Final Stage"}
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
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default Stage7
