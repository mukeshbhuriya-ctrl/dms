import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, FileEdit } from "lucide-react";
import { format } from "date-fns";

const ModRequestsSheet = ({
    open,
    onOpenChange,
    requests = [],
    onAction,
    actionLoading
}) => {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-xl w-full p-0 overflow-y-auto bg-slate-50">
                <SheetHeader className="p-6 pb-4 border-b bg-white sticky top-0 z-10">
                    <SheetTitle className="text-xl font-bold flex flex-col gap-1">
                        <span className="text-slate-800">Modification Requests</span>
                        <span className="text-sm font-medium text-slate-500">
                            Review and approve requests to modify previously approved inspection stages.
                        </span>
                    </SheetTitle>
                </SheetHeader>
                <div className="p-6 space-y-4">
                    {requests.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
                            <CheckCircle2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-sm font-semibold text-slate-700">All caught up!</h3>
                            <p className="text-xs text-slate-500 mt-1">There are no pending modification requests.</p>
                        </div>
                    ) : (
                        requests.map((req) => (
                            <div key={req.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-colors">
                                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                                {req.weld_joint?.joint_no || 'Unknown Joint'}
                                            </span>
                                            <span className="text-sm font-semibold text-slate-800 uppercase">
                                                {req.stage_name}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Requested by <span className="font-medium text-slate-700">{req.requester?.name || 'Unknown User'}</span> on {format(new Date(req.createdAt), 'MMM d, yyyy h:mm a')}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-4 bg-white">
                                    <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Reason</h4>
                                    <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-md border border-slate-100">
                                        {req.reason}
                                    </p>
                                </div>
                                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onAction(req.id, 'reject')}
                                        disabled={actionLoading === req.id}
                                        className="h-8 text-red-600 border-red-200 hover:bg-red-50"
                                    >
                                        {actionLoading === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <XCircle className="h-3.5 w-3.5 mr-1.5" />}
                                        Reject
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => onAction(req.id, 'approve')}
                                        disabled={actionLoading === req.id}
                                        className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                        {actionLoading === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                                        Approve
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default ModRequestsSheet;
