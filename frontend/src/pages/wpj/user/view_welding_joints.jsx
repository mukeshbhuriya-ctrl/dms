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

import Stage1 from "@/components/form/ab/stage1"
import Stage2 from "@/components/form/ab/stage2"
import Stage4 from "@/components/form/ab/stage4"
import Stage5 from "@/components/form/ab/stage5"
import Stage6 from "@/components/form/ab/stage6"

import Stage1C from "@/components/form/c/Stage1"
import Stage2C from "@/components/form/c/Stage2"
import Stage3D from "@/components/form/d/Stage3"
import Stage4D from "@/components/form/d/Stage4"
import Stage5D from "@/components/form/d/Stage5"
import Stage6D from "@/components/form/d/Stage6"
import Stage7D from "@/components/form/d/Stage7"
import Stage1F from "@/components/form/f/Stage1"
import Stage2F from "@/components/form/f/Stage2"
import Stage3F from "@/components/form/f/Stage3"
import StageBackChip from "@/components/form/shared/StageBackChip"
import apiClient from "@/api/api.client"
import { exportApi } from "@/api/export.api"

function ViewWeldingJoints() {
  const [userRoles, setUserRoles] = useState([])
  const [userId, setUserId] = useState(null)

  // Dialog State
  const [selectedJoint, setSelectedJoint] = useState(null)
  const [selectedStage, setSelectedStage] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [downloadError, setDownloadError] = useState("")

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
    if (currentStage === 'completed') return { isPending: false, isAssignedToMe: false };

    const statusKeyMap = {
      'stage1': 's1_status',
      'stage2': 's2_status',
      'stage3': 's3_status',
      'stage4': 's4_status',
      'stage5': 's5_status',
      'stage6': 's6_status',
      'stage7': 's7_status',
      'stage8': 's8_status',
      'stage9': 's9_status',
    };

    const qcIdKeyMap = {
      'stage1': 's1_qc_eng_id',
      'stage2': 's2_qc_eng_id',
      'stage3': 's3_qc_eng_id',
      'stage4': 's4_qc_eng_id',
      'stage5': 's5_qc_eng_id',
      'stage6': 's6_qc_eng_id',
      'stage7': 's7_qc_eng_id',
      'stage8': 's8_qc_eng_id',
      'stage9': 's9_qc_eng_id',
    };

    const statusKey = statusKeyMap[currentStage];
    if (!statusKey) return { isPending: false, isAssignedToMe: false };

    const isPending = joint.inspectionData?.[statusKey] === 'pending';

    const idKey = qcIdKeyMap[currentStage];
    let assignedId = joint.inspectionData?.[idKey];

    if (!assignedId) {
      const stagePrefix = currentStage.replace('stage', 's');
      const dataKey = `${stagePrefix}_data`;
      const rawData = joint.inspectionData?.[dataKey];
      if (rawData) {
        try {
          const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
          const catKey = joint.jointCategory?.toLowerCase() || 'f';
          const stageData = parsed?.[catKey]?.[stagePrefix] || parsed?.[catKey] || parsed;
          assignedId = stageData?.assignedQcEngineerId || stageData?.ndtEngineerId;
        } catch (e) { }
      }
    }

    const isAssignedToMe = userId && assignedId && String(assignedId) === String(userId);
    const hasAssignment = !!assignedId;

    const prefix = currentStage.replace('stage', 's');
    const prodKey = `${prefix}_prod_eng_id`;
    const qcKey = `${prefix}_qc_eng_id`;
    const completedAtKey = `${prefix}_approved_at`;

    const isSubmitted = !!(joint.inspectionData?.[prodKey] ||
      joint.inspectionData?.[qcKey] ||
      joint.inspectionData?.[completedAtKey]);

    return { isPending, isAssignedToMe, hasAssignment, isSubmitted };
  }, [userId]);


  const fetchJointsData = useCallback(async ({ page, limit, search }) => {
    try {
      const data = await apiClient.get('/api/wpj/get-all-weld-joints', { page, limit, search });

      function getStatus(joint) {
        const insp = joint.weld_joint_inspection || {};
        if (insp.s1_status !== 'approved') return 'stage1';

        if (joint.joint_type === 'C') {
          if (joint.back_chip_req) {
            if (insp.s2_status !== 'approved') return 'stage2';
            if (insp.s3_status !== 'approved') return 'stage3';
          } else {
            if (insp.s2_status !== 'approved') return 'stage2';
          }

          if (joint.pwht && joint.rt) {
            if (insp.s7_status !== 'approved') return 'stage7';
          }
          if (joint.pwht && joint.pt) {
            if (insp.s8_status !== 'approved') return 'stage8';
          }
          return 'completed';
        }

        if (joint.joint_type === 'D') {
          if (joint.back_chip_req) {
            if (insp.s2_status !== 'approved') return 'stage2';
            if (insp.s3_status !== 'approved') return 'stage3';
            if (insp.s4_status !== 'approved') return 'stage4';
            if (insp.s5_status !== 'approved') return 'stage5';
            if (insp.s6_status !== 'approved') return 'stage6';
            if (insp.s7_status !== 'approved') return 'stage7';
            if (joint.pwht && joint.rt) {
                if (insp.s8_status !== 'approved') return 'stage8';
            }
            if (joint.pwht && joint.pt) {
                if (insp.s9_status !== 'approved') return 'stage9';
            }
          } else {
            if (insp.s2_status !== 'approved') return 'stage2';
            if (insp.s3_status !== 'approved') return 'stage3';
            if (insp.s4_status !== 'approved') return 'stage4';
            if (insp.s5_status !== 'approved') return 'stage5';
            if (insp.s6_status !== 'approved') return 'stage6';
            if (joint.pwht && joint.rt) {
              if (insp.s7_status !== 'approved') return 'stage7';
            }
            if (joint.pwht && joint.pt) {
              if (insp.s8_status !== 'approved') return 'stage8';
            }
          }
          return 'completed';
        }

        if (joint.joint_type === 'F') {
          if (insp.s2_status !== 'approved') return 'stage2';

          if (joint.pwht && joint.rt) {
            if (insp.s3_status !== 'approved') return 'stage3';
          }
          if (joint.pwht && joint.pt) {
            if (insp.s4_status !== 'approved') return 'stage4';
          }
          return 'completed';
        }

        if (joint.joint_type === 'A' || joint.joint_type === 'B') {
          if (joint.back_chip_req) {
            if (insp.s2_status !== 'approved') return 'stage2';
            if (insp.s3_status !== 'approved') return 'stage3';
          } else {
            if (insp.s2_status !== 'approved') return 'stage2';
          }

          if (joint.rt) {
            if (insp.s4_status !== 'approved') return 'stage4';
          }
          if (joint.pt) {
            if (insp.s5_status !== 'approved') return 'stage5';
          }
          if (joint.pwht) {
            if (insp.s6_status !== 'approved') return 'stage6';
            if (insp.s7_status !== 'approved') return 'stage7';
          }
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
      cell: (row) => <StatusBadge status={row.status} />
    },
    {
      header: "Action",
      cell: (row) => {
        const joint = row.fullItem;
        const mergedJoint = { ...row.fullItem, ...row };
        const { isPending, isAssignedToMe, hasAssignment, isSubmitted } = getStageActionState(mergedJoint);

        const stageName = row.status === "stage1" ? "Stage 1"
          : row.status === "stage2" ? "Stage 2"
            : row.status === "stage3" ? "Stage 3"
              : row.status === "stage4" ? "Stage 4"
                : row.status === "stage5" ? "Stage 5"
                  : row.status === "stage6" ? "Stage 6"
                    : row.status === "stage7" ? "Stage 7"
                      : row.status === "stage8" ? "Stage 8"
                        : row.status === "stage9" ? "Stage 9"
                        : row.status === "stage_bc" ? "Back Chip"
                          : row.status;

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
                if (!selectedStage) return "Form";
                if (selectedStage === "stage_bc") return "Back Chip Form";
                if ((selectedJoint?.joint_type === 'A' || selectedJoint?.joint_type === 'B') && !selectedJoint?.back_chip_req && selectedStage === "stage2")
                  return "Stage 2 Form (Weld Visual)";
                if (selectedStage?.startsWith("stage"))
                  return `Stage ${selectedStage.replace("stage", "")} Form`;
                return selectedStage;
              })()}
            </DialogTitle>
          </DialogHeader>

          {(() => {
            let isReviewMode = false;
            if (isQCOrNDT && selectedJoint && selectedStage) {
              const { isPending, isAssignedToMe } = getStageActionState({
                ...selectedJoint,
                status: selectedStage
              });
              if (isPending && isAssignedToMe) {
                isReviewMode = true;
              }
            }

            if (selectedJoint?.jointCategory === 'C' || selectedJoint?.jointCategory === 'D') {
              const hasBC = selectedJoint?.back_chip_req;
              return (
                <>
                  {selectedStage === "stage1" && (
                    <Stage1C initialData={selectedJoint} isReview={isReviewMode} />
                  )}

                  {/* Stage 2 Handling */}
                  {selectedStage === "stage2" && (
                    hasBC ? (
                      <StageBackChip initialData={selectedJoint} isReview={isReviewMode} stage="stage2" />
                    ) : (
                      selectedJoint.jointCategory === 'C' ? (
                        <Stage2C initialData={selectedJoint} isReview={isReviewMode} stage="stage2" />
                      ) : (
                        <Stage3D initialData={selectedJoint} isReview={isReviewMode} stage="stage2" />
                      )
                    )
                  )}

                  {/* Stage 3 Handling */}
                  {selectedStage === "stage3" && (
                    hasBC ? (
                      selectedJoint.jointCategory === 'C' ? (
                        <Stage2C initialData={selectedJoint} isReview={isReviewMode} stage="stage3" />
                      ) : (
                        <Stage3D initialData={selectedJoint} isReview={isReviewMode} stage="stage3" />
                      )
                    ) : (
                      selectedJoint.jointCategory === 'D' && (
                        <Stage3D initialData={selectedJoint} isReview={isReviewMode} stage="stage3" />
                      )
                    )
                  )}

                  {/* Shifting stages for D */}
                  {selectedJoint.jointCategory === 'D' && (
                    <>
                      {selectedStage === "stage4" && (
                        hasBC ? (
                          <Stage3D initialData={selectedJoint} isReview={isReviewMode} stage="stage4" />
                        ) : (
                          <Stage4D initialData={selectedJoint} isReview={isReviewMode} stage="stage4" />
                        )
                      )}
                      {selectedStage === "stage5" && (
                        hasBC ? (
                          <Stage4D initialData={selectedJoint} isReview={isReviewMode} stage="stage5" />
                        ) : (
                          <Stage5D initialData={selectedJoint} isReview={isReviewMode} stage="stage5" />
                        )
                      )}
                      {selectedStage === "stage6" && (
                        hasBC ? (
                          <Stage5D initialData={selectedJoint} isReview={isReviewMode} stage="stage6" />
                        ) : (
                          <Stage6D initialData={selectedJoint} isReview={isReviewMode} stage="stage6" />
                        )
                      )}
                      {selectedStage === "stage7" && (
                        hasBC ? (
                          <Stage6D initialData={selectedJoint} isReview={isReviewMode} stage="stage7" />
                        ) : (
                          <Stage7D initialData={selectedJoint} inspectionData={selectedJoint.inspectionData} isReview={isReviewMode} stage="stage7" type="RT" />
                        )
                      )}
                      {selectedStage === "stage8" && (
                        hasBC ? (
                          <Stage7D initialData={selectedJoint} inspectionData={selectedJoint.inspectionData} isReview={isReviewMode} stage="stage8" type="RT" />
                        ) : (
                          <Stage7D initialData={selectedJoint} inspectionData={selectedJoint.inspectionData} isReview={isReviewMode} stage="stage8" type="PT" />
                        )
                      )}
                      {selectedStage === "stage9" && (
                         <Stage7D initialData={selectedJoint} inspectionData={selectedJoint.inspectionData} isReview={isReviewMode} stage="stage9" type="PT" />
                      )}
                    </>
                  )}

                  {/* Stage 7/8 for C (Fixed if not shifting) */}
                  {selectedJoint.jointCategory === 'C' && (
                    <>
                      {selectedStage === "stage7" && (
                        <Stage7D initialData={selectedJoint} inspectionData={selectedJoint.inspectionData} isReview={isReviewMode} stage="stage7" type="RT" />
                      )}
                      {selectedStage === "stage8" && (
                        <Stage7D initialData={selectedJoint} inspectionData={selectedJoint.inspectionData} isReview={isReviewMode} stage="stage8" type="PT" />
                      )}
                    </>
                  )}
                </>
              )
            }

            if (selectedJoint?.jointCategory === 'F') {
              return (
                <>
                  {selectedStage === "stage1" && (
                    <Stage1F initialData={selectedJoint} inspectionData={selectedJoint?.inspectionData} isReview={isReviewMode} />
                  )}
                  {selectedStage === "stage2" && (
                    <Stage2F initialData={selectedJoint} inspectionData={selectedJoint?.inspectionData} isReview={isReviewMode} />
                  )}
                  {selectedStage === "stage3" && (
                    <Stage3F initialData={selectedJoint} inspectionData={selectedJoint?.inspectionData} isReview={isReviewMode} stage="stage3" />
                  )}
                  {selectedStage === "stage4" && (
                    <Stage3F initialData={selectedJoint} inspectionData={selectedJoint?.inspectionData} isReview={isReviewMode} stage="stage4" />
                  )}
                </>
              )
            }

            if (selectedJoint?.jointCategory === 'A' || selectedJoint?.jointCategory === 'B') {
              return (
                <>
                  {selectedStage === "stage1" && (
                    <Stage1
                      key={selectedJoint?.id}
                      initialData={selectedJoint}
                      isReview={isReviewMode}
                    />
                  )}
                  {selectedStage === "stage2" && (
                    <Stage2
                      key={selectedJoint?.id}
                      initialData={selectedJoint}
                      backChip={selectedJoint?.backChip || false}
                      stage="stage2"
                      inspectionData={selectedJoint?.inspectionData}
                      isReview={isReviewMode}
                    />
                  )}
                  {selectedStage === "stage3" && (
                    <Stage2
                      key={selectedJoint?.id}
                      initialData={selectedJoint}
                      backChip={selectedJoint?.backChip || false}
                      stage="stage3"
                      inspectionData={selectedJoint?.inspectionData}
                      isReview={isReviewMode}
                    />
                  )}
                  {selectedStage === "stage4" && (
                    <Stage4
                      key={selectedJoint?.id}
                      initialData={selectedJoint}
                      inspectionData={selectedJoint?.inspectionData}
                      isReview={isReviewMode}
                    />
                  )}
                  {selectedStage === "stage5" && (
                    <Stage5
                      key={selectedJoint?.id}
                      initialData={selectedJoint}
                      inspectionData={selectedJoint?.inspectionData}
                      isReview={isReviewMode}
                    />
                  )}
                  {selectedStage === "stage6" && (
                    <Stage6
                      key={selectedJoint?.id}
                      initialData={selectedJoint}
                      inspectionData={selectedJoint?.inspectionData}
                      isReview={isReviewMode}
                      stage="stage6"
                    />
                  )}
                  {selectedStage === "stage7" && (
                    <Stage6
                      key={selectedJoint?.id}
                      initialData={selectedJoint}
                      inspectionData={selectedJoint?.inspectionData}
                      isReview={isReviewMode}
                      stage="stage7"
                    />
                  )}
                </>
              )
            }
          })()}

        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}

export default ViewWeldingJoints
