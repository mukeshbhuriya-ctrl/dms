import React from "react"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

/**
 * A highly scalable, reusable component for rendering row-level actions 
 * in data tables. Inherits enterprise design language automatically.
 *
 * @param {Object} props
 * @param {Array} props.actions - Array of action config objects:
 *  {
 *    label: String,          // Text to display
 *    icon: Component,        // Lucide icon component
 *    onClick: Function,      // Action handler
 *    color: "default" | "danger", // Optional styling variant
 *    type: "action" | "separator" // Optional (default is action)
 *  }
 */
export function DataTableRowActions({ actions = [] }) {
  if (!actions || actions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex h-8 w-8 p-0 data-[state=open]:bg-slate-100 hover:bg-slate-100 shadow-none focus-visible:ring-1 focus-visible:ring-blue-500/30"
        >
          <MoreHorizontal className="h-4 w-4 text-slate-600" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-[180px] bg-white border border-slate-200 shadow-lg p-1.5"
      >
        {actions.map((action, index) => {
          if (action.type === "separator") {
            return <DropdownMenuSeparator key={`sep-${index}`} className="my-1 bg-slate-100" />;
          }

          const Icon = action.icon;
          const isDanger = action.color === "danger";

          return (
            <DropdownMenuItem
              key={`action-${index}`}
              onClick={action.onClick}
              className={cn(
                "flex items-center gap-2 px-2.5 py-2 text-xs font-medium cursor-pointer rounded-sm outline-none transition-colors",
                isDanger 
                  ? "text-red-600 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700" 
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900",
                action.disabled && "opacity-50 cursor-not-allowed",
                action.className
              )}
              disabled={action.disabled}
            >
              {Icon && (
                <Icon className={cn("h-4 w-4", isDanger ? "text-red-600" : "text-slate-500")} />
              )}
              {action.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
