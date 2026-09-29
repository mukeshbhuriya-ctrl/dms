import React, { useEffect, useState } from 'react';
import { 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Upload, 
    User, 
    History
} from 'lucide-react';
import { format } from 'date-fns';
import apiClient from "@/api/api.client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const MhcItemTrail = ({ itemId, open, onOpenChange }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (itemId) {
            fetchTrail();
        }
    }, [itemId]);

    const fetchTrail = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/api/mhc/item/${itemId}/history`);
            if (response.success) {
                // Transform history versions into sequential activities
                const historyData = response.data;
                const newActivities = [];

                historyData.forEach((item) => {
                    // Production Offer activity
                    if (item.production_date && item.production_engineer_id) {
                        newActivities.push({
                            id: `prod_${item.id}`,
                            action: 'Offered',
                            createdAt: item.production_date,
                            user: item.prod_engineer,
                            remarks: `Item offered by production. Heat No: ${item.heat_no || '-'}, GRN: ${item.grn_app_ap_no || '-'}`,
                            version: item.version
                        });
                    }

                    // QC Review activity
                    if (item.qc_date && item.qc_engineer_id) {
                        newActivities.push({
                            id: `qc_${item.id}`,
                            action: item.qc_status, // Approved, Rejected, etc.
                            createdAt: item.qc_date,
                            user: item.qc_reviewer,
                            remarks: item.qc_remarks || `${item.qc_status} by QC.`,
                            version: item.version
                        });
                    }
                });

                // Sort chronologically
                newActivities.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                
                setActivities(newActivities);
            }
        } catch (error) {
            console.error('Error fetching MHC item trail:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'Offered': return <Upload className="w-4 h-4 text-blue-500" />;
            case 'Approved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'Rejected': return <XCircle className="w-4 h-4 text-red-500" />;
            default: return <History className="w-4 h-4 text-gray-500" />;
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Item Audit Trail</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="text-center p-8 text-gray-500 italic">
                            No activity recorded yet for this item.
                        </div>
                    ) : (
                        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                            <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                                <History className="w-5 h-5 text-primary" />
                                Item History & Audit Trail
                            </h3>

                            <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                            {activities.map((activity) => (
                                <div key={activity.id} className="relative flex items-start group">
                                    {/* Icon Circle */}
                                    <div className="absolute left-0 flex items-center justify-center w-10 h-10 rounded-full bg-white border-2 border-slate-100 shadow-sm z-10 group-hover:border-primary transition-colors">
                                        {getActionIcon(activity.action)}
                                    </div>

                                    {/* Content */}
                                    <div className="ml-14 pt-0.5 flex-1">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                                            <span className="font-bold text-slate-900 text-sm">
                                                {activity.action} <span className="text-xs font-normal text-slate-500 ml-2">(v{activity.version})</span>
                                            </span>
                                            <time className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {activity.createdAt ? (
                                                    (() => {
                                                        const d = new Date(activity.createdAt);
                                                        return isNaN(d.getTime()) ? 'Invalid Date' : format(d, 'dd MMM yyyy, hh:mm a');
                                                    })()
                                                ) : 'N/A'}
                                            </time>
                                        </div>

                                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md hover:border-slate-200 transition-all">
                                            <p className="text-sm text-slate-600 mb-2 leading-relaxed">
                                                {activity.remarks}
                                            </p>
                                            
                                            <div className="flex flex-wrap items-center gap-3 mt-2">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-100">
                                                    <User className="w-3 h-3" />
                                                    <span>
                                                        {activity.user?.name || 'Unknown User'}
                                                        {activity.user?.empid ? ` (EMP-${activity.user.empid})` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default MhcItemTrail;
