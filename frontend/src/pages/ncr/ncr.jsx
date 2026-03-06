import { useEffect, useState, useCallback } from "react"
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
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { DataTable } from "@/components/shared/DataTable"
import { ArrowLeft, Plus, CheckCircle, XCircle, Eye, Pencil } from "lucide-react"
import apiClient from "@/api/api.client"
import { useAuth } from "@/context/AuthContext"

const normalizeUser = (user) => {
    const id = String(user?.id || "")
    const name = String(user?.name || user?.full_name || user?.email || "User")
    const empid = String(user?.empid || user?.employeeId || "")
    return {
        id,
        name,
        empid,
        displayName: empid ? `${name} (${empid})` : `${name}`,
    }
}

const getAuthHeaders = () => {
    const authData = localStorage.getItem("user_auth")
    let token = null
    try {
        const parsed = JSON.parse(authData || "{}")
        token = parsed?.payload?.token || parsed?.token || null
    } catch { /* ignore */ }
    const headers = { "Content-Type": "application/json" }
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
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
    resolutionBy: "",
    resolutionDate: new Date().toISOString().split("T")[0],

    targetEngineer: "",
    targetHeadDesign: "",
    targetHeadWelding: "",
    targetHeadQuality: "",

    resolutionApproval: ["USE AS IS"],
    headDesign: "",
    headDesignComments: "",
    headWelding: "",
    headWeldingComments: "",
    headQuality: "",
    headQualityComments: "",
    acceptanceDate: new Date().toISOString().split("T")[0],

    designReviewStatus: "",
    weldingReviewStatus: "",
    qualityReviewStatus: "",

    correctiveActionVerifiedBy: "",
    correctiveActionDate: new Date().toISOString().split("T")[0],
    verifiedByQce: "",

    disposition: "",
    verifiedByHeadQuality: "",
    dispositionDate: new Date().toISOString().split("T")[0]
}

// ─── List View ───────────────────────────────────────────────────────────────
function ListView({ onCreateClick, onViewClick, onOpenClick }) {
    const { user } = useAuth()
    const currentUserId = user?.id || ""
    const [error, setError] = useState("")

    // Check if the logged-in user can take action on a given NCR row
    const canUserAct = (row) => {
        if (row.status === "CLOSED" || row.status === "REJECTED") return false
        const stage = row.current_stage
        const ncrSt = row.ncr_status

        const isAdmin = user?.roles?.includes("ADMIN")
        const creatorId = row.ncr_raised_by || row.initiator?.id

        // Admins can potentially bypass or view, but strictly adhering to IDs for workflow:
        // Stage 1 Action is "Create", not in table rows.
        if (stage === 1) return false

        // Stage 2 (Draft -> Submitted): Only the creator can submit a proposed resolution
        if (stage === 2) return creatorId === currentUserId

        // Stage 3 init (assign engineer): Only the target engineer can accept the proposal
        if (stage === 3 && ncrSt === "stage2_submitted") {
            return (row.target_engineer_id || row.target_engineer?.id) === currentUserId
        }

        // Stage 3 review: Only the specific assigned heads can review
        if (stage === 3 && ncrSt === "stage3_in_review") {
            const designId = row.target_head_design?.id || row.target_head_design_id
            const weldingId = row.target_head_welding?.id || row.target_head_welding_id
            const qualityId = row.target_head_quality?.id || row.target_head_quality_id
            const hasPending = (id, status) => id === currentUserId && (!status || status === "PENDING")
            return hasPending(designId, row.design_review_status) ||
                hasPending(weldingId, row.welding_review_status) ||
                hasPending(qualityId, row.quality_review_status)
        }

        // Stage 4 (Approved Resolution -> Pending Disposition): The assigned engineer performs corrective action
        if (stage === 4) {
            return (row.target_engineer_id || row.target_engineer?.id) === currentUserId
        }

        // Stage 5 (Pending disposition -> Closed): The assigned QCE verifies the disposition
        if (stage === 5) {
            return (row.verified_by_qce_id || row.qce_verifier?.id) === currentUserId
        }

        return false
    }

    const columns = [
        { header: "NCR No", accessorKey: "ncr_no" },
        { header: "MSN", accessorKey: "msn" },
        { header: "Client", accessorKey: "client" },
        {
            header: "Stage",
            accessorKey: "current_stage",
            cell: (row) => `Stage ${row.current_stage}/5`
        },
        {
            header: "Design",
            accessorKey: "design_review_status",
            cell: (row) => <StatusBadge status={row.design_review_status || "PENDING"} />
        },
        {
            header: "Welding",
            accessorKey: "welding_review_status",
            cell: (row) => <StatusBadge status={row.welding_review_status || "PENDING"} />
        },
        {
            header: "Quality",
            accessorKey: "quality_review_status",
            cell: (row) => <StatusBadge status={row.quality_review_status || "PENDING"} />
        },
        {
            header: "Status",
            accessorKey: "status",
            cell: (row) => <StatusBadge status={row.status} />
        },
        {
            header: "Created",
            accessorKey: "createdAt",
            cell: (row) => new Date(row.createdAt).toLocaleDateString(),
        },
        {
            id: "actions",
            header: "Action",
            cell: (row) => (
                <div className="flex items-center gap-1">
                    {canUserAct(row) && (
                        <Button variant="outlined" size="sm" onClick={() => onOpenClick(row.id)} title="Open & take action" className="border">
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Open
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => onViewClick(row.id)} title="View full NCR">
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                    </Button>
                </div>
            ),
        },
    ]

    const fetchData = useCallback(async ({ page, limit, search }) => {
        const params = new URLSearchParams({ page, limit, ...(search ? { search } : {}) })
        const res = await apiClient.get(`/api/ncr/list`, Object.fromEntries(params))
        return { data: res.data, meta: res.meta }
    }, [])

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-1">NCR List</h1>
                    <p className="text-muted-foreground">Manage Non-Conformance Reports</p>
                </div>
                <Button onClick={onCreateClick}>
                    <Plus className="h-4 w-4 mr-2" /> Create NCR
                </Button>
            </div>

            {error && (
                <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                </div>
            )}

            <DataTable columns={columns} fetchData={fetchData} />
        </div>
    )
}

