
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
} from "lucide-react"

function UserDashboard() {

  // Dummy data
  const stats = [
    {
      title: "Total Documents",
      value: "24",
      description: "Documents uploaded",
      icon: FileText,
    },
    {
      title: "Pending Approval",
      value: "8",
      description: "Awaiting review",
      icon: Clock,
    },
    {
      title: "Approved",
      value: "16",
      description: "Completed documents",
      icon: CheckCircle,
    },
    {
      title: "Uploaded Today",
      value: "3",
      description: "New uploads",
      icon: Upload,
    },
  ]

  const recentActivities = [
    {
      id: 1,
      title: "Document Uploaded",
      description: "Quality Assurance Plan.pdf",
      time: "2 hours ago",
      status: "pending",
    },
    {
      id: 2,
      title: "Document Approved",
      description: "Welding Joint Report.pdf",
      time: "5 hours ago",
      status: "approved",
    },
    {
      id: 3,
      title: "Document Uploaded",
      description: "Material Heat Chart.xlsx",
      time: "1 day ago",
      status: "pending",
    },
    {
      id: 4,
      title: "Document Approved",
      description: "Final Inspection Report.pdf",
      time: "2 days ago",
      status: "approved",
    },
  ]

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
                  <p className="text-xs text-muted-foreground">
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
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                View Documents
              </Button>
              <Button variant="outline">
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
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            activity.status === "approved"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          }`}
                        >
                          {activity.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {activity.description}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
    </>
  )
}

export default UserDashboard
