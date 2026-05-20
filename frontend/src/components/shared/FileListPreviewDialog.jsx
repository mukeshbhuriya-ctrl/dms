import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Eye, X } from "lucide-react";

export function FileListPreviewDialog({
    isOpen,
    onClose,
    files = [],
    documentName = "Document Files",
    onPreviewFile
}) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || '';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <div className="flex flex-col gap-6 w-full overflow-hidden">
                    <div>
                        <DialogTitle className="text-xl font-bold text-slate-900">
                            Attached Files
                        </DialogTitle>
                        <DialogDescription className="text-sm text-slate-500 mt-1">
                            {documentName}
                        </DialogDescription>
                    </div>

                    <div className="space-y-3 w-full overflow-hidden">
                        <h3 className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                            Available Documents
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">{files?.length || 0} file(s)</span>
                        </h3>
                        {files && files.length > 0 ? (
                            <div className="max-h-[250px] overflow-y-auto overflow-x-hidden space-y-2 pr-2 custom-scrollbar w-full">
                                {files.map((fileObj, idx) => {
                                    const fullUrl = fileObj.file_url.startsWith('http') ? fileObj.file_url : `${backendUrl}${fileObj.file_url}`;
                                    
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white shadow-sm w-full">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="p-2 bg-primary/5 text-primary rounded-md shrink-0">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-slate-700 truncate" title={fileObj.original_filename || fileObj.file_path}>
                                                        {fileObj.original_filename || fileObj.file_path.split('/').pop()}
                                                    </p>
                                                    <p className="text-xs text-slate-400 uppercase truncate">
                                                        {fileObj.mime_type?.split('/')[1] || 'FILE'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0 pl-3">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => onPreviewFile({
                                                        documentName: fileObj.original_filename,
                                                        mimeType: fileObj.mime_type,
                                                        filePath: fileObj.file_path,
                                                        previewUrl: fullUrl
                                                    })}
                                                    className="text-slate-400 hover:text-blue-500 hover:bg-blue-50 cursor-pointer"
                                                    title="Preview File"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                                <div className="bg-white shadow-sm w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <FileText className="w-5 h-5 text-slate-400" />
                                </div>
                                <p className="text-xs text-slate-500 font-medium">No files attached to this version.</p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                        <Button variant="outline" onClick={() => onClose(false)} className="cursor-pointer">
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
