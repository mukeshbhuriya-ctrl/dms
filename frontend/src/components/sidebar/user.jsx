import { useEffect, useState } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import {
  LogOut,
  Building2,
  ChevronRight,
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
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

import { useAuth } from "@/context/AuthContext"
import { getFilteredMenu } from "@/config/roles"

function UserSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { roles: userRoles, userName, companyName, companyLogo, isLoading, logout } = useAuth()

  // Collapsible state management
  const [openItems, setOpenItems] = useState({})

  // Image error state
  const [imageError, setImageError] = useState(false)

  // Get initials from company name (e.g., "Shreno Engineering" => "SE")
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

  // Get filtered menu items based on user's roles
  const menuItems = getFilteredMenu(userRoles)

  // Initialize open state based on active route
  useEffect(() => {
    const newOpenItems = {}

    const checkActive = (items) => {
      return items.some((item) => {
        if (item.path === location.pathname) return true
        if (item.items) return checkActive(item.items)
        return false
      })
    }

    menuItems.forEach((item) => {
      if (item.items) {
        if (checkActive(item.items)) {
          newOpenItems[item.title] = true
        }
      }
    })

    setOpenItems((prev) => ({ ...prev, ...newOpenItems }))
  }, [location.pathname, userRoles])

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
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-4">
            <UserIcon className="h-6 w-6" />
            <span className="font-semibold">Loading...</span>
          </div>
        </SidebarHeader>
      </Sidebar>
    )
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-4 border-b">
          {/* Company Logo / Initials */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-transparent text-primary-foreground overflow-hidden">
            {companyLogo && !imageError ? (
              <img
                src={companyLogo}
                alt={companyName || "Company Logo"}
                className="h-full w-full object-contain"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground font-bold text-sm rounded-md">
                {getInitials(companyName)}
              </div>
            )}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate font-semibold text-sm">{companyName || "Tech Fab"}</span>
            <span className="truncate text-xs text-muted-foreground">Engineering</span>
          </div>
        </div>

        {/* User Info Section */}
        <div className="px-2 py-2 mb-2">
          <div className="flex items-center gap-2 p-2 rounded-md bg-sidebar-accent/10">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-medium">{userName}</span>
              <span
                className="truncate text-xs text-muted-foreground"
                title={userRoles.join(", ")}
              >
                {userRoles.slice(0, 2).join(", ")}
                {userRoles.length > 2 ? "..." : ""}
              </span>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const hasSubMenu = item.items && item.items.length > 0
                const itemPath = item.path

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
                            isActive={item.items.some(
                              (subItem) => subItem.path === location.pathname
                            )}
                          >
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={subItem.path === location.pathname}
                                >
                                  <Link to={subItem.path}>{subItem.title}</Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )
                } else {
                  return (
                    <SidebarMenuItem key={item.title + itemPath}>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === itemPath}
                        tooltip={item.title}
                      >
                        <Link to={itemPath || "#"}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
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

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild onClick={handleLogout}>
              <button className="w-full">
                <LogOut />
                <span>Logout</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

export default UserSidebar
