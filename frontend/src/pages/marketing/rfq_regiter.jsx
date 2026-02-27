import { useState, useCallback } from "react"
import { AdminSidebar } from "@/components"
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

// ─── Dummy Data ──────────────────────────────────────────────────────────────
// ─── Dropdown Options ────────────────────────────────────────────────────────
const RFQ_TYPE_OPTIONS = ["Dish End", "Cone", "Hemispherical Head", "Flat Cover", "Reducer", "Flange", "Shell", "Other"]
const CLIENT_NAME_OPTIONS = ["Reliance Industries Ltd.", "IOCL Paradip", "BPCL Mumbai Refinery", "L&T Hydrocarbon", "Thermax Ltd.", "HPCL", "GAIL", "ONGC", "Tata Projects", "Godrej & Boyce"]
const MODE_OF_ENQUIRY_OPTIONS = ["Email", "Phone", "Tender", "Portal", "Walk-in", "Reference"]
const MEDIATOR_OPTIONS = ["Mr. Patel", "Mr. Joshi", "Mr. Mehta", "Mr. Deshmukh", "Mr. Iyer", "Mrs. Kulkarni"]
const ESTIMATOR_OPTIONS = ["Mr. Gupta", "Mr. Singh", "Mr. Rao", "Mr. Kumar", "Mr. Nair", "Ms. Shah"]
const SHRENO_STATUS_OPTIONS = ["Pending", "In Progress", "Quoted", "Won", "Lost"]
const REMARK_OPTIONS = ["Urgent requirement", "Follow-up required", "Need drawings from client", "Waiting for approval", "Price negotiation", "Repeat order", "New client", "Budget enquiry", "Other"]

