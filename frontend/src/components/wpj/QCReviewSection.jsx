import React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

/**
 * Standardized QC Review & Approval Section for Welding Joints stages.
 * Prop exactness matches ss1 screenshot provided by user.
 */
const QCReviewSection = ({
  isReview = false,
  userRole = "PROD",
  status = "pending",
  remarks = "",
  setRemarks,
  onAction,
  isSubmitting = false,
  reviewDate = "",
}) => {
  // Logic from Stage1: readOnly if not QC and not in review/submitted state
  const isRemarksReadOnly = userRole !== 'QC' || (status !== 'pending' && status !== 'submitted' && !isReview);

  return (
    <Card className="border shadow-md overflow-hidden bg-white">
      <CardHeader className="bg-gray-50/80 border-b py-3 px-6">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700">
          <div className="h-2 w-2 rounded-full bg-slate-400" />
          QC Review & Approval
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        <div className="space-y-3">
          <Label htmlFor="qcRemarks" className="text-sm font-semibold flex items-center gap-1">
            Remarks <span className="text-destructive font-bold">*</span>
          </Label>
          <Textarea
            id="qcRemarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter review remarks or rejection reasons..."
            readOnly={isRemarksReadOnly}
            className={`min-h-[120px] transition-all focus-visible:ring-black ${
              isRemarksReadOnly ? "bg-muted shadow-inner" : "shadow-sm border-slate-200"
            }`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100 mt-2">
          <div className="space-y-2">
            <Label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Review Date:</Label>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-mono text-xs text-slate-600">
              {reviewDate || (isReview ? new Date().toLocaleString() : "Review date")}
            </div>
          </div>
          
          <div className="flex flex-col justify-end">
             {status && status !== 'pending' && status !== 'submitted' && (
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">Status:</span>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                    status === 'approved' ? 'bg-green-100 text-green-700' :
                    status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {status.toUpperCase()}
                  </span>
                </div>
             )}
          </div>
        </div>

        {isReview && (
          <div className="flex justify-end items-center gap-4 pt-4 border-t border-slate-100">
            <Button
              onClick={() => onAction('rejected')}
              variant="outline"
              disabled={isSubmitting}
              className="min-w-[140px] h-11 border-destructive/20 text-destructive hover:bg-destructive/5 hover:border-destructive transition-all font-semibold"
            >
              {isSubmitting ? "Processing..." : "Reject"}
            </Button>
            <Button
              onClick={() => onAction('approved')}
              disabled={isSubmitting}
              className="min-w-[140px] h-11 bg-black hover:bg-gray-800 text-white shadow-lg shadow-black/10 transition-all font-semibold"
            >
              {isSubmitting ? "Processing..." : "Approve"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default QCReviewSection
