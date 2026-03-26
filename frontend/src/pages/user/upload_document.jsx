
import { useState, useCallback, useMemo } from "react"
import { UserSidebar } from "@/components"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Loader2, History } from "lucide-react"
import { dccService } from "../../services/dcc.service"
import { toast } from "react-toastify"
import { DataTable } from "@/components/shared/DataTable"
import { exportApi } from "@/api/export.api"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import DocumentTrail from "../../components/dms/DocumentTrail"

function UploadDocument() {
    const [uploadingIds, setUploadingIds] = useState({}) // Track uploading state per document ID
    const [statusFilter, setStatusFilter] = useState("all")
    const [approverStatusFilter, setApproverStatusFilter] = useState("all")

    // Trigger for refreshing table data
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Trail State
    const [isTrailOpen, setIsTrailOpen] = useState(false)
    const [activeDocId, setActiveDocId] = useState(null)

    const handleDirectUpload = async (documentId, file) => {
        if (!file) return;

        setUploadingIds(prev => ({ ...prev, [documentId]: true }));

        try {
            const formData = new FormData();
            formData.append('document_id', documentId);
            formData.append('file', file);

            const result = await dccService.uploadDocumentVersion(formData);

            if (result.success || result.data) {
                toast.success("Document uploaded successfully");
                // Refresh list to update status
                setRefreshTrigger(prev => prev + 1);
            } else {
                toast.error(result.message || "Failed to upload document");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("An error occurred while uploading");
        } finally {
            setUploadingIds(prev => ({ ...prev, [documentId]: false }));
        }
    };

    // Columns configuration for DataTable
    const columns = useMemo(() => [
        {
            header: "S.No",
            accessorKey: "s_no",
            cell: (row) => row.s_no,
            className: "w-[50px]"
        },
        {
            header: "Document Name",
            accessorKey: "documentName",
            cell: (row) => (
                <div>
                    {row.documentName} <span className="text-xs text-muted-foreground">({row.documentNumber})</span>
                </div>
            )
        },
        {
            header: "Version No",
            accessorKey: "versionNo",
            cell: (row) => (
                <span className={row.versionNo ? "font-semibold text-blue-600" : "text-muted-foreground"}>
                    {row.versionNo ? `v${row.versionNo}` : '-'}
                </span>
            ),
            className: "w-[80px]"
        },
        {
            header: "Job No",
            accessorKey: "jobNo"
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
            header: "Status",
            accessorKey: "status",
            cell: (row) => getStatusBadge(row.status)
        },
        {
            header: "Approver Status",
            accessorKey: "approverStatus",
            cell: (row) => getApproverStatusBadge(row.approverStatus)
        },
        {
            header: "Action",
            accessorKey: "id",
            cell: (row) => {
                const isUploading = uploadingIds[row.id];
                // Disable if already approved or pending approval (currently being reviewed)
                const isDisabled = row.approverStatus === "approved" || row.approverStatus === "pending for approval";

                return (
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
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Upload className="h-4 w-4 mr-2" />
                            )}
                            {isUploading ? 'Uploading...' : (row.approverStatus === "rejected" ? 'Upload' : 'Upload')}
                        </Label>
                        
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
                );
            },
            className: "w-[150px]"
        },
        {
            header: "Remarks",
            accessorKey: "remarks",
            cell: (row) => (
                <div className="max-w-[200px] truncate" title={row.remarks || '-'}>
                    {row.remarks || '-'}
                </div>
            )
        }
    ], [uploadingIds]) // Re-render columns when uploading state changes

    const fetchDocuments = useCallback(async ({ page, limit, search }) => {
        try {
            // Fetch logic with client-side filtering support to match previous implementation
            // Passing limit 1000 if filters are active is a simple strategy to ensure we get enough data to filter client-side if backend doesn't support derived fields.
            // However, let's try to be efficiently greedy only if needed.
            // Strategy: Fetch ALL (1000) if filters are active, then client filter and paginate.
            // If no filters, use standard pagination.

            const response = await dccService.getMyAssignedDocuments({
                page,
                limit,
                search,
                status_filter: statusFilter,
                approver_status_filter: approverStatusFilter
            })

            if (response.data) {
                const mappedDocs = response.data.map((doc, index) => {
                    let status = 'pending';
                    if (doc.status === 'Approved' || doc.status === 'Uploaded' || doc.status === 'Pending for Approval') {
                        status = 'done';
                    }
                    if (doc.status === 'Rejected') status = 'pending';

                    const latestVersion = doc.versions && doc.versions.length > 0 ? doc.versions[0] : null;

                    let approverStatus = 'NA';
                    if (doc.status === 'Uploaded' || doc.status === 'Pending for Approval') approverStatus = 'pending for approval';
                    else if (doc.status === 'Approved') approverStatus = 'approved';
                    else if (doc.status === 'Rejected' || (doc.status === 'Pending' && latestVersion?.status === 'Rejected')) approverStatus = 'rejected';
                    
                    // Business Logic: If backend says "Upload Due" or "Response Due", use that for the main status display
                    const displayStatus = (doc.status === 'Upload Due' || doc.status === 'Response Due') ? doc.status : status;

                    return {
                        id: doc.id,
                        s_no: (page - 1) * limit + index + 1,
                        documentName: doc.document.document_name,
                        documentNumber: doc.document.document_number,
                        jobNo: doc.group?.job_group?.map(jg => jg.job?.job_number).join(', ') || doc.job?.job_number || 'N/A',
                        status: displayStatus,
                        approverStatus: approverStatus,
                        createdAt: doc.createdAt,
                        upload_due_days: doc.upload_due_days,
                        response_due_days: doc.response_due_days,
                        versionNo: doc.display_version_no || 0,
                        originalStatus: doc.status,
                        doc: doc,
                        remarks: latestVersion?.remarks || '-'
                    }
                });

                return {
                    data: mappedDocs,
                    meta: response.meta
                }
            }
        } catch (error) {
            console.error("Error fetching documents:", error)
            return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }
        }
    }, [statusFilter, approverStatusFilter]) // Re-create fetchDocuments when filters change

    const getStatusBadge = (status) => {
        if (status === "done") {
            return (
                <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                    Done
                </span>
            )
        }
        if (status === "Upload Due") {
            return (
                <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                    Upload Due
                </span>
            )
        }
        if (status === "Response Due") {
            return (
                <span className="inline-flex items-center rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-600 dark:text-orange-400">
                    Response Due
                </span>
            )
        }
        return (
            <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                Pending
            </span>
        )
    }

    const getApproverStatusBadge = (approverStatus) => {
        switch (approverStatus) {
            case "approved":
                return (
                    <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                        Approved
                    </span>
                )
            case "rejected":
                return (
                    <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                        Rejected
                    </span>
                )
            case "pending for approval":
                return (
                    <span className="inline-flex items-center rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-600 dark:text-orange-400">
                        Pending for Approval
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center rounded-full bg-gray-500/10 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                        NA
                    </span>
                )
        }
    }

    // Wrap fetchDocuments to include refreshTrigger
    const fetchDocumentsWrapper = useCallback((params) => {
        return fetchDocuments(params);
    }, [fetchDocuments, refreshTrigger]);

    const handleExport = async () => {
        try {
            await exportApi.exportModule("group_document")
        } catch (error) {
            console.error("Export failed:", error)
        }
    };

    return (
        <SidebarProvider>
            <UserSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                </header>
                <main className="flex-1 overflow-auto p-6 flex flex-col">
                    <div className="flex-1 flex flex-col w-full">
                        <div className="mb-6">
                            <h1 className="text-3xl font-bold mb-2">Upload Document</h1>
                            <p className="text-muted-foreground">
                                View and upload documents assigned to you.
                            </p>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Documents</CardTitle>
                                <CardDescription>
                                    Click the upload button to upload documents for each job
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* Filters */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="statusFilter">Filter by Status</Label>
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="All Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Status</SelectItem>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="done">Done</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="approverStatusFilter">
                                            Filter by Approver Status
                                        </Label>
                                        <Select
                                            value={approverStatusFilter}
                                            onValueChange={setApproverStatusFilter}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="All Approver Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Approver Status</SelectItem>
                                                <SelectItem value="NA">NA</SelectItem>
                                                <SelectItem value="pending">
                                                    Pending for Approval
                                                </SelectItem>
                                                <SelectItem value="rejected">Rejected</SelectItem>
                                                <SelectItem value="approved">Approved</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="rounded-md border p-2">
                                    <DataTable
                                        columns={columns}
                                        fetchData={fetchDocumentsWrapper}
                                        onExport={handleExport}
                                    />
                                </div>

                            </CardContent>
                        </Card>
                    </div>

                    {/* Trail Sidebar Drawer */}
                    <Sheet open={isTrailOpen} onOpenChange={setIsTrailOpen}>
                        <SheetContent side="right" className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl flex flex-col">
                            <SheetHeader className="p-6 pb-2 border-b">
                                <SheetTitle className="flex items-center gap-2">
                                    <History className="w-5 h-5 text-primary" />
                                    Document Audit Trail
                                </SheetTitle>
                            </SheetHeader>
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                <DocumentTrail documentId={activeDocId} />
                            </div>
                        </SheetContent>
                    </Sheet>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}

export default UploadDocument

