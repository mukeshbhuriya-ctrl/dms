import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

/**
 * Reusable Dialog for Reviewing Excel Imports
 * 
 * @param {boolean} open - Dialog visible state
 * @param {function} onOpenChange - Dialog state setter
 * @param {string} title - The title of the Dialog (e.g. "Review WPJ Import")
 * @param {string} description - Description under the title
 * @param {Array<Object>} data - Array of row objects to render. Must have a `status` field ('valid', 'error', 'duplicate').
 * @param {Array<Object>} columns - Definition of columns: [{ header: "Job No", key: "msn", minWidth: "100px", render: (row, idx) => JSX }]
 * @param {function} onConfirm - Confirm action handler
 * @param {boolean} isImporting - Loading state while committing
 * @param {boolean} isValidating - State while fetching metadata
 * @param {number} totalCount - Usually data.length
 * @param {number} validCount - Number of fully valid rows
 * @param {number} errorCount - Number of rows with errors
 * @param {number} duplicateCount - Number of duplicate rows
 * @param {string} confirmLabel - The text on the Submit button (e.g. "Create 10 Plans")
 * @param {boolean} disableConfirm - Optional override to disable submit button
 */
export function ImportReviewDialog({
    open,
    onOpenChange,
    title = "Review Import",
    description = "Verify the details before confirming.",
    data = [],
    columns = [],
    onConfirm,
    isImporting = false,
    isValidating = false,
    totalCount = 0,
    validCount = 0,
    errorCount = 0,
    duplicateCount = 0,
    confirmLabel = "Confirm Import",
    disableConfirm = false
}) {

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[1200px] w-full max-h-[95vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none bg-white">
            <DialogHeader className="p-6 pb-2 border-b">
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                    <FileText className="h-6 w-6 text-primary" />
                    {title}
                </DialogTitle>
                <DialogDescription>
                    {description}
                </DialogDescription>
                
                {/* Summary counters */}
                <div className="flex gap-4 mt-4 py-2 border-y bg-slate-50 px-4 rounded-lg">
                    <div className="text-sm font-medium">Total Rows: {totalCount}</div>
                    <div className="text-sm font-medium text-green-600">Valid: {validCount}</div>
                    <div className="text-sm font-medium text-red-600">Errors: {errorCount}</div>
                    {duplicateCount > 0 && (
                        <div className="text-sm font-medium text-amber-600">Duplicates: {duplicateCount}</div>
                    )}
                </div>
            </DialogHeader>

            <div className="flex-1 overflow-x-auto p-4 custom-scrollbar-x">
                <div className="border rounded-xl w-fit min-w-full">
                <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 bg-slate-100 shadow-sm z-10">
                    <tr className="border-b divide-x divide-slate-200">
                        {columns.map((col, idx) => (
                            <th 
                                key={idx} 
                                className={`p-2 text-left font-bold uppercase text-slate-800 text-[10px] tracking-wider`}
                                style={{ minWidth: col.minWidth || '100px', width: col.width }}
                            >
                                {col.header}
                            </th>
                        ))}
                        <th className="p-2 text-center font-bold uppercase text-slate-800 text-[10px] tracking-wider min-w-[200px]">Status</th>
                    </tr>
                    </thead>
                    <tbody>
                    {data.map((row, idx) => {
                        const isErr = row.status === 'error';
                        const isDup = row.status === 'duplicate';
                        const isVal = row.status === 'valid';

                        return (
                        <tr key={idx} className={`border-b divide-x divide-slate-100 transition-colors ${isErr ? 'bg-red-50/20' : 'hover:bg-slate-50'}`}>
                            {columns.map((col, colIdx) => (
                                <td key={colIdx} className="p-2 align-top">
                                    {col.render ? col.render(row, idx) : (
                                        <div className="text-xs">{row[col.key] || "-"}</div>
                                    )}
                                </td>
                            ))}
                            
                            {/* Built-in Status Renderer */}
                            <td className="p-2 align-top text-left min-w-[200px]">
                                {isValidating ? (
                                    <div className="flex items-center gap-2">
                                        <div className="h-3 w-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                                        <span className="text-[10px] text-slate-500">Validating...</span>
                                    </div>
                                ) : isErr ? (
                                    <div className="text-red-700 font-medium text-[10px] flex items-start gap-1 p-1 rounded bg-red-100/60 leading-normal">
                                        <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                        <span className="break-words max-w-[250px] inline-block">
                                            {row.message || "Error"}
                                        </span>
                                    </div>
                                ) : isDup ? (
                                    <div className="text-amber-700 font-medium text-[10px] flex items-center gap-1.5 p-1 rounded bg-amber-100/60">
                                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                        <span>{row.message || "Duplicate"}</span>
                                    </div>
                                ) : isVal ? (
                                    <div className="text-green-700 font-medium text-[10px] flex items-center gap-1.5 p-1 rounded bg-green-100/60">
                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                        <span>{row.message || "Ready"}</span>
                                    </div>
                                ) : (
                                    <span className="text-[10px] text-slate-400">Unhandled Status</span>
                                )}
                            </td>
                        </tr>
                        );
                    })}
                    </tbody>
                </table>
                </div>
            </div>

            <DialogFooter className="p-6 border-t bg-slate-50 flex items-center sm:justify-between w-full">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting} className="bg-white border-slate-200">
                    Cancel
                </Button>
                <Button 
                    onClick={onConfirm} 
                    className="bg-green-600 hover:bg-green-700 text-white shadow-md transition-all px-8 h-10 font-medium whitespace-nowrap"
                    disabled={isImporting || isValidating || disableConfirm || validCount === 0}
                >
                    {isImporting ? (
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            Processing...
                        </div>
                    ) : (
                        confirmLabel
                    )}
                </Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default ImportReviewDialog;
