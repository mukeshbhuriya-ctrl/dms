import { useState, useCallback, useEffect, useMemo } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"
import { toast } from "react-toastify"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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
import { Plus, Trash2, ArrowLeft, Eye, Edit, Upload, X, FileText, Paperclip } from "lucide-react"
import ProDataTable from "@/components/shared/ProDataTable"
import ImportReviewDialog from "@/components/shared/ImportReviewDialog"
import { generateExcelTemplate, parseExcelFile } from "@/utils/excelImportEngine"
import { DocumentPreviewDialog } from "@/components/shared/DocumentPreviewDialog"
import ConfirmDialog from "@/components/shared/ConfirmDialog"

const toUrlKey = (value = "") =>
    String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")

// ─── Status Options ────────────────────────────────────────────────────────────
const SHRENO_STATUS_OPTIONS = [
    "Quoted",
    "Cancel",
    "Duplicate entry",
    "Technical Submitted",
    "Under Review",
    "Regret / Not Attempted",
    "Hold"
]

const CLIENT_STATUS_OPTIONS = [
    "Ongoing",
    "Regret / Not Attempted",
    "Lost by Delivery",
    "Lost by Price",
    "Lost by Technical",
    "Order Received",
    "Under Review",
    "Cancel"
]

// ─── Status badge helper ─────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const colors = {
        "Quoted": "bg-blue-100 text-blue-700 border-blue-300",
        "Technical Submitted": "bg-indigo-100 text-indigo-700 border-indigo-300",
        "Under Review": "bg-yellow-100 text-yellow-700 border-yellow-300",
        "Ongoing": "bg-yellow-100 text-yellow-700 border-yellow-300",
        "Cancel": "bg-red-100 text-red-700 border-red-300",
        "Lost by Price": "bg-red-100 text-red-700 border-red-300",
        "Lost by Delivery": "bg-red-100 text-red-700 border-red-300",
        "Lost by Technical": "bg-red-100 text-red-700 border-red-300",
        "Regret / Not Attempted": "bg-gray-200 text-gray-700 border-gray-400",
        "Order Received": "bg-green-100 text-green-700 border-green-300",
        "Hold": "bg-orange-100 text-orange-700 border-orange-300",
    }
    return (
        <span className={`px-2 flex-shrink-0 w-max py-0.5 rounded-full text-[10px] font-medium border ${colors[status] || "bg-gray-100 text-gray-700 border-gray-300"}`}>
            {status}
        </span>
    )
}

