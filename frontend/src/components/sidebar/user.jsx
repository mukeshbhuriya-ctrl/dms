import { useEffect, useState, useMemo } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { ChevronRight, LogOut } from "lucide-react"
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

import { useAuth } from "@/context/AuthContext"
import { getFilteredMenu } from "@/config/roles"

import "./sidebar.css"

function UserSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { roles: userRoles, permissions: userPermissions, companyName, companyLogo, isLoading, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  const [openItems, setOpenItems] = useState({})
  const [imageError, setImageError] = useState(false)

  const getInitials = (name) => {
    if (!name) return "CO"
    return name
      .split(" ")
      .filter((n) => n.trim().length > 0)
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase()
  }

  const menuItems = useMemo(() => getFilteredMenu(userPermissions, userRoles), [userPermissions, userRoles])

  useEffect(() => {
    const newOpenItems = {}
    const checkActive = (items) => {
      return items.some((item) => {
        if (item.path === location.pathname) return true
        if (item.items) return checkActive(item.items)
        return false
      })
    }
    const setNestedOpen = (items) => {
      items.forEach((item) => {
        if (item.items && checkActive(item.items)) {
          newOpenItems[item.title] = true
          setNestedOpen(item.items)
        }
      })
    }
    setNestedOpen(menuItems)
    setOpenItems((prev) => ({ ...prev, ...newOpenItems }))
  }, [location.pathname, menuItems])

  const toggleOpen = (title) => {
    setOpenItems((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  if (isLoading) {
    return (
      <Sidebar className="border-r border-sidebar-border">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-3 py-4">
            <div className="h-8 w-8 rounded bg-slate-100 animate-pulse" />
            <div className="h-4 w-24 rounded bg-slate-100 animate-pulse" />
          </div>
        </SidebarHeader>
      </Sidebar>
    )
  }

  return (
    <Sidebar collapsible="icon" className="group-data-[collapsible=icon]:w-[52px]">
      {/* ── Company Header ── */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="sidebar-logo-area flex items-center gap-2.5 px-3 py-3 min-h-[56px] overflow-hidden group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-white overflow-hidden shadow-sm">
            {companyLogo && !imageError ? (
              <img
                src={companyLogo}
                alt={companyName || "Company Logo"}
                className="h-full w-full object-contain p-0.5"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary/5 text-primary font-bold text-xs">
                {getInitials(companyName)}
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0 overflow-hidden transition-all duration-200 group-data-[collapsible=icon]:hidden">
            <span className="truncate font-semibold text-xs text-sidebar-foreground leading-tight">
              {companyName || "Shreno Engineering"}
            </span>
            <span className="truncate text-[9px] font-medium text-muted-foreground tracking-wider uppercase">
              DMS System
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* ── Navigation ── */}
      <SidebarContent className="py-1">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[9px] font-bold uppercase text-muted-foreground/60 px-4 mb-1 group-data-[collapsible=icon]:hidden">
            Modules
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const hasSubMenu = item.items && item.items.length > 0
                const isActive = item.path === location.pathname || (item.items && item.items.some(sub => sub.path === location.pathname || (sub.items && sub.items.some(deep => deep.path === location.pathname))))

                const renderSubMenu = (subItem) => {
                  const isSubActive = subItem.path === location.pathname || (subItem.items && subItem.items.some(deep => deep.path === location.pathname))
                  
                  if (subItem.items) {
                    return (
                      <Collapsible
                        key={subItem.title}
                        open={openItems[subItem.title]}
                        onOpenChange={() => toggleOpen(subItem.title)}
                        className="group/sub-collapsible"
                      >
                        <SidebarMenuSubItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuSubButton 
                              className="nav-link-enterprise text-[11px] h-8 px-2"
                            >
                              <span>{subItem.title}</span>
                              <ChevronRight className="ml-auto h-3 w-3 transition-transform duration-100 group-data-[state=open]/sub-collapsible:rotate-90" />
                            </SidebarMenuSubButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="collapsible-content-enterprise">
                            <SidebarMenuSub className="border-l border-sidebar-border/50 ml-1.5">
                              {subItem.items.map(deepItem => renderSubMenu(deepItem))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuSubItem>
                      </Collapsible>
                    )
                  }
                  return (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton
                        asChild
                        isActive={subItem.path === location.pathname}
                        className="nav-link-enterprise text-[11px] h-8 px-2"
                      >
                        <Link to={subItem.path}>
                          {subItem.path === location.pathname && <div className="active-indicator" />}
                          {subItem.title}
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )
                }

                if (hasSubMenu) {
                  return (
                    <Collapsible
                      key={item.title}
                      open={openItems[item.title]}
                      onOpenChange={() => toggleOpen(item.title)}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.title}
                            isActive={isActive}
                            className={`nav-link-enterprise py-4.5 h-10 ${isActive ? 'bg-sidebar-accent' : ''}`}
                          >
                            {item.icon && <item.icon className={`h-4 w-4 ${isActive ? 'text-sidebar-primary' : 'text-muted-foreground'}`} />}
                            <span className="text-[13px]">{item.title}</span>
                            <ChevronRight className="ml-auto h-3 w-3 transition-transform duration-100 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="collapsible-content-enterprise">
                          <SidebarMenuSub className="border-l border-sidebar-border ml-4.5 py-0.5">
                            {item.items.map((subItem) => renderSubMenu(subItem))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )
                } else {
                  return (
                    <SidebarMenuItem key={item.title + item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === item.path}
                        tooltip={item.title}
                        className="nav-link-enterprise py-4.5 h-10"
                      >
                        <Link to={item.path || "#"}>
                          {location.pathname === item.path && <div className="active-indicator" />}
                          {item.icon && <item.icon className={`h-4 w-4 ${location.pathname === item.path ? 'text-sidebar-primary' : 'text-muted-foreground'}`} />}
                          <span className="text-[13px]">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                }
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              tooltip="Logout" 
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 transition-colors justify-start cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="text-[12px] font-semibold">Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

export default UserSidebar