const DUMMY_RFQ_LIST = [
    {
        id: "1",
        quotation_no: "TFE/QTN/2026/001",
        client_ref: "RIL/ENQ/2026/045",
        rfq_type: "Dish End",
        client_name: "Reliance Industries Ltd.",
        project_name: "Jamnagar Refinery Expansion",
        consultancy: "Toyo Engineering",
        contact_person: "Mr. Sharma",
        mode_of_enquiry: "Email",
        enq_date: "2026-01-15",
        target_date: "2026-01-22",
        actual_submission_date: "2026-01-20",
        time_taken: "5 Days",
        mediator: "Mr. Patel",
        estimator: "Mr. Gupta",
        shreno_status: "Quoted",
        remark: "Urgent requirement",
        made_by: "Admin",
        items: [
            { id: 1, sr_no: 1, enq_description: "Dish End 2500mm OD x 16mm Thk SA516 Gr.70", equip_qty: 4, rev: "R0", total_value: 520000, po_no: "PO-2026-1001", po_date: "2026-02-01", po_value: 510000, remarks: "Confirmed" },
            { id: 2, sr_no: 2, enq_description: "Dish End 1800mm OD x 12mm Thk SA240 TP304", equip_qty: 2, rev: "R0", total_value: 380000, po_no: "PO-2026-1002", po_date: "2026-02-05", po_value: 375000, remarks: "Pending" },
            { id: 3, sr_no: 3, enq_description: "Cone Section 1500mm OD x 10mm Thk CS", equip_qty: 6, rev: "R1", total_value: 290000, po_no: "", po_date: "", po_value: 0, remarks: "Revision pending" },
        ],
    },
    {
        id: "2",
        quotation_no: "TFE/QTN/2026/002",
        client_ref: "IOCL/PP/ENQ/112",
        rfq_type: "Hemispherical Head",
        client_name: "IOCL Paradip",
        project_name: "Paradip Petrochemical Complex",
        consultancy: "EIL",
        contact_person: "Mr. Verma",
        mode_of_enquiry: "Phone",
        enq_date: "2026-01-20",
        target_date: "2026-01-27",
        actual_submission_date: "2026-01-26",
        time_taken: "6 Days",
        mediator: "Mr. Joshi",
        estimator: "Mr. Singh",
        shreno_status: "In Progress",
        remark: "",
        made_by: "Admin",
        items: [
            { id: 1, sr_no: 1, enq_description: "Hemispherical Head 3000mm OD x 20mm Thk SA516 Gr.70", equip_qty: 2, rev: "R0", total_value: 750000, po_no: "", po_date: "", po_value: 0, remarks: "" },
        ],
    },
    {
        id: "3",
        quotation_no: "TFE/QTN/2026/003",
        client_ref: "BPCL/IREP/RFQ/078",
        rfq_type: "Dish End",
        client_name: "BPCL Mumbai Refinery",
        project_name: "BPCL IREP Project",
        consultancy: "Jacobs",
        contact_person: "Mr. Desai",
        mode_of_enquiry: "Tender",
        enq_date: "2026-02-01",
        target_date: "2026-02-08",
        actual_submission_date: "",
        time_taken: "-",
        mediator: "Mr. Mehta",
        estimator: "Mr. Rao",
        shreno_status: "Pending",
        remark: "Need drawings from client",
        made_by: "Marketing",
        items: [
            { id: 1, sr_no: 1, enq_description: "Dish End 2000mm OD x 14mm Thk SA387 Gr.11", equip_qty: 8, rev: "R0", total_value: 960000, po_no: "", po_date: "", po_value: 0, remarks: "" },
            { id: 2, sr_no: 2, enq_description: "Flat Cover 1200mm OD x 25mm Thk SA516 Gr.70", equip_qty: 4, rev: "R0", total_value: 340000, po_no: "", po_date: "", po_value: 0, remarks: "" },
        ],
    },
    {
        id: "4",
        quotation_no: "TFE/QTN/2026/004",
        client_ref: "LT/HC/ENQ/2026/034",
        rfq_type: "Dish End",
        client_name: "L&T Hydrocarbon",
        project_name: "HPCL Rajasthan Refinery",
        consultancy: "L&T",
        contact_person: "Mr. Kulkarni",
        mode_of_enquiry: "Email",
        enq_date: "2026-02-10",
        target_date: "2026-02-17",
        actual_submission_date: "2026-02-15",
        time_taken: "5 Days",
        mediator: "Mr. Patel",
        estimator: "Mr. Gupta",
        shreno_status: "Quoted",
        remark: "Follow-up required",
        made_by: "Admin",
        items: [
            { id: 1, sr_no: 1, enq_description: "Dish End 1600mm OD x 10mm Thk SA240 TP316L", equip_qty: 10, rev: "R0", total_value: 450000, po_no: "PO-2026-2001", po_date: "2026-02-25", po_value: 440000, remarks: "Confirmed" },
        ],
    },
    {
        id: "5",
        quotation_no: "TFE/QTN/2026/005",
        client_ref: "TMX/BOILER/RFQ/009",
        rfq_type: "Cone",
        client_name: "Thermax Ltd.",
        project_name: "Boiler Components",
        consultancy: "In-house",
        contact_person: "Mrs. Patil",
        mode_of_enquiry: "Portal",
        enq_date: "2026-02-18",
        target_date: "2026-02-25",
        actual_submission_date: "",
        time_taken: "-",
        mediator: "Mr. Joshi",
        estimator: "Mr. Singh",
        shreno_status: "Pending",
        remark: "",
        made_by: "Marketing",
        items: [
            { id: 1, sr_no: 1, enq_description: "Ellipsoidal Head 900mm OD x 8mm Thk SA516 Gr.60", equip_qty: 20, rev: "R0", total_value: 600000, po_no: "", po_date: "", po_value: 0, remarks: "" },
            { id: 2, sr_no: 2, enq_description: "Dish End 1100mm OD x 6mm Thk SA516 Gr.60", equip_qty: 15, rev: "R0", total_value: 375000, po_no: "", po_date: "", po_value: 0, remarks: "" },
            { id: 3, sr_no: 3, enq_description: "Reducer Section 800-600mm x 6mm Thk CS", equip_qty: 10, rev: "R0", total_value: 220000, po_no: "", po_date: "", po_value: 0, remarks: "" },
        ],
    },
]

