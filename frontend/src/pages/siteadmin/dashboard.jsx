import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import SiteAdminSidebar from "@/components/sidebar/siteadmin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function SiteAdminDashboard() {
  return (
    <SidebarProvider>
      <SiteAdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Dashboard</h1>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex-1 flex flex-col w-full">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Site Admin Dashboard</h2>
              <p className="text-muted-foreground">Welcome to the site admin panel</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Dashboard</CardTitle>
                  <CardDescription>Overview and statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Site admin dashboard content goes here
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default SiteAdminDashboard
