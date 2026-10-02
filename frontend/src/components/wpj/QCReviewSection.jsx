import React from "react"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

/**
 * Standardized QC Review & Approval Section for Welding Joints stages.
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
  // Remarks should only be editable in Review Mode (which is protected by 'Approve' permission)
  const isRemarksReadOnly = !isReview;

  return (
    <div className="mt-8">
      <h3 className="text-sm font-bold text-slate-800 capitalize tracking-wider border-b border-slate-200 pb-2 mb-4">QC Review & Approval</h3>
      
      <div className="space-y-6">
        <div className="space-y-1">
          <label htmlFor="qcRemarks" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Remarks <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="qcRemarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter review remarks or rejection reasons..."
            readOnly={isRemarksReadOnly}
            className={`min-h-[60px] resize-y text-xs shadow-none border-slate-200 rounded-none ${
              isRemarksReadOnly ? "bg-slate-50 text-slate-500" : "bg-white text-slate-800"
            }`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Review Date</label>
            <Input 
              readOnly
              value={reviewDate || (isReview ? new Date().toLocaleString() : "")}
              placeholder="Review date"
              className="h-8 text-xs shadow-none border-slate-200 rounded-none bg-slate-50 text-slate-500"
            />
          </div>
          
          <div className="flex flex-col justify-end">
             {status && status !== 'pending' && status !== 'submitted' && (
                <div className="flex items-center gap-2 h-8">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status:</span>
                  <span className={`text-xs font-bold px-2 py-1 ${
                    status === 'approved' ? 'text-green-700' :
                    status === 'rejected' ? 'text-red-700' : 'text-blue-700'
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
              className="min-w-[140px] h-8 rounded-none border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive shadow-none"
            >
              {isSubmitting ? "Processing..." : "Reject"}
            </Button>
            <Button
              onClick={() => onAction('approved')}
              disabled={isSubmitting}
              className="min-w-[140px] h-8 rounded-none bg-black hover:bg-slate-800 text-white shadow-none"
            >
              {isSubmitting ? "Processing..." : "Approve"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default QCReviewSection

