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
  ExternalLink,
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

  const stats = [
    {
      title: "Total Documents",
      value: statsData ? String(statsData.totalDocuments) : "0",
      description: "Documents assigned",
      icon: FileText,
      path: "/user/upload-documents?uploader_status_filter=all"
    },
    {
      title: "Pending Approval",
      value: statsData ? String(statsData.pendingApproval) : "0",
      description: "Awaiting review",
      icon: Clock,
      path: "/user/upload-documents?uploader_status_filter=pending_approval"
    },
    {
      title: "Approved",
      value: statsData ? String(statsData.approved) : "0",
      description: "Completed documents",
      icon: CheckCircle,
      path: "/user/upload-documents?uploader_status_filter=approved"
    },
    {
      title: "Uploaded Today",
      value: statsData ? String(statsData.uploadedToday) : "0",
      description: "New uploads today",
      icon: Upload,
      path: "/user/upload-documents?uploader_status_filter=all"
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
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Welcome Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Welcome back!</h2>
          <p className="text-muted-foreground">
            Here's an overview of your documents and activities
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button onClick={() => navigate("/user/upload-documents")}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
              <Button variant="outline" onClick={() => navigate("/user/upload-documents")}>
                <FileText className="mr-2 h-4 w-4" />
                View Documents
              </Button>
              <Button variant="outline" onClick={() => navigate("/user/upload-documents?uploader_status_filter=pending_approval")}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Check Status
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>
                Your latest document activities
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
                        <p className="text-sm text-muted-foreground mt-1">
                          {activity.description}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
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
