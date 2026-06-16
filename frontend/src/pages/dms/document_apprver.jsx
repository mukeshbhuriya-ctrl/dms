import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { dccService } from "../../services/dcc.service"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import DocumentTrail from "../../components/dms/DocumentTrail"
import { DocumentPreviewDialog } from "@/components/shared/DocumentPreviewDialog"
import { FileListPreviewDialog } from "../../components/shared/FileListPreviewDialog"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Search, ArrowRight, Plus, ArrowLeft, Edit, Copy, History, ChevronLeft, ChevronRight, Download, X, ChevronDown, Check, CheckCircle, XCircle, Eye, FileText } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { exportApi } from "@/api/export.api"
import ProDataTable from "../../components/shared/ProDataTable"

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
  const [columnFilters, setColumnFilters] = useState({});

  // Master Data for Cascading Filters
  const [customers, setCustomers] = useState([]);
  const [allPos, setAllPos] = useState([]);
  const [allJobs, setAllJobs] = useState([]);

  useEffect(() => {
    fetchMasterData();
  }, []);

  // Fetch results from table data as a fallback to ensure filters are never empty
  const [data, setData] = useState([]); // This will be synced from the table's internal state via a callback if needed, but for now we'll use a safer approach

  const fetchMasterData = async () => {
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

  // cascading filter options
  const clientFilterOptions = useMemo(() => {
    const list = customers.length > 0 ? customers : [];
    return list.map(c => ({ 
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
    return uniqueJobsLabels.map(j => ({ label: j.toString(), value: j.toString() }));
  }, [allJobs, columnFilters.po_number, columnFilters.customer_name]);

  // Preview State
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [activePreviewDoc, setActivePreviewDoc] = useState(null)
  const [isFileListOpen, setIsFileListOpen] = useState(false)
  const [activeFileList, setActiveFileList] = useState([])
  const [activeFileListDocName, setActiveFileListDocName] = useState("")

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
      id: "documentNumber",
      header: "System Doc ID",
      accessorKey: "documentNumber"
    },
        {
      id: "shreno_doc_no",
      accessorKey: "shreno_doc_no",
      header: "Shreno Doc No",
      filterType: "text",
      cell: (row) => row.shreno_doc_no || "-",
    },
    {
      id: "client_doc_no",
      accessorKey: "client_doc_no",
      header: "Client Doc No",
      filterType: "text",
      cell: (row) => row.client_doc_no || "-",
    },
        {
      id: "documentName",
      header: "Document Name",
      accessorKey: "documentName",
      filterType: "text",
    },
    {
      header: "Revision",
      accessorKey: "versionNo",
      cell: (row) => (
        <span className={row.versionNo !== null && row.versionNo !== undefined ? "font-semibold text-blue-600" : "text-muted-foreground"}>
          {row.versionNo !== null && row.versionNo !== undefined ? `${row.versionNo}` : '-'}
        </span>
      ),
    },
    {
      header: "Uploaded By",
      accessorKey: "uploadedBy"
    },
    {
      id: "plant_submission_date",
      accessorKey: "upload_due_days",
      header: "Planned Submission Date",
      cell: (row) => {
        const upload_due_days = row.originalDoc?.upload_due_days;
        const latestVersion = row.originalDoc?.versions && row.originalDoc.versions.length > 0 ? row.originalDoc.versions[0] : null;
        const createdAt = latestVersion ? latestVersion.createdAt : row.originalDoc?.createdAt;
        if (!upload_due_days) return "-";
        const created = new Date(createdAt);
        const deadline = new Date(created.getTime() + (upload_due_days * 24 * 60 * 60 * 1000));
        return deadline.toLocaleDateString("en-GB", { day: '2-digit', month: 'long', year: 'numeric' });
      },
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
      id: "actions",
      header: "Action",
      accessorKey: "id",
      cell: (row) => (
        <div className="flex gap-2">

          <Button
            variant="outline"
            size="sm"
            className="border-slate-200 text-slate-600 cursor-pointer"
            onClick={() => {
              if (row.files && row.files.length > 0) {
                setActiveFileList(row.files);
                setActiveFileListDocName(`${row.documentNumber} - ${row.documentName}`);
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
            disabled={!(row.files?.length > 0 || row.previewUrl) || row.originalDoc?.status === 'Pending' || row.originalDoc?.status === 'Upload Due'}
          >
            <Eye className="w-4 h-4 mr-2" /> Preview
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
  ], [clientFilterOptions, poFilterOptions, jobFilterOptions, reviewDialogOpen, isPreviewOpen]); // Memo dependencies
  
  const proTableTopFilters = useMemo(() => [
    {
      value: statusFilter,
      onChange: setStatusFilter,
      placeholder: "All Status",
      options: [
        { label: "All Status", value: "all" },
        { label: "Awaiting Upload", value: "awaiting_upload" },
        { label: "Pending for Approval", value: "pending_approval" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
      ]
    }
  ], [statusFilter, setStatusFilter]);

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
        if (columnFilters.documentName) params.search = columnFilters.documentName;
        if (columnFilters.shreno_doc_no) params.shreno_doc_no_filter = columnFilters.shreno_doc_no;
        if (columnFilters.client_doc_no) params.client_doc_no_filter = columnFilters.client_doc_no;
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
            versionNo: doc.display_version_no || 0,
            fileUrl: latestVersion?.file_url,
            // Preview support fields
            files: latestVersion?.files || [],
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
  }, [statusFilter]);

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
         // If we are MANUALLY changing customer (not as part of a reverse auto-select), reset children.
         const newCust = Array.isArray(newFilters.customer_name) ? newFilters.customer_name : [newFilters.customer_name];
         if (newCust.length === 1 && newCust[0]) {
            // Check current PO
            const currentPo = Array.isArray(updated.po_number) ? updated.po_number[0] : updated.po_number;
            const poObj = allPos.find(p => (p.po_number || p.number || "").toString() === (currentPo || "").toString());
            if (poObj && (poObj.customer?.customer_name || poObj.customer_name || "").toString() !== newCust[0].toString()) {
                delete updated.po_number;
                delete updated.job_number;
            }
         }
      } else if (newFilters.hasOwnProperty('po_number')) {
        // Handle PO change
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

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-bold tracking-tight text-slate-900">Document Approver</h1>
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-hidden p-6 flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col w-full overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
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
      </main>

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

    </div>
  )
}

export default DocumentApprover