// ─── Create / View Form ──────────────────────────────────────────────────────
function FormView({ ncrId, onBack, onSuccess, isViewOnly = false, isOpenMode = false }) {
    const { user } = useAuth()
    const currentUserId = user?.id || ""

    const [jobs, setJobs] = useState([])
    const [users, setUsers] = useState([])
    const [jobsLoading, setJobsLoading] = useState(true)
    const [formData, setFormData] = useState(defaultFormData)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState("")

    const [currentStage, setCurrentStage] = useState(1)
    const [ncrStatus, setNcrStatus] = useState("draft")
    const [ncrDbId, setNcrDbId] = useState(ncrId || null) // DB id after creation

    // Fetch jobs and users on mount
    useEffect(() => {
        apiClient.get("/api/common/jobs?limit=200")
            .then((res) => setJobs(res.data || []))
            .catch(() => setJobs([]))
            .finally(() => setJobsLoading(false))

        apiClient.get("/api/ncr/users")
            .then((res) => {
                const userList = Array.isArray(res?.data)
                    ? res.data.map(normalizeUser).filter((u) => u.id)
                    : []
                setUsers(userList)
            })
            .catch(() => setUsers([]))
    }, [])

    // Load existing NCR if ncrId provided (view or continue editing)
    useEffect(() => {
        if (!ncrId) return
        apiClient.get(`/api/ncr/${ncrId}`)
            .then((res) => {
                if (res.success && res.data) {
                    const d = res.data
                    setFormData({
                        msmNumber: d.job_id || "",
                        ncrNo: d.ncr_no || "",
                        date: d.date ? new Date(d.date).toISOString().split("T")[0] : "",
                        client: d.client || "",
                        poNo: d.po_no || "",
                        tagNo: d.tag_no || "",
                        drgNo: d.drg_no || "",
                        revNo: d.rev_no || "",

                        descriptionNonConformance: d.description_non_conformance || "",
                        ncrRaisedAt: d.ncr_raised_at?.toString() || "",
                        ncrRaisedBy: d.ncr_raised_by?.toString() || "",
                        ncrDate: d.ncr_date ? new Date(d.ncr_date).toISOString().split("T")[0] : "",

                        proposedResolution: d.proposed_resolution || "",
                        resolutionBy: d.resolution_by?.toString() || "",
                        resolutionDate: d.resolution_date ? new Date(d.resolution_date).toISOString().split("T")[0] : "",

                        targetEngineer: d.target_engineer_id?.toString() || "",
                        targetHeadDesign: d.target_head_design_id?.toString() || "",
                        targetHeadWelding: d.target_head_welding_id?.toString() || "",
                        targetHeadQuality: d.target_head_quality_id?.toString() || "",

                        resolutionApproval: Array.isArray(d.resolution_approval) ? d.resolution_approval : (d.resolution_approval ? [d.resolution_approval] : ["USE AS IS"]),
                        headDesign: d.target_head_design_id?.toString() || "",
                        headDesignComments: d.head_design_comments || "",
                        headWelding: d.target_head_welding_id?.toString() || "",
                        headWeldingComments: d.head_welding_comments || "",
                        headQuality: d.target_head_quality_id?.toString() || "",
                        headQualityComments: d.head_quality_comments || "",
                        acceptanceDate: d.acceptance_date ? new Date(d.acceptance_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],

                        designReviewStatus: d.design_review_status || "",
                        weldingReviewStatus: d.welding_review_status || "",
                        qualityReviewStatus: d.quality_review_status || "",

                        correctiveActionVerifiedBy: d.corrective_action_verified_by || "",
                        correctiveActionDate: d.corrective_action_date ? new Date(d.corrective_action_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                        verifiedByQce: d.verified_by_qce_id?.toString() || "",

                        disposition: d.disposition || "",
                        verifiedByHeadQuality: d.verified_by_head_quality_id?.toString() || "",
                        dispositionDate: d.disposition_date ? new Date(d.disposition_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                    })
                    setCurrentStage(d.current_stage || 1)
                    setNcrStatus(d.ncr_status || "draft")
                    setNcrDbId(d.id)
                }
            })
            .catch((err) => setError("Failed to load NCR: " + err.message))
    }, [ncrId])

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }))
    }

    const handleSelectChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleCheckboxChange = (name, option, checked) => {
        setFormData((prev) => {
            if (name === "resolutionApproval") {
                return { ...prev, [name]: checked ? [option] : [] }
            }
            const current = Array.isArray(prev[name]) ? prev[name] : []
            if (checked) {
                return { ...prev, [name]: [...current, option] }
            } else {
                return { ...prev, [name]: current.filter(v => v !== option) }
            }
        })
    }

    const handleJobChange = async (jobId) => {
        setFormData((prev) => ({ ...prev, msmNumber: jobId }))

        try {
            const [ncrRes, jobRes] = await Promise.all([
                apiClient.get(`/api/ncr/next-ncr-no/${jobId}`),
                apiClient.get(`/api/common/jobs/${jobId}`),
            ])

            const job = jobRes.data || {}
            setFormData((prev) => ({
                ...prev,
                msmNumber: jobId,
                ncrNo: ncrRes.data?.next_ncr_no || "",
                client: job.customer?.customer_name || "",
                poNo: job.po?.po_number || "",
                tagNo: job.tag_number || "",
                drgNo: "",
                revNo: "",
            }))
        } catch (err) {
            console.error("Failed to fetch job details:", err)
        }
    }

    // ── Stage Submissions ──
    const handleSubmitStage1 = async () => {
        setError("")
        setIsSubmitting(true)
        try {
            const res = await apiClient.post("/api/ncr/create", {
                job_id: formData.msmNumber,
                date: formData.date,
                drg_no: formData.drgNo,
                rev_no: formData.revNo,
                description_non_conformance: formData.descriptionNonConformance,
                ncr_raised_at: formData.ncrRaisedAt,
                ncr_raised_by: formData.ncrRaisedBy,
                ncr_date: formData.ncrDate,
            })
            if (res.success) {
                setNcrDbId(res.data.id)
                setCurrentStage(2)
                setNcrStatus("stage1_submitted")
                if (onSuccess) onSuccess()
            }
        } catch (err) {
            setError(err.message || "Failed to create NCR")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSubmitStage2 = async () => {
        if (!ncrDbId) return
        setError("")
        setIsSubmitting(true)
        try {
            const res = await apiClient.put(`/api/ncr/${ncrDbId}/stage2`, {
                proposed_resolution: formData.proposedResolution,
                resolution_by: formData.resolutionBy,
                resolution_date: formData.resolutionDate,
                target_engineer_id: formData.targetEngineer,
                target_head_design_id: formData.targetHeadDesign,
                target_head_welding_id: formData.targetHeadWelding,
                target_head_quality_id: formData.targetHeadQuality,
            })
            if (res.success) {
                setCurrentStage(3)
                setNcrStatus("stage2_submitted")
                setFormData(prev => ({
                    ...prev,
                    headDesign: prev.targetHeadDesign,
                    headWelding: prev.targetHeadWelding,
                    headQuality: prev.targetHeadQuality,
                }))
                if (onSuccess) onSuccess()
            }
        } catch (err) {
            setError(err.message || "Failed to submit Stage 2")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSubmitStage3Init = async () => {
        if (!ncrDbId) return
        setError("")
        setIsSubmitting(true)
        try {
            const res = await apiClient.put(`/api/ncr/${ncrDbId}/stage3/init`, {
                resolution_approval: formData.resolutionApproval,
                acceptance_date: formData.acceptanceDate,
            })
            if (res.success) {
                setNcrStatus("stage3_in_review")
                if (onSuccess) onSuccess()
            }
        } catch (err) {
            setError(err.message || "Failed to submit Stage 3")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleReviewSubmit = async (reviewType, action) => {
        if (!ncrDbId) return
        setError("")
        setIsSubmitting(true)
        try {
            const commentsMap = {
                DESIGN: formData.headDesignComments,
                WELDING: formData.headWeldingComments,
                QUALITY: formData.headQualityComments,
            }
            const res = await apiClient.put(`/api/ncr/${ncrDbId}/stage3/review`, {
                review_type: reviewType,
                action: action,
                comments: commentsMap[reviewType] || "",
            })
            if (res.success) {
                const updated = res.data
                setFormData(prev => ({
                    ...prev,
                    designReviewStatus: updated.design_review_status || prev.designReviewStatus,
                    weldingReviewStatus: updated.welding_review_status || prev.weldingReviewStatus,
                    qualityReviewStatus: updated.quality_review_status || prev.qualityReviewStatus,
                }))
                setCurrentStage(updated.current_stage || currentStage)
                setNcrStatus(updated.ncr_status || ncrStatus)
                if (onSuccess) onSuccess()
            }
        } catch (err) {
            setError(err.message || "Failed to submit review")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSubmitStage4 = async () => {
        if (!ncrDbId) return
        setError("")
        setIsSubmitting(true)
        try {
            const res = await apiClient.put(`/api/ncr/${ncrDbId}/stage4`, {
                corrective_action_verified_by: formData.correctiveActionVerifiedBy,
                corrective_action_date: formData.correctiveActionDate,
                verified_by_qce_id: formData.headQuality,
            })
            if (res.success) {
                setCurrentStage(5)
                setNcrStatus("pending_disposition")
                if (onSuccess) onSuccess()
            }
        } catch (err) {
            setError(err.message || "Failed to submit Stage 4")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSubmitStage5 = async () => {
        if (!ncrDbId) return
        setError("")
        setIsSubmitting(true)
        try {
            const res = await apiClient.put(`/api/ncr/${ncrDbId}/stage5`, {
                disposition: formData.disposition,
                verified_by_head_quality_id: formData.headQuality,
                disposition_date: formData.dispositionDate,
            })
            if (res.success) {
                setNcrStatus("closed")
                if (onSuccess) onSuccess()
            }
        } catch (err) {
            setError(err.message || "Failed to close NCR")
        } finally {
            setIsSubmitting(false)
        }
    }

    // ── Permission Logic ──
    const isViewMode = isViewOnly

    // Determine if the current user is assigned to specific roles
    const isCreator = currentUserId && currentUserId === formData.ncrRaisedBy
    const isTargetEngineer = currentUserId && currentUserId === formData.targetEngineer
    const isAssignedQCE = currentUserId && currentUserId === formData.verifiedByQce

    // Determine if the current user is the assigned head for Stage 3 reviews
    const isDesignHead = currentUserId && currentUserId === formData.headDesign
    const isWeldingHead = currentUserId && currentUserId === formData.headWelding
    const isQualityHead = currentUserId && currentUserId === formData.headQuality

    // Check actionability based on stage matching user ID
    const isStage1Active = currentStage === 1 && !isViewMode
    const isStage2Active = currentStage === 2 && !isViewMode && isCreator
    const isStage3InitActive = currentStage === 3 && ncrStatus === "stage2_submitted" && !isViewMode && isTargetEngineer
    const isDesignActive = currentStage === 3 && ncrStatus === "stage3_in_review" && isDesignHead && formData.designReviewStatus === "PENDING" && !isViewMode
    const isWeldingActive = currentStage === 3 && ncrStatus === "stage3_in_review" && isWeldingHead && formData.weldingReviewStatus === "PENDING" && !isViewMode
    const isQualityActive = currentStage === 3 && ncrStatus === "stage3_in_review" && isQualityHead && formData.qualityReviewStatus === "PENDING" && !isViewMode
    const isStage4InitActive = currentStage === 4 && ncrStatus === "approved_resolution" && !isViewMode && isTargetEngineer
    const isStage5QualityActive = currentStage === 5 && ncrStatus === "pending_disposition" && !isViewMode && isAssignedQCE

    // ── Open Mode: determine which stage should be visible ──
    const userHasAction = isStage1Active || isStage2Active || isStage3InitActive || isDesignActive || isWeldingActive || isQualityActive || isStage4InitActive || isStage5QualityActive

    // Helper: in open mode, should a given stage card be shown?
    const shouldShowStage = (stageNum) => {
        if (!isOpenMode) return true // View/Create: show everything as before
        // In open mode, show only the stage that requires action from this user
        if (stageNum === 1) return isStage1Active
        if (stageNum === 2) return isStage2Active
        if (stageNum === 3) return isStage3InitActive || isDesignActive || isWeldingActive || isQualityActive
        if (stageNum === 4) return isStage4InitActive
        if (stageNum === 5) return isStage5QualityActive
        return false
    }

    // Compact summary for completed stages (used in open mode)
    const renderCompletedSummary = () => {
        if (!isOpenMode) return null
        const completedStages = []
        if (currentStage > 1) completedStages.push({ num: 1, label: 'Description of Non-Conformance' })
        if (currentStage > 2) completedStages.push({ num: 2, label: 'Proposed Resolution' })
        if (currentStage > 3) completedStages.push({ num: 3, label: 'Acceptance of Proposal' })
        if (currentStage > 4) completedStages.push({ num: 4, label: 'Corrective Action Verification' })
        if (completedStages.length === 0) return null

        return (
            <div className="rounded-lg border bg-muted/20 p-4 mb-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Completed Stages</p>
                <div className="flex flex-wrap gap-2">
                    {completedStages.map(s => (
                        <span key={s.num} className="inline-flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full font-medium">
                            <CheckCircle className="w-3 h-3" /> Stage {s.num}: {s.label}
                        </span>
                    ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-muted/40">
                    <div><span className="text-[10px] font-bold uppercase text-muted-foreground">NCR No</span><p className="text-sm font-medium">{formData.ncrNo}</p></div>
                    <div><span className="text-[10px] font-bold uppercase text-muted-foreground">Client</span><p className="text-sm font-medium">{formData.client}</p></div>
                    <div><span className="text-[10px] font-bold uppercase text-muted-foreground">MSN</span><p className="text-sm font-medium">{jobs.find(j => j.id === formData.msmNumber)?.job_number || formData.msmNumber}</p></div>
                    <div><span className="text-[10px] font-bold uppercase text-muted-foreground">Date</span><p className="text-sm font-medium">{formData.date}</p></div>
                </div>
            </div>
        )
    }

    const renderBasicInfo = (isDisabled, idPrefix) => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 pb-4 border-b border-muted/50">
            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}msmNumber`}>MSN. <span className="text-destructive">*</span></Label>
                <Select value={formData.msmNumber} onValueChange={handleJobChange} disabled={isDisabled || jobsLoading}>
                    <SelectTrigger id={`${idPrefix}msmNumber`} className="w-full bg-background [&>span]:truncate text-left">
                        <SelectValue placeholder={jobsLoading ? "Loading jobs…" : "Select MSN Number"} />
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
    )

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-1">{ncrId ? "NCR Details" : "Create NCR"}</h1>
                    <p className="text-muted-foreground">
                        {ncrId ? `NCR: ${formData.ncrNo}` : "Fill in the NCR details following the automated workflow."}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-8 text-sm bg-background border rounded-md px-4 py-2">
                        <div className="flex flex-col">
                            <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">Stage</span>
                            <span className="font-bold text-lg">{currentStage} <span className="text-muted-foreground text-sm">/ 5</span></span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">Status</span>
                            <span className="font-bold mt-1"><StatusBadge status={ncrStatus.replace(/_/g, ' ')} /></span>
                        </div>
                    </div>
                    <Button variant="outline" onClick={onBack} className="h-9">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to List
                    </Button>
                </div>
            </div>

            {error && (
                <div className="mb-4 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            <form onSubmit={(e) => e.preventDefault()}>
                <div className="grid gap-6">


                    {/* Open Mode: Completed Stages Summary */}
                    {renderCompletedSummary()}

                    {/* STAGE 1 */}
                    {shouldShowStage(1) && (
                        <Card className={isStage1Active ? "shadow-md" : "opacity-80"}>
                            <CardHeader className="bg-muted/30">
                                <CardTitle className="flex justify-between items-center text-lg">
                                    <span>STAGE 1: DESCRIPTION OF NON-CONFORMANCE</span>
                                    {currentStage > 1 && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completed</span>}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                {renderBasicInfo(!isStage1Active, "stage1-")}
                                <div className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <Label className="text-md">Description of Non-Conformance:</Label>
                                        <Textarea name="descriptionNonConformance" rows={4} placeholder="Provide a detailed description of the non-conformance..." value={formData.descriptionNonConformance} onChange={handleInputChange} disabled={!isStage1Active} required />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="ncrRaisedAt" className="uppercase">NCR Raised At:</Label>
                                            <Select value={formData.ncrRaisedAt} onValueChange={(val) => handleSelectChange("ncrRaisedAt", val)} disabled={!isStage1Active}>
                                                <SelectTrigger id="ncrRaisedAt" className="w-full"><SelectValue placeholder="Select team member" /></SelectTrigger>
                                                <SelectContent>
                                                    {users.map((user) => (
                                                        <SelectItem key={`raisedAt-${user.id}`} value={user.id}>
                                                            {user.displayName}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ncrRaisedBy" className="uppercase">NCR Raised By:</Label>
                                            <Select value={formData.ncrRaisedBy} onValueChange={(val) => handleSelectChange("ncrRaisedBy", val)} disabled={!isStage1Active}>
                                                <SelectTrigger id="ncrRaisedBy" className="w-full"><SelectValue placeholder="Select team member" /></SelectTrigger>
                                                <SelectContent>
                                                    {users.map((user) => (
                                                        <SelectItem key={`raisedBy-${user.id}`} value={user.id}>
                                                            {user.displayName}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ncrDate" className="uppercase">Date:</Label>
                                            <Input id="ncrDate" name="ncrDate" type="date" value={formData.ncrDate} onChange={handleInputChange} disabled={!isStage1Active} />
                                        </div>
                                    </div>
                                </div>
                                {isStage1Active && (
                                    <div className="pt-4 flex justify-end">
                                        <Button type="button" onClick={handleSubmitStage1} disabled={isSubmitting} className="bg-black hover:bg-zinc-800 text-white px-8">
                                            {isSubmitting ? "Saving…" : "Save & Submit"}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* STAGE 2 */}
                    {(isOpenMode ? shouldShowStage(2) : currentStage >= 2) && (
                        <Card className={isStage2Active ? "shadow-md" : "opacity-80"}>
                            <CardHeader className="bg-muted/30">
                                <CardTitle className="flex justify-between items-center text-lg">
                                    <span className="uppercase">STAGE 2: Proposed Resolution with Justification</span>
                                    {currentStage > 2 && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completed</span>}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                {!isViewMode && renderBasicInfo(true, "stage2-")}
                                <div className="space-y-2">
                                    <Label className="text-md">Proposed Resolution with Justification:</Label>
                                    <Textarea name="proposedResolution" rows={4} placeholder="Provide the proposed resolution and its justification..." value={formData.proposedResolution} onChange={handleInputChange} disabled={!isStage2Active} required />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 mt-4 border-t">
                                    <div className="space-y-2">
                                        <Label className="uppercase font-semibold text-sm">Assign Engineer:</Label>
                                        <Select value={formData.targetEngineer} onValueChange={(val) => handleSelectChange("targetEngineer", val)} disabled={!isStage2Active}>
                                            <SelectTrigger className="w-full bg-background"><SelectValue placeholder="Assign Engineer" /></SelectTrigger>
                                            <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="uppercase font-semibold text-sm">Head Design:</Label>
                                        <Select value={formData.targetHeadDesign} onValueChange={(val) => handleSelectChange("targetHeadDesign", val)} disabled={!isStage2Active}>
                                            <SelectTrigger className="w-full bg-background"><SelectValue placeholder="Assign Design Head" /></SelectTrigger>
                                            <SelectContent>{users.map(u => <SelectItem key={`hd-${u.id}`} value={u.id}>{u.displayName}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="uppercase font-semibold text-sm">Head Welding:</Label>
                                        <Select value={formData.targetHeadWelding} onValueChange={(val) => handleSelectChange("targetHeadWelding", val)} disabled={!isStage2Active}>
                                            <SelectTrigger className="w-full bg-background"><SelectValue placeholder="Assign Welding Head" /></SelectTrigger>
                                            <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="uppercase font-semibold text-sm">Head Quality:</Label>
                                        <Select value={formData.targetHeadQuality} onValueChange={(val) => handleSelectChange("targetHeadQuality", val)} disabled={!isStage2Active}>
                                            <SelectTrigger className="w-full bg-background"><SelectValue placeholder="Assign Quality Head" /></SelectTrigger>
                                            <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div className="space-y-2">
                                        <Label className="uppercase">Submitted By:</Label>
                                        <Select value={formData.resolutionBy} onValueChange={(val) => handleSelectChange("resolutionBy", val)} disabled={!isStage2Active}>
                                            <SelectTrigger className="w-full"><SelectValue placeholder="Select team member" /></SelectTrigger>
                                            <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="uppercase">Date:</Label>
                                        <Input name="resolutionDate" type="date" value={formData.resolutionDate} onChange={handleInputChange} disabled={!isStage2Active} />
                                    </div>
                                </div>
                                {isStage2Active && (
                                    <div className="pt-4 flex justify-end">
                                        <Button type="button" onClick={handleSubmitStage2} disabled={isSubmitting} className="bg-black hover:bg-zinc-800 text-white px-8">
                                            {isSubmitting ? "Saving…" : "Save & Submit"}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* STAGE 3 */}
                    {(isOpenMode ? shouldShowStage(3) : currentStage >= 3) && (
                        <Card className={isStage3InitActive || isDesignActive || isWeldingActive || isQualityActive ? "shadow-md" : "opacity-80"}>
                            <CardHeader className="bg-muted/30">
                                <CardTitle className="flex justify-between items-center text-lg">
                                    <span className="uppercase">STAGE 3: Acceptance of Proposal for Resolution</span>
                                    {currentStage > 3 && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completed</span>}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                {!isViewMode && renderBasicInfo(true, "stage3-")}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
                                    <Label className="font-semibold text-base">Customer approval required.</Label>
                                    <div className="w-full md:w-auto flex items-center gap-4 text-right">
                                        <Label className="uppercase font-bold text-sm">DATE:</Label>
                                        <Input className="w-[180px] h-9" name="acceptanceDate" type="date" value={formData.acceptanceDate} onChange={handleInputChange} disabled={!isStage3InitActive} />
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
                                                    disabled={!isStage3InitActive}
                                                />
                                                <Label htmlFor={`res-${option}`} className="uppercase text-sm font-medium text-muted-foreground">{option}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Assignment Overview */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                                    <div className="space-y-2">
                                        <Label className="uppercase font-bold text-xs text-muted-foreground tracking-wider">Assign Engineer:</Label>
                                        <Select value={formData.targetEngineer} disabled={true}>
                                            <SelectTrigger className="w-full bg-background/50 text-muted-foreground"><SelectValue placeholder="Assigned Engineer" /></SelectTrigger>
                                            <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="uppercase font-bold text-xs text-muted-foreground tracking-wider">Head Design:</Label>
                                        <Select value={formData.headDesign} disabled={true}>
                                            <SelectTrigger className="w-full bg-background/50 text-muted-foreground"><SelectValue placeholder="Head of Design" /></SelectTrigger>
                                            <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="uppercase font-bold text-xs text-muted-foreground tracking-wider">Head Welding:</Label>
                                        <Select value={formData.headWelding} disabled={true}>
                                            <SelectTrigger className="w-full bg-background/50 text-muted-foreground"><SelectValue placeholder="Head of Welding" /></SelectTrigger>
                                            <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="uppercase font-bold text-xs text-muted-foreground tracking-wider">Head Quality:</Label>
                                        <Select value={formData.headQuality} disabled={true}>
                                            <SelectTrigger className="w-full bg-background/50 text-muted-foreground"><SelectValue placeholder="Head of Quality" /></SelectTrigger>
                                            <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Head Design Review */}
                                {(isDesignActive || !isOpenMode || (formData.designReviewStatus && formData.designReviewStatus !== 'PENDING')) && (
                                    <div className="mt-4 p-4 rounded-md border">
                                        <Label className="uppercase font-bold flex items-center gap-2 mb-4">
                                            HEAD DESIGN:
                                            {formData.designReviewStatus === 'APPROVED' && <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded text-xs">APPROVED</span>}
                                            {formData.designReviewStatus === 'REJECTED' && <span className="text-red-600 bg-red-100 px-2 py-0.5 rounded text-xs">REJECTED</span>}
                                        </Label>
                                        <div className="space-y-4">
                                            <Select value={formData.headDesign} disabled={true}>
                                                <SelectTrigger className="w-full md:w-1/2 bg-background"><SelectValue placeholder="Assigned Head of Design" /></SelectTrigger>
                                                <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <Textarea name="headDesignComments" placeholder="Add comments or approval notes..." value={formData.headDesignComments} onChange={handleInputChange} className="w-full min-h-[5rem] bg-background" disabled={!isDesignActive} />
                                            {isDesignActive && (
                                                <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-2">
                                                    <div className="flex items-center space-x-2 mr-auto sm:mr-4">
                                                        <Checkbox id="na-design" /><Label htmlFor="na-design" className="text-sm font-medium">NA (if applicable)</Label>
                                                    </div>
                                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                                        <Button type="button" variant="outline" className="flex-1 sm:flex-none px-8 border-gray-300 font-medium text-black hover:bg-gray-100" onClick={() => handleReviewSubmit('DESIGN', 'REJECT')} disabled={isSubmitting}>Reject</Button>
                                                        <Button type="button" className="flex-1 sm:flex-none px-8 bg-black hover:bg-zinc-800 text-white font-medium" onClick={() => handleReviewSubmit('DESIGN', 'APPROVE')} disabled={isSubmitting}>Approve</Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Head Welding Review */}
                                {(isWeldingActive || !isOpenMode || (formData.weldingReviewStatus && formData.weldingReviewStatus !== 'PENDING')) && (
                                    <div className="mt-4 p-4 rounded-md border">
                                        <Label className="uppercase font-bold flex items-center gap-2 mb-4">
                                            HEAD WELDING:
                                            {formData.weldingReviewStatus === 'APPROVED' && <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded text-xs">APPROVED</span>}
                                            {formData.weldingReviewStatus === 'REJECTED' && <span className="text-red-600 bg-red-100 px-2 py-0.5 rounded text-xs">REJECTED</span>}
                                        </Label>
                                        <div className="space-y-4">
                                            <Select value={formData.headWelding} disabled={true}>
                                                <SelectTrigger className="w-full md:w-1/2 bg-background"><SelectValue placeholder="Assigned Head of Welding" /></SelectTrigger>
                                                <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <Textarea name="headWeldingComments" placeholder="Add comments or approval notes..." value={formData.headWeldingComments} onChange={handleInputChange} className="w-full min-h-[5rem] bg-background" disabled={!isWeldingActive} />
                                            {isWeldingActive && (
                                                <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-2">
                                                    <div className="flex items-center space-x-2 mr-auto sm:mr-4">
                                                        <Checkbox id="na-welding" /><Label htmlFor="na-welding" className="text-sm font-medium">NA (if applicable)</Label>
                                                    </div>
                                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                                        <Button type="button" variant="outline" className="flex-1 sm:flex-none px-8 border-gray-300 font-medium text-black hover:bg-gray-100" onClick={() => handleReviewSubmit('WELDING', 'REJECT')} disabled={isSubmitting}>Reject</Button>
                                                        <Button type="button" className="flex-1 sm:flex-none px-8 bg-black hover:bg-zinc-800 text-white font-medium" onClick={() => handleReviewSubmit('WELDING', 'APPROVE')} disabled={isSubmitting}>Approve</Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Head Quality Review */}
                                {(isQualityActive || !isOpenMode || (formData.qualityReviewStatus && formData.qualityReviewStatus !== 'PENDING')) && (
                                    <div className="mt-4 p-4 rounded-md border">
                                        <Label className="uppercase font-bold flex items-center gap-2 mb-4">
                                            HEAD QUALITY:
                                            {formData.qualityReviewStatus === 'APPROVED' && <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded text-xs">APPROVED</span>}
                                            {formData.qualityReviewStatus === 'REJECTED' && <span className="text-red-600 bg-red-100 px-2 py-0.5 rounded text-xs">REJECTED</span>}
                                        </Label>
                                        <div className="space-y-4">
                                            <Select value={formData.headQuality} disabled={true}>
                                                <SelectTrigger className="w-full md:w-1/2 bg-background"><SelectValue placeholder="Assigned Head of Quality" /></SelectTrigger>
                                                <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <Textarea name="headQualityComments" placeholder="Add comments or approval notes..." value={formData.headQualityComments} onChange={handleInputChange} className="w-full min-h-[5rem] bg-background" disabled={!isQualityActive} />
                                            {isQualityActive && (
                                                <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-2">
                                                    <div className="flex items-center space-x-2 mr-auto sm:mr-4">
                                                        <Checkbox id="na-quality" /><Label htmlFor="na-quality" className="text-sm font-medium">NA (if applicable)</Label>
                                                    </div>
                                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                                        <Button type="button" variant="outline" className="flex-1 sm:flex-none px-8 border-gray-300 font-medium text-black hover:bg-gray-100" onClick={() => handleReviewSubmit('QUALITY', 'REJECT')} disabled={isSubmitting}>Reject</Button>
                                                        <Button type="button" className="flex-1 sm:flex-none px-8 bg-black hover:bg-zinc-800 text-white font-medium" onClick={() => handleReviewSubmit('QUALITY', 'APPROVE')} disabled={isSubmitting}>Approve</Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {isStage3InitActive && (
                                    <div className="mt-6 pt-4 border-t space-y-4">
                                        <Textarea name="proposedResolution" rows={3} placeholder="Add comments or approval notes..." value={formData.proposedResolution} onChange={handleInputChange} disabled={!isStage3InitActive} />
                                        <div className="flex justify-end pt-2">
                                            <Button type="button" onClick={handleSubmitStage3Init} disabled={isSubmitting} className="w-full md:w-auto bg-black hover:bg-zinc-800 text-white font-medium px-8">
                                                {isSubmitting ? "Saving…" : "Save & Submit"}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* STAGE 4 */}
                    {(isOpenMode ? shouldShowStage(4) : (currentStage >= 4 && ncrStatus !== "rejected")) && (
                        <Card className={isStage4InitActive ? "shadow-md" : "opacity-80"}>
                            <CardHeader className="bg-muted/30">
                                <CardTitle className="uppercase flex justify-between items-center text-lg">
                                    <span>STAGE 4: Corrective Action Verification Carried Out By</span>
                                    {currentStage > 4 && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completed</span>}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                {!isViewMode && renderBasicInfo(true, "stage4-")}
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                    <div className="flex-1 w-full space-y-2">
                                        <Textarea name="correctiveActionVerifiedBy" rows={3} placeholder="Provide details about the corrective action verification process..." value={formData.correctiveActionVerifiedBy} onChange={handleInputChange} disabled={!isStage4InitActive} />
                                    </div>
                                    <div className="w-full md:w-1/4 space-y-2 min-w-[200px]">
                                        <Label className="uppercase">Date:</Label>
                                        <Input name="correctiveActionDate" type="date" value={formData.correctiveActionDate} onChange={handleInputChange} disabled={!isStage4InitActive} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t pt-4">
                                    <div className="space-y-2 p-3 rounded border">
                                        <Label className="uppercase font-bold">VERIFIED BY QCE:</Label>
                                        <Select value={formData.headQuality} disabled={true}>
                                            <SelectTrigger className="w-full bg-background"><SelectValue placeholder="Assigned Quality Control Engineer" /></SelectTrigger>
                                            <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {isStage4InitActive && (
                                    <div className="pt-4 flex justify-end">
                                        <Button type="button" onClick={handleSubmitStage4} disabled={isSubmitting} className="bg-black hover:bg-zinc-800 text-white px-8">
                                            {isSubmitting ? "Saving…" : "Save & Submit"}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* STAGE 5 */}
                    {(isOpenMode ? shouldShowStage(5) : (currentStage >= 5 && ncrStatus !== "rejected")) && (
                        <Card className={isStage5QualityActive ? "shadow-md" : "opacity-80"}>
                            <CardHeader className="bg-muted/30">
                                <CardTitle className="uppercase flex justify-between items-center text-lg">
                                    <span className="text-green-700 dark:text-green-500">STAGE 5: FINAL DISPOSITION</span>
                                    {ncrStatus === "closed" && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Closed</span>}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                {!isViewMode && renderBasicInfo(true, "stage5-")}
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                    <div className="flex-1 w-full space-y-2">
                                        <Textarea name="disposition" rows={3} placeholder="Head Quality: Provide final disposition notes..." value={formData.disposition} onChange={handleInputChange} disabled={!isStage5QualityActive} />
                                    </div>
                                    <div className="w-full md:w-1/4 space-y-2 min-w-[200px]">
                                        <Label className="uppercase">DATE:</Label>
                                        <Input name="dispositionDate" type="date" value={formData.dispositionDate} onChange={handleInputChange} disabled={!isStage5QualityActive} />
                                    </div>
                                </div>
                                <div className="w-full md:w-1/2 space-y-2 border-t pt-4">
                                    <Label className="uppercase font-bold">VERIFIED BY HEAD QUALITY:</Label>
                                    <Select value={formData.headQuality} disabled={true}>
                                        <SelectTrigger className="w-full bg-background"><SelectValue placeholder="Assigned Head of Quality" /></SelectTrigger>
                                        <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                {isStage5QualityActive && (
                                    <div className="pt-4 flex justify-end">
                                        <Button type="button" onClick={handleSubmitStage5} disabled={isSubmitting} className="w-full bg-black hover:bg-zinc-800 text-white font-bold tracking-wide">
                                            {isSubmitting ? "Closing…" : "CLOSE NCR"}
                                        </Button>
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
                            <p className="opacity-80 mt-1">This NCR has been rejected by one or more reviewers and is permanently closed.</p>
                        </div>
                    )}
                </div>
            </form>
        </div>
    )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
function CreateNCR() {
    const [view, setView] = useState("list") // "list" | "create" | "view" | "open"
    const [viewNcrId, setViewNcrId] = useState(null)
    const [successMsg, setSuccessMsg] = useState("")

    const handleSuccess = () => {
        setSuccessMsg("NCR operation completed successfully!")
        setView("list")
        setTimeout(() => setSuccessMsg(""), 4000)
    }

    const handleViewClick = (id) => {
        setViewNcrId(id)
        setView("view")
    }

    const handleOpenClick = (id) => {
        setViewNcrId(id)
        setView("open")
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
                        {successMsg && (
                            <div className="mb-4 rounded-md border border-green-500 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                {successMsg}
                            </div>
                        )}

                        {view === "list" ? (
                            <ListView
                                onCreateClick={() => { setViewNcrId(null); setView("create") }}
                                onViewClick={handleViewClick}
                                onOpenClick={handleOpenClick}
                            />
                        ) : (
                            <FormView
                                ncrId={viewNcrId}
                                onBack={() => { setView("list"); setViewNcrId(null) }}
                                onSuccess={handleSuccess}
                                isViewOnly={view === "view"}
                                isOpenMode={view === "open"}
                            />
                        )}
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}

export default CreateNCR