// ─── List View ───────────────────────────────────────────────────────────────
function ListView({ onCreateClick, onEditClick, onViewClick, onAttachmentsClick }) {
    const [refreshKey, setRefreshKey] = useState(0)
    const [columnFilters, setColumnFilters] = useState({})
    const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
    const [excelData, setExcelData] = useState([]);
    const [isImporting, setIsImporting] = useState(false);

    const [confirmState, setConfirmState] = useState({ isOpen: false, id: null })

    const onConfirmDelete = async () => {
        try {
            setConfirmState(prev => ({ ...prev, isLoading: true }))
            const res = await apiClient.delete(`/api/rfq/${confirmState.id}`)
            if (res.success) {
                toast.success("RFQ entry deleted successfully")
                setRefreshKey(prev => prev + 1)
            }
        } catch (error) {
            toast.error(error.message || "Failed to delete record")
        } finally {
            setConfirmState({ isOpen: false, id: null, isLoading: false })
        }
    }

    const columns = useMemo(() => [
        { header: "Quotation No.", accessorKey: "quotation_no", filterType: "text" },
        { header: "Client Name", accessorKey: "client_name" },
        { header: "RFQ Type", accessorKey: "rfq_type" },
        { header: "Consultancy", accessorKey: "consultancy" },
        { header: "Mode", accessorKey: "mode_of_enquiry" },
        {
            header: "Enq. Date",
            accessorKey: "enq_date",
            cell: (row) => row.enq_date ? new Date(row.enq_date).toLocaleDateString("en-GB") : "-",
        },
        { header: "Estimator", accessorKey: "estimator" },
        {
            header: "Shreno Status",
            accessorKey: "shreno_status",
            cell: (row) => <StatusBadge status={row.shreno_status} />,
        },
        {
            header: "Client Status",
            accessorKey: "client_status",
            cell: (row) => <StatusBadge status={row.client_status} />,
        },
        {
            id: "actions",
            header: "Actions",
            cell: (row) => (
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => onViewClick(row)} title="View"><Eye className="h-4 w-4 mr-2" /> View</Button>
                    <Button variant="outline" size="sm" onClick={() => onAttachmentsClick(row)} title="Attachments"><Paperclip className="h-4 w-4 mr-2" /> Docs</Button>
                    <Button variant="outline" size="sm" onClick={() => onEditClick(row)} title="Edit"><Edit className="h-4 w-4 mr-2" /> Edit</Button>
                </div>
            ),
        },
    ], [onViewClick, onAttachmentsClick, onEditClick])

    const fetchData = useCallback(async (params) => {
        const queryParams = { ...params };
        if (queryParams.columnFilters) {
            const cf = queryParams.columnFilters;
            const finalFilters = {};
            Object.keys(cf).forEach(key => { if (cf[key]) finalFilters[`${key}_filter`] = cf[key]; });
            Object.assign(queryParams, finalFilters);
            delete queryParams.columnFilters;
        }
        const res = await apiClient.get("/api/rfq/list", queryParams)
        return { data: res.data || [], meta: res.meta || {} }
    }, [refreshKey])

    const handleDownloadTemplate = () => {
        const headers = [
            ["Quotation Category (Core / Spare)*", "Client Name*", "Client Ref.", "RFQ Type", "Consultancy", "Contact Person", "Mode", "Enquiry Date", "Target Date", "Submission Date", "Mediator", "Estimator", "Shreno Status", "Client Status", "PO No.", "PO Date", "PO Value", "PO Remark", "Made By", "Remark", "Enq Description", "Qty", "Rev", "Total Value"],
            ["Core", "Sample Client Ltd", "REF-101", "Material", "ABC Consultants", "Mr. Robert", "Email", "24/04/2026", "30/04/2026", "28/04/2026", "Mediator A", "Estimator B", "Quoted", "Under Review", "PO-999", "01/05/2026", "50000", "Standard PO", "Admin", "General Remark", "Detailed Enquiry", "5", "0", "250000"]
        ];
        generateExcelTemplate(headers, "RFQ_Import_Template.xlsx", "RFQ_Template");
    };

    const handleImportExcel = useCallback(async (file) => {
        if (!file) return;
        try {
            const { rows } = await parseExcelFile(file, ["quotation category", "client name"]);
            const parsedData = rows.map((row) => {
                const parseDate = (dStr) => {
                    if (!dStr) return null;
                    const parts = dStr.split("/");
                    if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                    const d = new Date(dStr); return isNaN(d.getTime()) ? null : d;
                };
                const enq_date = parseDate(row[7]);
                const actual_submission_date = parseDate(row[9]);
                let timeTaken = "";
                if (enq_date && actual_submission_date) {
                    const diffDays = Math.ceil(Math.abs(actual_submission_date - enq_date) / (1000 * 60 * 60 * 24));
                    timeTaken = `${diffDays} Days`;
                }
                return {
                    quotation_category: String(row[0] || "").trim(), client_name: String(row[1] || "").trim(), client_ref: String(row[2] || "").trim(), rfq_type: String(row[3] || "").trim(), consultancy: String(row[4] || "").trim(), contact_person: String(row[5] || "").trim(), mode_of_enquiry: String(row[6] || "").trim(), enq_date, target_date: parseDate(row[8]), actual_submission_date, time_taken: timeTaken, mediator: String(row[10] || "").trim(), estimator: String(row[11] || "").trim(), shreno_status: String(row[12] || "").trim() || "Quoted", client_status: String(row[13] || "").trim() || "Under Review", po_no: String(row[14] || "").trim(), po_date: parseDate(row[15]), po_value: String(row[16] || "").trim(), po_remark: String(row[17] || "").trim(), made_by: String(row[18] || "").trim(), remark: String(row[19] || "").trim(), enq_description: String(row[20] || "").trim(), equip_qty: String(row[21] || "").trim(), rev: String(row[22] || "").trim(), total_value: String(row[23] || "").trim(),
                    status: row[1] ? "valid" : "error", message: row[1] ? "Ready" : "Client Name required"
                };
            }).filter(r => r.client_name);
            setExcelData(parsedData); setBulkImportDialogOpen(true);
        } catch (err) { toast.error(err.message); }
    }, []);

    const confirmBulkImport = async () => {
        setIsImporting(true);
        try {
            const validData = excelData.filter(r => r.status === 'valid');
            const res = await apiClient.post("/api/rfq/bulk-create", validData);
            if (res.success) { toast.success("Import successful"); setBulkImportDialogOpen(false); setRefreshKey(prev => prev + 1); }
        } catch (err) { toast.error("Failed to import"); }
        finally { setIsImporting(false); }
    };

    const handleExport = async () => { try { await exportApi.exportModule('rfq_register'); setRefreshKey(prev => prev + 1); } catch (e) { console.error(e); } };

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <ProDataTable columns={columns} fetchData={fetchData} onAdd={onCreateClick} onExport={handleExport} onImport={handleImportExcel} onDownloadTemplate={handleDownloadTemplate} columnFilters={columnFilters} onAddTooltip="Create New" onFilterChange={(f) => setColumnFilters(p => ({ ...p, ...f }))} />
            <ImportReviewDialog open={bulkImportDialogOpen} onOpenChange={setBulkImportDialogOpen} data={excelData} totalCount={excelData.length} validCount={excelData.filter(r => r.status === 'valid').length} errorCount={excelData.filter(r => r.status === 'error').length} columns={[{ header: "Client", key: "client_name" }, { header: "Quotation No", key: "quotation_no" }]} onConfirm={confirmBulkImport} isImporting={isImporting} confirmLabel={`Import (${excelData.filter(r => r.status === 'valid').length} Rows)`} title="Review RFQ Import" />
            <ConfirmDialog isOpen={confirmState.isOpen} onClose={() => setConfirmState({ isOpen: false, id: null })} onConfirm={onConfirmDelete} title="Delete RFQ Entry" description="Are you sure you want to delete this RFQ?" variant="danger" isLoading={confirmState.isLoading} />
        </div>
    )
}

