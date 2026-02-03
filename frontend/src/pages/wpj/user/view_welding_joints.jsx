import { useState, useEffect } from "react"
import { AdminSidebar } from "@/components"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Stage1 from "@/components/form/ab/stage1"
import Stage2 from "@/components/form/ab/stage2"

function ViewWeldingJoints() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedStage, setSelectedStage] = useState(null)
  const [selectedJoint, setSelectedJoint] = useState(null)
  const [weldingJoints, setWeldingJoints] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchJoints = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
        const authData = localStorage.getItem("user_auth")
        let token = null
        if (authData) {
          try {
            const parsed = JSON.parse(authData)
            token = parsed?.payload?.token || parsed?.token
          } catch { }
        }

        const res = await fetch(`${backendUrl}/api/wpj/get-all-weld-joints`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
          },
          credentials: "include",
        })

        const data = await res.json()

        if (res.ok) {
          const mappedJoints = (data.data || []).map(joint => ({
            id: joint.id,
            msnNumber: joint.weld_joint_plan?.job?.job_number || "-",
            // Basic Info for Stage 1
            client: joint.weld_joint_plan?.job?.customer?.customer_name || "",
            poNo: joint.weld_joint_plan?.job?.po?.po_number || "",
            tagNo: joint.weld_joint_plan?.job?.tag_number || "",
            equipment: joint.weld_joint_plan?.job?.equipement_name || "",
            projectsId: joint.weld_joint_plan?.job?.project_id || "",
            lindeDrgNo: joint.weld_joint_plan?.shreno_drg_no || "",
            drgNo: joint.weld_joint_plan?.customer_drg_no || "",
            code: joint.weld_joint_plan?.job?.code || "",

            jointNo: joint.joint_no,
            jointCategory: joint.joint_type,
            status: "stage1", // Defaulting to stage1 as confirmed
            backChip: joint.back_chip_req || false,
            // Preserve other details if needed for stages
            ...joint
          }))
          setWeldingJoints(mappedJoints)
        } else {
          console.error("Failed to fetch joints", data)
          setError("Failed to load welding joints")
        }
      } catch (err) {
        console.error("Error fetching joints:", err)
        setError("Error fetching data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchJoints()
  }, [])

  const getStatusBadge = (status) => {
    if (status === "stage1") {
      return (
        <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
          Stage 1
        </span>
      )
    } else if (status === "stage2") {
      return (
        <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-600 dark:text-purple-400">
          Stage 2
        </span>
      )
    } else if (status === "stage3") {
      return (
        <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
          Stage 3
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-full bg-gray-500/10 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
        {status}
      </span>
    )
  }

  const getJointCategoryBadge = (category) => {
    if (category === "A") {
      return (
        <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
          A
        </span>
      )
    } else if (category === "B") {
      return (
        <span className="inline-flex items-center rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-600 dark:text-orange-400">
          B
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-full bg-gray-500/10 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
        {category}
      </span>
    )
  }

  const handleOpenStage = (joint) => {
    setSelectedStage(joint.status)
    setSelectedJoint(joint)
    setIsDialogOpen(true)
  }

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
              <h1 className="text-3xl font-bold mb-2">View Welding Joints</h1>
              <p className="text-muted-foreground">
                View all welding joints information and their status.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Welding Joints</CardTitle>
                <CardDescription>
                  List of all welding joints with their details and status.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-4">Loading...</div>
                ) : error ? (
                  <div className="text-destructive text-center py-4">{error}</div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">S.No</TableHead>
                          <TableHead>MSN Number</TableHead>
                          <TableHead>Joint No</TableHead>
                          <TableHead>Joint Category</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {weldingJoints.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="h-24 text-center"
                            >
                              No welding joints found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          weldingJoints.map((joint, index) => (
                            <TableRow key={joint.id}>
                              <TableCell className="font-medium">
                                {index + 1}
                              </TableCell>
                              <TableCell>{joint.msnNumber}</TableCell>
                              <TableCell>{joint.jointNo}</TableCell>
                              <TableCell>{getJointCategoryBadge(joint.jointCategory)}</TableCell>
                              <TableCell>{getStatusBadge(joint.status)}</TableCell>
                              <TableCell>
                                <Button
                                  onClick={() => handleOpenStage(joint)}
                                  variant="outline"
                                  size="sm"
                                >
                                  Open{" "}
                                  {joint.status === "stage1"
                                    ? "Stage 1"
                                    : joint.status === "stage2"
                                      ? "Stage 2"
                                      : joint.status === "stage3"
                                        ? "Stage 3"
                                        : joint.status}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>

      {/* Stage Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[90vw] max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedStage === "stage1"
                ? "Stage 1 Form"
                : selectedStage === "stage2"
                  ? "Stage 2 Form"
                  : selectedStage === "stage3"
                    ? "Stage 3 Form"
                    : "Form"}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {selectedStage === "stage1" && <Stage1 key={selectedJoint?.id} initialData={selectedJoint} />}
            {(selectedStage === "stage2" || selectedStage === "stage3") && (
              <Stage2
                key={selectedJoint?.id}
                backChip={selectedJoint?.backChip || false}
                stage={selectedStage}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}

export default ViewWeldingJoints
