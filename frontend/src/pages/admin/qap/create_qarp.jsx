import { PageContainer } from "@/components/layout/PageContainer";
import { useState, useMemo, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"
import { toast } from "react-toastify"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Trash2, Type, ArrowLeft, Eye, Edit, Download, Archive, PlusCircle, Copy, UploadCloud, FileText, CheckCircle, XCircle } from "lucide-react"
import ProDataTable from "@/components/shared/ProDataTable"
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/context/AuthContext"
import { SearchableSelect } from "@/components/shared/SearchableSelect"

// ─── List View ───────────────────────────────────────────────────────────────
function ListView({ onCreateClick, onEditClick, onViewClick, onCloneClick }) {

  const handleDownloadPdf = async (id) => {
    try {
      const filename = `QAP_${id}.pdf`;
      await exportApi.download(
        `/api/qap/download-pdf/${id}`,
        filename,
        {},
        { contentType: 'application/pdf' }
      );
    } catch (err) {
      console.error(err)
      toast.error(err.message || "Failed to download PDF")
    }
  }

  const handleViewClick = (id) => {
    onViewClick(id)
  }

  const [refreshTrigger, setRefreshTrigger] = useState(0)
  // Cascading Filters State
  const [activeFilters, setActiveFilters] = useState({ records: [] });
  const [columnFilters, setColumnFilters] = useState({ is_active: ['true'] });
  const { roles } = useAuth();
  const isAdmin = roles?.includes("ADMIN");

  const [confirmData, setConfirmData] = useState({ isOpen: false, title: "", description: "", confirmText: "", variant: "danger", onConfirm: null, isLoading: false });

  const fetchActiveFilters = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/qap/get-filters");
      if (res.success) setActiveFilters(res.data);
    } catch (err) {
      console.error("Error fetching active filters:", err);
    }
  }, []);

  useEffect(() => {
    fetchActiveFilters();
  }, [fetchActiveFilters, refreshTrigger]);

  // Auto-selection logic for reverse cascading
  useEffect(() => {
    if (!activeFilters.records || activeFilters.records.length === 0) return;

    const updates = {};
    if (columnFilters.msn && Array.isArray(columnFilters.msn) && columnFilters.msn.length === 1) {
      const selectedMsn = columnFilters.msn[0];
      const match = activeFilters.records.find(r => r.msn?.toString() === selectedMsn?.toString());
      if (match) {
        if (!columnFilters.client || columnFilters.client.length === 0) updates.client = [match.client];
        if (!columnFilters.po_no || columnFilters.po_no.length === 0) updates.po_no = [match.po_no];
      }
    }
    else if (columnFilters.po_no && Array.isArray(columnFilters.po_no) && columnFilters.po_no.length === 1) {
      const selectedPo = columnFilters.po_no[0];
      const match = activeFilters.records.find(r => r.po_no?.toString() === selectedPo?.toString());
      if (match && (!columnFilters.client || columnFilters.client.length === 0)) {
        updates.client = [match.client];
      }
    }

    if (Object.keys(updates).length > 0) {
      setColumnFilters(prev => ({ ...prev, ...updates }));
    }
  }, [columnFilters.msn, columnFilters.po_no, activeFilters.records]);

  // Cascading Filter Logic
  const activeClientOptions = useMemo(() => {
    let filtered = activeFilters.records || [];
    if (columnFilters.po_no) {
      const selected = Array.isArray(columnFilters.po_no) ? columnFilters.po_no : [columnFilters.po_no.toString()];
      filtered = filtered.filter(c => selected.includes(c.po_no?.toString()));
    }
    if (columnFilters.msn) {
      const selected = Array.isArray(columnFilters.msn) ? columnFilters.msn : [columnFilters.msn.toString()];
      filtered = filtered.filter(c => selected.includes(c.msn?.toString()));
    }
    const clients = [...new Set(filtered.map(c => c.client))].filter(Boolean).sort();
    return clients.map(c => ({ label: c, value: c }));
  }, [activeFilters.records, columnFilters.po_no, columnFilters.msn]);

  const activePoOptions = useMemo(() => {
    let filtered = activeFilters.records || [];
    if (columnFilters.client) {
      const selected = Array.isArray(columnFilters.client) ? columnFilters.client : [columnFilters.client.toString()];
      filtered = filtered.filter(c => selected.includes(c.client?.toString()));
    }
    if (columnFilters.msn) {
      const selected = Array.isArray(columnFilters.msn) ? columnFilters.msn : [columnFilters.msn.toString()];
      filtered = filtered.filter(c => selected.includes(c.msn?.toString()));
    }
    const pos = [...new Set(filtered.map(c => c.po_no))].filter(Boolean).sort();
    return pos.map(p => ({ label: p, value: p }));
  }, [activeFilters.records, columnFilters.client, columnFilters.msn]);

  const activeMsnOptions = useMemo(() => {
    let filtered = activeFilters.records || [];
    if (columnFilters.client) {
      const selected = Array.isArray(columnFilters.client) ? columnFilters.client : [columnFilters.client.toString()];
      filtered = filtered.filter(c => selected.includes(c.client?.toString()));
    }
    if (columnFilters.po_no) {
      const selected = Array.isArray(columnFilters.po_no) ? columnFilters.po_no : [columnFilters.po_no.toString()];
      filtered = filtered.filter(c => selected.includes(c.po_no?.toString()));
    }
    const msns = [...new Set(filtered.map(c => c.msn))].filter(Boolean).sort();
    return msns.map(m => ({ label: m, value: m }));
  }, [activeFilters.records, columnFilters.client, columnFilters.po_no]);

  const handleToggleStatus = async (row) => {
    setConfirmData({
      isOpen: true,
      title: `${row.is_active ? 'Deactivate' : 'Activate'} QAP Record`,
      description: `Are you sure you want to ${row.is_active ? 'deactivate' : 'activate'} QAP for report ${row.report_no}?`,
      confirmText: row.is_active ? 'Deactivate' : 'Activate',
      variant: 'warning',
      onConfirm: async () => {
        try {
          setConfirmData(prev => ({ ...prev, isLoading: true }))
          const res = await apiClient.patch(`/api/qap/toggle-status/${row.id}`)
          if (res.success) {
            toast.success(res.message)
            setRefreshTrigger(prev => prev + 1)
          }
        } catch (error) {
          toast.error(error.message || "Failed to toggle status")
        } finally {
          setConfirmData(prev => ({ ...prev, isOpen: false, isLoading: false }))
        }
      }
    })
  }

  const handleArchive = async (row) => {
    setConfirmData({
      isOpen: true,
      title: 'Archive QAP Record',
      description: `Are you sure you want to archive QAP for report ${row.report_no}? This action is irreversible.`,
      confirmText: 'Archive',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setConfirmData(prev => ({ ...prev, isLoading: true }))
          const res = await apiClient.delete(`/api/qap/archive/${row.id}`)
          if (res.success) {
            toast.success(res.message)
            setRefreshTrigger(prev => prev + 1)
          }
        } catch (error) {
          toast.error(error.message || "Failed to archive record")
        } finally {
          setConfirmData(prev => ({ ...prev, isOpen: false, isLoading: false }))
        }
      }
    })
  }

  const activeIsActiveOptions = [
    { label: "Active", value: "true" },
    { label: "Inactive", value: "false" }
  ];

  const columns = useMemo(() => [
    { header: "Report No.", accessorKey: "report_no" },
    { 
      header: "Type", 
      accessorKey: "qap_type",
      cell: (row) => row.qap_type === 'CLIENT_APPROVED' ? 'Client QAP' : 'Internal QAP'
    },
    {
      header: "Client",
      accessorKey: "client",
      filterType: "select",
      isMulti: true,
      filterOptions: activeClientOptions
    },
    {
      header: "PO No.",
      accessorKey: "po_no",
      filterType: "select",
      isMulti: true,
      filterOptions: activePoOptions
    },
    {
      header: "Job Number",
      accessorKey: "msn",
      filterType: "select",
      isMulti: true,
      filterOptions: activeMsnOptions
    },
    { header: "Equipment", accessorKey: "equipment_name" },
    {
      header: "Created",
      accessorKey: "createdAt",
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row) => (
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${row.status === 'uploaded'
          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
          : "bg-amber-100 text-amber-700 border border-amber-200"
          }`}>
          {row.status || 'draft'}
        </span>
      )
    },
    {
      header: "Active",
      accessorKey: "is_active",
      filterType: "select",
      isMulti: true,
      filterOptions: activeIsActiveOptions,
      cell: (row) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${row.is_active ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
          {row.is_active ? "Active" : "Inactive"}
        </span>
      )
    },
    {
      id: "actions",
      header: "Actions",
      width: "60px",
      cell: (row) => {
        const actions = [];
        
        actions.push({
            label: "View",
            icon: Eye,
            onClick: () => handleViewClick(row.id)
        });
        
        actions.push({
            label: "Edit",
            icon: Edit,
            onClick: () => onEditClick(row.id)
        });
        
        if (row.qap_type !== 'CLIENT_APPROVED') {
            actions.push({
                label: "Clone",
                icon: Copy,
                onClick: () => onCloneClick(row.id)
            });
            actions.push({ type: "separator" });
            actions.push({
                label: "Download PDF",
                icon: Download,
                onClick: () => handleDownloadPdf(row.id)
            });
        }
        
        if (isAdmin) {
            actions.push({ type: "separator" });
            actions.push({
                label: row.is_active ? "Deactivate" : "Activate",
                icon: row.is_active ? XCircle : CheckCircle,
                onClick: () => handleToggleStatus(row),
                className: row.is_active ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            });
            actions.push({
                label: "Archive",
                icon: Archive,
                onClick: () => handleArchive(row),
                className: "text-red-600 hover:text-red-700 hover:bg-red-50"
            });
        }
        
        return (
          <div className="flex items-center justify-center">
            <DataTableRowActions actions={actions} />
          </div>
        );
      },
    },
  ], [onEditClick, activeClientOptions, activePoOptions, activeMsnOptions, isAdmin])

  const fetchData = useCallback(async (params) => {
    const queryParams = { ...params };
    if (queryParams.columnFilters) {
      queryParams.columnFilters = JSON.stringify(queryParams.columnFilters);
    }
    const res = await apiClient.get(`/api/qap/list`, queryParams)
    return { data: res.data, meta: res.meta }
  }, [])

  const handleExport = async () => {
    try {
      await exportApi.exportQAP();
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("QAP Export failed:", error);
    }
  };

  return (
    <div>

      <ProDataTable
        columns={columns}
        fetchData={fetchData}
        onExport={handleExport}
        onAdd={onCreateClick}
        columnFilters={columnFilters}
        onFilterChange={(newFilters) => setColumnFilters(prev => ({ ...prev, ...newFilters }))}
        refreshKey={refreshTrigger}
        globalSearchPlaceholder="Search report no, job, client..."
      />

      <ConfirmDialog
        isOpen={confirmData.isOpen}
        onClose={() => setConfirmData(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmData.onConfirm}
        title={confirmData.title}
        description={confirmData.description}
        confirmText={confirmData.confirmText}
        variant={confirmData.variant}
        isLoading={confirmData.isLoading}
      />
    </div>
  )
}

// ─── Create / Edit View ──────────────────────────────────────────────────────
function CreateView({ onBack, onSuccess, editId = null, cloneId = null, isReadOnly = false }) {
  // Get today's date
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  // Header section - Dropdowns
  const [msnIds, setMsnIds] = useState([])
  const [msnOptions, setMsnOptions] = useState([])
  const [jobsLoading, setJobsLoading] = useState(true)

  const filteredMsnOptions = useMemo(() => {
    if (!msnIds || msnIds.length === 0) return msnOptions;

    const firstSelectedJob = msnOptions.find(job => job.id === msnIds[0]);
    if (!firstSelectedJob) return msnOptions;

    return msnOptions.filter(job =>
      job.customer_id === firstSelectedJob.customer_id &&
      job.po_id === firstSelectedJob.po_id
    );
  }, [msnOptions, msnIds]);

  const [client, setClient] = useState("")
  const [poNo, setPoNo] = useState("")
  const [poDate, setPoDate] = useState("")

  // User input fields
  const [formData, setFormData] = useState({
    qapType: "INTERNAL",
    documentNo: "",
    drgNo: "",
    customerDrgNo: "",
    equipmentDescription: "",
    tagNo: "",
    code: "",
    projectId: "",
    remarks: "",
  })

  const [files, setFiles] = useState([])
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState([])
  const [selectedPreviewFile, setSelectedPreviewFile] = useState(null)
  
  // Removed buggy cleanup that revoked URLs prematurely

  const qapTypeOptions = [
    { label: "Internal QAP", value: "INTERNAL" },
    { label: "Client QAP", value: "CLIENT_APPROVED" }
  ];

  // Dynamic Headings from Master Table
  const [headingOptions, setHeadingOptions] = useState([])
  const [inlineQuickAddId, setInlineQuickAddId] = useState(null)
  const [quickAddValue, setQuickAddValue] = useState("")
  const [isQuickAdding, setIsQuickAdding] = useState(false)
  const [targetRowId, setTargetRowId] = useState(null)

  const fetchMasterHeadings = useCallback(() => {
    return apiClient.get("/api/qap/get-filters")
      .then((res) => {
        if (res.success && res.data?.masterHeadings) {
          const options = res.data.masterHeadings.map(h => ({
            label: h,
            value: h
          }))
          setHeadingOptions(options)
          return options
        }
        return []
      })
      .catch((err) => {
        console.error("Failed to fetch headings:", err)
        return []
      })
  }, [])

  // Fetch Jobs and Headings on Mount
  useEffect(() => {
    // Fetch MSNs
    apiClient.get("/api/common/jobs")
      .then((res) => setMsnOptions(res.data || []))
      .catch((err) => {
        console.error("Failed to fetch jobs:", err)
        toast.error("Failed to load MSNs")
      })
      .finally(() => setJobsLoading(false))

    fetchMasterHeadings()
  }, [fetchMasterHeadings])

  const handleQuickAdd = (searchValue, rowId) => {
    setQuickAddValue(searchValue || "")
    setTargetRowId(rowId)
    setInlineQuickAddId(rowId)
  }

  const cancelInlineAdd = () => {
    setInlineQuickAddId(null)
    setQuickAddValue("")
  }

  const submitQuickAdd = async (e) => {
    if (e) e.preventDefault()
    if (!quickAddValue.trim()) {
      toast.error("Heading name is required")
      return
    }

    try {
      setIsQuickAdding(true)
      const res = await apiClient.post("/api/qap/master-headings/create", {
        name: quickAddValue.trim(),
        is_active: true
      })

      if (res.success) {
        toast.success("New heading added to master")
        // Refresh master list
        await fetchMasterHeadings()

        // Auto-select the newly created heading for the target row
        if (targetRowId) {
          handleRowChange(targetRowId, "headingText", quickAddValue.trim())
        }

        setInlineQuickAddId(null)
        setQuickAddValue("")
      }
    } catch (error) {
      toast.error(error.message || "Failed to add heading")
    } finally {
      setIsQuickAdding(false)
    }
  }

  // Submit states
  const [submitting, setSubmitting] = useState(false)

  // Dynamic Columns
  const [dynamicColumns, setDynamicColumns] = useState([])

  // Table rows
  const [tableRows, setTableRows] = useState([
    {
      id: 1,
      activity: "Pre-Inspection Meeting",
      typeMethodCheck: "----",
      extent: "",
      acceptanceCriteria: "----",
      referenceDocuments: "",
      verifyingDocument: "MOM",
      shreno: "H",
      clientTpia: "O+P",
      remark: "",
      isHeading: false,
      isRoot: true,
      headingText: "",
      parentHeaderId: null,
      dynamicValues: {}
    },
    {
      id: 2,
      activity: "QAP",
      typeMethodCheck: "--",
      extent: "",
      acceptanceCriteria: "Drawings, QCM Para. 10.2",
      referenceDocuments: "",
      verifyingDocument: "QAP",
      shreno: "H",
      clientTpia: "H",
      remark: "",
      isHeading: false,
      isRoot: true,
      headingText: "",
      parentHeaderId: null,
      dynamicValues: {}
    },
    {
      id: 3,
      activity: "Design Calculation",
      typeMethodCheck: "Design Documents",
      extent: "",
      acceptanceCriteria: "ASME Sec VIII Div. 1",
      referenceDocuments: "",
      verifyingDocument: "Design Calculation",
      shreno: "R",
      clientTpia: "H",
      remark: "",
      isHeading: false,
      isRoot: true,
      headingText: "",
      parentHeaderId: null,
      dynamicValues: {}
    },
    {
      id: 4,
      activity: "Drawing",
      typeMethodCheck: "Relevant Drawings",
      extent: "",
      acceptanceCriteria: "Design Calculation, QCM Para. 8.12",
      referenceDocuments: "",
      verifyingDocument: "Drawings",
      shreno: "R",
      clientTpia: "H",
      remark: "",
      isHeading: false,
      isRoot: true,
      headingText: "",
      parentHeaderId: null,
      dynamicValues: {}
    },
  ])

  // If editId or cloneId is present and jobs loaded, fetch QAP data to compose edit form
  useEffect(() => {
    const targetId = editId || cloneId;
    if (targetId && msnOptions.length > 0) {
      apiClient.get(`/api/qap/${targetId}`)
        .then(res => {
          if (res.success && res.data) {
            const data = res.data;
            setMsnIds(cloneId ? [] : (data.job_id ? [data.job_id] : []))
            setClient(cloneId ? "" : (data.client || ""))
            setPoNo(cloneId ? "" : (data.po_no || ""))
            setPoDate(cloneId ? "" : (data.po_date || ""))

            setFormData({
              qapType: data.qap_type || "INTERNAL",
              documentNo: cloneId ? "" : (data.report_no || ""),
              drgNo: cloneId ? "" : (data.shreno_drg_no || ""),
              customerDrgNo: cloneId ? "" : (data.customer_drg_no || ""),
              equipmentDescription: cloneId ? "" : (data.equipment_name || ""),
              tagNo: cloneId ? "" : (data.tag_no || ""),
              code: cloneId ? "" : (data.code || ""),
              projectId: cloneId ? "" : (data.project_id || ""),
              remarks: cloneId ? "" : (data.remarks || "")
            })

            if (!cloneId && data.attachments) {
              setFiles(data.attachments);
            }

            // Dynamic columns map
            if (data.dynamic_columns && data.dynamic_columns.length > 0) {
              setDynamicColumns(data.dynamic_columns.map(c => ({
                ...c,
                isEditing: false
              })))
            } else {
              setDynamicColumns([])
            }

            // Sync Table Rows
            if (data.items && data.items.length > 0) {
              setTableRows(data.items.sort((a, b) => a.sort_order - b.sort_order).map((item, idx) => ({
                id: cloneId ? (Date.now() + Math.random() + idx) : (item.id || idx + 1),
                activity: item.activity || "",
                typeMethodCheck: item.type_method_check || "",
                extent: item.extent || "",
                acceptanceCriteria: item.acceptance_criteria || "",
                referenceDocuments: item.reference_documents || "",
                verifyingDocument: item.verifying_document || "",
                shreno: item.shreno || "",
                clientTpia: item.client_tpia || "",
                remark: item.remark || "",
                isHeading: item.is_heading || false,
                isRoot: item.is_root || false,
                headingText: item.heading_text || "",
                parentHeaderId: cloneId ? null : (item.parent_header_id || null),
                dynamicValues: item.dynamic_values || {}
              })))
            }
          }
        })
        .catch(err => {
          console.error(err)
          toast.error(`Failed to load existing record for ${cloneId ? 'cloning' : 'editing'}`)
        })
    }
  }, [editId, cloneId, msnOptions])


  // Calculate serial numbers
  const getSerialNumbers = () => {
    let mainCounter = 0
    let subCounter = 0
    const result = []

    tableRows.forEach((row) => {
      if (row.activity === "Pre-Inspection Meeting") {
        result.push({
          ...row,
          serialNo: "---",
          subSerialNo: null,
        })
      } else if (row.isHeading || row.isRoot) {
        mainCounter++
        subCounter = 0
        result.push({
          ...row,
          serialNo: mainCounter.toString(),
          subSerialNo: null,
        })
      } else {
        if (mainCounter > 0) {
          subCounter++
          result.push({
            ...row,
            serialNo: mainCounter.toString(),
            subSerialNo: `${mainCounter}.${subCounter}`,
          })
        } else {
          result.push({
            ...row,
            serialNo: null,
            subSerialNo: null,
          })
        }
      }
    })

    return result
  }

  // Handle MSN change to populate equipment, tag and code and set document no
  const handleMsnChange = async (jobIds) => {
    setMsnIds(jobIds)

    if (!jobIds || jobIds.length === 0) {
      setFormData((prev) => ({
        ...prev,
        documentNo: "",
        equipmentDescription: "",
        tagNo: "",
        projectId: "",
      }))
      setClient("")
      setPoNo("")
      setPoDate("")
      return;
    }

    const jobId = jobIds[0];

    // Skip auto-fetch overrides if we're dealing with an existing doc we're strictly editing
    if (!editId) {
      let nextReportNo = ""
      try {
        const res = await apiClient.get(`/api/qap/next-report-no/${jobId}`)
        if (res.success && res.data?.next_report_no) {
          nextReportNo = res.data.next_report_no
        }
      } catch (err) {
        console.error("Failed to fetch next report number:", err)
      }

      try {
        const jobRes = await apiClient.get(`/api/common/jobs/${jobId}`)
        if (jobRes.success && jobRes.data) {
          const job = jobRes.data
          setClient(job.customer?.customer_name || "")
          setPoNo(job.po?.po_number || "")
          // Handle ISO PO Date parsing for visual field
          let pd = ""
          if (job.po?.po_date) {
            pd = new Date(job.po.po_date).toLocaleDateString("en-GB")
          }
          setPoDate(pd)

          setFormData((prev) => ({
            ...prev,
            documentNo: nextReportNo,
            projectId: job.project_id || "",
            equipmentDescription: job.equipement_name || "",
            tagNo: job.tag_number || "",
          }))
        }
      } catch (error) {
        console.error("Failed to load job details:", error)
        setFormData((prev) => ({
          ...prev,
          documentNo: nextReportNo,
          equipmentDescription: "",
          tagNo: "",
          projectId: "",
        }))
        setClient("")
        setPoNo("")
        setPoDate("")
      }
    } else {
      // Allowed edgecase: User changes MSN while editing, we override client/po data to match new job
      try {
        const jobRes = await apiClient.get(`/api/common/jobs/${jobId}`)
        if (jobRes.success && jobRes.data) {
          const job = jobRes.data
          setClient(job.customer?.customer_name || "")
          setPoNo(job.po?.po_number || "")
          let pd = ""
          if (job.po?.po_date) {
            pd = new Date(job.po.po_date).toLocaleDateString("en-GB")
          }
          setPoDate(pd)
          setFormData((prev) => ({
            ...prev,
            projectId: job.project_id || "",
            equipmentDescription: job.equipement_name || "",
            tagNo: job.tag_number || "",
            code: job.code || "",
          }))
        }
      } catch (e) { console.error(e) }
    }
  }


  const rowsWithSerialNumbers = useMemo(() => getSerialNumbers(), [tableRows])

  // Handle input field changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Handle table row changes
  const handleRowChange = (id, field, value) => {
    setTableRows(
      tableRows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    )
  }

  const handleAddColumn = () => {
    const newColId = `col_${Date.now()}`
    const newCol = { id: newColId, name: `Column ${dynamicColumns.length + 1}`, isEditing: true }
    setDynamicColumns([...dynamicColumns, newCol])
  }

  const handleColumnNameChange = (id, newName) => {
    setDynamicColumns(dynamicColumns.map(col => col.id === id ? { ...col, name: newName } : col))
  }

  const toggleColumnEdit = (id) => {
    setDynamicColumns(dynamicColumns.map(col => col.id === id ? { ...col, isEditing: !col.isEditing } : col))
  }

  const removeColumn = (id) => {
    setDynamicColumns(dynamicColumns.filter(col => col.id !== id))
  }

  const handleDynamicColumnChange = (rowId, colId, value) => {
    setTableRows(tableRows.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          dynamicValues: {
            ...(row.dynamicValues || {}),
            [colId]: value
          }
        }
      }
      return row
    }))
  }

  // Unified add row function
  const addRow = (afterId = null) => {
    // Prevent event object from being treated as an ID
    const actualAfterId = (afterId && typeof afterId !== 'object') ? afterId : null

    const newId = Date.now() + Math.random()
    const newRow = {
      id: newId,
      activity: "",
      typeMethodCheck: "",
      extent: "",
      acceptanceCriteria: "",
      referenceDocuments: "",
      verifyingDocument: "",
      shreno: "H",
      clientTpia: "",
      remark: "",
      isHeading: !actualAfterId, // If no ID provided, it's a new heading section
      isRoot: true,
      headingText: "",
      parentHeaderId: null,
      dynamicValues: {},
    }

    if (!actualAfterId) {
      // Add as new heading at the end
      setTableRows([...tableRows, newRow])
      return
    }

    const index = tableRows.findIndex(r => r.id === actualAfterId)
    if (index !== -1) {
      const target = tableRows[index]

      // New row created via inline '+' is an activity, not a heading
      newRow.isHeading = false
      // Inherit context
      newRow.shreno = target.shreno || "H"
      // If adding after a root row (and not a heading), the new row is also a root row
      newRow.isRoot = target.isRoot && !target.isHeading
      // If adding after a heading, the new row is its child. If after a child, same parent.
      newRow.parentHeaderId = target.isHeading ? target.id : target.parentHeaderId

      const newRows = [...tableRows]
      newRows.splice(index + 1, 0, newRow)
      setTableRows(newRows)
    }
  }

  // New function to specifically add a heading between sections
  const addHeadingRow = (headingId) => {
    const actualHeadingId = (headingId && typeof headingId !== 'object') ? headingId : null
    if (!actualHeadingId) return;

    const headingIndex = tableRows.findIndex(r => r.id === actualHeadingId)
    if (headingIndex === -1) return;

    // Find the insertion point: after all child activities of this heading
    // We move forward until we hit another heading or the end of the list
    let lastSectionIndex = headingIndex;
    for (let i = headingIndex + 1; i < tableRows.length; i++) {
      if (tableRows[i].isHeading) {
        break;
      }
      lastSectionIndex = i;
    }

    const newId = Date.now() + Math.random()
    const newRow = {
      id: newId,
      activity: "",
      typeMethodCheck: "",
      extent: "",
      acceptanceCriteria: "",
      referenceDocuments: "",
      verifyingDocument: "",
      shreno: "H",
      clientTpia: "",
      remark: "",
      isHeading: true,
      isRoot: true,
      headingText: "",
      parentHeaderId: null,
      dynamicValues: {},
    }

    const newRows = [...tableRows]
    newRows.splice(lastSectionIndex + 1, 0, newRow)
    setTableRows(newRows)
  }

  // Toggle row to heading
  const toggleHeading = (id) => {
    setTableRows(
      tableRows.map((row) =>
        row.id === id
          ? {
            ...row,
            isHeading: !row.isHeading,
            isRoot: !row.isHeading,
            headingText: row.isHeading ? "" : row.headingText,
            parentHeaderId: null,
          }
          : row
      )
    )
  }

  // Remove row
  const removeRow = (id) => {
    if (tableRows.length > 1) {
      setTableRows(tableRows.filter((row) => row.id !== id))
    }
  }

  const handleSubmit = async (status = "uploaded") => {
    if (!msnIds || msnIds.length === 0) {
      toast.error("Please select an MSN / Job")
      return
    }

    const isClientApproved = formData.qapType === 'CLIENT_APPROVED';

    if (isClientApproved && files.length === 0) {
      toast.error("Please upload the Client Approved QAP PDF");
      return;
    }

    const payload = new FormData();
    payload.append('qap_type', formData.qapType);
    payload.append('job_ids', JSON.stringify(msnIds));
    payload.append('msns', JSON.stringify(msnIds.map(id => msnOptions.find(o => o.id === id)?.job_number || "")));
    payload.append('client', client);
    payload.append('po_no', poNo);
    payload.append('po_date', poDate);
    payload.append('project_id', formData.projectId);
    payload.append('equipment_name', formData.equipmentDescription);
    payload.append('tag_no', formData.tagNo);
    payload.append('code', formData.code);
    payload.append('shreno_drg_no', formData.drgNo);
    payload.append('customer_drg_no', formData.customerDrgNo);
    payload.append('remarks', formData.remarks);
    if (formData.documentNo) {
      payload.append('report_no', formData.documentNo);
    }
    payload.append('status', status);

    payload.append('dynamic_columns', JSON.stringify(dynamicColumns));
    payload.append('items', JSON.stringify(isClientApproved ? [] : rowsWithSerialNumbers.map(r => ({
      is_heading: typeof r.isHeading === 'boolean' ? r.isHeading : false,
      is_root: typeof r.isRoot === 'boolean' ? r.isRoot : false,
      heading_text: r.headingText,
      parent_header_id: r.parentHeaderId ? r.parentHeaderId.toString() : null,
      activity: r.activity,
      type_method_check: r.typeMethodCheck,
      extent: r.extent,
      acceptance_criteria: r.acceptanceCriteria,
      reference_documents: r.referenceDocuments,
      verifying_document: r.verifyingDocument,
      shreno: r.shreno,
      client_tpia: r.clientTpia,
      remark: r.remark,
      dynamic_values: r.dynamicValues || {}
    }))));
    files.forEach(f => {
      if (f instanceof File) {
        payload.append('attachments', f);
      }
    });

    if (deletedAttachmentIds.length > 0) {
      payload.append('deleted_attachment_ids', JSON.stringify(deletedAttachmentIds));
    }

    try {
      setSubmitting(true)
      let res;
      if (editId) {
        res = await apiClient.put(`/api/qap/update/${editId}`, payload)
      } else {
        res = await apiClient.post("/api/qap/create", payload)
      }

      if (res.success) {
        toast.success(editId ? "Quality Assurance Plan updated successfully!" : "Quality Assurance Plan created successfully!")
        onSuccess()
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message || "Failed to save Quality Assurance Plan")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full space-y-6 pb-6">
      <div className="flex justify-end mb-2">
        <Button variant="outline" onClick={onBack} className="h-9 cursor-pointer">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      </div>
      {/* First Section - Dropdowns */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qapType">QAP Type <span className="text-destructive">*</span></Label>
              <SearchableSelect
                options={qapTypeOptions}
                value={formData.qapType || "INTERNAL"}
                onValueChange={(val) => setFormData(prev => ({ ...prev, qapType: val || "INTERNAL" }))}
                placeholder="Select Type"
                disabled={isReadOnly}
                multi={false}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="msn">MSN Number <span className="text-destructive">*</span></Label>
              <SearchableSelect
                options={filteredMsnOptions.map(m => ({ label: m.job_number, value: m.id }))}
                value={msnIds}
                onValueChange={handleMsnChange}
                placeholder={jobsLoading ? "Loading..." : "Select MSN"}
                searchPlaceholder="Search MSN..."
                disabled={jobsLoading || isReadOnly}
                multi={true}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">Client <span className="text-destructive">*</span></Label>
              <Input
                id="client"
                type="text"
                value={client}
                readOnly
                className="bg-muted"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentNo">Document No. <span className="text-destructive">*</span></Label>
              <Input
                id="documentNo"
                name="documentNo"
                type="text"
                value={formData.documentNo}
                placeholder="Auto-generated"
                readOnly
                className="bg-muted"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment">Equipment Name <span className="text-destructive">*</span></Label>
              <Input
                id="equipment"
                type="text"
                value={formData.equipmentDescription}
                readOnly
                className="bg-muted"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagNo">Tag No. <span className="text-destructive">*</span></Label>
              <Input
                id="tagNo"
                type="text"
                value={formData.tagNo}
                readOnly
                className="bg-muted"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="poNo">P.O. No. <span className="text-destructive">*</span></Label>
              <Input
                id="poNo"
                type="text"
                value={poNo}
                onChange={(e) => setPoNo(e.target.value)}
                placeholder="Enter P.O. No."
                required
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="poDate">P.O. Date <span className="text-destructive">*</span></Label>
              <Input
                id="poDate"
                type="text"
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
                placeholder="Enter P.O. Date"
                required
                readOnly={isReadOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Second Section - User Input Fields */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Document Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="drgNo">SHRENO DRG No. <span className="text-destructive">*</span></Label>
              <Input
                id="drgNo"
                name="drgNo"
                type="text"
                value={formData.drgNo}
                onChange={handleInputChange}
                placeholder="Enter SHRENO DRG No."
                required
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerDrgNo">Customer DRG No. <span className="text-destructive">*</span></Label>
              <Input
                id="customerDrgNo"
                name="customerDrgNo"
                type="text"
                value={formData.customerDrgNo}
                onChange={handleInputChange}
                placeholder="Enter Customer DRG No"
                required
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">CODE OF CONSTRUCTION <span className="text-destructive">*</span></Label>
              <Input
                id="code"
                name="code"
                type="text"
                value={formData.code}
                onChange={handleInputChange}
                placeholder="Enter Code of Construction"
                required
                readOnly={isReadOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Third Section - Table / Attachments */}
      {formData.qapType === 'CLIENT_APPROVED' ? (
        <Card className="w-full overflow-hidden mb-6">
          <CardHeader>
            <CardTitle>Client QAP Attachments</CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex flex-col gap-4 w-full">
            <div className="flex flex-col gap-4">
              <Label>Upload PDF <span className="text-destructive">*</span></Label>
              {!isReadOnly && (
                <div className="flex justify-center items-center w-full">
                  <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50/50 hover:bg-slate-100/50 hover:border-primary/50 transition-all">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-10 h-10 mb-4 text-slate-400" />
                      <p className="mb-2 text-sm text-slate-600"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</p>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">PDF documents only</p>
                    </div>
                    <Input 
                      id="dropzone-file"
                      type="file" 
                      accept="application/pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const newFiles = Array.from(e.target.files).map(f => {
                            f.previewUrl = URL.createObjectURL(f);
                            return f;
                          });
                          setFiles(prev => [...prev, ...newFiles]);
                        }
                      }} 
                    />
                  </label>
                </div>
              )}

              {files.length > 0 && (
                <div className="flex flex-col gap-2 mt-4">
                  <Label>Attached QAP</Label>
                  <div className="flex flex-col gap-3 w-full">
                    {files.map((file, idx) => (
                      <div key={idx} className="flex flex-col border rounded-lg overflow-hidden bg-slate-50 transition-all duration-300">
                        {/* Header Row */}
                        <div 
                          className={`flex items-center justify-between p-3 hover:bg-slate-100 transition-colors cursor-pointer ${selectedPreviewFile === file ? 'bg-primary/5 border-b' : ''}`}
                          onClick={() => {
                              if (selectedPreviewFile === file) {
                                  setSelectedPreviewFile(null);
                              } else {
                                  setSelectedPreviewFile(file);
                              }
                          }}
                        >
                          <div className="flex items-center gap-3 overflow-hidden flex-1">
                            <FileText className="h-5 w-5 text-blue-500 shrink-0" />
                            <span className="text-sm font-medium truncate">
                              {file instanceof File ? file.name : (file.file_name || "Attachment")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedPreviewFile === file ? (
                              <span className="text-xs text-primary font-medium mr-2">Close Preview</span>
                            ) : (
                              <span className="text-xs text-slate-500 font-medium mr-2">Click to Preview</span>
                            )}
                            {!isReadOnly && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0 z-10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!(file instanceof File) && file.id) {
                                        setDeletedAttachmentIds(prev => [...prev, file.id]);
                                    }
                                    setFiles(prev => prev.filter((_, i) => i !== idx));
                                    if (selectedPreviewFile === file) setSelectedPreviewFile(null);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Collapsible Preview Body */}
                        {selectedPreviewFile === file && (
                          <div className="w-full h-[600px] animate-in slide-in-from-top-2 fade-in duration-300">
                            <iframe 
                              src={file instanceof File ? file.previewUrl : file.url} 
                              className="w-full h-full border-0 bg-white"
                              title="QAP Preview"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
      <Card className="w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Quality Assurance Plan Details</CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex flex-col gap-4 w-full">
          <div className="rounded-md border overflow-y-auto max-h-[500px]">
            <Table className="min-w-[1800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="p-2 text-xs font-bold uppercase w-[80px]">
                    Sr. No.
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    Activity
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    Type / Method of Check /<br />Extent
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    Acceptance Criteria /<br />Reference Documents
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    Verifying Document
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    Shreno
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase min-w-[120px]">
                    Client /<br />TPIA
                  </TableHead>
                  {dynamicColumns.map(col => (
                    <TableHead key={col.id} className="p-2 text-xs font-bold uppercase min-w-[150px] bg-slate-50/50 border-x border-border/50">
                      <div className="flex items-center gap-2">
                        {col.isEditing ? (
                          <div className="flex-1 flex items-center gap-1">
                            <Input
                              value={col.name}
                              onChange={(e) => handleColumnNameChange(col.id, e.target.value)}
                              onBlur={() => col.name.trim() ? toggleColumnEdit(col.id) : removeColumn(col.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') toggleColumnEdit(col.id);
                                if (e.key === 'Escape') removeColumn(col.id);
                              }}
                              autoFocus
                              placeholder="Col Name"
                              className="h-7 text-[10px] font-bold p-1 border-slate-300 focus:ring-slate-400"
                            />
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-between group">
                            <span
                              onDoubleClick={() => toggleColumnEdit(col.id)}
                              className="cursor-pointer hover:text-blue-600 transition-colors"
                              title="Double click to rename"
                            >
                              {col.name}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeColumn(col.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="p-2 text-xs font-bold uppercase min-w-[100px]">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-500 gap-1.5 px-2 cursor-pointer"
                      onClick={handleAddColumn}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Column
                    </Button>
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase">
                    Remark
                  </TableHead>
                  <TableHead className="p-2 text-xs font-bold uppercase w-[120px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowsWithSerialNumbers.map((row) =>
                  row.isHeading ? (
                    <TableRow key={row.id} className="bg-muted/30">
                      <TableCell className="p-2 text-center font-bold">
                        {row.serialNo}
                      </TableCell>
                      <TableCell colSpan={7 + dynamicColumns.length} className="p-2">
                        {inlineQuickAddId === row.id ? (
                          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                            <div className="flex-1 max-w-[500px]">
                              <Input
                                value={quickAddValue}
                                onChange={(e) => setQuickAddValue(e.target.value)}
                                placeholder="Enter New Heading Name..."
                                className="h-8 text-xs font-bold border-slate-200 focus:ring-slate-900 bg-slate-50/30"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') submitQuickAdd();
                                  if (e.key === 'Escape') cancelInlineAdd();
                                }}
                              />
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => submitQuickAdd()}
                              disabled={isQuickAdding}
                              className="h-8 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold px-3 cursor-pointer"
                            >
                              {isQuickAdding ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={cancelInlineAdd}
                              disabled={isQuickAdding}
                              className="h-8 text-slate-500 hover:text-slate-700 text-[10px] font-bold px-3 cursor-pointer"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 max-w-[500px]">
                              <SearchableSelect
                                options={headingOptions}
                                value={row.headingText}
                                onValueChange={(value) =>
                                  handleRowChange(row.id, "headingText", value)
                                }
                                placeholder="Select heading"
                                searchPlaceholder="Search heading..."
                                className="font-semibold border-1 focus-visible:ring-0 shadow-none bg-transparent hover:bg-slate-100/50"
                                disabled={isReadOnly}
                              />
                            </div>
                            {(!isReadOnly) && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleQuickAdd("", row.id)}
                                className="h-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-bold text-xs gap-1.5 px-3 cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Add
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="p-2">
                        <div className="flex gap-2">
                          {!isReadOnly && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => addRow(row.id)}
                                className="h-8 w-8 text-slate-600 hover:text-slate-900 cursor-pointer"
                                title="Add activity row below"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => addHeadingRow(row.id)}
                                className="h-8 w-8 text-slate-600 hover:text-slate-900 cursor-pointer"
                                title="Insert heading below"
                              >
                                <Type className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => removeRow(row.id)}
                                disabled={tableRows.length === 1}
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={row.id}>
                      <TableCell className="p-2 text-center">
                        {row.subSerialNo || row.serialNo}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.activity}
                          onChange={(e) =>
                            handleRowChange(row.id, "activity", e.target.value)
                          }
                          placeholder="Activity"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                          readOnly={isReadOnly}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.typeMethodCheck}
                          onChange={(e) =>
                            handleRowChange(row.id, "typeMethodCheck", e.target.value)
                          }
                          placeholder="Type / Method of Check"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                          readOnly={isReadOnly}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.acceptanceCriteria}
                          onChange={(e) =>
                            handleRowChange(row.id, "acceptanceCriteria", e.target.value)
                          }
                          placeholder="Acceptance Criteria"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                          readOnly={isReadOnly}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.verifyingDocument}
                          onChange={(e) =>
                            handleRowChange(row.id, "verifyingDocument", e.target.value)
                          }
                          placeholder="Verifying Document"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                          readOnly={isReadOnly}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.shreno}
                          onChange={(e) =>
                            handleRowChange(row.id, "shreno", e.target.value)
                          }
                          placeholder="Shreno"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                          readOnly={isReadOnly}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.clientTpia}
                          onChange={(e) =>
                            handleRowChange(row.id, "clientTpia", e.target.value)
                          }
                          placeholder="Client / TPIA"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                          readOnly={isReadOnly}
                        />
                      </TableCell>
                      {dynamicColumns.map(col => (
                        <TableCell key={col.id}>
                          <Input
                            type="text"
                            value={row.dynamicValues?.[col.id] || ""}
                            onChange={(e) =>
                              handleDynamicColumnChange(row.id, col.id, e.target.value)
                            }
                            placeholder={col.name}
                            className="w-full text-xs border-0 focus-visible:ring-0"
                            readOnly={isReadOnly}
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        <Input
                          type="text"
                          value={row.remark}
                          onChange={(e) =>
                            handleRowChange(row.id, "remark", e.target.value)
                          }
                          placeholder="Remark"
                          className="w-full text-xs border-0 focus-visible:ring-0"
                          readOnly={isReadOnly}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!isReadOnly && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => addRow(row.id)}
                                className="h-8 w-8 text-slate-600 hover:text-slate-900 cursor-pointer"
                                title="Add activity row below"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => removeRow(row.id)}
                                disabled={tableRows.length === 1}
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
          {!isReadOnly && (
            <Button
              type="button"
              variant="outline"
              onClick={addRow}
              className="w-full sm:w-auto mt-2 cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Heading
            </Button>
          )}
        </CardContent>
      </Card>
      )}

      {/* Fourth Section - Remarks */}
      <Card className="mt-6 mb-6">
        <CardHeader>
          <CardTitle>Remarks</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            required
            id="remarks"
            name="remarks"
            value={formData.remarks}
            onChange={handleInputChange}
            placeholder="Enter any additional notes or remarks..."
            className="min-h-[100px] resize-y"
            readOnly={isReadOnly}
          />
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end mt-4 mb-8">
        <Button variant="outline" onClick={onBack} disabled={submitting} className="cursor-pointer">
          {isReadOnly ? "Back" : "Cancel"}
        </Button>
        {!isReadOnly && (
          <>
            <Button
              variant="outline"
              onClick={() => handleSubmit("Draft")}
              disabled={submitting}
              className="cursor-pointer"
            >
              {submitting ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              onClick={() => handleSubmit("uploaded")}
              disabled={submitting}
              className="cursor-pointer"
            >
              {submitting ? "Saving..." : (editId ? "Update" : "Submit")}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
// ─── Main Controller ─────────────────────────────────────────────────────────
function QualityAssurancePlan() {
  const [view, setView] = useState("list") // "list" | "create" | "edit" | "view"
  const [editId, setEditId] = useState(null)
  const [viewId, setViewId] = useState(null)
  const [cloneId, setCloneId] = useState(null)

  const handleCreateClick = () => {
    setEditId(null)
    setViewId(null)
    setCloneId(null)
    setView("create")
  }

  const handleEditClick = (id) => {
    setEditId(id)
    setViewId(null)
    setCloneId(null)
    setView("edit")
  }

  const handleViewClick = (id) => {
    setViewId(id)
    setEditId(null)
    setCloneId(null)
    setView("view")
  }

  const handleCloneClick = (id) => {
    setCloneId(id)
    setEditId(null)
    setViewId(null)
    setView("create")
  }

  const handleBackToList = () => {
    setEditId(null)
    setViewId(null)
    setCloneId(null)
    setView("list")
  }

  const getHeaderProps = () => {
    switch (view) {
      case "create":
        return {
          title: "Create New QAP",
          description: "Create and structure quality assurance plan information.",
          actions: null
        }
      case "edit":
        return {
          title: "Edit Quality Assurance Plan",
          description: "Update existing quality assurance plan information.",
          actions: null
        }
      case "view":
        return {
          title: "View Quality Assurance Plan",
          description: "Comprehensive report and activity tracking view.",
          actions: null
        }
      case "list":
      default:
        return {
          title: "Quality Assurance Plan (QAP)",
          description: "Manage and track quality assurance plans.",
          actions: null
        }
    }
  }

  const headerProps = getHeaderProps();

  return (
    <>
      <PageContainer>
{view === "list" && (
            <ListView
              onCreateClick={handleCreateClick}
              onEditClick={handleEditClick}
              onViewClick={handleViewClick}
              onCloneClick={handleCloneClick}
            />
          )}
          {(view === "create" || view === "edit" || view === "view") && (
            <CreateView
              onBack={handleBackToList}
              onSuccess={handleBackToList}
              editId={view === "view" ? viewId : editId}
              cloneId={cloneId}
              isReadOnly={view === "view"}
            />
          )}
</PageContainer>
    </>
  )
}

export default QualityAssurancePlan
