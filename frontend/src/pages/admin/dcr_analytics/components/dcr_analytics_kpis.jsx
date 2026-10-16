import React from "react";
import { GitPullRequest, CheckCircle2, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const fmt = new Intl.NumberFormat("en-IN");

export default function DcrAnalyticsKpis({
  kpis = {},
  onNavigateToLedger,
}) {
  const {
    totalRaised = 0,
    pendingApproval = 0,
    approvedClosed = 0,
    rejected = 0,
    approvalRate = 0,
    avgTurnaroundDays = 0,
  } = kpis;

  const cards = [
    {
      id: "ALL",
      title: "Total DCRs Raised",
      value: fmt.format(totalRaised),
      subtitle: "Click to view all records",
      icon: GitPullRequest,
      iconBg: "bg-blue-50 text-blue-600",
      valueColor: "text-slate-900",
      filter: { status: "ALL" },
    },
    {
      id: "PENDING",
      title: "Pending Approval",
      value: fmt.format(pendingApproval),
      subtitle: "Awaiting design / quality review",
      icon: Clock,
      iconBg: "bg-amber-50 text-amber-600",
      valueColor: "text-amber-600",
      filter: { status: "PENDING" },
    },
    {
      id: "APPROVED",
      title: "Approved & Closed",
      value: fmt.format(approvedClosed),
      subtitle: `${approvalRate}% approval rate`,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 text-emerald-600",
      valueColor: "text-emerald-700",
      filter: { status: "APPROVED" },
    },
    {
      id: "TURNAROUND",
      title: "Avg Time Taken",
      value: `${avgTurnaroundDays} Days`,
      subtitle: rejected > 0 ? `${rejected} rejected / revised` : "From request to final approval",
      icon: AlertCircle,
      iconBg: "bg-indigo-50 text-indigo-600",
      valueColor: "text-indigo-700",
      filter: { status: "ALL" },
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.id}
            onClick={() => onNavigateToLedger?.(card.filter)}
            className="cursor-pointer transition-all duration-150 hover:shadow-md hover:border-slate-300 border-slate-200 bg-white"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {card.title}
                </span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-2">
                <p className={`text-2xl font-bold tracking-tight ${card.valueColor}`}>
                  {card.value}
                </p>
                <p className="mt-1 text-xs text-slate-500 flex items-center justify-between">
                  <span>{card.subtitle}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