// ─── Status badge helper ─────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const colors = {
        "Quoted": "bg-green-100 text-green-700 border-green-300",
        "In Progress": "bg-yellow-100 text-yellow-700 border-yellow-300",
        "Pending": "bg-orange-100 text-orange-700 border-orange-300",
        "Lost": "bg-red-100 text-red-700 border-red-300",
        "Won": "bg-blue-100 text-blue-700 border-blue-300",
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status] || "bg-gray-100 text-gray-700 border-gray-300"}`}>
            {status}
        </span>
    )
}

// ─── List View ───────────────────────────────────────────────────────────────
function ListView({ onCreateClick, onEditClick }) {
    const [isViewOpen, setIsViewOpen] = useState(false)
    const [selectedRecord, setSelectedRecord] = useState(null)

    const handleViewClick = (id) => {
        const record = DUMMY_RFQ_LIST.find((r) => r.id === id)
        if (record) {
            setSelectedRecord(record)
            setIsViewOpen(true)
        }
    }

    const columns = [
        { header: "Quotation No.", accessorKey: "quotation_no" },
        { header: "Client Name", accessorKey: "client_name" },
        { header: "Project Name", accessorKey: "project_name" },
        { header: "Consultancy", accessorKey: "consultancy" },
        { header: "Mode", accessorKey: "mode_of_enquiry" },
        {
            header: "Enq. Date",
            accessorKey: "enq_date",
            cell: (row) => row.enq_date ? new Date(row.enq_date).toLocaleDateString("en-GB") : "-",
        },
        { header: "Estimator", accessorKey: "estimator" },
        {
            header: "Status",
            accessorKey: "shreno_status",
            cell: (row) => <StatusBadge status={row.shreno_status} />,
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
                </div>
            ),
        },
    ]

    // Dummy fetch returning our static data
    const fetchData = useCallback(async ({ page, limit, search }) => {
        let filtered = DUMMY_RFQ_LIST
        if (search) {
            const q = search.toLowerCase()
            filtered = DUMMY_RFQ_LIST.filter(
                (r) =>
                    r.quotation_no.toLowerCase().includes(q) ||
                    r.client_name.toLowerCase().includes(q) ||
                    r.project_name.toLowerCase().includes(q) ||
                    r.estimator.toLowerCase().includes(q)
            )
        }
        return {
            data: filtered.slice((page - 1) * limit, page * limit),
            meta: { total: filtered.length, page, limit },
        }
    }, [])

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

            <DataTable columns={columns} fetchData={fetchData} />

            {/* View Details Modal */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="sm:max-w-[95vw] w-full max-h-[95vh] overflow-y-auto p-6">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl font-bold text-center">RFQ Register Details</DialogTitle>
                        <DialogDescription className="text-center">
                            Complete details of the selected RFQ record.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedRecord && (
                        <div className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-6 gap-x-4 text-sm border border-border p-6 bg-white rounded-xl shadow-sm">
                                <div className="flex flex-col space-y-1">
                                    <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">QUOTATION NO.:</span>
                                    <span className="font-medium">{selectedRecord.quotation_no || "-"}</span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">CLIENT NAME:</span>
                                    <span className="font-medium">{selectedRecord.client_name || "-"}</span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">PROJECT NAME:</span>
                                    <span className="font-medium">{selectedRecord.project_name || "-"}</span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">CONSULTANCY:</span>
                                    <span className="font-medium">{selectedRecord.consultancy || "-"}</span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">CONTACT PERSON:</span>
                                    <span className="font-medium">{selectedRecord.contact_person || "-"}</span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">MODE OF ENQUIRY:</span>
                                    <span className="font-medium">{selectedRecord.mode_of_enquiry || "-"}</span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">ENQ. DATE:</span>
                                    <span className="font-medium">{selectedRecord.enq_date ? new Date(selectedRecord.enq_date).toLocaleDateString("en-GB") : "-"}</span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">TARGET DATE:</span>
                                    <span className="font-medium">{selectedRecord.target_date ? new Date(selectedRecord.target_date).toLocaleDateString("en-GB") : "-"}</span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">ACTUAL SUBMISSION:</span>
                                    <span className="font-medium">{selectedRecord.actual_submission_date ? new Date(selectedRecord.actual_submission_date).toLocaleDateString("en-GB") : "-"}</span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">TIME TAKEN:</span>
                                    <span className="font-medium">{selectedRecord.time_taken || "-"}</span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">MEDIATOR:</span>
                                    <span className="font-medium">{selectedRecord.mediator || "-"}</span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">ESTIMATOR:</span>
                                    <span className="font-medium">{selectedRecord.estimator || "-"}</span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">SHRENO STATUS:</span>
                                    <StatusBadge status={selectedRecord.shreno_status} />
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">MADE BY:</span>
                                    <span className="font-medium">{selectedRecord.made_by || "-"}</span>
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">REMARK:</span>
                                    <span className="font-medium">{selectedRecord.remark || "-"}</span>
                                </div>
                            </div>

                            {/* Enquiry Items Table */}
                            <div className="overflow-x-auto rounded-md border border-border">
                                <h3 className="p-3 font-bold text-sm bg-muted/40 border-b border-border">Enquiry Details</h3>
                                <table className="w-full border-collapse text-xs text-left">
                                    <thead>
                                        <tr className="bg-blue-100 border-b border-border">
                                            <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider text-red-600">SR NO.</th>
                                            <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider text-red-600">ENQ. DESCRIPTION</th>
                                            <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider text-red-600">EQUIP. QTY</th>
                                            <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider text-red-600">REV.</th>
                                            <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider text-red-600">TOTAL VALUE</th>
                                            <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider text-red-600">PO NO.</th>
                                            <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider text-red-600">PO DATE</th>
                                            <th className="border-r border-border p-3 font-bold text-[11px] uppercase tracking-wider text-red-600">PO VALUE</th>
                                            <th className="p-3 font-bold text-[11px] uppercase tracking-wider text-red-600">REMARKS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(!selectedRecord.items || selectedRecord.items.length === 0) ? (
                                            <tr>
                                                <td colSpan={9} className="border border-border p-4 text-center">
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

    // Pre-fill for edit mode or use empty for create
    const editRecord = editId ? DUMMY_RFQ_LIST.find((r) => r.id === editId) : null

    const [formData, setFormData] = useState({
        quotationNo: editRecord?.quotation_no || "",
        clientRef: editRecord?.client_ref || "",
        rfqType: editRecord?.rfq_type || "",
        clientName: editRecord?.client_name || "",
        projectName: editRecord?.project_name || "",
        consultancy: editRecord?.consultancy || "",
        contactPerson: editRecord?.contact_person || "",
        modeOfEnquiry: editRecord?.mode_of_enquiry || "",
        enqDate: editRecord?.enq_date || "",
        targetDate: editRecord?.target_date || "",
        actualSubmissionDate: editRecord?.actual_submission_date || "",
        timeTaken: editRecord?.time_taken || "",
        mediator: editRecord?.mediator || "",
        estimator: editRecord?.estimator || "",
        shrenoStatus: editRecord?.shreno_status || "",
        remark: editRecord?.remark || "",
        madeBy: editRecord?.made_by || "",
    })

    const [tableRows, setTableRows] = useState(
        editRecord?.items?.map((item, i) => ({
            id: i + 1,
            srNo: item.sr_no,
            enqDescription: item.enq_description,
            equipQty: item.equip_qty,
            rev: item.rev,
            totalValue: item.total_value,
            poNo: item.po_no,
            poDate: item.po_date,
            poValue: item.po_value,
            remarks: item.remarks,
        })) || [
            { id: 1, srNo: 1, enqDescription: "", equipQty: "", rev: "", totalValue: "", poNo: "", poDate: "", poValue: "", remarks: "" },
        ]
    )

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

    const handleSubmit = () => {
        alert("Wireframe — Submit clicked!\n\nForm Data:\n" + JSON.stringify(formData, null, 2) + "\n\nItems:\n" + JSON.stringify(tableRows, null, 2))
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
                                onChange={handleInputChange}
                                placeholder="TFE/QTN/2026/___"
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
                                    {RFQ_TYPE_OPTIONS.map((opt) => (
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
                                    {CLIENT_NAME_OPTIONS.map((opt) => (
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
                                    {MODE_OF_ENQUIRY_OPTIONS.map((opt) => (
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
                                    {MEDIATOR_OPTIONS.map((opt) => (
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
                                    {ESTIMATOR_OPTIONS.map((opt) => (
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
                            <Select value={formData.remark} onValueChange={(v) => handleSelectChange("remark", v)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Remark" />
                                </SelectTrigger>
                                <SelectContent>
                                    {REMARK_OPTIONS.map((opt) => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Card 4: Enquiry Details Table */}
            <Card className="mb-6 w-full overflow-hidden">
                <CardHeader>
                    <CardTitle>Enquiry Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex flex-col gap-4 w-full">
                    <div className="rounded-md border overflow-x-auto">
                        <Table className="min-w-[1400px]">
                            <TableHeader>
                                <TableRow className="bg-blue-100">
                                    <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300 w-16 text-center">
                                        SR NO.
                                    </TableHead>
                                    <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300 min-w-[280px]">
                                        ENQ. DESCRIPTION
                                    </TableHead>
                                    <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300 w-24 text-center">
                                        EQUIP. QTY
                                    </TableHead>
                                    <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300 w-20 text-center">
                                        REV.
                                    </TableHead>
                                    <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300 w-32 text-right">
                                        TOTAL VALUE
                                    </TableHead>
                                    <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300 w-32">
                                        PO NO.
                                    </TableHead>
                                    <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300 w-32">
                                        PO DATE
                                    </TableHead>
                                    <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300 w-32 text-right">
                                        PO VALUE
                                    </TableHead>
                                    <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300">
                                        REMARKS
                                    </TableHead>
                                    <TableHead className="p-2 text-xs font-bold uppercase text-red-600 border border-gray-300 w-[80px] text-center">
                                        ACTIONS
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tableRows.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="p-2 border border-gray-300 text-center">
                                            <div className="text-sm font-medium">{row.srNo}</div>
                                        </TableCell>
                                        <TableCell className="p-2 border border-gray-300">
                                            <Input
                                                type="text"
                                                value={row.enqDescription}
                                                onChange={(e) => handleRowChange(row.id, "enqDescription", e.target.value)}
                                                placeholder="Enquiry Description"
                                                className="w-full text-xs border-0 focus-visible:ring-0"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 border border-gray-300">
                                            <Input
                                                type="number"
                                                value={row.equipQty}
                                                onChange={(e) => handleRowChange(row.id, "equipQty", e.target.value)}
                                                placeholder="Qty"
                                                className="w-full text-xs border-0 focus-visible:ring-0 text-center"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 border border-gray-300">
                                            <Input
                                                type="text"
                                                value={row.rev}
                                                onChange={(e) => handleRowChange(row.id, "rev", e.target.value)}
                                                placeholder="Rev"
                                                className="w-full text-xs border-0 focus-visible:ring-0 text-center"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 border border-gray-300">
                                            <Input
                                                type="number"
                                                value={row.totalValue}
                                                onChange={(e) => handleRowChange(row.id, "totalValue", e.target.value)}
                                                placeholder="Total Value"
                                                className="w-full text-xs border-0 focus-visible:ring-0 text-right"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 border border-gray-300">
                                            <Input
                                                type="text"
                                                value={row.poNo}
                                                onChange={(e) => handleRowChange(row.id, "poNo", e.target.value)}
                                                placeholder="PO No."
                                                className="w-full text-xs border-0 focus-visible:ring-0"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 border border-gray-300">
                                            <Input
                                                type="date"
                                                value={row.poDate}
                                                onChange={(e) => handleRowChange(row.id, "poDate", e.target.value)}
                                                className="w-full text-xs border-0 focus-visible:ring-0"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 border border-gray-300">
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
                <Button onClick={handleSubmit}>
                    {editId ? "Update Entry" : "Submit Entry"}
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
        <SidebarProvider>
            <AdminSidebar />
            <SidebarInset>
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
            </SidebarInset>
        </SidebarProvider>
    )
}

export default RfqRegister
