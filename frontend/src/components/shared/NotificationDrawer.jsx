import React, { useMemo, useState } from "react";
import { Bell, Clock3, ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/utils/time";

const HIDDEN_NOTIFICATION_TITLES = new Set([
  "Task Started",
  "Task Completed",
  "Task Failed",
  "Dashboard Load Failed",
  "Auto Refresh Failed",
]);

export function NotificationDrawer({
  open,
  onOpenChange,
  notifications,
  markRead,
  markAllRead,
  onOpenAction,
}) {
  const [filter, setFilter] = useState("all");
  const filterOptions = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "action", label: "Action Required" },
    { key: "system", label: "System" },
  ];

  const visibleNotifications = useMemo(
    () => notifications.filter((n) => !HIDDEN_NOTIFICATION_TITLES.has(n?.title || "")),
    [notifications],
  );

  const filtered = useMemo(() => {
    if (filter === "unread") return visibleNotifications.filter((n) => !n.read);
    if (filter === "action") return visibleNotifications.filter((n) => n.kind === "action");
    if (filter === "system") return visibleNotifications.filter((n) => n.kind === "system");
    return visibleNotifications;
  }, [filter, visibleNotifications]);

  const unreadCount = visibleNotifications.filter((n) => !n.read).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[460px] p-0 sm:max-w-[460px]">
        <SheetHeader className="space-y-3 border-b px-5 py-4">
          <SheetTitle className="flex items-center justify-between pr-8">
            <span className="text-xl font-semibold text-slate-900">Notifications</span>
            <Badge variant="outline" className="rounded-full text-xs font-semibold">
              Unread: {unreadCount}
            </Badge>
          </SheetTitle>
          <SheetDescription className="text-sm text-slate-600">
            Workflow events, pending actions, and system feed.
          </SheetDescription>
          <div className="flex flex-wrap items-center gap-2">
            {filterOptions.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? "default" : "outline"}
                className="h-8 rounded-md px-3 text-xs font-semibold"
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="ml-auto h-8 rounded-md px-3 text-xs font-semibold"
            >
              Mark all read
            </Button>
          </div>
        </SheetHeader>

        <div className="max-h-[85vh] overflow-auto px-5 py-2">
          {filtered.length === 0 ? (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No notifications in this view right now.
            </div>
          ) : (
            filtered.map((n) => (
              <div key={n.id} className={`border-b py-3 ${n.read ? "opacity-75" : ""}`}>
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 shrink-0 text-slate-500" />
                  <p className="min-w-0 flex-1 truncate text-sm text-slate-800">
                    <span className="font-semibold">{n?.title}</span>: {n?.message}
                  </p>
                  {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                </div>

                <div className="mt-1 flex items-center justify-between pl-6">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <Clock3 className="h-3 w-3" />
                    <span>{formatRelativeTime(n.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!n.read && (
                      <Button size="sm" variant="ghost" className="h-7 rounded px-2 text-[11px]" onClick={() => markRead(n.id)}>
                        Read
                      </Button>
                    )}
                    {n.actionPath && (
                      <Button size="sm" variant="ghost" className="h-7 gap-1 rounded px-2 text-[11px]" onClick={() => onOpenAction(n)}>
                        Open
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
