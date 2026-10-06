import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'react-toastify';
import apiClient from '@/api/api.client';
import WELD_STAGES_CONFIG from "@/config/weldStagesConfig";
import { Loader2 } from 'lucide-react';

const NewModRequestDialog = ({ open, onOpenChange, joint, stageId, onSuccess }) => {
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!reason.trim()) return;
        
        setIsSubmitting(true);
        try {
            const res = await apiClient.post('/api/wpj/modification-request', { 
                jointId: joint.id, 
                stage: stageId, 
                reason 
            });
            
            if (res?.success) {
                toast.success('Modification request submitted successfully');
                setReason('');
                onSuccess(); // Trigger close and refresh
            } else {
                throw new Error(res?.message || 'Failed to submit request');
            }
        } catch (err) {
            toast.error(err.message || 'Error submitting request');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Safely get stage label
    const stageLabel = joint && stageId 
        ? WELD_STAGES_CONFIG[joint.joint_type]?.find(s => s.id === stageId)?.label || stageId 
        : '';
        
    const jointNo = joint?.jointNo || joint?.joint_no || '';

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) {
                setTimeout(() => setReason(''), 300);
            }
            onOpenChange(val);
        }}>
            <DialogContent className="sm:max-w-xl w-full bg-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-800">Request Modification</DialogTitle>
                    <DialogDescription className="text-slate-500">
                        Submit a request to the HOD to modify a previously approved inspection stage.
                    </DialogDescription>
                </DialogHeader>

                {joint && stageId && (
                    <div className="space-y-4 py-2">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-700">
                            <p>
                                Requesting modification for Joint <span className="font-semibold text-slate-900">{jointNo}</span>, 
                                Stage: <span className="font-semibold text-slate-900 uppercase">{stageLabel}</span>
                            </p>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Reason for Modification</label>
                            <Textarea
                                placeholder="Explain why you need to modify this stage..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={4}
                                className="resize-none focus-visible:ring-slate-300"
                            />
                        </div>
                    </div>
                )}

                <DialogFooter className="pt-2 sm:justify-end">
                    <Button 
                        variant="outline" 
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting || !reason.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            'Submit Request'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NewModRequestDialog;
