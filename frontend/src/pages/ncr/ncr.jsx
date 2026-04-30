import { useEffect, useState, useCallback, useMemo } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"

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
import ProDataTable from "@/components/shared/ProDataTable"
import { SearchableSelect } from "@/components/shared/SearchableSelect"
import { ArrowLeft, Plus, CheckCircle, XCircle, Eye, Pencil, Download, Upload, FileText, Trash2, Paperclip, ExternalLink, X, Search, ChevronDown, ChevronLeft, ChevronRight, Check } from "lucide-react"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"
import { useAuth } from "@/context/AuthContext"
import { DocumentPreviewDialog } from "@/components/shared/DocumentPreviewDialog"
import { toast } from "react-toastify"

const ncrStatusConfig = {
    stage1: { label: "Stage 1", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20" },
    stage2: { label: "Stage 2", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20" },
    stage3: { label: "Stage 3", className: "bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20" },
    stage4: { label: "Stage 4", className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20" },
    stage5: { label: "Stage 5", className: "bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:bg-pink-500/20" },
    completed: { label: "Completed", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20" },
    pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20" },
    rejected: { label: "Rejected", className: "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20" },
    approved: { label: "Approved", className: "bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20" },
    open: { label: "Open", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20" },
    closed: { label: "Closed", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20" },
    na: { label: "N/A", className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 hover:bg-gray-500/20" },
    "in progress": { label: "In Progress", className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20" }
};

function NcrStatusBadge({ status, className }) {
    const rawStatus = String(status || "");
    const config = ncrStatusConfig[rawStatus.toLowerCase()] || {
        label: rawStatus,
        className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 hover:bg-gray-500/20"
    };

    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className} ${className || ''}`}>
            {config.label}
        </span>
    );
}

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

    naDesign: false,
    naWelding: false,
    naQuality: false,

    correctiveActionComments: "",
    correctiveActionDate: new Date().toISOString().split("T")[0],
    verifiedByQce: "",

    disposition: "",
    verifiedByHeadQuality: "",
    dispositionDate: new Date().toISOString().split("T")[0],
    attachments: []
}

// ─── List View ───────────────────────────────────────────────────────────────
function ListView({ onCreateClick, onViewClick, onOpenClick }) {
    const { user } = useAuth()
    const currentUserId = user?.id || ""
    const [error, setError] = useState("")
    const [isDownloading, setIsDownloading] = useState(false)

    const handleDownload = async (id, ncrNo) => {
        setIsDownloading(true)
        setError("")
        try {
            const filename = `NCR_${ncrNo.replace(/\//g, '_')}.pdf`;
            await exportApi.download(
                `/api/ncr/${id}/download`,
                filename,
                {},
                { contentType: 'application/pdf' }
            );
        } catch (err) {
            console.error("Download error:", err)
            setError(err.message || "Failed to download PDF")
        } finally {
            setIsDownloading(false)
        }
    }

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

        // Stage 2 (Draft -> Submitted): Only the person assigned in ncr_raised_at can submit
        if (stage === 2) return (row.ncr_raised_at) === currentUserId

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

        // Stage 4 (Approved Resolution -> Pending Disposition): The assigned engineer or initiator performs corrective action
        if (stage === 4) {
            const targetEng = row.target_engineer_id || row.target_engineer?.id
            return targetEng === currentUserId || creatorId === currentUserId
        }

        // Stage 5 (Pending disposition -> Closed): The assigned QCE verifies the disposition
        if (stage === 5) {
            return (row.verified_by_qce_id || row.qce_verifier?.id) === currentUserId
        }

        return false
    }

    const [refreshKey, setRefreshKey] = useState(0);
    const [columnFilters, setColumnFilters] = useState({});
    const [activeFilters, setActiveFilters] = useState({ records: [] });

    const fetchActiveFilters = useCallback(async () => {
        try {
            const res = await apiClient.get("/api/ncr/active-filters");
            if (res.success) setActiveFilters(res.data);
        } catch (err) {
            console.error("Error fetching active filters:", err);
        }
    }, []);

    useEffect(() => {
        fetchActiveFilters();
    }, [fetchActiveFilters, refreshKey]);

    // Auto-selection for reverse cascading
    useEffect(() => {
        if (!activeFilters.records || activeFilters.records.length === 0) return;

        const updates = {};
        if (columnFilters.msn && Array.isArray(columnFilters.msn) && columnFilters.msn.length === 1) {
            const selectedMsn = columnFilters.msn[0];
            const match = activeFilters.records.find(r => r.msn?.toString() === selectedMsn?.toString());
            if (match) {
                if (!columnFilters.client || columnFilters.client.length === 0) updates.client = [match.client];
                if (!columnFilters.po_no || columnFilters.po_no.length === 0) updates.po_no = [match.po];
            }
        } else if (columnFilters.po_no && Array.isArray(columnFilters.po_no) && columnFilters.po_no.length === 1) {
            const selectedPo = columnFilters.po_no[0];
            const match = activeFilters.records.find(r => r.po?.toString() === selectedPo?.toString());
            if (match && (!columnFilters.client || columnFilters.client.length === 0)) {
                updates.client = [match.client];
            }
        }

        if (Object.keys(updates).length > 0) {
            setColumnFilters(prev => ({ ...prev, ...updates }));
        }
    }, [columnFilters.msn, columnFilters.po_no, activeFilters.records]);

    // Cascading Logic
    const activeClientOptions = useMemo(() => {
        let filtered = activeFilters.records || [];
        if (columnFilters.po_no) {
            const selected = Array.isArray(columnFilters.po_no) ? columnFilters.po_no : [columnFilters.po_no.toString()];
            filtered = filtered.filter(c => selected.includes(c.po?.toString()));
        }
        if (columnFilters.msn) {
            const selected = Array.isArray(columnFilters.msn) ? columnFilters.msn : [columnFilters.msn.toString()];
            filtered = filtered.filter(c => selected.includes(c.msn?.toString()));
        }
        const clients = [...new Set(filtered.map(c => c.client))].filter(Boolean).sort();
        return clients.map(c => ({ label: c, value: c }));
    }, [activeFilters.records, columnFilters.po_no, columnFilters.msn]);

    const activePoOptions = useMemo(() => {
        let filtered = activeFilters.records || [];
        if (columnFilters.client) {
            const selected = Array.isArray(columnFilters.client) ? columnFilters.client : [columnFilters.client.toString()];
            filtered = filtered.filter(c => selected.includes(c.client?.toString()));
        }
        if (columnFilters.msn) {
            const selected = Array.isArray(columnFilters.msn) ? columnFilters.msn : [columnFilters.msn.toString()];
            filtered = filtered.filter(c => selected.includes(c.msn?.toString()));
        }
        const pos = [...new Set(filtered.map(c => c.po))].filter(Boolean).sort();
        return pos.map(p => ({ label: p, value: p }));
    }, [activeFilters.records, columnFilters.client, columnFilters.msn]);

    const activeMsnOptions = useMemo(() => {
        let filtered = activeFilters.records || [];
        if (columnFilters.client) {
            const selected = Array.isArray(columnFilters.client) ? columnFilters.client : [columnFilters.client.toString()];
            filtered = filtered.filter(c => selected.includes(c.client?.toString()));
        }
        if (columnFilters.po_no) {
            const selected = Array.isArray(columnFilters.po_no) ? columnFilters.po_no : [columnFilters.po_no.toString()];
            filtered = filtered.filter(c => selected.includes(c.po?.toString()));
        }
        const msns = [...new Set(filtered.map(c => c.msn))].filter(Boolean).sort();
        return msns.map(m => ({ label: m, value: m }));
    }, [activeFilters.records, columnFilters.client, columnFilters.po_no]);

    const columns = useMemo(() => [
        { header: "NCR No", accessorKey: "ncr_no" },
        {
            header: "Client",
            accessorKey: "client",
            filterType: "select",
            isMulti: true,
            filterOptions: activeClientOptions
        },
        {
            header: "PO No.",
            accessorKey: "po_no",
            filterType: "select",
            isMulti: true,
            filterOptions: activePoOptions
        },
        {
            header: "Job Number",
            accessorKey: "msn",
            filterType: "select",
            isMulti: true,
            filterOptions: activeMsnOptions
        },
        {
            header: "Head Design",
            accessorKey: "design_review_status",
            cell: (row) => <NcrStatusBadge status={row.design_review_status || "PENDING"} />
        },
        {
            header: "Head Welding",
            accessorKey: "welding_review_status",
            cell: (row) => <NcrStatusBadge status={row.welding_review_status || "PENDING"} />
        },
        {
            header: "Head Quality",
            accessorKey: "quality_review_status",
            cell: (row) => <NcrStatusBadge status={row.quality_review_status || "PENDING"} />
        },
        {
            header: "NCR Status",
            id: "overall_ncr_status",
            cell: (row) => {
                const isRejected = row.ncr_status === "rejected" || row.status === "REJECTED";
                if (isRejected) return <NcrStatusBadge status="rejected" />;
                const isApproved = row.status === "CLOSED" && row.current_stage === 5 && row.ncr_status === "closed";
                if (isApproved) return <NcrStatusBadge status="approved" />;
                return <NcrStatusBadge status="in progress" />;
            }
        },
        {
            header: "Status",
            accessorKey: "status",
            cell: (row) => <NcrStatusBadge status={row.status} />
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
                        <Button variant="outlined" size="sm" onClick={() => onOpenClick(row)} title="Open & take action" className="border">
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Open
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => onViewClick(row)} title="View full NCR">
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                    </Button>
                    {row.status === "CLOSED" && row.ncr_status === "closed" && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(row.id, row.ncr_no)}
                            title="Download NCR PDF"
                            disabled={isDownloading}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                            <Download className="h-3.5 w-3.5 mr-1" /> {isDownloading ? "..." : "Download"}
                        </Button>
                    )}
                </div>
            ),
        },
    ], [activeClientOptions, activePoOptions, activeMsnOptions, isDownloading, currentUserId]);

    const fetchData = useCallback(async (params) => {
        try {
            const queryParams = { ...params };
            if (queryParams.columnFilters) {
                queryParams.columnFilters = JSON.stringify(queryParams.columnFilters);
            }
            const res = await apiClient.get(`/api/ncr/list`, queryParams)
            return { data: res.data, meta: res.meta }
        } catch (err) {
            console.error("Fetch NCR error:", err);
            return { data: [], meta: {} };
        }
    }, [])

    const handleExport = async () => {
        try {
            await exportApi.exportModule('ncr', 'ncr_export.xlsx');
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error("NCR Export failed:", error);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-1">NCR List</h1>
                    <p className="text-muted-foreground">Manage Non-Conformance Reports</p>
                </div>
            </div>

            {error && (
                <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                </div>
            )}

            <ProDataTable
                columns={columns}
                fetchData={fetchData}
                onExport={handleExport}
                columnFilters={columnFilters}
                onFilterChange={(newFilters) => setColumnFilters(prev => ({ ...prev, ...newFilters }))}
                refreshKey={refreshKey}
                onAdd={onCreateClick}
                onAddTooltip="Create NCR"
            />
        </div>
    )
}

// ─── Create / View Form ──────────────────────────────────────────────────────
function FormView({ ncrId, routeId, locationState, onBack, onSuccess, isViewOnly = false, isOpenMode = false }) {
    const { user } = useAuth()
    const currentUserId = user?.id || ""

    const [jobs, setJobs] = useState([])
    const [users, setUsers] = useState([])
    const [jobsLoading, setJobsLoading] = useState(true)
    const [assignedDrawings, setAssignedDrawings] = useState([])
    const [isDrawingsLoading, setIsDrawingsLoading] = useState(false)
    const [formData, setFormData] = useState(defaultFormData)
    const [attachment, setAttachment] = useState(null)
    const [preview, setPreview] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState("")

    // Preview Dialog State
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [activePreviewUrl, setActivePreviewUrl] = useState("")
    const [activePreviewDoc, setActivePreviewDoc] = useState(null)

    const [currentStage, setCurrentStage] = useState(1)
    const [ncrStatus, setNcrStatus] = useState("draft")
    const [nextPerformer, setNextPerformer] = useState(null)
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

    const loadNcrById = useCallback(async (id) => {
        try {
            const res = await apiClient.get(`/api/ncr/${id}`)
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

                    correctiveActionComments: d.corrective_action_comments || "",
                    correctiveActionDate: d.corrective_action_date ? new Date(d.corrective_action_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                    verifiedByQce: d.verified_by_qce_id?.toString() || "",

                    disposition: d.disposition || "",
                    verifiedByHeadQuality: d.verified_by_head_quality_id?.toString() || "",
                    dispositionDate: d.disposition_date ? new Date(d.disposition_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                    attachments: d.attachments || []
                })
                setCurrentStage(d.current_stage || 1)
                setNcrStatus(d.ncr_status || "draft")
                setNextPerformer(d.nextPerformer || null)
                setNcrDbId(d.id)
            }
        } catch (err) {
            setError("Failed to load NCR: " + err.message)
        }
    }, [])

    useEffect(() => {
        const initializeForm = async () => {
            if (ncrId) {
                // Support legacy internal calls
                loadNcrById(ncrId)
                return
            }
            if (!routeId) return

            if (locationState?.record?.id) {
                loadNcrById(locationState.record.id)
                return
            }

            try {
                const ncrNoFromUrl = decodeURIComponent(routeId).replace(/-/g, "/")
                const response = await apiClient.get("/api/ncr/list", {
                    page: 1,
                    limit: 50,
                    search: ncrNoFromUrl
                })
                
                const records = response?.data || []
                const matched = records.find(r => r.ncr_no === ncrNoFromUrl || r.id === routeId)
                
                if (matched && matched.id) {
                    loadNcrById(matched.id)
                } else {
                    setError(`NCR not found: ${ncrNoFromUrl}`)
                }
            } catch (err) {
                setError("Unable to locate NCR from URL")
            }
        }
        
        initializeForm()
    }, [ncrId, routeId, locationState, loadNcrById])

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

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files)
        if (files.length === 0) return

        const file = files[0] // Only take the first file

        // Enforce only images for Stage 1 as requested
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
        if (!allowedTypes.includes(file.type)) {
            toast.error("ONLY JPG, JPEG, AND PNG IMAGES ARE ALLOWED FOR STAGE 1 ATTACHMENTS.")
            e.target.value = "" // Clear the input
            return
        }

        setAttachment(file)
        const isImage = file.type.startsWith('image/')

        // Generate blob URL for local preview
        const blobUrl = URL.createObjectURL(file)

        setPreview({
            name: file.name,
            type: 'image',
            mimeType: file.type,
            url: blobUrl
        })
    }

    const removeAttachment = () => {
        if (preview && preview.url) {
            URL.revokeObjectURL(preview.url)
        }
        setAttachment(null)
        setPreview(null)
    }

    const openPreview = (url, name, mimeType) => {
        setActivePreviewUrl(url)
        setActivePreviewDoc({ documentName: name, mimeType: mimeType, filePath: name })
        setIsPreviewOpen(true)
    }

    const handleJobChange = async (jobId) => {
        setFormData((prev) => ({ ...prev, msmNumber: jobId }))

        if (!jobId) {
            setAssignedDrawings([])
            return
        }

        setIsDrawingsLoading(true)
        try {
            const [ncrRes, jobRes, drawingsRes] = await Promise.all([
                apiClient.get(`/api/ncr/next-ncr-no/${jobId}`),
                apiClient.get(`/api/common/jobs/${jobId}`),
                apiClient.get(`/api/dcr/get-assigned-drawings/${jobId}`).catch(() => ({ success: false, data: [] }))
            ])

            const job = jobRes.data || {}
            setAssignedDrawings(drawingsRes.success ? (drawingsRes.data || []) : [])

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
            toast.error("Failed to fetch job details or assigned drawings")
        } finally {
            setIsDrawingsLoading(false)
        }
    }

    // ── Stage Submissions ──
    const handleSubmitStage1 = async () => {
        setError("")
        setIsSubmitting(true)
        try {
            const data = new FormData()
            data.append("job_id", formData.msmNumber)
            data.append("date", formData.date)
            data.append("drg_no", formData.drgNo)
            data.append("rev_no", formData.revNo)
            data.append("description_non_conformance", formData.descriptionNonConformance)
            data.append("ncr_raised_at", formData.ncrRaisedAt)
            data.append("ncr_raised_by", formData.ncrRaisedBy)
            data.append("ncr_date", formData.ncrDate)

            if (attachment) {
                data.append("attachments", attachment)
            }

            const res = await apiClient.post("/api/ncr/create", data)
            if (res.success) {
                setNcrDbId(res.data.id)
                setCurrentStage(2)
                setNcrStatus("stage1_submitted")
                setAttachment(null)
                setPreview(null)
                if (onSuccess) onSuccess(res.data)
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
            const payload = {
                proposed_resolution: formData.proposedResolution,
                resolution_by: formData.resolutionBy,
                resolution_date: formData.resolutionDate,
                target_engineer_id: formData.targetEngineer,
                target_head_design_id: formData.targetHeadDesign,
                target_head_welding_id: formData.targetHeadWelding,
                target_head_quality_id: formData.targetHeadQuality,
            }
            const res = await apiClient.put(`/api/ncr/${ncrDbId}/stage2`, payload)
            if (res.success) {
                setCurrentStage(3)
                setNcrStatus("stage2_submitted")
                setFormData(prev => ({
                    ...prev,
                    headDesign: prev.targetHeadDesign,
                    headWelding: prev.targetHeadWelding,
                    headQuality: prev.targetHeadQuality,
                }))
                if (onSuccess) onSuccess(res.data)
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
            const payload = {
                resolution_approval: formData.resolutionApproval,
                acceptance_date: formData.acceptanceDate,
            }
            const res = await apiClient.put(`/api/ncr/${ncrDbId}/stage3/init`, payload)
            if (res.success) {
                setNcrStatus("stage3_in_review")
                if (onSuccess) onSuccess(res.data)
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
                if (onSuccess) onSuccess(updated)
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
            const payload = {
                corrective_action_comments: formData.correctiveActionComments,
                corrective_action_date: formData.correctiveActionDate,
                verified_by_qce_id: formData.headQuality,
            }
            const res = await apiClient.put(`/api/ncr/${ncrDbId}/stage4`, payload)
            if (res.success) {
                setCurrentStage(5)
                setNcrStatus("pending_disposition")
                if (onSuccess) onSuccess(res.data)
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
            const payload = {
                disposition: formData.disposition,
                verified_by_head_quality_id: formData.headQuality,
                disposition_date: formData.dispositionDate,
            }
            const res = await apiClient.put(`/api/ncr/${ncrDbId}/stage5`, payload)
            if (res.success) {
                setNcrStatus("closed")
                if (onSuccess) onSuccess(res.data)
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
    const isNcrRaisedAt = currentUserId && currentUserId === formData.ncrRaisedAt

    // Check actionability based on stage matching user ID
    const isStage1Active = currentStage === 1 && !isViewMode
    const isStage2Active = currentStage === 2 && !isViewMode && isNcrRaisedAt
    const isStage3InitActive = currentStage === 3 && ncrStatus === "stage2_submitted" && !isViewMode && isTargetEngineer
    const isDesignActive = currentStage === 3 && ncrStatus === "stage3_in_review" && isDesignHead && formData.designReviewStatus === "PENDING" && !isViewMode
    const isWeldingActive = currentStage === 3 && ncrStatus === "stage3_in_review" && isWeldingHead && formData.weldingReviewStatus === "PENDING" && !isViewMode
    const isQualityActive = currentStage === 3 && ncrStatus === "stage3_in_review" && isQualityHead && formData.qualityReviewStatus === "PENDING" && !isViewMode
    const isStage4InitActive = currentStage === 4 && ncrStatus === "approved_resolution" && !isViewMode && (isTargetEngineer || isCreator)
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

    const renderBasicInfo = (isDisabled, idPrefix) => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 pb-4 border-b border-muted/50">
            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}msmNumber`}>MSN. <span className="text-destructive">*</span></Label>
                <SearchableSelect
                    options={jobs.map(job => ({ label: job.job_number, value: job.id }))}
                    value={formData.msmNumber}
                    onValueChange={handleJobChange}
                    disabled={isDisabled || jobsLoading}
                    placeholder={jobsLoading ? "Loading jobs…" : "Select MSN Number"}
                />
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
                {isDisabled ? (
                    <Input
                        id={`${idPrefix}drgNo`}
                        value={formData.drgNo}
                        readOnly
                        disabled
                        className="bg-muted"
                    />
                ) : (
                    <SearchableSelect
                        options={assignedDrawings.map(doc => ({
                            label: `${doc.shreno_doc_no} - ${doc.document_name}`,
                            value: doc.shreno_doc_no
                        }))}
                        value={formData.drgNo}
                        onValueChange={(val) => handleSelectChange("drgNo", val)}
                        disabled={isDisabled || isDrawingsLoading || !formData.msmNumber}
                        placeholder={!formData.msmNumber ? "Select MSN first" : isDrawingsLoading ? "Loading..." : "Select Drawing"}
                    />
                )}
            </div>
            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}revNo`}>REV. NO. <span className="text-destructive">*</span></Label>
                <Input id={`${idPrefix}revNo`} name="revNo" placeholder="Enter Revision Number" value={formData.revNo} onChange={handleInputChange} disabled={isDisabled} required />
            </div>
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-3xl font-bold mb-1">{ncrId ? "NCR Details" : "Create NCR"}</h1>
                    <p className="text-sm text-muted-foreground">
                        {ncrId ? `NCR: ${formData.ncrNo}` : "Fill in the NCR details following the automated workflow."}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={onBack} className="h-9">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to List
                    </Button>
                </div>
            </div>

            {/* Next Performer Indicator */}
            {nextPerformer && ncrStatus !== 'closed' && ncrStatus !== 'rejected' && (
                <div className="mb-2 text-red-600 font-bold uppercase text-xs tracking-wider flex items-center gap-1.5 animate-in fade-in duration-500">
                    <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                    Next Performer : {nextPerformer.name} {nextPerformer.empid && `(${nextPerformer.empid})`}
                </div>
            )}

            {error && (
                <div className="mb-4 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            <form onSubmit={(e) => e.preventDefault()}>
                <div className="grid gap-6">
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
                                    <div className="space-y-3 pt-2">
                                        <Label className="text-md flex items-center gap-2">
                                            <Paperclip className="h-4 w-4" />Attachment:
                                        </Label>

                                        {/* Attachment UI (Single File) */}
                                        <div className="flex flex-wrap gap-4">
                                            {/* Saved Attachment */}
                                            {formData.attachments && formData.attachments.length > 0 && formData.attachments.map((att, idx) => (
                                                <div key={`saved-${idx}`} className="relative group border rounded-lg p-3 bg-muted/50 hover:bg-muted transition-all min-w-[200px] flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-background rounded-md shadow-sm">
                                                            <FileText className="h-5 w-5 text-muted-foreground" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-semibold truncate max-w-[120px]" title={att.name}>{att.name}</span>
                                                            <span className="text-[10px] text-muted-foreground">Original Attachment</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-blue-600"
                                                            onClick={() => openPreview(att.url, att.name, att.type)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-background rounded-md text-muted-foreground">
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* New Selected Attachment */}
                                            {preview && (
                                                <div className="relative group border border-primary/20 rounded-lg p-3 bg-primary/5 min-w-[200px] flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-background rounded-md shadow-sm">
                                                            <FileText className="h-5 w-5 text-primary" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-semibold truncate max-w-[120px]" title={preview.name}>{preview.name}</span>
                                                            <span className="text-[10px] text-primary/60 italic">New Attachment</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 uppercase">
                                                        {(preview.type === 'image' || preview.type === 'pdf') && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-primary"
                                                                onClick={() => openPreview(preview.url, preview.name, preview.mimeType)}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive"
                                                            onClick={removeAttachment}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Add Button (only in active stage and if no new file selected) */}
                                            {isStage1Active && !preview && (
                                                <label className="border-2 border-dashed border-muted-foreground/20 rounded-lg px-4 py-2 flex items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all h-[52px] min-w-[200px]">
                                                    <Upload className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-xs font-medium text-muted-foreground uppercase">Upload attachment</span>
                                                    <input type="file" className="hidden" onChange={handleFileChange} accept=".jpg,.jpeg,.png" title="Only JPG, JPEG, and PNG are supported" />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="ncrRaisedAt">NCR Raised At <span className="text-destructive">*</span></Label>
                                            <SearchableSelect
                                                options={users.map(u => ({ label: u.displayName, value: u.id }))}
                                                value={formData.ncrRaisedAt}
                                                onValueChange={(val) => handleSelectChange("ncrRaisedAt", val)}
                                                disabled={!isStage1Active}
                                                placeholder="Select team member"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ncrRaisedBy">NCR Raised By <span className="text-destructive">*</span></Label>
                                            <SearchableSelect
                                                options={users.map(u => ({ label: u.displayName, value: u.id }))}
                                                value={formData.ncrRaisedBy}
                                                onValueChange={(val) => handleSelectChange("ncrRaisedBy", val)}
                                                disabled={!isStage1Active}
                                                placeholder="Select team member"
                                            />
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
                                        <Label htmlFor="targetEngineer">Assign Engineer <span className="text-destructive">*</span></Label>
                                        <SearchableSelect
                                            options={users.map(u => ({ label: u.displayName, value: u.id }))}
                                            value={formData.targetEngineer}
                                            onValueChange={(val) => handleSelectChange("targetEngineer", val)}
                                            disabled={!isStage2Active}
                                            placeholder="Assign Engineer"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="targetHeadDesign">Head Design <span className="text-destructive">*</span></Label>
                                        <SearchableSelect
                                            options={users.map(u => ({ label: u.displayName, value: u.id }))}
                                            value={formData.targetHeadDesign}
                                            onValueChange={(val) => handleSelectChange("targetHeadDesign", val)}
                                            disabled={!isStage2Active}
                                            placeholder="Assign Design Head"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="targetHeadWelding">Head Welding <span className="text-destructive">*</span></Label>
                                        <SearchableSelect
                                            options={users.map(u => ({ label: u.displayName, value: u.id }))}
                                            value={formData.targetHeadWelding}
                                            onValueChange={(val) => handleSelectChange("targetHeadWelding", val)}
                                            disabled={!isStage2Active}
                                            placeholder="Assign Welding Head"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="targetHeadQuality">Head Quality <span className="text-destructive">*</span></Label>
                                        <SearchableSelect
                                            options={users.map(u => ({ label: u.displayName, value: u.id }))}
                                            value={formData.targetHeadQuality}
                                            onValueChange={(val) => handleSelectChange("targetHeadQuality", val)}
                                            disabled={!isStage2Active}
                                            placeholder="Assign Quality Head"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="resolutionBy">Resolution By <span className="text-destructive">*</span></Label>
                                        <SearchableSelect
                                            options={users.map(u => ({ label: u.displayName, value: u.id }))}
                                            value={formData.resolutionBy}
                                            onValueChange={(val) => handleSelectChange("resolutionBy", val)}
                                            disabled={!isStage2Active}
                                            placeholder="Assign resolution by"
                                        />
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
                                            {formData.designReviewStatus === 'NA' && <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-xs">NA</span>}
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
                                                        <Checkbox id="na-design" checked={formData.naDesign} onCheckedChange={(val) => handleSelectChange('naDesign', val)} /><Label htmlFor="na-design" className="text-sm font-medium">NA (if applicable)</Label>
                                                    </div>
                                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                                        {formData.naDesign ? (
                                                            <Button type="button" className="flex-1 sm:flex-none px-8 bg-black hover:bg-zinc-800 text-white font-medium" onClick={() => handleReviewSubmit('DESIGN', 'NA')} disabled={isSubmitting}>Save & Submit</Button>
                                                        ) : (
                                                            <>
                                                                <Button type="button" variant="outline" className="flex-1 sm:flex-none px-8 border-gray-300 font-medium text-black hover:bg-gray-100" onClick={() => handleReviewSubmit('DESIGN', 'REJECT')} disabled={isSubmitting}>Reject</Button>
                                                                <Button type="button" className="flex-1 sm:flex-none px-8 bg-black hover:bg-zinc-800 text-white font-medium" onClick={() => handleReviewSubmit('DESIGN', 'APPROVE')} disabled={isSubmitting}>Approve</Button>
                                                            </>
                                                        )}
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
                                            {formData.weldingReviewStatus === 'NA' && <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-xs">NA</span>}
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
                                                        <Checkbox id="na-welding" checked={formData.naWelding} onCheckedChange={(val) => handleSelectChange('naWelding', val)} /><Label htmlFor="na-welding" className="text-sm font-medium">NA (if applicable)</Label>
                                                    </div>
                                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                                        {formData.naWelding ? (
                                                            <Button type="button" className="flex-1 sm:flex-none px-8 bg-black hover:bg-zinc-800 text-white font-medium" onClick={() => handleReviewSubmit('WELDING', 'NA')} disabled={isSubmitting}>Save & Submit</Button>
                                                        ) : (
                                                            <>
                                                                <Button type="button" variant="outline" className="flex-1 sm:flex-none px-8 border-gray-300 font-medium text-black hover:bg-gray-100" onClick={() => handleReviewSubmit('WELDING', 'REJECT')} disabled={isSubmitting}>Reject</Button>
                                                                <Button type="button" className="flex-1 sm:flex-none px-8 bg-black hover:bg-zinc-800 text-white font-medium" onClick={() => handleReviewSubmit('WELDING', 'APPROVE')} disabled={isSubmitting}>Approve</Button>
                                                            </>
                                                        )}
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
                                            {formData.qualityReviewStatus === 'NA' && <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-xs">NA</span>}
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
                                                        <Checkbox id="na-quality" checked={formData.naQuality} onCheckedChange={(val) => handleSelectChange('naQuality', val)} /><Label htmlFor="na-quality" className="text-sm font-medium">NA (if applicable)</Label>
                                                    </div>
                                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                                        {formData.naQuality ? (
                                                            <Button type="button" className="flex-1 sm:flex-none px-8 bg-black hover:bg-zinc-800 text-white font-medium" onClick={() => handleReviewSubmit('QUALITY', 'NA')} disabled={isSubmitting}>Save & Submit</Button>
                                                        ) : (
                                                            <>
                                                                <Button type="button" variant="outline" className="flex-1 sm:flex-none px-8 border-gray-300 font-medium text-black hover:bg-gray-100" onClick={() => handleReviewSubmit('QUALITY', 'REJECT')} disabled={isSubmitting}>Reject</Button>
                                                                <Button type="button" className="flex-1 sm:flex-none px-8 bg-black hover:bg-zinc-800 text-white font-medium" onClick={() => handleReviewSubmit('QUALITY', 'APPROVE')} disabled={isSubmitting}>Approve</Button>
                                                            </>
                                                        )}
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
                                        <Textarea name="correctiveActionComments" rows={3} placeholder="Provide details about the corrective action verification process..." value={formData.correctiveActionComments} onChange={handleInputChange} disabled={!isStage4InitActive} />
                                    </div>
                                    <div className="w-full md:w-1/4 space-y-2 min-w-[200px]">
                                        <Label className="uppercase">Date:</Label>
                                        <Input name="correctiveActionDate" type="date" value={formData.correctiveActionDate} onChange={handleInputChange} disabled={!isStage4InitActive} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t pt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="verifiedByQce">Verified by QCE <span className="text-destructive">*</span></Label>
                                        <SearchableSelect
                                            options={users.map(u => ({ label: u.displayName, value: u.id }))}
                                            value={formData.verifiedByQce}
                                            onValueChange={(val) => handleSelectChange("verifiedByQce", val)}
                                            disabled={!isStage4InitActive}
                                            placeholder="select QCE"
                                        />
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
                                    <Label className="uppercase font-bold">Verified by Head Quality <span className="text-destructive">*</span></Label>
                                    <SearchableSelect
                                        options={users.map(u => ({ label: u.displayName, value: u.id }))}
                                        value={formData.verifiedByHeadQuality || formData.headQuality}
                                        onValueChange={(val) => handleSelectChange("verifiedByHeadQuality", val)}
                                        disabled={!isStage5QualityActive}
                                        placeholder="Assigned Head of Quality"
                                    />
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

            {/* Document Preview Dialog */}
            <DocumentPreviewDialog
                isOpen={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                previewUrl={activePreviewUrl}
                activePreviewDoc={activePreviewDoc}
            />
        </div>
    )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
function CreateNCR() {
    const location = useLocation()
    const navigate = useNavigate()
    const { id: routeId } = useParams()

    // Derive mode from URL path
    const view = location.pathname.includes("/create") ? "create"
        : location.pathname.includes("/edit/") ? "open"
        : location.pathname.includes("/view/") ? "view"
        : "list"
    const viewNcrId = routeId || null

    const handleSuccess = (data) => {
        let msg = "NCR operation completed successfully!"
        if (data && data.nextUser) {
            if (data.nextUser.name === "Completed") {
                msg = "NCR Operation Completed Successfully!"
            }
        }
        toast.success(msg)
        navigate("/ncr/list")
    }

    const handleViewClick = (row) => {
        const safePath = row.ncr_no ? encodeURIComponent(String(row.ncr_no).replace(/\//g, "-")) : row.id
        navigate(`/ncr/view/${safePath}`, { state: { record: row } })
    }

    const handleOpenClick = (row) => {
        const safePath = row.ncr_no ? encodeURIComponent(String(row.ncr_no).replace(/\//g, "-")) : row.id
        navigate(`/ncr/edit/${safePath}`, { state: { record: row } })
    }

    return (
        <>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
            </header>
            <main className="flex-1 overflow-auto p-6 flex flex-col">
                <div className="flex-1 flex flex-col w-full">
                    {view === "list" ? (
                        <ListView
                            onCreateClick={() => navigate("/ncr/create")}
                            onViewClick={handleViewClick}
                            onOpenClick={handleOpenClick}
                        />
                    ) : (
                        <FormView
                            ncrId={null}
                            routeId={viewNcrId}
                            locationState={location.state}
                            onBack={() => navigate("/ncr/list")}
                            onSuccess={handleSuccess}
                            isViewOnly={view === "view"}
                            isOpenMode={view === "open"}
                        />
                    )}
                </div>
            </main>
        </>
    )
}

export default CreateNCR
