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
    Search
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
import DocumentTrail from "../../components/dms/DocumentTrail";

const ClientApprovalStatus = () => {
    // Rejection Dialog State
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [selectedTransmission, setSelectedTransmission] = useState(null);
    const [rejectRemarks, setRejectRemarks] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Approve Dialog State
    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
    const [approveRemarks, setApproveRemarks] = useState("");

    // File State
    const [selectedFiles, setSelectedFiles] = useState([]);
    
    // Trail State
    const [isTrailOpen, setIsTrailOpen] = useState(false);
    const [activeDocumentId, setActiveDocumentId] = useState(null);

    const fetchTransmissionsWrapper = useCallback(async (params) => {
        try {
            // Fetch all transmissions, let user filter status if they want, or default to all relevant for this screen
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

    const openApproveDialog = (transmission) => {
        setSelectedTransmission(transmission);
        setApproveRemarks("");
        setSelectedFiles([]);
        setIsApproveDialogOpen(true);
    };

    const handleApproveSubmit = async () => {
        setActionLoading(true);
        try {
            const formData = new FormData();
            formData.append('transmission_id', selectedTransmission.id);
            formData.append('status', 'Approved');
            formData.append('remarks', approveRemarks || 'Approved by Client');
            
            selectedFiles.forEach(file => {
                formData.append('client_files', file);
            });

            const res = await dccService.updateTransmissionClientStatus(formData);

            if (res.success) {
                toast.success(`Transmission ${selectedTransmission.transmission_number} Approved`);
                setIsApproveDialogOpen(false);
                setRefreshTrigger(prev => prev + 1);
            } else {
                toast.error(res.message || "Approval failed");
            }
        } catch (error) {
            console.error("Approval error:", error);
            toast.error("An error occurred during approval.");
        } finally {
            setActionLoading(false);
        }
    };

    const openRejectDialog = (transmission) => {
        setSelectedTransmission(transmission);
        setRejectRemarks("");
        setSelectedFiles([]);
        setIsRejectDialogOpen(true);
    };

    const handleRejectSubmit = async () => {
        if (!rejectRemarks.trim()) {
            toast.error("Please enter remarks for rejection");
            return;
        }

        setActionLoading(true);
        try {
            const formData = new FormData();
            formData.append('transmission_id', selectedTransmission.id);
            formData.append('status', 'Rejected');
            formData.append('remarks', rejectRemarks);
            
            selectedFiles.forEach(file => {
                formData.append('client_files', file);
            });

            const res = await dccService.updateTransmissionClientStatus(formData);

            if (res.success) {
                toast.success(`Transmission ${selectedTransmission.transmission_number} Rejected`);
                setIsRejectDialogOpen(false);
                setRefreshTrigger(prev => prev + 1);
            } else {
                toast.error(res.message || "Rejection failed");
            }
        } catch (error) {
            console.error("Rejection error:", error);
            toast.error("An error occurred during rejection.");
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
                return <Badge className="bg-emerald-500 font-bold">Approved</Badge>
            case 'Rejected':
                return <Badge variant="destructive" className="font-bold">Rejected</Badge>
            case 'Sent':
                return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 font-bold">Awaiting Review</Badge>
            default:
                return <Badge variant="secondary" className="font-bold">{status || 'Pending'}</Badge>
        }
    };

    const columns = useMemo(() => [
        {
            accessorKey: "transmission_number",
            header: "Transmission No",
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-900">{row.transmission_number}</span>
                    <span className="text-[10px] text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</span>
                </div>
            )
        },
        {
            accessorKey: "po.po_number",
            header: "PO Number",
            cell: (row) => <span className="font-medium">{row.po?.po_number || '-'}</span>
        },
        {
            accessorKey: "customer.customer_name",
            header: "Customer",
            cell: (row) => <span className="text-slate-600 truncate max-w-[150px] inline-block">{row.customer?.customer_name || '-'}</span>
        },
        {
            accessorKey: "client_status",
            header: "Client Status",
            cell: (row) => getStatusBadge(row.client_status)
        },
        {
            id: "feedback",
            header: "Feedback",
            cell: (row) => row.client_archive_url ? (
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-[10px] gap-1 px-2 border-primary/20 text-primary hover:bg-primary/5"
                    onClick={() => handleDownloadFeedback(row.id, row.transmission_number)}
                >
                    <Download className="w-3 h-3" /> ZIP
                </Button>
            ) : <span className="text-slate-400 text-xs italic">No Files</span>
        },
        {
            id: "actions",
            header: "Action",
            cell: (row) => {
                const isProcessed = row.client_status === 'Approved' || row.client_status === 'Rejected';
                return (
                    <div className="flex gap-2">
                        {!isProcessed ? (
                            <>
                                <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 h-8 shadow-sm"
                                    onClick={() => openApproveDialog(row)}
                                    disabled={actionLoading}
                                >
                                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 shadow-sm"
                                    onClick={() => openRejectDialog(row)}
                                    disabled={actionLoading}
                                >
                                    <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                                </Button>
                            </>
                        ) : (
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50"
                                onClick={() => {
                                    setActiveDocumentId(row.id); // Although it's a transmission ID, we'll handle both in backend activity
                                    setIsTrailOpen(true);
                                }}
                            >
                                <History className="w-3.5 h-3.5 mr-1" /> History
                            </Button>
                        )}
                    </div>
                );
            }
        }
    ], [actionLoading]);

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
                <header className="flex h-16 shrink-0 items-center justify-between border-b px-6 bg-white/50 backdrop-blur-md sticky top-0 z-10 transition-all">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        <div className="h-4 w-px bg-slate-200 mx-2"></div>
                        <h1 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                            Client Approval Pipeline
                        </h1>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-6 bg-slate-50/50">
                    <div className="max-w-[1400px] mx-auto space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Review Transmissions</h2>
                                <p className="text-sm text-slate-500">
                                    Track and process client approvals for sent document packages.
                                </p>
                            </div>
                            <Button 
                                variant="outline" 
                                className="bg-white border-slate-200 text-slate-600 hover:shadow-md transition-all h-9"
                                onClick={handleExport}
                            >
                                <Download className="w-4 h-4 mr-2" /> Export Summary
                            </Button>
                        </div>

                        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
                            <CardContent className="p-0">
                                <DataTable
                                    columns={columns}
                                    fetchData={fetchTransmissionsWrapper}
                                    searchKey="transmission_number"
                                    refreshTrigger={refreshTrigger}
                                    className="border-none"
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Approve Dialog */}
                    <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                                </div>
                                <DialogTitle className="text-xl">Approve Transmission</DialogTitle>
                                <DialogDescription>
                                    Approve <span className="font-bold text-slate-900">{selectedTransmission?.transmission_number}</span> and optionally provide feedback.
                                </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="approve-remarks" className="text-slate-700 font-semibold">Client Remarks</Label>
                                    <Textarea
                                        id="approve-remarks"
                                        value={approveRemarks}
                                        onChange={(e) => setApproveRemarks(e.target.value)}
                                        placeholder="Add any additional comments here..."
                                        className="h-24 resize-none border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-slate-700 font-semibold flex items-center gap-2">
                                        <Upload className="w-4 h-4" /> Supporting Documents (Optional)
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="file"
                                            multiple
                                            onChange={handleFileChange}
                                            className="hidden"
                                            id="approve-files"
                                        />
                                        <Label
                                            htmlFor="approve-files"
                                            className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer transition-all text-slate-500 text-sm"
                                        >
                                            <Upload className="w-4 h-4" /> Click to add files or images
                                        </Label>
                                    </div>

                                    {/* Selected Files List */}
                                    {selectedFiles.length > 0 && (
                                        <div className="space-y-2 mt-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                            {selectedFiles.map((file, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-slate-50 border border-slate-100 group animate-in slide-in-from-left-2 transition-all">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <File className="w-4 h-4 text-emerald-500 shrink-0" />
                                                        <span className="text-xs text-slate-600 truncate">{file.name}</span>
                                                        <span className="text-[10px] text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => removeFile(idx)}
                                                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0 bg-slate-50 p-6 -mx-6 -mb-6 rounded-b-lg">
                                <Button variant="ghost" onClick={() => setIsApproveDialogOpen(false)} className="text-slate-500 hover:text-slate-700">Cancel</Button>
                                <Button 
                                    className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 px-8" 
                                    onClick={handleApproveSubmit} 
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                    Confirm Approval
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Reject Dialog */}
                    <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-4">
                                    <XCircle className="w-6 h-6 text-rose-600" />
                                </div>
                                <DialogTitle className="text-xl text-rose-900">Reject Transmission</DialogTitle>
                                <DialogDescription>
                                    Provide rejection reasons for <span className="font-bold text-slate-900">{selectedTransmission?.transmission_number}</span>.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="remarks" className="text-slate-700 font-semibold italic">Rejection Remarks *</Label>
                                    <Textarea
                                        id="remarks"
                                        value={rejectRemarks}
                                        onChange={(e) => setRejectRemarks(e.target.value)}
                                        placeholder="Explain why this package is being rejected..."
                                        className="h-24 resize-none border-slate-200 focus:border-rose-500 focus:ring-rose-500"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-slate-700 font-semibold flex items-center gap-2">
                                        <Upload className="w-4 h-4" /> Supporting Evidence
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="file"
                                            multiple
                                            onChange={handleFileChange}
                                            className="hidden"
                                            id="reject-files"
                                        />
                                        <Label
                                            htmlFor="reject-files"
                                            className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-slate-200 hover:border-rose-500 hover:bg-rose-50 cursor-pointer transition-all text-slate-500 text-sm"
                                        >
                                            <Upload className="w-4 h-4" /> Upload stamps or marked-up PDFs
                                        </Label>
                                    </div>

                                    {/* Selected Files List */}
                                    {selectedFiles.length > 0 && (
                                        <div className="space-y-2 mt-2 max-h-32 overflow-y-auto pr-1">
                                            {selectedFiles.map((file, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-slate-50 border border-slate-100 group animate-in slide-in-from-left-2">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <File className="w-4 h-4 text-rose-500 shrink-0" />
                                                        <span className="text-xs text-slate-600 truncate">{file.name}</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => removeFile(idx)}
                                                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0 bg-slate-50 p-6 -mx-6 -mb-6 rounded-b-lg">
                                <Button variant="ghost" onClick={() => setIsRejectDialogOpen(false)} className="text-slate-500 hover:text-slate-700">Cancel</Button>
                                <Button 
                                    variant="destructive" 
                                    className="px-8 shadow-lg shadow-rose-600/20"
                                    onClick={handleRejectSubmit} 
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                                    Proceed Rejection
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

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
