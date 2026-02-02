import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
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
  Wrench
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
} from "@/components/ui/sidebar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Role-based menu configuration
const roleMenus = {
  DCC: [
    {
      title: "Create Customer",
      icon: Building2,
      path: "/dcc/create-customer",
    },
    {
      title: "Create Location",
      icon: Building2,
      path: "/dcc/create-location",
    },
    {
      title: "Create PO",
      icon: FileText,
      path: "/dcc/create-po",
    },
    {
      title: "Create Job",
      icon: ClipboardCheck,
      path: "/dcc/create-job",
    },
    {
      title: "Document Master",
      icon: FileText,
      path: "/dcc/document-master",
    },
    {
      title: "Assign Document",
      icon: FileText,
      path: "/dcc/assign-document",
    },
    {
      title: "Create Transmission",
      icon: Upload,
      path: "/dcc/create-transmission",
    },
    {
      title: "Document Approver",
      icon: CheckCircle,
      path: "/dcc/document-approver",
    },
    {
      title: "Send to Client",
      icon: Upload,
      path: "/dcc/send-document-to-client",
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
  User: [
    {
      title: "User Dashboard",
      icon: LayoutDashboard,
      path: "/user/dashboard",
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
      title: "Users",
      icon: UsersIcon,
      path: "/users",
    },
  ],
  WELD_PLAN_ADMIN: [
    {
      title: "Welding Joints",
      icon: Wrench,
      path: "/welding-joints",
    },
  ],
  WELD_PLAN_USER: [
    {
      title: "View Welding Joints",
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
  const [activeRole, setActiveRole] = useState("")

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
        
        // Extract roles from various possible locations (supporting both single role and multiple roles)
        let roles = []
        
        // Check for role field (can be array or string) - API returns {"role": ["OC", "Production", "Manager", "User"]}
        if (Array.isArray(payload?.role)) {
          roles = payload.role
        } else if (typeof payload?.role === "string") {
          roles = [payload.role]
        }
        // Check for roles field (array)
        else if (Array.isArray(payload?.roles)) {
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
        }
        // Check for single role string (convert to array)
        else {
          const singleRole =
            payload?.user?.role ||
            payload?.data?.role ||
            payload?.payload?.role ||
            "User"
          roles = [singleRole]
        }

        // Keep roles in original case to match roleMenus keys (OC, Production, Manager, User, Marketing)
        // API returns: ["OC", "Production", "Manager", "User", "Marketing"] - keep as is
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

        // If no roles found, default to 'User'
        if (roles.length === 0) {
          roles = ["User"]
        }

        // Debug: Log extracted roles
        // console.log("Extracted roles:", roles)
        // console.log("Available roleMenus keys:", Object.keys(roleMenus))

        // Extract user name
        const name =
          payload?.name ||
          payload?.user?.name ||
          payload?.data?.name ||
          payload?.employeeId ||
          "User"

        const uniqueRoles = Array.from(new Set(roles))
        setUserRoles(uniqueRoles)
        setActiveRole((prev) => (uniqueRoles.includes(prev) ? prev : uniqueRoles[0] || ""))
        setUserName(name)
      } catch (err) {
        console.error("Error fetching user role:", err)
        // Default to 'User' role if API fails
        setUserRoles(["User"])
        setActiveRole("User")
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserRole()
  }, [])

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

  const menuItems = getMenuItemsForRole(activeRole)

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
                <Select value={activeRole} onValueChange={setActiveRole}>
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
