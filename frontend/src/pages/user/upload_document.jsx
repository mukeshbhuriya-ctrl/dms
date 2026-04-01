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
            header: "Revision/Version No",
            accessorKey: "versionNo",
            cell: (row) => (
                <span className={row.versionNo ? "font-semibold text-blue-600" : "text-muted-foreground"}>
                    {row.versionNo ? `Rev ${row.versionNo}` : '-'}
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
            header: "Actual Due Days",
            accessorKey: "actual_due_days",
            cell: (row) => row.actual_due_days || "-"
        },
        {
            header: "Assigner Status",
            accessorKey: "assigner_status",
            cell: () => (
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                    Assigned
                </span>
            )
        },
        {
            header: "Uploader Status",
            accessorKey: "uploader_status",
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
            accessorKey: "approver_status",
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
            header: "Client Status",
            accessorKey: "client_status_display",
            cell: (row) => {
                const status = row.originalStatus || row.status
                let text = "Awaiting Internal Approval"
                let colorClass = "bg-gray-100 text-gray-800"
                
                if (status === 'Approved') {
                    if (row.client_status === 'Approved') {
                        text = "Approved"
                        colorClass = "bg-green-100 text-green-800"
                    } else if (row.client_status === 'Rejected') {
                        text = "Rejected"
                        colorClass = "bg-red-100 text-red-800"
                    } else {
                        text = "Pending for Client"
                        colorClass = "bg-yellow-100 text-yellow-800"
                    }
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
    ], [uploadingIds, backendUrl])

    const fetchDocuments = useCallback(async ({ page, limit, search }) => {
        try {
            const response = await dccService.getMyAssignedDocuments({
                page,
                limit,
                search,
                status_filter: statusFilter,
                approver_status_filter: approverStatusFilter
            })

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
                        remarks: latestVersion?.remarks || '-'
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
    }, [statusFilter, approverStatusFilter, backendUrl])

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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="statusFilter">Filter by Uploader Status</Label>
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="All Uploader Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Uploader Status</SelectItem>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="done">Uploaded</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="approverStatusFilter">Filter by Approver Status</Label>
                                        <Select value={approverStatusFilter} onValueChange={setApproverStatusFilter}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="All Approver Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Approver Status</SelectItem>
                                                <SelectItem value="NA">Awaiting Upload</SelectItem>
                                                <SelectItem value="pending">Pending for Approval</SelectItem>
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
            </SidebarInset>
        </SidebarProvider>
    )
}

export default UploadDocument
