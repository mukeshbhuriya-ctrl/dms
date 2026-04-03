import { useState, useCallback, useMemo } from "react"
import { UserSidebar } from "@/components"
import { SidebarTrigger } from "@/components/ui/sidebar"
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
import { Upload, Loader2, History, Eye, FileText, Plus } from "lucide-react"
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
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog"
import DocumentTrail from "../../components/dms/DocumentTrail"

function UploadDocument() {
    const [uploadingIds, setUploadingIds] = useState({})
    const [statusFilter, setStatusFilter] = useState("all")
    const [approverStatusFilter, setApproverStatusFilter] = useState("all")
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    const [isTrailOpen, setIsTrailOpen] = useState(false)
    const [activeDocId, setActiveDocId] = useState(null)

    const [previewUrl, setPreviewUrl] = useState(null)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [activePreviewDoc, setActivePreviewDoc] = useState(null)

    const backendUrl = import.meta.env.VITE_BACKEND_URL

    const handleDirectUpload = async (documentId, file) => {
        if (!file) return

        setUploadingIds(prev => ({ ...prev, [documentId]: true }))

        try {
            const formData = new FormData()
            formData.append('document_id', documentId)
            formData.append('file', file)

            const result = await dccService.uploadDocumentVersion(formData)

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
        }
    }

    const columns = useMemo(() => [
        {
            header: "System Doc ID",
            accessorKey: "documentNumber"
        },
        {
            id: "customer_name",
            header: "Client",
            accessorKey: "customer.customer_name",
            filterType: "text",
            cell: (row) => row.customer?.customer_name || "-",
        },
        {
            id: "po_number",
            header: "PO",
            accessorKey: "po.po_number",
            filterType: "text",
            cell: (row) => row.po?.po_number || "-",
        },
        {
            id: "job_number",
            header: "Job Number",
            filterType: "text",
            cell: (row) => row.group?.job_group?.[0]?.job?.job_number || "-",
        },

        {
            header: "Document Name",
            accessorKey: "documentName",
            filterType: "text",
        },
        {
            header: "Revision",
            accessorKey: "versionNo",
            cell: (row) => (
                <span className={row.versionNo ? "font-semibold text-blue-600" : "text-muted-foreground"}>
                    {row.versionNo ? `${row.versionNo}` : '-'}
                </span>
            ),
            className: "w-[80px]"
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
            header: "Actual Due Days",
            accessorKey: "actual_due_days",
            cell: (row) => row.actual_due_days || "-"
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
            header: "Action",
            accessorKey: "id",
            cell: (row) => {
                const isUploading = uploadingIds[row.id]
                const isDisabled = row.approverStatus === "approved" || row.approverStatus === "pending for approval"

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
                            {isUploading ? 'Uploading...' : 'Upload'}
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
                            disabled={!row.previewUrl}
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
                )
            },
            className: "w-[150px]"
        }
    ], [uploadingIds, backendUrl])

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
                        documentName: doc.document.document_name,
                        documentNumber: doc.document.document_number,
                        jobNo: doc.group?.job_group?.map(jg => jg.job?.job_number).join(', ') || doc.job?.job_number || 'N/A',
                        status: displayStatus,
                        approverStatus: approverStatus,
                        client_status: doc.client_status,
                        createdAt: doc.createdAt,
                        upload_due_days: doc.upload_due_days,
                        response_due_days: doc.response_due_days,
                        actual_due_days: doc.actual_due_days,
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
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold mb-2">Upload Document</h1>
                        <p className="text-muted-foreground">
                            View and upload documents assigned to you.
                        </p>
                    </div>

                    <div className="flex flex-col gap-4">
                        {/* Right-aligned Status Filter */}
                        <div className="flex justify-end mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-500 whitespace-nowrap">Filter by Status:</span>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="pending">Pending for Approval</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                        <SelectItem value="NA">Awaiting Upload</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DataTable
                            columns={columns}
                            fetchData={fetchDocumentsWrapper}
                            onExport={handleExport}
                        />
                    </div>
                </div>

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

                <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                    <DialogContent className="sm:max-w-6xl w-[98vw] h-[95vh] p-0 overflow-hidden border-none shadow-2xl">
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center relative">
                            {previewUrl ? (
                                (
                                    activePreviewDoc?.mimeType === 'application/pdf' ||
                                    activePreviewDoc?.filePath?.toLowerCase().endsWith('.pdf') ||
                                    previewUrl.toLowerCase().includes('pdf')
                                ) ? (
                                    <iframe
                                        src={`${previewUrl}#toolbar=0`}
                                        className="w-full h-full border-0"
                                        title="PDF Preview"
                                    />
                                ) : (
                                    activePreviewDoc?.mimeType?.startsWith('image/') ||
                                    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(activePreviewDoc?.filePath || '') ||
                                    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(previewUrl)
                                ) ? (
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="max-w-full max-h-full object-contain"
                                        onError={(e) => {
                                            e.target.src = ""
                                            e.target.onerror = null
                                            toast.error("Failed to load image preview")
                                        }}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-dashed rounded-lg">
                                        <div className="bg-slate-100 p-4 rounded-full mb-4">
                                            <FileText className="h-12 w-12 text-slate-400" />
                                        </div>
                                        <p className="text-slate-500 font-medium">Preview not available for this file type.</p>
                                        <Button variant="link" className="mt-2 text-primary" onClick={() => window.open(previewUrl, '_blank')}>
                                            Open in New Tab
                                        </Button>
                                    </div>
                                )
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground opacity-40">
                                    <Plus className="h-10 w-10 rotate-45" />
                                    <p>No preview available</p>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </main>
        </>
    )
}

export default UploadDocument
