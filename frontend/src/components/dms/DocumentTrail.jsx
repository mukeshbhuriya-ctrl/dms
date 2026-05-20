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
import { dccService } from '../../services/dcc.service';
import { format } from 'date-fns';

const DocumentTrail = ({ documentId, onPreview }) => {
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
            const response = await dccService.getDocumentTrail(documentId);
            if (response.success) {
                setActivities(response.data);
            }
        } catch (error) {
            console.error('Error fetching document trail:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'Assigned': return <User className="w-4 h-4 text-blue-500" />;
            case 'Uploaded': return <Upload className="w-4 h-4 text-purple-500" />;
            case 'Internal Approved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'Internal Rejected': return <XCircle className="w-4 h-4 text-red-500" />;
            case 'Transmittal Created': return <FileText className="w-4 h-4 text-indigo-500" />;
            case 'Transmitted Mail Sent': return <Mail className="w-4 h-4 text-cyan-600" />;
            case 'Transmitted': return <Send className="w-4 h-4 text-indigo-500" />;
            case 'Client Approved': 
            case 'Client Final Approved': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case 'Client Rejected': return <XCircle className="w-4 h-4 text-rose-500" />;
            case 'Client As Built': return <CheckCircle2 className="w-4 h-4 text-indigo-500" />;
            case 'Client Re-approval': return <Send className="w-4 h-4 text-amber-500" />;
            case 'Client Commented': return <FileText className="w-4 h-4 text-sky-500" />;
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
                No activity recorded yet for this document.
            </div>
        );
    }

    return (
        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Document History & Audit Trail
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
                                    {activity.remarks || `Document ${activity.action.toLowerCase()} successfully.`}
                                </p>
                                
                                <div className="flex flex-wrap items-center gap-3 mt-2">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-100">
                                        <User className="w-3 h-3" />
                                        <span>
                                            {activity.user?.name || 'Unknown User'}
                                            {activity.user?.empid ? ` (EMP-${activity.user.empid})` : ''}
                                        </span>
                                    </div>
                                    
                                    {activity.metadata && (
                                        <div className="flex items-center gap-3">
                                            {activity.metadata.files && Array.isArray(activity.metadata.files) && activity.metadata.files.length > 0 ? (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {activity.metadata.files.map((fileObj, idx) => {
                                                        const rawUrl = fileObj.file_url || '';
                                                        const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${import.meta.env.VITE_BACKEND_URL || ''}${rawUrl}`;
                                                        return (
                                                            <div key={idx} className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        if (onPreview) {
                                                                            onPreview({
                                                                                documentName: fileObj.original_filename || `Revision ${activity.metadata.version_no}`,
                                                                                versionNo: activity.metadata.version_no,
                                                                                mimeType: fileObj.mime_type || '',
                                                                                filePath: fileObj.file_path || fileObj.file_url,
                                                                                previewUrl: fullUrl
                                                                            });
                                                                        } else {
                                                                            window.open(fullUrl, '_blank');
                                                                        }
                                                                    }}
                                                                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 hover:shadow-sm border border-blue-200 transition-all cursor-pointer group/preview"
                                                                    title={`Preview ${fileObj.original_filename || 'this version'}`}
                                                                >
                                                                    <FileText className="w-3 text-blue-600" />
                                                                    <span className="truncate max-w-[150px] text-blue-700">{fileObj.original_filename || `Revision ${activity.metadata.version_no}`}</span>
                                                                    <Eye className="w-3.5 h-3.5 ml-1 text-blue-600 group-hover/preview:scale-110 transition-transform" />
                                                                </button>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            ) : activity.metadata.file_url ? (
                                                <div className="flex items-center gap-2">
                                                    {onPreview ? (
                                                        <button
                                                            onClick={() => {
                                                                const rawUrl = activity.metadata.preview_url || activity.metadata.file_url || '';
                                                                const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${import.meta.env.VITE_BACKEND_URL || ''}${rawUrl}`;
                                                                onPreview({
                                                                    documentName: `Version ${activity.metadata.version_no}`,
                                                                    versionNo: activity.metadata.version_no,
                                                                    mimeType: activity.metadata.mime_type,
                                                                    filePath: activity.metadata.file_path,
                                                                    previewUrl: fullUrl
                                                                });
                                                            }}
                                                            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 hover:shadow-sm border border-blue-200 transition-all cursor-pointer group/preview"
                                                            title="Preview this version"
                                                        >
                                                            <FileText className="w-3 text-blue-600" />
                                                            <span className="text-blue-700">Revision {activity.metadata.version_no}</span>
                                                            <Eye className="w-3.5 h-3.5 ml-1 text-blue-600 group-hover/preview:scale-110 transition-transform" />
                                                        </button>
                                                    ) : (
                                                        <a
                                                            href={activity.metadata.file_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/5 px-2 py-1 rounded hover:bg-primary/10 hover:shadow-sm border border-primary/20 transition-all cursor-pointer group/dl"
                                                            title="Open this version"
                                                        >
                                                            <FileText className="w-3 h-3" />
                                                            <span>Revision {activity.metadata.version_no}</span>
                                                            <Eye className="w-3.5 h-3.5 ml-1 text-primary group-hover/dl:scale-110 transition-transform" />
                                                        </a>
                                                    )}
                                                </div>
                                            ) : null}
                                            {activity.metadata.transmission_no && (
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                                    <Send className="w-3 h-3" />
                                                    <span>TR: {activity.metadata.transmission_no}</span>
                                                </div>
                                            )}
                                            {activity.metadata.feedback_url && (
                                                <a
                                                    href={activity.metadata.feedback_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    download
                                                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100 hover:shadow-sm border border-emerald-200 transition-all cursor-pointer group/fb"
                                                    title="Download Client Feedback ZIP"
                                                >
                                                    <Download className="w-3.5 h-3.5 mr-1" />
                                                    <span>Client ZIP</span>
                                                </a>
                                            )}
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

export default DocumentTrail;
