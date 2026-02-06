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
import { FormAlert } from "@/components/ui/form-alert"

function Stage4({ initialData, inspectionData, isReview = false }) {
    const [productionEngineerName, setProductionEngineerName] = useState("")
    const [todayDate] = useState(new Date().toLocaleDateString())
    const [ndtEngineer, setNdtEngineer] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

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

    // Populate Basic Info
    useEffect(() => {
        if (initialData) {
            setDisplayFields({
                msn: initialData.msnNumber || "",
                client: initialData.client || "",
                poNo: initialData.poNo || "",
            })

            setInputFields((prev) => ({
                ...prev,
                tagNo: initialData.tagNo || "",
                equipment: initialData.equipment || "",
                projectsId: initialData.projectsId || "",
                lindeDrgNo: initialData.lindeDrgNo || "",
                drgNo: initialData.drgNo || "",
                code: initialData.code || "",
            }))
        }
    }, [initialData])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setInputFields((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    const handleDisplayFieldChange = (e) => {
        const { name, value } = e.target
        setDisplayFields((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

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
        if (inspectionData) {
            // Pre-fill Prod Name from injected data
            if (inspectionData.s4_prod_eng_name) {
                setProductionEngineerName(inspectionData.s4_prod_eng_name);
            }
            if (inspectionData.s4_ndt_eng_id) {
                setNdtEngineer(inspectionData.s4_ndt_eng_id);
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
                status: "pending", // Pending approval
                engineerId: userId,
                role: role,
                data: {
                    assignedNdtEngineerId: ndtEngineer,
                    inputFields
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
                setSuccess("Stage 4 (RT) submitted successfully");
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
                stage: "stage4",
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
                setSuccess(`Stage 4 ${status} successfully`);
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
                    <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Display Fields (Read-only) */}
                        <div className="space-y-2">
                            <Label htmlFor="msn">MSN:</Label>
                            <Input
                                id="msn"
                                name="msn"
                                type="text"
                                value={displayFields.msn}
                                onChange={handleDisplayFieldChange}
                                placeholder="MSN"
                                readOnly
                                className="bg-muted"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="client">CLIENT:</Label>
                            <Input
                                id="client"
                                name="client"
                                type="text"
                                value={displayFields.client}
                                onChange={handleDisplayFieldChange}
                                placeholder="CLIENT"
                                readOnly
                                className="bg-muted"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="poNo">P.O. NO.:</Label>
                            <Input
                                id="poNo"
                                name="poNo"
                                type="text"
                                value={displayFields.poNo}
                                onChange={handleDisplayFieldChange}
                                placeholder="P.O. NO."
                                readOnly
                                className="bg-muted"
                            />
                        </div>

                        {/* Input Fields */}
                        <div className="space-y-2">
                            <Label htmlFor="reportNo">Report No:</Label>
                            <Input
                                id="reportNo"
                                name="reportNo"
                                type="text"
                                value={inputFields.reportNo}
                                onChange={handleInputChange}
                                placeholder="Enter Report No"
                                readOnly={isReview}
                                className={isReview ? "bg-muted" : ""}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tagNo">TAG NO.:</Label>
                            <Input
                                id="tagNo"
                                name="tagNo"
                                type="text"
                                value={inputFields.tagNo}
                                onChange={handleInputChange}
                                placeholder="Enter TAG NO."
                                readOnly={isReview}
                                className={isReview ? "bg-muted" : ""}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="equipment">EQUIPMENT:</Label>
                            <Input
                                id="equipment"
                                name="equipment"
                                type="text"
                                value={inputFields.equipment}
                                onChange={handleInputChange}
                                placeholder="Enter EQUIPMENT"
                                readOnly={isReview}
                                className={isReview ? "bg-muted" : ""}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="projectsId">Projects ID:</Label>
                            <Input
                                id="projectsId"
                                name="projectsId"
                                type="text"
                                value={inputFields.projectsId}
                                onChange={handleInputChange}
                                placeholder="Enter Projects ID"
                                readOnly={isReview}
                                className={isReview ? "bg-muted" : ""}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="lindeDrgNo">Linde DRG No:</Label>
                            <Input
                                id="lindeDrgNo"
                                name="lindeDrgNo"
                                type="text"
                                value={inputFields.lindeDrgNo}
                                onChange={handleInputChange}
                                placeholder="Enter Linde DRG No"
                                readOnly={isReview}
                                className={isReview ? "bg-muted" : ""}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="drgNo">DRG. NO.:</Label>
                            <Input
                                id="drgNo"
                                name="drgNo"
                                type="text"
                                value={inputFields.drgNo}
                                onChange={handleInputChange}
                                placeholder="Enter DRG. NO."
                                readOnly={isReview}
                                className={isReview ? "bg-muted" : ""}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="code">CODE:</Label>
                            <Input
                                id="code"
                                name="code"
                                type="text"
                                value={inputFields.code}
                                onChange={handleInputChange}
                                placeholder="Enter CODE"
                                readOnly={isReview}
                                className={isReview ? "bg-muted" : ""}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="inspAgency">INSP. AGENCY:</Label>
                            <Input
                                id="inspAgency"
                                name="inspAgency"
                                type="text"
                                value={inputFields.inspAgency}
                                onChange={handleInputChange}
                                placeholder="Enter INSP. AGENCY"
                                readOnly={isReview}
                                className={isReview ? "bg-muted" : ""}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
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
                                className="bg-muted uppercase"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Date:</Label>
                            <Input
                                type="text"
                                value={initialData?.inspectionData?.s4_submitted_at ? new Date(initialData.inspectionData.s4_submitted_at).toLocaleDateString() : todayDate}
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
                    <div className="mt-6 flex justify-end gap-2 items-center">
                        {!isReview ? (
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? "Saving..." : "Save & Complete Stage 4"}
                            </Button>
                        ) : (
                            <>
                                {(isReview || initialData?.inspectionData?.s4_approved_at) && (
                                    <Input
                                        type="text"
                                        value={`Approve Date: ${initialData?.inspectionData?.s4_approved_at ? new Date(initialData.inspectionData.s4_approved_at).toLocaleDateString() : new Date().toLocaleDateString()}`}
                                        readOnly
                                        className="bg-muted w-auto min-w-[200px] text-center h-9 font-medium"
                                        placeholder="Approve Date"
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
                </CardContent>
            </Card>
        </div>
    )
}

export default Stage4
