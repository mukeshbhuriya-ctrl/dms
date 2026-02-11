import { Badge } from "@/components/ui/badge"

const statusConfig = {
    stage1: { label: "Stage 1", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20" },
    stage2: { label: "Stage 2", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20" },
    stage3: { label: "Stage 3", className: "bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20" },
    stage4: { label: "Stage 4", className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20" },
    stage5: { label: "Stage 5", className: "bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:bg-pink-500/20" },
    stage6: { label: "Stage 6", className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20" },
    stage7: { label: "Stage 7", className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20" },
    stage8: { label: "Stage 8", className: "bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20" },
    completed: { label: "Completed", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20" },
    pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20" },
    rejected: { label: "Rejected", className: "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20" }
};

export function StatusBadge({ status, className }) {
    const config = statusConfig[status] || {
        label: status,
        className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 hover:bg-gray-500/20"
    };

    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className} ${className || ''}`}>
            {config.label}
        </span>
    );
}
