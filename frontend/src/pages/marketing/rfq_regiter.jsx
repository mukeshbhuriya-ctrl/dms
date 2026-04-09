import { useState, useCallback, useEffect } from "react"

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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Trash2, ArrowLeft, Eye, Edit } from "lucide-react"
import { DataTable } from "@/components/shared/DataTable"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"
import { toast } from "react-toastify"

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
function ListView({ onCreateClick, onEditClick }) {
    const [isViewOpen, setIsViewOpen] = useState(false)
    const [selectedRecord, setSelectedRecord] = useState(null)
    const [viewLoading, setViewLoading] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)

    const handleViewClick = async (id) => {
        try {
            setViewLoading(true)
            const res = await apiClient.get(`/api/rfq/${id}`)
            if (res.success) {
                setSelectedRecord(res.data)
                setIsViewOpen(true)
            }
        } catch (error) {
            toast.error(error.message || "Failed to fetch record")
        } finally {
            setViewLoading(false)
        }
    }

    const handleDeleteClick = async (id) => {
        if (!window.confirm("Are you sure you want to delete this RFQ entry?")) return
        try {
            const res = await apiClient.delete(`/api/rfq/${id}`)
            if (res.success) {
                toast.success("RFQ entry deleted successfully")
                // Force DataTable to refetch by triggering a re-render
                setRefreshKey(prev => prev + 1)
            }
        } catch (error) {
            toast.error(error.message || "Failed to delete record")
        }
    }

    const columns = [
        { header: "Quotation No.", accessorKey: "quotation_no" },
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
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewClick(row.id)}
                        title="View">
                        <Eye className="h-4 w-4 mr-2" /> View
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditClick(row.id)}
                        title="Edit">
                        <Edit className="h-4 w-4 mr-2" /> Edit
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(row.id)}
                        title="Delete">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ]

    // Real API fetch for DataTable
    const fetchData = useCallback(async ({ page, limit, search }) => {
        const res = await apiClient.get("/api/rfq/list", { page, limit, search })
        return { data: res.data || [], meta: res.meta || {} }
    }, [refreshKey])

    const handleExport = async () => {
        try {
            await exportApi.exportModule('rfq_register');
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error("RFQ Export failed:", error);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-1">RFQ Register</h1>
                    <p className="text-muted-foreground">View and manage all RFQ (Request for Quotation) records.</p>
                </div>
                <Button onClick={onCreateClick}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                </Button>
            </div>

            <DataTable 
                columns={columns} 
                fetchData={fetchData} 
                onExport={handleExport}
            />

            {/* View Dialog */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="sm:max-w-[95vw] w-full max-h-[95vh] overflow-y-auto p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-center">RFQ Register Details</DialogTitle>
                        <DialogDescription className="text-center">
                            Complete details of the selected RFQ record.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedRecord && (
                        <div className="space-y-6 mt-4">
                            {/* Section 1: Enquiry Information */}
                            <div className="border border-border rounded-xl shadow-sm bg-white">
                                <div className="px-6 py-3 border-b border-border bg-muted/40 rounded-t-xl">
                                    <h3 className="font-bold text-sm">Enquiry Information</h3>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-y-5 gap-x-4 p-6 text-sm">
                                    {[
                                        ["QUOTATION NO.", selectedRecord.quotation_no],
                                        ["CLIENT REF.", selectedRecord.client_ref],
                                        ["RFQ TYPE", selectedRecord.rfq_type],
                                        ["CLIENT NAME", selectedRecord.client_name],
                                        ["CONSULTANCY", selectedRecord.consultancy],
                                        ["CONTACT PERSON", selectedRecord.contact_person],
                                        ["MODE OF ENQUIRY", selectedRecord.mode_of_enquiry],
                                        ["ENQ. DATE", selectedRecord.enq_date ? new Date(selectedRecord.enq_date).toLocaleDateString("en-GB") : "-"],
                                        ["DATE", new Date(selectedRecord.createdAt).toLocaleDateString("en-GB")],
                                    ].map(([label, value], idx) => (
                                        <div key={idx} className="flex flex-col space-y-1">
                                            <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">{label}</span>
                                            <span className="font-medium">{value || "-"}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Section 2: Submission Details */}
                            <div className="border border-border rounded-xl shadow-sm bg-white">
                                <div className="px-6 py-3 border-b border-border bg-muted/40 rounded-t-xl">
                                    <h3 className="font-bold text-sm">Submission Details</h3>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-5 gap-x-4 p-6 text-sm">
                                    {[
                                        ["TARGET DATE (+5 WORKING DAYS)", selectedRecord.target_date ? new Date(selectedRecord.target_date).toLocaleDateString("en-GB") : "-"],
                                        ["ACTUAL SUBMISSION DATE", selectedRecord.actual_submission_date ? new Date(selectedRecord.actual_submission_date).toLocaleDateString("en-GB") : "-"],
                                        ["TIME TAKEN FOR SUBMISSION", selectedRecord.time_taken],
                                    ].map(([label, value], idx) => (
                                        <div key={idx} className="flex flex-col space-y-1">
                                            <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">{label}</span>
                                            <span className="font-medium">{value || "-"}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Section 3: Assignment & Status */}
                            <div className="border border-border rounded-xl shadow-sm bg-white">
                                <div className="px-6 py-3 border-b border-border bg-muted/40 rounded-t-xl">
                                    <h3 className="font-bold text-sm">Assignment & Status</h3>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-y-5 gap-x-4 p-6 text-sm">
                                    {[
                                        ["MEDIATOR", selectedRecord.mediator],
                                        ["ESTIMATOR", selectedRecord.estimator],
                                        ["SHRENO STATUS", selectedRecord.shreno_status],
                                        ["CLIENT STATUS", selectedRecord.client_status],
                                        ["MADE BY", selectedRecord.made_by],
                                        ["REMARK", selectedRecord.remark],
                                    ].map(([label, value], idx) => (
                                        <div key={idx} className="flex flex-col space-y-1">
                                            <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">{label}</span>
                                            <span className="font-medium">{(label === "SHRENO STATUS" || label === "CLIENT STATUS") ? <StatusBadge status={value} /> : (value || "-")}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Section 4: Enquiry Details Table */}
                            <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
                                <h3 className="px-6 py-3 font-bold text-sm bg-muted/40 border-b border-border">Enquiry Details</h3>
                                <table className="w-full border-collapse text-xs text-left">
                                    <thead>
                                        <tr className="bg-[#f4f4f5] border-b border-border">
                                            {["SR NO.", "ENQ. DESCRIPTION", "EQUIP. QTY", "REV.", "TOTAL VALUE", "PO NO.", "PO DATE", "PO VALUE", "REMARKS"].map((h) => (
                                                <th key={h} className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider last:border-r-0">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {!selectedRecord.items?.length ? (
                                            <tr>
                                                <td colSpan={9} className="p-4 text-center text-muted-foreground">
                                                    No enquiry items added.
                                                </td>
                                            </tr>
                                        ) : (
                                            selectedRecord.items.map((row) => (
                                                <tr key={row.id} className="hover:bg-muted/30 border-b border-border last:border-0">
                                                    <td className="border-r border-border p-3 align-top font-medium text-center">{row.sr_no || "-"}</td>
                                                    <td className="border-r border-border p-3 align-top">{row.enq_description || "-"}</td>
                                                    <td className="border-r border-border p-3 align-top text-center">{row.equip_qty || "-"}</td>
                                                    <td className="border-r border-border p-3 align-top text-center">{row.rev || "-"}</td>
                                                    <td className="border-r border-border p-3 align-top text-right">₹{row.total_value?.toLocaleString("en-IN") || "-"}</td>
                                                    <td className="border-r border-border p-3 align-top">{row.po_no || "-"}</td>
                                                    <td className="border-r border-border p-3 align-top">{row.po_date ? new Date(row.po_date).toLocaleDateString("en-GB") : "-"}</td>
                                                    <td className="border-r border-border p-3 align-top text-right">₹{row.po_value?.toLocaleString("en-IN") || "-"}</td>
                                                    <td className="p-3 align-top">{row.remarks || "-"}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ─── Create / Edit View ──────────────────────────────────────────────────────
function CreateView({ onBack, editId = null }) {
    const today = new Date().toLocaleDateString("en-GB", {
        day: "2-digit", month: "2-digit", year: "numeric",
    })

    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // ─── Dynamic dropdown options fetched from backend ──────────────────
    const [dropdownOptions, setDropdownOptions] = useState({
        rfqTypes: [],
        clientNames: [],
        modesOfEnquiry: [],
        mediators: [],
        estimators: [],
    })

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [rfqTypesRes, moeRes, estimatorsRes, mediatorsRes, customersRes] = await Promise.all([
                    apiClient.get("/api/rfq/lookups/rfq_type"),
                    apiClient.get("/api/rfq/lookups/mode_of_enquiry"),
                    apiClient.get("/api/rfq/estimators"),
                    apiClient.get("/api/rfq/mediators"),
                    apiClient.get("/api/common/customers"),
                ])
                setDropdownOptions({
                    rfqTypes: (rfqTypesRes.data || []).map((d) => d.name),
                    clientNames: (customersRes.data || []).map((c) => c.customer_name),
                    modesOfEnquiry: (moeRes.data || []).map((d) => d.name),
                    estimators: (estimatorsRes.data || []).map((u) => u.name),
                    mediators: (mediatorsRes.data || []).map((u) => u.name),
                })
            } catch (error) {
                console.error("Failed to load dropdown options:", error)
            }
        }
        fetchOptions()
    }, [])

    const [formData, setFormData] = useState(() => {
        const authData = localStorage.getItem("user_auth")
        const parsedAuth = authData ? JSON.parse(authData) : null
        const loggedInUser = parsedAuth?.user?.name || parsedAuth?.payload?.user?.name || ""
        const today = new Date().toISOString().split("T")[0]
        
        return {
            quotationNo: "",
            clientRef: "",
            rfqType: "",
            clientName: "",
            consultancy: "",
            contactPerson: "",
            modeOfEnquiry: "",
            enqDate: "",
            targetDate: today,
            actualSubmissionDate: "",
            timeTaken: "",
            mediator: "",
            estimator: "",
            shrenoStatus: "Quoted",
            clientStatus: "Under Review",
            remark: "",
            madeBy: loggedInUser,
        }
    })

    const [tableRows, setTableRows] = useState([
        { id: 1, srNo: 1, enqDescription: "", equipQty: "", rev: "", totalValue: "", poNo: "", poDate: "", poValue: "", remarks: "" },
    ])

    // Fetch next quotation number when creating (not editing)
    useEffect(() => {
        if (editId) return

        const fetchNextNo = async () => {
            try {
                const res = await apiClient.get("/api/rfq/next-quotation-no")
                if (res.success && res.data) {
                    setFormData((prev) => ({ ...prev, quotationNo: res.data.next_quotation_no }))
                }
            } catch (error) {
                console.error("Failed to fetch next quotation no:", error)
            }
        }
        fetchNextNo()
    }, [editId])

    // Fetch record data when editing
    useEffect(() => {
        if (!editId) return

        const fetchRecord = async () => {
            try {
                setLoading(true)
                const res = await apiClient.get(`/api/rfq/${editId}`)
                if (res.success && res.data) {
                    const r = res.data
                    setFormData({
                        quotationNo: r.quotation_no || "",
                        clientRef: r.client_ref || "",
                        rfqType: r.rfq_type || "",
                        clientName: r.client_name || "",
                        consultancy: r.consultancy || "",
                        contactPerson: r.contact_person || "",
                        modeOfEnquiry: r.mode_of_enquiry || "",
                        enqDate: r.enq_date ? r.enq_date.split("T")[0] : "",
                        targetDate: r.target_date ? r.target_date.split("T")[0] : "",
                        actualSubmissionDate: r.actual_submission_date ? r.actual_submission_date.split("T")[0] : "",
                        timeTaken: r.time_taken || "",
                        mediator: r.mediator || "",
                        estimator: r.estimator || "",
                        shrenoStatus: r.shreno_status || "Quoted",
                        clientStatus: r.client_status || "Under Review",
                        remark: r.remark || "",
                        madeBy: r.made_by || "",
                    })
                    if (r.items?.length) {
                        setTableRows(r.items.map((item, i) => ({
                            id: i + 1,
                            srNo: item.sr_no,
                            enqDescription: item.enq_description || "",
                            equipQty: item.equip_qty || "",
                            rev: item.rev || "",
                            totalValue: item.total_value || "",
                            poNo: item.po_no || "",
                            poDate: item.po_date ? item.po_date.split("T")[0] : "",
                            poValue: item.po_value || "",
                            remarks: item.remarks || "",
                        })))
                    }
                }
            } catch (error) {
                toast.error(error.message || "Failed to load record")
            } finally {
                setLoading(false)
            }
        }

        fetchRecord()
    }, [editId])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => {
            const updated = { ...prev, [name]: value }

            // Auto-calculate Target Date (+5 business days) when Enq. Date changes
            if (name === "enqDate" && value) {
                const enqDate = new Date(value)
                let count = 0
                const target = new Date(enqDate)
                while (count < 5) {
                    target.setDate(target.getDate() + 1)
                    const day = target.getDay()
                    if (day !== 0 && day !== 6) count++
                }
                updated.targetDate = target.toISOString().split("T")[0]
            }

            // Auto-calculate Time Taken when Actual Submission Date changes
            if ((name === "actualSubmissionDate" || name === "enqDate") && updated.enqDate && updated.actualSubmissionDate) {
                const start = new Date(updated.enqDate)
                const end = new Date(updated.actualSubmissionDate)
                const diffTime = Math.abs(end - start)
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                updated.timeTaken = `${diffDays} Days`
            }

            return updated
        })
    }

    const handleSelectChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleRowChange = (id, field, value) => {
        setTableRows(
            tableRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
        )
    }

    const addRow = () => {
        const newId = Math.max(...tableRows.map((r) => r.id), 0) + 1
        setTableRows([
            ...tableRows,
            { id: newId, srNo: newId, enqDescription: "", equipQty: "", rev: "", totalValue: "", poNo: "", poDate: "", poValue: "", remarks: "" },
        ])
    }

    const removeRow = (id) => {
        if (tableRows.length > 1) {
            setTableRows(tableRows.filter((row) => row.id !== id))
        }
    }

    const handleSubmit = async () => {
        try {
            setSubmitting(true)

            const payload = {
                client_ref: formData.clientRef,
                rfq_type: formData.rfqType,
                client_name: formData.clientName,
                consultancy: formData.consultancy,
                contact_person: formData.contactPerson,
                mode_of_enquiry: formData.modeOfEnquiry,
                enq_date: formData.enqDate || null,
                target_date: formData.targetDate || null,
                actual_submission_date: formData.actualSubmissionDate || null,
                time_taken: formData.timeTaken,
                mediator: formData.mediator,
                estimator: formData.estimator,
                shreno_status: formData.shrenoStatus || "Quoted",
                client_status: formData.clientStatus || "Under Review",
                remark: formData.remark,
                made_by: formData.madeBy,
                items: tableRows.map((row) => ({
                    sr_no: row.srNo,
                    enq_description: row.enqDescription,
                    equip_qty: row.equipQty,
                    rev: row.rev,
                    total_value: row.totalValue,
                    po_no: row.poNo,
                    po_date: row.poDate || null,
                    po_value: row.poValue,
                    remarks: row.remarks,
                })),
            }

            let res
            if (editId) {
                res = await apiClient.put(`/api/rfq/update/${editId}`, payload)
            } else {
                res = await apiClient.post("/api/rfq/create", payload)
            }

            if (res.success) {
                toast.success(editId ? "RFQ entry updated successfully!" : "RFQ entry created successfully!")
                onBack()
            }
        } catch (error) {
            toast.error(error.message || "Failed to save RFQ entry")
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground text-lg">Loading...</p>
            </div>
        )
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-1">{editId ? "Edit" : "Create"} RFQ Register Entry</h1>
                    <p className="text-muted-foreground">{editId ? "Update the details for this RFQ entry." : "Fill in the details for a new RFQ entry."}</p>
                </div>
                <Button variant="outline" onClick={onBack} className="h-9">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to List
                </Button>
            </div>

            {/* Card 1: Enquiry Information */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Enquiry Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="quotationNo">Quotation No.</Label>
                            <Input
                                id="quotationNo"
                                name="quotationNo"
                                type="text"
                                value={formData.quotationNo}
                                disabled={true}
                                placeholder="Auto-generated"
                                className="bg-muted"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="clientRef">Client Ref.</Label>
                            <Input
                                id="clientRef"
                                name="clientRef"
                                type="text"
                                value={formData.clientRef}
                                onChange={handleInputChange}
                                placeholder="Enter Client Reference"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="rfqType">RFQ Type</Label>
                            <Select value={formData.rfqType} onValueChange={(v) => handleSelectChange("rfqType", v)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select RFQ Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {dropdownOptions.rfqTypes.map((opt) => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="clientName">Client Name</Label>
                            <Select value={formData.clientName} onValueChange={(v) => handleSelectChange("clientName", v)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Client" />
                                </SelectTrigger>
                                <SelectContent>
                                    {dropdownOptions.clientNames.map((opt) => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="consultancy">Consultancy</Label>
                            <Input
                                id="consultancy"
                                name="consultancy"
                                type="text"
                                value={formData.consultancy}
                                onChange={handleInputChange}
                                placeholder="Enter Consultancy"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contactPerson">Contact Person</Label>
                            <Input
                                id="contactPerson"
                                name="contactPerson"
                                type="text"
                                value={formData.contactPerson}
                                onChange={handleInputChange}
                                placeholder="Enter Contact Person"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="modeOfEnquiry">Mode of Enquiry</Label>
                            <Select value={formData.modeOfEnquiry} onValueChange={(v) => handleSelectChange("modeOfEnquiry", v)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    {dropdownOptions.modesOfEnquiry.map((opt) => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="enqDate">Enq. Date</Label>
                            <Input
                                id="enqDate"
                                name="enqDate"
                                type="date"
                                value={formData.enqDate}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input
                                id="date"
                                type="text"
                                value={today}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Card 2: Submission Details */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Submission Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="targetDate">Target Date (+5 Working Days)</Label>
                            <Input
                                id="targetDate"
                                name="targetDate"
                                type="date"
                                value={formData.targetDate}
                                readOnly
                                className="bg-muted"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="actualSubmissionDate">Actual Submission Date</Label>
                            <Input
                                id="actualSubmissionDate"
                                name="actualSubmissionDate"
                                type="date"
                                value={formData.actualSubmissionDate}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="timeTaken">Time Taken for Submission</Label>
                            <Input
                                id="timeTaken"
                                name="timeTaken"
                                type="text"
                                value={formData.timeTaken}
                                readOnly
                                className="bg-muted"
                                placeholder="Auto-calculated"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Card 3: Assignment & Status */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Assignment & Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="mediator">Mediator</Label>
                            <Select value={formData.mediator} onValueChange={(v) => handleSelectChange("mediator", v)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Mediator" />
                                </SelectTrigger>
                                <SelectContent>
                                    {dropdownOptions.mediators.map((opt) => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="estimator">Estimator</Label>
                            <Select value={formData.estimator} onValueChange={(v) => handleSelectChange("estimator", v)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Estimator" />
                                </SelectTrigger>
                                <SelectContent>
                                    {dropdownOptions.estimators.map((opt) => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="shrenoStatus">Shreno Status</Label>
                            <Select value={formData.shrenoStatus} onValueChange={(v) => handleSelectChange("shrenoStatus", v)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SHRENO_STATUS_OPTIONS.map((opt) => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="clientStatus">Status at Client End</Label>
                            <Select value={formData.clientStatus} onValueChange={(v) => handleSelectChange("clientStatus", v)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Client Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CLIENT_STATUS_OPTIONS.map((opt) => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="madeBy">Made By</Label>
                            <Input
                                id="madeBy"
                                name="madeBy"
                                type="text"
                                value={formData.madeBy}
                                onChange={handleInputChange}
                                placeholder="Enter Made By"
                            />
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="remark">Remark</Label>
                            <Textarea
                                id="remark"
                                name="remark"
                                value={formData.remark}
                                onChange={handleInputChange}
                                placeholder="Enter Remark"
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Card 4: Enquiry Details Table */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Enquiry Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-blue-100">
                                    {["Sr. No.", "Enq. Description", "Equip. Qty", "Rev.", "Total Value", "PO No.", "PO Date", "PO Value", "Remarks", ""].map(
                                        (h, idx) => (
                                            <TableHead
                                                key={idx}
                                                className="text-red-600 font-semibold border border-gray-300 whitespace-nowrap"
                                            >
                                                {h}
                                            </TableHead>
                                        )
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tableRows.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="p-2 border border-gray-300 text-center w-16">
                                            <Input
                                                type="number"
                                                value={row.srNo}
                                                onChange={(e) => handleRowChange(row.id, "srNo", e.target.value)}
                                                className="w-full text-xs border-0 focus-visible:ring-0 text-center"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 border border-gray-300 min-w-[200px]">
                                            <Input
                                                type="text"
                                                value={row.enqDescription}
                                                onChange={(e) => handleRowChange(row.id, "enqDescription", e.target.value)}
                                                placeholder="Description"
                                                className="w-full text-xs border-0 focus-visible:ring-0"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 border border-gray-300 w-24">
                                            <Input
                                                type="number"
                                                value={row.equipQty}
                                                onChange={(e) => handleRowChange(row.id, "equipQty", e.target.value)}
                                                placeholder="Qty"
                                                className="w-full text-xs border-0 focus-visible:ring-0 text-center"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 border border-gray-300 w-20">
                                            <Input
                                                type="text"
                                                value={row.rev}
                                                onChange={(e) => handleRowChange(row.id, "rev", e.target.value)}
                                                placeholder="Rev."
                                                className="w-full text-xs border-0 focus-visible:ring-0 text-center"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 border border-gray-300 w-28">
                                            <Input
                                                type="number"
                                                value={row.totalValue}
                                                onChange={(e) => handleRowChange(row.id, "totalValue", e.target.value)}
                                                placeholder="Total Value"
                                                className="w-full text-xs border-0 focus-visible:ring-0 text-right"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 border border-gray-300 w-28">
                                            <Input
                                                type="text"
                                                value={row.poNo}
                                                onChange={(e) => handleRowChange(row.id, "poNo", e.target.value)}
                                                placeholder="PO No."
                                                className="w-full text-xs border-0 focus-visible:ring-0"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 border border-gray-300 w-32">
                                            <Input
                                                type="date"
                                                value={row.poDate}
                                                onChange={(e) => handleRowChange(row.id, "poDate", e.target.value)}
                                                className="w-full text-xs border-0 focus-visible:ring-0"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 border border-gray-300 w-28">
                                            <Input
                                                type="number"
                                                value={row.poValue}
                                                onChange={(e) => handleRowChange(row.id, "poValue", e.target.value)}
                                                placeholder="PO Value"
                                                className="w-full text-xs border-0 focus-visible:ring-0 text-right"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 border border-gray-300">
                                            <Input
                                                type="text"
                                                value={row.remarks}
                                                onChange={(e) => handleRowChange(row.id, "remarks", e.target.value)}
                                                placeholder="Remarks"
                                                className="w-full text-xs border-0 focus-visible:ring-0"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 border border-gray-300 text-center">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeRow(row.id)}
                                                disabled={tableRows.length === 1}
                                                title="Remove Row"
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <Button type="button" variant="outline" onClick={addRow} className="w-full sm:w-auto mt-2">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Row
                    </Button>
                </CardContent>
            </Card>

            {/* Submit / Cancel */}
            <div className="flex justify-end gap-4 mt-6">
                <Button onClick={onBack} variant="outline">Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting ? "Saving..." : editId ? "Update Entry" : "Submit Entry"}
                </Button>
            </div>
        </div>
    )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
function RfqRegister() {
    const [view, setView] = useState("list") // "list" | "create" | "edit"
    const [editId, setEditId] = useState(null)

    const handleEdit = (id) => {
        setEditId(id)
        setView("edit")
    }

    return (
        <>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                </header>
                <main className="flex-1 overflow-auto p-6 flex flex-col">
                    <div className="flex-1 flex flex-col w-full">
                        {view === "list" ? (
                            <ListView
                                onCreateClick={() => {
                                    setEditId(null)
                                    setView("create")
                                }}
                                onEditClick={handleEdit}
                            />
                        ) : (
                            <CreateView
                                onBack={() => {
                                    setView("list")
                                    setEditId(null)
                                }}
                                editId={editId}
                            />
                        )}
                    </div>
                </main>
        </>
    )
}

export default RfqRegister
