import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useNotifications } from "@/context/NotificationContext";
import { NotificationDrawer } from "./NotificationDrawer";

/**
 * Shared Module Header with System Notifications
 * @param {Object} props
 * @param {string} props.title - Main title of the module
 * @param {string} props.description - Subtitle/Description
 * @param {React.ReactNode} props.actions - Additional buttons/actions to show in the header
 */
export function ModuleHeader({ title, description, actions }) {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    drawerOpen,
    setDrawerOpen,
    markRead,
    markAllRead,
  } = useNotifications();

  const openPath = useCallback((path, params = {}) => {
    const search = new URLSearchParams(params).toString();
    navigate(search ? `${path}?${search}` : path);
  }, [navigate]);

  const openFromNotification = useCallback((n) => {
    if (!n.actionPath) return;
    markRead(n.id);
    setDrawerOpen(false);
    openPath(n.actionPath, n.actionParams || {});
  }, [markRead, openPath, setDrawerOpen]);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-6 bg-white transition-all duration-200">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-2" />
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">
              {title}
            </h1>
            {description && (
              <p className="text-xs text-slate-500 font-medium">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actions}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDrawerOpen(true)}
            className="relative h-9 w-9 rounded-md border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200"
            aria-label="Open notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm animate-in zoom-in duration-300">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      <NotificationDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        notifications={notifications}
        markRead={markRead}
        markAllRead={markAllRead}
        onOpenAction={openFromNotification}
      />
    </>
  );
}
