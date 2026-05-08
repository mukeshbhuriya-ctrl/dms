import { useEffect, useState, useMemo } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import {
  LogOut,
  ChevronRight,
  Search,
} from "lucide-react"
import { User as UserIcon } from "lucide-react"
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
  useSidebar,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

import { useAuth } from "@/context/AuthContext"
import { getFilteredMenu } from "@/config/roles"

import "./sidebar.css"

function UserSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { state: sidebarState } = useSidebar()
  
  const { roles: userRoles, permissions: userPermissions, userName, companyName, companyLogo, isLoading, logout } = useAuth()

  const [openItems, setOpenItems] = useState({})
  const [imageError, setImageError] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

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

  const roleClass = (role) => {
    const r = role.toUpperCase()
    if (r === "ADMIN") return "role-badge-admin"
    if (r === "DCC") return "role-badge-dcc"
    if (r.includes("ENGINEER")) return "role-badge-engineer"
    return "role-badge-default"
  }

  const rawMenuItems = useMemo(() => getFilteredMenu(userPermissions, userRoles), [userPermissions, userRoles])

  // Filter menu items based on search query
  const menuItems = useMemo(() => {
    if (!searchQuery) return rawMenuItems

    const filterNested = (items) => {
      return items.reduce((acc, item) => {
        const matchesTitle = item.title.toLowerCase().includes(searchQuery.toLowerCase())
        if (matchesTitle) {
          acc.push(item)
          return acc
        }
        if (item.items) {
          const matchedSubs = filterNested(item.items)
          if (matchedSubs.length > 0) {
            acc.push({ ...item, items: matchedSubs })
          }
        }
        return acc
      }, [])
    }
    return filterNested(rawMenuItems)
  }, [rawMenuItems, searchQuery])

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
    setNestedOpen(rawMenuItems)
    setOpenItems((prev) => ({ ...prev, ...newOpenItems }))
  }, [location.pathname, rawMenuItems])

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  const toggleOpen = (title) => {
    setOpenItems((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  if (isLoading) {
    return (
      <Sidebar className="border-r border-sidebar-border bg-sidebar-background">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-3 py-4">
            <UserIcon className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Loading Profile...</span>
          </div>
        </SidebarHeader>
      </Sidebar>
    )
  }

  return (
    <Sidebar collapsible="icon" className="group-data-[collapsible=icon]:w-[64px]">
      <SidebarHeader className="border-b border-sidebar-border space-y-0 pb-2">
        <div className="flex items-center gap-3 px-3 py-4 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-sidebar-border bg-sidebar-accent overflow-hidden">
            {companyLogo && !imageError ? (
              <img
                src={companyLogo}
                alt={companyName || "Company Logo"}
                className="h-full w-full object-contain p-0.5"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-sidebar-accent text-sidebar-foreground font-bold text-xs">
                {getInitials(companyName)}
              </div>
            )}
          </div>
          <div className="flex flex-col overflow-hidden transition-all duration-200 group-data-[collapsible=icon]:opacity-0">
            <span className="truncate font-semibold text-xs text-sidebar-foreground uppercase tracking-tight">{companyName || "Shreno Engineering"}</span>
            <span className="truncate text-[9px] font-medium text-muted-foreground tracking-wider uppercase">DMS System</span>
          </div>
        </div>

        {/* Minimal Search - Hidden on collapsed */}
        <div className="px-3 py-1 group-data-[collapsible=icon]:hidden">
          <div className="sidebar-search flex items-center gap-2 px-2 py-1 rounded">
            <Search className="h-3 w-3 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-transparent border-none text-[11px] text-sidebar-foreground focus:outline-none w-full placeholder:text-muted-foreground/40"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Minimalist Profile Section */}
        <div className="px-3 transition-all duration-200 group-data-[collapsible=icon]:px-1.5">
          <div className="sidebar-profile-minimal flex items-center gap-2.5 p-1.5 rounded">
            <div className="h-7 w-7 shrink-0 rounded bg-sidebar-border flex items-center justify-center">
              <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
              <span className="truncate text-[11px] font-bold text-sidebar-foreground">{userName}</span>
              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                {userRoles.slice(0, 2).map(role => (
                  <span key={role} className={`role-badge ${roleClass(role)}`}>{role}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SidebarHeader>

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
                              className={`nav-link-enterprise text-[11px] h-8 px-2`}
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

      <SidebarFooter className="border-t border-sidebar-border py-2 px-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              onClick={handleLogout}
              className="hover:bg-sidebar-accent text-muted-foreground h-9"
            >
              <button className="w-full flex items-center justify-center gap-2 cursor-pointer">
                <LogOut className="h-3.5 w-3.5" />
                <span className="font-bold text-[10px] uppercase tracking-wider group-data-[collapsible=icon]:hidden">Logout</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

export default UserSidebar
