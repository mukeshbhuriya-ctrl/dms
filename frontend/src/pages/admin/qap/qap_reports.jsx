import { useState, useMemo, useEffect, useCallback } from "react"
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
    Table as ShadcnTable,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Plus, Trash2, Type, ArrowLeft, Eye, Edit } from "lucide-react"
import { toast } from "react-toastify"
import apiClient from "@/api/api.client"
import { DataTable } from "@/components/shared/DataTable"

export default function QapReports() {
    const [view, setView] = useState("list") // "list", "create", "edit", "view"
    const [selectedId, setSelectedId] = useState(null)

    const handleCreateNew = () => {
        setSelectedId(null)
        setView("create")
    }

    const handleEdit = (id) => {
        setSelectedId(id)
        setView("edit")
    }

    const handleView = (id) => {
        setSelectedId(id)
        setView("view")
    }

    const handleBack = () => {
        setView("list")
        setSelectedId(null)
    }

    return (
        <SidebarProvider>
            <AdminSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                </header>
                <main className="flex-1 overflow-auto p-6">
                    <div className="max-w-7xl mx-auto">
                        {view === "list" && (
                            <ListView
                                onCreateNew={handleCreateNew}
                                onEdit={handleEdit}
                                onView={handleView}
                            />
                        )}
                        {(view === "create" || view === "edit" || view === "view") && (
                            <CreateView
                                onBack={handleBack}
                                editId={selectedId}
                                isReadOnly={view === "view"}
                            />
                        )}
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}

function ListView({ onCreateNew, onEdit, onView }) {
    const fetchData = useCallback(async ({ page, limit, search }) => {
        const params = new URLSearchParams({ page, limit, ...(search ? { search } : {}) })
        const res = await apiClient.get(`/api/qap/list`, Object.fromEntries(params))
        return { data: res.qaps, meta: res.pagination }
    }, [])

    const columns = [
        {
            header: "Document No",
            accessorKey: "document_no",
        },
        {
            header: "MSN",
            accessorKey: "msn",
        },
        {
            header: "Client",
            accessorKey: "client",
        },
        {
            header: "Equipment",
            accessorKey: "equipment_name",
        },
        {
            header: "Created At",
            cell: (row) => new Date(row.createdAt).toLocaleDateString(),
        },
        {
            header: "Actions",
            cell: (row) => (
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onView(row.id)}>
                        <Eye className="w-4 h-4 text-blue-500" />
                    </Button>
                    {row.status !== "approved" && (
                        <Button variant="ghost" size="icon" onClick={() => onEdit(row.id)}>
                            <Edit className="w-4 h-4 text-green-500" />
                        </Button>
                    )}
                </div>
            ),
        },
    ]

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Quality Assurance Plans</h1>
                    <p className="text-muted-foreground">Manage and track your QAP documents.</p>
                </div>
                <Button onClick={onCreateNew}>
                    <Plus className="mr-2 h-4 w-4" /> Create New
                </Button>
            </div>

            <DataTable columns={columns} fetchData={fetchData} />

        </div>
    )
}

