import { useState, useCallback, useMemo } from "react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Download, CheckCircle, XCircle, History, Eye, FileText, Plus } from "lucide-react"
import DocumentTrail from "../../components/dms/DocumentTrail"
import { toast } from 'react-toastify';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { dccService } from "../../services/dcc.service";
import { DataTable } from "@/components/shared/DataTable"
import { exportApi } from "@/api/export.api"

function DocumentApprover() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Trail State
  const [isTrailOpen, setIsTrailOpen] = useState(false)
  const [activeDocId, setActiveDocId] = useState(null)

  // Review Dialog State
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedDocForReview, setSelectedDocForReview] = useState(null);
  const [reviewStatus, setReviewStatus] = useState(''); // 'Approved' or 'Rejected'
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [approverStatusFilter, setApproverStatusFilter] = useState("all");

  // Preview State
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [activePreviewDoc, setActivePreviewDoc] = useState(null)

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const handleReviewClick = (doc, status) => {
    setSelectedDocForReview(doc);
    setReviewStatus(status);
    setReviewRemarks('');
    setReviewDialogOpen(true);
  };

  const submitReview = async () => {
    if (!selectedDocForReview) return;

    if (reviewStatus === 'Rejected' && !reviewRemarks.trim()) {
      toast.error("Remarks are required for rejection.");
      return;
    }

    setIsReviewing(true);
    console.log("Submitting review for:", selectedDocForReview);
    try {
      // API call to review document
      const result = await dccService.reviewDocument({
        document_id: selectedDocForReview.id,
        status: reviewStatus,
        remarks: reviewRemarks
      });

      if (result.success || result.data) {
        toast.success(`Document ${reviewStatus} successfully`);
        setReviewDialogOpen(false);
        setRefreshTrigger(prev => prev + 1); // Refresh table
      } else {
        toast.error(result.message || "Failed to submit review");
      }
    } catch (error) {
      console.error("Review error:", error);
      toast.error(error.message || "Failed to submit review");
    } finally {
      setIsReviewing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Approved":
        return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Approved</span>
      case "Rejected":
        return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Rejected</span>
      case "Uploaded":
      case "Pending":
      case "Pending for Approval":
        return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">Pending for Approval</span>
      default:
        return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">{status}</span>
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
      accessorKey: "shreno_doc_no",
      header: "Shreno Doc No",
      cell: (row) => row.shreno_doc_no || "-",
    },
    {
      accessorKey: "client_doc_no",
      header: "Client Doc No",
      cell: (row) => row.client_doc_no || "-",
    },
    {
      header: "Document Name",
      accessorKey: "documentName"
    },
    {
      header: "Revision",
      accessorKey: "versionNo",
      cell: (row) => (
        <span className={row.versionNo !== null && row.versionNo !== undefined ? "font-semibold text-blue-600" : "text-muted-foreground"}>
          {row.versionNo !== null && row.versionNo !== undefined ? `${row.versionNo}` : '-'}
        </span>
      ),
      className: "w-[80px]"
    },
    {
      header: "Uploaded By",
      accessorKey: "uploadedBy"
    },
    {
      header: "Actual Due Days",
      accessorKey: "actual_due_days",
      cell: (row) => row.actual_due_days || "-"
    },
    {
      id: "status",
      header: "Status",
      filterType: "select",
      filterOptions: [
        { label: "Awaiting Upload", value: "awaiting_upload" },
        { label: "Pending for Approval", value: "pending_approval" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
      ],
      cell: (row) => {
        const docStatus = row.originalDoc?.status || row.status;
        if (docStatus === 'Response Due') {
          return (
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
              Response Overdue
            </span>
          );
        }
        const isUploaderPending = docStatus === 'Pending' || docStatus === 'Upload Due';
        let text = isUploaderPending ? "Awaiting Upload" : "Pending for Approval";
        let colorClass = isUploaderPending ? "bg-gray-100 text-gray-800" : "bg-orange-100 text-orange-800 border border-orange-200";

        if (docStatus === 'Approved') {
          text = "Approved";
          colorClass = "bg-green-100 text-green-800";
        } else if (docStatus === 'Rejected') {
          text = "Rejected";
          colorClass = "bg-red-100 text-red-800";
        }

        return (
          <span className={`whitespace-nowrap px-2 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
            {text}
          </span>
        );
      },
    },
    {
      header: "Client Status",
      accessorKey: "client_status_display",
      cell: (row) => {
        const docStatus = row.originalDoc?.status || row.status;
        let text = "Awaiting for Approval"; // Default to awaiting for approval
        let colorClass = "bg-gray-100 text-gray-800";

        if (docStatus === 'Pending' || docStatus === 'Upload Due') {
          text = "Awaiting to upload";
          colorClass = "bg-gray-100 text-gray-800";
        } else if (docStatus === 'Approved') {
          if (row.client_status === 'Approved') {
            text = "Approved";
            colorClass = "bg-green-100 text-green-800";
          } else if (row.client_status === 'Rejected') {
            text = "Rejected";
            colorClass = "bg-red-100 text-red-800";
          } else {
            text = "Pending for Client";
            colorClass = "bg-yellow-100 text-yellow-800";
          }
        }

        return (
          <span className={`whitespace-nowrap px-2 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
            {text}
          </span>
        );
      },
    },
    {
      header: "Action",
      accessorKey: "id",
      cell: (row) => (
        <div className="flex gap-2">

          <Button
            variant="outline"
            size="sm"
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
            disabled={!row.fileUrl}
            className="flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4" /> Preview
          </Button>

          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleReviewClick(row.originalDoc, 'Approved')}
            disabled={(row.originalDoc?.status || row.status) !== 'Pending for Approval'}
          >
            <CheckCircle className="w-4 h-4 mr-1" /> Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleReviewClick(row.originalDoc, 'Rejected')}
            disabled={(row.originalDoc?.status || row.status) !== 'Pending for Approval'}
          >
            <XCircle className="w-4 h-4 mr-1" /> Reject
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
            <History className="h-4 w-4 mr-1" />
            Trail
          </Button>
        </div>
      ),
      className: "w-[250px]"
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
  ], []);

  const fetchDocuments = useCallback(async ({ page, limit, search, columnFilters }) => {
    try {
      const params = {
        page,
        limit,
        status_filter: statusFilter
      };
      if (search) params.search = search;

      // Map column-based filters to API params
      if (columnFilters) {
        if (columnFilters.customer_name) params.customer_name_filter = columnFilters.customer_name;
        if (columnFilters.po_number) params.po_number_filter = columnFilters.po_number;
        if (columnFilters.job_number) params.job_number_filter = columnFilters.job_number;
        if (columnFilters.status) params.approver_status_filter = columnFilters.status;
      }

      const response = await dccService.getDocumentsForApproval(params);

      if (response.data) {
        const mappedData = response.data.map((doc, index) => {
          const latestVersion = doc.versions && doc.versions.length > 0 ? doc.versions[0] : null;
          const assignedUser = doc.user;
          const uploaderName = assignedUser
            ? assignedUser.name
            : 'N/A';



          return {
            id: doc.id,
            s_no: (page - 1) * limit + index + 1,
            documentNumber: doc.document.document_number,
            documentName: doc.document.document_name,
            documentType: doc.document.document_type?.name || 'N/A',
            uploadedBy: uploaderName,
            uploadedDate: new Date(doc.updatedAt).toLocaleDateString(),

            status: latestVersion?.status || doc.status, // Use version status for accuracy in consolidated view
            statusDisplay: doc.status,
            client_status: doc.client_status,
            shreno_doc_no: doc.shreno_doc_no || '-',
            client_doc_no: doc.client_doc_no || '-',
            actual_due_days: doc.actual_due_days,
            versionNo: doc.display_version_no || 0,
            fileUrl: latestVersion?.file_url,
            // Preview support fields
            mimeType: latestVersion?.mime_type,
            filePath: latestVersion?.file_path,
            previewUrl: latestVersion?.id
              ? `${backendUrl}/api/dcc/document-preview/${latestVersion.id}/${encodeURIComponent(latestVersion.file_path?.split('/').pop() || latestVersion.file_path?.split('\\').pop() || 'file')}`
              : null,
            customer: doc.customer,
            po: doc.po,
            group: doc.group,
            remarks: latestVersion?.remarks || '-',
            originalDoc: doc
          };
        });

        return {
          data: mappedData,
          meta: response.meta
        };
      }
      return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    } catch (error) {
      console.error("Error fetching documents:", error);
      return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    }
  }, [statusFilter, approverStatusFilter]);

  // Wrap fetchDocuments to include refreshTrigger
  const fetchDocumentsWrapper = useCallback((params) => {
    return fetchDocuments(params);
  }, [fetchDocuments, refreshTrigger]);

  const handleExport = async () => {
    try {
      await exportApi.exportModule('group_document', 'Approve documents export.xlsx')
    } catch (error) {

      console.error("Export failed:", error)
    }
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
      <main className="flex-1 overflow-auto p-6 flex flex-col">
        <div className="flex-1 flex flex-col w-full">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Document Approver</h1>
            <p className="text-muted-foreground">View and approve documents uploaded by users.</p>
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
                    <SelectItem value="awaiting_upload">Awaiting Upload</SelectItem>
                    <SelectItem value="pending_approval">Pending for Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
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
      </main>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="rounded-[33px]">
          <DialogHeader>
            <DialogTitle>{reviewStatus} Document</DialogTitle>
            <DialogDescription>
              {selectedDocForReview && `${selectedDocForReview.document.document_number} - ${selectedDocForReview.document.document_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="remarks">Remarks {reviewStatus === 'Rejected' && <span className="text-destructive">*</span>}</Label>
              <Input
                id="remarks"
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder="Enter remarks..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={submitReview}
              disabled={isReviewing || (reviewStatus === 'Rejected' && !reviewRemarks.trim())}
              variant={reviewStatus === 'Rejected' ? "destructive" : "default"}
            >
              Confirm {reviewStatus}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trail Sidebar Drawer */}
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

      {/* Document Preview Dialog */}
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
                    e.target.src = "";
                    e.target.onerror = null;
                    toast.error("Failed to load image preview");
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-dashed rounded-lg">
                  <div className="bg-slate-100 p-4 rounded-full mb-4">
                    <FileText className="h-12 w-12 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">
                    Preview not available for this file type.
                  </p>
                  <Button
                    variant="link"
                    className="mt-2 text-primary"
                    onClick={() => window.open(previewUrl, '_blank')}
                  >
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
    </>
  )
}

export default DocumentApprover
