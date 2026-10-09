import React, { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Upload, Eye, Trash2 } from "lucide-react";
import { DocumentPreviewDialog } from "./DocumentPreviewDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { toast } from "react-toastify";

export function MultiFileUploadModal({
    isOpen,
    onClose,
    onSubmit,
    title = "Manage Files",
    description = "View, append, or remove files for this document.",
    existingFiles = [],
    onDeleteExisting = null,
    readOnly = false,
    onPreviewExisting = null
}) {
    const [stagedFiles, setStagedFiles] = useState([]);
    
    // Internal Preview States
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [activePreviewDoc, setActivePreviewDoc] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, fileId: null });
    
    const fileInputRef = useRef(null);

    // Reset staged files when modal closes
    useEffect(() => {
        if (!isOpen) {
            setStagedFiles([]);
        }
    }, [isOpen]);

    const handleStageFiles = (e) => {
        const newFiles = Array.from(e.target.files);
        const scriptExtensions = ['.exe', '.bat', '.cmd', '.sh', '.js', '.vbs', '.msi'];
        const mediaExtensions = ['.mp3', '.wav', '.wma', '.m4a', '.aac', '.ogg', '.flac', '.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm', '.mpeg', '.mpg'];
        
        const validFiles = [];
        let rejectedMedia = [];
        let rejectedScript = [];

        newFiles.forEach(file => {
            const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            if (scriptExtensions.includes(ext)) {
                rejectedScript.push(file.name);
            } else if (mediaExtensions.includes(ext)) {
                rejectedMedia.push(file.name);
            } else {
                validFiles.push(file);
            }
        });

        if (rejectedScript.length > 0) {
            toast.error(`Security Warning: Executables/scripts (${rejectedScript.join(', ')}) are not allowed.`);
        }
        if (rejectedMedia.length > 0) {
            toast.error(`Restriction: Audio/video files (${rejectedMedia.join(', ')}) are not allowed.`);
        }

        if (validFiles.length > 0) {
            setStagedFiles(prev => [...prev, ...validFiles]);
        }
        if(e.target) {
            e.target.value = null; // Reset input
        }
    };

    const handleRemoveStagedFile = (index) => {
        setStagedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handlePreviewStagedFile = (file) => {
        const localUrl = URL.createObjectURL(file);
        setActivePreviewDoc({
            documentName: file.name,
            mimeType: file.type,
            filePath: file.name
        });
        setPreviewUrl(localUrl);
        setIsPreviewOpen(true);
    };

    const handleSubmit = () => {
        onSubmit(stagedFiles);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleStageFiles({ target: { files: e.dataTransfer.files } });
        }
    };

    return (
        <>
            <Sheet open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
                <SheetContent className="sm:max-w-md w-full overflow-hidden flex flex-col p-0 border-l border-slate-200">
                    <div className="flex flex-col h-full bg-slate-50/50">
                        <SheetHeader className="px-6 py-6 border-b border-slate-200 bg-white shadow-sm z-10 text-left">
                            <SheetTitle className="text-xl font-semibold text-slate-800">{title}</SheetTitle>
                            <SheetDescription className="text-slate-500">{description}</SheetDescription>
                        </SheetHeader>
                        
                        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 custom-scrollbar">
                            
                            {/* Upload Area */}
                            {!readOnly && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                                        Upload New Files
                                    </h3>
                                    <div 
                                        className="border-2 border-dashed border-primary/20 rounded-xl p-8 text-center bg-white hover:bg-primary/5 transition-all w-full cursor-pointer group"
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            className="hidden"
                                            onChange={handleStageFiles}
                                        />
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Upload className="w-6 h-6 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-700">Click to upload or drag and drop</p>
                                                <p className="text-xs text-slate-500 mt-1">PDF, DOCX, XLSX up to 50MB</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Staged Files Section */}
                            {!readOnly && stagedFiles.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                                        Files to Upload
                                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">{stagedFiles.length} file(s)</span>
                                    </h3>
                                    <div className="space-y-2">
                                        {stagedFiles.map((file, idx) => {
                                            const ext = file.name.substring(file.name.lastIndexOf('.') + 1).toUpperCase();
                                            return (
                                                <div key={idx} className="group flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-primary/30 hover:shadow-sm transition-all">
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                                                            <FileText className="w-5 h-5 text-blue-500" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-semibold text-slate-700 truncate" title={file.name}>{file.name}</p>
                                                            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{ext} • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={(e) => { e.stopPropagation(); handlePreviewStagedFile(file); }}
                                                            className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/10 cursor-pointer"
                                                            title="Preview"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={(e) => { e.stopPropagation(); handleRemoveStagedFile(idx); }}
                                                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                                            title="Remove"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Existing Files Section */}
                            {existingFiles && existingFiles.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                                        Available Documents
                                        <span className="bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded-full text-xs font-medium">{existingFiles.length} file(s)</span>
                                    </h3>
                                    <div className="space-y-2">
                                        {existingFiles.map((file, idx) => {
                                            const ext = file.original_filename?.substring(file.original_filename.lastIndexOf('.') + 1).toUpperCase() || 'FILE';
                                            return (
                                                <div 
                                                    key={file.id || idx} 
                                                    className={`group flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all ${readOnly || onPreviewExisting ? 'cursor-pointer hover:shadow-sm' : ''}`}
                                                    onClick={() => {
                                                        if (onPreviewExisting) onPreviewExisting(file);
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="w-10 h-10 rounded bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                                                            <FileText className="w-5 h-5 text-slate-500 group-hover:text-blue-500 transition-colors" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-blue-700 transition-colors" title={file.original_filename}>{file.original_filename}</p>
                                                            {file.file_size && (
                                                                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider group-hover:text-blue-500/70 transition-colors">{ext} • {(file.file_size / 1024 / 1024).toFixed(2)} MB</p>
                                                            )}
                                                            {!file.file_size && (
                                                                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider group-hover:text-blue-500/70 transition-colors">{ext}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity pl-3">
                                                        {onPreviewExisting && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onPreviewExisting(file);
                                                                }}
                                                                className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                                                                title="Preview File"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        {onDeleteExisting && !readOnly && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setConfirmDelete({ isOpen: true, fileId: file.id });
                                                                }}
                                                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                                                title="Remove File"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                        </div>

                        <SheetFooter className="px-6 py-4 border-t border-slate-200 bg-white shrink-0 shadow-sm z-10 flex flex-row items-center justify-end gap-3">
                            {readOnly ? (
                                <Button variant="outline" onClick={() => onClose(false)} className="w-24 cursor-pointer">
                                    Close
                                </Button>
                            ) : (
                                <>
                                    <Button variant="outline" onClick={() => onClose(false)} className="w-24 cursor-pointer">
                                        Cancel
                                    </Button>
                                    <Button 
                                        onClick={handleSubmit} 
                                        className="bg-primary hover:bg-primary/90 text-white min-w-[120px] shadow-sm cursor-pointer"
                                    >
                                        {stagedFiles.length === 0 ? "Done" : (
                                            <>
                                                <Upload className="w-4 h-4 mr-2" />
                                                Submit Upload
                                            </>
                                        )}
                                    </Button>
                                </>
                            )}
                        </SheetFooter>
                    </div>
                </SheetContent>
            </Sheet>

            <DocumentPreviewDialog 
                isOpen={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                previewUrl={previewUrl}
                activePreviewDoc={activePreviewDoc}
            />

            <ConfirmDialog
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, fileId: null })}
                onConfirm={() => {
                    if (confirmDelete.fileId) {
                        onDeleteExisting(confirmDelete.fileId);
                    }
                }}
                title="Remove File"
                description="Are you sure you want to remove this file?"
                confirmText="Remove"
                variant="danger"
            />
        </>
    );
}
