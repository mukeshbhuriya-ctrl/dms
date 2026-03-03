import { useCallback, useEffect, useState } from "react"
import { AdminSidebar } from "@/components"
import {
    SidebarProvider,
    SidebarInset,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ArrowLeft, Plus } from "lucide-react"

const defaultFormData = {
    msmNumber: "",
    ncrNo: "",
    date: new Date().toISOString().split("T")[0],
    client: "",
    poNo: "",
    tagNo: "",
    drgNo: "",
    revNo: "",

    descriptionNonConformance: "",
    ncrRaisedAt: "",
    ncrRaisedBy: "",
    ncrDate: new Date().toISOString().split("T")[0],

    proposedResolution: "",
    resolutionBy: "",
    resolutionDate: new Date().toISOString().split("T")[0],

    resolutionApproval: "", // Options: USE_AS_IS, REPAIR, REWORK, REJECTED
    headDesign: "",
    headDesignComments: "",
    headWelding: "",
    headWeldingComments: "",
    headQuality: "",
    headQualityComments: "",
    ai: "",
    aiComments: "",
    acceptanceDate: new Date().toISOString().split("T")[0],

    correctiveActionVerifiedBy: "",
    correctiveActionDate: new Date().toISOString().split("T")[0],
    verifiedByQce: "",
    verifiedByAi: "",

    disposition: "",
    verifiedByHeadQuality: "",
    dispositionDate: new Date().toISOString().split("T")[0]
}

const normalizeUser = (user) => {
    return {
        id: String(user.id),
        name: user.name,
        displayName: user.name,
    }
}

