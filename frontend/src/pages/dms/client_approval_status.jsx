import React, { useState, useMemo, useCallback, useRef } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from 'react-toastify';
import { 
    Loader2, 
    CheckCircle, 
    XCircle, 
    Upload, 
    History, 
    ArrowLeft, 
    Eye,
    Save,
    FileText,
    Calendar,
    User,
    Package,
    Search,
    ChevronLeft,
    ChevronRight,
    Download
} from "lucide-react";
import { dccService } from "../../services/dcc.service";
import { DataTable } from "@/components/shared/DataTable";
import { exportApi } from "@/api/export.api";
import DocumentTrail from "../../components/dms/DocumentTrail";
import { DocumentPreviewDialog } from "../../components/shared/DocumentPreviewDialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const ClientApprovalStatus = () => {
    const [view, setView] = useState("list"); // 'list' | 'review'
    const [selectedTransmission, setSelectedTransmission] = useState(null);
    const [rowUpdates, setRowUpdates] = useState({}); // { td_id: { status: 'Approved', remarks: '', file: null, loading: false, submitted: false } }
    const [uploadProgress, setUploadProgress] = useState({});
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [statusFilter, setStatusFilter] = useState("all");
    const [activeListFilters, setActiveListFilters] = useState({ customers: [], pos: [] });

    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    // Trail & Preview State
    const [isTrailOpen, setIsTrailOpen] = useState(false);
    const [activeDocId, setActiveDocId] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");
    const [activePreviewDoc, setActivePreviewDoc] = useState(null);
    
    // Fetch Restricted Metadata for filters
    React.useEffect(() => {
        const fetchFilters = async () => {
            try {
                const res = await dccService.getTransmissionFilters();
                if (res.success) setActiveListFilters(res.data);
            } catch (err) {
                console.error("Error fetching approval filters:", err);
            }
        };
        fetchFilters();
    }, [refreshTrigger]);

    // Fetch Transmissions for main list
    const fetchTransmissionsWrapper = useCallback(async (params) => {
        try {
            // params.columnFilters contains UI filters: { customer_name, po_number }
            const queryParams = { 
                ...params, 
                status_filter: statusFilter,
                customer_name_filter: params.columnFilters?.customer_name,
                po_number_filter: params.columnFilters?.po_number
            };
            const res = await dccService.getTransmissions(queryParams);
            if (res.success) {
                return {
                    data: res.data || [],
                    meta: res.meta || { total: 0, page: 1, limit: 10, totalPages: 0 }
                };
            }
            return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
        } catch (error) {
            console.error("Error fetching transmissions:", error);
            return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
        }
    }, [refreshTrigger, statusFilter]);

    // Handle Row Updates
    const updateRowStatus = (id, status) => {
        setRowUpdates(prev => ({
            ...prev,
            [id]: { ...(prev[id] || { remarks: '', file: null }), status }
        }));
    };

    const updateRowRemarks = (id, remarks) => {
        setRowUpdates(prev => ({
            ...prev,
            [id]: { ...(prev[id] || { status: 'Approved', file: null }), remarks }
        }));
    };

    const updateRowFile = (id, file) => {
        setRowUpdates(prev => ({
            ...prev,
            [id]: { ...(prev[id] || { status: 'Approved', remarks: '' }), file }
        }));
    };

    const handleReviewClick = async (transmission) => {
        try {
            // 1. Set basic transmission first for immediate UI feedback
            setSelectedTransmission(transmission);
            setView("review");

            // 2. Clear state
            setRowUpdates({});

            // 3. Fetch Full Document Details (with Job, Client Doc No, etc.)
            const res = await dccService.getTransmissionDocuments({ transmission_id: transmission.id });
            if (res.success) {
                const fullDocs = res.data || [];
                
                // Update selected transmission with full documents
                setSelectedTransmission(prev => ({
                    ...prev,
                    documents: fullDocs
                }));

                // Detect previously-submitted documents via td.client_status
                const initialUpdates = {};
                fullDocs.forEach(td => {
                    const isSubmitted = td.client_status && td.client_status !== 'Pending';
                    initialUpdates[td.id] = { 
                        status: isSubmitted ? td.client_status : 'Approved', 
                        remarks: isSubmitted ? (td.client_remarks || '') : '', 
                        file: null, 
                        existingFile: null,
                        loading: false, 
                        submitted: isSubmitted 
                    };
                });
                setRowUpdates(initialUpdates);
            }
        } catch (error) {
            console.error("Error loading transmission details:", error);
            toast.error("Failed to load document details");
        }
    };

    const handleSubmitRow = async (rowId) => {
        const update = rowUpdates[rowId];
        if (!update) return;

        if ((update.status === 'Rejected' || update.status === 'Commented') && !update.remarks?.trim()) {
            toast.error("Please provide remarks.");
            return;
        }

        setRowUpdates(prev => ({ ...prev, [rowId]: { ...prev[rowId], loading: true } }));
        setUploadProgress(prev => ({ ...prev, [rowId]: 0 }));

        try {
            const formData = new FormData();
            formData.append('transmission_document_id', rowId);
            formData.append('status', update.status);
            formData.append('remarks', update.remarks || "");
            if (update.file) {
                formData.append('client_file', update.file);
            }

            const res = await dccService.updateTransmissionDocumentClientStatus(formData, {
                onUploadProgress: (progressEvent) => {
                    setUploadProgress(prev => ({ ...prev, [rowId]: progressEvent.progress }));
                }
            });
            if (res.success) {
                toast.success("Document review submitted!");
                setRowUpdates(prev => ({ 
                    ...prev, 
                    [rowId]: { ...prev[rowId], loading: false, submitted: true } 
                }));
                // Trigger list refresh so transmission status updates
                setRefreshTrigger(prev => prev + 1);
            } else {
                throw new Error(res.message || "Failed to update");
            }
        } catch (error) {
            console.error("Error submitting row:", error);
            toast.error(error.message || "Submission failed");
            setRowUpdates(prev => ({ ...prev, [rowId]: { ...prev[rowId], loading: false } }));
        } finally {
            setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[rowId];
                return newProgress;
            });
        }
    };

    // Columns for MAIN LIST
    const listColumns = useMemo(() => [
        { accessorKey: "transmission_number", header: "TRANSMISSION NO" },
        { 
            header: "CUSTOMER", 
            accessorKey: "customer.customer_name",
            id: "customer_name",
            filterType: "select"
        },
        { 
            header: "PO NUMBER", 
            accessorKey: "po.po_number",
            id: "po_number",
            filterType: "select"
        },
        { header: "DOCS", cell: (row) => <Badge variant="secondary" className="px-2">{row.documents?.length || 0}</Badge> },
        { header: "SENT DATE", cell: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-' },
        {
            header: "STATUS",
            cell: (row) => {
                const colors = {
                    'Approved': 'bg-green-100 text-green-700 font-bold',
                    'Final Approved': 'bg-green-100 text-green-700 font-bold',
                    'Rejected': 'bg-red-100 text-red-700 font-bold',
                    'Partially Approved': 'bg-blue-100 text-blue-700 font-bold',
                    'As Built': 'bg-indigo-100 text-indigo-700 font-bold',
                    'Re-approval': 'bg-amber-100 text-amber-700 font-bold',
                    'Commented': 'bg-sky-100 text-sky-700 font-bold',
                    'default': 'bg-yellow-100 text-yellow-700 font-bold'
                };
                return (
                    <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider ${colors[row.client_status] || colors.default}`}>
                        {row.client_status || 'Pending'}
                    </span>
                );
            }
        },
        {
            id: "actions",
            header: "ACTION",
            cell: (row) => (
                <Button size="sm" variant="outline" className="h-8 border-slate-200" onClick={() => handleReviewClick(row)}>
                    <ArrowLeft className="w-3.5 h-3.5 mr-2 rotate-180" /> Review
                </Button>
            )
        }
    ], [refreshTrigger]);

    // --- REPLICATION: DATA TABLE CONFIG FOR REVIEW MODE ---
    
    const reviewFetchData = useCallback(async ({ search, columnFilters }) => {
        let docs = (selectedTransmission?.documents || []).map(td => {
            const version = td.version;
            return {
                ...td,
                // MAP FIELDS FOLLOWING ASSIGN_DOCUMENT.JSX PATTERNS
                systemDocId: td.group_document?.document?.document_number || "-",
                shreno_doc_no: td.group_document?.shreno_doc_no || td.group_document?.document?.document_number || "-",
                client_doc_no: td.group_document?.client_doc_no || td.group_document?.document?.client_document_number || "-",
                doc_name: td.group_document?.document?.document_name || "-",
                po_number: selectedTransmission?.po?.po_number || "-",
                job_number: td.group_document?.group?.job_group?.[0]?.job?.job_number || "-",
                revision: version?.version_no ?? "0",
                // PREVIEW URL LOGIC FROM DOCUMENT_APPRVER.JSX
                previewUrl: version?.id
                    ? `${backendUrl}/api/dcc/document-preview/${version.id}/${encodeURIComponent(version.file_path?.split('/').pop() || version.file_path?.split('\\').pop() || 'file')}`
                    : null,
                mimeType: version?.mime_type,
                filePath: version?.file_path
            };
        });

        // APPLY LOCAL FILTERS (Similar to assign_document.jsx but for client-side list)
        if (search) {
            const s = search.toLowerCase();
            docs = docs.filter(d => 
                d.shreno_doc_no.toLowerCase().includes(s) || 
                d.doc_name.toLowerCase().includes(s) || 
                d.client_doc_no.toLowerCase().includes(s)
            );
        }

        if (columnFilters) {
            Object.keys(columnFilters).forEach(key => {
                const val = columnFilters[key]?.toLowerCase();
                if (val) {
                    docs = docs.filter(item => {
                        const cellVal = String(item[key] || "").toLowerCase();
                        return cellVal.includes(val);
                    });
                }
            });
        }

        return { data: docs, meta: { total: docs.length, page: 1, totalPages: 1 } };
    }, [selectedTransmission, backendUrl]);

    const reviewColumns = useMemo(() => [
        { accessorKey: "systemDocId", header: "SYSTEM DOC ID", filterType: "text" },
        { accessorKey: "job_number", header: "JOB NUMBER", filterType: "text" },
        { accessorKey: "doc_name", header: "DOCUMENT NAME", className: "min-w-[200px]", filterType: "text" },
        { accessorKey: "shreno_doc_no", header: "SHRENO DOC NO", className: "font-medium", filterType: "text" },
        { accessorKey: "client_doc_no", header: "CLIENT DOC NO", filterType: "text" },
        {
            header: "REVISION",
            cell: (row) => (
                <span className={row.revision !== null && row.revision !== undefined ? "font-semibold text-blue-600" : "text-muted-foreground"}>
                    {row.revision}
                </span>
            ),
            className: "w-[80px] text-center"
        },
        {
            header: "SELECT STATUS",
            className: "w-[150px]",
            cell: (row) => {
                const update = rowUpdates[row.id] || { status: 'Approved' };
                const isSubmitted = update.submitted;
                return (
                    <Select 
                        value={update.status} 
                        onValueChange={(val) => updateRowStatus(row.id, val)}
                        disabled={isSubmitted}
                    >
                        <SelectTrigger className={`h-8 w-[130px] text-[11px] font-semibold ${
                            isSubmitted 
                            ? (['Approved', 'Final Approved'].includes(update.status) ? 'bg-green-50 text-green-700 border-green-200 opacity-80 cursor-not-allowed'
                              : update.status === 'Commented' ? 'bg-sky-50 text-sky-700 border-sky-200 opacity-80 cursor-not-allowed'
                              : update.status === 'As Built' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 opacity-80 cursor-not-allowed'
                              : update.status === 'Re-approval' ? 'bg-amber-50 text-amber-700 border-amber-200 opacity-80 cursor-not-allowed'
                              : 'bg-red-50 text-red-700 border-red-200 opacity-80 cursor-not-allowed')
                            : (['Approved', 'Final Approved'].includes(update.status) ? 'bg-green-50 text-green-700 border-green-200' 
                              : update.status === 'Commented' ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : update.status === 'As Built' ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : update.status === 'Re-approval' ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200')
                        }`}>
                            <SelectValue placeholder="SELECT STATUS" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Approved">Final Approved</SelectItem>
                            <SelectItem value="Rejected">Rejected</SelectItem>
                            <SelectItem value="Commented">Commented</SelectItem>
                            <SelectItem value="Re-approval">Re-approval</SelectItem>
                            <SelectItem value="As Built">As Built</SelectItem>
                        </SelectContent>
                    </Select>
                );
            }
        },
        {
            header: "Client Comments",
            cell: (row) => {
                const update = rowUpdates[row.id] || { remarks: '', submitted: false };
                return (
                    <Input 
                        placeholder="Add Comment"
                        className={`h-8 text-xs border-slate-200 ${
                            update.submitted ? 'bg-slate-100 text-slate-500 opacity-70 cursor-not-allowed' : ''
                        }`}
                        value={update.remarks}
                        disabled={update.submitted}
                        onChange={(e) => updateRowRemarks(row.id, e.target.value)}
                    />
                );
            }
        },
        {
            header: "ATTACHMENT",
            className: "w-[150px]",
            cell: (row) => {
                const update = rowUpdates[row.id] || { file: null, submitted: false, existingFile: null };
                return (
                    <div className="flex items-center gap-2">
                        <input type="file" className="hidden" id={`stamped-${row.id}`} onChange={(e) => updateRowFile(row.id, e.target.files[0])} />
                        <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={update.submitted}
                            className={`h-8 border-slate-200 text-slate-600 ${
                                update.submitted 
                                ? 'bg-slate-100 text-slate-500 opacity-70 cursor-not-allowed'
                                : update.file || update.existingFile ? 'bg-blue-50 border-blue-200' : ''
                            }`}
                            onClick={() => document.getElementById(`stamped-${row.id}`).click()}
                        >
                            <Upload className="h-3.5 w-3.5 mr-2" />
                            <span className="text-[11px] truncate max-w-[80px]">
                                {update.file ? update.file.name : (update.existingFile ? 'Uploaded' : 'Upload')}
                            </span>
                        </Button>
                    </div>
                );
            }
        },
        {
            header: "ACTION",
            className: "w-[240px]",
            cell: (row) => {
                const update = rowUpdates[row.id] || { loading: false, submitted: false, status: '', remarks: '', file: null };
                
                // MANDATORY VALIDATION:
                // Commented: only remarks required, file optional
                // Others: remarks + file required
                const canSubmit = update.status && 
                                  update.remarks?.trim().length > 0 && 
                                  (update.status === 'Commented' || update.file || update.existingFile);

                return (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline"
                                size="sm"
                                className={`h-8 px-4 font-semibold text-[11px] ${
                                    update.submitted 
                                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-50 cursor-default' 
                                    : 'border-slate-200 text-slate-700'
                                }`}
                                disabled={update.loading || update.submitted || !canSubmit}
                                onClick={() => handleSubmitRow(row.id)}
                            >
                                {update.loading ? (
                                    <div className="relative inline-flex items-center justify-center mr-1.5">
                                        <svg className="w-3.5 h-3.5 transform -rotate-90">
                                            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-slate-200" />
                                            <circle 
                                                cx="7" cy="7" r="5" 
                                                stroke="currentColor" strokeWidth="2" fill="transparent" 
                                                strokeDasharray={31.42} strokeDashoffset={typeof uploadProgress[row.id] === 'number' ? 31.42 - (uploadProgress[row.id] / 100) * 31.42 : 0} 
                                                className="text-primary transition-all duration-300 ease-out" strokeLinecap="round" 
                                            />
                                        </svg>
                                    </div>
                                ) : update.submitted ? (
                                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                                ) : (
                                    <Save className="w-3.5 h-3.5 mr-1.5" />
                                )}
                                {update.loading ? (typeof uploadProgress[row.id] === 'number' ? `Submitting... ${uploadProgress[row.id]}%` : 'Submitting...') : update.submitted ? 'Submitted' : 'Submit'}
                            </Button>
                            <div className="flex gap-1.5 ml-2">
                                <Button 
                                    variant="outline" size="sm" className="h-8 w-8 p-0 border-slate-200 text-slate-500"
                                    onClick={() => {
                                        setActivePreviewDoc({
                                            documentName: row.doc_name,
                                            versionNo: row.revision,
                                            mimeType: row.mimeType,
                                            filePath: row.filePath
                                        });
                                        setPreviewUrl(row.previewUrl);
                                        setIsPreviewOpen(true);
                                    }}
                                >
                                    <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button 
                                    variant="outline" size="sm" className="h-8 w-8 p-0 border-slate-200 text-slate-500"
                                    onClick={() => { setActiveDocId(row.group_document_id); setIsTrailOpen(true); }}
                                >
                                    <History className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            }
        }
    ], [rowUpdates, backendUrl]);

    return (
        <>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
            </header>

            <main className="flex-1 overflow-auto p-8 flex flex-col">
                <div className="flex-1 flex flex-col w-full max-w-[1700px] mx-auto">

                    <div className="mb-6 flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                                {view === 'list' ? 'Transmission Approval' : 'Review Transmission'}
                            </h1>
                            <p className="text-muted-foreground mt-1 text-sm font-medium">
                                {view === 'list' 
                                    ? 'Manage and process client approvals for sent document packages.' 
                                    : 'Examine and provide professional feedback on transmitted documents.'}
                            </p>
                        </div>
                        {view === 'review' && (
                            <Button variant="outline" className="h-9 border-slate-200 font-semibold" onClick={() => setView('list')}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                            </Button>
                        )}
                    </div>

                    {view === 'review' && (
                        <Card className="mb-6">
                            <CardHeader className="pb-4 border-b">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-bold">Packet Details</CardTitle>
                                        <CardDescription className="text-xs">Basic information about the selected transmission packet</CardDescription>
                                    </div>
                                    <div className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded border border-slate-200">
                                        TR: {selectedTransmission?.transmission_number}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="space-y-1 pl-6 border-l border-slate-100">
                                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</Label>
                                        <p className="text-sm font-semibold">{selectedTransmission?.customer?.customer_name || '-'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PO Number</Label>
                                        <p className="text-sm font-semibold">{selectedTransmission?.po?.po_number || '-'}</p>
                                    </div>
                                    
                                    <div className="space-y-1 pl-6 border-l border-slate-100">
                                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transmission No</Label>
                                        <p className="text-sm font-semibold">{selectedTransmission?.transmission_number || '-'}</p>
                                    </div>
                                    <div className="space-y-1 pl-6 border-l border-slate-100">
                                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sent Date</Label>
                                        <p className="text-sm font-semibold">{new Date(selectedTransmission?.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex flex-col gap-4">
                        <TransmissionApprovalListTable
                            key={view}
                            columns={view === 'list' ? listColumns : reviewColumns}
                            fetchData={view === 'list' ? fetchTransmissionsWrapper : reviewFetchData}
                            onExport={() => exportApi.exportModule("transmission")}
                            refreshTrigger={refreshTrigger}
                            customers={activeListFilters.customers}
                            pos={activeListFilters.pos}
                        />
                    </div>
                </div>
            </main>

            <Sheet open={isTrailOpen} onOpenChange={setIsTrailOpen}>
                    <SheetContent className="sm:max-w-xl overflow-y-auto border-none shadow-2xl">
                        <SheetHeader className="border-b pb-4 mb-6">
                            <SheetTitle className="flex items-center gap-2.5 text-xl font-bold">
                                <History className="w-5 h-5 text-indigo-600" />
                                Audit Activity History
                            </SheetTitle>
                        </SheetHeader>
                        <DocumentTrail documentId={activeDocId} />
                    </SheetContent>
                </Sheet>

                <DocumentPreviewDialog 
                    isOpen={isPreviewOpen}
                    onOpenChange={setIsPreviewOpen}
                    previewUrl={previewUrl}
                    activePreviewDoc={activePreviewDoc}
                />
        </>
    );
};

// --- Specialized Local Replication of DataTable ---
const TransmissionApprovalListTable = ({
    columns,
    fetchData,
    onExport,
    refreshTrigger,
    customers = [],
    pos = []
}) => {
    const [data, setData] = useState([]);
    const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [columnFilters, setColumnFilters] = useState({});
    const [debouncedColumnFilters, setDebouncedColumnFilters] = useState({});
    const isFirstRender = useRef(true);

    // Sync search
    React.useEffect(() => {
        if (isFirstRender.current) return;
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Sync filters
    React.useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const timer = setTimeout(() => {
            setDebouncedColumnFilters(columnFilters);
            setPage(1);
        }, 800);
        return () => clearTimeout(timer);
    }, [columnFilters]);

    React.useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const result = await fetchData({
                    page,
                    limit: pageSize,
                    search: debouncedSearch,
                    columnFilters: debouncedColumnFilters
                });
                setData(result.data || []);
                setMeta(result.meta || { total: 0, page: 1, totalPages: 1 });
            } catch (error) {
                console.error("Failed to load approval list data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [page, pageSize, debouncedSearch, debouncedColumnFilters, fetchData, refreshTrigger]);

    const resolvePath = (object, path) => {
        if (!path) return undefined;
        return path.split('.').reduce((o, p) => (o ? o[p] : undefined), object);
    };

    // --- Intelligent Cascading Logic ---
    const handleFilterChange = (id, value) => {
        const newFilters = { ...columnFilters };
        if (id === 'customer_name') {
            newFilters.customer_name = value || "";
            newFilters.po_number = ""; // Reset child
        } else if (id === 'po_number') {
            newFilters.po_number = value || "";
            // Reverse Cascading for List View
            if (value) {
                const selectedPo = pos.find(p => p.po_number === value);
                if (selectedPo && selectedPo.customer?.customer_name) {
                    newFilters.customer_name = selectedPo.customer.customer_name;
                }
            }
        } else {
            newFilters[id] = value;
        }
        setColumnFilters(newFilters);
    };

    // --- Dynamic Dropdown Options ---
    const dynamicClientOptions = useMemo(() => {
        return customers.map(c => ({ label: c.customer_name, value: c.customer_name }));
    }, [customers]);

    const dynamicPoOptions = useMemo(() => {
        let filteredPos = [...pos];
        const currentCustomer = columnFilters.customer_name;
        if (currentCustomer) {
            filteredPos = filteredPos.filter(p => p.customer?.customer_name === currentCustomer);
        }
        const uniquePosNames = [...new Set(filteredPos.map(p => p.po_number).filter(Boolean))];
        return uniquePosNames.map(p => ({ label: p, value: p }));
    }, [pos, columnFilters.customer_name]);

    return (
        <div className="space-y-4 w-full">
            <div className="flex items-center justify-between">
                <Input
                    placeholder="Global Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                />
                <Button variant="outline" onClick={onExport} size="sm">
                    <Download className="mr-2 h-4 w-4" /> Export
                </Button>
            </div>

            <div className="rounded-md border bg-card overflow-x-auto shadow-sm">
                <Table className="w-full">
                    <TableHeader>
                        <TableRow>
                            {columns.map((col, idx) => {
                                // Inject options
                                let finalOptions = col.filterOptions;
                                if (col.id === 'customer_name') finalOptions = dynamicClientOptions;
                                if (col.id === 'po_number') finalOptions = dynamicPoOptions;

                                return (
                                    <TableHead key={idx} className={`${col.className} whitespace-nowrap bg-slate-50/50 py-3`}>
                                        <div className="flex flex-col gap-1.5 py-1.5">
                                            <span className="font-bold uppercase text-slate-700 text-[10px] tracking-wider mb-0.5">{col.header}</span>
                                            {col.filterType === 'select' && (
                                                <Select 
                                                    value={columnFilters[col.id || col.accessorKey] || "all"} 
                                                    onValueChange={(val) => handleFilterChange(col.id || col.accessorKey, val === 'all' ? "" : val)}
                                                >
                                                    <SelectTrigger className="h-7 text-xs font-normal w-full min-w-[110px] max-w-[180px]">
                                                        <SelectValue placeholder="All" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All</SelectItem>
                                                        {finalOptions?.map(opt => (
                                                            <SelectItem key={opt.value} value={opt.value}>
                                                                {opt.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                            {col.filterType === 'text' && (
                                                <Input 
                                                    placeholder="Filter.."
                                                    className="h-7 text-xs font-normal w-full max-w-[150px]"
                                                    value={columnFilters[col.id || col.accessorKey] || ""}
                                                    onChange={(e) => setColumnFilters(prev => ({ ...prev, [col.id || col.accessorKey]: e.target.value }))}
                                                />
                                            )}
                                        </div>
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Loading list...</TableCell></TableRow>
                        ) : data.length ? (
                            data.map((row, rIdx) => (
                                <TableRow key={rIdx} className="hover:bg-slate-50/50 transition-colors">
                                    {columns.map((col, cIdx) => (
                                        <TableCell key={cIdx} className={col.className}>
                                            {col.cell ? col.cell(row) : resolvePath(row, col.accessorKey)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No transmissions found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between py-6">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Rows per page</p>
                    <Select value={pageSize.toString()} onValueChange={(val) => {setPageSize(parseInt(val)); setPage(1);}}>
                        <SelectTrigger className="h-8 w-[70px]"><SelectValue placeholder={pageSize} /></SelectTrigger>
                        <SelectContent side="top">
                            {[5,10,20,50,100].map(v => <SelectItem key={v} value={v.toString()}>{v}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground font-medium">
                        Page {meta.page || 1} of {meta.totalPages || 1} ({meta.total || 0} items)
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(prev => prev - 1)} disabled={page <= 1 || loading} className="h-8"><ChevronLeft className="h-4 w-4" />Previous</Button>
                        <Button variant="outline" size="sm" onClick={() => setPage(prev => prev + 1)} disabled={page >= (meta.totalPages || 1) || loading} className="h-8">Next<ChevronRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientApprovalStatus;
