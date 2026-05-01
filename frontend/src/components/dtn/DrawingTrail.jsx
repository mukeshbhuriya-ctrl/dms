import React, { useEffect, useState } from 'react';
import { 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Upload, 
    Send, 
    User, 
    FileText,
    History,
    Download,
    Eye,
    Mail
} from 'lucide-react';
import apiClient from "@/api/api.client";
import { format } from 'date-fns';

const DrawingTrail = ({ documentId, onPreview }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (documentId) {
            fetchTrail();
        }
    }, [documentId]);

    const fetchTrail = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/api/dtn/master/drawing-trail/${documentId}`);
            if (response.success) {
                setActivities(response.data);
            }
        } catch (error) {
            console.error('Error fetching drawing trail:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (action) => {
        // DTN specific actions
        if (action.includes('Uploaded')) return <Upload className="w-4 h-4 text-purple-500" />;
        if (action.includes('Overwrote')) return <History className="w-4 h-4 text-amber-500" />;
        if (action.includes('Transmitted')) return <Send className="w-4 h-4 text-indigo-500" />;

        switch (action) {
            case 'Assigned': return <User className="w-4 h-4 text-blue-500" />;
            case 'Internal Approved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'Internal Rejected': return <XCircle className="w-4 h-4 text-red-500" />;
            default: return <History className="w-4 h-4 text-gray-500" />;
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
                No activity recorded yet for this drawing.
            </div>
        );
    }

    return (
        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Drawing History & Audit Trail
            </h3>

            <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {activities.map((activity, index) => (
                    <div key={activity.id} className="relative flex items-start group">
                        {/* Icon Circle */}
                        <div className="absolute left-0 flex items-center justify-center w-10 h-10 rounded-full bg-white border-2 border-slate-100 shadow-sm z-10 group-hover:border-primary transition-colors">
                            {getActionIcon(activity.action)}
                        </div>

                        {/* Content */}
                        <div className="ml-14 pt-0.5 flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                                <span className="font-bold text-slate-900 text-sm">
                                    {activity.action}
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
                                    {activity.remarks || `Drawing ${activity.action.toLowerCase()} successfully.`}
                                </p>
                                
                                <div className="flex flex-wrap items-center gap-3 mt-2">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-100">
                                        <User className="w-3 h-3" />
                                        <span>{activity.user?.name || 'Unknown User'}</span>
                                    </div>
                                    
                                    {activity.metadata && activity.metadata.file_url && (
                                        <div className="flex items-center gap-2 mt-2"> 
                                            <button
                                                onClick={() => onPreview({
                                                    documentName: `Revision ${activity.metadata.version_no}`,
                                                    versionNo: activity.metadata.version_no,
                                                    mimeType: activity.metadata.mime_type,
                                                    filePath: activity.metadata.file_path,
                                                    previewUrl: activity.metadata.preview_url || activity.metadata.file_url
                                                })}
                                                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded border border-blue-100 hover:bg-blue-100 transition-all cursor-pointer shadow-sm"
                                                title="Preview this version"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>Preview</span>
                                            </button>
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

export default DrawingTrail;
