import { Button } from "@/components/ui/button"
import { ArrowLeft, Save, Loader2 } from "lucide-react"

/**
 * FormActions
 * Sticky bottom action bar for form pages.
 * Always visible regardless of scroll position.
 * 
 * Usage:
 * <FormActions
 *   onBack={handleBack}
 *   onSubmit={handleSubmit}
 *   isSubmitting={submitting}
 *   submitLabel="Save Report"
 * />
 */
export function FormActions({
  onBack,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save",
  backLabel = "Cancel",
  disabled = false,
  children,
}) {
  return (
    <div className="sticky bottom-0 z-20 -mx-6 mt-6 border-t border-slate-200 bg-white/95 backdrop-blur-sm px-6 py-3">
      <div className="flex items-center justify-between max-w-[1600px] mx-auto">
        <div>
          {onBack && (
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isSubmitting}
              className="h-9 gap-2 text-xs font-semibold border-slate-200 text-slate-600 hover:text-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {backLabel}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {children}
          {onSubmit && (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting || disabled}
              className="h-9 gap-2 px-5 text-xs font-semibold bg-primary text-white hover:bg-primary/90 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  {submitLabel}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