// ─── Create / Edit / View View ──────────────────────────────────────────────
function FormView({ onBack, onSuccess, editId = null, isView = false }) {
    const location = useLocation()
    const [recordId, setRecordId] = useState(null)
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [dropdownOptions, setDropdownOptions] = useState({ rfqTypes: [], clientNames: [], modesOfEnquiry: [], mediators: [], estimators: [], })

    const [formData, setFormData] = useState(() => {
        const authData = localStorage.getItem("user_auth"); const parsedAuth = authData ? JSON.parse(authData) : null;
        const loggedInUser = parsedAuth?.user?.name || parsedAuth?.payload?.user?.name || "";
        return { quotationNo: "", quotationCategory: "Core", clientRef: "", rfqType: "", clientName: "", consultancy: "", contactPerson: "", modeOfEnquiry: "", enqDate: "", targetDate: new Date().toISOString().split("T")[0], actualSubmissionDate: "", timeTaken: "", mediator: "", estimator: "", shrenoStatus: "Quoted", clientStatus: "Under Review", remark: "", madeBy: loggedInUser, poNo: "", poDate: "", poValue: "", poRemark: "", }
    })
    const [tableRows, setTableRows] = useState([{ id: 1, srNo: 1, enqDescription: "", equipQty: "", rev: "", totalValue: "", remarks: "" }])
    const [attachments, setAttachments] = useState([])

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [rfqTypesRes, moeRes, estimatorsRes, mediatorsRes, customersRes] = await Promise.all([
                    apiClient.get("/api/rfq/lookups/rfq_type"), apiClient.get("/api/rfq/lookups/mode_of_enquiry"), apiClient.get("/api/rfq/estimators"), apiClient.get("/api/rfq/mediators"), apiClient.get("/api/common/customers"),
                ])
                setDropdownOptions({ rfqTypes: (rfqTypesRes.data || []).map(d => d.name), clientNames: (customersRes.data || []).map(c => c.customer_name), modesOfEnquiry: (moeRes.data || []).map(d => d.name), estimators: (estimatorsRes.data || []).map(u => u.name), mediators: (mediatorsRes.data || []).map(u => u.name), })
            } catch (e) { console.error(e); }
        }
        fetchOptions()
    }, [])

    const applyDataToForm = useCallback((r) => {
        setRecordId(r.id)
        setFormData({ quotationNo: r.quotation_no ?? "", quotationCategory: r.quotation_category ?? "Core", clientRef: r.client_ref ?? "", rfqType: r.rfq_type ?? "", clientName: r.client_name ?? "", consultancy: r.consultancy ?? "", contactPerson: r.contact_person ?? "", modeOfEnquiry: r.mode_of_enquiry ?? "", enqDate: r.enq_date ? r.enq_date.split("T")[0] : "", targetDate: r.target_date ? r.target_date.split("T")[0] : "", actualSubmissionDate: r.actual_submission_date ? r.actual_submission_date.split("T")[0] : "", timeTaken: r.time_taken ?? "", mediator: r.mediator ?? "", estimator: r.estimator ?? "", shrenoStatus: r.shreno_status ?? "Quoted", clientStatus: r.client_status ?? "Under Review", remark: r.remark ?? "", madeBy: r.made_by ?? "", poNo: r.po_no ?? "", poDate: r.po_date ? r.po_date.split("T")[0] : "", poValue: r.po_value ?? "", poRemark: r.po_remark ?? "", })
        if (r.attachments) setAttachments(r.attachments.map(att => ({ id: att.id, name: att.file_name, size: (att.file_size / 1024).toFixed(2) + " KB", type: att.mime_type, uploadedAt: new Date(att.uploaded_at).toLocaleString(), url: att.file_url, isNew: false })))
        if (r.items?.length) setTableRows(r.items.map((item, i) => ({ id: i + 1, srNo: item.sr_no ?? (i + 1), enqDescription: item.enq_description ?? "", equipQty: item.equip_qty ?? "", rev: item.rev ?? "", totalValue: item.total_value ?? "", remarks: item.remarks ?? "" })))
    }, [])

    useEffect(() => {
        if (editId && dropdownOptions.clientNames.length > 0) {
            const fetchRecord = async () => {
                setLoading(true)
                try {
                    const rState = location.state?.rfq
                    let finalId = rState?.id || editId
                    if (!rState?.id) {
                        const decoded = decodeURIComponent(editId)
                        // Reconstruct quotation_no format (SHR/MKT/001/2026-27) from slug (shr-mkt-001-2026-27)
                        const parts = decoded.split('-')
                        let searchVal = decoded
                        if (parts.length >= 4) {
                            // Join all but last 2 with /, then join last 2 with -
                            searchVal = parts.slice(0, -2).join('/') + '/' + parts.slice(-2).join('-')
                        }
                        
                        const res = await apiClient.get("/api/rfq/list", { search: searchVal, limit: 10 })
                        const matched = res?.data?.find(p => toUrlKey(p.quotation_no) === editId || p.quotation_no.toLowerCase() === searchVal.toLowerCase())
                        if (matched) finalId = matched.id
                    }
                    const res = await apiClient.get(`/api/rfq/${finalId}`)
                    if (res.success) applyDataToForm(res.data)
                } catch (e) { toast.error("Failed to load record") }
                finally { setLoading(false) }
            }
            fetchRecord()
        }
    }, [editId, dropdownOptions, applyDataToForm, location.state])

    useEffect(() => {
        if (!editId) {
            apiClient.get(`/api/rfq/next-quotation-no?type=${formData.quotationCategory}`)
                .then(res => { if (res.success) setFormData(p => ({ ...p, quotationNo: res.data.next_quotation_no })) })
                .catch(e => console.error(e))
        }
    }, [editId, formData.quotationCategory])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(p => {
            const updated = { ...p, [name]: value }
            if ((name === "actualSubmissionDate" || name === "enqDate") && updated.enqDate && updated.actualSubmissionDate) {
                const diffDays = Math.ceil(Math.abs(new Date(updated.actualSubmissionDate) - new Date(updated.enqDate)) / (1000 * 60 * 60 * 24))
                updated.timeTaken = `${diffDays} Days`
            }
            return updated
        })
    }

    const handleRowChange = (id, field, value) => setTableRows(p => p.map(row => row.id === id ? { ...row, [field]: value } : row))

    const handleFileChange = (e) => {
        const newAttachments = Array.from(e.target.files).map(file => ({ id: Math.random().toString(36).substr(2, 9), name: file.name, size: (file.size / 1024).toFixed(2) + " KB", type: file.type, uploadedAt: new Date().toLocaleString(), file, isNew: true }))
        setAttachments(p => [...p, ...newAttachments])
    }

    const [confirmState, setConfirmState] = useState({ isOpen: false, id: null, isNew: false })
    const removeAttachment = (id, isNew) => { if (isNew) { setAttachments(p => p.filter(a => a.id !== id)); return; } setConfirmState({ isOpen: true, id, isNew }) }
    const onConfirmDeleteAttachment = async () => {
        try {
            setConfirmState(p => ({ ...p, isLoading: true }))
            await apiClient.delete(`/api/rfq/attachments/${confirmState.id}`);
            setAttachments(p => p.filter(a => a.id !== confirmState.id)); toast.success("Attachment deleted");
        } catch (e) { toast.error("Failed to delete attachment") }
        finally { setConfirmState({ isOpen: false, id: null, isNew: false, isLoading: false }) }
    }

    const handleSubmit = async () => {
        setSubmitting(true)
        try {
            const payload = { ...formData, enq_date: formData.enqDate || null, target_date: formData.targetDate || null, actual_submission_date: formData.actualSubmissionDate || null, items: tableRows.map(r => ({ sr_no: r.srNo, enq_description: r.enqDescription, equip_qty: r.equipQty, rev: r.rev, total_value: r.totalValue, remarks: r.remarks })) }
            let res = editId && recordId ? await apiClient.put(`/api/rfq/update/${recordId}`, payload) : await apiClient.post("/api/rfq/create", payload)
            if (res.success) {
                const rId = recordId || res.data.id
                const newFiles = attachments.filter(a => a.isNew).map(a => a.file)
                if (newFiles.length > 0) {
                    const fd = new FormData(); newFiles.forEach(f => fd.append("files", f));
                    await apiClient.post(`/api/rfq/${rId}/attachments`, fd);
                }
                toast.success("RFQ saved successfully"); onSuccess();
            }
        } catch (e) { toast.error("Failed to save RFQ") }
        finally { setSubmitting(false) }
    }

    if (loading) return <div className="p-8 text-center">Loading...</div>

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-1">{isView ? "View" : editId ? "Edit" : "Create"} RFQ Entry</h1>
                    <p className="text-muted-foreground">{isView ? "Review RFQ details." : editId ? "Update details." : "New entry."}</p>
                </div>
                <Button variant="outline" onClick={onBack} className="h-9"><ArrowLeft className="h-4 w-4 mr-2" /> Back to List</Button>
            </div>
            <Card className="mb-6"><CardHeader><CardTitle>Enquiry Information</CardTitle></CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2"><Label>Quotation Type</Label><Select value={formData.quotationCategory} onValueChange={(v) => handleInputChange({ target: { name: "quotationCategory", value: v } })} disabled={!!editId || isView}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Core">Core - MKT</SelectItem><SelectItem value="Spare">Spare - SPR</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Quotation No.</Label><Input value={formData.quotationNo} disabled className="bg-muted" /></div>
                <div className="space-y-2"><Label>Client Ref.</Label><Input name="clientRef" value={formData.clientRef} onChange={handleInputChange} readOnly={isView} className={isView ? "bg-muted" : ""} /></div>
                <div className="space-y-2"><Label>RFQ Type</Label><Select value={formData.rfqType} onValueChange={(v) => handleInputChange({ target: { name: "rfqType", value: v } })} disabled={isView}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{dropdownOptions.rfqTypes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Client Name</Label><Input name="clientName" value={formData.clientName} onChange={handleInputChange} readOnly={isView} className={isView ? "bg-muted" : ""} /></div>
                <div className="space-y-2"><Label>Consultancy</Label><Input name="consultancy" value={formData.consultancy} onChange={handleInputChange} readOnly={isView} className={isView ? "bg-muted" : ""} /></div>
                <div className="space-y-2"><Label>Mode</Label><Select value={formData.modeOfEnquiry} onValueChange={(v) => handleInputChange({ target: { name: "modeOfEnquiry", value: v } })} disabled={isView}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{dropdownOptions.modesOfEnquiry.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Enq Date</Label><Input name="enqDate" type="date" value={formData.enqDate} onChange={handleInputChange} readOnly={isView} className={isView ? "bg-muted" : ""} /></div>
            </div></CardContent></Card>
            <Card className="mb-6"><CardHeader><CardTitle>Submission Details</CardTitle></CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Target Date</Label><Input name="targetDate" type="date" value={formData.targetDate} onChange={handleInputChange} readOnly={isView} className={isView ? "bg-muted" : ""} /></div>
                <div className="space-y-2"><Label>Submission Date</Label><Input name="actualSubmissionDate" type="date" value={formData.actualSubmissionDate} onChange={handleInputChange} readOnly={isView} className={isView ? "bg-muted" : ""} /></div>
                <div className="space-y-2"><Label>Time Taken</Label><Input value={formData.timeTaken} readOnly className="bg-muted" /></div>
            </div></CardContent></Card>
            <Card className="mb-6"><CardHeader><CardTitle>Assignment & Status</CardTitle></CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2"><Label>Mediator</Label><Select value={formData.mediator} onValueChange={(v) => handleInputChange({ target: { name: "mediator", value: v } })} disabled={isView}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{dropdownOptions.mediators.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Estimator</Label><Select value={formData.estimator} onValueChange={(v) => handleInputChange({ target: { name: "estimator", value: v } })} disabled={isView}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{dropdownOptions.estimators.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Shreno Status</Label><Select value={formData.shrenoStatus} onValueChange={(v) => handleInputChange({ target: { name: "shrenoStatus", value: v } })} disabled={isView}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SHRENO_STATUS_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Client Status</Label><Select value={formData.clientStatus} onValueChange={(v) => handleInputChange({ target: { name: "clientStatus", value: v } })} disabled={isView}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CLIENT_STATUS_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
            </div><div className="mt-4"><Label>Remark</Label><Textarea name="remark" value={formData.remark} onChange={handleInputChange} readOnly={isView} className={isView ? "bg-muted" : ""} /></div></CardContent></Card>
            <Card className="mb-6"><CardHeader><CardTitle>Enquiry Details</CardTitle></CardHeader><CardContent><div className="space-y-4">
                <Label>Description</Label><Textarea value={tableRows[0].enqDescription} onChange={(e) => handleRowChange(tableRows[0].id, "enqDescription", e.target.value)} readOnly={isView} className={isView ? "bg-muted min-h-[100px]" : "min-h-[100px]"} />
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Qty</Label><Input type="number" value={tableRows[0].equipQty} onChange={(e) => handleRowChange(tableRows[0].id, "equipQty", e.target.value)} readOnly={isView} /></div>
                    <div className="space-y-2"><Label>Rev</Label><Input value={tableRows[0].rev} onChange={(e) => handleRowChange(tableRows[0].id, "rev", e.target.value)} readOnly={isView} /></div>
                    <div className="space-y-2"><Label>Value</Label><Input type="number" value={tableRows[0].totalValue} onChange={(e) => handleRowChange(tableRows[0].id, "totalValue", e.target.value)} readOnly={isView} /></div>
                </div>
            </div></CardContent></Card>
            <Card className="mb-6"><CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2"><Paperclip className="h-4 w-4" /> Attachments</CardTitle>
                {!isView && <><input type="file" id="rfq-atts" className="hidden" multiple onChange={handleFileChange} /><Button variant="outline" size="sm" onClick={() => document.getElementById('rfq-atts').click()}><Plus className="h-3.5 w-3.5 mr-1" /> Add Files</Button></>}
            </CardHeader><CardContent>
                {attachments.length > 0 ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{attachments.map(f => (
                    <div key={f.id} className="flex items-center justify-between p-2.5 border rounded-lg bg-slate-50">
                        <div className="flex items-center gap-3 overflow-hidden"><FileText className="h-5 w-5 text-blue-500 shrink-0" /><div className="flex flex-col min-w-0"><span className="text-xs font-semibold truncate">{f.name}</span><span className="text-[10px] text-slate-400">{f.size}</span></div></div>
                        {!isView && <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-red-500" onClick={() => removeAttachment(f.id, f.isNew)}><X className="h-3.5 w-3.5" /></Button>}
                    </div>
                ))}</div> : <div className="p-8 border-2 border-dashed rounded-xl text-center text-slate-400">No attachments</div>}
            </CardContent></Card>
            <div className="flex justify-end gap-4 mb-8">
                <Button variant="outline" onClick={onBack}>Cancel</Button>
                {!isView && <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : editId ? "Update" : "Submit"}</Button>}
            </div>
            <ConfirmDialog isOpen={confirmState.isOpen} onClose={() => setConfirmState({ isOpen: false, id: null })} onConfirm={onConfirmDeleteAttachment} title="Delete Attachment" description="Delete this document?" variant="danger" isLoading={confirmState.isLoading} />
        </div>
    )
}

