import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  FileText,
  Upload,
  CheckCircle,
  Clock,
  Loader2,
  Send,
  MessageSquare,
  RefreshCcw,
  Building2,
  Layers,
  FileCheck
} from "lucide-react"
import apiClient from "@/api/api.client"

function UserDashboard() {
  const navigate = useNavigate()
  const [statsData, setStatsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true)
        const res = await apiClient.get("/api/dcc/user-dashboard-stats")
        if (res.success && res.data) {
          setStatsData(res.data)
        } else {
          setError("Failed to fetch dashboard metrics")
        }
      } catch (err) {
        console.error("Dashboard error:", err)
        setError(err.message || "Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardStats()
  }, [])

  if (loading) {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Dashboard</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          <p className="text-sm text-muted-foreground mt-2">Loading dashboard stats...</p>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Dashboard</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 items-center justify-center min-h-[400px]">
          <div className="text-red-500 font-semibold">Error loading dashboard</div>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </>
    )
  }

  const internalStats = [
    {
      title: "Total Assigned",
      value: statsData?.internal ? String(statsData.internal.total) : "0",
      description: "All assigned documents",
      icon: Layers,
      path: "/user/upload-documents?uploader_status_filter=all"
    },
    {
      title: "Awaiting Upload",
      value: statsData?.internal ? String(statsData.internal.awaitingUpload) : "0",
      description: "Pending user upload",
      icon: Upload,
      path: "/user/upload-documents?uploader_status_filter=pending"
    },
    {
      title: "Pending Approval",
      value: statsData?.internal ? String(statsData.internal.pendingApproval) : "0",
      description: "Awaiting DCC review",
      icon: Clock,
      path: "/user/upload-documents?uploader_status_filter=pending_approval"
    },
    {
      title: "Approved",
      value: statsData?.internal ? String(statsData.internal.approved) : "0",
      description: "Internally approved",
      icon: FileCheck,
      path: "/user/upload-documents?uploader_status_filter=approved"
    },
  ]

  const clientStats = [
    {
      title: "Total Transmitted",
      value: statsData?.client ? String(statsData.client.total) : "0",
      description: "Sent to client",
      icon: Send,
      path: "/dcc/client-approval-status?client_status=all"
    },
    {
      title: "Under Client Review",
      value: statsData?.client ? String(statsData.client.underReview) : "0",
      description: "Pending client response",
      icon: Clock,
      path: "/dcc/client-approval-status?client_status=Pending"
    },
    {
      title: "Approved",
      value: statsData?.client ? String(statsData.client.approved) : "0",
      description: "Approved by client",
      icon: CheckCircle,
      path: "/dcc/client-approval-status?client_status=Approved"
    },
    {
      title: "Commented",
      value: statsData?.client ? String(statsData.client.commented) : "0",
      description: "Client feedback received",
      icon: MessageSquare,
      path: "/dcc/client-approval-status?client_status=Commented"
    },
    {
      title: "As-Built",
      value: statsData?.client ? String(statsData.client.asBuilt) : "0",
      description: "Marked as As-Built",
      icon: Building2,
      path: "/dcc/client-approval-status?client_status=As-Built"
    },
    {
      title: "Re-approval",
      value: statsData?.client ? String(statsData.client.reApproval) : "0",
      description: "Requires re-approval",
      icon: RefreshCcw,
      path: "/dcc/client-approval-status?client_status=Re-approval"
    },
  ]

  const recentActivities = statsData?.recentActivities || []

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-6 overflow-auto custom-scrollbar">
        {/* Welcome Section */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back!</h2>
          <p className="text-slate-500">
            Here's an overview of your documents and activities
          </p>
        </div>

        {/* Internal Workflow Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-800">Internal Document Workflow</h3>
            <div className="h-px flex-1 bg-slate-200 ml-4"></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {internalStats.map((stat) => {
              const Icon = stat.icon
              return (
                <Card 
                  key={stat.title} 
                  className="cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
                  onClick={() => navigate(stat.path)}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-600 group-hover:text-blue-600 transition-colors">
                      {stat.title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                    <p className="text-xs text-slate-500 mt-1">
                      {stat.description}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Client Workflow Section */}
        <div className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-800">Client Approval Workflow</h3>
            <div className="h-px flex-1 bg-slate-200 ml-4"></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {clientStats.map((stat) => {
              const Icon = stat.icon
              return (
                <Card 
                  key={stat.title} 
                  className="cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all group bg-slate-50/50"
                  onClick={() => navigate(stat.path)}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-600 group-hover:text-emerald-600 transition-colors">
                      {stat.title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-medium">
                      {stat.description}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>
                Your latest document upload activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivities.length === 0 ? (
                <div className="text-sm text-slate-400 italic text-center py-6">
                  No recent activities recorded.
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{activity.title}</h4>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                              activity.status === "approved"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : activity.status === "rejected"
                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            }`}
                          >
                            {activity.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {activity.description}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

export default UserDashboard
