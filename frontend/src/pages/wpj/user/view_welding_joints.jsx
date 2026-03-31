import { useState, useEffect, useCallback } from "react"
import { AdminSidebar } from "@/components"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DataTable } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { FormAlert } from "@/components/ui/form-alert"

// AB Components
import Stage1 from "@/components/form/ab/stage1"
import Stage2 from "@/components/form/ab/Stage2"
import Stage3 from "@/components/form/ab/Stage3"
import Stage4 from "@/components/form/ab/stage4"
import Stage5 from "@/components/form/ab/stage5"
import Stage6 from "@/components/form/ab/stage6"
import Stage7 from "@/components/form/ab/Stage7"

// Category C Components
import Stage1C from "@/components/form/c/Stage1"
import Stage2C from "@/components/form/c/Stage2"
import Stage3C from "@/components/form/c/Stage3C"
import Stage4C from "@/components/form/c/Stage4"
import Stage5C from "@/components/form/c/Stage5"

// Category D Components
import Stage1D from "@/components/form/d/Stage1"
import Stage2D from "@/components/form/d/Stage2"
import Stage3D from "@/components/form/d/Stage3"
import Stage4D from "@/components/form/d/Stage4"
import Stage5D from "@/components/form/d/Stage5"
import Stage6D from "@/components/form/d/Stage6"
import Stage7D from "@/components/form/d/Stage7"
import Stage8D from "@/components/form/d/Stage8"

// Category F Components
import Stage1F from "@/components/form/f/Stage1"
import Stage2F from "@/components/form/f/Stage2"
import Stage3F from "@/components/form/f/Stage3"
import Stage4F from "@/components/form/f/Stage4"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"
import WELD_STAGES_CONFIG from "@/config/weldStagesConfig"