// ─── Attachments View ────────────────────────────────────────────────────────
function AttachmentsView({ rfqId, onBack }) {
    const [qNo, setQNo] = useState("")
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [previewUrl, setPreviewUrl] = useState("")
    const [activeDoc, setActiveDoc] = useState(null)

    const fetchAtts = useCallback(async () => {
        try {
            let finalId = location.state?.rfq?.id || rfqId
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalId)

            if (!isUuid) {
                const decoded = decodeURIComponent(rfqId)
                // Reconstruct quotation_no format (SHR/MKT/001/2026-27) from slug (shr-mkt-001-2026-27)
                const parts = decoded.split('-')
                let searchVal = decoded
                if (parts.length >= 4) {
                    searchVal = parts.slice(0, -2).join('/') + '/' + parts.slice(-2).join('-')
                }

                const res = await apiClient.get("/api/rfq/list", { search: searchVal, limit: 10 })
                const matched = res?.data?.find(p => toUrlKey(p.quotation_no) === rfqId || p.quotation_no.toLowerCase() === searchVal.toLowerCase())
                if (matched) finalId = matched.id
                else throw new Error("RFQ not found")
            }

            const res = await apiClient.get(`/api/rfq/${finalId}/attachments`)
            if (res.success) { 
                setQNo(res.data.quotation_no); 
                return { 
                    data: (res.data.attachments || []).map((a, i) => ({ ...a, sn: i + 1 })), 
                    meta: { total: res.data.attachments.length } 
                } 
            }
        } catch (e) { 
            console.error(e)
            toast.error("Failed to load attachments") 
        }
        return { data: [], meta: {} }
    }, [rfqId, location.state])

    const cols = [{ header: "SN", accessorKey: "sn", width: "50px" }, { header: "File Name", accessorKey: "file_name" }, { header: "Date", accessorKey: "uploaded_at", cell: (r) => new Date(r.uploaded_at).toLocaleDateString() }, { id: "actions", header: "Actions", cell: (r) => <Button variant="ghost" size="sm" onClick={() => { setPreviewUrl(r.file_url); setActiveDoc({ mimeType: r.file_mime_type, filePath: r.file_path, documentName: r.file_name }); setIsPreviewOpen(true) }}><Eye className="h-4 w-4 mr-2" /> Preview</Button> }]

    return (
        <div className="flex flex-col h-full space-y-4 px-1">
            <div className="flex items-center gap-4"><Button variant="outline" size="icon" onClick={onBack} className="rounded-full"><ArrowLeft className="h-4 w-4" /></Button><div><h1 className="text-2xl font-bold">Attachments</h1><p className="text-sm text-muted-foreground">RFQ: <span className="font-bold">{qNo || "..."}</span></p></div></div>
            <div className="flex-1 flex flex-col overflow-hidden"><ProDataTable fetchData={fetchAtts} columns={cols} /></div>
            <DocumentPreviewDialog isOpen={isPreviewOpen} onOpenChange={setIsPreviewOpen} previewUrl={previewUrl} activePreviewDoc={activeDoc} />
        </div>
    )
}

