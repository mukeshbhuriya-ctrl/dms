import { Outlet } from "react-router-dom"
import { AdminSidebar } from "@/components"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

export default function AppLayout() {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        {/* The child route components (pages) render exactly here */}
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
