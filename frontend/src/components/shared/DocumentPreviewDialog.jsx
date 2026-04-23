import React from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Download } from "lucide-react";
import { toast } from "react-toastify";

/**
 * Shared component for document previews (PDF, Images, etc.)
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the dialog is open
 * @param {Function} props.onOpenChange - Callback for open state changes
 * @param {string} props.previewUrl - The URL of the file to preview
 * @param {Object} props.activePreviewDoc - The document object being previewed
 * @param {string} props.activePreviewDoc.mimeType - MIME type of the document
 * @param {string} props.activePreviewDoc.filePath - File path (optional)
 * @param {string} props.activePreviewDoc.documentName - Name of the document (optional)
 */
export function DocumentPreviewDialog({ 
  isOpen, 
  onOpenChange, 
  previewUrl, 
  activePreviewDoc 
}) {
  const isPdf = 
    activePreviewDoc?.mimeType === 'application/pdf' ||
    activePreviewDoc?.filePath?.toLowerCase().endsWith('.pdf') ||
    previewUrl?.toLowerCase().includes('pdf');

  const isImage = 
    activePreviewDoc?.mimeType?.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(activePreviewDoc?.filePath || '') ||
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(previewUrl || '');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-6xl w-[98vw] h-[95vh] p-0 overflow-hidden border-none shadow-2xl">
        {/* Prominent Action Buttons */}
        <div className="absolute top-4 right-4 z-[100] flex items-center gap-3">
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="p-2 bg-white/80 hover:bg-white text-slate-800 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 group border border-slate-200 flex"
              title="Download File"
            >
              <Download className="h-6 w-6 text-slate-700" />
            </a>
          )}
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 bg-white/80 hover:bg-white text-slate-800 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 group border border-slate-200 flex"
            title="Close Preview"
          >
            <Plus className="h-6 w-6 rotate-45 transform transition-transform group-hover:rotate-[135deg]" />
          </button>
        </div>
        
        <div className="w-full h-full bg-slate-100 flex items-center justify-center relative">
          {previewUrl ? (
            isPdf ? (
              <iframe
                src={`${previewUrl}#toolbar=0`}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            ) : isImage ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  e.target.src = "";
                  e.target.onerror = null;
                  toast.error("Failed to load image preview");
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-dashed rounded-lg">
                <div className="bg-slate-100 p-4 rounded-full mb-4">
                  <FileText className="h-12 w-12 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium">
                  Preview not available for this file type.
                </p>
                <Button
                  variant="link"
                  className="mt-2 text-primary"
                  onClick={() => window.open(previewUrl, '_blank')}
                >
                  Open in New Tab
                </Button>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground opacity-40">
              <Plus className="h-10 w-10 rotate-45" />
              <p>No preview available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