// ─── Main Controller ─────────────────────────────────────────────────────────
export default function RfqRegister() {
    const navigate = useNavigate()
    const location = useLocation()
    const { id: routeId } = useParams()

    const mode = useMemo(() => {
        if (location.pathname.includes("/create")) return "create"
        if (location.pathname.includes("/edit")) return "edit"
        if (location.pathname.includes("/view")) return "view"
        if (location.pathname.includes("/attachments")) return "attachments"
        return "list"
    }, [location.pathname])

    const handleSuccess = () => navigate("/rfq/list")

    return (
        <>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
            </header>
            <main className="flex-1 overflow-auto p-6 flex flex-col">
                <div className="flex-1 flex flex-col w-full">
                    {mode === "list" ? (
                        <ListView
                            onCreateClick={() => navigate("/rfq/create")}
                            onEditClick={(row) => navigate(`/rfq/edit/${toUrlKey(row.quotation_no)}`, { state: { rfq: { id: row.id, label: row.quotation_no } } })}
                            onViewClick={(row) => navigate(`/rfq/view/${toUrlKey(row.quotation_no)}`, { state: { rfq: { id: row.id, label: row.quotation_no } } })}
                            onAttachmentsClick={(row) => navigate(`/rfq/attachments/${toUrlKey(row.quotation_no)}`, { state: { rfq: { id: row.id, label: row.quotation_no } } })}
                        />
                    ) : mode === "attachments" ? (
                        <AttachmentsView rfqId={routeId} onBack={() => navigate("/rfq/list")} />
                    ) : (
                        <FormView onBack={() => navigate("/rfq/list")} onSuccess={handleSuccess} editId={routeId} isView={mode === "view"} />
                    )}
                </div>
            </main>
        </>
    )
}
