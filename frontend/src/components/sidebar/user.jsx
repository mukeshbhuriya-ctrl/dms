import { useEffect, useState } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import {
  LayoutDashboard,
  Upload,
  FileText,
  CheckCircle,
  Settings,
  Users,
  Building2,
  ClipboardCheck,
  BarChart3,
  LogOut,
  User as UserIcon,
  Users as UsersIcon,
  Wrench,
  Briefcase,
  Folder,
  UserPlus,
  ChartBar,
  ChevronRight
} from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

// Role-based menu configuration
const roleMenus = {
  DCC: [
    {
      title: "Customer Management",
      icon: Users,
      items: [
        {
          title: "Customer",
          path: "/dcc/create-customer",
        },
        {
          title: "Location",
          path: "/dcc/create-location",
        },
      ],
    },
    {
      title: "Purchase Orders",
      icon: FileText,
      path: "/dcc/create-po",
    },
    {
      title: "Jobs",
      icon: ClipboardCheck,
      path: "/dcc/create-job",
    },
    {
      title: "DMS",
      icon: Folder,
      items: [
        {
          title: "Document Master",
          path: "/dcc/document-master",
        },
        {
          title: "Assign Document",
          path: "/dcc/assign-document",
        },
        {
          title: "Document Approval",
          path: "/dcc/document-approver",
        },
        {
          title: "Create Transmission",
          path: "/dcc/create-transmission",
        },
        {
          title: "Send Document to Client",
          path: "/dcc/send-document-to-client",
        },
        {
          title: "Client Approval Status",
          path: "/dcc/client-approval-status",
        },
      ],
    },
  ],
  OC: [
    {
      title: "OC",
      icon: LayoutDashboard,
      path: "/oc/dashboard",
    }
  ],
  Production: [
    {
      title: "Production",
      icon: LayoutDashboard,
      path: "/admin/dashboard",
    }
  ],
  Manager: [
    {
      title: "Manager",
      icon: LayoutDashboard,
      path: "/management/dashboard",
    }
  ],
  USER: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/user/dashboard",
    },
    {
      title: "Upload Documents",
      icon: FileText,
      path: "/user/upload-documents",
    }
  ],
  Marketing: [
    {
      title: "Marketing adss",
      icon: LayoutDashboard,
      path: "/marketing/dashboard",
    },
    {
      title: "Master Sheet",
      icon: FileText,
      path: "/marketing/master-sheet",
    }
  ],
  ADMIN: [
    {
      title: "Customer Management",
      icon: Users,
      items: [
        {
          title: "Customer",
          path: "/dcc/create-customer",
        },
        {
          title: "Location",
          path: "/dcc/create-location",
        },
      ],
    },
    {
      title: "User Management",
      icon: UserPlus,
      path: "/users",
    },
    {
      title: "Purchase Orders",
      icon: Briefcase,
      path: "/dcc/create-po",
    },
    {
      title: "Jobs",
      icon: FileText,
      path: "/dcc/create-job",
    },
    {
      title: "DMS",
      icon: Folder,
      items: [
        {
          title: "Document Master",
          path: "/dcc/document-master",
        },
        {
          title: "Assign Document",
          path: "/dcc/assign-document",
        },
        {
          title: "Document Approver",
          path: "/dcc/document-approver",
        },
        {
          title: "Create Transmission",
          path: "/dcc/create-transmission",
        },
        {
          title: "Send Document to Client",
          path: "/dcc/send-document-to-client",
        },
      ],
    },
    {
      title: "DCR",
      icon: Folder,
      items: [
        {
          title: "Create DCR",
          path: "/admin/create-dcr",
        },
        {
          title: "View DCR",
          path: "/admin/view-dcr",
        }
      ]
    },
    {
      title: "NCR",
      icon: Folder,
      items: [
        {
          title: "Create NCR",
          path: "/admin/create-ncr",
        },
        {
          title: "View NCR",
          path: "/admin/view-ncr",
        }
      ]
    },
    {
      title: "Welding Joints",
      icon: Wrench,
      items: [
        {
          title: "Welding Joints",
          path: "/view-weldingjoints",
        }
      ]
    },
    {
      title: "MATERIAL HEAT CHART",
      icon: ChartBar,
      items: [
        {
          title: "Material Heat Chart",
          path: "/admin/create-material-heat-chart",
        }
      ]
    },
    {
      title: "Hydrostatic Pressure Test",
      icon: FileText,
      items: [
        {
          title: "Hydro Pres Test",
          path: "/admin/hydrostatic-pressure-test",
        },
      ],
    },
    {
      title: "Dish End Inspection",
      icon: ClipboardCheck,
      path: "/admin/hydro-assign",
    },
    {
      title: "Final Inspection Reports",
      icon: FileText,
      path: "/admin/final-inspection-reports",
    },
    {
      title: "Quality Assurance Plan",
      icon: ClipboardCheck,
      path: "/admin/create-qarp",
    },
  ],
  WELD_PLAN_ADMIN: [
    {
      title: "Welding Joints",
      icon: Wrench,
      path: "/welding-joints",
    },
  ],
  PRODUCTION_ENGINEER: [
    {
      title: "Welding Joints",
      icon: Wrench,
      path: "/view-weldingjoints",
    },
  ],
  QC_ENGINEER: [
    {
      title: "Welding Joints",
      icon: Wrench,
      path: "/view-weldingjoints",
    },
  ],
}

