import { PageContainer } from "@/components/layout/PageContainer";
import { useState, useEffect, useCallback, useMemo } from "react"
import { DataTable } from "@/components/shared/DataTable"
import ProDataTable from "@/components/shared/ProDataTable"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import apiClient from "@/api/api.client"
import { generateExcelTemplate, parseExcelFile } from "@/utils/excelImportEngine"
import ImportReviewDialog from "@/components/shared/ImportReviewDialog"
import { Switch } from "@/components/ui/switch"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { Eye, Plus, X, Copy, Pencil, FileText, AlertCircle, CheckCircle2, XCircle, Download, Archive, ArrowLeft } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { toast } from "react-toastify"
import { SearchableSelect } from "@/components/shared/SearchableSelect"
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"
function WeldingJoints() {
  const [formData, setFormData] = useState({
    weldPlanNo: "",
    jobNo: "",
    tagId: "",
    projectId: "",
    clientName: "",
    equipmentName: "",
    shrDrgNo: "",
    customerDrgNumber: "",
    codeOfConstruction: "",
  })
  const [tableRows, setTableRows] = useState([
    {
      id: 1,
      jointNo: "",
      jointType: "",
      joint: "",
      baseMetalThicknessPart1: "",
      baseMetalThicknessPart2: "",
      baseMetalSpecPart1: "",
      baseMetalSpecPart2: "",
      consumable: "",
      wpsNoPqrNo: "",
      process: "",
      impactTest: "",
      backChipReq: "",
      pwht: "",
      rt: "",
      pt: "",
      remarks: "",
    },
  ])
  const [isLoading, setIsLoading] = useState(false)

  const [jobs, setJobs] = useState([])
  const [view, setView] = useState("list") // 'list', 'create', or 'edit'
  const [editingPlanId, setEditingPlanId] = useState(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)

  // View Modal State
  const [selectedPlanDetails, setSelectedPlanDetails] = useState(null)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isViewLoading, setIsViewLoading] = useState(false)

  // Bulk Import State
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [excelData, setExcelData] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [jobMetadata, setJobMetadata] = useState({});
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [columnFilters, setColumnFilters] = useState({ is_active: ['true'] });

  const { roles } = useAuth();
  const isAdmin = roles?.includes("ADMIN");

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmData, setConfirmData] = useState({ title: "", description: "", variant: "danger", onConfirm: null });

  const handleToggleStatus = async (row) => {
    setConfirmData({
        title: `${row.is_active ? 'Deactivate' : 'Activate'} Weld Joint Plan`,
        description: `Are you sure you want to ${row.is_active ? 'deactivate' : 'activate'} Plan ${row.weld_plan_no}?`,
        confirmText: row.is_active ? 'Deactivate' : 'Activate',
        variant: 'warning',
        onConfirm: async () => {
            try {
                const res = await apiClient.patch(`/api/wpj/toggle-plan-status/${row.id}`)
                if (res.success) {
                    toast.success(res.message)
                    setRefreshKey(prev => prev + 1)
                } else {
                    toast.error(res.message || "Failed to toggle status")
                }
            } catch (err) {
                console.error(err)
                toast.error("Failed to toggle status")
            }
        }
    })
    setConfirmDialogOpen(true)
  }

  const handleDelete = async (row) => {
    setConfirmData({
        title: 'Archive Weld Joint Plan',
        description: `Are you sure you want to archive Plan ${row.weld_plan_no}?`,
        confirmText: 'Archive',
        variant: 'danger',
        onConfirm: async () => {
            try {
                const res = await apiClient.delete(`/api/wpj/plan/${row.id}`)
                if (res.success) {
                    toast.success(res.message)
                    setRefreshKey(prev => prev + 1)
                } else {
                    toast.error(res.message || "Failed to archive plan")
                }
            } catch (err) {
                console.error(err)
                toast.error("Failed to archive plan")
            }
        }
    })
    setConfirmDialogOpen(true)
  }

  const fetchJobMetadata = useCallback(async (data) => {
    const uniqueMsns = [...new Set(data.map(d => d.msn))];
    setIsFetchingMetadata(true);
    const metadataMap = {};

    try {
      await Promise.all(uniqueMsns.map(async (msn) => {
        try {
          const res = await apiClient.get(`/api/common/jobs/by-number/${msn}`);
          if (res.success && res.data) {
            metadataMap[msn] = res.data;
          } else {
            metadataMap[msn] = { error: "Job Not Found" };
          }
        } catch (err) {
          metadataMap[msn] = { error: "Job Not Found" };
        }
      }));
      setJobMetadata(metadataMap);
    } catch (err) {
      console.error("Failed to fetch metadata:", err);
    } finally {
      setIsFetchingMetadata(false);
    }
  }, []);

  const handleDownloadTemplate = () => {
    const headers = [
      ["Job Number", "SHRENO DRG NO.", "Customer DRG. NO.", "CODE OF CONSTRUCTION", "Joint No", "Joint Type (A/B/C/D/F)", "Description", "Base Metal Thk P1", "Base Metal Thk P2", "Base Metal Spec P1", "Base Metal Spec P2", "Consumable", "WPS/PQR No", "Process", "Impact Test", "Back Chip Req", "PWHT", "RT", "PT", "Remarks"],
      ["101010232", "DRG-1234", "CUST-456", "ASME Section VIII", "J-01", "A", "Long Seam", "10", "15", "SA 516 Gr 70", "SA 516 Gr 70", "E7018", "WPS-01/PQR-01", "SMAW", "yes", "yes", "yes", "yes", "yes", "No Remarks"],
      ["101010232", "DRG-1234", "CUST-456", "ASME Section VIII", "J-02", "F", "Fillet Weld", "10", "15", "SA 516 Gr 70", "SA 516 Gr 70", "E7018", "WPS-01/PQR-01", "SMAW", "no", "no", "yes", "no", "yes", "Typical row"]
    ];
    generateExcelTemplate(headers, "WPJ_Import_Template.xlsx", "WPJ_Template");
  };

  const handleImportExcel = useCallback(async (file) => {
    if (!file) return;

    try {
        const { rows, warning } = await parseExcelFile(file, ["job number", "msn"]);
        if (warning) toast.warn(warning);

        const seenKeys = new Set();
        const parsedData = rows.map((row, idx) => {
          const msn = String(row[0] || "").trim();
          const shrDrgNo = String(row[1] || "").trim();
          const codeOfConstruction = String(row[3] || "").trim();
          const jointNo = String(row[4] || "").trim();
          const jointType = String(row[5] || "").trim().toUpperCase();
          const description = String(row[6] || "").trim();
          
          const errors = [];
          if (!msn) errors.push("Job Number is required");
          if (!shrDrgNo) errors.push("SHRENO DRG NO is required");
          if (!codeOfConstruction) errors.push("Code of Construction is required");
          if (!jointNo) errors.push("Joint No is required");
          if (!description) errors.push("Description is required");
          
          let backChip = String(row[15] || "").trim().toLowerCase();
          if (jointType === 'F') {
              backChip = "no";
          } else {
              backChip = backChip === 'y' || backChip === 'yes' || backChip === 'true' ? 'yes' : (backChip === 'n' || backChip === 'no' || backChip === 'false' ? 'no' : '');
          }
          
          const pwht = String(row[16] || "").trim().toLowerCase();
          const rt = String(row[17] || "").trim().toLowerCase();
          const pt = String(row[18] || "").trim().toLowerCase();

          const formatBooleanStr = (val) => val === 'y' || val === 'yes' || val === 'true' ? 'yes' : (val === 'n' || val === 'no' || val === 'false' ? 'no' : '');

          const batchKey = `${msn}-${jointNo}`.toUpperCase();
          let isDuplicate = false;
          if (msn && jointNo) {
             if (seenKeys.has(batchKey)) isDuplicate = true;
             else seenKeys.add(batchKey);
          }

          return {
            msn,
            shrDrgNo,
            customerDrgNo: String(row[2] || "").trim(),
            codeOfConstruction,
            jointNo,
            jointType,
            joint: description,
            baseMetalThicknessPart1: String(row[7] || "").trim(),
            baseMetalThicknessPart2: String(row[8] || "").trim(),
            baseMetalSpecPart1: String(row[9] || "").trim(),
            baseMetalSpecPart2: String(row[10] || "").trim(),
            consumable: String(row[11] || "").trim(),
            wpsNoPqrNo: String(row[12] || "").trim(),
            process: String(row[13] || "").trim(),
            impactTest: String(row[14] || "").trim(),
            backChipReq: backChip,
            pwht: formatBooleanStr(pwht),
            rt: formatBooleanStr(rt),
            pt: formatBooleanStr(pt),
            remarks: String(row[19] || "").trim(),
            status: errors.length > 0 ? "error" : (isDuplicate ? "duplicate" : "valid"),
            message: errors.length > 0 ? errors.join(" | ") : (isDuplicate ? "Duplicate Joint No in file" : "Ready")
          };
        }).filter(r => r.msn || r.jointNo);

        if (parsedData.length === 0) {
          toast.warn("No valid records found in file.");
          return;
        }

        setExcelData(parsedData);
        setTimeout(() => {
          setBulkImportDialogOpen(true);
          fetchJobMetadata(parsedData);
        }, 100);

    } catch (err) {
        toast.error(err.message);
    }
  }, [fetchJobMetadata]);

  const confirmBulkImport = async () => {
      setIsImporting(true);
      
      // Group flat rows into Reports
      const reportGroups = {};
      excelData.forEach(row => {
          if (row.status !== 'error' && !jobMetadata[row.msn]?.error && row.status !== 'duplicate') {
              const key = row.msn; // Group by Job Number
              if (!reportGroups[key]) {
                  reportGroups[key] = {
                      msn: row.msn,
                      shrDrgNo: row.shrDrgNo,
                      customerDrgNo: row.customerDrgNo,
                      codeOfConstruction: row.codeOfConstruction,
                      items: []
                  };
              }
              reportGroups[key].items.push({
                  jointNo: row.jointNo,
                  jointType: row.jointType,
                  joint: row.joint,
                  baseMetalThicknessPart1: row.baseMetalThicknessPart1,
                  baseMetalThicknessPart2: row.baseMetalThicknessPart2,
                  baseMetalSpecPart1: row.baseMetalSpecPart1,
                  baseMetalSpecPart2: row.baseMetalSpecPart2,
                  consumable: row.consumable,
                  wpsNoPqrNo: row.wpsNoPqrNo,
                  process: row.process,
                  impactTest: row.impactTest,
                  backChipReq: row.backChipReq,
                  pwht: row.pwht,
                  rt: row.rt,
                  pt: row.pt,
                  remarks: row.remarks
              });
          }
      });

      const payload = Object.values(reportGroups);
      if (payload.length === 0) {
          toast.info("No valid records to import.");
          setIsImporting(false);
          return;
      }
      
      try {
          const res = await apiClient.post("/api/wpj/bulk-create", payload);
          if (res.success) {
              toast.success(res.message || "Bulk import completed successfully");
              setBulkImportDialogOpen(false);
              setRefreshKey(prev => prev + 1);
          } else {
              toast.error(res.message || "Failed to complete bulk import");
          }
      } catch (err) {
          console.error(err);
          toast.error("Failed to save WPJ records");
      } finally {
          setIsImporting(false);
      }
  };

  const handleExport = async () => {
    try {
      await exportApi.exportModule('weld_joint_plan', 'weld_joint_plan_export.xlsx');
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Weld Joint Plan Export failed:", error);
    }
  };

  const handleViewClick = async (planId) => {
    setIsViewLoading(true)
    setError("")

    try {
      const res = await apiClient.get(`/api/wpj/get-weld-joint-plan/${planId}`)

      if (res.success) {
        setSelectedPlanDetails(res.data)
        setIsViewOpen(true)
      } else {
        console.error("Failed to fetch plan details", res)
        setError("Failed to fetch plan details")
      }
    } catch (err) {
      console.error("Error fetching plan details:", err)
      setError("Error fetching plan details")
    } finally {
      setIsViewLoading(false)
    }
  }

  const handleEditClick = useCallback(async (planId) => {
    setIsLoading(true)
    setError("")
    setEditingPlanId(planId)

    try {
      const res = await apiClient.get(`/api/wpj/get-weld-joint-plan/${planId}`)

      if (res.success && res.data) {
        const plan = res.data
        
        // Map backend data to form state
        setFormData({
          weldPlanNo: plan.weld_plan_no,
          jobNo: plan.job?.job_number || "",
          tagId: plan.job?.tag_number || "",
          projectId: plan.job?.project_id || "",
          clientName: plan.job?.customer?.customer_name || "",
          equipmentName: plan.job?.equipement_name || "",
          shrDrgNo: plan.shreno_drg_no || "",
          customerDrgNumber: plan.customer_drg_no || "",
          codeOfConstruction: plan.code_of_construction || "",
        })

        // Map joints to tableRows
        const mappedRows = plan.weld_joints?.map((joint, index) => ({
          id: joint.id, // Keep DB ID for updates
          jointNo: joint.joint_no,
          jointType: joint.joint_type,
          joint: joint.joint_description,
          baseMetalThicknessPart1: joint.base_metal_thickness_p1,
          baseMetalThicknessPart2: joint.base_metal_thickness_p2,
          baseMetalSpecPart1: joint.base_metal_spec_p1,
          baseMetalSpecPart2: joint.base_metal_spec_p2,
          consumable: joint.consumable,
          wpsNoPqrNo: joint.wps_pqr_no,
          process: joint.process,
          impactTest: joint.impact_test,
          backChipReq: joint.back_chip_req === true ? 'yes' : (joint.back_chip_req === false ? 'no' : ''),
          pwht: joint.pwht === true ? 'yes' : (joint.pwht === false ? 'no' : ''),
          rt: joint.rt === true ? 'yes' : (joint.rt === false ? 'no' : ''),
          pt: joint.pt === true ? 'yes' : (joint.pt === false ? 'no' : ''),
          remarks: joint.remarks || "",
        })) || []

        setTableRows(mappedRows.length > 0 ? mappedRows : [{
          id: 1,
          jointNo: "",
          jointType: "",
          joint: "",
          baseMetalThicknessPart1: "",
          baseMetalThicknessPart2: "",
          baseMetalSpecPart1: "",
          baseMetalSpecPart2: "",
          consumable: "",
          wpsNoPqrNo: "",
          process: "",
          impactTest: "",
          backChipReq: "",
          pwht: "",
          rt: "",
          pt: "",
          remarks: "",
        }])

        setView("edit")
      } else {
        setError(responseData.message || "Failed to fetch plan details for editing")
      }
    } catch (err) {
      console.error("Error fetching plan for edit:", err)
      setError("An error occurred while loading plan details")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleCloneClick = useCallback(async (planId) => {
    setIsLoading(true)
    setError("")
    setEditingPlanId(null) // Keep null to trigger POST (create) instead of PUT

    try {
      const res = await apiClient.get(`/api/wpj/get-weld-joint-plan/${planId}`)

      if (res.success && res.data) {
        const plan = res.data
        
        // Map backend data to form state, clearing job-specific metadata
        setFormData({
          weldPlanNo: "", // Will be auto-generated when new job is selected
          jobNo: "",
          tagId: "",
          projectId: "",
          clientName: "",
          equipmentName: "",
          shrDrgNo: "", // Clear drawing numbers to prevent accidental carryover
          customerDrgNumber: "",
          codeOfConstruction: "", // Clear code of construction
        })

        // Map joints to tableRows, preserving joint info but clearing remarks
        const mappedRows = plan.weld_joints?.map((joint, index) => ({
          id: index + 1, // Fresh frontend ID
          jointNo: joint.joint_no, // Preserve Joint No
          jointType: joint.joint_type,
          joint: joint.joint_description,
          baseMetalThicknessPart1: joint.base_metal_thickness_p1,
          baseMetalThicknessPart2: joint.base_metal_thickness_p2,
          baseMetalSpecPart1: joint.base_metal_spec_p1,
          baseMetalSpecPart2: joint.base_metal_spec_p2,
          consumable: joint.consumable,
          wpsNoPqrNo: joint.wps_pqr_no,
          process: joint.process,
          impactTest: joint.impact_test,
          backChipReq: joint.back_chip_req === true ? 'yes' : (joint.back_chip_req === false ? 'no' : ''),
          pwht: joint.pwht === true ? 'yes' : (joint.pwht === false ? 'no' : ''),
          rt: joint.rt === true ? 'yes' : (joint.rt === false ? 'no' : ''),
          pt: joint.pt === true ? 'yes' : (joint.pt === false ? 'no' : ''),
          remarks: joint.remarks || "", // Preserve remarks as requested by client
        })) || []

        setTableRows(mappedRows.length > 0 ? mappedRows : [{
          id: 1,
          jointNo: "",
          jointType: "",
          joint: "",
          baseMetalThicknessPart1: "",
          baseMetalThicknessPart2: "",
          baseMetalSpecPart1: "",
          baseMetalSpecPart2: "",
          consumable: "",
          wpsNoPqrNo: "",
          process: "",
          impactTest: "",
          backChipReq: "",
          pwht: "",
          rt: "",
          pt: "",
          remarks: "",
        }])

        setView("create")
      } else {
        setError(responseData.message || "Failed to fetch plan details for cloning")
      }
    } catch (err) {
      console.error("Error fetching plan for clone:", err)
      setError("An error occurred while loading plan details")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const activeIsActiveOptions = useMemo(() => {
    return [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" }
    ];
  }, []);

  const columns = useMemo(() => [
    {
      accessorKey: "weld_plan_no",
      header: "Weld Plan No",
    },
    {
      accessorKey: "job.job_number",
      header: "Job No",
    },
    {
      id: "joint_type",
      header: "Joint Type",
      cell: (row) => {
        const types = row.weld_joints?.map(j => j.joint_type).filter(Boolean) || [];
        const uniqueTypes = [...new Set(types)].sort();
        return uniqueTypes.join(", ") || "-";
      }
    },
    // {
    //   accessorKey: "job.project_id",
    //   header: "Project ID",
    // },
    {
      accessorKey: "job.equipement_name",
      header: "Equipment Name",
    },
    {
      accessorKey: "job.customer.customer_name",
      header: "Customer",
    },
    {
      accessorKey: "createdAt",
      header: "Created Date",
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      header: "Active",
      accessorKey: "is_active",
      filterType: "select",
      isMulti: true,
      filterOptions: activeIsActiveOptions,
      cell: (row) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${row.is_active ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
          {row.is_active ? "Active" : "Inactive"}
        </span>
      )
    },
    {
      id: "actions",
      header: "Actions",
      width: "60px",
      cell: (row) => {
        const actions = [];
        
        actions.push({
            label: "View",
            icon: Eye,
            onClick: () => handleViewClick(row.id)
        });
        
        actions.push({
            label: "Edit",
            icon: Pencil,
            onClick: () => handleEditClick(row.id)
        });
        
        actions.push({
            label: "Clone",
            icon: Copy,
            onClick: () => handleCloneClick(row.id)
        });
        
        if (isAdmin) {
            actions.push({ type: "separator" });
            actions.push({
                label: row.is_active ? "Deactivate" : "Activate",
                icon: row.is_active ? XCircle : CheckCircle2,
                onClick: () => handleToggleStatus(row),
                className: row.is_active ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            });
            actions.push({
                label: "Archive",
                icon: Archive,
                onClick: () => handleDelete(row),
                className: "text-red-600 hover:text-red-700 hover:bg-red-50"
            });
        }
        
        return (
          <div className="flex items-center justify-center">
            <DataTableRowActions actions={actions} />
          </div>
        );
      },
    },
  ], [handleEditClick, handleCloneClick])

  const fetchPlans = useCallback(async ({ page, limit, search, sorting }) => {
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

      const headers = { "Content-Type": "application/json" }
      if (token) headers["Authorization"] = `Bearer ${token}`

      const params = new URLSearchParams()
      params.append("page", page)
      params.append("limit", limit)
      if (search) params.append("search", search)
      if (columnFilters && Object.keys(columnFilters).length > 0) {
        params.append("columnFilters", JSON.stringify(columnFilters))
      }
      if (sorting && sorting.length > 0) {
        params.append("sortBy", sorting[0].id)
        params.append("sortOrder", sorting[0].desc ? "desc" : "asc")
      }

      const res = await fetch(`${backendUrl}/api/wpj/get-weld-joint-plans?${params.toString()}`, {
        method: "GET",
        headers,
        credentials: "include",
      })
      const responseData = await res.json()

      if (res.ok && responseData.success) {
        return {
          data: responseData.data || [],
          meta: responseData.meta || {}
        }
      } else {
        return { data: [], meta: {} }
      }
    } catch (error) {
      console.error("Error fetching plans:", error)
      return { data: [], meta: {} }
    }
  }, [refreshKey, columnFilters])



  // Fetch jobs and plans from API
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"

        // Get auth token
        const authData = localStorage.getItem("user_auth")
        let token = null
        if (authData) {
          try {
            const parsed = JSON.parse(authData)
            token = parsed?.payload?.token || parsed?.token
          } catch {
            // If parsing fails, continue without token
          }
        }

        const headers = {
          "Content-Type": "application/json",
        }
        if (token) {
          headers["Authorization"] = `Bearer ${token}`
        }

        const res = await fetch(`${backendUrl}/api/wpj/get-job-info`, {
          method: "GET",
          headers,
          credentials: "include",
        })

        const contentType = res.headers.get("content-type") || ""
        const payload = contentType.includes("application/json")
          ? await res.json()
          : await res.text()

        if (res.ok) {
          setJobs(payload?.data || [])
        } else {
          console.error("Failed to fetch jobs", payload)
          setError("Failed to load jobs")
        }
      } catch (err) {
        console.error("Error fetching jobs:", err)
        setError("Failed to load jobs")
      }
    }

    fetchJobs()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleJobChange = (jobNo) => {
    const selectedJob = jobs.find((job) => job.job_number === jobNo)
    setFormData((prev) => ({
      ...prev,
      jobNo,
      tagId: selectedJob?.tag_number || "",
      projectId: selectedJob?.project_id || "",
      clientName: selectedJob?.customer?.customer_name || "",
      equipmentName: selectedJob?.equipement_name || "",
      weldPlanNo: selectedJob?.next_weld_plan_no || prev.weldPlanNo, // Auto-fill with dynamic plan no
    }))
  }

  const handleTableRowChange = (id, field, value) => {
    setTableRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: value }

          // Clear Back Chip Req if jointType is F
          if (field === "jointType") {
            if (value === "F") {
              updatedRow.backChipReq = ""
            }
          }

          return updatedRow
        }
        return row
      })
    )
  }

  const addTableRow = () => {
    const numericIds = tableRows.map((r) => r.id).filter((id) => typeof id === "number")
    const newId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1
    setTableRows((prev) => [
      ...prev,
      {
        id: newId,
        jointNo: "",
        jointType: "",
        joint: "",
        baseMetalThicknessPart1: "",
        baseMetalThicknessPart2: "",
        baseMetalSpecPart1: "",
        baseMetalSpecPart2: "",
        consumable: "",
        wpsNoPqrNo: "",
        process: "",
        impactTest: "",
        backChipReq: "",
        pwht: "",
        rt: "",
        pt: "",
        remarks: "",
      },
    ])
  }

  const removeTableRow = (id) => {
    if (tableRows.length > 1) {
      setTableRows((prev) => prev.filter((row) => row.id !== id))
    }
  }

  const duplicateTableRow = (id) => {
    const rowToDuplicate = tableRows.find((row) => row.id === id)
    if (rowToDuplicate) {
      const numericIds = tableRows.map((r) => r.id).filter((id) => typeof id === "number")
      const newId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1
      setTableRows((prev) => [
        ...prev,
        {
          ...rowToDuplicate,
          id: newId,
          jointNo: "", // Blank joint no for duplicated row
        },
      ])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

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

      const method = view === "edit" ? "PUT" : "POST"
      const url = view === "edit" 
        ? `${backendUrl}/api/wpj/update-weld-joint-plan/${editingPlanId}`
        : `${backendUrl}/api/wpj/create-weld-joint-plan`

      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          ...formData,
          tableRows
        }),
        credentials: "include"
      })

      const data = await res.json()

        if (res.ok) {
          setSuccess(`Welding Joint Plan ${view === 'edit' ? 'updated' : 'created'} successfully!`)
          handleReset()
          setRefreshKey(prev => prev + 1); // Refresh DataTable
          setTimeout(() => {
            setSuccess("")
            setView("list") // Switch back to list view
          }, 1500)
        } else {
          setError(data.message || `Failed to ${view === 'edit' ? 'update' : 'create'} plan`)
          console.error("Submission failed:", data)
        }

    } catch (err) {
      console.error("Error submitting form:", err)
      setError("An error occurred during submission")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setFormData({
      weldPlanNo: "",
      jobNo: "",
      tagId: "",
      projectId: "",
      clientName: "",
      equipmentName: "",
      shrDrgNo: "",
      customerDrgNumber: "",
      codeOfConstruction: "",
    })
    setTableRows([
      {
        id: 1,
        jointNo: "",
        jointType: "",
        joint: "",
        baseMetalThicknessPart1: "",
        baseMetalThicknessPart2: "",
        baseMetalSpecPart1: "",
        baseMetalSpecPart2: "",
        consumable: "",
        wpsNoPqrNo: "",
        process: "",
        impactTest: "",
        backChipReq: "",
        pwht: "",
        rt: "",
        pt: "",
        remarks: "",
      },
    ])
    setEditingPlanId(null)
    setIsLoading(false)
  }




  return (
    <>
        <PageContainer>
<div className={view === "list" ? "flex-1 flex flex-col w-full overflow-x-hidden" : "w-full"}>


            {error && (
              <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
                {success}
              </div>
            )}

            {view === "list" ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <ProDataTable
                  columns={columns}
                  fetchData={fetchPlans}
                  onExport={handleExport}
                  onAdd={() => {
                    handleReset()
                    setView("create")
                  }}
                  onImport={handleImportExcel}
                  onDownloadTemplate={handleDownloadTemplate}
                  columnFilters={columnFilters}
                  onFilterChange={(newFilter) => {
                    setColumnFilters(prev => ({ ...prev, ...newFilter }));
                  }}
                  refreshKey={refreshKey}
                  globalSearchPlaceholder="Search weld plan no, job no, customer..."
                />
                <ConfirmDialog
                  isOpen={confirmDialogOpen}
                  onClose={() => setConfirmDialogOpen(false)}
                  title={confirmData.title}
                  description={confirmData.description}
                  onConfirm={confirmData.onConfirm}
                  confirmText={confirmData.confirmText}
                  variant={confirmData.variant}
                />
              </div>
            ) : (
              <div className="w-full space-y-6 pb-6">
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setView("list")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                  </Button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-6 w-full">
                  {/* First Section: Job Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Job Information</CardTitle>
                      <CardDescription>
                        Select the job to auto-fill core details
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="jobNo">
                          Job No <span className="text-destructive">*</span>
                        </Label>
                        <SearchableSelect
                          value={formData.jobNo}
                          options={jobs.map((job) => ({
                            value: job.job_number,
                            label: job.job_number,
                          }))}
                          onValueChange={handleJobChange}
                          placeholder="Select job number"
                          disabled={isLoading || view === "edit"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="weldPlanNo">
                          Weld Plan No. <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="weldPlanNo"
                          name="weldPlanNo"
                          type="text"
                          placeholder="weld plan number"
                          value={formData.weldPlanNo}
                          disabled={true}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tagId">Tag ID</Label>
                        <Input
                          id="tagId"
                          name="tagId"
                          type="text"
                          placeholder="Auto-filled tag ID"
                          value={formData.tagId}
                          readOnly
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="projectId">Project ID</Label>
                        <Input
                          id="projectId"
                          name="projectId"
                          type="text"
                          placeholder="project ID"
                          value={formData.projectId}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clientName">Client Name</Label>
                        <Input
                          id="clientName"
                          name="clientName"
                          type="text"
                          placeholder="Auto-filled client name"
                          value={formData.clientName}
                          readOnly
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="equipmentName">
                          EQUIPMENT NAME{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="equipmentName"
                          name="equipmentName"
                          type="text"
                          placeholder="Auto-filled equipment name"
                          value={formData.equipmentName}
                          readOnly
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Second Section: Drawing Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Drawing Information</CardTitle>
                      <CardDescription>
                        Enter drawing and construction details
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="shrDrgNo">
                          SHRENO DRG. NO.{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="shrDrgNo"
                          name="shrDrgNo"
                          type="text"
                          placeholder="Enter SHRENO drawing number"
                          value={formData.shrDrgNo}
                          onChange={handleInputChange}
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customerDrgNumber">
                          Customer DRG. NO.
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="customerDrgNumber"
                          name="customerDrgNumber"
                          type="text"
                          placeholder="Enter customer drawing number (optional)"
                          value={formData.customerDrgNumber}
                          onChange={handleInputChange}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="codeOfConstruction">
                          CODE OF CONSTRUCTION{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="codeOfConstruction"
                          name="codeOfConstruction"
                          type="text"
                          placeholder="Enter code of construction"
                          value={formData.codeOfConstruction}
                          onChange={handleInputChange}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Third Section: Joint Details Table */}
                  <Card className="w-full overflow-hidden">
                    <CardHeader>
                      <CardTitle>Joint Details</CardTitle>
                      <CardDescription>
                        Add joint details for the welding plan
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 flex flex-col gap-4 w-full">
                      <div className="rounded-md border overflow-y-auto max-h-[500px]">
                        <Table className="min-w-[1400px]">
                          <TableHeader>
                            {/* First row: Main headers with merged cells */}
                            <TableRow>
                              <TableHead
                                rowSpan={2}
                                className="min-w-[100px] align-middle"
                              >
                                Joint No
                              </TableHead>
                              <TableHead
                                rowSpan={2}
                                className="w-[80px] align-middle"
                              >
                                Joint Type (A/B)
                              </TableHead>
                              <TableHead
                                rowSpan={2}
                                className="min-w-[150px] align-middle"
                              >
                                Description of Joint
                              </TableHead>
                              <TableHead
                                colSpan={2}
                                className="text-center border-b"
                              >
                                Base Metal Thickness (mm)
                              </TableHead>
                              <TableHead
                                colSpan={2}
                                className="text-center border-b"
                              >
                                Base Metal Spec. (Gr.)
                              </TableHead>
                              <TableHead
                                rowSpan={2}
                                className="min-w-[120px] align-middle"
                              >
                                Consumable
                              </TableHead>
                              <TableHead
                                rowSpan={2}
                                className="min-w-[120px] align-middle"
                              >
                                WPS No / PQR No
                              </TableHead>
                              <TableHead
                                rowSpan={2}
                                className="w-[100px] align-middle"
                              >
                                Process
                              </TableHead>
                              <TableHead
                                rowSpan={2}
                                className="w-[100px] align-middle"
                              >
                                Impact Test
                              </TableHead>
                              <TableHead
                                rowSpan={2}
                                className="w-[80px] align-middle"
                              >
                                Back Chip Req.
                              </TableHead>
                              <TableHead
                                colSpan={3}
                                className="text-center border-b"
                              >
                                NDT
                              </TableHead>
                              <TableHead
                                rowSpan={2}
                                className="min-w-[150px] align-middle"
                              >
                                Remarks
                              </TableHead>
                              <TableHead
                                rowSpan={2}
                                className="w-[100px] align-middle"
                              >
                                Actions
                              </TableHead>
                            </TableRow>
                            {/* Second row: Sub headers */}
                            <TableRow>
                              <TableHead className="min-w-[80px]">
                                Part 1
                              </TableHead>
                              <TableHead className="min-w-[80px]">
                                Part 2
                              </TableHead>
                              <TableHead className="min-w-[80px]">
                                Part 1
                              </TableHead>
                              <TableHead className="min-w-[80px]">
                                Part 2
                              </TableHead>
                              <TableHead className="w-[80px]">PWHT</TableHead>
                              <TableHead className="w-[80px]">RT</TableHead>
                              <TableHead className="w-[80px]">PT</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tableRows.length > 0 ? (
                              tableRows.map((row) => (
                                <TableRow key={row.id}>

                                  <TableCell>
                                    <Input
                                      placeholder="Joint No"
                                      value={row.jointNo}
                                      onChange={(e) =>
                                        handleTableRowChange(
                                          row.id,
                                          "jointNo",
                                          e.target.value
                                        )
                                      }
                                      disabled={isLoading}
                                      className="w-full"
                                      required
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Select
                                      value={row.jointType}
                                      onValueChange={(value) =>
                                        handleTableRowChange(
                                          row.id,
                                          "jointType",
                                          value
                                        )
                                      }
                                      disabled={isLoading}
                                    >
                                      <SelectTrigger className="w-[70px] min-w-[70px]">
                                        <SelectValue placeholder="-" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="A">A</SelectItem>
                                        <SelectItem value="B">B</SelectItem>
                                        <SelectItem value="C">C</SelectItem>
                                        <SelectItem value="D">D</SelectItem>
                                        <SelectItem value="F">F</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      placeholder="Description"
                                      value={row.joint}
                                      onChange={(e) =>
                                        handleTableRowChange(
                                          row.id,
                                          "joint",
                                          e.target.value
                                        )
                                      }
                                      disabled={isLoading}
                                      className="w-[150px] min-w-[150px]"
                                      required
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      placeholder="Part 1"
                                      value={row.baseMetalThicknessPart1}
                                      onChange={(e) =>
                                        handleTableRowChange(
                                          row.id,
                                          "baseMetalThicknessPart1",
                                          e.target.value
                                        )
                                      }
                                      disabled={isLoading}
                                      className="w-[80px] min-w-[80px]"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      placeholder="Part 2"
                                      value={row.baseMetalThicknessPart2}
                                      onChange={(e) =>
                                        handleTableRowChange(
                                          row.id,
                                          "baseMetalThicknessPart2",
                                          e.target.value
                                        )
                                      }
                                      disabled={isLoading}
                                      className="w-[80px] min-w-[80px]"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      placeholder="Spec 1"
                                      value={row.baseMetalSpecPart1}
                                      onChange={(e) =>
                                        handleTableRowChange(
                                          row.id,
                                          "baseMetalSpecPart1",
                                          e.target.value
                                        )
                                      }
                                      disabled={isLoading}
                                      className="w-[80px] min-w-[80px]"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      placeholder="Spec 2"
                                      value={row.baseMetalSpecPart2}
                                      onChange={(e) =>
                                        handleTableRowChange(
                                          row.id,
                                          "baseMetalSpecPart2",
                                          e.target.value
                                        )
                                      }
                                      disabled={isLoading}
                                      className="w-[80px] min-w-[80px]"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      placeholder="Consumable"
                                      value={row.consumable}
                                      onChange={(e) =>
                                        handleTableRowChange(
                                          row.id,
                                          "consumable",
                                          e.target.value
                                        )
                                      }
                                      disabled={isLoading}
                                      className="w-[100px] min-w-[100px]"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      placeholder="WPS/PQR No"
                                      value={row.wpsNoPqrNo}
                                      onChange={(e) =>
                                        handleTableRowChange(
                                          row.id,
                                          "wpsNoPqrNo",
                                          e.target.value
                                        )
                                      }
                                      disabled={isLoading}
                                      className="w-[110px] min-w-[110px]"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      placeholder="Process"
                                      value={row.process}
                                      onChange={(e) =>
                                        handleTableRowChange(
                                          row.id,
                                          "process",
                                          e.target.value
                                        )
                                      }
                                      disabled={isLoading}
                                      className="w-[90px] min-w-[90px]"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      placeholder="Impact Test"
                                      value={row.impactTest}
                                      onChange={(e) =>
                                        handleTableRowChange(
                                          row.id,
                                          "impactTest",
                                          e.target.value
                                        )
                                      }
                                      disabled={isLoading}
                                      className="w-[90px] min-w-[90px]"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Select
                                      value={row.backChipReq}
                                      onValueChange={(value) =>
                                        handleTableRowChange(row.id, "backChipReq", value)
                                      }
                                      disabled={isLoading || row.jointType === "F"}
                                    >
                                      <SelectTrigger className="w-[70px] min-w-[70px]">
                                        <SelectValue placeholder="-" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="yes">Yes</SelectItem>
                                        <SelectItem value="no">No</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <Select
                                      value={row.pwht}
                                      onValueChange={(value) =>
                                        handleTableRowChange(row.id, "pwht", value)
                                      }
                                      disabled={isLoading}
                                    >
                                      <SelectTrigger className="w-[70px] min-w-[70px]">
                                        <SelectValue placeholder="-" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="yes">Yes</SelectItem>
                                        <SelectItem value="no">No</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <Select
                                      value={row.rt}
                                      onValueChange={(value) =>
                                        handleTableRowChange(row.id, "rt", value)
                                      }
                                      disabled={isLoading}
                                    >
                                      <SelectTrigger className="w-[70px] min-w-[70px]">
                                        <SelectValue placeholder="-" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="yes">Yes</SelectItem>
                                        <SelectItem value="no">No</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <Select
                                      value={row.pt}
                                      onValueChange={(value) =>
                                        handleTableRowChange(row.id, "pt", value)
                                      }
                                      disabled={isLoading}
                                    >
                                      <SelectTrigger className="w-[70px] min-w-[70px]">
                                        <SelectValue placeholder="-" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="yes">Yes</SelectItem>
                                        <SelectItem value="no">No</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      placeholder="Remarks"
                                      value={row.remarks}
                                      onChange={(e) =>
                                        handleTableRowChange(
                                          row.id,
                                          "remarks",
                                          e.target.value
                                        )
                                      }
                                      disabled={isLoading}
                                      className="w-[120px] min-w-[120px]"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => duplicateTableRow(row.id)}
                                        disabled={isLoading}
                                        title="Duplicate Row"
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeTableRow(row.id)}
                                        disabled={isLoading || tableRows.length === 1}
                                        title="Remove Row"
                                      >
                                        <X className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell
                                  colSpan={17}
                                  className="h-24 text-center"
                                >
                                  No joint details added.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addTableRow}
                        disabled={isLoading}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Row
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Submit Buttons */}
                  <div className="flex justify-end gap-4 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => {
                        handleReset()
                        setView("list")
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading} className="cursor-pointer">
                      {isLoading ? (view === 'edit' ? "Updating..." : "Creating...") : view === 'edit' ? "Update Plan" : "Create Plan"}
                    </Button>

                  </div>
                </div>
              </form>
             </div>
            )}

            {/* View Details Modal */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
              <DialogContent className="sm:max-w-[95vw] w-full max-h-[95vh] overflow-y-auto p-6">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl font-bold text-center">Weld Joint Plan Details</DialogTitle>
                </DialogHeader>

                {selectedPlanDetails && (
                  <div className="space-y-6">
                    {/* Job Info Header - Grid layout */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-sm border p-4 bg-muted/10 rounded-lg">
                      <div className="flex flex-col">
                        <span className="font-semibold text-muted-foreground text-xs">Job No:</span>
                        <span>{selectedPlanDetails.job?.job_number}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-muted-foreground text-xs">Client:</span>
                        <span>{selectedPlanDetails.job?.customer?.customer_name}</span>
                      </div>
                      {/* <div className="flex flex-col">
                        <span className="font-semibold text-muted-foreground text-xs">Project ID:</span>
                        <span>{selectedPlanDetails.job?.project_id}</span>
                      </div> */}
                      <div className="flex flex-col">
                        <span className="font-semibold text-muted-foreground text-xs">Equipment:</span>
                        <span>{selectedPlanDetails.job?.equipement_name}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-muted-foreground text-xs">Drawing No(s):</span>
                        <span>{selectedPlanDetails.shreno_drg_no}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-muted-foreground text-xs">Weld Plan No:</span>
                        <span>{selectedPlanDetails.weld_plan_no}</span>
                      </div>
                    </div>

                    {/* Technical Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-black text-xs text-center font-medium">
                        <thead>
                          {/* Row 1: Code of Construction */}
                          <tr className="bg-white">
                            <th className="border border-black p-1 text-left font-bold" colSpan={2}>
                              CODE OF CONSTRUCTION
                            </th>
                            <th className="border border-black p-1 text-left font-bold" colSpan={13}>
                              {selectedPlanDetails.code_of_construction}
                            </th>
                          </tr>
                          {/* Row 2: Main Headers */}
                          <tr className="bg-gray-50">
                            <th className="border border-black p-2 font-bold align-middle" rowSpan={2}>Joint No</th>
                            <th className="border border-black p-2 font-bold align-middle" rowSpan={2}>Joint Type</th>
                            <th className="border border-black p-2 font-bold align-middle" rowSpan={2}>Joint</th>

                            {/* Thickness Group */}
                            <th className="border border-black p-2 font-bold" colSpan={2}>Base-Metal Thickness mm</th>

                            {/* Spec Group */}
                            <th className="border border-black p-2 font-bold" colSpan={2}>Base Metal Specification</th>

                            <th className="border border-black p-2 font-bold align-middle" rowSpan={2}>Consumable</th>
                            <th className="border border-black p-2 font-bold align-middle" rowSpan={2}>WPS No/PQR No</th>
                            <th className="border border-black p-2 font-bold align-middle" rowSpan={2}>Process</th>
                            <th className="border border-black p-2 font-bold align-middle" rowSpan={2}>Impact Test</th>
                            <th className="border border-black p-2 font-bold align-middle" rowSpan={2}>Back Chip<br/>Req.</th>
                            <th className="border border-black p-2 font-bold align-middle" rowSpan={2}>PWHT</th>

                            <th className="border border-black p-2 font-bold align-middle" colSpan={2}>NDT</th>

                            <th className="border border-black p-2 font-bold align-middle" rowSpan={2}>Remarks</th>
                          </tr>
                          {/* Row 3: Sub Headers */}
                          <tr className="bg-gray-50">
                            <th className="border border-black p-1 font-bold">Part No. 1</th>
                            <th className="border border-black p-1 font-bold">Part No. 2</th>

                            <th className="border border-black p-1 font-bold">Part No. 1</th>
                            <th className="border border-black p-1 font-bold">Part No. 2</th>

                            <th className="border border-black p-1 font-bold">RT</th>
                            <th className="border border-black p-1 font-bold">PT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPlanDetails.weld_joints?.map((joint) => (
                            <tr key={joint.id} className="hover:bg-muted/5">
                              <td className="border border-black p-2 whitespace-nowrap">{joint.joint_no}</td>
                              <td className="border border-black p-2 font-bold">{joint.joint_type}</td>
                              <td className="border border-black p-2">{joint.joint_description || joint.joint}</td>

                              {/* Thickness */}
                              <td className="border border-black p-2">{joint.base_metal_thickness_p1}</td>
                              <td className="border border-black p-2">{joint.base_metal_thickness_p2}</td>

                              {/* Spec */}
                              <td className="border border-black p-2">{joint.base_metal_spec_p1}</td>
                              <td className="border border-black p-2">{joint.base_metal_spec_p2}</td>

                              <td className="border border-black p-2">{joint.consumable}</td>
                              <td className="border border-black p-2">{joint.wps_pqr_no || joint.wpsNoPqrNo}</td>
                              <td className="border border-black p-2">{joint.process}</td>
                              <td className="border border-black p-2">{joint.impact_test || joint.impactTest}</td>
                              <td className="border border-black p-2">{joint.back_chip_req === true ? 'YES' : (joint.back_chip_req === false ? 'NO' : '-')}</td>
                              <td className="border border-black p-2">{joint.pwht === true ? 'YES' : (joint.pwht === false ? 'NO' : '-')}</td>

                              {/* NDT */}
                              <td className="border border-black p-2">{joint.rt === true ? 'YES' : (joint.rt === false ? 'NO' : '-')}</td>
                              <td className="border border-black p-2">{joint.pt === true ? 'YES' : (joint.pt === false ? 'NO' : '-')}</td>

                              <td className="border border-black p-2 min-w-[150px]">{joint.remarks}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <ImportReviewDialog
                open={bulkImportDialogOpen}
                onOpenChange={setBulkImportDialogOpen}
                title="Review WPJ Import"
                description="Verify the welding joint plan details and Job (MSN) validation before confirming."
                data={excelData.map(row => {
                    const job = jobMetadata[row.msn];
                    const hasMsnError = job?.error || !row.msn;
                    return {
                        ...row,
                        status: hasMsnError ? 'error' : row.status,
                        message: hasMsnError ? `Job Number "${row.msn || 'Empty'}" not found | ${row.message !== 'Ready' ? row.message : ''}` : row.message,
                        jobEquip: job && !job.error ? job.equipement_name : null
                    }
                })}
                columns={[
                    { header: "Job No", key: "msn", minWidth: "120px", render: (row) => (
                        <div>
                             <div className="font-semibold">{row.msn}</div>
                             {row.jobEquip && <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[150px]">{row.jobEquip}</div>}
                        </div>
                    )},
                    { header: "SHR Drg No", key: "shrDrgNo", minWidth: "120px" },
                    { header: "Customer Drg No", key: "customerDrgNo", minWidth: "120px" },
                    { header: "Code of Const.", key: "codeOfConstruction", minWidth: "120px" },
                    { header: "Joint No", key: "jointNo", minWidth: "80px", render: (row) => <div className="font-semibold text-xs">{row.jointNo || "-"}</div> },
                    { header: "Joint Type", key: "jointType", minWidth: "80px", render: (row) => <div className="text-center font-bold text-slate-700">{row.jointType || "-"}</div> },
                    { header: "Description", key: "joint", minWidth: "150px", render: (row) => <div className="text-[11px] truncate max-w-[150px]" title={row.joint}>{row.joint || "-"}</div> },
                    { header: "Thk P1", key: "baseMetalThicknessPart1", minWidth: "80px" },
                    { header: "Thk P2", key: "baseMetalThicknessPart2", minWidth: "80px" },
                    { header: "Base Spec P1", key: "baseMetalSpecPart1", minWidth: "100px" },
                    { header: "Base Spec P2", key: "baseMetalSpecPart2", minWidth: "100px" },
                    { header: "Consumable", key: "consumable", minWidth: "100px" },
                    { header: "WPS/PQR No", key: "wpsNoPqrNo", minWidth: "120px" },
                    { header: "Process", key: "process", minWidth: "80px" },
                    { header: "Impact Test", key: "impactTest", minWidth: "80px" },
                    { header: "Back Chip", key: "backChipReq", minWidth: "80px", render: (row) => <div className="text-center text-[10px]">{row.backChipReq ? row.backChipReq.toUpperCase() : "-"}</div> },
                    { header: "PWHT", key: "pwht", minWidth: "60px", render: (row) => <div className="text-center text-[10px]">{row.pwht ? row.pwht.toUpperCase() : "-"}</div> },
                    { header: "RT", key: "rt", minWidth: "60px", render: (row) => <div className="text-center text-[10px]">{row.rt ? row.rt.toUpperCase() : "-"}</div> },
                    { header: "PT", key: "pt", minWidth: "60px", render: (row) => <div className="text-center text-[10px]">{row.pt ? row.pt.toUpperCase() : "-"}</div> },
                    { header: "Remarks", key: "remarks", minWidth: "150px", render: (row) => <div className="max-w-[150px] truncate text-[10px]" title={row.remarks}>{row.remarks || "-"}</div> }
                ]}
                onConfirm={confirmBulkImport}
                isImporting={isImporting}
                isValidating={isFetchingMetadata}
                totalCount={excelData.length}
                validCount={excelData.filter(r => r.status === 'valid' && !jobMetadata[r.msn]?.error).length}
                errorCount={excelData.filter(r => r.status === 'error' || jobMetadata[r.msn]?.error).length}
                duplicateCount={excelData.filter(r => r.status === 'duplicate').length}
                confirmLabel={`Create ${Object.keys(excelData.reduce((acc, row) => { if (row.status === 'valid' && !jobMetadata[row.msn]?.error) acc[row.msn] = true; return acc; }, {})).length} Plans`}
            />
          </div>
</PageContainer>
    </>
  )
}

export default WeldingJoints