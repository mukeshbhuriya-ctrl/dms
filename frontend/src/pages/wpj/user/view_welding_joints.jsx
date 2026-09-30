import { PageContainer } from "@/components/layout/PageContainer";
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useSearchParams } from "react-router-dom"
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
import { Search, Download, X, ChevronDown, ChevronLeft, ChevronRight, Check, Eye, History, ArrowLeft } from "lucide-react"
import ProDataTable from "@/components/shared/ProDataTable"
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"

import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { FormAlert } from "@/components/ui/form-alert"
import WPJCumulativePreview from "@/components/wpj/WPJCumulativePreview"
import WeldJointTrail from "@/components/wpj/WeldJointTrail"
// AB Components
import Stage1 from "@/components/form/ab/stage1"
import Stage2 from "@/components/form/ab/stage2"
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
  const [searchParams, setSearchParams] = useSearchParams()

  // Dialog State
  const [selectedJoint, setSelectedJoint] = useState(null)
  const [selectedStage, setSelectedStage] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [downloadError, setDownloadError] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [previewJointId, setPreviewJointId] = useState(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [userGroupIds, setUserGroupIds] = useState([])

  // Trail Sheet State
  const [isTrailOpen, setIsTrailOpen] = useState(false)
  const [trailJointId, setTrailJointId] = useState(null)
  const [trailJointCategory, setTrailJointCategory] = useState(null)
  const [trailJointNo, setTrailJointNo] = useState("")
  // Filter States
  const [statusFilter, setStatusFilter] = useState("all")
  const [columnFilters, setColumnFilters] = useState({})
  const [activeFilters, setActiveFilters] = useState({ records: [] });
  const [selectedJointIds, setSelectedJointIds] = useState(new Set());
  const [autoAppliedFilters, setAutoAppliedFilters] = useState(false);

  // Drill-down State
  const [activeView, setActiveView] = useState("plans"); // 'plans' | 'joints'
  const [selectedPlanDetails, setSelectedPlanDetails] = useState(null);

  useEffect(() => {
    if (selectedJointIds.size === 1) {
      const selectedId = Array.from(selectedJointIds)[0];
      const match = activeFilters.records.find(r => r.id === selectedId);
      if (match) {
        setColumnFilters(prev => ({
          ...prev,
          msnNumber: [match.msn?.toString()],
          jointCategory: [match.cat?.toString()]
        }));
        setAutoAppliedFilters(true);
      }
    } else if (selectedJointIds.size === 0 && autoAppliedFilters) {
      setColumnFilters(prev => ({
        ...prev,
        msnNumber: [],
        jointCategory: []
      }));
      setAutoAppliedFilters(false);
    }
  }, [selectedJointIds, activeFilters, autoAppliedFilters]);


  const fetchActiveFilters = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/wpj/active-filters");
      if (res.success) setActiveFilters(res.data);
    } catch (err) {
      console.error("Error fetching active filters:", err);
    }
  }, []);

  useEffect(() => {
    fetchActiveFilters();
  }, [fetchActiveFilters, refreshKey]);

  // Handle Notifications Routing (?joint_id=...)
  useEffect(() => {
    const jointIdParam = searchParams.get('joint_id');
    if (jointIdParam && activeFilters?.records?.length > 0) {
      const match = activeFilters.records.find(r => String(r.id) === jointIdParam);
      if (match) {
        setColumnFilters(prev => ({
          ...prev,
          msnNumber: match.msn ? [match.msn.toString()] : undefined,
          jointNo: match.joint_no ? [match.joint_no.toString()] : undefined,
          jointCategory: match.cat ? [match.cat.toString()] : undefined
        }));
        // Clean URL so user can clear filters normally later
        setSearchParams(new URLSearchParams(), { replace: true });
      }
    }
  }, [searchParams, activeFilters.records, setSearchParams]);

  // Auto-selection logic for reverse cascading
  useEffect(() => {
    if (!activeFilters.records || activeFilters.records.length === 0) return;

    const updates = {};
    if (columnFilters.msnNumber && Array.isArray(columnFilters.msnNumber) && columnFilters.msnNumber.length === 1) {
      const selectedMsn = columnFilters.msnNumber[0];
      const match = activeFilters.records.find(r => r.msn?.toString() === selectedMsn?.toString());
      if (match) {
        if (!columnFilters.client || columnFilters.client.length === 0) updates.client = [match.client];
        if (!columnFilters.poNo || columnFilters.poNo.length === 0) updates.poNo = [match.po];
      }
    }
    else if (columnFilters.poNo && Array.isArray(columnFilters.poNo) && columnFilters.poNo.length === 1) {
      const selectedPo = columnFilters.poNo[0];
      const match = activeFilters.records.find(r => r.po?.toString() === selectedPo?.toString());
      if (match && (!columnFilters.client || columnFilters.client.length === 0)) {
        updates.client = [match.client];
      }
    }

    if (Object.keys(updates).length > 0) {
      setColumnFilters(prev => ({ ...prev, ...updates }));
    }
  }, [columnFilters.msnNumber, columnFilters.poNo, activeFilters.records]);

  // Cascading Filter Logic
  const activeClientOptions = useMemo(() => {
    let filtered = activeFilters.records || [];
    if (columnFilters.poNo) {
      const selected = Array.isArray(columnFilters.poNo) ? columnFilters.poNo : [columnFilters.poNo.toString()];
      filtered = filtered.filter(c => selected.includes(c.po?.toString()));
    }
    if (columnFilters.msnNumber) {
      const selected = Array.isArray(columnFilters.msnNumber) ? columnFilters.msnNumber : [columnFilters.msnNumber.toString()];
      filtered = filtered.filter(c => selected.includes(c.msn?.toString()));
    }
    const clients = [...new Set(filtered.map(c => c.client))].filter(Boolean).sort();
    return clients.map(c => ({ label: c, value: c }));
  }, [activeFilters.records, columnFilters.poNo, columnFilters.msnNumber]);

  const activePoOptions = useMemo(() => {
    let filtered = activeFilters.records || [];
    if (columnFilters.client) {
      const selected = Array.isArray(columnFilters.client) ? columnFilters.client : [columnFilters.client.toString()];
      filtered = filtered.filter(c => selected.includes(c.client?.toString()));
    }
    if (columnFilters.msnNumber) {
      const selected = Array.isArray(columnFilters.msnNumber) ? columnFilters.msnNumber : [columnFilters.msnNumber.toString()];
      filtered = filtered.filter(c => selected.includes(c.msn?.toString()));
    }
    const pos = [...new Set(filtered.map(c => c.po))].filter(Boolean).sort();
    return pos.map(p => ({ label: p, value: p }));
  }, [activeFilters.records, columnFilters.client, columnFilters.msnNumber]);

  const activeMsnOptions = useMemo(() => {
    let filtered = activeFilters.records || [];
    if (columnFilters.client) {
      const selected = Array.isArray(columnFilters.client) ? columnFilters.client : [columnFilters.client.toString()];
      filtered = filtered.filter(c => selected.includes(c.client?.toString()));
    }
    if (columnFilters.poNo) {
      const selected = Array.isArray(columnFilters.poNo) ? columnFilters.poNo : [columnFilters.poNo.toString()];
      filtered = filtered.filter(c => selected.includes(c.po?.toString()));
    }
    const msns = [...new Set(filtered.map(c => c.msn))].filter(Boolean).sort();
    return msns.map(m => ({ label: m, value: m }));
  }, [activeFilters.records, columnFilters.client, columnFilters.poNo]);

  const activeJointNoOptions = useMemo(() => {
    let filtered = activeFilters.records || [];
    if (columnFilters.client) {
      const selected = Array.isArray(columnFilters.client) ? columnFilters.client : [columnFilters.client.toString()];
      filtered = filtered.filter(c => selected.includes(c.client?.toString()));
    }
    const jointNos = [...new Set(filtered.map(c => c.joint_no))].filter(Boolean).sort();
    return jointNos.map(j => ({ label: j, value: j }));
  }, [activeFilters.records, columnFilters.client]);

  const activeCatOptions = useMemo(() => {
    let filtered = activeFilters.records || [];
    const cats = [...new Set(filtered.map(c => c.cat))].filter(Boolean).sort();
    return cats.map(c => ({ label: c, value: c }));
  }, [activeFilters.records]);

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
        const response = await apiClient.get('/api/employee-groups/my-groups');
        if (response && response.success) {
          setUserGroupIds((response.data || []).map(g => typeof g === "object" ? g.id : g));
        }
      } catch (error) {
        console.error("Error fetching my groups:", error);
      }
    };
    if (userId) fetchMyGroups();
  }, [userId])


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

    const idKey = `${sPrefix}_qc_engineer_id`;
    const groupIdKey = `${sPrefix}_qc_group_id`;
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

    const prodKey = `${sPrefix}_production_engineer_id`;
    const qcKey = `${sPrefix}_qc_engineer_id`;
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
        if (columnFilters.weldPlanNo) params.weldPlanNo = columnFilters.weldPlanNo;
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
        client: item.weld_joint_plan?.client_name || item.weld_joint_plan?.job?.customer?.customer_name || "",
        poNo: item.weld_joint_plan?.job?.po?.po_number || "",
        tagNo: item.weld_joint_plan?.tag_id || item.weld_joint_plan?.job?.tag_number || "",
        equipment: item.weld_joint_plan?.equipment_name || item.weld_joint_plan?.job?.equipement_name || "",
        projectsId: item.weld_joint_plan?.project_id || item.weld_joint_plan?.job?.project_id || "",
        lindeDrgNo: item.weld_joint_plan?.shreno_drg_no || "",
        drgNo: item.weld_joint_plan?.customer_drg_no || "",
        code: item.weld_joint_plan?.job?.code || "",
        jointNo: item.joint_no,
        jointCategory: item.joint_type,
        generatedReportNo: item.generatedReportNo || "",
        status: getStatus(item),
        backChip: item.back_chip_req || false,
        inspectionData: item.weld_joint_inspection || {},
        fullItem: item
      })

      return {
        data: (response.data || []).map(mapData),
        meta: response.meta || { total: (response.data || []).length, page: 1, limit: limit || 10, totalPages: 1 }
      }
    } catch (err) {
      console.error("Error fetching welding joints:", err);
      return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    }
  }, [refreshKey, statusFilter])

  // --- Plans Fetching (Master View) ---
  const fetchPlansData = useCallback(async ({ page, limit, search, columnFilters }) => {
    try {
      const mergedFilters = { ...columnFilters, is_active: ["true"] }; const params = { page, limit, search, columnFilters: JSON.stringify(mergedFilters) };
      const response = await apiClient.get('/api/wpj/get-weld-joint-plans', params);
      return {
        data: response.data || [],
        meta: response.meta || { total: 0, page: 1, limit: 10, totalPages: 0 }
      };
    } catch (err) {
      console.error("Error fetching plans:", err);
      return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    }
  }, [refreshKey]);

  const planColumns = useMemo(() => [
    {
      accessorKey: "weld_plan_no",
      header: "Weld Plan No",
    },
    {
      accessorKey: "job.job_number",
      header: "Job Number",
    },
    {
      id: "tag_id",
      header: "Tag ID",
      cell: (row) => row.tag_id || row.job?.tag_number || "-"
    },
    {
      id: "equipment_name",
      header: "Equipment Name",
      cell: (row) => row.equipment_name || row.job?.equipement_name || "-"
    },
    {
      id: "customer_name",
      header: "Client",
      cell: (row) => row.client_name || row.job?.customer?.customer_name || "-"
    },
    {
      id: "total_joints",
      header: "Total Joints",
      cell: (row) => row._count?.weld_joints || row.weld_joints?.length || 0,
    },
    {
      id: "actions",
      header: "Action",
      width: "120px",
      cell: (row) => (
        <Button 
          variant="outline" 
          size="sm"
          className="w-full cursor-pointer"
          onClick={() => {
            setSelectedPlanDetails(row);
            setColumnFilters({
              jointNo: [], jointCategory: [],
              msnNumber: row.job?.job_number ? [row.job.job_number.toString()] : [],
              client: [], poNo: [],
              weldPlanNo: row.weld_plan_no ? [row.weld_plan_no] : []
            });
            setActiveView("joints");
          }}
        >
          View Joints <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )
    }
  ], []);


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
    let idsToDownload = [joint.id];
    
    if (selectedJointIds.has(joint.id)) {
      idsToDownload = Array.from(selectedJointIds);
    }
    
    if (idsToDownload.length > 3) {
       console.warn('Max 3 joints can be downloaded together');
       alert('Max 3 joints can be downloaded together');
       return;
    }

    setDownloadError('');
    try {
      const dateTime = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const filename = `${stage === 'all' ? 'Complete_Report' : stage}_${joint.jointNo}_${dateTime}.pdf`;

      await exportApi.download(
        `/api/wpj/generate-report/${joint.id}/${stage}?jointIds=${idsToDownload.join(',')}`,
        filename,
        {},
        { contentType: 'application/pdf' }
      );
    } catch (e) {
      console.error('Error downloading report', e);
      setDownloadError(e.message || 'Error downloading report: Network or Server Error');
    }
  }


  const columns = useMemo(() => [
    {
      header: "Joint No",
      accessorKey: "jointNo",
      filterType: "select",
      isMulti: true,
      filterOptions: activeJointNoOptions
    },
    {
      header: "Client",
      accessorKey: "client",
      filterType: "select",
      isMulti: true,
      filterOptions: activeClientOptions
    },
    {
      header: "PO No",
      accessorKey: "poNo",
      filterType: "select",
      isMulti: true,
      filterOptions: activePoOptions
    },
    {
      header: "Job Number",
      accessorKey: "msnNumber",
      filterType: "select",
      isMulti: true,
      filterOptions: activeMsnOptions
    },

    {
      header: "Category",
      accessorKey: "jointCategory",
      filterType: "select",
      isMulti: true,
      filterOptions: activeCatOptions,
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
      width: "60px",
      cell: (row) => {
        const joint = row.fullItem;
        const mergedJoint = { ...row.fullItem, ...row };
        const { isPending, isAssignedToMe, hasAssignment, isSubmitted } = getStageActionState(mergedJoint);

        const shortLabel = row.status === 'completed' ? 'Report' : row.status.replace('stage', 'Stage ');
        const stageName = shortLabel;

        const getDynamicAction = () => {
          if (row.status === 'completed') {
            return {
              label: "Download Report",
              icon: Download,
              onClick: () => handleDownloadReport(mergedJoint, 'all')
            };
          }

          if (isQCOrNDT) {
            if (isPending) {
              if (isAssignedToMe || userRoles.includes('ADMIN')) {
                return {
                  label: `Review & Approve ${stageName}`,
                  icon: Check,
                  onClick: () => handleOpenStage(mergedJoint),
                  className: "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                };
              }
              if (hasAssignment) {
                return {
                  label: `Assigned to Other ${stageName}`,
                  disabled: true
                };
              }
              return {
                label: `Approval Pending ${stageName}`,
                disabled: true
              };
            }
            const currentStageKey = row.status.replace('stage', 's') + '_status';
            const isRejected = joint.weld_joint_inspection?.[currentStageKey] === 'rejected';
            if (isRejected) {
                return {
                  label: `Rejected - ${stageName}`,
                  disabled: true,
                  className: "text-red-500"
                };
            }
            return null;
          } else {
            const showPending = isPending && isSubmitted;
            const currentStageKey = row.status.replace('stage', 's') + '_status';
            const isRejected = joint.weld_joint_inspection?.[currentStageKey] === 'rejected';

            const isProdOrAdmin = userRoles.includes('PRODUCTION_ENGINEER') || userRoles.includes('ADMIN');

            if (showPending) {
                if (isProdOrAdmin) return null; // Edit action is pushed globally below
                return {
                    label: `Approval Pending ${stageName}`,
                    disabled: true
                };
            }

            return {
              label: isRejected ? `Rejected - Open ${stageName}` : `Open ${stageName}`,
              onClick: () => handleOpenStage(mergedJoint),
              className: isRejected ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            };
          }
        };

        const actions = [];
        
        const hasApprovedStages = row.status !== 'stage1';
        if (hasApprovedStages) {
            actions.push({
                label: "Preview",
                icon: Eye,
                onClick: () => { setPreviewJointId(row.id); setIsPreviewOpen(true); }
            });
        }
        
        actions.push({
            label: "Trail",
            icon: History,
            onClick: () => {
                setTrailJointId(row.id);
                setTrailJointCategory(row.jointCategory);
                setTrailJointNo(row.jointNo);
                setIsTrailOpen(true);
            }
        });
        
        const showPending = isPending && isSubmitted;
        const isProdOrAdmin = userRoles.includes('PRODUCTION_ENGINEER') || userRoles.includes('ADMIN');
        
        if (showPending && isProdOrAdmin && row.status !== 'completed') {
            actions.push({ type: "separator" });
            actions.push({
                label: `Edit ${stageName}`,
                onClick: () => handleOpenStage(mergedJoint),
                className: "text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            });
        }
        
        const dynamicAction = getDynamicAction();
        if (dynamicAction) {
            actions.push({ type: "separator" });
            actions.push(dynamicAction);
        }

        return (
          <div className="flex items-center justify-center">
            <DataTableRowActions actions={actions} />
          </div>
        );
      }
    }
  ], [activeMsnOptions, activeClientOptions, activePoOptions, activeJointNoOptions, activeCatOptions, userGroupIds, userId, handleDownloadReport, handleOpenStage, isQCOrNDT, getStageActionState]);
  const handleSelectionChange = (newSelection) => {
    if (newSelection.size > 3) {
      toast.warning("You can only select a maximum of 3 joints for a consolidated report.", { autoClose: 3000, theme: "colored" });
      return;
    }
    setSelectedJointIds(newSelection);
  };


  return (
    <>
      <PageContainer>
        <div className="flex flex-col gap-4">
          
          {activeView === "plans" && (
            <div className="space-y-4">
              
              <ProDataTable
                columns={planColumns}
                fetchData={fetchPlansData}
                refreshKey={refreshKey}
                globalSearchPlaceholder="Search by Plan No, Job, Client..."
              />
            </div>
          )}

          {activeView === "joints" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-xl font-semibold tracking-tight text-slate-800">
                  {selectedPlanDetails?.weld_plan_no}
                </h2>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setActiveView("plans");
                    setSelectedPlanDetails(null);
                    setColumnFilters({});
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to List
                </Button>
              </div>

              <ProDataTable
                columns={columns}
                fetchData={fetchJointsData}
                onExport={handleExport}
                columnFilters={columnFilters}
                onFilterChange={(newFilters) => setColumnFilters(prev => ({ ...prev, ...newFilters }))}
                refreshKey={refreshKey}
                globalSearchPlaceholder="Search joint no, job, client..."
                selectedRows={selectedJointIds}
                onSelectionChange={handleSelectionChange}
              />
            </div>
          )}
        </div>
      </PageContainer>

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

      {/* Activity Trail Sheet */}
      <Sheet open={isTrailOpen} onOpenChange={setIsTrailOpen}>
        <SheetContent className="sm:max-w-[500px] w-full p-0 overflow-y-auto">
          <SheetHeader className="p-6 pb-2 border-b">
            <SheetTitle className="text-xl font-bold flex flex-col gap-1">
              <span>Weld Inspection Trail</span>
              <span className="text-sm font-normal text-muted-foreground">Joint No: {trailJointNo}</span>
            </SheetTitle>
          </SheetHeader>
          {isTrailOpen && trailJointId && (
            <WeldJointTrail jointId={trailJointId} jointCategory={trailJointCategory} />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

export default ViewWeldingJoints


