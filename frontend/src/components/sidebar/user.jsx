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
      icon: Users,
      path: "/users",
    },
    {
      title: "Department Management",
      icon: Building2,
      path: "/departments",
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
          title: "Upload Documents",
          icon: FileText,
          path: "/user/upload-documents",
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
        {
          title: "Client Approval Status",
          path: "/dcc/client-approval-status",
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
      title: "Weld Plan",
      icon: Wrench,
      path: "/welding-joints",
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
      title: "Weld Plan",
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
        setUserName(name)
      } catch (err) {
        console.error("Error fetching user role:", err)
        setUserRoles(["User"])
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserRole()
  }, [])

  // Initialize open state based on active route
  // Initialize open state based on active route
  useEffect(() => {
    // Re-calculating menus here to ensure open state is correct
    // Ideally, getMergedMenuItems should be a useMemo

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
  }, [location.pathname, userRoles])


  const handleLogout = () => {
    localStorage.removeItem("user_auth")
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

  // Merge menus from all assigned roles
  const getMergedMenuItems = () => {
    // If no roles, return User menu
    if (!userRoles || userRoles.length === 0) {
      return roleMenus["User"] || [];
    }

    // Collect all menus from all roles
    let allMenus = [];
    userRoles.forEach(role => {
      const roleMenu = roleMenus[role] || [];
      if (Array.isArray(roleMenu)) {
        allMenus = [...allMenus, ...roleMenu];
      }
    });

    // If still empty, fallback to User
    if (allMenus.length === 0) {
      return roleMenus["User"] || [];
    }

    // Deduplicate based on title
    // Strategy: Keep the first occurrence, but if it has sub-items, try to merge?
    // For simplicity: unique by title. If same title exists, we assume it points to same path or has same subitems.
    // A better merge strategy might be needed if roles have overlapping "DMS" menus with different subitems.

    const uniqueMenus = [];
    const titleMap = new Map();

    allMenus.forEach(item => {
      if (!titleMap.has(item.title)) {
        titleMap.set(item.title, { ...item }); // Clone to avoid mutation issues
        uniqueMenus.push(titleMap.get(item.title));
      } else {
        // Attempt to merge sub-items if both have them
        const existing = titleMap.get(item.title);
        if (existing.items && item.items) {
          // Merge sub-items
          const existingSubTitles = new Set(existing.items.map(si => si.title));
          item.items.forEach(subItem => {
            if (!existingSubTitles.has(subItem.title)) {
              existing.items.push(subItem);
              existingSubTitles.add(subItem.title);
            }
          });
        }
      }
    });

    return uniqueMenus;
  };

  const menuItems = getMergedMenuItems();

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
        <div className="flex items-center gap-2 px-2 py-4 border-b">
          {/* Company Logo / Initials */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate font-semibold text-sm">Tech Fab</span>
            <span className="truncate text-xs text-muted-foreground">Engineering</span>
          </div>
        </div>

        {/* User Info Section (Optional, below company info) */}
        <div className="px-2 py-2 mb-2">
          <div className="flex items-center gap-2 p-2 rounded-md bg-sidebar-accent/10">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-medium">{userName}</span>
              <span className="truncate text-xs text-muted-foreground" title={userRoles.join(", ")}>
                {userRoles.slice(0, 2).join(", ")}{userRoles.length > 2 ? "..." : ""}
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
