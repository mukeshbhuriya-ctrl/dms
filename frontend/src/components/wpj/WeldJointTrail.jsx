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
        <div className="p-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Inspection Activity Trail
            </h3>

            <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {[...activities].reverse().map((activity, index) => (
                    <div key={activity.id} className="relative flex items-start group">
                        {/* Icon Circle */}
                        <div className="absolute left-0 flex items-center justify-center w-10 h-10 rounded-full bg-white border-2 border-slate-100 shadow-sm z-10 group-hover:border-primary transition-colors">
                            {getStatusIcon(activity.status)}
                        </div>

                        {/* Content */}
                        <div className="ml-14 pt-0.5 flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                                <span className="font-bold text-slate-900 text-sm">
                                    {getStageLabel(activity.stage_name)} - {getStatusLabel(activity.status)}
                                </span>
                                <time className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {activity.createdAt ? format(new Date(activity.createdAt), 'dd MMM yyyy, hh:mm a') : 'N/A'}
                                </time>
                            </div>

                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md hover:border-slate-200 transition-all">
                                {activity.remarks && (
                                    <p className="text-sm text-slate-600 mb-3 leading-relaxed border-l-2 border-primary/20 pl-3 italic">
                                        "{activity.remarks}"
                                    </p>
                                )}
                                
                                <div className="flex flex-wrap items-center gap-3">
                                    {activity.prod_eng && (
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-100">
                                            <User className="w-3 h-3" />
                                            <span>Prod: {activity.prod_eng.name}</span>
                                        </div>
                                    )}

                                    {activity.qc_eng && (
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-100">
                                            <ShieldCheck className="w-3 h-3 text-green-600" />
                                            <span>QC: {activity.qc_eng.name}</span>
                                        </div>
                                    )}

                                    {activity.assigned_qc_group && activity.status === 'pending' && (
                                        <div className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                                            <User className="w-3 h-3" />
                                            <span>Group: {activity.assigned_qc_group.name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WeldJointTrail;
