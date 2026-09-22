import { PageContainer } from "@/components/layout/PageContainer"
import React, { useState, useEffect, useMemo, useCallback } from "react"
import { toast } from "react-toastify"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DocumentPreviewDialog
} from "@/components/shared/DocumentPreviewDialog"

import {
  Trash2,
  Plus,
  ArrowLeft,
  Layers,
  Edit,
  Upload,
  History,
  Eye,
  Loader2,
  Printer,
  Download,
  Archive,
  CheckCircle,
  XCircle
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SearchableSelect } from "@/components/shared/SearchableSelect"
import ProDataTable from "@/components/shared/ProDataTable"
import { Badge } from "@/components/ui/badge"
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"

// ─── List View ───────────────────────────────────────────────────────────────
function ListView({ onCreateClick, onEditClick, refreshKey }) {
  const isAdmin = true;
  const [columnFilters, setColumnFilters] = useState({ is_active: ["true"] })
  const [activeFilters, setActiveFilters] = useState({ records: [] })
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null, type: 'delete' })
  const [localRefresh, setLocalRefresh] = useState(0)

  const fetchActiveFilters = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/dtn/get-filters")
      if (res.success) setActiveFilters(res.data)
    } catch (err) {
      console.error("Error fetching active filters:", err)
    }
  }, [])

  useEffect(() => {
    fetchActiveFilters()
  }, [fetchActiveFilters, refreshKey])

  // Auto-selection for reverse cascading
  useEffect(() => {
    if (!activeFilters.records || activeFilters.records.length === 0) return

    const updates = {}
    if (columnFilters.job_no && Array.isArray(columnFilters.job_no) && columnFilters.job_no.length === 1) {
      const selectedJob = columnFilters.job_no[0]
      const match = activeFilters.records.find(r => r.job_no?.toString() === selectedJob?.toString())
      if (match) {
        if (!columnFilters.customer || columnFilters.customer.length === 0) updates.customer = [match.customer]
        if (!columnFilters.po || columnFilters.po.length === 0) updates.po = [match.po]
      }
    } else if (columnFilters.po && Array.isArray(columnFilters.po) && columnFilters.po.length === 1) {
      const selectedPo = columnFilters.po[0]
      const match = activeFilters.records.find(r => r.po?.toString() === selectedPo?.toString())
      if (match && (!columnFilters.customer || columnFilters.customer.length === 0)) {
        updates.customer = [match.customer]
      }
    }

    if (Object.keys(updates).length > 0) {
      setColumnFilters(prev => ({ ...prev, ...updates }))
    }
  }, [columnFilters.job_no, columnFilters.po, activeFilters.records])

  // Cascading Logic
  const activeCustomerOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.po) {
      const selected = Array.isArray(columnFilters.po) ? columnFilters.po : [columnFilters.po.toString()]
      filtered = filtered.filter(c => selected.includes(c.po?.toString()))
    }
    if (columnFilters.job_no) {
      const selected = Array.isArray(columnFilters.job_no) ? columnFilters.job_no : [columnFilters.job_no.toString()]
      filtered = filtered.filter(c => selected.includes(c.job_no?.toString()))
    }
    const clients = [...new Set(filtered.map(c => c.customer))].filter(Boolean).sort()
    return clients.map(c => ({ label: c, value: c }))
  }, [activeFilters.records, columnFilters.po, columnFilters.job_no])

  const activePoOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.customer) {
      const selected = Array.isArray(columnFilters.customer) ? columnFilters.customer : [columnFilters.customer.toString()]
      filtered = filtered.filter(c => selected.includes(c.customer?.toString()))
    }
    if (columnFilters.job_no) {
      const selected = Array.isArray(columnFilters.job_no) ? columnFilters.job_no : [columnFilters.job_no.toString()]
      filtered = filtered.filter(c => selected.includes(c.job_no?.toString()))
    }
    const pos = [...new Set(filtered.map(c => c.po))].filter(Boolean).sort()
    return pos.map(p => ({ label: p, value: p }))
  }, [activeFilters.records, columnFilters.customer, columnFilters.job_no])

  const activeJobOptions = useMemo(() => {
    let filtered = activeFilters.records || []
    if (columnFilters.customer) {
      const selected = Array.isArray(columnFilters.customer) ? columnFilters.customer : [columnFilters.customer.toString()]
      filtered = filtered.filter(c => selected.includes(c.customer?.toString()))
    }
    if (columnFilters.po) {
      const selected = Array.isArray(columnFilters.po) ? columnFilters.po : [columnFilters.po.toString()]
      filtered = filtered.filter(c => selected.includes(c.po?.toString()))
    }
    const jobs = [...new Set(filtered.map(c => c.job_no))].filter(Boolean).sort()
    return jobs.map(m => ({ label: m, value: m }))
  }, [activeFilters.records, columnFilters.customer, columnFilters.po])

  const fetchDtns = useCallback(async (params) => {
    const queryParams = { ...params };
    if (queryParams.columnFilters) {
      queryParams.columnFilters = JSON.stringify(queryParams.columnFilters);
    }
    const res = await apiClient.get("/api/dtn", queryParams)
    return res;
  }, [])

  const getStatusBadge = (status) => {
    let colorClass = "bg-gray-100 text-gray-700 border-gray-200"
    if (status === "Draft") colorClass = "bg-slate-100 text-slate-700 border-slate-200"
    if (status === "Uploaded") colorClass = "bg-amber-50 text-amber-700 border-amber-200"

    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colorClass}`}>
        {status}
      </span>
    )
  }

  const handleExport = useCallback(async (id, refNo, mode = 'download') => {
    const endpoint = `/api/dtn/download-note/${id}`;
    const filename = `Transmittal_${refNo.replace(/[^a-z0-9]/gi, '_')}.pdf`;

    try {
      if (mode === 'print') {
        const response = await apiClient.get(endpoint, {}, { responseType: 'blob' });
        const blob = new Blob([response], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      } else {
        await exportApi.download(endpoint, filename, {}, { contentType: 'application/pdf' });
      }
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Could not generate report. Please try again.");
    }
  }, []);

  const handleToggleStatus = async () => {
    if (!confirmDialog.id) return
    try {
      const res = await apiClient.patch(`/api/dtn/toggle-status/${confirmDialog.id}`)
      if (res.success) {
        toast.success("Status updated successfully")
        setLocalRefresh(prev => prev + 1)
        setConfirmDialog({ isOpen: false, id: null })
      }
    } catch (err) {
      console.error("Error toggling status:", err)
      toast.error("Failed to update status")
    }
  }

  const handleDelete = async () => {
    if (!confirmDialog.id) return
    try {
      const res = await apiClient.delete(`/api/dtn/${confirmDialog.id}`)
      if (res.success) {
        toast.success("Transmittal deleted successfully")
        setLocalRefresh(prev => prev + 1)
        setConfirmDialog({ isOpen: false, id: null })
      }
    } catch (err) {
      console.error("Error deleting transmittal:", err)
      toast.error("Failed to delete transmittal")
    }
  }

  const handleConfirm = () => {
    if (confirmDialog.type === 'delete') {
      handleDelete();
    } else {
      handleToggleStatus();
    }
  };

  const columns = useMemo(() => [
    { 
      header: "Reference No", 
      accessorKey: "ref_no",
      filterType: "text"
    },
    {
      header: "Customer",
      accessorKey: "customer",
      filterType: "select",
      isMulti: true,
      filterOptions: activeCustomerOptions
    },
    {
      header: "PO No",
      accessorKey: "po",
      filterType: "select",
      isMulti: true,
      filterOptions: activePoOptions
    },
    {
      header: "Job Number",
      accessorKey: "job_no",
      filterType: "select",
      isMulti: true,
      filterOptions: activeJobOptions
    },
    {
      header: "Date",
      accessorKey: "date",
      cell: (row) => row.date ? new Date(row.date).toLocaleDateString() : "N/A"
    },
    {
      header: "Status",
      accessorKey: "status",
      filterType: "select",
      isMulti: true,
      filterOptions: [
        { label: "Draft", value: "Draft" },
        { label: "Uploaded", value: "Uploaded" }
      ],
      cell: (row) => getStatusBadge(row.status || "Draft")
    },
    {
      header: "Active",
      accessorKey: "is_active",
      filterType: "select",
      isMulti: true,
      filterOptions: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" }
      ],
      cell: (row) => row.is_active
        ? <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-medium">Active</Badge>
        : <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20 text-xs font-medium">Inactive</Badge>,
    },
    {
      id: "actions",
      header: "Actions",
      width: "60px",
      cell: (row) => {
        const actions = [
          { label: "Edit Transmittal", icon: Edit, onClick: () => onEditClick(row.id) },
          { label: "Print Report", icon: Printer, onClick: () => handleExport(row.id, row.ref_no, 'print') },
          { label: "Download PDF", icon: Download, onClick: () => handleExport(row.id, row.ref_no, 'download') },
        ];
        
        if (isAdmin) {
          actions.push({ type: "separator" });
          actions.push({ 
            label: row.is_active ? "Deactivate" : "Activate", 
            icon: row.is_active ? XCircle : CheckCircle, 
            onClick: () => setConfirmDialog({ isOpen: true, id: row.id, type: 'toggle', currentStatus: row.is_active }),
            color: row.is_active ? "danger" : "default"
          });
          actions.push({ type: "separator" });
          actions.push({ label: "Archive Transmittal", icon: Archive, color: "danger", onClick: () => setConfirmDialog({ isOpen: true, id: row.id, type: 'delete' }) });
        }

        return (
          <div className="flex items-center justify-center">
            <DataTableRowActions actions={actions} />
          </div>
        );
      },
      enableSorting: false,
    }
  ], [onEditClick, handleExport, activeCustomerOptions, activePoOptions, activeJobOptions])

  return (
    <div className="flex-1 flex flex-col overflow-hidden w-full">

      <ProDataTable
        fetchData={fetchDtns}
        columns={columns}
        refreshKey={`${refreshKey}-${localRefresh}`}
        onAdd={onCreateClick}
        globalSearchPlaceholder="Search reference no, msn, client..."
        columnFilters={columnFilters}
        onFilterChange={(newFilters) => setColumnFilters(prev => ({ ...prev, ...newFilters }))}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, id: null })}
        onConfirm={handleConfirm}
        title={confirmDialog.type === 'delete' ? "Archive Transmittal" : "Change Status"}
        description={
          confirmDialog.type === 'delete' 
            ? "Are you sure you want to archive this transmittal? This action cannot be undone."
            : `Are you sure you want to ${confirmDialog.currentStatus ? 'deactivate' : 'activate'} this transmittal?`
        }
        confirmText={confirmDialog.type === 'delete' ? "Archive" : (confirmDialog.currentStatus ? "Deactivate" : "Activate")}
        variant={confirmDialog.type === 'delete' ? "danger" : "warning"}
      />
    </div>
  )
}

// ─── Create View ─────────────────────────────────────────────────────────────
function CreateView({ onBack, editId, defaultRefNo }) {
  const [jobIds, setJobIds] = useState([])
  const [jobs, setJobs] = useState([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [fetchingDtn, setFetchingDtn] = useState(false)
  const [savingStatus, setSavingStatus] = useState(null) // 'Draft' or 'Uploaded'

  // Auto-fill (Identical state structure to MHC)
  const [autoFill, setAutoFill] = useState({
    reportNo: editId ? (defaultRefNo || "") : "SHR/DGN/",
    client: "",
    poNo: "",
    projectId: "",
    equipmentName: "",
    tagNo: "",
    code: "",
  })

  // Checklists (Issued To)
  const [issuedTo, setIssuedTo] = useState({
    hm: false, hq: false, hmf: false, hpl: false, hst: false, hpc: false, ppd: false,
  })

  // Checklists (Issued For)
  const [issuedFor, setIssuedFor] = useState({
    reference: false, planning: false, construction: false,
    manufacturing: false, outsourcing: false, procurement: false,
  })

  // Distribution Matrix (SS10 Replication)
  const [distributionRows, setDistributionRows] = useState([])
  const [availableDocuments, setAvailableDocuments] = useState([]) // New state

  // DTN Upload State Tracking
  const [uploadingIds, setUploadingIds] = useState({})
  const [versionHistory, setVersionHistory] = useState({}) // { rowId: latestRevNo }
  const [stagedFiles, setStagedFiles] = useState({}) // { rowId: File object }

  // Preview Dialog State
  const [previewDialog, setPreviewDialog] = useState({
    isOpen: false,
    url: "",
    doc: null
  })

  const depts = ["HM", "HQ", "HMF", "HPL", "HST", "HPC", "PPD"]

  useEffect(() => {
    const init = async () => {
      setJobsLoading(true)
      try {
        const res = await apiClient.get("/api/common/jobs")
        setJobs(res.data || [])

        if (editId) {
          setFetchingDtn(true)
          const dtnRes = await apiClient.get(`/api/dtn/${editId}`)
          if (dtnRes.success && dtnRes.data) {
            const d = dtnRes.data
            setAutoFill({
              reportNo: d.ref_no,
              client: d.client_name,
              poNo: d.po_number,
              projectId: d.project_id || "",
              equipmentName: d.equipment_name || "",
              tagNo: d.tag_no || "",
              code: d.code || "",
            })
            setJobIds(d.jobIds)
            setIssuedTo(d.issued_to)
            setIssuedFor(d.issued_for)
            setDistributionRows(d.distributionRows)

            // Populate version history state so Eye/History icons show up correctly
            const initialHistory = {}
            d.distributionRows.forEach(row => {
              if (row.has_file && row.rev !== undefined && row.rev !== "") {
                initialHistory[row.id] = parseInt(row.rev)
              } else if (!row.has_file && row.rev !== undefined && row.rev !== "") {
                initialHistory[row.id] = -2 // Version exists in DB but file missing on disk
              } else {
                initialHistory[row.id] = -1 // No version record at all
              }
            })
            setVersionHistory(initialHistory)

            // Re-populate available documents so the dropdown can resolve labels
            if (d.jobIds && d.jobIds.length > 0) {
              try {
                const docsRes = await apiClient.get(`/api/dtn/documents-by-jobs?jobIds=${d.jobIds.join(',')}`)
                if (docsRes.success && docsRes.data) {
                  const docs = docsRes.data.map(doc => ({
                    value: doc.document_master_id,
                    label: `[${doc.shreno_doc_no}] ${doc.document_name}`,
                    docData: doc
                  }))
                  setAvailableDocuments(docs)
                }
              } catch (e) {
                console.error("Failed to load documents for edit", e)
              }
            }
          }
        } else {
          // Fetch next reference number from backend
          const nextRes = await apiClient.get("/api/dtn/next-ref")
          if (nextRes.success) {
            setAutoFill(prev => ({ ...prev, reportNo: nextRes.data }))
          }
        }
      } catch (err) {
        console.error("Failed to init CreateView:", err)
      } finally {
        setJobsLoading(false)
        setFetchingDtn(false)
      }
    }
    init()
  }, [editId])

  // Options for Job Number dropdown (Cascading Logic)
  const jobOptions = useMemo(() => {
    // If no jobs are selected, show everything
    if (!jobIds || jobIds.length === 0) {
      return jobs.map((j) => ({ value: String(j.id), label: j.job_number }))
    }

    // Find the current PO context from the first selected job
    const firstJob = jobs.find(j => String(j.id) === String(jobIds[0]))
    const currentPoNo = firstJob?.po?.po_number

    // If we can't find a PO Number, don't restrict (failsafe)
    if (!currentPoNo) {
      return jobs.map((j) => ({ value: String(j.id), label: j.job_number }))
    }

    // Filter list to only show jobs belonging to the SAME PO
    return jobs
      .filter(j => j.po?.po_number === currentPoNo)
      .map(j => ({ value: String(j.id), label: j.job_number }))
  }, [jobs, jobIds])

  // Matrix handlers
  const updateMatrixCell = (rowId, field, value) => {
    setDistributionRows(prev => prev.map(row =>
      row.id === rowId ? { ...row, [field]: value } : row
    ))
  }

  const updateMatrixDep = (rowId, dep, value) => {
    setDistributionRows(prev => prev.map(row =>
      row.id === rowId ? { ...row, deps: { ...row.deps, [dep]: value } } : row
    ))
  }

  // Synchronized Issued To handler
  const updateIssuedTo = (key, val) => {
    setIssuedTo(prev => ({ ...prev, [key]: val }));

    // Sync to all rows in the distribution matrix
    const upperKey = key.toUpperCase();
    setDistributionRows(prev => prev.map(row => ({
      ...row,
      deps: { ...row.deps, [upperKey]: val }
    })));
  };

  const addMatrixRow = () => {
    const nextSr = (distributionRows.length + 1).toString().padStart(2, '0');
    const currentDeps = Object.entries(issuedTo).reduce((acc, [k, v]) => ({
      ...acc, [k.toUpperCase()]: v
    }), {});

    setDistributionRows(prev => [...prev, {
      id: Date.now(),
      srNo: nextSr,
      docNo: "",
      rev: "0",
      copies: "01",
      deps: { ...currentDeps }
    }])
  }

  // Auto-fill logic
  const handleJobSelect = async (ids) => {
    setJobIds(ids)
    if (ids.length > 0) {
      const firstJob = jobs.find(j => String(j.id) === String(ids[0]));
      if (firstJob) {
        setAutoFill(prev => ({
          ...prev,
          client: firstJob.customer?.customer_name || "N/A",
          poNo: firstJob.po?.po_number || "N/A",
          projectId: firstJob.project_id || "40540",
          equipmentName: firstJob.equipement_name || "E40340",
          tagNo: firstJob.tag_number || "T095656",
          code: firstJob.code || "ASME BPVC VIII-1",
        }))
      }

      // Fetch dynamic reference number based on selected jobs
      if (!editId) {
          try {
            const refRes = await apiClient.get(`/api/dtn/next-ref?jobIds=${ids.join(',')}`);
            if (refRes.success && refRes.data) {
                setAutoFill(prev => ({ ...prev, reportNo: refRes.data }));
            }
          } catch (error) {
              console.error("Error fetching dynamic ref no:", error);
          }
      }

      // Fetch related documents (Unique Union for all selected jobs)
      try {
        const res = await apiClient.get(`/api/dtn/documents-by-jobs?jobIds=${ids.join(',')}`)
        if (res.success && res.data) {
          // Pre-calculate current distribution defaults from Issued To
          const currentDeps = Object.entries(issuedTo).reduce((acc, [k, v]) => ({
            ...acc, [k.toUpperCase()]: v
          }), {});

          // Populate available documents instead of direct rows
          const docs = res.data.map(doc => ({
            value: doc.document_master_id,
            label: `[${doc.shreno_doc_no}] ${doc.document_name}`,
            docData: doc
          }))
          setAvailableDocuments(docs)

          // Auto-add one empty row if matrix is empty
          if (distributionRows.length === 0) {
            setDistributionRows([{
              id: Date.now(),
              srNo: "01",
              docNo: "",
              document_master_id: "",
              rev: "0",
              copies: "01",
              deps: { ...currentDeps }
            }])
          }
        }
      } catch (error) {
        console.error("Error fetching documents for jobs:", error)
        toast.error("Failed to fetch related documents")
      }
    } else {
      // Clear matrix and auto-fill if no jobs selected
      setDistributionRows([])
      setAvailableDocuments([])
      setAutoFill({
        reportNo: "SHR/DGN/001",
        client: "",
        poNo: "",
        projectId: "",
        equipmentName: "",
        tagNo: "",
        code: "",
      })
    }
  }

  // Submission Logic (Draft or Uploaded)
  const handleSubmit = async (status) => {
    if (jobIds.length === 0) {
      return toast.warning("Please select at least one Job Number.")
    }

    if (distributionRows.length === 0) {
      return toast.warning("The distribution matrix cannot be empty.")
    }

    setSavingStatus(status)
    const firstJob = jobs.find(j => String(j.id) === String(jobIds[0]))

    // --- STEP 1: Process Batch Uploads for Staged Files ---
    const rowsWithFiles = distributionRows.filter(row => stagedFiles[row.id]);
    let finalRows = [...distributionRows];

    if (rowsWithFiles.length > 0) {
      try {
        const uploadPromises = rowsWithFiles.map(async (row) => {
          const formData = new FormData();
          formData.append('file', stagedFiles[row.id]);

          // Use first job number as directory context
          const jobNumber = firstJob?.job_number || "NA";

          // Use 'overwrite' mode if editing an existing transmittal
          const uploadMode = editId ? 'overwrite' : 'increment';

          const res = await apiClient.post(
            `/api/dtn/drawing/${row.document_master_id}/upload?job_number=${encodeURIComponent(jobNumber)}&mode=${uploadMode}`,
            formData
          );

          return { rowId: row.id, newRev: res.data.version_no };
        });

        const uploadResults = await Promise.all(uploadPromises);

        // Update revision numbers in final submission payload
        uploadResults.forEach(({ rowId, newRev }) => {
          finalRows = finalRows.map(r => r.id === rowId ? { ...r, rev: newRev.toString() } : r);
        });
      } catch (err) {
        console.error("Batch upload failed:", err);
        toast.error("Drawing upload failed. Please try again.");
        setSavingStatus(null);
        return;
      }
    }

    const payload = {
      ref_no: autoFill.reportNo,
      date: new Date().toISOString(),
      customer_id: firstJob?.customer_id,
      customer_location_id: firstJob?.customer_location_id,
      client_name: autoFill.client,
      po_id: firstJob?.po_id,
      po_number: autoFill.poNo,
      project_id: autoFill.projectId,
      equipment_name: autoFill.equipmentName,
      tag_no: autoFill.tagNo,
      code: autoFill.code,
      issued_to: issuedTo,
      issued_for: issuedFor,
      status,
      jobIds: jobIds,
      items: finalRows
    }

    try {
      const endpoint = editId ? `/api/dtn/${editId}` : "/api/dtn"
      const method = editId ? "put" : "post"

      const res = await apiClient[method](endpoint, payload)
      if (res.success) {
        toast.success(status === "Draft" ? "Draft saved successfully!" : (editId ? "Transmittal updated successfully!" : "Transmittal generated successfully!"))
        onBack(true)
      } else {
        toast.error(res.message || "Failed to process transmittal")
      }
    } catch (error) {
      console.error("Submit DTN error:", error)
      toast.error(`An error occurred while ${status === "Draft" ? "saving draft" : "generating transmittal"}`)
    } finally {
      setSavingStatus(null)
    }
  }

  return (
    <div className="w-full">
      <div className="flex justify-end mb-4 w-full">
        <Button variant="outline" onClick={onBack} className="rounded-sm border-slate-200 shadow-none">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      </div>

      <Card className="mb-6 shadow-none border border-slate-200 rounded-sm w-full">
        <CardHeader className="pb-4 border-b bg-slate-50/50 font-semibold text-lg">
          <CardTitle className="text-base font-bold uppercase tracking-tight text-slate-800">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            <div className="space-y-2">
              <Label className="uppercase text-xs font-semibold text-muted-foreground italic">MSN / JOB NO.:</Label>
              <SearchableSelect
                multi={true}
                options={jobOptions}
                value={jobIds}
                onValueChange={handleJobSelect}
                placeholder={jobsLoading ? "Loading jobs…" : "SELECT MSN"}
                searchPlaceholder="Search job number..."
              />
            </div>

            <div className="space-y-2">
              <Label className="uppercase text-xs font-semibold text-muted-foreground italic">TRANSMITTAL REF NO.:</Label>
              <Input value={autoFill.reportNo} readOnly className="bg-muted/40 h-10 border-muted-foreground/20 shadow-none text-sm font-medium" />
            </div>

            <div className="space-y-2">
              <Label className="uppercase text-xs font-semibold text-muted-foreground italic">CUSTOMER / VENDOR (CLIENT):</Label>
              <Input value={autoFill.client} readOnly className="bg-muted/40 h-10 border-muted-foreground/20 shadow-none text-sm font-medium" />
            </div>

            <div className="space-y-2">
              <Label className="uppercase text-xs font-semibold text-muted-foreground italic">PURCHASE ORDER NO (PO. NO.):</Label>
              <Input value={autoFill.poNo} readOnly className="bg-muted/40 h-10 border-muted-foreground/20 shadow-none text-sm font-medium" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 shadow-sm border border-muted-foreground/20 overflow-hidden">
        <CardHeader className="pb-4 border-b bg-muted/5 py-4">
          <CardTitle className="text-base font-semibold uppercase tracking-wide">Issued To :</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <tbody>
                {[
                  { key: 'hm', label: 'HEAD MARKETING (HM)' },
                  { key: 'hq', label: 'HEAD QUALITY (HQ)' },
                  { key: 'hmf', label: 'HEAD MANUFACTURING (HMF)' },
                  { key: 'hpl', label: 'HEAD PLANNING (HPL)' },
                  { key: 'hst', label: 'HEAD STORE (HST)' },
                  { key: 'hpc', label: 'HEAD PURCHASE (HPC)' },
                  { key: 'ppd', label: 'PREPRATORY DEPARTMENT (PPD)' },
                ].map((item) => (
                  <tr key={item.key} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 px-6 text-sm font-medium text-muted-foreground border-r w-2/3">
                      {item.label}
                    </td>
                    <td className="p-3 text-center w-1/3">
                      <div className="flex justify-center">
                        <Checkbox
                          id={`to-${item.key}`}
                          checked={issuedTo[item.key]}
                          onCheckedChange={(val) => updateIssuedTo(item.key, val)}
                          className="h-5 w-5 border-muted-foreground/40"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="h-10 border-b last:border-0">
                  <td className="border-r"></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {Object.values(issuedTo).some(v => v) && (
            <div className="p-4 bg-slate-50/80 border-t flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider italic">ATTN:</span>
              <span className="text-sm font-bold text-slate-800 uppercase tracking-tight">
                {Object.entries(issuedTo)
                  .filter(([_, checked]) => checked)
                  .map(([key]) => key.toUpperCase())
                  .join(", ")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-8 shadow-sm border border-muted-foreground/20 overflow-hidden">
        <CardHeader className="pb-4 border-b bg-muted/5 py-4">
          <CardTitle className="text-base font-semibold uppercase tracking-wide">Issued For :</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="border-r border-b md:border-b-0">
              <table className="w-full border-collapse">
                <tbody>
                  {[
                    { key: 'reference', label: 'Reference' },
                    { key: 'planning', label: 'Planning' },
                    { key: 'construction', label: 'Construction' },
                  ].map((item) => (
                    <tr key={item.key} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 px-6 text-sm font-medium text-muted-foreground border-r w-2/3">
                        {item.label}
                      </td>
                      <td className="p-3 text-center w-1/3">
                        <div className="flex justify-center">
                          <Checkbox
                            id={`for-${item.key}`}
                            checked={issuedFor[item.key]}
                            onCheckedChange={(val) => setIssuedFor(prev => ({ ...prev, [item.key]: val }))}
                            className="h-5 w-5 border-muted-foreground/40"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="h-10 border-b last:border-0"><td className="border-r"></td><td></td></tr>
                </tbody>
              </table>
            </div>

            <div>
              <table className="w-full border-collapse">
                <tbody>
                  {[
                    { key: 'manufacturing', label: 'MANUFACTURING:' },
                    { key: 'outsourcing', label: 'OUTSOURCING:' },
                    { key: 'procurement', label: 'PROCUREMENT:' },
                  ].map((item) => (
                    <tr key={item.key} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 px-6 text-sm font-medium text-muted-foreground border-r w-2/3">
                        {item.label}
                      </td>
                      <td className="p-3 text-center w-1/3">
                        <div className="flex justify-center">
                          <Checkbox
                            id={`for-${item.key}`}
                            checked={issuedFor[item.key]}
                            onCheckedChange={(val) => setIssuedFor(prev => ({ ...prev, [item.key]: val }))}
                            className="h-5 w-5 border-muted-foreground/40"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="h-10 border-b last:border-0"><td className="border-r"></td><td></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="mb-8 shadow-sm border border-muted-foreground/20 overflow-hidden">
        <CardHeader className="pb-4 border-b bg-muted/5 py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold uppercase tracking-wide">Distribution :</CardTitle>
          <Button
            onClick={addMatrixRow}
            className="h-9 px-4 bg-slate-900 hover:bg-black text-white rounded-md shadow-sm transition-all text-xs font-bold tracking-wide gap-2 border-none"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar-x">
            <table className="w-full border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="p-2 border-r text-[10px] font-bold uppercase text-slate-600 w-16 min-w-[64px] text-center">Sr. No</th>
                  <th className="p-2 border-r text-[10px] font-bold uppercase text-slate-600 text-left min-w-[300px] w-[400px] max-w-[500px]">Document Number / Title</th>
                  <th className="p-2 border-r text-[10px] font-bold uppercase text-slate-600 w-24 min-w-[96px] whitespace-nowrap text-center">Rev No</th>
                  <th className="p-2 border-r text-[10px] font-bold uppercase text-slate-600 w-24 min-w-[96px] whitespace-nowrap text-center">No. of Copy</th>
                  {depts.map(d => (
                    <th key={d} className="p-2 border-r text-[10px] font-bold uppercase text-slate-600 w-16 min-w-[64px] text-center">{d}</th>
                  ))}
                  <th className="p-2 border-l text-[10px] font-bold uppercase text-slate-600 w-32 min-w-[128px] text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {distributionRows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 group hover:bg-slate-50/30 transition-colors">
                    <td className="p-2 border-r text-center text-[11px] font-bold text-slate-500 bg-slate-50/30">
                      {row.srNo}
                    </td>
                    <td className="p-1 border-r max-w-[500px]">
                      <SearchableSelect
                        options={availableDocuments}
                        value={row.document_master_id || ''}
                        onValueChange={async (val) => {
                          const selectedDoc = availableDocuments.find(d => d.value === val);
                          if (selectedDoc) {
                            updateMatrixCell(row.id, 'document_master_id', val);
                            updateMatrixCell(row.id, 'docNo', selectedDoc.label);

                            // Poll backend for the latest history native to this Document Master
                            try {
                              const histRes = await apiClient.get(`/api/dtn/drawing/${val}/history`);
                              const latestRev = histRes.data.latestVersionNo || 0;
                              const nextRev = histRes.data.nextVersionNo || 0;
                              const hasFile = histRes.data.hasPhysicalFile;

                              // ── Context-Aware Revision Logic ──
                              const assignedRev = editId ? latestRev : nextRev;

                              updateMatrixCell(row.id, 'rev', assignedRev.toString());
                              updateMatrixCell(row.id, 'copies', "01");

                              setVersionHistory(prev => ({
                                ...prev,
                                [row.id]: hasFile ? latestRev : -2
                              }));
                            } catch (err) {
                              // Silent fallback to defaults if no history found
                              updateMatrixCell(row.id, 'rev', '0');
                              updateMatrixCell(row.id, 'copies', "01");
                              setVersionHistory(prev => ({ ...prev, [row.id]: -1 }));
                            }
                          }
                        }}
                        placeholder="Select Document"
                      />
                    </td>
                    <td className="p-1 border-r text-center">
                      <Input
                        value={row.rev}
                        onChange={(e) => updateMatrixCell(row.id, 'rev', e.target.value)}
                        className="border-none shadow-none focus-visible:ring-0 text-[11px] h-8 text-center font-bold"
                      />
                    </td>
                    <td className="p-1 border-r text-center">
                      <Input
                        value={row.copies}
                        onChange={(e) => updateMatrixCell(row.id, 'copies', e.target.value)}
                        className="border-none shadow-none focus-visible:ring-0 text-[11px] h-8 text-center font-bold"
                      />
                    </td>
                    {depts.map(d => (
                      <td key={d} className="p-2 border-r">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={row.deps[d] || false}
                            onCheckedChange={(val) => updateMatrixDep(row.id, d, val)}
                            className="h-4 w-4 border-muted-foreground/40"
                          />
                        </div>
                      </td>
                    ))}
                    <td className="p-2 border-l text-center">
                      <div className="flex items-center justify-center gap-1">
                        {!row.document_master_id ? (
                          <span className="text-[10px] text-slate-400 font-medium">Select Doc</span>
                        ) : (
                          <>
                            <Label
                              htmlFor={`upload-dtn-${row.id}`}
                              className={`cursor-pointer h-7 w-7 rounded-sm flex items-center justify-center hover:bg-slate-100 transition-colors ${stagedFiles[row.id] ? 'text-emerald-600 bg-emerald-50' : 'text-blue-600'}`}
                              title={stagedFiles[row.id] ? `File Staged: ${stagedFiles[row.id].name}` : "Step 1: Choose Drawing File"}
                            >
                              {stagedFiles[row.id] ? <Plus className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                            </Label>
                            <Input
                              id={`upload-dtn-${row.id}`}
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file || !row.document_master_id) return;

                                setStagedFiles(prev => ({ ...prev, [row.id]: file }));
                              }}
                            />

                            {stagedFiles[row.id] && (
                              <span className="text-[9px] text-emerald-600 font-bold truncate max-w-[60px]" title={stagedFiles[row.id].name}>
                                {stagedFiles[row.id].name}
                              </span>
                            )}

                            {(versionHistory[row.id] !== undefined && (versionHistory[row.id] >= 0 || versionHistory[row.id] === -2) && !stagedFiles[row.id]) && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-7 w-7 rounded-sm ${versionHistory[row.id] === -2 ? 'text-slate-300 pointer-events-none' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'}`}
                                  title={versionHistory[row.id] === -2 ? "File not found on server" : "Preview Last Upload"}
                                  disabled={versionHistory[row.id] === -2}
                                  onClick={async () => {
                                    if (versionHistory[row.id] === -2) return;
                                    try {
                                      const rev = versionHistory[row.id];
                                      // The download endpoint returns a file stream
                                      const previewUrl = `/api/dtn/drawing/${row.document_master_id}/download?version=${rev}&mode=preview`;

                                      // Pre-identify doc for preview component
                                      const activeDoc = {
                                        documentName: row.doc_no_title,
                                        filePath: `rev_${rev}.pdf` // Hinting to component
                                      };

                                      setPreviewDialog({
                                        isOpen: true,
                                        url: `${import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"}${previewUrl}`,
                                        doc: activeDoc
                                      });
                                    } catch (err) {
                                      toast.error("Failed to prepare preview.");
                                    }
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-sm" title="Audit Trail">
                                  <History className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {[1, 2, 3].map(i => (
                  <tr key={i} className="h-10 border-b last:border-0 opacity-40">
                    <td className="border-r px-2 text-[10px] text-slate-400 text-center font-bold">{(distributionRows.length + i).toString().padStart(2, '0')}</td>
                    <td className="border-r"></td>
                    <td className="border-r"></td>
                    <td className="border-r"></td>
                    {depts.map(d => <td key={d} className="border-r"></td>)}
                    <td className="border-l"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-4 justify-end items-center mt-6">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={savingStatus !== null}
          className="h-10 px-6 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all rounded-lg font-medium shadow-none gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSubmit("Draft")}
          disabled={savingStatus !== null}
          className="h-10 px-6 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all rounded-lg font-medium shadow-none"
        >
          {savingStatus === "Draft" ? "Saving..." : "Save Draft"}
        </Button>
        <Button
          onClick={() => handleSubmit("Uploaded")}
          disabled={savingStatus !== null}
          className="h-10 px-8 bg-slate-900 hover:bg-black text-white transition-all rounded-lg shadow-md font-bold text-[13px] tracking-wide border-none"
        >
          {savingStatus === "Uploaded" ? "Processing..." : "Generate Transmittal"}
        </Button>
      </div>

      <DocumentPreviewDialog
        isOpen={previewDialog.isOpen}
        onOpenChange={(open) => setPreviewDialog(prev => ({ ...prev, isOpen: open }))}
        previewUrl={previewDialog.url}
        activePreviewDoc={previewDialog.doc}
      />
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function DrawingTransmittal() {
  const [view, setView] = useState("list")
  const [editId, setEditId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleCreate = useCallback(() => {
    setEditId(null)
    setView("create")
  }, [])

  const handleEdit = useCallback((id) => {
    setEditId(id)
    setView("create")
  }, [])

  const handleBack = useCallback((refresh = false) => {
    if (refresh) setRefreshKey(prev => prev + 1)
    setView("list")
  }, [])

  return (
    <PageContainer>
      {view === "list" ? (
        <ListView
          onCreateClick={handleCreate}
          onEditClick={handleEdit}
          refreshKey={refreshKey}
        />
      ) : (
        <CreateView
          onBack={handleBack}
          editId={editId}
        />
      )}
    </PageContainer>
  )
}
