import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Download, X, ChevronDown, ChevronLeft, ChevronRight, Check, Eye } from "lucide-react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { FormAlert } from "@/components/ui/form-alert"
import WPJCumulativePreview from "@/components/wpj/WPJCumulativePreview"

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
import Stage9D from "@/components/form/d/Stage9"

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
  const [refreshKey, setRefreshKey] = useState(0)
  const [previewJointId, setPreviewJointId] = useState(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [userGroupIds, setUserGroupIds] = useState([])
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState("all")
  const [columnFilters, setColumnFilters] = useState({})
  const [masterFilters, setMasterFilters] = useState({
      clients: [], pos: [], msns: [], jointNos: [], categories: []
  })

  // Dynamic Component Mapping
  const componentMap = {
    // AB Components
    Stage1, Stage2, Stage3, Stage4, Stage5, Stage6, Stage7,
    // Category C
    Stage1C, Stage2C, Stage3C, Stage4C, Stage5C,
    // Category D
    Stage1D, Stage2D, Stage3D, Stage4D, Stage5D, Stage6D, Stage7D, Stage8D, Stage9D,
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
 
  // Fetch My Groups
  useEffect(() => {
    const fetchMyGroups = async () => {
      try {
        const response = await apiClient.get('/api/qc-groups/my-groups');
        if (response && response.success) {
          setUserGroupIds(response.data || []);
        }
      } catch (error) {
        console.error("Error fetching my groups:", error);
      }
    };
    if (userId) fetchMyGroups();
  }, [userId])

  // Fetch Master Filters
  useEffect(() => {
    const fetchMasterFilters = async () => {
      try {
        const response = await apiClient.get('/api/wpj/active-filters');
        if (response && response.success) {
          setMasterFilters(response.data);
        }
      } catch (error) {
        console.error("Error fetching master filters:", error);
      }
    };
    fetchMasterFilters();
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
    const groupIdKey = `${sPrefix}_assigned_qc_group_id`;
    let assignedId = joint.inspectionData?.[idKey];
    let assignedGroupId = joint.inspectionData?.[groupIdKey];

    // Fallback to data-encoded assignment if needed
    if (!assignedId && !assignedGroupId) {
      const dataKey = `${sPrefix}_data`;
      const rawData = joint.inspectionData?.[dataKey];
      if (rawData) {
        try {
          const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
          const catKey = joint.jointCategory?.toLowerCase() || 'a';
          const stageData = parsed?.[catKey]?.[sPrefix] || parsed?.[catKey] || parsed;
          assignedId = stageData?.assignedQcEngineerId || stageData?.ndtEngineerId;
          assignedGroupId = stageData?.assignedQcGroupId;
        } catch (e) { }
      }
    }

    const isAssignedToMe = (userId && assignedId && String(assignedId) === String(userId)) ||
                           (assignedGroupId && userGroupIds.includes(assignedGroupId));
    const hasAssignment = !!(assignedId || assignedGroupId);

    const prodKey = `${sPrefix}_prod_eng_id`;
    const qcKey = `${sPrefix}_qc_eng_id`;
    const completedAtKey = `${sPrefix}_approved_at`;

    const isSubmitted = !!(joint.inspectionData?.[prodKey] ||
      joint.inspectionData?.[qcKey] ||
      joint.inspectionData?.[completedAtKey]);

    return { isPending, isAssignedToMe, hasAssignment, isSubmitted };
  }, [userId, userGroupIds]);


  const fetchJointsData = useCallback(async ({ page, limit, search, columnFilters }) => {
    try {
      const params = { 
        page, 
        limit, 
        status: statusFilter 
      };
      if (search) params.search = search;
      
      // Map column filters
      if (columnFilters) {
        if (columnFilters.client) params.client = columnFilters.client;
        if (columnFilters.poNo) params.po = columnFilters.poNo;
        if (columnFilters.msnNumber) params.msn = columnFilters.msnNumber;
        if (columnFilters.jointNo) params.job = columnFilters.jointNo;
        if (columnFilters.jointCategory) params.cat = columnFilters.jointCategory;
      }

      const response = await apiClient.get('/api/wpj/get-all-weld-joints', params);

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
        data: (response.data || []).map(mapData),
        meta: response.meta || { total: (response.data || []).length, page: 1, limit: pageSize || 10, totalPages: 1 }
      }
    } catch (err) {
      console.error("Error fetching welding joints:", err);
      return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    }
  }, [refreshKey, statusFilter])

  const onFilterChange = (newFilters) => {
    setColumnFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleExport = async () => {
    try {
      await exportApi.exportModule('weld_joint', 'Welding Joints Export.xlsx')
    } catch (error) {
      console.error("Export failed:", error)
    }
  };

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

  const columns = useMemo(() => [
    { 
        header: "MSN No", 
        accessorKey: "msnNumber",
        filterType: "select",
        filterOptions: masterFilters.msns
    },
    { 
        header: "Client", 
        accessorKey: "client",
        filterType: "select",
        filterOptions: masterFilters.clients
    },
    { 
        header: "Joint No", 
        accessorKey: "jointNo",
        filterType: "select",
        filterOptions: masterFilters.jointNos
    },
    {
      header: "Category",
      accessorKey: "jointCategory",
      filterType: "select",
      filterOptions: masterFilters.categories,
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

        // Show preview button if at least one stage is approved (i.e. status is NOT stage1)
        const hasApprovedStages = row.status !== 'stage1';

        return (
          <div className="flex items-center gap-2">
            {hasApprovedStages && (
              <Button
                size="sm"
                variant="ghost"
                className="text-primary hover:text-primary/80"
                onClick={() => { setPreviewJointId(row.id); setIsPreviewOpen(true); }}
                title="Preview approved stages"
              >
                <Eye className="h-4 w-4" /> Preview
              </Button>
            )}
            {actionButton}
          </div>
        );
      }
    }
  ], [masterFilters, userGroupIds, userId, handleDownloadReport, handleOpenStage, isQCOrNDT, getStageActionState]);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
      </header>

      <main className="flex-1 overflow-auto p-6 flex flex-col">
        <div className="flex-1 flex flex-col w-full">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Welding Joints</h1>
            <p className="text-muted-foreground">List of all welding joints with their details and status.</p>
          </div>

          <div className="flex flex-col gap-4">
             {/* Right-aligned Status Filter */}
             <div className="flex justify-end mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500 whitespace-nowrap">Filter by Status:</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <WeldJointTable
              columns={columns}
              fetchData={fetchJointsData}
              onExport={handleExport}
              columnFilters={columnFilters}
              onFilterChange={onFilterChange}
              refreshKey={refreshKey}
            />
          </div>
        </div>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[90vw] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        
            <DialogHeader className="p-6">
              <DialogTitle className="text-xl font-bold">
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
                        onSuccess={() => {
                            setIsDialogOpen(false)
                            setRefreshKey(prev => prev + 1)
                        }}
                    />
                );
              })()}
        </DialogContent>
      </Dialog>

      {/* Cumulative Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[95vw] max-w-[98vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Inspection Preview — Approved Stages</DialogTitle>
          </DialogHeader>
          {isPreviewOpen && previewJointId && (
            <WPJCumulativePreview jointId={previewJointId} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// --- Local Component-Based Table implementation ---
const WeldJointTable = ({
    columns,
    fetchData,
    onExport,
    columnFilters,
    onFilterChange,
    refreshKey
  }) => {
    const [data, setData] = useState([]);
    const [meta, setMeta] = useState({});
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
  
    const isFirstRender = useRef(true);
  
    useEffect(() => {
      if (isFirstRender.current) {
          isFirstRender.current = false;
          return;
      }
      const timer = setTimeout(() => {
        setDebouncedSearch(search);
        setPage(1);
      }, 500);
      return () => clearTimeout(timer);
    }, [search]);
  
    useEffect(() => {
      let cancelled = false;
      const loadData = async () => {
        setLoading(true);
        try {
          const result = await fetchData({
            page,
            limit: pageSize,
            search: debouncedSearch,
            columnFilters
          });
          if (!cancelled) {
              setData(result.data || []);
              setMeta(result.meta || {});
          }
        } catch (error) {
          console.error("Failed to load table data", error);
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      loadData();
      return () => { cancelled = true; };
    }, [page, pageSize, debouncedSearch, columnFilters, fetchData, refreshKey]);
  
    const handleSearchChange = (e) => setSearch(e.target.value);
    const handlePageChange = (newPage) => setPage(newPage);
    const handlePageSizeChange = (val) => {
      setPageSize(parseInt(val));
      setPage(1);
    };
  
    const resolvePath = (object, path) => {
      if (!path) return undefined;
      return path.split('.').reduce((o, p) => (o ? o[p] : undefined), object);
    };
  
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Input
            placeholder="Global Search..."
            value={search}
            onChange={handleSearchChange}
            className="max-w-sm"
          />
          <Button variant="outline" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
  
        <div className="rounded-md border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col, idx) => (
                  <TableHead key={idx} className={`${col.className} h-auto bg-slate-50/50 py-3`}>
                    <div className="flex flex-col gap-1.5 py-1.5">
                      <span className="font-bold uppercase text-slate-700 text-[10px] tracking-wider mb-0.5">
                        {col.header}
                      </span>
                          {col.filterType === 'select' && (
                            <MultiSelectFilter
                              options={col.filterOptions || []}
                              value={columnFilters[col.accessorKey] || []}
                              onChange={(val) => onFilterChange({ [col.accessorKey]: val })}
                              placeholder={`All ${col.header}`}
                            />
                          )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Loading...</TableCell></TableRow>
              ) : data.length ? (
                data.map((row, rIdx) => (
                  <TableRow key={row.id || rIdx}>
                    {columns.map((col, cIdx) => (
                      <TableCell key={cIdx} className={`${col.className}`}>
                        {col.cell ? col.cell(row) : resolvePath(row, col.accessorKey)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No results.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
  
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                  {[5, 10, 20, 50, 100].map(v => <SelectItem key={v} value={v.toString()}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                  Page {meta.page || 1} of {meta.totalPages || 1} ({meta.total || 0} items)
              </div>
              <div className="flex items-center gap-2">
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1 || loading}
                  >
                      <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= (meta.totalPages || 1) || loading}
                  >
                      Next <ChevronRight className="h-4 w-4" />
                  </Button>
              </div>
          </div>
        </div>
      </div>
    );
  };
  
  const MultiSelectFilter = ({ options, value, onChange, placeholder }) => {
    const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
  
    const filteredOptions = options.filter(opt => 
      opt.label?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  
    const toggleOption = (val) => {
      const newVal = selectedValues.includes(val)
        ? selectedValues.filter(v => v !== val)
        : [...selectedValues, val];
      onChange(newVal);
    };
  
    const clearFilters = (e) => {
      e.stopPropagation();
      onChange([]);
      setSearchTerm("");
    };
  
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs font-normal w-full min-w-[110px] max-w-[180px] justify-between px-2 bg-white"
          >
            <div className="flex items-center gap-1 truncate mr-1">
              {selectedValues.length === 0 ? (
                <span className="text-slate-400">{placeholder}</span>
              ) : (
                  <div className="flex items-center gap-1">
                      <span className="font-medium text-primary bg-primary/10 px-1 rounded-sm text-[10px]">
                          {selectedValues.length}
                      </span>
                      <span className="truncate">{options.find(o => o.value === selectedValues[0])?.label}</span>
                      {selectedValues.length > 1 && <span className="text-slate-400">...</span>}
                  </div>
              )}
            </div>
            <div className="flex items-center">
              {selectedValues.length > 0 && (
                  <X 
                    className="h-3 w-3 mr-1 text-slate-400 hover:text-slate-600 pointer-events-auto" 
                    onClick={clearFilters}
                  />
              )}
              <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <div className="flex flex-col h-[300px]">
            <div className="p-2 border-b">
              <div className="relative">
                  <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                      placeholder="Search..."
                      className="h-8 pl-8 text-xs shadow-none border-none focus-visible:ring-0"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-1 py-1">
              {filteredOptions.length === 0 ? (
                <div className="p-2 text-xs text-center text-slate-500">No results.</div>
              ) : (
                filteredOptions.map((opt) => (
                  <div
                    key={opt.value}
                    className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-100 rounded-sm cursor-pointer"
                    onClick={() => toggleOption(opt.value)}
                  >
                    <Checkbox 
                      checked={selectedValues.includes(opt.value)}
                      onCheckedChange={() => toggleOption(opt.value)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-xs truncate flex-1">{opt.label}</span>
                    {selectedValues.includes(opt.value) && <Check className="h-3 w-3 text-primary shrink-0" />}
                  </div>
                ))
              )}
            </div>
            {selectedValues.length > 0 && (
              <div className="p-2 border-t mt-auto">
                  <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full h-7 text-[10px] text-slate-500 hover:text-red-600"
                      onClick={clearFilters}
                  >
                      Clear Selections
                  </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

export default ViewWeldingJoints
