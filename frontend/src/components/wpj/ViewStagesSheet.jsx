import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CheckCircle2, XCircle, Clock, Eye, FileEdit } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import WELD_STAGES_CONFIG from "@/config/weldStagesConfig";

const ViewStagesSheet = ({ 
    open, 
    onOpenChange, 
    joint, 
    onSelectStage 
}) => {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-lg w-full p-0 overflow-y-auto bg-white">
                <SheetHeader className="p-6 pb-4 border-b bg-white sticky top-0 z-10">
                    <SheetTitle className="text-xl font-bold flex flex-col gap-1">
                        <span className="text-slate-800">Inspection Journey</span>
                        <span className="text-sm font-medium text-slate-500">
                            Joint No: <span className="text-slate-700">{joint?.jointNo}</span>
                        </span>
                    </SheetTitle>
                </SheetHeader>
                <div className="p-6 pb-12">
                    <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
                        {joint && WELD_STAGES_CONFIG[joint.joint_type]?.map((stage) => {
                            if (stage.condition && !joint[stage.condition]) return null;

                            const dbKey = stage.id.replace('stage', 's') + '_status';
                            const stageStatus = joint.weld_joint_inspection?.[dbKey] || 'pending';

                            let StatusIcon = Clock;
                            let iconColor = "text-amber-500";
                            let subText = "Pending Inspection";

                            if (stageStatus === 'approved') {
                                StatusIcon = CheckCircle2;
                                iconColor = "text-emerald-500";
                                subText = "Completed";
                            } else if (stageStatus === 'rejected') {
                                StatusIcon = XCircle;
                                iconColor = "text-red-500";
                                subText = "Needs Revision";
                            }

                            return (
                                <div 
                                    key={stage.id} 
                                    className="relative pl-8 group cursor-pointer"
                                    onClick={() => onSelectStage(stage.id, joint)}
                                >
                                    <span className="absolute -left-3 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-50 shadow-sm border border-slate-200 ring-4 ring-slate-50 group-hover:ring-white transition-all">
                                        <StatusIcon className={`h-4 w-4 ${iconColor}`} />
                                    </span>
                                    <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-white shadow-sm border border-slate-200 group-hover:border-blue-200 group-hover:shadow-md transition-all">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-slate-800">{stage.label}</span>
                                            <StatusBadge status={stageStatus} label={stageStatus.toUpperCase()} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-slate-500">
                                                {subText}
                                            </span>
                                            
                                            <div className="flex items-center gap-2">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                className="h-7 px-2 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onSelectStage(stage.id, joint);
                                                                }}
                                                            >
                                                                <Eye className="w-3.5 h-3.5 mr-1" />
                                                                <span className="text-xs">View</span>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>View</p>
                                                        </TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                className="h-7 px-2 text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // TODO: Handle request modification
                                                                }}
                                                            >
                                                                <FileEdit className="w-3.5 h-3.5 mr-1" />
                                                                <span className="text-xs">Request</span>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Request Modification</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default ViewStagesSheet;
