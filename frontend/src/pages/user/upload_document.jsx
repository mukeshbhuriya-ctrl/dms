import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { UserSidebar } from "@/components"
import { SidebarTrigger } from "@/components/ui/sidebar"
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
import DocumentTrail from "../../components/dms/DocumentTrail"

function UploadDocument() {
    const [uploadingIds, setUploadingIds] = useState({})
    const [uploadProgress, setUploadProgress] = useState({})
    const [statusFilter, setStatusFilter] = useState("all")
    const [approverStatusFilter, setApproverStatusFilter] = useState("all")
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [columnFilters, setColumnFilters] = useState({});

    // Master Data for Cascading Filters
    const [customers, setCustomers] = useState([]);
    const [allPos, setAllPos] = useState([]);
    const [allJobs, setAllJobs] = useState([]);

    const [isTrailOpen, setIsTrailOpen] = useState(false)
    const [activeDocId, setActiveDocId] = useState(null)

    const [previewUrl, setPreviewUrl] = useState(null)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [activePreviewDoc, setActivePreviewDoc] = useState(null)

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

    const handleDirectUpload = async (documentId, file) => {
        if (!file) return

        setUploadingIds(prev => ({ ...prev, [documentId]: true }))
        setUploadProgress(prev => ({ ...prev, [documentId]: 0 }))

        try {
            const formData = new FormData()
            formData.append('document_id', documentId)
            formData.append('file', file)

            const result = await dccService.uploadDocumentVersion(formData, {
                onUploadProgress: (progressEvent) => {
                    setUploadProgress(prev => ({ ...prev, [documentId]: progressEvent.progress }))
                }
            })

            if (result.success || result.data) {
                toast.success("Document uploaded successfully")
                setRefreshTrigger(prev => prev + 1)
            } else {
                toast.error(result.message || "Failed to upload document")
            }
        } catch (error) {
            console.error("Upload error:", error)
            toast.error("An error occurred while uploading")
        } finally {
            setUploadingIds(prev => ({ ...prev, [documentId]: false }))
            setUploadProgress(prev => {
                const newProgress = { ...prev }
                delete newProgress[documentId]
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
            cell: (row) => row.group?.job_group?.[0]?.job?.job_number || "-",
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
                const isDisabled = row.approverStatus === "approved" || row.approverStatus === "pending for approval"

                return (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Input
                                id={`upload-${row.id}`}
                                type="file"
                                className="hidden"
                                onChange={(e) => handleDirectUpload(row.id, e.target.files[0])}
                                disabled={isDisabled || isUploading}
                            />
                            <Label
                                htmlFor={`upload-${row.id}`}
                                className={`
                                    inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
                                    border border-input bg-background hover:bg-accent hover:text-accent-foreground
                                    h-9 px-3
                                    cursor-pointer
                                    ${isDisabled || isUploading ? 'opacity-50 pointer-events-none' : ''}
                                `}
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
                                {isUploading ? (typeof progress === 'number' ? `Uploading... ${progress}%` : 'Uploading...') : 'Upload'}
                            </Label>

                        <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-200 text-slate-600"
                            onClick={() => {
                                setActivePreviewDoc({
                                    documentName: row.documentName,
                                    versionNo: row.versionNo,
                                    mimeType: row.mimeType,
                                    filePath: row.filePath
                                });
                                setPreviewUrl(row.previewUrl);
                                setIsPreviewOpen(true);
                            }}
                            disabled={!row.previewUrl || row.originalStatus === 'Pending' || row.originalStatus === 'Upload Due'}
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-200 text-slate-600"
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
        }
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
                        job_number: doc.group?.job_group?.[0]?.job?.job_number || 'N/A',
                        status: displayStatus,
                        approverStatus: approverStatus,
                        client_status: doc.client_status,
                        createdAt: doc.createdAt,
                        upload_due_days: doc.upload_due_days,
                        response_due_days: doc.response_due_days,
                        versionNo: doc.display_version_no || 0,
                        mimeType: latestVersion?.mime_type,
                        filePath: latestVersion?.file_path,
                        previewUrl: latestVersion?.id
                            ? `${backendUrl}/api/dcc/document-preview/${latestVersion.id}/${encodeURIComponent(latestVersion.file_path?.split('/').pop() || latestVersion.file_path?.split('\\').pop() || 'file')}`
                            : null,
                        originalStatus: doc.status,
                        remarks: latestVersion?.remarks || '-',
                        customer: doc.customer,
                        po: doc.po,
                        group: doc.group
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

    const handleExport = async () => {
        try {
            await exportApi.exportModule("group_document")
        } catch (error) {
            console.error("Export failed:", error)
        }
    }

    return (
        <>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
            </header>
            <main className="flex-1 overflow-auto p-6 flex flex-col">
                <div className="flex-1 flex flex-col w-full">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold">Upload Document</h1>
                    </div>

                    <div className="flex flex-col gap-4">
                        <ProDataTable
                            columns={columns}
                            fetchData={fetchDocumentsWrapper}
                            onExport={handleExport}
                            columnFilters={columnFilters}
                            onFilterChange={onFilterChange}
                            refreshKey={refreshTrigger}
                            topFilters={proTableTopFilters}
                            globalSearchPlaceholder="Search documents..."
                            initialStickyColumns={["documentNumber"]}
                        />
                    </div>
                </div>

                {/* Shared Document Preview Dialog */}
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


            </main>
        </>
    )
}

// --- Local Component-Based Table implementation ---
// Exact replica of @/components/shared/DataTable.jsx but with controlled columnFilters support
const UploaderTable = ({
    columns,
    fetchData,
    onExport,
    columnFilters, // Controlled from parent for cascading reset
    onFilterChange,
    refreshTrigger
}) => {
    const [data, setData] = useState([]);
    const [meta, setMeta] = useState({});
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const isFirstRender = useRef(true);

    // Debounce the global search
    useEffect(() => {
        if (isFirstRender.current) return;
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Sync Data - Following DataTable.jsx pattern but with immediate prop-based columnFilters
    useEffect(() => {
        let cancelled = false;
        const loadData = async () => {
            setLoading(true);
            try {
                const result = await fetchData({
                    page,
                    limit: pageSize,
                    search: debouncedSearch,
                    columnFilters // Use prop directly for immediate response in cascading filter reset
                });
                if (!cancelled) {
                    setData(result.data || []);
                    setMeta(result.meta || {});
                }
            } catch (error) {
                console.error("Failed to load table data", error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        loadData();
        return () => { cancelled = true; };
    }, [page, pageSize, debouncedSearch, columnFilters, fetchData, refreshTrigger]);

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
    }

    const handlePageChange = (newPage) => {
        setPage(newPage)
    }

    const handlePageSizeChange = (val) => {
        setPageSize(parseInt(val))
        setPage(1)
    }

    const resolvePath = (object, path) => {
        if (!path) return undefined;
        return path.split('.').reduce((o, p) => (o ? o[p] : undefined), object);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Input
                    placeholder="Global Search..."
                    value={search}
                    onChange={handleSearchChange}
                    className="max-w-sm"
                />
                <Button variant="outline" onClick={onExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>
            </div>

            <div className="rounded-md border bg-card overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map((col, idx) => (
                                <TableHead key={idx} className={`${col.className} whitespace-nowrap bg-slate-50/50 ${col.filterType ? 'min-w-[150px]' : ''}`}>
                                    <div className="flex flex-col gap-1.5 py-1.5">
                                        <span className="font-bold uppercase text-slate-700 text-[10px] tracking-wider mb-0.5">
                                            {col.header}
                                        </span>
                                        {col.filterType === 'select' && (
                                            col.isMulti ? (
                                                <MultiSelectFilter
                                                    options={col.filterOptions || []}
                                                    value={columnFilters[col.id || col.accessorKey] || []}
                                                    onChange={(val) => onFilterChange({ [col.id || col.accessorKey]: val })}
                                                    placeholder={`All ${col.header}`}
                                                />
                                            ) : (
                                            <Select
                                                value={(columnFilters[col.id || col.accessorKey] || "all").toString()}
                                                onValueChange={(val) => onFilterChange({ [col.id || col.accessorKey]: val === 'all' ? "" : val })}
                                            >
                                                <SelectTrigger className="h-7 text-xs font-normal w-full min-w-[110px] max-w-[180px]">
                                                    <SelectValue placeholder="All" />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-[300px]">
                                                    <SelectItem value="all">All</SelectItem>
                                                    {col.filterOptions?.map((opt, idx) => (
                                                        <SelectItem key={`${opt.value}-${idx}`} value={opt.value.toString()}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            )
                                        )}
                                        {col.filterType === 'text' && (
                                            <Input
                                                placeholder={`Search ${col.header}...`}
                                                className="h-7 text-xs font-normal w-full max-w-[150px]"
                                                value={columnFilters[col.id || col.accessorKey] || ""}
                                                onChange={(e) => onFilterChange({ [col.id || col.accessorKey]: e.target.value })}
                                            />
                                        )}
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Loading...</TableCell></TableRow>
                        ) : data.length ? (
                            data.map((row, rIdx) => (
                                <TableRow key={rIdx}>
                                    {columns.map((col, cIdx) => (
                                        <TableCell key={cIdx} className={col.className}>
                                            {col.cell ? col.cell(row) : resolvePath(row, col.accessorKey)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No results.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Rows per page</p>
                    <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={pageSize} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                        Page {meta.page || 1} of {meta.totalPages || 1} ({meta.total || 0} items)
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page <= 1 || loading}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page >= (meta.totalPages || 1) || loading}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MultiSelectFilter = ({ options, value, onChange, placeholder }) => {
  const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (val) => {
    const newVal = selectedValues.includes(val)
      ? selectedValues.filter(v => v !== val)
      : [...selectedValues, val];
    onChange(newVal);
  };

  const clearFilters = (e) => {
    e.stopPropagation();
    onChange([]);
    setSearchTerm("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-xs font-normal w-full min-w-[110px] max-w-[180px] justify-between px-2 bg-white"
        >
          <div className="flex items-center gap-1 truncate mr-1">
            {selectedValues.length === 0 ? (
              <span className="text-slate-400">{placeholder}</span>
            ) : (
                <div className="flex items-center gap-1">
                    <span className="font-medium text-primary bg-primary/10 px-1 rounded-sm text-[10px]">
                        {selectedValues.length}
                    </span>
                    <span className="truncate">{options.find(o => o.value === selectedValues[0])?.label}</span>
                    {selectedValues.length > 1 && <span className="text-slate-400">...</span>}
                </div>
            )}
          </div>
          <div className="flex items-center">
            {selectedValues.length > 0 && (
                <X 
                  className="h-3 w-3 mr-1 text-slate-400 hover:text-slate-600 pointer-events-auto" 
                  onClick={clearFilters}
                />
            )}
            <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="flex flex-col h-[300px]">
          <div className="p-2 border-b">
            <div className="relative">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                <Input
                    placeholder="Search..."
                    className="h-8 pl-8 text-xs shadow-none border-none focus-visible:ring-0"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-1 custom-scrollbar" style={{ maxHeight: '200px' }}>
            {filteredOptions.length === 0 ? (
              <div className="p-2 text-xs text-center text-slate-500">No results.</div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-100 rounded-sm cursor-pointer"
                  onClick={() => toggleOption(opt.value)}
                >
                  <Checkbox 
                    checked={selectedValues.includes(opt.value)}
                    onCheckedChange={() => toggleOption(opt.value)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs truncate flex-1">{opt.label}</span>
                  {selectedValues.includes(opt.value) && <Check className="h-3 w-3 text-primary shrink-0" />}
                </div>
              ))
            )}
          </div>
          {selectedValues.length > 0 && (
            <div className="p-2 border-t mt-auto">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full h-7 text-[10px] text-slate-500 hover:text-red-600"
                    onClick={clearFilters}
                >
                    Clear Selections
                </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default UploadDocument
