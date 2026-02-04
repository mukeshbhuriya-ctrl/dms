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

function Stage4({ initialData, inspectionData }) {
    const [productionEngineerName, setProductionEngineerName] = useState("")
    const [todayDate] = useState(new Date().toLocaleDateString())
    const [ndtEngineer, setNdtEngineer] = useState("")
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

                // Stage 4 requires NDT Engineer. User requested to use QC_ENGINEER list for this.
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
        if (inspectionData && inspectionData.s4_ndt_eng_id) {
            setNdtEngineer(inspectionData.s4_ndt_eng_id);
        }
    }, [inspectionData]);

    const handleSubmit = async () => {
        setIsSubmitting(true)
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
            const authData = localStorage.getItem("user_auth")
            let token = null
            let userId = null;
            let role = 'PROD'; // Default submitter

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
                stage: "stage4",
                status: "approved", // Simulating fast-track
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
                alert("Stage 4 (RT) submitted successfully");
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
                    <CardTitle>Radiography Testing (RT)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Production Engineer Name:</Label>
                            <Input
                                type="text"
                                value={productionEngineerName}
                                readOnly
                                className="bg-muted"
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
                            <Select value={ndtEngineer} onValueChange={setNdtEngineer}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select NDT Engineer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ndtEngineers.map((engineer) => (
                                        <SelectItem key={engineer.id} value={engineer.id}>
                                            {engineer.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : "Save & Complete Stage 4"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default Stage4