function CreateNCR() {
    const [view, setView] = useState("list")
    const [ncrList, setNcrList] = useState([])
    const [isLoadingList, setIsLoadingList] = useState(false)

    const [jobs, setJobs] = useState([])
    const [users, setUsers] = useState([])

    const [formData, setFormData] = useState(defaultFormData)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Dummy data fetch functions
    useEffect(() => {
        if (view === "list") {
            setIsLoadingList(true)
            // Simulate API call for list
            setTimeout(() => {
                setNcrList([
                    { id: "1", ncr_no: "NCR-2023-001", client: "Client A", msm_no: "MSN-1001", status: "pending" },
                    { id: "2", ncr_no: "NCR-2023-002", client: "Client B", msm_no: "MSN-1002", status: "approved" },
                ])
                setIsLoadingList(false)
            }, 500)
        }
    }, [view])

    useEffect(() => {
        if (view === "create") {
            // Load dummy jobs and users
            setJobs([
                { id: "job1", job_number: "MSN-1001", client: "Acme Corp", poNo: "PO-9912", tagNo: "TAG-A1", drgNo: "DRG-001", revNo: "A", next_ncr_no: "NCR-2023-003" },
                { id: "job2", job_number: "MSN-1002", client: "Globex", poNo: "PO-8823", tagNo: "TAG-B2", drgNo: "DRG-002", revNo: "B", next_ncr_no: "NCR-2023-004" }
            ])
            setUsers([
                { id: "u1", name: "Shreno engineering Limited" },
                { id: "u2", name: "John Doe (Quality)" },
                { id: "u3", name: "Jane Smith (Design)" },
                { id: "u4", name: "Mike Johnson (Welding)" },
                { id: "u5", name: "AI Inspector" },
            ].map(normalizeUser))
        }
    }, [view])

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }))
    }

    const handleSelectChange = (name, value) => {
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    const handleJobChange = (jobId) => {
        const selectedJob = jobs.find((job) => job.id === jobId)

        setFormData((prev) => ({
            ...prev,
            msmNumber: jobId,
            ncrNo: selectedJob?.next_ncr_no || "",
            client: selectedJob?.client || "",
            poNo: selectedJob?.poNo || "",
            tagNo: selectedJob?.tagNo || "",
            drgNo: selectedJob?.drgNo || "",
            revNo: selectedJob?.revNo || "",
        }))
    }

    const handleReset = () => {
        setFormData(defaultFormData)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)

        // Simulate submission
        setTimeout(() => {
            alert("NCR Created Successfully! (Dummy)")
            setIsSubmitting(false)
            handleReset()
            setView("list")
        }, 1000)
    }

    const isViewMode = view === "view"
    const isCreateMode = view === "create"
    const isFormDisabled = isSubmitting || isViewMode

    const handleCheckboxChange = (field, checked) => {
        setFormData(prev => ({ ...prev, [field]: checked }))
    }

    return (
        <SidebarProvider>
            <AdminSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                </header>

                <main className="flex-1 overflow-auto p-6">
                    <div className="max-w-6xl mx-auto w-full">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-3xl font-bold mb-2">
                                    {view === "list" ? "NCR List" : "Create NCR"}
                                </h1>
                                <p className="text-muted-foreground">
                                    {view === "list"
                                        ? "Manage Non-Conformance Reports"
                                        : "Fill in the NCR details based on the selected job."}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                {view === "list" ? (
                                    <Button onClick={() => setView("create")}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create NCR
                                    </Button>
                                ) : (
                                    <Button variant="outline" onClick={() => setView("list")}>
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Back to List
                                    </Button>
                                )}
                            </div>
                        </div>

                        {view === "list" ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>NCR Records</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-md border overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>NCR No</TableHead>
                                                    <TableHead>MSN No</TableHead>
                                                    <TableHead>Client</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="w-[120px]">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {isLoadingList ? (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center h-24">
                                                            Loading NCR data...
                                                        </TableCell>
                                                    </TableRow>
                                                ) : ncrList.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center h-24">
                                                            No NCR records found.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    ncrList.map((record) => (
                                                        <TableRow key={record.id}>
                                                            <TableCell className="font-medium">{record.ncr_no}</TableCell>
                                                            <TableCell>{record.msm_no}</TableCell>
                                                            <TableCell>{record.client}</TableCell>
                                                            <TableCell>
                                                                <StatusBadge status={record.status} />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled
                                                                >
                                                                    View
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <div className="grid gap-6">

                                    {/* 1. Basic Information */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Basic Information</CardTitle>
                                            <CardDescription>Select MSN to auto-fill</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="msmNumber">MSN. <span className="text-destructive">*</span></Label>
                                                    <Select
                                                        value={formData.msmNumber}
                                                        onValueChange={handleJobChange}
                                                        disabled={isFormDisabled}
                                                    >
                                                        <SelectTrigger id="msmNumber" className="w-full">
                                                            <SelectValue placeholder="Select MSN Number" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {jobs.map((job) => (
                                                                <SelectItem key={job.id} value={job.id}>
                                                                    {job.job_number}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="ncrNo">NCR NO. <span className="text-destructive">*</span></Label>
                                                    <Input id="ncrNo" name="ncrNo" value={formData.ncrNo} readOnly disabled className="bg-muted" required />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="date">DATE <span className="text-destructive">*</span></Label>
                                                    <Input id="date" name="date" type="date" value={formData.date} onChange={handleInputChange} disabled={isFormDisabled} required />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="client">CLIENT <span className="text-destructive">*</span></Label>
                                                    <Input id="client" name="client" placeholder="Enter client name" value={formData.client} onChange={handleInputChange} disabled={isFormDisabled} required />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="poNo">P.O. NO. <span className="text-destructive">*</span></Label>
                                                    <Input id="poNo" name="poNo" placeholder="Enter P.O. Number" value={formData.poNo} onChange={handleInputChange} disabled={isFormDisabled} required />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="tagNo">TAG NO. <span className="text-destructive">*</span></Label>
                                                    <Input id="tagNo" name="tagNo" placeholder="Enter Tag Number" value={formData.tagNo} onChange={handleInputChange} disabled={isFormDisabled} />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="drgNo">DRG. NO. <span className="text-destructive">*</span></Label>
                                                    <Input id="drgNo" name="drgNo" placeholder="Enter Drawing Number" value={formData.drgNo} onChange={handleInputChange} disabled={isFormDisabled} required />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="revNo">REV. NO. <span className="text-destructive">*</span></Label>
                                                    <Input id="revNo" name="revNo" placeholder="Enter Revision Number" value={formData.revNo} onChange={handleInputChange} disabled={isFormDisabled} required />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* 2. Description of Non-Conformance */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="uppercase">DESCRIPTION OF NON-CONFORMANCE:</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <Textarea
                                                name="descriptionNonConformance"
                                                rows={4}
                                                placeholder="Provide a detailed description of the non-conformance..."
                                                value={formData.descriptionNonConformance}
                                                onChange={handleInputChange}
                                                disabled={isFormDisabled}
                                                required
                                            />
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="ncrRaisedAt" className="uppercase">NCR Raised At:</Label>
                                                    <Select
                                                        value={formData.ncrRaisedAt}
                                                        onValueChange={(val) => handleSelectChange("ncrRaisedAt", val)}
                                                        disabled={isFormDisabled}
                                                    >
                                                        <SelectTrigger id="ncrRaisedAt" className="w-full">
                                                            <SelectValue placeholder="Select Team member" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {users.map((user) => (
                                                                <SelectItem key={user.id} value={user.id}>{user.displayName}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="ncrRaisedBy" className="uppercase">NCR Raised By:</Label>
                                                    <Select
                                                        value={formData.ncrRaisedBy}
                                                        onValueChange={(val) => handleSelectChange("ncrRaisedBy", val)}
                                                        disabled={isFormDisabled}
                                                    >
                                                        <SelectTrigger id="ncrRaisedBy" className="w-full">
                                                            <SelectValue placeholder="Select team member" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {users.map((user) => (
                                                                <SelectItem key={user.id} value={user.id}>{user.displayName}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="ncrDate" className="uppercase">DATE:</Label>
                                                    <Input id="ncrDate" name="ncrDate" type="date" value={formData.ncrDate} onChange={handleInputChange} disabled={isFormDisabled} />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* 3. Proposed Resolution */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="uppercase">PROPOSED RESOLUTION WITH JUSTIFICATION:</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <Textarea
                                                name="proposedResolution"
                                                rows={4}
                                                placeholder="Provide the proposed resolution and its justification..."
                                                value={formData.proposedResolution}
                                                onChange={handleInputChange}
                                                disabled={isFormDisabled}
                                                required
                                            />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="resolutionBy" className="uppercase">BY:</Label>
                                                    <Select
                                                        value={formData.resolutionBy}
                                                        onValueChange={(val) => handleSelectChange("resolutionBy", val)}
                                                        disabled={isFormDisabled}
                                                    >
                                                        <SelectTrigger id="resolutionBy" className="w-full">
                                                            <SelectValue placeholder="Select team member" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {users.map((user) => (
                                                                <SelectItem key={user.id} value={user.id}>{user.displayName}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="resolutionDate" className="uppercase">DATE:</Label>
                                                    <Input id="resolutionDate" name="resolutionDate" type="date" value={formData.resolutionDate} onChange={handleInputChange} disabled={isFormDisabled} />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* 4. Acceptance of Proposal */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="uppercase">ACCEPTANCE OF PROPOSAL FOR RESOLUTION:</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <Label className="font-medium text-base">Customer approval required.</Label>
                                                <div className="w-1/4 space-y-2 text-right">
                                                    <div className="flex items-center space-x-2 justify-end">
                                                        <Label htmlFor="acceptanceDate" className="uppercase whitespace-nowrap">DATE:</Label>
                                                        <Input id="acceptanceDate" className="w-40" name="acceptanceDate" type="date" value={formData.acceptanceDate} onChange={handleInputChange} disabled={isFormDisabled} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3 border p-4 rounded-md">
                                                <Label className="uppercase block mb-2">RESOLUTION APPROVAL</Label>
                                                <div className="flex flex-wrap justify-between items-center w-full">
                                                    {["USE AS IS", "REPAIR", "REWORK", "REJECTED"].map((option) => (
                                                        <div key={option} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`res-${option}`}
                                                                checked={formData.resolutionApproval === option}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) handleSelectChange("resolutionApproval", option)
                                                                }}
                                                                disabled={isFormDisabled}
                                                            />
                                                            <Label htmlFor={`res-${option}`} className="uppercase">{option}</Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                                                <div className="space-y-2">
                                                    <Label className="uppercase">HEAD DESIGN:</Label>
                                                    <Select value={formData.headDesign} onValueChange={(val) => handleSelectChange("headDesign", val)} disabled={isFormDisabled}>
                                                        <SelectTrigger className="w-full"><SelectValue placeholder="Select Head of Design" /></SelectTrigger>
                                                        <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                    <Textarea name="headDesignComments" placeholder="Add comments or approval notes..." value={formData.headDesignComments} onChange={handleInputChange} className="mt-2 h-20" disabled={isFormDisabled} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="uppercase">HEAD WELDING:</Label>
                                                    <Select value={formData.headWelding} onValueChange={(val) => handleSelectChange("headWelding", val)} disabled={isFormDisabled}>
                                                        <SelectTrigger className="w-full"><SelectValue placeholder="Select Head of Welding" /></SelectTrigger>
                                                        <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                    <Textarea name="headWeldingComments" placeholder="Add comments or approval notes..." value={formData.headWeldingComments} onChange={handleInputChange} className="mt-2 h-20" disabled={isFormDisabled} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="uppercase">HEAD QUALITY:</Label>
                                                    <Select value={formData.headQuality} onValueChange={(val) => handleSelectChange("headQuality", val)} disabled={isFormDisabled}>
                                                        <SelectTrigger className="w-full"><SelectValue placeholder="Select Head of Quality" /></SelectTrigger>
                                                        <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                    <Textarea name="headQualityComments" placeholder="Add comments or approval notes..." value={formData.headQualityComments} onChange={handleInputChange} className="mt-2 h-20" disabled={isFormDisabled} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="uppercase">AI:</Label>
                                                    <div className="h-[128px] border rounded-md flex items-center justify-center text-muted-foreground font-semibold">
                                                        AI
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* 5. Corrective Action Verification */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="uppercase">CORRECTIVE ACTION VERIFICATION CARRIED OUT BY:</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex justify-between items-start gap-4">
                                                <Textarea
                                                    name="correctiveActionVerifiedBy"
                                                    rows={3}
                                                    placeholder="Provide details about the corrective action verification process..."
                                                    value={formData.correctiveActionVerifiedBy}
                                                    onChange={handleInputChange}
                                                    disabled={isFormDisabled}
                                                    className="flex-1"
                                                />
                                                <div className="w-1/4 space-y-2 min-w-[200px]">
                                                    <div className="flex flex-col space-y-2">
                                                        <Label htmlFor="correctiveActionDate" className="uppercase">DATE:</Label>
                                                        <Input id="correctiveActionDate" name="correctiveActionDate" type="date" value={formData.correctiveActionDate} onChange={handleInputChange} disabled={isFormDisabled} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t pt-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="verifiedByQce" className="uppercase">VERIFIED BY QCE:</Label>
                                                    <Select
                                                        value={formData.verifiedByQce}
                                                        onValueChange={(val) => handleSelectChange("verifiedByQce", val)}
                                                        disabled={isFormDisabled}
                                                    >
                                                        <SelectTrigger id="verifiedByQce" className="w-full">
                                                            <SelectValue placeholder="Select quality control engineer" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {users.map((user) => (
                                                                <SelectItem key={user.id} value={user.id}>{user.displayName}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="verifiedByAi" className="uppercase">VERIFIED BY AI:</Label>
                                                    <div className="h-10 border rounded-md flex items-center justify-center text-muted-foreground font-semibold">
                                                        AI
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* 6. Disposition */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="uppercase">DISPOSITION:</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex justify-between items-start gap-4">
                                                <Textarea
                                                    name="disposition"
                                                    rows={3}
                                                    placeholder="Provide final disposition notes or required actions..."
                                                    value={formData.disposition}
                                                    onChange={handleInputChange}
                                                    disabled={isFormDisabled}
                                                    className="flex-1"
                                                />
                                                <div className="w-1/4 space-y-2 min-w-[200px]">
                                                    <div className="flex flex-col space-y-2">
                                                        <Label htmlFor="dispositionDate" className="uppercase">DATE:</Label>
                                                        <Input id="dispositionDate" name="dispositionDate" type="date" value={formData.dispositionDate} onChange={handleInputChange} disabled={isFormDisabled} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="w-full md:w-1/2 space-y-2 border-t pt-4">
                                                <Label htmlFor="verifiedByHeadQuality" className="uppercase">VERIFIED BY HEAD QUALITY:</Label>
                                                <Select
                                                    value={formData.verifiedByHeadQuality}
                                                    onValueChange={(val) => handleSelectChange("verifiedByHeadQuality", val)}
                                                    disabled={isFormDisabled}
                                                    defaultValue="u2" // Assuming u2 as default Head Quality
                                                >
                                                    <SelectTrigger id="verifiedByHeadQuality" className="w-full">
                                                        <SelectValue placeholder="Select Head of Quality" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {users.map((user) => (
                                                            <SelectItem key={user.id} value={user.id}>{user.displayName}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {isCreateMode && (
                                        <div className="flex justify-end gap-4">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleReset}
                                                disabled={isSubmitting}
                                            >
                                                Reset
                                            </Button>
                                            <Button type="submit" disabled={isSubmitting}>
                                                {isSubmitting ? "Creating..." : "Create NCR"}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </form>
                        )}
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}

export default CreateNCR
