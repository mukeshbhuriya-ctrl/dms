import React, { useState, useMemo, useCallback } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    Package
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
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [statusFilter, setStatusFilter] = useState("all");

    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    // Trail & Preview State
    const [isTrailOpen, setIsTrailOpen] = useState(false);
    const [activeDocId, setActiveDocId] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");
    const [activePreviewDoc, setActivePreviewDoc] = useState(null);

    // Fetch Transmissions for main list
    const fetchTransmissionsWrapper = useCallback(async (params) => {
        try {
            const res = await dccService.getTransmissions({ ...params, status_filter: statusFilter });
            if (res.success) {
                return {
                    data: res.data.data || [],
                    meta: res.data.meta || { total: 0, page: 1, limit: 10, totalPages: 0 }
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

                // Reverted the auto-locking logic for now as requested.
                // All documents will start as editable.
                const initialUpdates = {};
                fullDocs.forEach(td => {
                    initialUpdates[td.id] = { 
                        status: 'Approved', 
                        remarks: '', 
                        file: null, 
                        existingFile: null,
                        loading: false, 
                        submitted: false 
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

        if (update.status === 'Rejected' && !update.remarks?.trim()) {
            toast.error("Please provide remarks for rejection.");
            return;
        }

        setRowUpdates(prev => ({ ...prev, [rowId]: { ...prev[rowId], loading: true } }));

        try {
            const formData = new FormData();
            formData.append('transmission_document_id', rowId);
            formData.append('status', update.status);
            formData.append('remarks', update.remarks || "");
            if (update.file) {
                formData.append('client_file', update.file);
            }

            const res = await dccService.updateTransmissionDocumentClientStatus(formData);
            if (res.success) {
                toast.success("Document review submitted!");
                setRowUpdates(prev => ({ 
                    ...prev, 
                    [rowId]: { ...prev[rowId], loading: false, submitted: true } 
                }));
            } else {
                throw new Error(res.message || "Failed to update");
            }
        } catch (error) {
            console.error("Error submitting row:", error);
            toast.error(error.message || "Submission failed");
            setRowUpdates(prev => ({ ...prev, [rowId]: { ...prev[rowId], loading: false } }));
        }
    };

    // Columns for MAIN LIST
    const listColumns = useMemo(() => [
        { accessorKey: "transmission_number", header: "TRANSMISSION NO" },
        { accessorKey: "po.po_number", header: "PO NUMBER" },
        { accessorKey: "customer.customer_name", header: "CUSTOMER" },
        { header: "DOCS", cell: (row) => <Badge variant="secondary" className="px-2">{row.documents?.length || 0}</Badge> },
        { header: "SENT DATE", cell: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-' },
        {
            header: "STATUS",
            cell: (row) => {
                const colors = {
                    'Approved': 'bg-green-100 text-green-700 font-bold',
                    'Rejected': 'bg-red-100 text-red-700 font-bold',
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
                        <SelectTrigger className={`h-8 text-[11px] font-semibold ${
                            update.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                            <SelectValue placeholder="SELECT STATUS" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Approved">Approve</SelectItem>
                            <SelectItem value="Rejected">Reject</SelectItem>
                            <SelectItem value="Commented">Commented</SelectItem>
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
                        className={`h-8 text-xs border-slate-200 ${update.submitted ? 'bg-slate-50' : ''}`}
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
                            className={`h-8 border-slate-200 text-slate-600 ${update.file || update.existingFile ? 'bg-blue-50 border-blue-200' : ''}`}
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
                
                // MANDATORY VALIDATION: Status selected, Remarks added, and File uploaded
                const canSubmit = update.status && 
                                  update.remarks?.trim().length > 0 && 
                                  (update.file || update.existingFile);

                return (
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
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            ) : update.submitted ? (
                                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                            ) : (
                                <Save className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            {update.submitted ? 'Submitted' : 'Submit'}
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
                        <DataTable
                            key={view}
                            columns={view === 'list' ? listColumns : reviewColumns}
                            fetchData={view === 'list' ? fetchTransmissionsWrapper : reviewFetchData}
                            onExport={() => exportApi.exportModule("transmission")}
                            refreshTrigger={refreshTrigger}
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

export default ClientApprovalStatus;