const roleKeyMap = Object.keys(roleMenus).reduce((acc, key) => {
  acc[key.toLowerCase()] = key
  return acc
}, {})

const extractRoleName = (role) => {
  if (role === null || role === undefined) {
    return null
  }

  if (typeof role === "string" || typeof role === "number") {
    return String(role)
  }

  if (typeof role === "object") {
    const candidate =
      role.name ||
      role.role ||
      role.roleName ||
      role.code ||
      role.value ||
      role.title ||
      role.type
    if (candidate !== undefined && candidate !== null) {
      return String(candidate)
    }
  }

  return null
}

const normalizeRole = (role) => {
  const extracted = extractRoleName(role)
  if (!extracted) {
    return null
  }

  const trimmed = extracted.trim()
  if (!trimmed) {
    return null
  }

  const key = roleKeyMap[trimmed.toLowerCase()]
  return key || trimmed
}

function UserSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [userRoles, setUserRoles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [userName, setUserName] = useState("User")
  const [activeRole, setActiveRole] = useState(() => localStorage.getItem("last_active_role") || "")

  // Collapsible state management
  const [openItems, setOpenItems] = useState({})

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const backendUrl =
          import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
        const authData = localStorage.getItem("user_auth")

        if (!authData) {
          setIsLoading(false)
          return
        }

        let token = null
        try {
          const parsed = JSON.parse(authData)
          token = parsed?.payload?.token || parsed?.token
        } catch {
          setIsLoading(false)
          return
        }

        const headers = {
          "Content-Type": "application/json",
        }
        if (token) {
          headers["Authorization"] = `Bearer ${token}`
        }

        const res = await fetch(`${backendUrl}/api/users/auth/me`, {
          method: "GET",
          headers,
          credentials: "include",
        })

        if (!res.ok) {
          setIsLoading(false)
          return
        }

        const contentType = res.headers.get("content-type") || ""
        if (!contentType.includes("application/json")) {
          setIsLoading(false)
          return
        }

        const payload = await res.json()

        // Extract roles from various possible locations
        let roles = []

        if (Array.isArray(payload?.role)) {
          roles = payload.role
        } else if (typeof payload?.role === "string") {
          roles = [payload.role]
        } else if (Array.isArray(payload?.roles)) {
          roles = payload.roles
        } else if (Array.isArray(payload?.user?.roles)) {
          roles = payload.user.roles
        } else if (Array.isArray(payload?.user?.role)) {
          roles = payload.user.role
        } else if (Array.isArray(payload?.data?.roles)) {
          roles = payload.data.roles
        } else if (Array.isArray(payload?.data?.role)) {
          roles = payload.data.role
        } else if (Array.isArray(payload?.payload?.roles)) {
          roles = payload.payload.roles
        } else if (Array.isArray(payload?.payload?.role)) {
          roles = payload.payload.role
        } else {
          const singleRole =
            payload?.user?.role ||
            payload?.data?.role ||
            payload?.payload?.role ||
            "User"
          roles = [singleRole]
        }

        const expandedRoles = []
        roles.forEach((role) => {
          const extracted = extractRoleName(role)
          if (!extracted) {
            return
          }

          const parts = extracted.split(/[,\|]/)
          parts.forEach((part) => {
            const normalized = normalizeRole(part)
            if (normalized) {
              expandedRoles.push(normalized)
            }
          })
        })

        roles = expandedRoles.filter(Boolean)

        if (roles.length === 0) {
          roles = ["User"]
        }

        const name =
          payload?.name ||
          payload?.user?.name ||
          payload?.data?.name ||
          payload?.employeeId ||
          "User"

        const uniqueRoles = Array.from(new Set(roles))
        setUserRoles(uniqueRoles)

        const storedRole = localStorage.getItem("last_active_role")
        let effectiveRole = ""

        if (storedRole && uniqueRoles.includes(storedRole)) {
          effectiveRole = storedRole
        } else if (uniqueRoles.includes(activeRole)) {
          effectiveRole = activeRole
        } else {
          effectiveRole = uniqueRoles[0] || ""
        }

        setActiveRole(effectiveRole)
        localStorage.setItem("last_active_role", effectiveRole)
        setUserName(name)
      } catch (err) {
        console.error("Error fetching user role:", err)
        setUserRoles(["User"])
        setActiveRole("User")
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserRole()
  }, [])

  // Initialize open state based on active route
  useEffect(() => {
    if (!activeRole) return

    const menuItems = getMenuItemsForRole(activeRole)
    const newOpenItems = {}

    const checkActive = (items) => {
      return items.some(item => {
        if ((item.url || item.path) === location.pathname) return true;
        if (item.items) return checkActive(item.items);
        return false;
      })
    }

    menuItems.forEach((item) => {
      if (item.items) {
        if (checkActive(item.items)) {
          newOpenItems[item.title] = true
        }
      }
    })

    setOpenItems(prev => ({ ...prev, ...newOpenItems }))
  }, [location.pathname, activeRole])


  const handleLogout = () => {
    localStorage.removeItem("user_auth")
    localStorage.removeItem("last_active_role")
    navigate("/")
  }

  const getMenuItemsForRole = (role) => {
    if (!role) {
      return roleMenus["User"] || []
    }

    const roleMenu = roleMenus[role] || []
    if (Array.isArray(roleMenu) && roleMenu.length > 0) {
      return roleMenu
    }

    return roleMenus["User"] || []
  }

  const menuItems = getMenuItemsForRole(activeRole)

  const toggleOpen = (title) => {
    setOpenItems(prev => ({
      ...prev,
      [title]: !prev[title]
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
        <div className="flex items-center gap-2 px-2 py-4">
          <UserIcon className="h-6 w-6" />
          <div className="flex flex-col">
            <span className="font-semibold">{userName}</span>
            {userRoles.length > 0 ? (
              <div className="mt-2">
                <Select
                  value={activeRole}
                  onValueChange={(val) => {
                    setActiveRole(val)
                    localStorage.setItem("last_active_role", val)
                  }}
                >
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {userRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">User</span>
            )}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                // Check if item has submenu (items array) or is a simple link (path/url)
                const hasSubMenu = item.items && item.items.length > 0
                const itemPath = item.url || item.path

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
                              (subItem) => (subItem.url || subItem.path) === location.pathname
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
                                  isActive={(subItem.url || subItem.path) === location.pathname}
                                >
                                  <Link to={subItem.url || subItem.path}>{subItem.title}</Link>
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
                    <SidebarMenuItem key={item.title}>
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
