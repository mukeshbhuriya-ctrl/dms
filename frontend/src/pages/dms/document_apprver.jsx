import { useState, useCallback, useMemo } from "react"
import { AdminSidebar } from "@/components"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Download, CheckCircle, XCircle } from "lucide-react"
import { toast } from 'react-toastify';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { dccService } from "../../services/dcc.service";
import { DataTable } from "@/components/shared/DataTable"
import { exportApi } from "@/api/export.api"

function DocumentApprover() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Review Dialog State
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedDocForReview, setSelectedDocForReview] = useState(null);
  const [reviewStatus, setReviewStatus] = useState(''); // 'Approved' or 'Rejected'
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [approverStatusFilter, setApproverStatusFilter] = useState("all");

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
      header: "S.No",
      accessorKey: "s_no",
      cell: (row) => row.s_no,
      className: "w-[50px]"
    },
    {
      header: "Document Code",
      accessorKey: "documentNumber"
    },
    {
      header: "Document Name",
      accessorKey: "documentName"
    },
    {
      header: "Document Type",
      accessorKey: "documentType"
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
      header: "Uploaded By",
      accessorKey: "uploadedBy"
    },
    {
      header: "Uploaded Date",
      accessorKey: "uploadedDate"
    },
    {
      header: "Status",
      accessorKey: "statusDisplay",
      cell: (row) => getStatusBadge(row.status)
    },
    {
      header: "Action",
      accessorKey: "id",
      cell: (row) => (
        <div className="flex gap-2">

          <Button variant="outline" size="sm" onClick={() => window.open(row.fileUrl, '_blank')} disabled={!row.fileUrl}>
            <Download className="w-4 h-4 mr-1" /> Download
          </Button>

          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleReviewClick(row.originalDoc, 'Approved')}
            disabled={row.status === 'Approved' || row.status === 'Rejected'}
          >
            <CheckCircle className="w-4 h-4 mr-1" /> Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleReviewClick(row.originalDoc, 'Rejected')}
            disabled={row.status === 'Rejected' || row.status === 'Approved'}
          >
            <XCircle className="w-4 h-4 mr-1" /> Reject
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

  const fetchDocuments = useCallback(async ({ page, limit, search }) => {
    try {
      const response = await dccService.getDocumentsForApproval({
        page,
        limit,
        search,
        status_filter: statusFilter,
        approver_status_filter: approverStatusFilter
      });

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

            status: doc.status, // Keep original status for badge display
            statusDisplay: doc.status,
            versionNo: doc.display_version_no || 0,
            fileUrl: latestVersion?.file_url,
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
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-auto p-6 flex flex-col">
          <div className="flex-1 flex flex-col w-full">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Document Approver</h1>
              <p className="text-muted-foreground">View and approve documents uploaded by users.</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>
                  Approve or Reject uploaded documents.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border p-2">
                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 px-2">
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

                  <DataTable
                    columns={columns}
                    fetchData={fetchDocumentsWrapper}
                    onExport={handleExport}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>

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
    </SidebarProvider>
  )
}

export default DocumentApprover
