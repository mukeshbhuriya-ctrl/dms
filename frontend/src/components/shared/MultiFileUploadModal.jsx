import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Plus, Upload, X, Eye } from "lucide-react";
import { DocumentPreviewDialog } from "./DocumentPreviewDialog";
import { toast } from "react-toastify";

export function MultiFileUploadModal({
    isOpen,
    onClose,
    onSubmit,
    title = "Upload Documents",
    description = "Select one or multiple files to attach."
}) {
    const [stagedFiles, setStagedFiles] = useState([]);
    
    // Internal Preview States
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [activePreviewDoc, setActivePreviewDoc] = useState(null);

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
        e.target.value = null; // Reset input
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

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[500px]">
                    <div className="flex flex-col gap-6 w-full overflow-hidden">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                            <p className="text-sm text-slate-500 mt-1">{description}</p>
                        </div>
                        
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center bg-slate-50 hover:bg-slate-100 transition-colors w-full">
                            <Input
                                id="stage-files-shared"
                                type="file"
                                multiple
                                className="hidden"
                                onChange={handleStageFiles}
                            />
                            <Label 
                                htmlFor="stage-files-shared" 
                                className="cursor-pointer inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 shadow-sm rounded-lg font-medium text-slate-700 hover:bg-slate-50 hover:border-primary/50 transition-all"
                            >
                                <Plus className="w-5 h-5 text-primary" />
                                Select Files
                            </Label>
                            <p className="text-xs text-slate-400 mt-4">You can select multiple files or add them progressively.</p>
                        </div>

                        {stagedFiles.length > 0 && (
                            <div className="space-y-3 w-full overflow-hidden">
                                <h3 className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                                    Staged Files
                                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">{stagedFiles.length} file(s)</span>
                                </h3>
                                <div className="max-h-[200px] overflow-y-auto overflow-x-hidden space-y-2 pr-2 custom-scrollbar w-full">
                                    {stagedFiles.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white shadow-sm w-full">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="p-2 bg-primary/5 text-primary rounded-md shrink-0">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-slate-700 truncate" title={file.name}>{file.name}</p>
                                                    <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handlePreviewStagedFile(file)}
                                                    className="text-slate-400 hover:text-blue-500 hover:bg-blue-50 cursor-pointer"
                                                    title="Preview File"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveStagedFile(idx)}
                                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                                                    title="Remove File"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                            <Button variant="outline" onClick={() => onClose(false)} className="cursor-pointer">
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleSubmit} 
                                disabled={stagedFiles.length === 0}
                                className="bg-primary hover:bg-primary/90 text-white shadow-sm cursor-pointer"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Submit Upload
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <DocumentPreviewDialog 
                isOpen={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                previewUrl={previewUrl}
                activePreviewDoc={activePreviewDoc}
            />
        </>
    );
}
