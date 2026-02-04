import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

function Stage7({ initialData }) {
    const [remarks, setRemarks] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async () => {
        setIsSubmitting(true)
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
                status: "approved", // Final completion
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
                alert("Stage 7 (Final) completed successfully!");
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

    return (
        <div className="w-full mx-auto p-6 space-y-6">
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
                            />
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? "Completing..." : "Complete Final Stage"}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default Stage7
