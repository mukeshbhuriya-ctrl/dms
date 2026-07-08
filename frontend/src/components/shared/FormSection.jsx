import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

/**
 * FormSection
 * Standard card wrapper for form field groups.
 * Provides consistent title, description, border, and padding.
 * 
 * Usage:
 * <FormSection title="Report Information" description="Auto-filled from selected job">
 *   <div className="grid grid-cols-4 gap-4">
 *     <FormField />
 *   </div>
 * </FormSection>
 */
export function FormSection({ title, description, children, className = "" }) {
  return (
    <Card className={`border border-slate-200 rounded-lg shadow-sm ${className}`}>
      {title && (
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-slate-900">{title}</CardTitle>
          {description && (
            <CardDescription className="text-xs text-slate-500">{description}</CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent className={title ? "" : "pt-5"}>
        {children}
      </CardContent>
    </Card>
  )
}
