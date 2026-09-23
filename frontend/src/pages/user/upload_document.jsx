import { PageContainer } from "@/components/layout/PageContainer";
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { UserSidebar } from "@/components"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Upload, Loader2, History, Eye, FileText, Plus, Download, ChevronLeft, ChevronRight, Search, X, ChevronDown, Check } from "lucide-react"
import { dccService } from "../../services/dcc.service"
import { toast } from "react-toastify"
import { DataTable } from "@/components/shared/DataTable"
import { Checkbox } from "@/components/ui/checkbox"
import { exportApi } from "@/api/export.api"
import ProDataTable from "../../components/shared/ProDataTable"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog"
import { DocumentPreviewDialog } from "@/components/shared/DocumentPreviewDialog"
import { FileListPreviewDialog } from "@/components/shared/FileListPreviewDialog"
import { MultiFileUploadModal } from "@/components/shared/MultiFileUploadModal"
import DocumentTrail from "../../components/dms/DocumentTrail"
import { AccessControl } from "@/components/iam/access_control";
import { useAuth } from "@/context/AuthContext";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function UploadDocument() {
    const { roles, hasPermission } = useAuth()
    const [uploadingIds, setUploadingIds] = useState({})
    const [uploadProgress, setUploadProgress] = useState({})
    const [statusFilter, setStatusFilter] = useState("all")
    const [approverStatusFilter, setApproverStatusFilter] = useState("all")
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [columnFilters, setColumnFilters] = useState({});
    const globalSearchRef = useRef("");

    // Master Data for Cascading Filters
    const [customers, setCustomers] = useState([]);
    const [allPos, setAllPos] = useState([]);
    const [allJobs, setAllJobs] = useState([]);

    const [isTrailOpen, setIsTrailOpen] = useState(false)
    const [activeDocId, setActiveDocId] = useState(null)

    const [previewUrl, setPreviewUrl] = useState(null)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [activePreviewDoc, setActivePreviewDoc] = useState(null)

    // File List Modal States
    const [isFileListOpen, setIsFileListOpen] = useState(false)
    const [activeFileList, setActiveFileList] = useState([])
    const [activeFileListDocName, setActiveFileListDocName] = useState("")

    // Upload Staging Modal States
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [uploadingDocId, setUploadingDocId] = useState(null)

    const backendUrl = import.meta.env.VITE_BACKEND_URL

    useEffect(() => {
        fetchFilterMetadata();
    }, []);

    const fetchFilterMetadata = async () => {
        try {
            const res = await dccService.getActiveFilters();
            if (res?.success && res.data) {
                const { customers = [], pos = [], jobs = [] } = res.data;
                setCustomers(customers);
                setAllPos(pos);
                setAllJobs(jobs);
            }
        } catch (err) {
            console.error("Error fetching filter metadata:", err);
        }
    };

    const onFilterChange = (newFilters) => {
        setColumnFilters(prev => {
            const updated = { ...prev, ...newFilters };

            // Handle Multi-select Array vs Single value mapping
            Object.keys(newFilters).forEach(key => {
                const val = newFilters[key];
                if (Array.isArray(val) && val.length === 0) {
                    delete updated[key];
                }
            });

            // Reverse Cascading Auto-Select Logic (Enhanced for Multi-select)
            // Only auto-select parent if a SINGLE item is selected in child (to avoid ambiguity)
            if (newFilters.hasOwnProperty('job_number')) {
                const jobVal = newFilters.job_number;
                const actualJobVal = Array.isArray(jobVal) ? (jobVal.length === 1 ? jobVal[0] : null) : jobVal;

                if (actualJobVal) {
                    const selectedJob = allJobs.find(j => (j.job_number || j.number || "").toString() === actualJobVal.toString());
                    if (selectedJob) {
                        const poNum = (selectedJob.po?.po_number || selectedJob.po_number || "").toString();
                        const custName = (selectedJob.customer?.customer_name || selectedJob.customer_name || "").toString();
                        if (poNum) updated.po_number = poNum;
                        if (custName) updated.customer_name = custName;
                    }
                }
            } else if (newFilters.hasOwnProperty('po_number')) {
                const poVal = newFilters.po_number;
                const actualPoVal = Array.isArray(poVal) ? (poVal.length === 1 ? poVal[0] : null) : poVal;

                if (actualPoVal) {
                    const selectedPo = allPos.find(p => (p.po_number || p.number || "").toString() === actualPoVal.toString());
                    if (selectedPo) {
                        const custName = (selectedPo.customer?.customer_name || selectedPo.customer_name || "").toString();
                        if (custName) updated.customer_name = custName;
                    }
                }
            }

            // Forward Cascading Reset Logic (only if manually changing a parent)
            if (newFilters.hasOwnProperty('customer_name')) {
                const newCust = Array.isArray(newFilters.customer_name) ? newFilters.customer_name : [newFilters.customer_name];
                if (newCust.length === 1 && newCust[0]) {
                    const currentPo = Array.isArray(updated.po_number) ? updated.po_number[0] : updated.po_number;
                    const poObj = allPos.find(p => (p.po_number || p.number || "").toString() === (currentPo || "").toString());
                    if (poObj && (poObj.customer?.customer_name || poObj.customer_name || "").toString() !== newCust[0].toString()) {
                        delete updated.po_number;
                        delete updated.job_number;
                    }
                }
            } else if (newFilters.hasOwnProperty('po_number')) {
                const newPo = Array.isArray(newFilters.po_number) ? newFilters.po_number : [newFilters.po_number];
                if (newPo.length === 1 && newPo[0]) {
                    const currentJob = Array.isArray(updated.job_number) ? updated.job_number[0] : updated.job_number;
                    const jobObj = allJobs.find(j => (j.job_number || j.number || "").toString() === (currentJob || "").toString());
                    if (jobObj && (jobObj.po?.po_number || jobObj.po_number || "").toString() !== newPo[0].toString()) {
                        delete updated.job_number;
                    }
                }
            }

            return updated;
        });
    };

    const handleOpenUploadModal = (docId) => {
        setUploadingDocId(docId)
        setIsUploadModalOpen(true)
    }

    const handleSubmitUpload = async (stagedFiles) => {
        if (!uploadingDocId || !stagedFiles || stagedFiles.length === 0) {
            toast.error("Please select at least one file to upload")
            return
        }

        setUploadingIds(prev => ({ ...prev, [uploadingDocId]: true }))
        setUploadProgress(prev => ({ ...prev, [uploadingDocId]: 0 }))
        setIsUploadModalOpen(false)

        try {
            const formData = new FormData()
            formData.append('document_id', uploadingDocId)
            stagedFiles.forEach(f => formData.append('files', f)) // Using Multer array field 'files'

            const result = await dccService.uploadDocumentVersion(formData, {
                onUploadProgress: (progressEvent) => {
                    setUploadProgress(prev => ({ ...prev, [uploadingDocId]: progressEvent.progress }))
                }
            })

            if (result.success || result.data) {
                toast.success("Documents uploaded successfully")
                setRefreshTrigger(prev => prev + 1)
                setUploadingDocId(null)
            } else {
                toast.error(result.message || "Failed to upload documents")
            }
        } catch (error) {
            console.error("Upload error:", error)
            toast.error("An error occurred while uploading")
        } finally {
            setUploadingIds(prev => ({ ...prev, [uploadingDocId]: false }))
            setUploadProgress(prev => {
                const newProgress = { ...prev }
                delete newProgress[uploadingDocId]
                return newProgress
            })
        }
    }

    // cascading filter options
    const clientFilterOptions = useMemo(() => {
        return customers.map(c => ({
            label: (c.customer_name || c.name || "Unknown").toString(),
            value: (c.customer_name || c.name || "").toString()
        })).filter(o => o.value !== "");
    }, [customers]);

    const poFilterOptions = useMemo(() => {
        const selectedClient = columnFilters.customer_name;
        let filteredPos = allPos;
        if (selectedClient) {
            filteredPos = allPos.filter(p => {
                const val = (p.customer?.customer_name || p.customer_name);
                return Array.isArray(selectedClient)
                    ? selectedClient.includes(val)
                    : val === selectedClient;
            });
        }
        const uniquePosLabels = [...new Set(filteredPos.map(p => p.po_number || p.number))].filter(Boolean);
        return uniquePosLabels.map(p => ({ label: p.toString(), value: p.toString() }));
    }, [allPos, columnFilters.customer_name]);

    const jobFilterOptions = useMemo(() => {
        const selectedPo = columnFilters.po_number;
        const selectedClient = columnFilters.customer_name;
        let filteredJobs = allJobs;
        if (selectedClient) {
            filteredJobs = filteredJobs.filter(j => {
                const val = (j.customer?.customer_name || j.customer_name);
                return Array.isArray(selectedClient)
                    ? selectedClient.includes(val)
                    : val === selectedClient;
            });
        }
        if (selectedPo) {
            filteredJobs = filteredJobs.filter(j => {
                const val = (j.po?.po_number || j.po_number);
                return Array.isArray(selectedPo)
                    ? selectedPo.includes(val)
                    : val === selectedPo;
            });
        }
        const uniqueJobsLabels = [...new Set(filteredJobs.map(j => j.job_number || j.number))].filter(Boolean);
        return uniqueJobsLabels.sort((a, b) => a.toString().localeCompare(b.toString(), undefined, { numeric: true })).map(j => ({ label: j.toString(), value: j.toString() }));
    }, [allJobs, columnFilters.po_number, columnFilters.customer_name]);

    const columns = useMemo(() => [
        {
            id: "documentNumber",
            header: "System Doc ID",
            accessorKey: "documentNumber",
            filterType: "text",
        },
        {
            id: "shreno_doc_no",
            header: "SHRENO DOC NO",
            accessorKey: "shreno_doc_no",
            filterType: "text",
        },
        {
            id: "client_doc_no",
            header: "CLIENT DOC NO",
            accessorKey: "client_doc_no",
            filterType: "text",
        },
        {
            id: "documentName",
            header: "Document Name",
            accessorKey: "documentName",
            filterType: "text",
        },
        {
            header: "Revision No",
            accessorKey: "versionNo",
            cell: (row) => (
                <span className={row.versionNo !== null && row.versionNo !== undefined ? "font-semibold text-blue-600" : "text-muted-foreground"}>
                    {row.versionNo !== null && row.versionNo !== undefined ? `${row.versionNo}` : '-'}
                </span>
            ),
            className: "w-[80px]"
        },
        {
            id: "assignee",
            header: "Assigned To",
            accessorKey: "user.name",
            cell: (row) => {
                const name = row.user ? (row.user.name || row.user.full_name || row.user.email) : "Pending Assignee";
                const empid = row.user?.empid || row.user?.employeeId || "";

                if (!row.user) {
                    return <span className="text-slate-400 italic font-medium">Pending Assignee</span>;
                }

                return empid ? `${name} (${empid})` : name;
            },
        },
        {
            id: "plant_submission_date",
            accessorKey: "upload_due_days",
            header: "Planned Submission Date",
            cell: (row) => {
                if (!row.upload_due_days) return "-";
                const created = new Date(row.versionCreatedAt || row.createdAt);
                const deadline = new Date(created.getTime() + (row.upload_due_days * 24 * 60 * 60 * 1000));
                return deadline.toLocaleDateString("en-GB", { day: '2-digit', month: 'long', year: 'numeric' });
            },
        },
        {
            header: "Uploader Status",
            accessorKey: "uploader_status",
            filterType: "select",
            filterOptions: [
                { label: "Pending", value: "pending" },
                { label: "Uploaded", value: "uploaded" },
            ],
            cell: (row) => {
                const status = row.originalStatus || row.status
                if (status === 'Upload Due') {
                    return (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                            Upload Overdue
                        </span>
                    )
                }
                const isPending = status === 'Pending' || status === 'Response Due'
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isPending ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {isPending ? 'Pending' : 'Uploaded'}
                    </span>
                )
            }
        },
        {
            header: "Approver Status",
            accessorKey: "status",
            filterType: "select",
            filterOptions: [
                { label: "Awaiting Upload", value: "awaiting_upload" },
                { label: "Pending for Approval", value: "pending_approval" },
                { label: "Approved", value: "approved" },
                { label: "Rejected", value: "rejected" },
            ],
            cell: (row) => {
                const status = row.originalStatus || row.status
                if (status === 'Response Due') {
                    return (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                            Response Overdue
                        </span>
                    )
                }
                const isUploaderPending = status === 'Pending' || status === 'Upload Due'
                let text = isUploaderPending ? "Awaiting Upload" : "Pending for Approval"
                let colorClass = isUploaderPending ? "bg-gray-100 text-gray-800" : "bg-orange-100 text-orange-800 border border-orange-200"

                if (status === 'Approved') {
                    text = "Approved"
                    colorClass = "bg-green-100 text-green-800"
                } else if (status === 'Rejected') {
                    text = "Rejected"
                    colorClass = "bg-red-100 text-red-800"
                }

                return (
                    <span className={`whitespace-nowrap px-2 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
                        {text}
                    </span>
                )
            }
        },
        {
            id: "actions",
            header: "Action",
            accessorKey: "id",
            cell: (row) => {
                const isUploading = uploadingIds[row.id]
                const progress = uploadProgress[row.id]
                const isDisabled = row.approverStatus === "approved"

                return (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <AccessControl required="dms:upload:Upload">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-slate-200 text-slate-600 hover:bg-primary/5 hover:text-primary hover:border-primary/20 cursor-pointer disabled:cursor-not-allowed disabled:bg-transparent disabled:text-slate-400 disabled:border-slate-200"
                                    onClick={() => handleOpenUploadModal(row.id)}
                                    disabled={isDisabled || isUploading}
                                >
                                    {isUploading ? (
                                        <div className="relative inline-flex items-center justify-center mr-2">
                                            <svg className="w-4 h-4 transform -rotate-90">
                                                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-slate-200" />
                                                <circle
                                                    cx="8" cy="8" r="6"
                                                    stroke="currentColor" strokeWidth="2" fill="transparent"
                                                    strokeDasharray={37.7} strokeDashoffset={typeof progress === 'number' ? 37.7 - (progress / 100) * 37.7 : 0}
                                                    className="text-primary transition-all duration-300 ease-out" strokeLinecap="round"
                                                />
                                            </svg>
                                        </div>
                                    ) : (
                                        <Upload className="h-4 w-4 mr-2" />
                                    )}
                                    {isUploading ? (typeof progress === 'number' ? `Uploading... ${progress}%` : 'Uploading...') : (row.originalStatus === 'Pending for Approval' || row.originalStatus === 'Uploaded' ? 'Replace' : 'Upload')}
                                </Button>
                            </AccessControl>

                            <Button
                                variant="outline"
                                size="sm"
                                className="border-slate-200 text-slate-600 cursor-pointer"
                                onClick={() => {
                                    if (row.files && row.files.length > 0) {
                                        setActiveFileList(row.files);
                                        setActiveFileListDocName(row.documentName);
                                        setIsFileListOpen(true);
                                    } else {
                                        setActivePreviewDoc({
                                            documentName: row.documentName,
                                            versionNo: row.versionNo,
                                            mimeType: row.mimeType,
                                            filePath: row.filePath
                                        });
                                        setPreviewUrl(row.previewUrl);
                                        setIsPreviewOpen(true);
                                    }
                                }}
                                disabled={!(row.files?.length > 0 || row.previewUrl) || row.originalStatus === 'Pending' || row.originalStatus === 'Upload Due'}
                            >
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                className="border-slate-200 text-slate-600 cursor-pointer"
                                onClick={() => {
                                    setActiveDocId(row.id);
                                    setIsTrailOpen(true);
                                }}
                            >
                                <History className="h-4 w-4 mr-2" />
                                Trail
                            </Button>
                        </div>
                    </div>
                )
            },
            className: "w-[150px]"
        },
        {
            id: "customer_name",
            header: "Client",
            accessorKey: "customer.customer_name",
            filterType: "select",
            filterOptions: clientFilterOptions,
            cell: (row) => row.customer?.customer_name || "-",
        },
        {
            id: "po_number",
            header: "PO",
            accessorKey: "po.po_number",
            filterType: "select",
            filterOptions: poFilterOptions,
            cell: (row) => row.po?.po_number || "-",
        },
        {
            id: "job_number",
            header: "Job Number",
            accessorKey: "job_number",
            filterType: "select",
            isMulti: true,
            filterOptions: jobFilterOptions,
            cell: (row) => {
                const jobs = row.group?.job_group?.map(jg => jg.job?.job_number).filter(Boolean);
                return jobs && jobs.length > 0 ? jobs.join(', ') : "-";
            },
        },
        {
            header: "Created At",
            accessorKey: "createdAt",
            cell: (row) => new Date(row.createdAt).toLocaleDateString()
        },
        {
            header: "Upload Due Days",
            accessorKey: "upload_due_days",
            cell: (row) => row.upload_due_days || "-"
        },
        {
            header: "Response Due Days",
            accessorKey: "response_due_days",
            cell: (row) => row.response_due_days || "-"
        },
    ], [uploadingIds, backendUrl, clientFilterOptions, poFilterOptions, jobFilterOptions])

    const proTableTopFilters = useMemo(() => [
        {
            value: statusFilter,
            onChange: setStatusFilter,
            placeholder: "All Status",
            options: [
                { label: "All Status", value: "all" },
                { label: "Pending for Approval", value: "pending" },
                { label: "Approved", value: "approved" },
                { label: "Rejected", value: "rejected" },
                { label: "Awaiting Upload", value: "NA" },
            ]
        }
    ], [statusFilter, setStatusFilter]);

    const fetchDocuments = useCallback(async ({ page, limit, search, columnFilters }) => {
        try {
            const params = {
                page,
                limit,
                status_filter: statusFilter
            }
            if (search) params.search = search

            // Map column-based filters to API params
            if (columnFilters) {
                if (columnFilters.customer_name) params.customer_name_filter = columnFilters.customer_name;
                if (columnFilters.po_number) params.po_number_filter = columnFilters.po_number;
                if (columnFilters.job_number) params.job_number_filter = columnFilters.job_number;
                if (columnFilters.documentName) params.search = columnFilters.documentName;
                if (columnFilters.shreno_doc_no) params.shreno_doc_no_filter = columnFilters.shreno_doc_no;
                if (columnFilters.client_doc_no) params.client_doc_no_filter = columnFilters.client_doc_no;
                if (columnFilters.documentNumber) params.document_number_filter = columnFilters.documentNumber;
                if (columnFilters.uploader_status) params.uploader_status_filter = columnFilters.uploader_status;
                if (columnFilters.status) params.approver_status_filter = columnFilters.status;
            }

            globalSearchRef.current = search || "";
            const response = await dccService.getMyAssignedDocuments(params)

            if (response.data) {
                const mappedDocs = response.data.map((doc, index) => {
                    let status = 'pending'
                    if (doc.status === 'Approved' || doc.status === 'Uploaded' || doc.status === 'Pending for Approval') {
                        status = 'done'
                    }
                    if (doc.status === 'Rejected') status = 'pending'

                    const latestVersion = doc.versions && doc.versions.length > 0 ? doc.versions[0] : null

                    let approverStatus = 'NA'
                    if (doc.status === 'Uploaded' || doc.status === 'Pending for Approval') approverStatus = 'pending for approval'
                    else if (doc.status === 'Approved') approverStatus = 'approved'
                    else if (doc.status === 'Rejected' || (doc.status === 'Pending' && latestVersion?.status === 'Rejected')) approverStatus = 'rejected'

                    const displayStatus = (doc.status === 'Upload Due' || doc.status === 'Response Due') ? doc.status : status

                    return {
                        id: doc.id,
                        s_no: (page - 1) * limit + index + 1,
                        shreno_doc_no: doc.shreno_doc_no || '-',
                        client_doc_no: doc.client_doc_no || '-',
                        documentName: doc.document.document_name,
                        documentNumber: doc.document.document_number,
                        job_number: (doc.group?.job_group?.map(jg => jg.job?.job_number).filter(Boolean).join(', ')) || 'N/A',
                        status: displayStatus,
                        approverStatus: approverStatus,
                        client_status: doc.client_status,
                        createdAt: doc.createdAt,
                        versionCreatedAt: latestVersion ? latestVersion.createdAt : null,
                        upload_due_days: doc.upload_due_days,
                        response_due_days: doc.response_due_days,
                        versionNo: latestVersion ? latestVersion.version_no : 0,
                        files: latestVersion?.files || [],
                        mimeType: latestVersion?.mime_type,
                        filePath: latestVersion?.file_path,
                        previewUrl: latestVersion?.id
                            ? `${backendUrl}/api/dcc/document-preview/${latestVersion.id}/${encodeURIComponent(latestVersion.file_path?.split('/').pop() || latestVersion.file_path?.split('\\').pop() || 'file')}`
                            : null,
                        originalStatus: doc.status,
                        remarks: latestVersion?.remarks || '-',
                        customer: doc.customer,
                        po: doc.po,
                        group: doc.group,
                        user: doc.user
                    }
                })

                return {
                    data: mappedDocs,
                    meta: response.meta
                }
            }
        } catch (error) {
            console.error("Error fetching documents:", error)
            return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }
        }
    }, [statusFilter, backendUrl])

    const fetchDocumentsWrapper = useCallback((params) => {
        return fetchDocuments(params)
    }, [fetchDocuments, refreshTrigger])

    const handleExport = async (type) => {
        try {
            const params = {};
            if (type !== "all") {
                if (statusFilter && statusFilter !== 'all') params.status_filter = statusFilter;

                if (columnFilters) {
                    if (columnFilters.customer_name) params.customer_name_filter = columnFilters.customer_name;
                    if (columnFilters.po_number) params.po_number_filter = columnFilters.po_number;
                    if (columnFilters.job_number) params.job_number_filter = columnFilters.job_number;
                    if (columnFilters.documentName) params.search = columnFilters.documentName;
                    if (columnFilters.shreno_doc_no) params.shreno_doc_no_filter = columnFilters.shreno_doc_no;
                    if (columnFilters.client_doc_no) params.client_doc_no_filter = columnFilters.client_doc_no;
                    if (columnFilters.documentNumber) params.document_number_filter = columnFilters.documentNumber;
                    if (columnFilters.uploader_status) params.uploader_status_filter = columnFilters.uploader_status;
                    if (columnFilters.status) params.approver_status_filter = columnFilters.status;
                }

                if (globalSearchRef.current) {
                    params.search = globalSearchRef.current;
                }
            }

            await exportApi.exportModule("group_document", "My Uploads Export.xlsx", params);
        } catch (error) {
            console.error("Export failed:", error);
        }
    }

    return (
        <PageContainer className="overflow-hidden">
            <div className="flex-1 min-h-0 flex flex-col w-full overflow-hidden">
                <ProDataTable
                    columns={columns}
                    fetchData={fetchDocumentsWrapper}
                    customToolbarActions={
                        hasPermission("dms:upload", "Export") && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200 bg-white text-slate-600 data-[state=open]:bg-slate-50 hover:bg-slate-50 shadow-none ml-1">
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-white border border-slate-200 shadow-lg p-1.5">
                                    <DropdownMenuItem onClick={() => handleExport("filtered")} className="text-xs font-medium cursor-pointer flex items-center">
                                        <Download className="mr-2 h-4 w-4" />
                                        Export Filtered Data
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport("all")} className="text-xs font-medium cursor-pointer flex items-center">
                                        <Download className="mr-2 h-4 w-4" />
                                        Export All Data
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )
                    }
                    columnFilters={columnFilters}
                    onFilterChange={onFilterChange}
                    refreshKey={refreshTrigger}
                    topFilters={proTableTopFilters}
                    globalSearchPlaceholder="Search documents..."
                    initialStickyColumns={["documentNumber"]}
                    lockActiveFilters={true}
                />
            </div>

            {/* Shared Document Preview Dialog */}
            <FileListPreviewDialog
                isOpen={isFileListOpen}
                onClose={() => setIsFileListOpen(false)}
                files={activeFileList}
                documentName={activeFileListDocName}
                onPreviewFile={(previewInfo) => {
                    setActivePreviewDoc(previewInfo);
                    setPreviewUrl(previewInfo.previewUrl);
                    setIsPreviewOpen(true);
                }}
            />

            <DocumentPreviewDialog
                isOpen={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                previewUrl={previewUrl}
                activePreviewDoc={activePreviewDoc}
            />

            <Sheet open={isTrailOpen} onOpenChange={setIsTrailOpen}>
                <SheetContent className="sm:max-w-xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Document Audit Trail</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                        <DocumentTrail
                            documentId={activeDocId}
                            onPreview={(previewInfo) => {
                                setActivePreviewDoc(previewInfo);
                                setPreviewUrl(previewInfo.previewUrl);
                                setIsPreviewOpen(true);
                            }}
                        />
                    </div>
                </SheetContent>
            </Sheet>


            <MultiFileUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onSubmit={handleSubmitUpload}
            />

        </PageContainer>
    )
}

export default UploadDocument
