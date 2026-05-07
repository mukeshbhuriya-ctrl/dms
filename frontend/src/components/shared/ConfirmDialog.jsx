import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Professional Industrial Confirmation Dialog.
 * Clean, high-density design with subtle radius and clear spacing.
 * Standard controlled component pattern (no refs).
 */
export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  description = "Are you sure you want to proceed? This action may be irreversible.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger", // 'danger' | 'warning' | 'info' | 'success'
  isLoading = false
}) => {
  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
    if (onClose) {
      onClose();
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <Trash2 className="h-5 w-5 text-red-600" />,
          bg: "bg-red-50",
          border: "border-red-200",
          button: "bg-red-600 hover:bg-red-700 text-white"
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
          bg: "bg-amber-50",
          border: "border-amber-200",
          button: "bg-amber-600 hover:bg-amber-700 text-white"
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          button: "bg-emerald-600 hover:bg-emerald-700 text-white"
        };
      default:
        return {
          icon: <Info className="h-5 w-5 text-blue-600" />,
          bg: "bg-blue-50",
          border: "border-blue-200",
          button: "bg-blue-600 hover:bg-blue-700 text-white"
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose && onClose()}>
      <DialogContent className="p-0 overflow-hidden rounded-sm border border-slate-300 shadow-none max-w-lg bg-white">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={cn("p-2.5 border rounded-sm shrink-0", styles.bg, styles.border)}>
              {styles.icon}
            </div>
            <div className="flex-1 space-y-1">
              <DialogHeader className="p-0 text-left">
                <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-sm leading-normal text-slate-600 pt-0.5">
                  {description}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 flex items-center gap-3 sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="h-9 px-4 text-sm font-semibold border-slate-300 text-slate-700 hover:bg-slate-100 rounded-sm cursor-pointer"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn("h-9 px-6 text-sm font-semibold rounded-sm shadow-none transition-none cursor-pointer", styles.button)}
          >
            {isLoading ? (
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                </div>
            ) : (
                confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
