import { PageContainer } from "@/components/layout/PageContainer";
import { useState, useCallback, useEffect } from "react"

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
import { Plus, Trash2, ArrowLeft, Eye, Edit, Upload, X, FileText, Paperclip, Archive, CheckCircle, XCircle } from "lucide-react"
import ProDataTable from "@/components/shared/ProDataTable"
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"
import ImportReviewDialog from "@/components/shared/ImportReviewDialog"
import { generateExcelTemplate, parseExcelFile } from "@/utils/excelImportEngine"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"
import { toast } from "react-toastify"
import { DocumentPreviewDialog } from "@/components/shared/DocumentPreviewDialog"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/context/AuthContext"

const QUOTATION_CATEGORIES = [
    { value: "MKT", label: "Core - MKT" },
    { value: "SPR", label: "Spare - SPR" },
    { value: "ES", label: "Core - ES" },
];

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
function ListView({ onCreateClick, onEditClick, onAttachmentsClick, onViewClick }) {
    const [refreshKey, setRefreshKey] = useState(0)

    // Advanced Cascading Filters State (Used for Quotation No. text filter)
    const [columnFilters, setColumnFilters] = useState({ is_active: ['true'] })
    const { roles } = useAuth();
    const isAdmin = roles?.includes("ADMIN");

    const [confirmData, setConfirmData] = useState({ isOpen: false, title: "", description: "", confirmText: "", variant: "danger", onConfirm: null, isLoading: false });

    // Dynamic Filter Options State
    const [dropdownOptions, setDropdownOptions] = useState({
        rfqTypes: [],
        clientNames: [],
        modesOfEnquiry: [],
        estimators: [],
        consultancies: [],
        quotationNos: []
    })

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [rfqTypesRes, moeRes, estimatorsRes, customersRes, uniqueFiltersRes] = await Promise.all([
                    apiClient.get("/api/rfq/lookups/rfq_type"),
                    apiClient.get("/api/rfq/lookups/mode_of_enquiry"),
                    apiClient.get("/api/rfq/estimators"),
                    apiClient.get("/api/common/customers"),
                    apiClient.get("/api/rfq/list/unique-filters"),
                ])
                
                // Use client names mapped directly from rfq_register for accurate filtering
                // Fallback to customer master list if rfq_register is empty
                const actualClients = uniqueFiltersRes.data?.clientNames || [];
                const clientOptions = actualClients.length > 0 
                    ? actualClients.map(c => ({ label: c, value: c }))
                    : (customersRes.data || []).map(c => ({ label: c.customer_name, value: c.customer_name }));

                setDropdownOptions({
                    rfqTypes: (rfqTypesRes.data || []).map((d) => ({ label: d.name, value: d.name })),
                    clientNames: clientOptions,
                    modesOfEnquiry: (moeRes.data || []).map((d) => ({ label: d.name, value: d.name })),
                    estimators: (estimatorsRes.data || []).map((u) => ({ label: u.name, value: u.name })),
                    consultancies: (uniqueFiltersRes.data?.consultancies || []).map((c) => ({ label: c, value: c })),
                    quotationNos: (uniqueFiltersRes.data?.quotationNos || []).map((q) => ({ label: q, value: q })),
                })
            } catch (error) {
                console.error("Failed to load list filters:", error)
            }
        }
        fetchOptions()
    }, [])

    // Bulk Import State
    const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
    const [excelData, setExcelData] = useState([]);
    const [isImporting, setIsImporting] = useState(false);

    // Bulk Priority State
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [bulkPriorityDialogOpen, setBulkPriorityDialogOpen] = useState(false);
    const [selectedPriority, setSelectedPriority] = useState("");
    const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);

    const handleBulkPriorityUpdate = async () => {
        if (!selectedPriority) {
            toast.error("Please select a priority");
            return;
        }

        const rfqIds = Array.from(selectedRows);
        setIsUpdatingPriority(true);
        try {
            const res = await apiClient.patch("/api/rfq/bulk-priority", {
                rfqIds,
                priority: selectedPriority
            });
            if (res.success) {
                toast.success(res.message);
                setBulkPriorityDialogOpen(false);
                setSelectedRows(new Set());
                setSelectedPriority("");
                setRefreshKey(prev => prev + 1);
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error(error.message || "Failed to update priorities");
        } finally {
            setIsUpdatingPriority(false);
        }
    };

    const handleToggleStatus = async (row) => {
        setConfirmData({
            isOpen: true,
            title: `${row.is_active ? 'Deactivate' : 'Activate'} RFQ Record`,
            description: `Are you sure you want to ${row.is_active ? 'deactivate' : 'activate'} quotation ${row.quotation_no}?`,
            confirmText: row.is_active ? 'Deactivate' : 'Activate',
            variant: 'warning',
            onConfirm: async () => {
                try {
                    setConfirmData(prev => ({ ...prev, isLoading: true }))
                    const res = await apiClient.patch(`/api/rfq/toggle-status/${row.id}`)
                    if (res.success) {
                        toast.success(res.message)
                        setRefreshKey(prev => prev + 1)
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
            title: 'Archive RFQ Record',
            description: `Are you sure you want to archive quotation ${row.quotation_no}? This action is irreversible.`,
            confirmText: 'Archive',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    setConfirmData(prev => ({ ...prev, isLoading: true }))
                    const res = await apiClient.delete(`/api/rfq/archive/${row.id}`)
                    if (res.success) {
                        toast.success(res.message)
                        setRefreshKey(prev => prev + 1)
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

    const columns = [
        {
            header: "Priority",
            accessorKey: "priority",
            filterType: "select",
            isMulti: true,
            filterOptions: [
                { label: "High", value: "High" },
                { label: "Low", value: "Low" }
            ],
            cell: (row) => (
                <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${row.priority === 'High' ? 'bg-red-500' : 'bg-slate-300'}`} />
                    <span className={`text-[10px] font-semibold ${row.priority === 'High' ? 'text-red-600' : 'text-slate-500'}`}>
                        {row.priority || "Low"}
                    </span>
                </div>
            )
        },
        { 
            header: "Quotation No.", 
            accessorKey: "quotation_no", 
            filterType: "select",
            isMulti: true,
            filterOptions: dropdownOptions.quotationNos 
        },
        {
            header: "Quotation Category",
            accessorKey: "quotation_category",
            filterType: "select",
            isMulti: true,
            filterOptions: QUOTATION_CATEGORIES,
            cell: (row) => {
                const cat = QUOTATION_CATEGORIES.find(c => c.value === row.quotation_category);
                return cat ? cat.label : row.quotation_category;
            }
        },
        { 
            header: "Client Name", 
            accessorKey: "client_name", 
            filterType: "select",
            isMulti: true,
            filterOptions: dropdownOptions.clientNames 
        },
        { 
            header: "RFQ Type", 
            accessorKey: "rfq_type", 
            filterType: "select",
            isMulti: true,
            filterOptions: dropdownOptions.rfqTypes
        },
        { 
            header: "Consultancy", 
            accessorKey: "consultancy", 
            filterType: "select",
            isMulti: true,
            filterOptions: dropdownOptions.consultancies 
        },
        { 
            header: "Mode", 
            accessorKey: "mode_of_enquiry", 
            filterType: "select",
            isMulti: true,
            filterOptions: dropdownOptions.modesOfEnquiry
        },
        {
            header: "Enq. Date",
            accessorKey: "enq_date",
            cell: (row) => row.enq_date ? new Date(row.enq_date).toLocaleDateString("en-GB") : "-",
        },
        { 
            header: "Estimator", 
            accessorKey: "estimator", 
            filterType: "select",
            isMulti: true,
            filterOptions: dropdownOptions.estimators
        },
        {
            header: "Shreno Status",
            accessorKey: "shreno_status",
            filterType: "select",
            isMulti: true,
            filterOptions: SHRENO_STATUS_OPTIONS.map(s => ({ label: s, value: s })),
            cell: (row) => <StatusBadge status={row.shreno_status} />,
        },
        {
            header: "Client Status",
            accessorKey: "client_status",
            filterType: "select",
            isMulti: true,
            filterOptions: CLIENT_STATUS_OPTIONS.map(s => ({ label: s, value: s })),
            cell: (row) => <StatusBadge status={row.client_status} />,
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
                    onClick: () => onViewClick(row.id)
                });
                actions.push({
                    label: "Attachments",
                    icon: Paperclip,
                    onClick: () => onAttachmentsClick(row.id)
                });
                actions.push({
                    label: "Edit",
                    icon: Edit,
                    onClick: () => onEditClick(row.id)
                });
                
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
    ]

    // Real API fetch for ProDataTable
    const fetchData = useCallback(async (params) => {
        const queryParams = { ...params };
        if (queryParams.columnFilters) {
            // Process specialized filters (e.g. shreno_status -> shreno_status_filter)
            const cf = queryParams.columnFilters;
            const finalFilters = {};
            Object.keys(cf).forEach(key => {
                if (cf[key]) finalFilters[`${key}_filter`] = cf[key];
            });
            Object.assign(queryParams, finalFilters);
            delete queryParams.columnFilters;
        }

        const res = await apiClient.get("/api/rfq/list", queryParams)
        return { data: res.data || [], meta: res.meta || {} }
    }, [refreshKey])

    const handleDownloadTemplate = () => {
        const headers = [
            [
                "Quotation Category (MKT / ES / SPR)*",
                "Client Name*",
                "Client Ref.",
                "RFQ Type (Material / Service / etc.)",
                "Consultancy",
                "Contact Person",
                "Mode of Enquiry (Email / Phone / etc.)",
                "Enquiry Date (DD/MM/YYYY)",
                "Client Target Date (DD/MM/YYYY)",
                "Actual Submission Date (DD/MM/YYYY)",
                "Mediator",
                "Estimator",
                "Shreno Status (Quoted / Tech. Submitted / Under Review / Hold / Cancel / Duplicate / Regret)",
                "Status at Client End (Regret / Lost / Ongoing / Order Received / Under Review / Cancel)",
                "PO No.",
                "PO Date (DD/MM/YYYY)",
                "PO Value",
                "PO Remark",
                "Made By",
                "Remark",
                "Enquiry Description",
                "Equipment Qty",
                "Revision (Rev.)",
                "Item Total Value"
            ],
            [
                "Core",
                "Sample Client Ltd",
                "REF-101",
                "Material",
                "ABC Consultants",
                "Mr. Robert",
                "Email",
                "24/04/2026",
                "30/04/2026",
                "28/04/2026",
                "Mediator A",
                "Estimator B",
                "Quoted",
                "Under Review",
                "PO-999",
                "01/05/2026",
                "50000",
                "Standard PO",
                "Admin",
                "General Remark",
                "Detailed Enquiry for pressure vessel",
                "5",
                "0",
                "250000"
            ]
        ];
        generateExcelTemplate(headers, "RFQ_Detailed_Import_Template.xlsx", "RFQ_Template");
    };

    const handleImportExcel = useCallback(async (file) => {
        if (!file) return;
        try {
            // Using a broader header identification to match the hybrid headers
            const { rows, warning } = await parseExcelFile(file, [
                "quotation category*",
                "quotation category",
                "client name*",
                "category"
            ]);
            if (warning) toast.warn(warning);

            const parsedData = rows.map((row, idx) => {
                const quotation_category = String(row[0] || "").trim();
                const client_name = String(row[1] || "").trim();
                const client_ref = String(row[2] || "").trim();
                const rfq_type = String(row[3] || "").trim();
                const consultancy = String(row[4] || "").trim();
                const contact_person = String(row[5] || "").trim();
                const mode_of_enquiry = String(row[6] || "").trim();
                const enq_date_str = String(row[7] || "").trim();
                const target_date_str = String(row[8] || "").trim();
                const actual_submission_date_str = String(row[9] || "").trim();
                const mediator = String(row[10] || "").trim();
                const estimator = String(row[11] || "").trim();
                const shreno_status = String(row[12] || "").trim();
                const client_status = String(row[13] || "").trim();
                const po_no = String(row[14] || "").trim();
                const po_date_str = String(row[15] || "").trim();
                const po_value = String(row[16] || "").trim();
                const po_remark = String(row[17] || "").trim();
                const made_by = String(row[18] || "").trim();
                const remark = String(row[19] || "").trim();
                const enq_description = String(row[20] || "").trim();
                const equip_qty = String(row[21] || "").trim();
                const rev = String(row[22] || "").trim();
                const total_value = String(row[23] || "").trim();

                // Validation
                const errors = [];
                if (!client_name) errors.push("Client Name is required");
                if (!quotation_category) errors.push("Category is required");
                if (quotation_category && !QUOTATION_CATEGORIES.some(c => c.value === quotation_category)) {
                    errors.push(`Category must be one of: ${QUOTATION_CATEGORIES.map(c => c.value).join(', ')}`);
                }

                const warnings = [];
                if (shreno_status !== "Order Received" && (po_no || po_value || po_date_str)) {
                    warnings.push("PO data ignored (Status is not 'Order Received')");
                }
                // Also check client_status as backup
                if (client_status !== "Order Received" && (po_no || po_value || po_date_str) && !warnings.length) {
                    warnings.push("PO data ignored (Status is not 'Order Received')");
                }

                // Simple date parse helper - handles DD/MM/YYYY
                const parseDate = (dStr) => {
                    if (!dStr) return null;
                    const parts = dStr.split("/");
                    if (parts.length === 3) {
                        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                    }
                    const d = new Date(dStr);
                    return isNaN(d.getTime()) ? null : d;
                };

                // Calculate timeTaken if dates are present
                let timeTaken = "";
                const eDate = parseDate(enq_date_str);
                const aDate = parseDate(actual_submission_date_str);
                if (eDate && aDate) {
                    const diffTime = Math.abs(aDate - eDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    timeTaken = `${diffDays} Days`;
                }

                return {
                    quotation_category,
                    client_name,
                    client_ref,
                    rfq_type,
                    consultancy,
                    contact_person,
                    mode_of_enquiry,
                    enq_date: eDate,
                    target_date: parseDate(target_date_str),
                    actual_submission_date: aDate,
                    time_taken: timeTaken,
                    mediator,
                    estimator,
                    shreno_status: shreno_status || "Quoted",
                    client_status: client_status || "Under Review",
                    po_no,
                    po_date: parseDate(po_date_str),
                    po_value,
                    po_remark,
                    made_by,
                    remark,
                    enq_description,
                    equip_qty,
                    rev,
                    total_value,
                    status: errors.length > 0 ? "error" : "valid",
                    message: [...errors, ...warnings].join(" | ") || "Ready"
                };
            }).filter(r => r.client_name || r.quotation_category);

            if (parsedData.length === 0) {
                toast.warn("No valid records found in file.");
                return;
            }

            setExcelData(parsedData);
            setBulkImportDialogOpen(true);
        } catch (err) {
            toast.error(err.message);
        }
    }, []);

    const confirmBulkImport = async () => {
        setIsImporting(true);
        const validData = excelData.filter(r => r.status === 'valid');
        if (validData.length === 0) {
            toast.info("No valid records to import.");
            setIsImporting(false);
            return;
        }

        try {
            const res = await apiClient.post("/api/rfq/bulk-create", validData);
            if (res.success) {
                toast.success(res.message || "Bulk import completed successfully");
                setBulkImportDialogOpen(false);
                setRefreshKey(prev => prev + 1);
            } else {
                toast.error(res.message || "Failed to complete bulk import");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to save RFQ records");
        } finally {
            setIsImporting(false);
        }
    };

    const handleExport = async () => {
        try {
            await exportApi.exportModule('rfq_register');
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error("RFQ Export failed:", error);
        }
    };

    const renderCustomToolbarActions = () => {
        if (selectedRows.size === 0) return null;
        return (
            <Button
                variant="default"
                size="sm"
                onClick={() => setBulkPriorityDialogOpen(true)}
                className="h-9 text-white font-medium shadow-none rounded-md cursor-pointer"
            >
                Set Priority ({selectedRows.size})
            </Button>
        );
    };

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <ProDataTable
                columns={columns}
                fetchData={fetchData}
                onAdd={onCreateClick}
                onExport={handleExport}
                onImport={handleImportExcel}
                onDownloadTemplate={handleDownloadTemplate}
                columnFilters={columnFilters}
                onAddTooltip="Create New"
                onFilterChange={(newFilters) => setColumnFilters(prev => ({ ...prev, ...newFilters }))}
                selectedRows={selectedRows}
                onSelectionChange={setSelectedRows}
                customToolbarActions={renderCustomToolbarActions()}
            />

            <ImportReviewDialog
                open={bulkImportDialogOpen}
                onOpenChange={setBulkImportDialogOpen}
                data={excelData}
                totalCount={excelData.length}
                validCount={excelData.filter(r => r.status === 'valid').length}
                errorCount={excelData.filter(r => r.status === 'error').length}
                columns={[
                    { header: "Category", key: "quotation_category", minWidth: "100px" },
                    { header: "Client Name", key: "client_name", minWidth: "150px" },
                    { header: "Client Ref.", key: "client_ref", minWidth: "120px" },
                    { header: "RFQ Type", key: "rfq_type", minWidth: "100px" },
                    { header: "Consultancy", key: "consultancy", minWidth: "150px" },
                    { header: "Contact Person", key: "contact_person", minWidth: "120px" },
                    { header: "Mode", key: "mode_of_enquiry", minWidth: "100px" },
                    { header: "Enq Date", key: "enq_date", minWidth: "100px", render: (r) => r.enq_date ? new Date(r.enq_date).toLocaleDateString("en-GB") : "-" },
                    { header: "Target Date", key: "target_date", minWidth: "100px", render: (r) => r.target_date ? new Date(r.target_date).toLocaleDateString("en-GB") : "-" },
                    { header: "Submission", key: "actual_submission_date", minWidth: "100px", render: (r) => r.actual_submission_date ? new Date(r.actual_submission_date).toLocaleDateString("en-GB") : "-" },
                    { header: "Time Taken", key: "time_taken", minWidth: "100px" },
                    { header: "Mediator", key: "mediator", minWidth: "120px" },
                    { header: "Estimator", key: "estimator", minWidth: "120px" },
                    { header: "Shreno Status", key: "shreno_status", minWidth: "120px" },
                    { header: "Client Status", key: "client_status", minWidth: "120px" },
                    { header: "PO No.", key: "po_no", minWidth: "120px" },
                    { header: "PO Date", key: "po_date", minWidth: "100px", render: (r) => r.po_date ? new Date(r.po_date).toLocaleDateString("en-GB") : "-" },
                    { header: "PO Value", key: "po_value", minWidth: "100px" },
                    { header: "PO Remark", key: "po_remark", minWidth: "150px" },
                    { header: "Made By", key: "made_by", minWidth: "120px" },
                    { header: "General Remark", key: "remark", minWidth: "150px" },
                    { header: "Enq Description", key: "enq_description", minWidth: "200px" },
                    { header: "Qty", key: "equip_qty", minWidth: "80px" },
                    { header: "Rev", key: "rev", minWidth: "80px" },
                    { header: "Total Value", key: "total_value", minWidth: "100px" },
                ]}
                onConfirm={confirmBulkImport}
                isImporting={isImporting}
                confirmLabel={`Import (${excelData.filter(r => r.status === 'valid').length} Rows)`}
                title="Review RFQ Import"
                description="Please review the RFQ records from Excel. Only valid rows will be imported."
            />

            {/* Bulk Priority Dialog */}
            <Dialog open={bulkPriorityDialogOpen} onOpenChange={setBulkPriorityDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-800">Set Priority</DialogTitle>
                        <DialogDescription className="text-sm text-slate-500">
                            You are about to update the priority for <span className="font-bold text-slate-700">{selectedRows.size}</span> selected quotation{selectedRows.size > 1 ? 's' : ''}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-6">
                        <div className="space-y-3">
                            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Select Priority</Label>
                            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                                <SelectTrigger className="w-full h-11 border-slate-200">
                                    <SelectValue placeholder="Select High or Low" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="High">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                                            <span className="font-medium text-slate-700">High Priority</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="Low">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                                            <span className="font-medium text-slate-700">Low Priority</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setBulkPriorityDialogOpen(false)}
                            className="w-24 h-10 shadow-none"
                            disabled={isUpdatingPriority}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="default"
                            onClick={handleBulkPriorityUpdate}
                            disabled={!selectedPriority || isUpdatingPriority}
                            className="w-32 h-10 bg-blue-600 hover:bg-blue-700 shadow-none text-white"
                        >
                            {isUpdatingPriority ? 'Updating...' : 'Confirm Update'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

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
function CreateView({ onBack, editId = null, isViewMode = false }) {
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
            quotationCategory: "MKT",
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
            poNo: "",
            poDate: "",
            poValue: "",
            poRemark: "",
        }
    })

    const [tableRows, setTableRows] = useState([
        { id: 1, srNo: 1, enqDescription: "", equipQty: "", rev: "", totalValue: "", poNo: "", poDate: "", poValue: "", remarks: "" },
    ])

    // State for wireframe attachments
    const [attachments, setAttachments] = useState([])
    const [deletedAttachmentIds, setDeletedAttachmentIds] = useState([])
    const [selectedPreviewFile, setSelectedPreviewFile] = useState(null)

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files)
        const newAttachments = files.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: (file.size / 1024).toFixed(2) + " KB",
            type: file.type,
            uploadedAt: new Date().toLocaleString(),
            file: file, // Store the actual file for upload
            isNew: true
        }))
        setAttachments(prev => [...prev, ...newAttachments])
    }

    const removeAttachment = (id, isNew) => {
        if (!isNew) {
            setDeletedAttachmentIds(prev => [...prev, id])
        }
        setAttachments(prev => prev.filter(a => a.id !== id))
    }

    // Fetch next quotation number when creating (not editing)
    useEffect(() => {
        if (editId) return

        const fetchNextNo = async () => {
            try {
                const res = await apiClient.get(`/api/rfq/next-quotation-no?type=${formData.quotationCategory}`)
                if (res.success && res.data) {
                    setFormData((prev) => ({ ...prev, quotationNo: res.data.next_quotation_no }))
                }
            } catch (error) {
                console.error("Failed to fetch next quotation no:", error)
            }
        }
        fetchNextNo()
    }, [editId, formData.quotationCategory])

    // Fetch record data when editing
    useEffect(() => {
        if (!editId) return

        const fetchRecord = async () => {
            try {
                setLoading(true)
                const res = await apiClient.get(`/api/rfq/${editId}`)
                if (res.success && res.data) {
                    const r = res.data
                    const updatedFormData = {
                        quotationNo: r.quotation_no ?? "",
                        quotationCategory: r.quotation_category ?? "MKT",
                        clientRef: r.client_ref ?? "",
                        rfqType: r.rfq_type ?? "",
                        clientName: r.client_name ?? "",
                        consultancy: r.consultancy ?? "",
                        contactPerson: r.contact_person ?? "",
                        modeOfEnquiry: r.mode_of_enquiry ?? "",
                        enqDate: r.enq_date ? r.enq_date.split("T")[0] : "",
                        targetDate: r.target_date ? r.target_date.split("T")[0] : "",
                        actualSubmissionDate: r.actual_submission_date ? r.actual_submission_date.split("T")[0] : "",
                        timeTaken: r.time_taken ?? "",
                        mediator: r.mediator ?? "",
                        estimator: r.estimator ?? "",
                        shrenoStatus: r.shreno_status ?? "Quoted",
                        clientStatus: r.client_status ?? "Under Review",
                        remark: r.remark ?? "",
                        madeBy: r.made_by ?? "",
                        poNo: r.po_no ?? "",
                        poDate: r.po_date ? r.po_date.split("T")[0] : "",
                        poValue: r.po_value ?? "",
                        poRemark: r.po_remark ?? "",
                    }
                    setFormData(updatedFormData)
                    if (r.attachments?.length) {
                        setAttachments(r.attachments.map(att => ({
                            id: att.id,
                            name: att.file_name,
                            size: (att.file_size / 1024).toFixed(2) + " KB",
                            type: att.file_mime_type || att.mime_type,
                            uploadedAt: new Date(att.uploaded_at).toLocaleString(),
                            url: att.file_url,
                            path: att.file_path,
                            isNew: false
                        })))
                    } else {
                        setAttachments([])
                    }
                    if (r.items?.length) {
                        setTableRows(r.items.map((item, i) => ({
                            id: i + 1,
                            srNo: item.sr_no ?? (i + 1),
                            enqDescription: item.enq_description ?? "",
                            equipQty: item.equip_qty ?? "",
                            rev: item.rev ?? "",
                            totalValue: item.total_value ?? "",
                            remarks: item.remarks ?? "",
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
            { id: newId, srNo: newId, enqDescription: "", equipQty: "", rev: "", totalValue: "", remarks: "" },
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
                quotation_category: formData.quotationCategory,
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
                po_no: formData.poNo,
                po_date: formData.poDate || null,
                po_value: formData.poValue,
                po_remark: formData.poRemark,
                items: JSON.stringify(tableRows.map((row) => ({
                    sr_no: row.srNo,
                    enq_description: row.enqDescription,
                    equip_qty: row.equipQty,
                    rev: row.rev,
                    total_value: row.totalValue,
                    remarks: row.remarks,
                }))),
            }

            const formDataObj = new FormData()
            Object.entries(payload).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    formDataObj.append(key, value)
                }
            })

            if (deletedAttachmentIds.length > 0) {
                formDataObj.append("deletedAttachmentIds", JSON.stringify(deletedAttachmentIds))
            }

            const newFiles = attachments.filter(a => a.isNew).map(a => a.file)
            newFiles.forEach(file => formDataObj.append("files", file))

            let res
            if (editId) {
                res = await apiClient.put(`/api/rfq/update/${editId}`, formDataObj)
            } else {
                res = await apiClient.post("/api/rfq/create", formDataObj)
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

    return (
        <div><div className="flex justify-end mb-4"><Button variant="outline" onClick={onBack} className="h-9">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
        </Button>
        </div>

            <fieldset disabled={isViewMode} className={isViewMode ? "opacity-80 pointer-events-none" : ""}>
                {/* Card 1: Enquiry Information */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Enquiry Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="quotationCategory">Quotation Type</Label>
                                <Select
                                    value={formData.quotationCategory}
                                    onValueChange={(v) => handleSelectChange("quotationCategory", v)}
                                    disabled={!!editId}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {QUOTATION_CATEGORIES.map(cat => (
                                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

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
                                <Select
                                    key={`rfqType-${dropdownOptions.rfqTypes.length}-${formData.rfqType}`}
                                    value={formData.rfqType}
                                    onValueChange={(v) => handleSelectChange("rfqType", v)}
                                >
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
                                <Input
                                    id="clientName"
                                    name="clientName"
                                    type="text"
                                    value={formData.clientName}
                                    onChange={handleInputChange}
                                    placeholder="Enter Client Name"
                                />
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
                                <Select
                                    key={`moe-${dropdownOptions.modesOfEnquiry.length}-${formData.modeOfEnquiry}`}
                                    value={formData.modeOfEnquiry}
                                    onValueChange={(v) => handleSelectChange("modeOfEnquiry", v)}
                                >
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
                                <Label htmlFor="targetDate">Client Target Date</Label>
                                <Input
                                    id="targetDate"
                                    name="targetDate"
                                    type="date"
                                    value={formData.targetDate}
                                    onChange={handleInputChange}
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
                                <Select
                                    key={`mediator-${dropdownOptions.mediators.length}-${formData.mediator}`}
                                    value={formData.mediator}
                                    onValueChange={(v) => handleSelectChange("mediator", v)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Mediator" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {formData.mediator && !dropdownOptions.mediators.includes(formData.mediator) && (
                                            <SelectItem value={formData.mediator}>{formData.mediator}</SelectItem>
                                        )}
                                        {dropdownOptions.mediators.map((opt) => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="estimator">Estimator</Label>
                                <Select
                                    key={`estimator-${dropdownOptions.estimators.length}-${formData.estimator}`}
                                    value={formData.estimator}
                                    onValueChange={(v) => handleSelectChange("estimator", v)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Estimator" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {formData.estimator && !dropdownOptions.estimators.includes(formData.estimator) && (
                                            <SelectItem value={formData.estimator}>{formData.estimator}</SelectItem>
                                        )}
                                        {dropdownOptions.estimators.map((opt) => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="shrenoStatus">Shreno Status</Label>
                                <Select
                                    key={`shrenoStatus-${formData.shrenoStatus}`}
                                    value={formData.shrenoStatus}
                                    onValueChange={(v) => handleSelectChange("shrenoStatus", v)}
                                >
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
                                <Select
                                    key={`clientStatus-${formData.clientStatus}`}
                                    value={formData.clientStatus}
                                    onValueChange={(v) => handleSelectChange("clientStatus", v)}
                                >
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
                                <Label htmlFor="poNo">PO No.</Label>
                                <Input
                                    id="poNo"
                                    name="poNo"
                                    type="text"
                                    value={formData.poNo}
                                    onChange={handleInputChange}
                                    placeholder="Enter PO No."
                                    disabled={formData.clientStatus !== "Order Received"}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="poDate">PO Date</Label>
                                <Input
                                    id="poDate"
                                    name="poDate"
                                    type="date"
                                    value={formData.poDate}
                                    onChange={handleInputChange}
                                    disabled={formData.clientStatus !== "Order Received"}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="poValue">PO Value</Label>
                                <Input
                                    id="poValue"
                                    name="poValue"
                                    type="number"
                                    value={formData.poValue}
                                    onChange={handleInputChange}
                                    placeholder="Enter PO Value"
                                    disabled={formData.clientStatus !== "Order Received"}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="poRemark">PO Remarks</Label>
                                <Input
                                    id="poRemark"
                                    name="poRemark"
                                    type="text"
                                    value={formData.poRemark}
                                    onChange={handleInputChange}
                                    placeholder="Enter PO Remarks"
                                    disabled={formData.clientStatus !== "Order Received"}
                                />
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

                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Enquiry Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {tableRows.length > 0 && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">Enq. Description</Label>
                                    <Textarea
                                        value={tableRows[0].enqDescription}
                                        onChange={(e) => handleRowChange(tableRows[0].id, "enqDescription", e.target.value)}
                                        placeholder="Enter Enquiry Description"
                                        className="min-h-[100px]"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">Equip. Qty</Label>
                                        <Input
                                            type="number"
                                            value={tableRows[0].equipQty}
                                            onChange={(e) => handleRowChange(tableRows[0].id, "equipQty", e.target.value)}
                                            placeholder="Qty"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">Rev.</Label>
                                        <Input
                                            value={tableRows[0].rev}
                                            onChange={(e) => handleRowChange(tableRows[0].id, "rev", e.target.value)}
                                            placeholder="Rev"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">Total Value</Label>
                                        <Input
                                            type="number"
                                            value={tableRows[0].totalValue}
                                            onChange={(e) => handleRowChange(tableRows[0].id, "totalValue", e.target.value)}
                                            placeholder="Value"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </fieldset>

                <Card className="mb-6">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Paperclip className="h-4 w-4" />
                            Attachments (Quotation / Specification)
                        </CardTitle>
                        <div className="relative">
                            <input
                                type="file"
                                id="rfq-attachments"
                                className="hidden"
                                multiple
                                onChange={handleFileChange}
                            />
                            {!isViewMode && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50"
                                    onClick={() => document.getElementById('rfq-attachments').click()}
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    Add Files
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {attachments.length > 0 ? (
                            <div className="border rounded-md divide-y overflow-hidden">
                                {attachments.map((file) => (
                                    <div key={file.id} className="flex flex-col">
                                        <div
                                            className={`flex items-center justify-between p-3 transition-colors cursor-pointer ${
                                                selectedPreviewFile === file 
                                                ? "bg-primary/5 border-b" 
                                                : "bg-slate-50 hover:bg-slate-100"
                                            }`}
                                            onClick={() => {
                                                if (file.isNew) return;
                                                if (selectedPreviewFile === file) {
                                                    setSelectedPreviewFile(null);
                                                } else {
                                                    setSelectedPreviewFile(file);
                                                }
                                            }}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden flex-1">
                                                <FileText className="h-5 w-5 text-blue-500 shrink-0" />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-medium truncate text-slate-700">{file.name}</span>
                                                    <span className="text-[10px] text-slate-400">{file.size} • {file.uploadedAt}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!file.isNew && (
                                                    selectedPreviewFile === file ? (
                                                        <span className="text-xs text-primary font-medium mr-2">Close Preview</span>
                                                    ) : (
                                                        <span className="text-xs text-slate-500 font-medium mr-2">Click to Preview</span>
                                                    )
                                                )}
                                                {!isViewMode && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0 z-10"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (selectedPreviewFile === file) setSelectedPreviewFile(null);
                                                            removeAttachment(file.id, file.isNew)
                                                        }}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Inline Preview Body */}
                                        {selectedPreviewFile === file && !file.isNew && file.url && (
                                            <div className="w-full h-[600px] animate-in slide-in-from-top-2 fade-in duration-300">
                                                <iframe 
                                                    src={file.url} 
                                                    className="w-full h-full border-0 bg-white"
                                                    title="Document Preview"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div
                                className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-slate-50/50 transition-colors ${!isViewMode ? "cursor-pointer hover:bg-slate-50" : ""}`}
                                onClick={() => !isViewMode && document.getElementById('rfq-attachments').click()}
                            >
                                <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3">
                                    <Upload className="h-6 w-6 text-slate-400" />
                                </div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">{isViewMode ? "No attachments found" : "Click to upload or drag files here"}</p>
                                <p className="text-[10px] text-slate-400 mt-1">Quotation, Drawings, or Specification PDFs</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

            {/* Submit / Cancel */}
            <div className="flex justify-end gap-4 mt-6">
                <Button onClick={onBack} variant="outline">{isViewMode ? "Back" : "Cancel"}</Button>
                {!isViewMode && (
                    <Button onClick={handleSubmit} disabled={submitting} className="cursor-pointer">
                        {submitting ? "Saving..." : editId ? "Update RFQ" : "Submit RFQ"}
                    </Button>
                )}
            </div>
        </div>
    )
}

function AttachmentsView({ rfqId, onBack }) {
    const [quotationNo, setQuotationNo] = useState("")

    // Preview state
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [previewUrl, setPreviewUrl] = useState("")
    const [activePreviewDoc, setActivePreviewDoc] = useState(null)

    const fetchAttachments = useCallback(async () => {
        try {
            const res = await apiClient.get(`/api/rfq/${rfqId}/attachments`)
            if (res.success && res.data) {
                setQuotationNo(res.data.quotation_no)
                const items = (res.data.attachments || []).map((item, idx) => ({
                    ...item,
                    serialNo: idx + 1
                }))
                return {
                    data: items,
                    meta: {
                        total: items.length,
                        page: 1,
                        totalPages: 1
                    }
                }
            }
        } catch (error) {
            toast.error("Failed to load attachments")
        }
        return { data: [], meta: {} }
    }, [rfqId])

    const handlePreview = (file) => {
        setPreviewUrl(file.file_url)
        setActivePreviewDoc({
            mimeType: file.file_mime_type,
            filePath: file.file_path,
            documentName: file.file_name
        })
        setIsPreviewOpen(true)
    }

    const columns = [
        {
            header: "SR NO.",
            accessorKey: "serialNo",
            width: "80px",
            className: "pl-6"
        },
        {
            header: "FILE NAME",
            accessorKey: "file_name",
            cell: (row) => (
                <div className="flex items-center gap-2 py-1">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-600 font-medium">{row.file_name}</span>
                </div>
            )
        },
        {
            header: "SIZE",
            accessorKey: "file_size",
            cell: (row) => `${(row.file_size / 1024).toFixed(1)} KB`
        },
        {
            header: "UPLOAD DATE",
            accessorKey: "uploaded_at",
            cell: (row) => new Date(row.uploaded_at).toLocaleDateString()
        },
        {
            header: "ACTIONS",
            id: "actions",
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(row)}
                        className="h-8 text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-2 font-semibold text-[10px] uppercase cursor-pointer"
                    >
                        <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview
                    </Button>
                </div>
            )
        }
    ]

    return (
        <div className="flex flex-col h-full space-y-2">
            <div className="flex items-center justify-end mb-2">
                <Button onClick={onBack} variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2 text-slate-600" />
                    Back
                </Button>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
                <ProDataTable
                    fetchData={fetchAttachments}
                    columns={columns}
                    globalSearchPlaceholder="Search in documents..."
                />
            </div>

            {/* Premium Preview Dialog */}
            <DocumentPreviewDialog
                isOpen={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                previewUrl={previewUrl}
                activePreviewDoc={activePreviewDoc}
            />
        </div>
    )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
function RfqRegister() {
    const [view, setView] = useState("list") // "list" | "create" | "edit" | "attachments" | "view"
    const [editId, setEditId] = useState(null)

    const handleEdit = (id) => {
        setEditId(id)
        setView("edit")
    }

    const handleView = (id) => {
        setEditId(id)
        setView("view")
    }

    const handleAttachments = (id) => {
        setEditId(id)
        setView("attachments")
    }

    return (
        <>
            <PageContainer>
                {view === "list" ? (
                    <ListView
                        onCreateClick={() => {
                            setEditId(null)
                            setView("create")
                        }}
                        onEditClick={handleEdit}
                        onViewClick={handleView}
                        onAttachmentsClick={handleAttachments}
                    />
                ) : view === "attachments" ? (
                    <AttachmentsView
                        rfqId={editId}
                        onBack={() => {
                            setView("list")
                            setEditId(null)
                        }}
                    />
                ) : (
                    <CreateView
                        onBack={() => {
                            setView("list")
                            setEditId(null)
                        }}
                        editId={editId}
                        isViewMode={view === "view"}
                    />
                )}
            </PageContainer>
        </>
    )
}

export default RfqRegister