function CreateView({ onBack, editId, isReadOnly }) {
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Header section - Dropdowns
    const [client, setClient] = useState("")
    const [msn, setMsn] = useState("")
    const [poNo, setPoNo] = useState("")
    const [poDate, setPoDate] = useState("")

    const [jobs, setJobs] = useState([])
    const [clients, setClients] = useState([])
    const [users, setUsers] = useState([])

    // User input fields
    const [formData, setFormData] = useState({
        documentNo: "",
        drgNo: "",
        customerDrgNo: "",
        equipmentDescription: "",
        tagNo: "",
        code: "",
    })

    // Table rows
    const [tableRows, setTableRows] = useState([
        {
            id: Date.now(),
            activity: "",
            typeMethodCheck: "",
            extent: "",
            acceptanceCriteria: "",
            referenceDocuments: "",
            verifyingDocument: "",
            shreno: "",
            assignedUser: "",
            clientTpia: "",
            remark: "",
            isHeading: true,
            headingText: "Heading 1",
        },
    ])

    // Calculate serial numbers - headers get 1, 2, 3... and sub-items get 1.1, 1.2, 1.3...
    const getSerialNumbers = () => {
        let headerCounter = 0
        const result = []

        tableRows.forEach((row, index) => {
            if (row.isHeading) {
                headerCounter++
                result.push({
                    ...row,
                    serialNo: headerCounter.toString(),
                    subSerialNo: null,
                })
            } else {
                let currentHeaderCounter = 0
                let subCounter = 0

                for (let i = 0; i < index; i++) {
                    if (tableRows[i].isHeading) {
                        currentHeaderCounter++
                        subCounter = 0
                    } else if (currentHeaderCounter > 0) {
                        subCounter++
                    }
                }

                if (currentHeaderCounter > 0) {
                    subCounter++
                    result.push({
                        ...row,
                        serialNo: currentHeaderCounter.toString(),
                        subSerialNo: `${currentHeaderCounter}.${subCounter}`,
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

    const rowsWithSerialNumbers = useMemo(() => getSerialNumbers(), [tableRows])

    useEffect(() => {
        const fetchCommonData = async () => {
            try {
                const [jobsRes, customersRes, usersRes] = await Promise.all([
                    apiClient.get("/api/common/jobs"),
                    apiClient.get("/api/common/customers"),
                    apiClient.get("/api/common/qc-engineers")
                ])
                setJobs(jobsRes.data || [])
                setClients(customersRes.data || [])
                setUsers(usersRes.data || [])
            } catch (error) {
                console.error("Error fetching common data", error)
            }
        }

        fetchCommonData()
    }, [])

    useEffect(() => {
        if (editId) {
            fetchReportDetails()
        }
    }, [editId])

    const fetchReportDetails = async () => {
        setLoading(true)
        try {
            const response = await apiClient.get(`/api/qap/${editId}`)
            const d = response
            setClient(d.client || "")
            setMsn(d.job_id || "")
            setPoNo(d.po_no || "")
            setPoDate(d.po_date || "")

            setFormData({
                documentNo: d.document_no || "",
                drgNo: d.shreno_drg_no || "",
                customerDrgNo: d.customer_drg_no || "",
                equipmentDescription: d.equipment_name || "",
                tagNo: d.tag_no || "",
                code: d.code || "",
            })

            if (d.details && d.details.length > 0) {
                setTableRows(d.details.map(item => ({
                    id: Date.now() + Math.random(), // Unique local ID
                    activity: item.activity || "",
                    typeMethodCheck: item.type_method_check || "",
                    extent: "", // Wireframe merge extent + method check
                    acceptanceCriteria: item.acceptance_criteria || "",
                    referenceDocuments: "", // Merge with acceptance visually
                    verifyingDocument: item.verifying_document || "",
                    shreno: item.shreno || "",
                    assignedUser: item.assigned_user_id || "",
                    clientTpia: item.client_tpia || "",
                    remark: item.remark || "",
                    isHeading: item.is_heading || false,
                    headingText: item.heading_text || "",
                })))
            }
        } catch (error) {
            console.error("Fetch QAP error:", error)
            toast.error("Failed to fetch QAP details.")
        } finally {
            setLoading(false)
        }
    }

    const handleMsnChange = async (value) => {
        setMsn(value)
        if (isReadOnly) return;

        // Reset basic info section first whenever MSN changes
        setFormData({
            documentNo: "",
            drgNo: formData.drgNo,
            customerDrgNo: formData.customerDrgNo,
            equipmentDescription: "",
            tagNo: "",
            code: "",
        })
        setPoNo("")
        setPoDate("")

        const selectedJob = jobs.find((j) => j.id === value)

        if (selectedJob) {
            setFormData((prev) => ({
                ...prev,
                equipmentDescription: selectedJob.equipement_name || "",
                tagNo: selectedJob.tag_number || "",
                code: selectedJob.code || "",
            }))

            if (selectedJob.po) {
                setPoNo(selectedJob.po.po_number || "");
                if (selectedJob.po.po_date) {
                    try {
                        const dateObj = new Date(selectedJob.po.po_date);
                        if (!isNaN(dateObj.getTime())) {
                            setPoDate(dateObj.toISOString().split('T')[0]);
                        } else {
                            setPoDate(String(selectedJob.po.po_date).split('T')[0]);
                        }
                    } catch (e) {
                        console.error("Invalid PO Date format", e)
                        setPoDate(String(selectedJob.po.po_date).split('T')[0]);
                    }
                }
            }

            try {
                const docRes = await apiClient.get(`/api/qap/next-document-no/${value}`)
                setFormData(prev => ({
                    ...prev,
                    documentNo: docRes.document_no
                }))
            } catch (e) {
                console.error("Error generating doc number", e)
            }
        }
    }

    // Handle input field changes
    const handleInputChange = (e) => {
        if (isReadOnly) return;
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    // Handle table row changes
    const handleRowChange = (id, field, value) => {
        if (isReadOnly) return;
        setTableRows(
            tableRows.map((row) =>
                row.id === id ? { ...row, [field]: value } : row
            )
        )
    }

    // Add new heading at the end
    const addRow = () => {
        if (isReadOnly) return;
        setTableRows([
            ...tableRows,
            {
                id: Date.now(),
                activity: "",
                typeMethodCheck: "",
                extent: "",
                acceptanceCriteria: "",
                referenceDocuments: "",
                verifyingDocument: "",
                shreno: "",
                assignedUser: "",
                clientTpia: "",
                remark: "",
                isHeading: true,
                headingText: "",
            },
        ])
    }

    // Add row after a specific heading
    const addRowAfterHeading = (headingId) => {
        if (isReadOnly) return;
        const headingIndex = tableRows.findIndex((row) => row.id === headingId)

        if (headingIndex !== -1) {
            const newRow = {
                id: Date.now(),
                activity: "",
                typeMethodCheck: "",
                extent: "",
                acceptanceCriteria: "",
                referenceDocuments: "",
                verifyingDocument: "",
                shreno: "",
                assignedUser: "",
                clientTpia: "",
                remark: "",
                isHeading: false,
                headingText: "",
            }

            let insertIndex = headingIndex + 1
            for (let i = headingIndex + 1; i < tableRows.length; i++) {
                if (tableRows[i].isHeading) {
                    break
                }
                insertIndex = i + 1
            }

            const newRows = [...tableRows]
            newRows.splice(insertIndex, 0, newRow)
            setTableRows(newRows)
        }
    }

    // Toggle row to heading
    const toggleHeading = (id) => {
        if (isReadOnly) return;
        setTableRows(
            tableRows.map((row) =>
                row.id === id
                    ? {
                        ...row,
                        isHeading: !row.isHeading,
                        headingText: row.isHeading ? "" : row.headingText,
                    }
                    : row
            )
        )
    }

    // Remove row
    const removeRow = (id) => {
        if (isReadOnly) return;
        if (tableRows.length > 1) {
            setTableRows(tableRows.filter((row) => row.id !== id))
        }
    }

    const handleSubmit = async () => {
        if (!client || !msn || !formData.documentNo) {
            toast.error("Please fill all required primary fields (Client, MSN, Document No)")
            return
        }

        setSubmitting(true)
        const selectedJob = jobs.find(j => j.id === msn)

        const payload = {
            job_id: msn,
            msn: selectedJob ? selectedJob.job_number : "",
            client: client,
            po_no: poNo,
            po_date: poDate,
            document_no: formData.documentNo,
            equipment_name: formData.equipmentDescription,
            tag_no: formData.tagNo,
            code: formData.code,
            shreno_drg_no: formData.drgNo,
            customer_drg_no: formData.customerDrgNo,
            items: tableRows.map(row => ({
                is_heading: row.isHeading,
                heading_text: row.headingText,
                activity: row.activity,
                type_method_check: row.typeMethodCheck,
                acceptance_criteria: row.acceptanceCriteria,
                verifying_document: row.verifyingDocument,
                shreno: row.shreno,
                assigned_user_id: row.assignedUser || null,
                client_tpia: row.clientTpia,
                remark: row.remark,
            }))
        }

        try {
            if (editId) {
                await apiClient.put(`/api/qap/update/${editId}`, payload)
                toast.success("QAP successfully updated!")
            } else {
                await apiClient.post(`/api/qap/create`, payload)
                toast.success("QAP created successfully!")
            }
            onBack()
        } catch (err) {
            console.error(err)
            toast.error("Error saving QAP")
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="p-8">Loading QAP form details...</div>

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold mb-2">
                        {isReadOnly ? "View QAP" : editId ? "Edit Quality Assurance Plan" : "Create Quality Assurance Plan"}
                    </h1>
                    <p className="text-muted-foreground">
                        {isReadOnly ? "Read-only view." : "Create and manage quality assurance plan information."}
                    </p>
                </div>
            </div>

            {/* First Section - Dropdowns */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="client">Client:</Label>
                            {isReadOnly ? (
                                <Input readOnly value={client} className="bg-muted" />
                            ) : (
                                <Select value={client} onValueChange={(val) => {
                                    setClient(val);
                                    if (!isReadOnly) {
                                        // Reset MSN & Basic Info whenever client changes
                                        setMsn("");
                                        setPoNo("");
                                        setPoDate("");
                                        setFormData(prev => ({
                                            ...prev,
                                            documentNo: "",
                                            equipmentDescription: "",
                                            tagNo: "",
                                            code: ""
                                        }));
                                    }
                                }}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map((c) => (
                                            <SelectItem key={c.id} value={c.customer_name}>
                                                {c.customer_name}
                                            </SelectItem>
                                        ))}
                                        {/* Allow manual entry by rendering existing string if custom */}
                                        {client && !clients.find(c => c.customer_name === client) && (
                                            <SelectItem value={client}>{client}</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="msn">MSN:</Label>
                            {isReadOnly ? (
                                <Input readOnly value={jobs.find(j => j.id === msn)?.job_number || msn} className="bg-muted" />
                            ) : (
                                <Select value={msn} onValueChange={handleMsnChange}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select MSN" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {jobs.map((j) => (
                                            <SelectItem key={j.id} value={j.id}>
                                                {j.job_number}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="documentNo">Document No.:</Label>
                            <Input
                                id="documentNo"
                                name="documentNo"
                                type="text"
                                value={formData.documentNo}
                                readOnly
                                className="bg-muted"
                                placeholder=""
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="equipment">Equipment Name:</Label>
                            <Input
                                id="equipment"
                                type="text"
                                value={formData.equipmentDescription}
                                readOnly
                                className="bg-muted"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tagNo">Tag No.:</Label>
                            <Input
                                id="tagNo"
                                type="text"
                                value={formData.tagNo}
                                readOnly
                                className="bg-muted"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="code">CODE:</Label>
                            <Input
                                id="code"
                                type="text"
                                value={formData.code}
                                readOnly
                                className="bg-muted"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="poNo">P.O. No.:</Label>
                            <Input
                                id="poNo"
                                type="text"
                                value={poNo}
                                onChange={(e) => setPoNo(e.target.value)}
                                placeholder="Enter P.O. No."
                                readOnly={isReadOnly}
                                className={isReadOnly ? "bg-muted" : ""}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="poDate">P.O. Date:</Label>
                            <Input
                                id="poDate"
                                type="text"
                                value={poDate}
                                onChange={(e) => setPoDate(e.target.value)}
                                placeholder="Enter P.O. Date"
                                readOnly={isReadOnly}
                                className={isReadOnly ? "bg-muted" : ""}
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
                            <Label htmlFor="drgNo">SHRENO DRG No.:</Label>
                            <Input
                                id="drgNo"
                                name="drgNo"
                                type="text"
                                value={formData.drgNo}
                                onChange={handleInputChange}
                                placeholder="Enter SHRENO DRG No."
                                readOnly={isReadOnly}
                                className={isReadOnly ? "bg-muted" : ""}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="customerDrgNo">Customer DRG No:</Label>
                            <Input
                                id="customerDrgNo"
                                name="customerDrgNo"
                                type="text"
                                value={formData.customerDrgNo}
                                onChange={handleInputChange}
                                placeholder="Enter Customer DRG No"
                                readOnly={isReadOnly}
                                className={isReadOnly ? "bg-muted" : ""}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Third Section - Table */}
            <Card className="w-full overflow-hidden">
                <CardHeader>
                    <CardTitle>Quality Assurance Plan Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex flex-col gap-4 w-full">
                    <div className="rounded-md border overflow-y-auto max-h-[500px]">
                        <ShadcnTable className="min-w-[1800px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="p-2 text-xs font-bold uppercase w-[80px]">
                                        Sr. No.
                                    </TableHead>
                                    <TableHead className="p-2 text-xs font-bold uppercase">
                                        Activity
                                    </TableHead>
                                    <TableHead className="p-2 text-xs font-bold uppercase">
                                        Type / Method of Check / Extent
                                    </TableHead>
                                    <TableHead className="p-2 text-xs font-bold uppercase">
                                        Acceptance Criteria / Reference Documents
                                    </TableHead>
                                    <TableHead className="p-2 text-xs font-bold uppercase">
                                        Verifying Document
                                    </TableHead>
                                    <TableHead className="p-2 text-xs font-bold uppercase">
                                        Shreno
                                    </TableHead>
                                    <TableHead className="p-2 text-xs font-bold uppercase">
                                        Assigned User
                                    </TableHead>
                                    <TableHead className="p-2 text-xs font-bold uppercase">
                                        Client / TPIA
                                    </TableHead>
                                    <TableHead className="p-2 text-xs font-bold uppercase">
                                        Remark
                                    </TableHead>
                                    {!isReadOnly && (
                                        <TableHead className="p-2 text-xs font-bold uppercase w-[120px]">
                                            Actions
                                        </TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rowsWithSerialNumbers.map((row) =>
                                    row.isHeading ? (
                                        <TableRow key={row.id} className="bg-muted/30">
                                            <TableCell className="p-2 font-medium">
                                                {row.serialNo}
                                            </TableCell>
                                            <TableCell colSpan={isReadOnly ? 8 : 8} className="p-2">
                                                <Input
                                                    type="text"
                                                    value={row.headingText}
                                                    onChange={(e) =>
                                                        handleRowChange(row.id, "headingText", e.target.value)
                                                    }
                                                    placeholder="Enter heading text"
                                                    className="w-full font-semibold"
                                                    readOnly={isReadOnly}
                                                />
                                            </TableCell>
                                            {!isReadOnly && (
                                                <TableCell className="p-2">
                                                    <div className="flex gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => addRowAfterHeading(row.id)}
                                                            className="h-8 w-8"
                                                            title="Add row after this heading"
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => removeRow(row.id)}
                                                            disabled={tableRows.length === 1}
                                                            className="h-8 w-8"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ) : (
                                        <TableRow key={row.id}>
                                            <TableCell className="p-2 font-medium">
                                                {row.subSerialNo || row.serialNo || "-"}
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
                                                {isReadOnly ? (
                                                    <div className="w-full text-xs px-3">{users.find(u => u.id === row.assignedUser)?.name || ""}</div>
                                                ) : (
                                                    <Select
                                                        value={row.assignedUser}
                                                        onValueChange={(value) =>
                                                            handleRowChange(row.id, "assignedUser", value)
                                                        }
                                                    >
                                                        <SelectTrigger className="w-full text-xs h-8 border-0 focus:ring-0">
                                                            <SelectValue placeholder="Select user" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {users.map((user) => (
                                                                <SelectItem key={user.id} value={user.id}>
                                                                    {user.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
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
                                            {!isReadOnly && (
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => toggleHeading(row.id)}
                                                            className="h-8 w-8"
                                                            title="Convert to heading"
                                                        >
                                                            <Type className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => removeRow(row.id)}
                                                            disabled={tableRows.length === 1}
                                                            className="h-8 w-8"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    )
                                )}
                            </TableBody>
                        </ShadcnTable>
                    </div>
                    {!isReadOnly && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={addRow}
                            className="w-full sm:w-auto"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Heading
                        </Button>
                    )}
                </CardContent>
            </Card>

            {!isReadOnly && (
                <div className="flex justify-end gap-4 mt-8 mb-4">
                    <Button variant="outline" onClick={onBack}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting ? "Saving..." : (editId ? "Update Plan" : "Save Plan")}
                    </Button>
                </div>
            )}
        </div>
    )
}
