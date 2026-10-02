import React, { useEffect, useState } from 'react';
import { 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Send, 
    User, 
    History,
    ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import apiClient from "@/api/api.client";
import WELD_STAGES_CONFIG from "@/config/weldStagesConfig";

const WeldJointTrail = ({ jointId, jointCategory }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (jointId) {
            fetchTrail();
        }
    }, [jointId]);

    const fetchTrail = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/api/wpj/joint-trail/${jointId}`);
            if (response.success) {
                setActivities(response.data);
            }
        } catch (error) {
            console.error('Error fetching weld joint trail:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStageLabel = (stageId) => {
        const cat = jointCategory?.toUpperCase() || 'A';
        const config = WELD_STAGES_CONFIG[cat] || [];
        const stage = config.find(s => s.id === stageId);
        return stage ? stage.label : stageId.replace('stage', 'Stage ');
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
            case 'pending': return <Send className="w-4 h-4 text-blue-500" />;
            case 'submitted': return <Send className="w-4 h-4 text-indigo-500" />;
            default: return <History className="w-4 h-4 text-gray-500" />;
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'approved': return 'Approved';
            case 'rejected': return 'Rejected';
            case 'pending': return 'Submitted for Review';
            case 'submitted': return 'Submitted';
            default: return status.charAt(0).toUpperCase() + status.slice(1);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="text-center p-8 text-gray-500 italic">
                No activity recorded yet for this weld joint.
            </div>
        );
    }

    return (
        <div className="p-6 pb-12">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                <History className="w-5 h-5 text-blue-500" />
                Inspection Activity Trail
            </h3>

            <div className="relative border-l-2 border-slate-200 ml-4 space-y-8">
                {[...activities].reverse().map((activity, index) => (
                    <div key={activity.id} className="relative pl-8 group">
                        {/* Icon Circle */}
                        <span className="absolute -left-3 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-50 shadow-sm border border-slate-200 ring-4 ring-white transition-all">
                            {getStatusIcon(activity.status)}
                        </span>

                        {/* Content */}
                        <div className="flex flex-col gap-3 p-4 rounded-xl bg-white shadow-sm border border-slate-200 group-hover:border-blue-200 group-hover:shadow-md transition-all">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <span className="text-sm font-bold text-slate-800 leading-tight">
                                    {getStageLabel(activity.stage_name)} - <span className="text-slate-500 font-medium">{getStatusLabel(activity.status)}</span>
                                </span>
                                <time className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 whitespace-nowrap pt-0.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    {activity.createdAt ? format(new Date(activity.createdAt), 'dd MMM yyyy, hh:mm a') : 'N/A'}
                                </time>
                            </div>

                            {(activity.remarks || activity.production_engineer || activity.qc_engineer) && (
                                <div className="space-y-3 pt-3 border-t border-slate-100">
                                    {activity.remarks && (
                                        <div className="text-[13px] text-slate-700 bg-slate-50/50 rounded-md p-3 border border-slate-100 italic break-words whitespace-pre-wrap leading-relaxed shadow-sm">
                                            "{activity.remarks}"
                                        </div>
                                    )}
                                    
                                    <div className="flex flex-wrap items-center gap-3">
                                        {activity.production_engineer && (
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                                                <User className="w-3.5 h-3.5 text-slate-500" />
                                                <span>Prod: {activity.production_engineer.name}</span>
                                            </div>
                                        )}

                                        {activity.qc_engineer && (
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                                <span>QC: {activity.qc_engineer.name}</span>
                                            </div>
                                        )}

                                        {activity.qc_group && activity.status === 'pending' && (
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                                                <User className="w-3.5 h-3.5 text-blue-600" />
                                                <span>Group: {activity.qc_group.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WeldJointTrail;

