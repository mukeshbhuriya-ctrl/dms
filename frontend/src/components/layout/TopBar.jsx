import { useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Bell, Search, LogOut, User as UserIcon, ChevronDown } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Breadcrumbs } from "./Breadcrumbs"
import { useAuth } from "@/context/AuthContext"
import { useNotifications } from "@/context/NotificationContext"
import { NotificationDrawer } from "@/components/shared/NotificationDrawer"

/**
 * Enterprise TopBar
 * Global, persistent bar across all authenticated pages.
 * Contains: sidebar trigger, breadcrumbs, search hint, notifications, user menu.
 */
export function TopBar() {
  const navigate = useNavigate()
  const { userName, roles: userRoles, logout } = useAuth()
  const {
    notifications,
    unreadCount,
    drawerOpen,
    setDrawerOpen,
    markRead,
    markAllRead,
  } = useNotifications()

  const handleLogout = useCallback(() => {
    logout()
    navigate("/")
  }, [logout, navigate])

  const openFromNotification = useCallback((n) => {
    if (!n.actionPath) return
    markRead(n.id)
    setDrawerOpen(false)
    const search = n.actionParams ? new URLSearchParams(n.actionParams).toString() : ""
    navigate(search ? `${n.actionPath}?${search}` : n.actionPath)
  }, [markRead, setDrawerOpen, navigate])

  const roleClass = (role) => {
    const r = role.toUpperCase()
    if (r === "ADMIN") return "bg-red-50 text-red-600 border-red-200"
    if (r === "DCC") return "bg-blue-50 text-blue-600 border-blue-200"
    if (r.includes("ENGINEER")) return "bg-emerald-50 text-emerald-600 border-emerald-200"
    return "bg-slate-50 text-slate-600 border-slate-200"
  }

  return (
    <>
      <header className="topbar flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sticky top-0 z-30">
        {/* Left: Sidebar trigger + Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          <SidebarTrigger className="h-8 w-8 shrink-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors" />
          <div className="h-5 w-px bg-slate-200 shrink-0 hidden sm:block" />
          <div className="hidden sm:block">
            <Breadcrumbs />
          </div>
        </div>

        {/* Right: Search + Notifications + User */}
        <div className="flex items-center gap-2">
          {/* Search hint */}
          <Button
            variant="outline"
            className="hidden md:flex items-center gap-2 h-8 px-3 text-xs text-slate-400 border-slate-200 hover:text-slate-600 hover:border-slate-300 shadow-none"
            onClick={() => {/* Command palette — Phase 5 */}}
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search...</span>
            <kbd className="ml-2 pointer-events-none inline-flex h-5 items-center rounded border border-slate-200 bg-slate-50 px-1.5 text-[10px] font-mono font-medium text-slate-400">
              ⌘K
            </kbd>
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDrawerOpen(true)}
            className="relative h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>

          {/* User Menu */}
          <div className="h-5 w-px bg-slate-200 shrink-0" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 h-8 pl-2 pr-1.5 text-xs text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                  <UserIcon className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <span className="hidden lg:inline font-semibold max-w-[120px] truncate">{userName}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-semibold text-slate-900">{userName}</p>
                  <div className="flex flex-wrap gap-1">
                    {userRoles.map(role => (
                      <span key={role} className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${roleClass(role)}`}>
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer">
                <LogOut className="mr-2 h-3.5 w-3.5" />
                <span className="text-xs font-semibold">Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
  )
}
