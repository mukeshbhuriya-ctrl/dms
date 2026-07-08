import React from "react";

/**
 * ModuleHeader — Backward-compatible wrapper
 * 
 * In the new enterprise shell, the TopBar handles:
 * - Sidebar trigger (moved to TopBar)
 * - Breadcrumbs (auto-generated in TopBar)
 * - Notifications (moved to TopBar)
 * - User controls (moved to TopBar)
 * 
 * ModuleHeader now renders ONLY the page title + description + actions
 * directly inside the page content area — NO separate header bar.
 * 
 * Existing pages using ModuleHeader continue to work unchanged.
 * New pages should use PageHeader + PageContainer directly.
 */
export function ModuleHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col gap-1 px-6 pt-5 pb-4 sm:flex-row sm:items-center sm:justify-between bg-white border-b border-slate-100">
      <div className="min-w-0">
        {title && (
          <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">
            {title}
          </h1>
        )}
        {description && (
          <p className="mt-0.5 text-xs text-slate-500 font-medium">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 mt-2 sm:mt-0">
          {actions}
        </div>
      )}
    </div>
  );
}
