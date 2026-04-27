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
import { AlertTriangle, Trash2, Info } from "lucide-react";

/**
 * A professional-grade confirmation dialog for critical actions.
 */
const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  description = "Are you sure you want to proceed? This action may be irreversible.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger", // 'danger' | 'warning' | 'info'
  isLoading = false
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <Trash2 className="h-6 w-6 text-red-600" />,
          bg: "bg-red-50",
          button: "bg-red-600 hover:bg-red-700 text-white"
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="h-6 w-6 text-amber-600" />,
          bg: "bg-amber-50",
          button: "bg-amber-600 hover:bg-amber-700 text-white"
        };
      default:
        return {
          icon: <Info className="h-6 w-6 text-blue-600" />,
          bg: "bg-blue-50",
          button: "bg-blue-600 hover:bg-blue-700 text-white"
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${styles.bg} shrink-0`}>
              {styles.icon}
            </div>
            <div className="space-y-1 mt-1">
              <DialogHeader className="p-0 text-left">
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-[15px] leading-relaxed text-slate-500 pt-1">
                  {description}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-slate-50/80 px-6 py-4 flex items-center gap-3 sm:justify-end border-t border-slate-100">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 px-4"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={`font-semibold shadow-sm px-6 ${styles.button}`}
          >
            {isLoading ? "Processing..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
