import { AdminSidebar } from "@/components"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserPlus, Briefcase, FileText } from "lucide-react"

function AdminDashboard() {
  const stats = [
    {
      title: "Total Customers",
      value: "0",
      description: "Active customers in the system",
      icon: Users,
    },
    {
      title: "Total Users",
      value: "0",
      description: "Registered users",
      icon: UserPlus,
    },
    {
      title: "Active Jobs",
      value: "0",
      description: "Jobs in progress",
      icon: Briefcase,
    },
    {
      title: "Documents",
      value: "0",
      description: "Total documents",
      icon: FileText,
    },
  ]

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Manage customers, users, jobs, and documents from here.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
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
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome to Admin Dashboard</CardTitle>
                  <CardDescription>
                    Use the sidebar to navigate to different sections and manage your resources.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <h3 className="font-semibold">Quick Actions</h3>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Create new customers</li>
                        <li>• Add new users to the system</li>
                        <li>• Create and manage jobs</li>
                        <li>• Manage document master</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold">Features</h3>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Customer management</li>
                        <li>• User administration</li>
                        <li>• Job tracking and management</li>
                        <li>• Document organization</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default AdminDashboard

