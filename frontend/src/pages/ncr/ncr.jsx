import { useEffect, useState } from "react"
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
import { ArrowLeft, Plus, CheckCircle, XCircle } from "lucide-react"

const ROLES = {
    INITIATOR: "production_engineer",
    HEAD_DESIGN: "head_design",
    HEAD_WELDING: "head_welding",
    HEAD_QUALITY: "head_quality"
}

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
    resolutionBy: "", // This is now basically the Engineer selected from Stage 2 who handles Stage 3
    resolutionDate: new Date().toISOString().split("T")[0],

    // Target assignments from Stage 2 pointing to Stage 3 execution
    targetEngineer: "",
    targetHeadDesign: "",
    targetHeadWelding: "",
    targetHeadQuality: "",

    resolutionApproval: "USE AS IS", // Options: USE AS IS, REPAIR, REWORK, REJECTED
    headDesign: "",
    headDesignComments: "",
    headWelding: "",
    headWeldingComments: "",
    headQuality: "",
    headQualityComments: "",
    ai: "",
    aiComments: "",
    acceptanceDate: new Date().toISOString().split("T")[0],

    // Status tracking for reviews
    designReviewStatus: "", // PENDING, APPROVED, REJECTED
    weldingReviewStatus: "",
    qualityReviewStatus: "",

    correctiveActionVerifiedBy: "",
    correctiveActionDate: new Date().toISOString().split("T")[0],
    verifiedByQce: "u2", // Auto-selected Head Quality (u2)
    verifiedByAi: "",

    disposition: "",
    verifiedByHeadQuality: "u2",
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

    // Wireframe Workflow State
    const [currentUserRole, setCurrentUserRole] = useState(ROLES.INITIATOR);
    const [currentStage, setCurrentStage] = useState(1);
    const [subStage, setSubStage] = useState(""); // "" | "DESIGN" | "WELDING" | "QUALITY"
    const [ncrStatus, setNcrStatus] = useState("draft");

    // Dummy data fetch functions
    useEffect(() => {
        if (view === "list") {
            setIsLoadingList(true)
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
                { id: "u6", name: "Production Engineer" },
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
        setCurrentStage(1)
        setSubStage("")
        setNcrStatus("draft")
    }

    const handleCreateNew = () => {
        handleReset()
        setView("create")
    }

    // Workflow Actions
    const handleNextStage = () => {
        if (currentStage === 1) {
            setCurrentStage(2)
        } else if (currentStage === 2) {
            // Stage 2 completion logs the proposed resolution and kicks off Stage 3
            setFormData(prev => ({
                ...prev,
                assignEngineer: prev.targetEngineer,
                headDesign: prev.targetHeadDesign,
                headWelding: prev.targetHeadWelding,
                headQuality: prev.targetHeadQuality
            }))
            setCurrentStage(3)
        } else if (currentStage === 3) {
            setNcrStatus("in_review")
            setSubStage("DESIGN")
            alert("Sent for reviews. Switch to Head Design role to continue testing.")
        } else if (currentStage === 4 && ncrStatus === "approved_resolution") {
            setNcrStatus("pending_verification")
            alert("Verification details submitted. Switch to Head Quality role to continue.")
        } else if (currentStage === 4 && ncrStatus === "pending_verification") {
            setCurrentStage(5)
            alert("Verification complete. Move to Disposition.")
        } else if (currentStage === 5) {
            setNcrStatus("closed")
            alert("NCR successfully CLOSED.")
        }
    }

    const handleReviewSubmit = (reviewType, action) => {
        const isApproved = action === 'APPROVE'
        const statusField = `${reviewType.toLowerCase()}ReviewStatus`

        // Update the status for the specific reviewer
        setFormData(prev => ({ ...prev, [statusField]: isApproved ? "APPROVED" : "REJECTED" }))

        if (reviewType === 'DESIGN') {
            setSubStage('WELDING')
        }
        else if (reviewType === 'WELDING') {
            setSubStage('QUALITY')
        }
        else if (reviewType === 'QUALITY') {
            // Check if ANY of the reviewers rejected
            const isAnyRejected = formData.designReviewStatus === "REJECTED" ||
                formData.weldingReviewStatus === "REJECTED" ||
                !isApproved; // Include current Quality action

            if (isAnyRejected) {
                setNcrStatus("rejected")
                setCurrentStage(5) // End form flow
                alert("NCR has been rejected by one or more reviewers and is now CLOSED.")
            } else {
                setCurrentStage(4)
                setNcrStatus("approved_resolution")
                alert("All reviews approved. Stage 3 complete. Switch back to Initiator Role.")
            }
        }
    }

    const handleViewItem = (ncrRecord) => {
        // Load the dummy record into form data and set to view mode
        setFormData((prev) => ({
            ...prev,
            ncrNo: ncrRecord.ncr_no,
            msmNumber: ncrRecord.msm_no,
            client: ncrRecord.client,
        }))

        // For demonstration, set to closed stage if status is closed/rejected
        if (ncrRecord.status === "closed" || ncrRecord.status === "rejected") {
            setCurrentStage(5);
            setNcrStatus(ncrRecord.status);
        } else {
            setCurrentStage(1);
            setNcrStatus("draft");
        }

        setView("view")
    }

    const renderBasicInfo = (isDisabled, idPrefix) => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 pb-4 border-b border-muted/50">
            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}msmNumber`}>MSN. <span className="text-destructive">*</span></Label>
                <Select value={formData.msmNumber} onValueChange={handleJobChange} disabled={isDisabled}>
                    <SelectTrigger id={`${idPrefix}msmNumber`} className="w-full bg-background [&>span]:truncate text-left">
                        <SelectValue placeholder="Select MSN Number" />
                    </SelectTrigger>
                    <SelectContent>
                        {jobs.map((job) => (
                            <SelectItem key={job.id} value={job.id}>{job.job_number}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}ncrNo`}>NCR NO. <span className="text-destructive">*</span></Label>
                <Input id={`${idPrefix}ncrNo`} name="ncrNo" value={formData.ncrNo} readOnly disabled className="bg-muted" required />
            </div>

            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}date`}>DATE <span className="text-destructive">*</span></Label>
                <Input id={`${idPrefix}date`} name="date" type="date" value={formData.date} onChange={handleInputChange} disabled={isDisabled} required />
            </div>

            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}client`}>CLIENT <span className="text-destructive">*</span></Label>
                <Input id={`${idPrefix}client`} name="client" placeholder="Enter client name" value={formData.client} onChange={handleInputChange} disabled={isDisabled} required />
            </div>

            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}poNo`}>P.O. NO. <span className="text-destructive">*</span></Label>
                <Input id={`${idPrefix}poNo`} name="poNo" placeholder="Enter P.O. Number" value={formData.poNo} onChange={handleInputChange} disabled={isDisabled} required />
            </div>

            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}tagNo`}>TAG NO. <span className="text-destructive">*</span></Label>
                <Input id={`${idPrefix}tagNo`} name="tagNo" placeholder="Enter Tag Number" value={formData.tagNo} onChange={handleInputChange} disabled={isDisabled} />
            </div>

            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}drgNo`}>DRG. NO. <span className="text-destructive">*</span></Label>
                <Input id={`${idPrefix}drgNo`} name="drgNo" placeholder="Enter Drawing Number" value={formData.drgNo} onChange={handleInputChange} disabled={isDisabled} required />
            </div>

            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}revNo`}>REV. NO. <span className="text-destructive">*</span></Label>
                <Input id={`${idPrefix}revNo`} name="revNo" placeholder="Enter Revision Number" value={formData.revNo} onChange={handleInputChange} disabled={isDisabled} required />
            </div>
        </div>
    );

    // Logic for Disabling Sections dynamically
    const isViewMode = view === "view"

    // Stage logic calculation
    // "INITIATOR" can be basically the creator of the form (either Production or Quality).
    // Let's use the explicit assignment logic to make it work seamlessly under simulation.
    const isStage1Active = currentStage === 1 && (currentUserRole === ROLES.INITIATOR || currentUserRole === ROLES.HEAD_QUALITY)
    const isStage2Active = currentStage === 2 && (currentUserRole === ROLES.INITIATOR || currentUserRole === ROLES.HEAD_QUALITY)

    // Stage 3 Initialization requires you to act as the Assigned "Engineer" from Stage 2
    // If we're fully simulating role mapping, we can simply say if it's pending review setup:
    const isStage3InitActive = currentStage === 3 && ncrStatus !== "in_review" && (currentUserRole === ROLES.INITIATOR || currentUserRole === ROLES.HEAD_QUALITY)

    const isDesignActive = currentStage === 3 && subStage === "DESIGN" && currentUserRole === ROLES.HEAD_DESIGN
    const isWeldingActive = currentStage === 3 && subStage === "WELDING" && currentUserRole === ROLES.HEAD_WELDING
    const isQualityActive = currentStage === 3 && subStage === "QUALITY" && currentUserRole === ROLES.HEAD_QUALITY

    const isStage4InitActive = currentStage === 4 && ncrStatus === "approved_resolution" && (currentUserRole === ROLES.INITIATOR || currentUserRole === ROLES.HEAD_QUALITY)
    const isStage4QualityActive = currentStage === 4 && ncrStatus === "pending_verification" && currentUserRole === ROLES.HEAD_QUALITY

    const isStage5QualityActive = currentStage === 5 && ncrStatus !== "closed" && ncrStatus !== "rejected" && currentUserRole === ROLES.HEAD_QUALITY

    return (
        <SidebarProvider>
            <AdminSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                </header>

                <main className="flex-1 overflow-auto p-6">
                    <div className="max-w-6xl mx-auto w-full">

                        {/* Simulation Bar */}
                        {view === "create" && (
                            <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-lg mb-6 border border-primary/20 shadow-sm transition-all">
                                <div>
                                    <Label className="text-primary font-bold flex items-center gap-2">
                                        SIMULATE ROLE
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    </Label>
                                    <p className="text-xs text-muted-foreground mt-1">Change roles to test workflow stages</p>
                                </div>
                                <Select value={currentUserRole} onValueChange={setCurrentUserRole}>
                                    <SelectTrigger className="w-[280px] bg-background font-medium">
                                        <SelectValue placeholder="Select Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ROLES.INITIATOR}>Production Engineer (Initiator)</SelectItem>
                                        <SelectItem value={ROLES.HEAD_DESIGN}>Head of Design</SelectItem>
                                        <SelectItem value={ROLES.HEAD_WELDING}>Head of Welding</SelectItem>
                                        <SelectItem value={ROLES.HEAD_QUALITY}>Head of Quality (QCE)</SelectItem>
                                    </SelectContent>
                                </Select>

                                <div className="ml-auto flex items-center gap-8 text-sm bg-background border rounded-md px-4 py-2">
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">Stage</span>
                                        <span className="font-bold text-lg">{currentStage} <span className="text-muted-foreground text-sm">/ 5</span></span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">NCR Status</span>
                                        <span className="font-bold mt-1 max-w-[150px]"><StatusBadge status={ncrStatus.replace('_', ' ')} /></span>
                                    </div>
                                    {subStage && (
                                        <div className="flex flex-col border-l pl-4">
                                            <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">Pending Review</span>
                                            <span className="font-bold text-amber-600 dark:text-amber-400">{subStage}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-3xl font-bold mb-2">
                                    {view === "list" ? "NCR List" : "Create NCR"}
                                </h1>
                                <p className="text-muted-foreground">
                                    {view === "list"
                                        ? "Manage Non-Conformance Reports"
                                        : "Fill in the NCR details following the automated workflow."}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                {view === "list" ? (
                                    <Button onClick={() => handleCreateNew()}>
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
                                                                    onClick={() => handleViewItem(record)}
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
                            <form onSubmit={(e) => e.preventDefault()}>
                                <div className="grid gap-6">

                                    {/* 1. Basic Information (Combined Card 1 & 2 for Workflow UI) */}
                                    <Card className={isStage1Active ? "shadow-md" : "opacity-80"}>
                                        <CardHeader className="bg-muted/30">
                                            <CardTitle className="flex justify-between items-center text-lg">
                                                <span>STAGE 1: DESCRIPTION OF NON-CONFORMANCE</span>
                                                {currentStage > 1 && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completed</span>}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-6 space-y-6">
                                            <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                                                <div className="text-sm text-muted-foreground bg-amber-50 rounded-md p-3 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50 w-full md:w-2/3">
                                                    <strong>Initiator Note:</strong> Please fill the detailed findings of the non-conformance ensuring the MSN number matches strictly.
                                                </div>
                                            </div>

                                            {renderBasicInfo(!isStage1Active || isViewMode, "stage1-")}

                                            <div className="space-y-4 pt-2">
                                                <div className="space-y-2">
                                                    <Label className="uppercase text-md">Description of Non-Conformance:</Label>
                                                    <Textarea
                                                        name="descriptionNonConformance"
                                                        rows={4}
                                                        placeholder="Provide a detailed description of the non-conformance..."
                                                        value={formData.descriptionNonConformance}
                                                        onChange={handleInputChange}
                                                        disabled={!isStage1Active || isViewMode}
                                                        required
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="ncrRaisedAt" className="uppercase">NCR Raised At:</Label>
                                                        <Select value={formData.ncrRaisedAt} onValueChange={(val) => handleSelectChange("ncrRaisedAt", val)} disabled={!isStage1Active || isViewMode}>
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
                                                        <Select value={formData.ncrRaisedBy} onValueChange={(val) => handleSelectChange("ncrRaisedBy", val)} disabled={!isStage1Active || isViewMode}>
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
                                                        <Label htmlFor="ncrDate" className="uppercase">Date:</Label>
                                                        <Input id="ncrDate" name="ncrDate" type="date" value={formData.ncrDate} onChange={handleInputChange} disabled={!isStage1Active || isViewMode} />
                                                    </div>
                                                </div>
                                            </div>
                                            {isStage1Active && (
                                                <div className="pt-4 flex justify-end">
                                                    <Button type="button" onClick={handleNextStage} className="bg-black hover:bg-zinc-800 text-white px-8">Save & Submit</Button>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* 2. Proposed Resolution */}
                                    {currentStage >= 2 && (
                                        <Card className={isStage2Active ? "shadow-md" : "opacity-80"}>
                                            <CardHeader className="bg-muted/30">
                                                <CardTitle className="flex justify-between items-center text-lg">
                                                    <span className="uppercase">STAGE 2: Proposed Resolution with Justification</span>
                                                    {currentStage > 2 && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completed</span>}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-6 space-y-4">
                                                {renderBasicInfo(true, "stage2-")}
                                                <Textarea
                                                    name="proposedResolution"
                                                    rows={4}
                                                    placeholder="Provide the proposed resolution and its justification..."
                                                    value={formData.proposedResolution}
                                                    onChange={handleInputChange}
                                                    disabled={!isStage2Active || isViewMode}
                                                    required
                                                />
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 mt-4 border-t">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="targetEngineer" className="uppercase font-semibold text-sm">Assign Engineer:</Label>
                                                        <Select value={formData.targetEngineer} onValueChange={(val) => handleSelectChange("targetEngineer", val)} disabled={!isStage2Active || isViewMode}>
                                                            <SelectTrigger id="targetEngineer" className="w-full bg-background"><SelectValue placeholder="Assign Engineer" /></SelectTrigger>
                                                            <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="targetHeadDesign" className="uppercase font-semibold text-sm">Head Design:</Label>
                                                        <Select value={formData.targetHeadDesign} onValueChange={(val) => handleSelectChange("targetHeadDesign", val)} disabled={!isStage2Active || isViewMode}>
                                                            <SelectTrigger id="targetHeadDesign" className="w-full bg-background"><SelectValue placeholder="Assign Design Head" /></SelectTrigger>
                                                            <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="targetHeadWelding" className="uppercase font-semibold text-sm">Head Welding:</Label>
                                                        <Select value={formData.targetHeadWelding} onValueChange={(val) => handleSelectChange("targetHeadWelding", val)} disabled={!isStage2Active || isViewMode}>
                                                            <SelectTrigger id="targetHeadWelding" className="w-full bg-background"><SelectValue placeholder="Assign Welding Head" /></SelectTrigger>
                                                            <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="targetHeadQuality" className="uppercase font-semibold text-sm">Head Quality:</Label>
                                                        <Select value={formData.targetHeadQuality} onValueChange={(val) => handleSelectChange("targetHeadQuality", val)} disabled={!isStage2Active || isViewMode}>
                                                            <SelectTrigger id="targetHeadQuality" className="w-full bg-background"><SelectValue placeholder="Assign Quality Head" /></SelectTrigger>
                                                            <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="resolutionBy" className="uppercase">Submitted By:</Label>
                                                        <Select value={formData.resolutionBy} onValueChange={(val) => handleSelectChange("resolutionBy", val)} disabled={!isStage2Active || isViewMode}>
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
                                                        <Label htmlFor="resolutionDate" className="uppercase">Date:</Label>
                                                        <Input id="resolutionDate" name="resolutionDate" type="date" value={formData.resolutionDate} onChange={handleInputChange} disabled={!isStage2Active || isViewMode} />
                                                    </div>
                                                </div>

                                                {isStage2Active && (
                                                    <div className="pt-4 flex justify-end">
                                                        <Button type="button" onClick={handleNextStage} className="bg-black hover:bg-zinc-800 text-white px-8">Submit Resolution (Stage 2)</Button>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* 3. Acceptance of Proposal */}
                                    {currentStage >= 3 && (
                                        <Card className={isStage3InitActive || isDesignActive || isWeldingActive || isQualityActive ? "shadow-md" : "opacity-80"}>
                                            <CardHeader className="bg-muted/30">
                                                <CardTitle className="flex justify-between items-center text-lg">
                                                    <span className="uppercase">STAGE 3: Acceptance of Proposal for Resolution</span>
                                                    {currentStage > 3 && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completed</span>}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-6 space-y-6">
                                                {renderBasicInfo(true, "stage3-")}
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
                                                    <Label className="font-semibold text-base">Customer approval required.</Label>
                                                    <div className="w-full md:w-auto flex items-center gap-4 text-right">
                                                        <Label htmlFor="acceptanceDate" className="uppercase font-bold text-sm">DATE:</Label>
                                                        <Input id="acceptanceDate" className="w-[180px] h-9" name="acceptanceDate" type="date" value={formData.acceptanceDate} onChange={handleInputChange} disabled={!isStage3InitActive || isViewMode} />
                                                    </div>
                                                </div>

                                                <div className="space-y-3 p-4 border rounded-md">
                                                    <Label className="uppercase font-semibold block mb-2 text-sm">RESOLUTION APPROVAL SELECTION</Label>
                                                    <div className="flex flex-wrap items-center w-full justify-between pr-4">
                                                        {["USE AS IS", "REPAIR", "REWORK", "REJECTED"].map((option) => (
                                                            <div key={option} className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    id={`res-${option}`}
                                                                    checked={formData.resolutionApproval.includes(option)}
                                                                    onCheckedChange={(checked) => handleCheckboxChange("resolutionApproval", option, checked)}
                                                                    disabled={!isStage3InitActive || isViewMode}
                                                                />
                                                                <Label htmlFor={`res-${option}`} className="uppercase text-sm font-medium text-muted-foreground">{option}</Label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Assignment Overview */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="assignEngineerStage3" className="uppercase font-bold text-xs text-muted-foreground tracking-wider">Assign Engineer:</Label>
                                                        <Select value={formData.assignEngineer} disabled={true}>
                                                            <SelectTrigger id="assignEngineerStage3" className="w-full bg-background/50 text-muted-foreground"><SelectValue placeholder="Assigned Engineer" /></SelectTrigger>
                                                            <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="headDesignStage3" className="uppercase font-bold text-xs text-muted-foreground tracking-wider">Head Design:</Label>
                                                        <Select value={formData.headDesign} disabled={true}>
                                                            <SelectTrigger id="headDesignStage3" className="w-full bg-background/50 text-muted-foreground"><SelectValue placeholder="Head of Design" /></SelectTrigger>
                                                            <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="headWeldingStage3" className="uppercase font-bold text-xs text-muted-foreground tracking-wider">Head Welding:</Label>
                                                        <Select value={formData.headWelding} disabled={true}>
                                                            <SelectTrigger id="headWeldingStage3" className="w-full bg-background/50 text-muted-foreground"><SelectValue placeholder="Head of Welding" /></SelectTrigger>
                                                            <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="headQualityStage3" className="uppercase font-bold text-xs text-muted-foreground tracking-wider">Head Quality:</Label>
                                                        <Select value={formData.headQuality} disabled={true}>
                                                            <SelectTrigger id="headQualityStage3" className="w-full bg-background/50 text-muted-foreground"><SelectValue placeholder="Head of Quality" /></SelectTrigger>
                                                            <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                {/* Active Reviewer Section */}
                                                {(isDesignActive || formData.designReviewStatus) && (
                                                    <div className="mt-4 p-4 rounded-md border">
                                                        <Label className="uppercase font-bold flex items-center gap-2 mb-4">
                                                            HEAD DESIGN:
                                                            {formData.designReviewStatus === 'APPROVED' && <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded text-xs">APPROVED</span>}
                                                            {formData.designReviewStatus === 'REJECTED' && <span className="text-red-600 bg-red-100 px-2 py-0.5 rounded text-xs">REJECTED</span>}
                                                        </Label>

                                                        <div className="space-y-4">
                                                            <Select value={formData.headDesign} disabled={true}>
                                                                <SelectTrigger className="w-full md:w-1/2 bg-background"><SelectValue placeholder="Assigned Head of Design" /></SelectTrigger>
                                                                <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                                            </Select>
                                                            <Textarea name="headDesignComments" placeholder="Add comments or approval notes..." value={formData.headDesignComments} onChange={handleInputChange} className="w-full min-h-[5rem] bg-background" disabled={!isDesignActive || isViewMode} />

                                                            {isDesignActive && (
                                                                <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-2">
                                                                    <div className="flex items-center space-x-2 mr-auto sm:mr-4">
                                                                        <Checkbox id="na-design" />
                                                                        <Label htmlFor="na-design" className="text-sm font-medium">NA (if applicable)</Label>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                                                        <Button type="button" variant="outline" className="flex-1 sm:flex-none px-8 border-gray-300 font-medium text-black hover:bg-gray-100" onClick={() => handleReviewSubmit('DESIGN', 'REJECT')}>Reject</Button>
                                                                        <Button type="button" className="flex-1 sm:flex-none px-8 bg-black hover:bg-zinc-800 text-white font-medium" onClick={() => handleReviewSubmit('DESIGN', 'APPROVE')}>Approve</Button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {(isWeldingActive || formData.weldingReviewStatus) && (
                                                    <div className="mt-4 p-4 rounded-md border">
                                                        <Label className="uppercase font-bold flex items-center gap-2 mb-4">
                                                            HEAD WELDING:
                                                            {formData.weldingReviewStatus === 'APPROVED' && <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded text-xs">APPROVED</span>}
                                                            {formData.weldingReviewStatus === 'REJECTED' && <span className="text-red-600 bg-red-100 px-2 py-0.5 rounded text-xs">REJECTED</span>}
                                                        </Label>

                                                        <div className="space-y-4">
                                                            <Select value={formData.headWelding} disabled={true}>
                                                                <SelectTrigger className="w-full md:w-1/2 bg-background"><SelectValue placeholder="Assigned Head of Welding" /></SelectTrigger>
                                                                <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                                            </Select>
                                                            <Textarea name="headWeldingComments" placeholder="Add comments or approval notes..." value={formData.headWeldingComments} onChange={handleInputChange} className="w-full min-h-[5rem] bg-background" disabled={!isWeldingActive || isViewMode} />

                                                            {isWeldingActive && (
                                                                <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-2">
                                                                    <div className="flex items-center space-x-2 mr-auto sm:mr-4">
                                                                        <Checkbox id="na-welding" />
                                                                        <Label htmlFor="na-welding" className="text-sm font-medium">NA (if applicable)</Label>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                                                        <Button type="button" variant="outline" className="flex-1 sm:flex-none px-8 border-gray-300 font-medium text-black hover:bg-gray-100" onClick={() => handleReviewSubmit('WELDING', 'REJECT')}>Reject</Button>
                                                                        <Button type="button" className="flex-1 sm:flex-none px-8 bg-black hover:bg-zinc-800 text-white font-medium" onClick={() => handleReviewSubmit('WELDING', 'APPROVE')}>Approve</Button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {(isQualityActive || formData.qualityReviewStatus) && (
                                                    <div className="mt-4 p-4 rounded-md border">
                                                        <Label className="uppercase font-bold flex items-center gap-2 mb-4">
                                                            HEAD QUALITY:
                                                            {formData.qualityReviewStatus === 'APPROVED' && <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded text-xs">APPROVED</span>}
                                                            {formData.qualityReviewStatus === 'REJECTED' && <span className="text-red-600 bg-red-100 px-2 py-0.5 rounded text-xs">REJECTED</span>}
                                                        </Label>

                                                        <div className="space-y-4">
                                                            <Select value={formData.headQuality} disabled={true}>
                                                                <SelectTrigger className="w-full md:w-1/2 bg-background"><SelectValue placeholder="Assigned Head of Quality" /></SelectTrigger>
                                                                <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                                            </Select>
                                                            <Textarea name="headQualityComments" placeholder="Add comments or approval notes..." value={formData.headQualityComments} onChange={handleInputChange} className="w-full min-h-[5rem] bg-background" disabled={!isQualityActive || isViewMode} />

                                                            {isQualityActive && (
                                                                <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-2">
                                                                    <div className="flex items-center space-x-2 mr-auto sm:mr-4">
                                                                        <Checkbox id="na-quality" />
                                                                        <Label htmlFor="na-quality" className="text-sm font-medium">NA (if applicable)</Label>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                                                        <Button type="button" variant="outline" className="flex-1 sm:flex-none px-8 border-gray-300 font-medium text-black hover:bg-gray-100" onClick={() => handleReviewSubmit('QUALITY', 'REJECT')}>Reject</Button>
                                                                        <Button type="button" className="flex-1 sm:flex-none px-8 bg-black hover:bg-zinc-800 text-white font-medium" onClick={() => handleReviewSubmit('QUALITY', 'APPROVE')}>Approve</Button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {isStage3InitActive && (
                                                    <div className="mt-6 pt-4 border-t space-y-4">
                                                        <div className="space-y-2">
                                                            <Textarea
                                                                name="proposedResolution"
                                                                rows={3}
                                                                placeholder="Add comments or approval notes..."
                                                                value={formData.proposedResolution}
                                                                onChange={handleInputChange}
                                                                disabled={!isStage3InitActive || isViewMode}
                                                            />
                                                        </div>
                                                        <div className="flex justify-end pt-2">
                                                            <Button type="button" onClick={handleNextStage} className="w-full md:w-auto bg-black hover:bg-zinc-800 text-white font-medium px-8">Save & Submit (Stage 3)</Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* 4. Corrective Action Verification */}
                                    {currentStage >= 4 && ncrStatus !== "rejected" && (
                                        <Card className={(isStage4InitActive || isStage4QualityActive) ? "shadow-md" : "opacity-80"}>
                                            <CardHeader className="bg-muted/30">
                                                <CardTitle className="uppercase flex justify-between items-center text-lg">
                                                    <span>STAGE 4: Corrective Action Verification Carried Out By</span>
                                                    {currentStage > 4 && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completed</span>}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-6 space-y-4">
                                                {renderBasicInfo(true, "stage4-")}
                                                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                                    <div className="flex-1 w-full space-y-2">
                                                        <Textarea
                                                            name="correctiveActionVerifiedBy"
                                                            rows={3}
                                                            placeholder="Initiator: Provide details about the corrective action verification process..."
                                                            value={formData.correctiveActionVerifiedBy}
                                                            onChange={handleInputChange}
                                                            disabled={!isStage4InitActive || isViewMode}
                                                            className={isStage4InitActive ? "bg-muted/10" : ""}
                                                        />
                                                    </div>
                                                    <div className="w-full md:w-1/4 space-y-2 min-w-[200px]">
                                                        <div className="flex flex-col space-y-2">
                                                            <Label htmlFor="correctiveActionDate" className="uppercase">Date:</Label>
                                                            <Input id="correctiveActionDate" name="correctiveActionDate" type="date" value={formData.correctiveActionDate} onChange={handleInputChange} disabled={!isStage4InitActive || isViewMode} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t pt-4">
                                                    <div className={`space-y-2 p-3 rounded border ${isStage4QualityActive ? 'bg-muted/10' : ''}`}>
                                                        <Label htmlFor="verifiedByQce" className="uppercase font-bold">VERIFIED BY QCE:</Label>
                                                        <Select
                                                            value={formData.headQuality} // Auto-selects Head Quality from earlier
                                                            disabled={true} // Initiator has no choice, Head Quality handles
                                                        >
                                                            <SelectTrigger id="verifiedByQce" className="w-full bg-background">
                                                                <SelectValue placeholder="Assigned Quality Control Engineer" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {users.map((user) => (
                                                                    <SelectItem key={user.id} value={user.id}>{user.displayName}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>

                                                        {isStage4QualityActive && (
                                                            <div className="pt-4 flex">
                                                                <Button type="button" onClick={handleNextStage} className="w-full bg-black hover:bg-zinc-800 text-white">Verify & Approve Action</Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {isStage4InitActive && (
                                                    <div className="pt-4 flex justify-end">
                                                        <Button type="button" onClick={handleNextStage} className="bg-black hover:bg-zinc-800 text-white px-8">Submit CA Verification (Stage 4)</Button>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* 6. Disposition */}
                                    {currentStage >= 5 && ncrStatus !== "rejected" && (
                                        <Card className={isStage5QualityActive ? "shadow-md" : "opacity-80"}>
                                            <CardHeader className="bg-muted/30">
                                                <CardTitle className="uppercase flex justify-between items-center text-lg">
                                                    <span className="text-green-700 dark:text-green-500">STAGE 5: FINAL DISPOSITION</span>
                                                    {ncrStatus === "closed" && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Closed</span>}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-6 space-y-4">
                                                {renderBasicInfo(true, "stage5-")}
                                                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                                    <div className="flex-1 w-full space-y-2">
                                                        <Textarea
                                                            name="disposition"
                                                            rows={3}
                                                            placeholder="Head Quality: Provide final disposition notes or required actions..."
                                                            value={formData.disposition}
                                                            onChange={handleInputChange}
                                                            disabled={!isStage5QualityActive || isViewMode}
                                                            className={isStage5QualityActive ? "bg-muted/10" : ""}
                                                        />
                                                    </div>
                                                    <div className="w-full md:w-1/4 space-y-2 min-w-[200px]">
                                                        <div className="flex flex-col space-y-2">
                                                            <Label htmlFor="dispositionDate" className="uppercase">DATE:</Label>
                                                            <Input id="dispositionDate" name="dispositionDate" type="date" value={formData.dispositionDate} onChange={handleInputChange} disabled={!isStage5QualityActive || isViewMode} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="w-full md:w-1/2 space-y-2 border-t pt-4">
                                                    <Label htmlFor="verifiedByHeadQuality" className="uppercase font-bold">VERIFIED BY HEAD QUALITY:</Label>
                                                    <Select
                                                        value={formData.headQuality}
                                                        disabled={true}
                                                    >
                                                        <SelectTrigger id="verifiedByHeadQuality" className="w-full bg-background">
                                                            <SelectValue placeholder="Assigned Head of Quality" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {users.map((user) => (
                                                                <SelectItem key={user.id} value={user.id}>{user.displayName}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {isStage5QualityActive && (
                                                    <div className="pt-4 flex justify-end">
                                                        <Button type="button" onClick={handleNextStage} className="w-full bg-black hover:bg-zinc-800 text-white font-bold tracking-wide">CLOSE NCR</Button>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Rejected Indicator */}
                                    {ncrStatus === "rejected" && (
                                        <div className="p-6 bg-red-50 text-red-900 border border-red-200 rounded-md shadow flex flex-col items-center justify-center text-center">
                                            <XCircle className="w-12 h-12 text-red-500 mb-2" />
                                            <h2 className="text-2xl font-bold uppercase tracking-widest">NCR Rejected & Closed</h2>
                                            <p className="opacity-80 mt-1">This NCR formulation has been rejected by reviewers and is therefore permanently closed.</p>
                                        </div>
                                    )}

                                </div>
                            </form>
                        )}
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider >
    )
}

export default CreateNCR