function ViewWeldingJoints() {
  const [userRoles, setUserRoles] = useState([])
  const [userId, setUserId] = useState(null)

  // Dialog State
  const [selectedJoint, setSelectedJoint] = useState(null)
  const [selectedStage, setSelectedStage] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [downloadError, setDownloadError] = useState("")

  // Dynamic Component Mapping
  const componentMap = {
    // AB Components
    Stage1, Stage2, Stage3, Stage4, Stage5, Stage6, Stage7,
    // Category C
    Stage1C, Stage2C, Stage3C, Stage4C, Stage5C,
    // Category D
    Stage1D, Stage2D, Stage3D, Stage4D, Stage5D, Stage6D, Stage7D, Stage8D,
    // Category F
    Stage1F, Stage2F, Stage3F, Stage4F
  };

  // Auth & Role logic
  useEffect(() => {
    const authData = localStorage.getItem("user_auth")
    if (authData) {
      try {
        const parsed = JSON.parse(authData)
        const roles = parsed?.payload?.roles || parsed?.payload?.user?.roles || []
        const roleNames = roles.map(r => (typeof r === 'object' && r.name) ? r.name : r);
        setUserRoles(roleNames)
        const uid = parsed?.payload?.user?.id || parsed?.user?.id;
        setUserId(uid);
      } catch { }
    }
  }, [])

  const isQCOrNDT = userRoles.includes('QC_ENGINEER') || userRoles.includes('NDT_ENGINEER');

  const handleOpenStage = (joint) => {
    setSelectedStage(joint.status)
    setSelectedJoint(joint)
    setIsDialogOpen(true)
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
    } else if (category === "C") {
      return (
        <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
          C
        </span>
      )
    } else if (category === "D") {
      return (
        <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-600 dark:text-purple-400">
          D
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-full bg-gray-500/10 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
        {category}
      </span>
    )
  }

  const getStageActionState = useCallback((joint) => {
    const currentStage = joint.status;
    if (!currentStage || currentStage === 'completed') return { isPending: false, isAssignedToMe: false };

    const sPrefix = currentStage.replace('stage', 's');
    const statusKey = `${sPrefix}_status`;
    const isPending = joint.inspectionData?.[statusKey] === 'pending';

    const idKey = `${sPrefix}_qc_eng_id`;
    let assignedId = joint.inspectionData?.[idKey];

    // Fallback to data-encoded assignment if needed
    if (!assignedId) {
      const dataKey = `${sPrefix}_data`;
      const rawData = joint.inspectionData?.[dataKey];
      if (rawData) {
        try {
          const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
          const catKey = joint.jointCategory?.toLowerCase() || 'a';
          const stageData = parsed?.[catKey]?.[sPrefix] || parsed?.[catKey] || parsed;
          assignedId = stageData?.assignedQcEngineerId || stageData?.ndtEngineerId;
        } catch (e) { }
      }
    }

    const isAssignedToMe = userId && assignedId && String(assignedId) === String(userId);
    const hasAssignment = !!assignedId;

    const prodKey = `${sPrefix}_prod_eng_id`;
    const qcKey = `${sPrefix}_qc_eng_id`;
    const completedAtKey = `${sPrefix}_approved_at`;

    const isSubmitted = !!(joint.inspectionData?.[prodKey] ||
      joint.inspectionData?.[qcKey] ||
      joint.inspectionData?.[completedAtKey]);

    return { isPending, isAssignedToMe, hasAssignment, isSubmitted };
  }, [userId]);


  const fetchJointsData = useCallback(async ({ page, limit, search }) => {
    try {
      const data = await apiClient.get('/api/wpj/get-all-weld-joints', { page, limit, search });

      function getStatus(joint) {
        const category = joint.joint_type || 'A';
        const config = WELD_STAGES_CONFIG[category] || [];
        const insp = joint.weld_joint_inspection || {};

        if (config.length === 0) return 'completed';

        for (const stage of config) {
            if (stage.condition && !joint[stage.condition]) continue;
            const dbKey = stage.id.replace('stage', 's') + '_status';
            if (insp[dbKey] !== 'approved') return stage.id;
        }

        return 'completed';
      }

      const mapData = (item) => ({
        id: item.id,
        msnNumber: item.weld_joint_plan?.job?.job_number || "-",
        client: item.weld_joint_plan?.job?.customer?.customer_name || "",
        poNo: item.weld_joint_plan?.job?.po?.po_number || "",
        tagNo: item.weld_joint_plan?.job?.tag_number || "",
        equipment: item.weld_joint_plan?.job?.equipement_name || "",
        projectsId: item.weld_joint_plan?.job?.project_id || "",
        lindeDrgNo: item.weld_joint_plan?.shreno_drg_no || "",
        drgNo: item.weld_joint_plan?.customer_drg_no || "",
        code: item.weld_joint_plan?.job?.code || "",
        jointNo: item.joint_no,
        jointCategory: item.joint_type,
        status: getStatus(item),
        backChip: item.back_chip_req || false,
        inspectionData: item.weld_joint_inspection || {},
        fullItem: item
      })

      return {
        data: (data.data || []).map(mapData),
        meta: data.meta || { total: (data.data || []).length, page: 1, limit: 1000, totalPages: 1 }
      }
    } catch (err) {
      console.error("Error fetching welding joints:", err);
      return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    }
  }, [])

  const handleDownloadReport = async (joint, stage) => {
    setDownloadError("");
    try {
      const dateTime = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const filename = `${stage === 'all' ? 'Complete_Report' : stage}_${joint.jointNo}_${dateTime}.pdf`;

      await exportApi.download(
        `/api/wpj/generate-report/${joint.id}/${stage}`,
        filename,
        {},
        { contentType: 'application/pdf' }
      );
    } catch (e) {
      console.error("Error downloading report", e);
      setDownloadError(e.message || "Error downloading report: Network or Server Error");
    }
  }

  const columns = [
    { header: "MSN No", accessorKey: "msnNumber" },
    { header: "Client", accessorKey: "client" },
    { header: "Joint No", accessorKey: "jointNo" },
    {
      header: "Category",
      accessorKey: "jointCategory",
      cell: (row) => getJointCategoryBadge(row.jointCategory)
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row) => {
        if (row.status === 'completed') return <StatusBadge status="completed" label="Completed" />;
        const shortLabel = row.status.replace('stage', 'Stage ');
        return <StatusBadge status={row.status} label={shortLabel} />;
      }
    },
    {
      header: "Action",
      cell: (row) => {
        const joint = row.fullItem;
        const mergedJoint = { ...row.fullItem, ...row };
        const { isPending, isAssignedToMe, hasAssignment, isSubmitted } = getStageActionState(mergedJoint);

        const shortLabel = row.status === 'completed' ? 'Report' : row.status.replace('stage', 'Stage ');
        const stageName = shortLabel;

        const actionButton = (() => {
          if (row.status === 'completed') {
            return (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownloadReport(mergedJoint, 'all')}
                className="flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                Download
              </Button>
            )
          }

          if (isQCOrNDT) {
            if (isPending) {
              if (isAssignedToMe) {
                return <Button size="sm" onClick={() => handleOpenStage(mergedJoint)} className="bg-black text-white">Review & Approve {stageName}</Button>
              }
              if (hasAssignment) {
                return <Button size="sm" variant="outline" disabled>Assigned to Other {stageName}</Button>
              }
              return <Button size="sm" variant="outline" disabled>Approval Pending {stageName}</Button>
            }
            const currentStageKey = row.status.replace('stage', 's') + '_status';
            const isRejected = joint.weld_joint_inspection?.[currentStageKey] === 'rejected';
            if (isRejected) return <Button size="sm" variant="destructive" disabled>Rejected - {stageName}</Button>

            return <span className="text-muted-foreground">-</span>
          } else {
            const showPending = isPending && isSubmitted;
            const currentStageKey = row.status.replace('stage', 's') + '_status';
            const isRejected = joint.weld_joint_inspection?.[currentStageKey] === 'rejected';

            return (
              <Button
                size="sm"
                onClick={() => handleOpenStage(mergedJoint)}
                variant={isRejected ? "destructive" : "outline"}
                disabled={showPending}
              >
                {showPending ? `Approval Pending ${stageName}` :
                  (isRejected ? `Rejected - Open ${stageName}` : `Open ${stageName}`)}
              </Button>
            )
          }
        })();

        return (
          <div className="flex items-center gap-2">
            {actionButton}
          </div>
        );
      }
    }
  ]

  const handleExport = async () => {
    try {
      await exportApi.exportModule("weld_joint", "weld_joints_list_export.xlsx")
    } catch (error) {
      console.error("Export failed:", error)
    }
  };

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-auto p-6 flex flex-col">
          <h1 className="text-2xl font-bold mb-4">Welding Joints</h1>
          <Card>
            <CardHeader>
              <CardTitle>Welding Joints</CardTitle>
              <CardDescription>
                List of all welding joints with their details and status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormAlert type="error" message={downloadError} />
              <DataTable
                columns={columns}
                fetchData={fetchJointsData}
                onExport={handleExport}
              />
            </CardContent>
          </Card>
        </main>
      </SidebarInset>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[90vw] max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {(() => {
                const config = WELD_STAGES_CONFIG[selectedJoint?.joint_type]?.find(s => s.id === selectedStage);
                return config ? config.label : (selectedStage ? `Inspection Report - ${selectedStage}` : "Form");
              })()}
            </DialogTitle>
          </DialogHeader>

          {(() => {
            if (!selectedJoint || !selectedStage || !WELD_STAGES_CONFIG[selectedJoint.joint_type]) return null;

            let isReviewMode = false;
            if (isQCOrNDT) {
              const { isPending, isAssignedToMe } = getStageActionState({
                ...selectedJoint,
                status: selectedStage
              });
              if (isPending && isAssignedToMe) isReviewMode = true;
            }

            const activeConfig = WELD_STAGES_CONFIG[selectedJoint.joint_type].find(s => s.id === selectedStage);
            if (!activeConfig) return null;

            const StageComponent = componentMap[activeConfig.component];
            if (!StageComponent) return <div className="p-4 text-destructive">Component {activeConfig.component} not found</div>;

            return (
                <StageComponent 
                    initialData={selectedJoint} 
                    inspectionData={selectedJoint.weld_joint_inspection || selectedJoint.inspectionData} 
                    isReview={isReviewMode} 
                    stage={selectedStage}
                    type={activeConfig.type}
                />
            );
          })()}

        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}

export default ViewWeldingJoints
