import { useNavigate, useLocation } from "react-router-dom"
import { LayoutDashboard, Building2, LogOut } from "lucide-react"
import "./sidebar.css"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

function SiteAdminSidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    localStorage.removeItem("siteadmin_auth")
    navigate("/siteadmin/login")
  }

  const menuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/siteadmin/dashboard",
    },
    {
      title: "Create Company",
      icon: Building2,
      path: "/siteadmin/create-company",
    },
  ]

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-3 py-3 min-h-[56px]">
          <div className="sidebar-logo-box flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
            <Building2 className="h-5 w-5 text-sidebar-primary" />
          </div>
          <span className="font-semibold text-xs text-white">Site Admin</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--sidebar-muted)' }}>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.path}
                    tooltip={item.title}
                  >
                    <a
                      href={item.path}
                      onClick={(e) => {
                        e.preventDefault()
                        navigate(item.path)
                      }}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild onClick={handleLogout}>
              <button className="sidebar-logout-btn w-full">
                <LogOut />
                <span className="text-[12px] font-semibold">Logout</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

export default SiteAdminSidebar
