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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'react-toastify';
import { Loader2, CheckCircle, XCircle, Download } from "lucide-react";
import { dccService } from "../../services/dcc.service";
import { DataTable } from "@/components/shared/DataTable";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

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

    const fetchTransmissionsWrapper = useCallback(async (params) => {
        try {
            // The DataTable will pass params like page, pageSize, search, sortBy, sortOrder
            // We need to ensure our backend API can handle these or adapt them.
            // For now, we'll pass them directly and filter by status 'Sent'.
            const res = await dccService.getTransmissions({ ...params, status: 'Sent' });
            if (res.success) {
                // Backend returns { success: true, data: { data: [], meta: {} } }
                // So res.data contains both the array and the meta info
                console.log("Transmissions response:", res);
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
    }, [refreshTrigger]); // refreshTrigger will cause this callback to be recreated, thus triggering a re-fetch in DataTable

    const openApproveDialog = (transmission) => {
        setSelectedTransmission(transmission);
        setApproveRemarks("");
        setIsApproveDialogOpen(true);
    };

    const handleApproveSubmit = async () => {
        setActionLoading(true);
        try {
            const res = await dccService.updateTransmissionClientStatus({
                transmission_id: selectedTransmission.id,
                status: 'Approved',
                remarks: approveRemarks || 'Approved by Client'
            });

            if (res.success) {
                toast.success(`Transmission ${selectedTransmission.transmission_number} Approved`);
                setIsApproveDialogOpen(false);
                setRefreshTrigger(prev => prev + 1); // Refresh table
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
        setIsRejectDialogOpen(true);
    };

    const handleRejectSubmit = async () => {
        if (!rejectRemarks.trim()) {
            toast.error("Please enter remarks for rejection");
            return;
        }

        setActionLoading(true);
        try {
            const res = await dccService.updateTransmissionClientStatus({
                transmission_id: selectedTransmission.id,
                status: 'Rejected',
                remarks: rejectRemarks
            });

            if (res.success) {
                toast.success(`Transmission ${selectedTransmission.transmission_number} Rejected`);
                setIsRejectDialogOpen(false);
                setRefreshTrigger(prev => prev + 1); // Refresh table
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

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Approved':
                return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Approved</span>
            case 'Rejected':
                return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Rejected</span>
            case 'Pending':
            default:
                return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">Pending</span>
        }
    };

    const columns = useMemo(() => [
        {
            accessorKey: "transmission_number",
            header: "Transmission No",
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
            accessorKey: "createdAt",
            header: "Created Date",
            cell: (row) => new Date(row.createdAt).toLocaleDateString()
        },
        {
            accessorKey: "client_status",
            header: "Client Status",
            cell: (row) => getStatusBadge(row.client_status)
        },
        {
            accessorKey: "client_remarks",
            header: "Remarks",
            cell: (row) => row.client_remarks || '-'
        },
        {
            id: "actions",
            header: "Action",
            cell: (row) => {
                const t = row;
                return (
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => openApproveDialog(t)}
                            disabled={t.client_status === 'Approved' || t.client_status === 'Rejected' || actionLoading}
                        >
                            <CheckCircle className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openRejectDialog(t)}
                            disabled={t.client_status === 'Approved' || t.client_status === 'Rejected' || actionLoading}
                        >
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                        </Button>
                    </div>
                );
            }
        }
    ], [actionLoading]); // Re-memoize columns if actionLoading changes to update disabled state

    return (
        <SidebarProvider>
            <AdminSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                    <div className="mr-4 hidden h-4 w-px bg-border md:block"></div>
                    {/* <div className="flex items-center gap-2">
                        <span className="font-medium">DMS / Client Approval Status</span>
                    </div> */}
                </header>

                <main className="flex-1 overflow-auto p-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-6">
                            <h2 className="text-3xl font-bold mb-2">Client Approval Status</h2>
                            <p className="text-muted-foreground">
                                Manage client approvals for sent transmissions.
                            </p>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Transmissions</CardTitle>
                                <CardDescription>
                                    Approve or Reject sent transmissions.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border p-2">
                                    <DataTable
                                        columns={columns}
                                        fetchData={fetchTransmissionsWrapper}
                                        searchKey="transmission_number"
                                        refreshTrigger={refreshTrigger}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Approve Dialog */}
                    <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Approve Transmission</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to approve Transmission {selectedTransmission?.transmission_number}?
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="approve-remarks">Remarks (Optional)</Label>
                                    <Textarea
                                        id="approve-remarks"
                                        value={approveRemarks}
                                        onChange={(e) => setApproveRemarks(e.target.value)}
                                        placeholder="Enter approval remarks..."
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>Cancel</Button>
                                <Button className="bg-green-600 hover:bg-green-700" onClick={handleApproveSubmit} disabled={actionLoading}>
                                    {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Approve
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Reject Dialog */}
                    <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Reject Transmission</DialogTitle>
                                <DialogDescription>
                                    Please provide remarks for rejecting Transmission {selectedTransmission?.transmission_number}.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="remarks">Remarks</Label>
                                    <Textarea
                                        id="remarks"
                                        value={rejectRemarks}
                                        onChange={(e) => setRejectRemarks(e.target.value)}
                                        placeholder="Enter rejection reason..."
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
                                <Button variant="destructive" onClick={handleRejectSubmit} disabled={actionLoading}>
                                    {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Reject
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
};

export default ClientApprovalStatus;
