import { Outlet } from "react-router-dom"
import { AdminSidebar } from "@/components"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { TopBar } from "./TopBar"
import { UIProvider } from "@/context/UIContext"

/**
 * Enterprise App Shell
 * Master layout for all authenticated pages.
 * 
 * Structure:
 * ┌──────────────────────────────────────────────┐
 * │ SidebarProvider                               │
 * │  ├── Sidebar (collapsible navigation)         │
 * │  └── SidebarInset                             │
 * │       ├── TopBar (breadcrumbs, search, user)  │
 * │       └── Content Area (<Outlet />)           │
 * └──────────────────────────────────────────────┘
 */
export default function AppLayout() {
  return (
    <UIProvider>
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <TopBar />
          {/* Pages render here — each page wraps content in PageContainer */}
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </UIProvider>
  )
}
