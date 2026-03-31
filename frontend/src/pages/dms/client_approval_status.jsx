import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AdminSidebar } from "@/components";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'react-toastify';
import { 
    Loader2, 
    CheckCircle, 
    XCircle, 
    Download, 
    Upload, 
    File, 
    Trash2, 
    History,
    Search,
    ArrowLeft,
    FileText
} from "lucide-react";
import { dccService } from "../../services/dcc.service";
import { DataTable } from "@/components/shared/DataTable";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { exportApi } from "@/api/export.api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import DocumentTrail from "../../components/dms/DocumentTrail";

const ClientApprovalStatus = () => {
    const [view, setView] = useState("list"); // 'list' | 'review'
    const [selectedTransmission, setSelectedTransmission] = useState(null);
    const [remarks, setRemarks] = useState("");
    const [actionStatus, setActionStatus] = useState("Approved"); // 'Approved' | 'Rejected'
    const [actionLoading, setActionLoading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [selectedFiles, setSelectedFiles] = useState([]);
    
    // Trail State
    const [isTrailOpen, setIsTrailOpen] = useState(false);
    const [activeDocumentId, setActiveDocumentId] = useState(null);

    const fetchTransmissionsWrapper = useCallback(async (params) => {
        try {
            const res = await dccService.getTransmissions({ ...params });
            if (res.success) {
                return {
                    data: res.data.data || [],
                    meta: res.data.meta || { total: 0, page: 1, limit: 10, totalPages: 0 }
                };
            } else {
                toast.error("Failed to fetch transmissions");
                return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
            }
        } catch (error) {
            console.error("Error fetching transmissions:", error);
            return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
        }
    }, [refreshTrigger]);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(prev => [...prev, ...files]);
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleReviewClick = (transmission) => {
        setSelectedTransmission(transmission);
        setRemarks("");
        setActionStatus("Approved");
        setSelectedFiles([]);
        setView("review");
    };

    const handleSubmit = async () => {
        if (!actionStatus) {
            toast.error("Please select a status (Approve or Reject)");
            return;
        }
        if (actionStatus === 'Rejected' && !remarks.trim()) {
            toast.error("Please enter remarks for rejection");
            return;
        }

        setActionLoading(true);
        try {
            const formData = new FormData();
            formData.append('transmission_id', selectedTransmission.id);
            formData.append('status', actionStatus);
            formData.append('remarks', remarks || (actionStatus === 'Approved' ? 'Approved by Client' : 'Rejected by Client'));
            
            selectedFiles.forEach(file => {
                formData.append('client_files', file);
            });

            const res = await dccService.updateTransmissionClientStatus(formData);

            if (res.success) {
                toast.success(`Transmission ${selectedTransmission.transmission_number} - ${actionStatus} Successfully`);
                setView("list");
                setRefreshTrigger(prev => prev + 1);
            } else {
                toast.error(res.message || `${actionStatus} failed`);
            }
        } catch (error) {
            console.error("Processing error:", error);
            toast.error("An error occurred during submission.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDownloadFeedback = async (id, transNum) => {
        try {
            const blob = await dccService.downloadTransmissionFeedback(id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Feedback_${transNum}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            toast.error("Failed to download feedback ZIP");
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Approved':
                return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Approved</span>
            case 'Rejected':
                return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Rejected</span>
            case 'Sent':
                return <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">Sent</span>
            default:
                return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">Pending</span>
        }
    };

    const listColumns = useMemo(() => [
        {
            accessorKey: "transmission_number",
            header: "Transmission No",
            cell: (row) => row.transmission_number || '-'
        },
        {
            accessorKey: "po.po_number",
            header: "PO Number",
            cell: (row) => row.po?.po_number || '-'
        },
        {
            accessorKey: "customer.customer_name",
            header: "Customer",
            cell: (row) => row.customer?.customer_name || '-'
        },
        {
            header: "Document Count",
            id: "document_count",
            cell: (row) => row.documents?.length || 0
        },
        {
            header: "Password",
            accessorKey: "password",
            cell: (row) => row.password ? (
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                    {row.password}
                </span>
            ) : '-'
        },
        {
            header: "Created Date",
            accessorKey: "createdAt",
            cell: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-'
        },
        {
            accessorKey: "client_status",
            header: "Client Status",
            cell: (row) => getStatusBadge(row.client_status)
        },
        {
            id: "actions",
            header: "Actions",
            cell: (row) => {
                const isProcessed = row.client_status === 'Approved' || row.client_status === 'Rejected';
                return (
                    <div className="flex gap-2">
                        {!isProcessed ? (
                            <Button
                                size="sm"
                                onClick={() => handleReviewClick(row)}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2 rotate-180" /> Review
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                {row.client_archive_url && (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleDownloadFeedback(row.id, row.transmission_number)}
                                    >
                                        <Download className="w-4 h-4 mr-1" /> Feedback ZIP
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                );
            }
        }
    ], [refreshTrigger]);

    const handleExport = async () => {
        try {
            await exportApi.exportModule("transmission")
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

                        {/* Header Section */}
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h1 className="text-3xl font-bold mb-2">
                                    {view === 'list' ? 'Transmissions Approval' : 'Review Transmission'}
                                </h1>
                                <p className="text-muted-foreground">
                                    {view === 'list' 
                                        ? 'Manage and process client approvals for existing document packages.' 
                                        : 'Process client feedback and upload stamped documents for this packet.'}
                                </p>
                            </div>
                            <div>
                                {view === 'review' && (
                                    <Button variant="outline" onClick={() => setView('list')}>
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                                    </Button>
                                )}
                            </div>
                        </div>

                        {view === 'list' ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Transmission Approval List</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <DataTable
                                        columns={listColumns}
                                        fetchData={fetchTransmissionsWrapper}
                                        searchKey="transmission_number"
                                        refreshTrigger={refreshTrigger}
                                        onExport={handleExport}
                                    />
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-6">
                                {/* Transmission Details Card */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Packet Details</CardTitle>
                                        <CardDescription>Basic information about the selected transmission packet</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                            <div className="space-y-1">
                                                <Label className="text-muted-foreground">PO Number</Label>
                                                <p className="font-bold">{selectedTransmission?.po?.po_number || '-'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-muted-foreground">Customer</Label>
                                                <p className="font-bold">{selectedTransmission?.customer?.customer_name || '-'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-muted-foreground">Transmission No</Label>
                                                <p className="font-bold">{selectedTransmission?.transmission_number}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-muted-foreground">Sent Date</Label>
                                                <p className="font-bold">{new Date(selectedTransmission?.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Document Table Card */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Included Documents</CardTitle>
                                        <CardDescription>Review the list of documents transmitted to the client</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0 border-t">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[80px] pl-6">S.No</TableHead>
                                                    <TableHead>Generated Document No</TableHead>
                                                    <TableHead>Document Name</TableHead>
                                                    <TableHead>Version</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedTransmission?.documents?.map((td, index) => (
                                                    <TableRow key={td.id}>
                                                        <TableCell className="pl-6 font-medium">{index + 1}</TableCell>
                                                        <TableCell className="font-bold">{td.group_document?.document?.document_number || '-'}</TableCell>
                                                        <TableCell className="text-muted-foreground">{td.group_document?.document?.document_name || '-'}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="font-mono">
                                                                Rev {td.version?.version_no || '-'}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>

                                {/* Feedback Card */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Client Feedback & Action</CardTitle>
                                        <CardDescription>Upload stamps and select the final approval status</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Left side: Upload & Previews */}
                                            <div className="space-y-4">
                                                <Label className="font-bold">Upload Feedback Files (Stamps/Markup)</Label>
                                                <div className="flex flex-col gap-4">
                                                    <Input 
                                                        type="file" 
                                                        multiple 
                                                        id="client-upload"
                                                        className="hidden" 
                                                        onChange={handleFileChange}
                                                    />
                                                    <Label 
                                                        htmlFor="client-upload"
                                                        className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg hover:border-primary hover:bg-muted/50 cursor-pointer transition-all gap-2"
                                                    >
                                                        <Upload className="w-8 h-8 text-muted-foreground" />
                                                        <span className="font-medium">Click to select multiple files</span>
                                                        <span className="text-xs text-muted-foreground">PDF, DOCX, ZIP or Images</span>
                                                    </Label>

                                                    {selectedFiles.length > 0 && (
                                                        <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2">
                                                            {selectedFiles.map((file, idx) => (
                                                                <div key={idx} className="flex items-center justify-between p-2 rounded border bg-muted/20">
                                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                                        <File className="w-4 h-4 text-primary shrink-0" />
                                                                        <span className="text-sm truncate w-full">{file.name}</span>
                                                                    </div>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                        onClick={() => removeFile(idx)}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right side: Status & Remarks */}
                                            <div className="space-y-6">
                                                <div className="space-y-4">
                                                    <Label className="font-bold">Process Status</Label>
                                                    <div className="flex items-center gap-8 p-4 border rounded-md bg-muted/10">
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox 
                                                                id="approve" 
                                                                checked={actionStatus === 'Approved'}
                                                                onCheckedChange={() => setActionStatus('Approved')}
                                                            />
                                                            <Label htmlFor="approve" className="font-bold text-green-700 cursor-pointer">Approve</Label>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox 
                                                                id="reject" 
                                                                checked={actionStatus === 'Rejected'}
                                                                onCheckedChange={() => setActionStatus('Rejected')}
                                                            />
                                                            <Label htmlFor="reject" className="font-bold text-red-700 cursor-pointer">Reject</Label>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="remarks" className="font-bold">Client Remarks</Label>
                                                    <Textarea
                                                        id="remarks"
                                                        value={remarks}
                                                        onChange={(e) => setRemarks(e.target.value)}
                                                        placeholder={actionStatus === 'Rejected' ? "Mandatory: Please provide rejection reason..." : "Optional: Enter client feedback..."}
                                                        className="min-h-[120px]"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-4 pt-4 border-t">
                                            <Button variant="outline" onClick={() => setView('list')}>
                                                Cancel
                                            </Button>
                                            <Button 
                                                className={`min-w-[200px] ${actionStatus === 'Rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-gray-800'}`}
                                                disabled={actionLoading}
                                                onClick={handleSubmit}
                                            >
                                                {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                {actionStatus === 'Rejected' ? 'Submit Rejection' : 'Submit Approval'}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>

                    {/* Trail Sidebar Drawer */}
                    <Sheet open={isTrailOpen} onOpenChange={setIsTrailOpen}>
                        <SheetContent side="right" className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl flex flex-col">
                            <SheetHeader className="p-6 pb-2 border-b">
                                <SheetTitle className="flex items-center gap-2">
                                    <History className="w-5 h-5 text-primary" />
                                    Document Audit Trail
                                </SheetTitle>
                            </SheetHeader>
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                <DocumentTrail documentId={activeDocumentId} />
                            </div>
                        </SheetContent>
                    </Sheet>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
};

export default ClientApprovalStatus;
