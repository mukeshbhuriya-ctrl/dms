import React, { useState, useEffect } from "react"
import { useSearchParams, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { PageContainer } from "@/components/layout/PageContainer"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { SearchableSelect } from "@/components/shared/SearchableSelect"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Flame, Eye, Info, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, ShieldCheck, Wrench, FileSignature, CheckSquare, ChevronDown, ChevronUp, Trash2, CalendarClock, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import ProDataTable from "@/components/shared/ProDataTable"
import { DataTableRowActions } from "@/components/shared/DataTableRowActions"
import { PermitExtension } from "./permit_extension"
import { WorkPermitService } from "@/services/work_permit.service"
import apiClient from "@/api/api.client"
import { toast } from "sonner"

const STAGES = [
  { id: 1, title: "Initiation", desc: "Production/Maintenance", icon: Wrench, color: "bg-blue-500", text: "text-blue-600", bgLight: "bg-blue-500/10", border: "border-blue-500/30" },
  { id: 2, title: "Electrical", desc: "Electrical Supervisor", icon: AlertTriangle, color: "bg-blue-500", text: "text-blue-600", bgLight: "bg-blue-500/10", border: "border-blue-500/30" },
  { id: 3, title: "Acceptance", desc: "Gas Testing & Acceptor", icon: CheckSquare, color: "bg-blue-500", text: "text-blue-600", bgLight: "bg-blue-500/10", border: "border-blue-500/30" },
  { id: 4, title: "Approval", desc: "Permit Approver", icon: FileSignature, color: "bg-blue-500", text: "text-blue-600", bgLight: "bg-blue-500/10", border: "border-blue-500/30" },
  { id: 5, title: "Safety", desc: "Safety Officer", icon: ShieldCheck, color: "bg-blue-500", text: "text-blue-600", bgLight: "bg-blue-500/10", border: "border-blue-500/30" }
]

const JOBS = ["Confined Space entry", "Working at Height", "Hot work"]
const SAFETY_ISSUER = ["Isolated", "Area Cordoned", "Drained", "Ventilation", "Railing", "PPE's Identified", "Caution board", "Contractor Supervisor Standby", "Electrical Connection check"]
const SAFETY_ACCEPTOR = ["Lighting", "Earthing", "Hand gloves", "Overall suits/apron", "Ventilation", "Safety Helmet", "Full Body Harness/ Safety Belt", "Fall Arrestor", "Area cordoned", "Face shield/Goggles", "Safety shoes/Gum Boot", "Safety Talk", "Caution board", "Ear Plug/ Muff", "Respirators", "Others"]

export default function CreateWorkPermit() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get("id")
  const isViewMode = id && searchParams.get("action") !== "true"
  const navigate = useNavigate()
  const location = useLocation()
  const [view, setView] = useState(id ? "create" : "list")
  const [loading, setLoading] = useState(false)
  const [activeStage, setActiveStage] = useState(1)
  const [isExtensionExpanded, setIsExtensionExpanded] = useState(false)
  const { roles, functionalTags, user } = useAuth()
  // Functional tags are stored as keys (e.g. "PERMIT_ISSUER") in the DB
  const checkAccess = (keys) => {
    return keys.some(key => 
      roles?.includes(key) || functionalTags?.includes(key)
    )
  }

  const isAdmin = checkAccess(["ADMIN"])
  
  // Explicit mapping based on backend/config/constants.js FUNCTIONAL_TAGS & Roles
  const isInitiator = isAdmin || checkAccess(["PERMIT_ISSUER", "PRODUCTION_ENGINEER", "MAINTENANCE"])
  const isElectrical = isAdmin || checkAccess(["ELECTRICAL_SUPERVISOR"])
  const isAcceptor = isAdmin || checkAccess(["PERMIT_ACCEPTOR", "PRODUCTION_ENGINEER", "MAINTENANCE", "PERMIT_ISSUER"])
  const isApprover = isAdmin || checkAccess(["PERMIT_APPROVER", "PERMIT_ISSUER"])
  const isSafety = isAdmin || checkAccess(["SAFETY_OFFICER"])
  
  const canEditStage1 = isInitiator
  const canEditStage2 = isElectrical
  const canEditStage3 = isAcceptor
  const canEditStage4 = isApprover
  const canEditStage5 = isSafety

  const getVisibleStages = () => {
    if (isViewMode) {
      return STAGES.filter(s => s.id <= activeStage)
    }
    return STAGES.filter(s => {
      if (s.id < activeStage) return true
      if (s.id === activeStage) {
        if (s.id === 1 && canEditStage1) return true
        if (s.id === 2 && canEditStage2) return true
        if (s.id === 3 && canEditStage3) return true
        if (s.id === 4 && canEditStage4) return true
        if (s.id === 5 && canEditStage5) return true
      }
      return false
    })
  }

  const visibleStages = getVisibleStages()

  const canSubmitCurrentStage = () => {
    if (activeStage === 1) return canEditStage1
    if (activeStage === 2) return canEditStage2
    if (activeStage === 3) return canEditStage3
    if (activeStage === 4) return canEditStage4
    if (activeStage === 5) return canEditStage5
    return false
  }

  // Dynamic Options for Selects
  const [departments, setDepartments] = useState([])
  const [groups, setGroups] = useState([])
  const [users, setUsers] = useState([])
  
  // Register View State
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [refreshKey, setRefreshKey] = useState(0)

  // Form State
  const [formData, setFormData] = useState({
    // Stage 1
    location: "",
    job_no: "",
    description: "",
    contractor_name: "",
    contractor_supervisor: "",
    early_acceptor_name: "",
    valid_from: "",
    valid_to: "",
    issuer_department_id: "",
    issuer_group_id: "",
    target_electrical_group_id: "",
    surrounding_checked: "no",
    cleaned: "no",
    change_control: "no",
    mechanical_isolation: "not_required",
    electrical_isolation: "not_required",
    nature_of_jobs: [],
    issuer_safety: [],
    
    // Stage 2
    loto_equipment_1_id: "",
    loto_equipment_2_id: "",
    target_acceptor_group_id: "",
    
    // Stage 3
    gas_tester_name: "",
    gas_o2_level: "",
    gas_test_time: "",
    acceptor_safety: [],
    target_approver_id: "",
    
    // Stage 4
    approver_comments: "",
    target_safety_id: "",
    forward_to_user_id: "",
    
    // Stage 5
    safety_recommendations: ""
  })

  const [keyPersons, setKeyPersons] = useState(Array.from({ length: 3 }, () => ({ name: "", designation: "" })))
  const [isApproverDeclared, setIsApproverDeclared] = useState(false)
  const [isSafetyDeclared, setIsSafetyDeclared] = useState(false)
  const [electricalChecklist, setElectricalChecklist] = useState([
    { question: "Has the equipment checked & proper connection given ( RCCB or ELCB of 30mA provided)", answer: null },
    { question: "Has the equipment earthen properly?", answer: null },
    { question: "24Volt lamp light is provided with proper extension ?", answer: null },
    { question: "Main Fuse & Control Fuse removed", answer: null }
  ])

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [deptRes, groupRes, userRes] = await Promise.all([
          apiClient.get('/api/departments'),
          apiClient.get('/api/employee-groups'),
          apiClient.get('/api/users/get-users')
        ])
        
        if (deptRes.data) {
          setDepartments(deptRes.data.map(d => ({ value: d.id, label: d.name })))
        }
        
        if (groupRes.data) {
          setGroups(groupRes.data.map(g => ({ value: g.id, label: g.name })))
        }

        if (userRes.data) {
          // Users might be wrapped in userRes.data or userRes.data.data depending on the pagination endpoint
          const usersList = Array.isArray(userRes.data) ? userRes.data : (userRes.data.data || [])
          setUsers(usersList.map(u => ({ value: u.id, label: u.name || u.email, tags: u.functional_tags || [] })))
        }
      } catch (err) {
        console.error("Failed to load master data", err)
      }
    }
    fetchMasters()
  }, [])

  useEffect(() => {
    if (id) {
      setView("create")
      loadPermitData(id)
    } else {
      setView("list")
    }
  }, [id])

  useEffect(() => {
    if (activeStage > 1) {
      setIsExtensionExpanded(true)
    }
  }, [activeStage])

  const loadPermitData = async (permitId) => {
    try {
      setLoading(true)
      const res = await WorkPermitService.getPermitById(permitId)
      if (res.data) {
        const p = res.data
        setActiveStage(p.active_stage || 1)
        
        // Map backend data to local state
        setFormData(prev => ({
          ...prev,
          // Stage 1
          issuer_department_id: p.issuer_department_id || "",
          location: p.location || "",
          job_no: p.job_no || "",
          description: p.description || "",
          contractor_name: p.contractor_name || "",
          contractor_supervisor: p.contractor_supervisor || "",
          early_acceptor_name: p.early_acceptor_name || "",
          valid_from: p.valid_from ? new Date(new Date(p.valid_from).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "",
          valid_to: p.valid_to ? new Date(new Date(p.valid_to).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "",
          nature_of_jobs: p.nature_of_jobs || [],
          surrounding_checked: p.surrounding_checked || "no",
          cleaned: p.cleaned || "no",
          change_control: p.change_control || "no",
          mechanical_isolation: p.mechanical_isolation || "not_required",
          electrical_isolation: p.electrical_isolation || "not_required",
          issuer_group_id: p.issuer_group_id || "",
          target_electrical_group_id: p.electrical_group_id || p.pending_with_group_id || "",
          issuer_safety: p.safety_measures?.filter(m => m.category === "Issuer").map(m => m.measure_name) || [],
          
          // Stage 2
          loto_equipment_1_id: p.loto_equipment_1_id || "",
          loto_equipment_2_id: p.loto_equipment_2_id || "",
          target_acceptor_group_id: p.acceptor_group_id || p.pending_with_group_id || "",
          
          // Stage 3
          gas_tester_name: p.gas_tests && p.gas_tests.length > 0 ? p.gas_tests[0].tester_name : "",
          gas_o2_level: p.gas_tests && p.gas_tests.length > 0 ? p.gas_tests[0].o2_level : "",
          gas_test_time: p.gas_tests && p.gas_tests.length > 0 && p.gas_tests[0].test_time 
            ? new Date(new Date(p.gas_tests[0].test_time).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) 
            : "",
          acceptor_safety: p.safety_measures?.filter(m => m.category === "Acceptor").map(m => m.measure_name) || [],
          target_approver_id: p.approver_id || p.pending_with_user_id || "",
          
          // Stage 4
          approver_comments: p.approver_comments || "",
          target_safety_id: p.safety_officer_id || p.pending_with_user_id || "",
          
          // Stage 5
          safety_recommendations: p.safety_recommendations || ""
        }))

        if (p.key_persons && p.key_persons.length > 0) {
          setKeyPersons(p.key_persons)
        }
        
        if (p.safety_measures) {
          const electricalMeasures = p.safety_measures.filter(m => m.category === "Electrical")
          if (electricalMeasures.length > 0) {
            setElectricalChecklist(electricalMeasures.map(m => ({
              question: m.measure_name,
              answer: m.value
            })))
          }
        }
        
        if (p.active_stage > 4 || p.status === "APPROVED" || p.status === "CLOSED") {
          setIsApproverDeclared(true)
        }
        if (p.active_stage > 5 || p.status === "CLOSED") {
          setIsSafetyDeclared(true)
        }
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load permit")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }))
  
  const toggleArrayItem = (field, item) => {
    setFormData(prev => {
      const arr = prev[field]
      return { ...prev, [field]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item] }
    })
  }

  const addKeyPerson = () => setKeyPersons([...keyPersons, { name: "", designation: "" }])
  const removeKeyPerson = (index) => setKeyPersons(keyPersons.filter((_, i) => i !== index))
  const handleKeyPersonUpdate = (index, field, value) => {
    const updated = [...keyPersons];
    updated[index][field] = value;
    setKeyPersons(updated);
  }

  const addElectricalQuestion = () => setElectricalChecklist([...electricalChecklist, { question: "", answer: null }])
  const removeElectricalQuestion = (index) => setElectricalChecklist(electricalChecklist.filter((_, i) => i !== index))
  const handleElectricalQuestionUpdate = (index, value) => {
    const updated = [...electricalChecklist]
    updated[index].question = value
    setElectricalChecklist(updated)
  }
  const handleElectricalAnswerUpdate = (index, value) => {
    const updated = [...electricalChecklist]
    updated[index].answer = value
    setElectricalChecklist(updated)
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      
      // STAGE 1: INITIATE
      if (activeStage === 1) {
        const payload = {
          ...formData,
          valid_from: formData.valid_from || new Date().toISOString(),
          electrical_group_id: formData.target_electrical_group_id,
          key_persons: keyPersons.filter(kp => kp.name.trim()),
          safety_measures: formData.issuer_safety.map(m => ({ measure_name: m, is_checked: true }))
        }
        const res = await WorkPermitService.initiatePermit(payload)
        toast.success("Permit Initiated Successfully")
        setView("list")
        navigate(`/work-permit`)
      } 
      
      // STAGE 2: ELECTRICAL
      else if (activeStage === 2) {
        const payload = {
          ...formData,
          electrical_group_id: formData.target_electrical_group_id,
          acceptor_group_id: formData.target_acceptor_group_id,
          electrical_measures: electricalChecklist.map(c => ({ measure_name: c.question, value: c.answer }))
        }
        await WorkPermitService.submitElectricalReview(id, payload)
        toast.success("Electrical Review Submitted")
        setView("list")
        navigate(`/work-permit`)
      }
      
      // STAGE 3: ACCEPTANCE
      else if (activeStage === 3) {
        const payload = {
          ...formData,
          acceptor_group_id: formData.target_acceptor_group_id,
          approver_id: formData.target_approver_id,
          gas_tests: [{ tester_name: formData.gas_tester_name, o2_level: formData.gas_o2_level, test_time: new Date() }],
          acceptor_measures: formData.acceptor_safety.map(m => ({ measure_name: m, is_checked: true }))
        }
        await WorkPermitService.submitAcceptorReview(id, payload)
        toast.success("Permit Accepted")
        setView("list")
        navigate(`/work-permit`)
      }
      
      // STAGE 4: APPROVAL
      else if (activeStage === 4) {
        if (formData.target_approver_id === "current_issuer_id") {
          toast.error("Issuer cannot be the Approver")
          return
        }
        if (!formData.target_safety_id) {
          toast.error("Please select a Target Safety Officer")
          return
        }
        const payload = { 
          ...formData, 
          approver_id: formData.target_approver_id,
          safety_officer_id: formData.target_safety_id,
          is_approver_declared: isApproverDeclared, 
          action: "APPROVE" 
        }
        await WorkPermitService.approvePermit(id, payload)
        toast.success("Permit Approved")
        setView("list")
        navigate(`/work-permit`)
      }
      
      // STAGE 5: SAFETY
      else if (activeStage === 5) {
        const payload = { ...formData, is_safety_declared: isSafetyDeclared }
        await WorkPermitService.safetyApprove(id, payload)
        toast.success("Final Safety Clearance Granted")
        setView("list")
        navigate(`/work-permit`)
      }
      
    } catch (error) {
      toast.error(error?.response?.data?.message || "Operation failed")
    } finally {
      setLoading(false)
    }
  }

  // --------------------------------------------------------------------------
  // LIST VIEW LOGIC
  // --------------------------------------------------------------------------
  const fetchListData = async ({ page, limit, search, sortBy, sortOrder, columnFilters }) => {
    try {
      const params = { page, limit, search, sortBy, sortOrder, ...columnFilters }
      const response = await WorkPermitService.getAllPermits(params)
      const data = response.data || []
      const meta = response.meta || { total: 0, page: 1, totalPages: 1 }
      
      const mappedData = data.map(item => ({
        id: item.id,
        permit_no: item.permit_no || 'DRAFT-WP',
        job_type: Array.isArray(item.nature_of_jobs) ? item.nature_of_jobs.join(', ') : (item.nature_of_jobs || ''),
        initiator: item.issuer?.name || 'Unknown',
        current_stage: `Stage ${item.active_stage || 1}`,
        status: item.status || 'DRAFT',
        date: item.createdAt
      }))
      return { data: mappedData, meta }
    } catch (error) {
      console.error("Failed to fetch permits", error)
      return { data: [], meta: { total: 0, page: 1, totalPages: 1 } }
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "DRAFT": return "bg-slate-100 text-slate-500 border-slate-200"
      case "PENDING": return "bg-amber-100 text-amber-700 border-amber-200"
      case "APPROVED": return "bg-emerald-100 text-emerald-700 border-emerald-200"
      case "REJECTED": return "bg-red-100 text-red-700 border-red-200"
      default: return "bg-slate-100 text-slate-700"
    }
  }

  const columns = React.useMemo(() => [
    {
      id: "permit_no",
      accessorKey: "permit_no",
      header: "Permit No",
      width: "140px",
      cell: (row) => <span className="font-bold text-slate-700">{row.permit_no}</span>
    },
    {
      id: "date",
      accessorKey: "date",
      header: "Date",
      filterType: "date",
      width: "140px",
      cell: (row) => row.date ? new Date(row.date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }) : "-"
    },
    {
      id: "initiator",
      accessorKey: "initiator",
      header: "Initiator",
      filterType: "text",
      width: "150px"
    },
    {
      id: "current_stage",
      accessorKey: "current_stage",
      header: "Current Stage",
      filterType: "text",
      width: "200px",
      cell: (row) => (
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
          {row.current_stage}
        </span>
      )
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      filterType: "select",
      filterOptions: [
        { label: "Pending", value: "PENDING" },
        { label: "Approved", value: "APPROVED" },
        { label: "Rejected", value: "REJECTED" },
      ],
      width: "120px",
      cell: (row) => (
        <Badge variant="outline" className={`${getStatusColor(row.status)} shadow-none text-[10px] h-5 tracking-wide uppercase font-bold`}>
          {row.status}
        </Badge>
      )
    },
    {
      id: "actions",
      header: "Actions",
      width: "80px",
      cell: (row) => {
        const s = (row.status || "").toUpperCase()
        
        const actions = [];
        
        actions.push({
            label: "View Permit",
            icon: Eye,
            onClick: () => {
              setView("create")
              navigate(`/work-permit?id=${row.id}`)
            }
        });
        
        if (s !== "APPROVED" && s !== "REJECTED") {
            actions.push({ type: "separator" });
            actions.push({
                label: "Action Required",
                icon: ArrowRight,
                onClick: () => {
                  setView("create")
                  navigate(`/work-permit?id=${row.id}&action=true`)
                },
                className: "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
            });
        }

        return (
          <div className="flex items-center justify-center">
             <DataTableRowActions actions={actions} />
          </div>
        )
      }
    }
  ], [navigate])

  return (
    <PageContainer>
      {view === "list" ? (
        <div className="h-[calc(100vh-160px)]">
          <ProDataTable
            columns={columns}
            fetchData={fetchListData}
            refreshKey={refreshKey}
            onAdd={() => {
              setView("create")
              navigate('/work-permit')
            }}
            onAddTooltip="Initiate New Permit"
            globalSearchPlaceholder="Search by permit no or job type..."
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            initialStickyColumns={["permit_no", "job_type"]}
          />
        </div>
      ) : (
      <div className="flex flex-col gap-4 pt-2 pb-6 w-full">
        <div className="flex items-center justify-end shrink-0">
          <Button variant="outline" onClick={() => {
              setView("list")
              navigate('/work-permit')
            }} className="shadow-none h-9 text-slate-700 border-slate-200 bg-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to List
          </Button>
        </div>

        {/* Compact Read-Only Stepper */}
        <div className="bg-white border border-slate-200 p-2.5 px-4 flex items-center justify-between relative">
          <div className="absolute top-1/2 left-8 right-8 h-[2px] bg-slate-100 -translate-y-1/2 z-0"></div>
          {STAGES.map((stage) => {
            const isVisible = visibleStages.some(vs => vs.id === stage.id)
            const isActive = stage.id === activeStage && isVisible
            const isPast = stage.id < activeStage
            return (
              <div key={stage.id} className={`relative z-10 flex items-center gap-2 bg-white px-2 ${!isVisible && 'opacity-40 grayscale'}`}>
                <div className={`h-6 w-6 rounded-full flex items-center justify-center border text-[10px] font-bold transition-all ${isActive ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : isPast ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                  {isPast ? <CheckCircle2 className="h-3.5 w-3.5" /> : stage.id}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider hidden sm:block ${isActive ? 'text-blue-600' : isPast ? 'text-slate-700' : 'text-slate-400'}`}>
                  {stage.title}
                </span>
              </div>
            )
          })}
        </div>

        {/* Form Stages Container */}
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">

          {/* STAGE 1: INITIATION */}
          {visibleStages.some(s => s.id === 1) && (
            <Card className={`relative border border-slate-200 shadow-none rounded-none overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white`}>
              {(activeStage !== 1 || isViewMode) && <div className="absolute inset-0 z-50 bg-slate-50/40 cursor-not-allowed" title="Not Editable" />}
              <div className={`${STAGES[0].color} h-1 w-full`}></div>
              <CardHeader className="bg-white border-b border-slate-100 py-4">
                <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <span className={`h-5 w-5 rounded-none ${STAGES[0].color} text-white flex items-center justify-center text-[10px]`}>1</span>
                  Measure Taken by Permit Issuer
                </CardTitle>
                <CardDescription className="text-xs">Production or Maintenance department initiates the permit request.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                
                {/* Basic Information Section */}
                <div className="space-y-4 mb-8">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Issuer Dept. <span className="text-red-500">*</span></label>
                      <SearchableSelect required={activeStage === 1} options={departments} value={formData.issuer_department_id} onValueChange={(v) => handleChange('issuer_department_id', v)} placeholder="Select Dept" className="h-8 text-xs bg-white shadow-none border-slate-200 rounded-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Location <span className="text-red-500">*</span></label>
                      <Input required={activeStage === 1} value={formData.location} onChange={e => handleChange('location', e.target.value)} placeholder="Enter location" className="h-8 text-xs bg-white shadow-none border-slate-200 rounded-none" />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Accepter <span className="text-red-500">*</span></label>
                      <Input required={activeStage === 1} value={formData.early_acceptor_name} onChange={e => handleChange('early_acceptor_name', e.target.value)} placeholder="Enter Accepter Name" className="h-8 text-xs bg-white shadow-none border-slate-200 rounded-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Job No. <span className="text-red-500">*</span></label>
                      <Input value={formData.job_no} onChange={e => handleChange('job_no', e.target.value)} placeholder="Enter Job No." className="h-8 text-xs bg-white shadow-none border-slate-200 rounded-none" />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description of Job <span className="text-red-500">*</span></label>
                      <Textarea value={formData.description} onChange={e => handleChange('description', e.target.value)} placeholder="Enter detailed description of the job..." className="bg-white shadow-none border-slate-200 rounded-none min-h-[60px] resize-y text-xs" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Name of the Contractor</label>
                      <Input value={formData.contractor_name} onChange={e => handleChange('contractor_name', e.target.value)} placeholder="Enter contractor name" className="h-8 text-xs bg-white shadow-none border-slate-200 rounded-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">No. of Persons Engaged</label>
                      <Input value={keyPersons.length} disabled className="h-8 text-xs bg-slate-50 border-slate-200 rounded-none text-slate-500 shadow-none" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Name of Contractor Supervisor</label>
                      <Input value={formData.contractor_supervisor} onChange={e => handleChange('contractor_supervisor', e.target.value)} placeholder="Enter supervisor name" className="h-8 text-xs bg-white shadow-none border-slate-200 rounded-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valid Date From</label>
                      <Input type="datetime-local" disabled value={formData.valid_from || new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} className="h-8 text-xs bg-slate-50 border-slate-200 rounded-none text-slate-500 shadow-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valid To</label>
                      <Input type="datetime-local" value={formData.valid_to} onChange={e => handleChange('valid_to', e.target.value)} className="h-8 text-xs bg-white shadow-none border-slate-200 rounded-none" />
                    </div>
                  </div>
                </div>

                {/* Nature of Job */}
                <div className="mb-6 border border-slate-200">
                  <div className="flex flex-col md:flex-row md:items-stretch">
                    <div className="p-3 bg-white border-b md:border-b-0 md:border-r border-slate-200 md:w-[250px] shrink-0 flex items-center">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nature of job to be performed</label>
                    </div>
                    <div className="p-3 flex items-center justify-between w-full bg-white">
                      {JOBS.map(job => (
                        <div key={job} className="flex items-center justify-between gap-3">
                          <label htmlFor={`job-${job}`} className="text-xs font-medium cursor-pointer text-slate-700">{job}</label>
                          <Checkbox id={`job-${job}`} checked={formData.nature_of_jobs.includes(job)} onCheckedChange={() => toggleArrayItem('nature_of_jobs', job)} className="shadow-none border-slate-300 rounded-none h-4 w-4" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-end">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Key Persons Involved</label>
                    <Button type="button" variant="outline" size="sm" onClick={addKeyPerson} className="h-7 text-[10px] text-blue-600 border-blue-200 hover:bg-blue-50 shadow-none uppercase font-bold tracking-wider">
                      <Plus className="h-3 w-3 mr-1" /> Add Person
                    </Button>
                  </div>
                  <div className="border border-slate-200 rounded-none overflow-hidden bg-white shadow-none">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 w-10">#</th>
                          <th className="px-3 py-2 border-l border-slate-200">Full Name</th>
                          <th className="px-3 py-2 border-l border-slate-200">Designation / Role</th>
                          <th className="px-3 py-2 border-l border-slate-200 text-right w-16">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {keyPersons.map((p, idx) => (
                          <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                            <td className="px-3 py-2 text-slate-500 font-medium">{idx + 1}</td>
                            <td className="px-3 py-2 border-l border-slate-100">
                              <Input 
                                value={p.name} 
                                onChange={(e) => handleKeyPersonUpdate(idx, 'name', e.target.value)}
                                placeholder="Enter name" 
                                className="h-8 text-xs bg-slate-50/50 shadow-none border-slate-200 rounded-none focus-visible:ring-0 focus-visible:border-slate-300" 
                              />
                            </td>
                            <td className="px-3 py-2 border-l border-slate-100">
                              <Input 
                                value={p.designation}
                                onChange={(e) => handleKeyPersonUpdate(idx, 'designation', e.target.value)}
                                placeholder="e.g., Technician" 
                                className="h-8 text-xs bg-slate-50/50 shadow-none border-slate-200 rounded-none focus-visible:ring-0 focus-visible:border-slate-300" 
                              />
                            </td>
                            <td className="px-3 py-2 border-l border-slate-100 text-right">
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeKeyPerson(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 shadow-none rounded-none">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* MEASURES TAKEN BY PERMIT ISSUER */}
                <div className="pt-6 border-t border-slate-100">
                  <div className="mb-6">
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2">Measures Taken By Permit Issuer</h3>
                  </div>

                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Surrounding Area Checked</label>
                        <Select value={formData.surrounding_checked} onValueChange={v => handleChange('surrounding_checked', v)}>
                          <SelectTrigger className="w-full bg-white shadow-none border-slate-200 rounded-none h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent rounded-none>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cleaned</label>
                        <Select value={formData.cleaned} onValueChange={v => handleChange('cleaned', v)}>
                          <SelectTrigger className="w-full bg-white shadow-none border-slate-200 rounded-none h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent rounded-none>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Change Control Applicable</label>
                        <Select value={formData.change_control} onValueChange={v => handleChange('change_control', v)}>
                          <SelectTrigger className="w-full bg-white shadow-none border-slate-200 rounded-none h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent rounded-none>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mechanical Isolation</label>
                        <Select value={formData.mechanical_isolation} onValueChange={v => handleChange('mechanical_isolation', v)}>
                          <SelectTrigger className="w-full bg-white shadow-none border-slate-200 rounded-none h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent rounded-none>
                            <SelectItem value="required">Required</SelectItem>
                            <SelectItem value="not_required">Not Required</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Electrical Isolation</label>
                        <Select value={formData.electrical_isolation} onValueChange={v => handleChange('electrical_isolation', v)}>
                          <SelectTrigger className="w-full bg-white shadow-none border-slate-200 rounded-none h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent rounded-none>
                            <SelectItem value="required">Required</SelectItem>
                            <SelectItem value="not_required">Not Required</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Safety Checklist */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 block">Safety Checklist</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-200 p-4 bg-slate-50/50">
                        {SAFETY_ISSUER.map((item, idx) => (
                          <div key={idx} className="flex items-center space-x-3">
                            <Checkbox id={`safety-${idx}`} checked={formData.issuer_safety.includes(item)} onCheckedChange={() => toggleArrayItem('issuer_safety', item)} className="shadow-none border-slate-300 bg-white" />
                            <label htmlFor={`safety-${idx}`} className="text-xs font-medium text-slate-700 cursor-pointer">{item}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-8 border-t border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Permit Issuer Group <span className="text-red-500">*</span></label>
                      <SearchableSelect required={activeStage === 1} options={groups} value={formData.issuer_group_id} onValueChange={v => handleChange('issuer_group_id', v)} placeholder="Select Permit Issuer Group..." className="bg-white shadow-none border-slate-200 rounded-none h-8 text-xs" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Electrical Group <span className="text-red-500">*</span></label>
                      <SearchableSelect required={activeStage === 1} options={groups} value={formData.target_electrical_group_id} onValueChange={v => handleChange('target_electrical_group_id', v)} placeholder="Select Electrical Group..." className="bg-white shadow-none border-slate-200 rounded-none h-8 text-xs" />
                    </div>
                  </div>
                </div>

                <div className="mt-6 border border-slate-200 overflow-hidden bg-white">
                  <button 
                    type="button"
                    onClick={() => setIsExtensionExpanded(!isExtensionExpanded)}
                    className="w-full flex items-center justify-between text-left group p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest group-hover:text-blue-600 transition-colors">
                      PERMIT EXTENSION
                    </h3>
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border border-slate-300 text-slate-500 group-hover:text-blue-600 group-hover:border-blue-300 transition-colors bg-white">
                      {isExtensionExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>
                  
                  {isExtensionExpanded && (
                    <div className="p-6 border-t border-slate-200 bg-slate-50/50 animate-in fade-in slide-in-from-top-2 duration-300 relative z-10">
                      <PermitExtension />
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>
          )}

          {/* STAGE 2: ELECTRICAL DEPT */}
          {visibleStages.some(s => s.id === 2) && (
            <Card className={`relative mt-6 border border-slate-200 shadow-none rounded-none overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white`}>
              {(activeStage !== 2 || isViewMode) && <div className="absolute inset-0 z-50 bg-slate-50/40 cursor-not-allowed" title="This stage is locked and read-only" />}
              <div className={`${STAGES[1].color} h-1 w-full`}></div>
              <CardHeader className="bg-white border-b border-slate-100 py-4">
                <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <span className={`h-5 w-5 rounded-none ${STAGES[1].color} text-white flex items-center justify-center text-[10px]`}>2</span>
                  Measure Taken by the Electrical Dept
                </CardTitle>
                <CardDescription className="text-xs">Electrical isolation and LOTO verification by the Electrical Supervisor.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                
                <div className="flex flex-col gap-2 mb-6">
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Safety Checklist</label>
                  </div>
                  
                  <div className="border border-slate-200 rounded-none bg-white shadow-none">
                    <div className="bg-slate-50/80 p-3 border-b border-slate-200">
                      <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Measures Taken By Electrical Department</h3>
                    </div>
                    <div className="flex flex-col divide-y divide-slate-200">
                      {electricalChecklist.map((item, idx) => (
                        <div key={idx} className="flex items-stretch hover:bg-slate-50/30 transition-colors group">
                          <div className="w-14 shrink-0 flex items-center justify-center border-r border-slate-200">
                            <span className="text-[11px] font-semibold text-slate-400">{idx + 1}</span>
                          </div>
                          
                          <div className="flex-1 flex items-center">
                            <Input 
                              value={item.question} 
                              onChange={(e) => handleElectricalQuestionUpdate(idx, e.target.value)}
                              placeholder="Enter question..." 
                              className="h-10 text-[11px] text-slate-600 font-medium bg-transparent shadow-none border-transparent focus-visible:ring-0 focus-visible:border-transparent rounded-none px-4" 
                            />
                          </div>
                          
                          <div className="shrink-0 flex items-center px-4 border-l border-slate-200">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-1.5">
                                <Checkbox id={`q${idx}-yes`} checked={item.answer === 'yes'} onCheckedChange={() => handleElectricalAnswerUpdate(idx, 'yes')} className="shadow-none h-3.5 w-3.5 border-slate-300 data-[state=checked]:bg-slate-700 data-[state=checked]:border-slate-700 rounded-[2px]" />
                                <label htmlFor={`q${idx}-yes`} className="text-[10px] font-bold text-slate-400 cursor-pointer">Y</label>
                              </div>
                              <div className="flex items-center space-x-1.5">
                                <Checkbox id={`q${idx}-no`} checked={item.answer === 'no'} onCheckedChange={() => handleElectricalAnswerUpdate(idx, 'no')} className="shadow-none h-3.5 w-3.5 border-slate-300 data-[state=checked]:bg-slate-700 data-[state=checked]:border-slate-700 rounded-[2px]" />
                                <label htmlFor={`q${idx}-no`} className="text-[10px] font-bold text-slate-400 cursor-pointer">N</label>
                              </div>
                              <div className="flex items-center space-x-1.5">
                                <Checkbox id={`q${idx}-na`} checked={item.answer === 'na'} onCheckedChange={() => handleElectricalAnswerUpdate(idx, 'na')} className="shadow-none h-3.5 w-3.5 border-slate-300 data-[state=checked]:bg-slate-700 data-[state=checked]:border-slate-700 rounded-[2px]" />
                                <label htmlFor={`q${idx}-na`} className="text-[10px] font-bold text-slate-400 cursor-pointer">NA</label>
                              </div>
                            </div>
                          </div>
                          
                          <div className="w-12 shrink-0 flex items-center justify-center border-l border-slate-200">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeElectricalQuestion(idx)} className="text-slate-300 hover:text-red-500 hover:bg-transparent h-8 w-8 shadow-none rounded-none">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end mt-1">
                    <Button type="button" variant="outline" size="sm" onClick={addElectricalQuestion} className="h-7 text-[10px] text-blue-600 border-blue-200 hover:bg-blue-50 shadow-none uppercase font-bold tracking-wider">
                      <Plus className="h-3 w-3 mr-1" /> Add Row
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-6 border-t border-slate-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">LOTO Ref. Equipment I</label>
                    <Select value={formData.loto_equipment_1_id} onValueChange={v => handleChange('loto_equipment_1_id', v)}>
                      <SelectTrigger className="w-full bg-white shadow-none border-slate-200 rounded-none h-8 text-xs"><SelectValue placeholder="Select machine/equipment..." /></SelectTrigger>
                      <SelectContent rounded-none>
                        <SelectItem value="a">Main Panel Board A</SelectItem>
                        <SelectItem value="b">Transformer TX-01</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">LOTO Ref. Equipment II (Optional)</label>
                    <Select value={formData.loto_equipment_2_id} onValueChange={v => handleChange('loto_equipment_2_id', v)}>
                      <SelectTrigger className="w-full bg-white shadow-none border-slate-200 rounded-none h-8 text-xs"><SelectValue placeholder="Select machine/equipment..." /></SelectTrigger>
                      <SelectContent rounded-none>
                        <SelectItem value="a">Main Panel Board A</SelectItem>
                        <SelectItem value="b">Transformer TX-01</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-6 mt-8 border-t border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Electrical Group <span className="text-red-500">*</span></label>
                      <SearchableSelect required={activeStage === 2} options={groups} value={formData.target_electrical_group_id} onValueChange={v => handleChange('target_electrical_group_id', v)} placeholder="Select Supervisor..." className="bg-white shadow-none border-slate-200 rounded-none h-8 text-xs" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Acceptor Group <span className="text-red-500">*</span></label>
                      <SearchableSelect required={activeStage === 2} options={groups} value={formData.target_acceptor_group_id} onValueChange={v => handleChange('target_acceptor_group_id', v)} placeholder="Select Acceptor Group" className="bg-white shadow-none border-slate-200 rounded-none h-8 text-xs" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STAGE 3: ACCEPTOR */}
          {visibleStages.some(s => s.id === 3) && (
            <Card className={`relative mt-6 border border-slate-200 shadow-none rounded-none overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white`}>
              {(activeStage !== 3 || isViewMode) && <div className="absolute inset-0 z-50 bg-slate-50/40 cursor-not-allowed" title="This stage is locked and read-only" />}
              <div className={`${STAGES[2].color} h-1 w-full`}></div>
              <CardHeader className="bg-white border-b border-slate-100 py-4">
                <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <span className={`h-5 w-5 rounded-none ${STAGES[2].color} text-white flex items-center justify-center text-[10px]`}>3</span>
                  Measure Taken by Acceptor
                </CardTitle>
                <CardDescription className="text-xs">Gas testing verification and final acceptance by the site supervisor.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                
                <div className="flex flex-col gap-2 mb-6">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Measures Taken By Acceptor</label>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border border-slate-200 p-4 bg-slate-50/50">
                    {SAFETY_ACCEPTOR.map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-3">
                        <Checkbox id={`acceptor-${idx}`} checked={formData.acceptor_safety.includes(item)} onCheckedChange={() => toggleArrayItem('acceptor_safety', item)} className="shadow-none border-slate-300 bg-white" />
                        <label htmlFor={`acceptor-${idx}`} className="text-xs font-medium text-slate-700 cursor-pointer">{item}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 mb-6">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Gas Testing Details</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 pt-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Person Name</label>
                      <Input value={formData.gas_tester_name} onChange={e => handleChange('gas_tester_name', e.target.value)} placeholder="Enter full name" className="h-8 text-xs bg-white shadow-none border-slate-200 rounded-none" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-end mb-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">% O2 Level</label>
                        <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Range: (19.5% to 23.5%)</span>
                      </div>
                      <div className="relative">
                        <Input value={formData.gas_o2_level} onChange={e => handleChange('gas_o2_level', e.target.value)} type="number" min="19.5" max="23.5" step="0.1" placeholder="e.g. 20.9" className="h-8 text-xs bg-white shadow-none border-slate-200 rounded-none pr-8" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">%</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Time</label>
                      <Input type="datetime-local" disabled value={formData.gas_test_time || new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} className="h-8 text-xs bg-slate-50 border-slate-200 rounded-none text-slate-500 shadow-none cursor-not-allowed" />
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-8 border-t border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Permit Acceptor Group <span className="text-red-500">*</span></label>
                      <SearchableSelect required={activeStage === 3} options={groups} value={formData.target_acceptor_group_id} onValueChange={v => handleChange('target_acceptor_group_id', v)} placeholder="Select Acceptor..." className="bg-white shadow-none border-slate-200 rounded-none h-8 text-xs" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Permit Approver <span className="text-red-500">*</span></label>
                      <SearchableSelect required={activeStage === 3} options={users.filter(u => u.tags.includes("PERMIT_APPROVER"))} value={formData.target_approver_id} onValueChange={v => handleChange('target_approver_id', v)} placeholder="Select Approver..." className="bg-white shadow-none border-slate-200 rounded-none h-8 text-xs" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STAGE 4: APPROVAL */}
          {visibleStages.some(s => s.id === 4) && (
            <Card className={`relative mt-6 border border-slate-200 shadow-none rounded-none overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white`}>
              {(activeStage !== 4 || isViewMode) && <div className="absolute inset-0 z-50 bg-slate-50/40 cursor-not-allowed" title="This stage is locked and read-only" />}
              <div className={`${STAGES[3].color} h-1 w-full`}></div>
              <CardHeader className="bg-white border-b border-slate-100 py-4">
                <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <span className={`h-5 w-5 rounded-none ${STAGES[3].color} text-white flex items-center justify-center text-[10px]`}>4</span>
                  Permit Review & Approval
                </CardTitle>
                <CardDescription className="text-xs">Final authorization by the designated Permit Approver.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-start gap-3 p-4 border border-slate-200 bg-white mb-6">
                  <Checkbox 
                    id="approver-declaration" 
                    checked={isApproverDeclared}
                    onCheckedChange={setIsApproverDeclared}
                    className="mt-0.5 shadow-none border-slate-300 bg-white shrink-0" 
                  />
                  <label htmlFor="approver-declaration" className="text-[10px] text-slate-500 leading-relaxed cursor-pointer font-medium">
                    <span className="text-red-500 font-bold mr-1">*</span>I confirm that I have reviewed the hazard assessments, safety measures, and LOTO isolations documented in the preceding stages. I am satisfied that the work can proceed safely under the stated conditions.
                  </label>
                </div>
                
                <div className="flex flex-col gap-2 mb-6">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Approver Comments (Optional)</label>
                  <Textarea value={formData.approver_comments} onChange={e => handleChange('approver_comments', e.target.value)} placeholder="Add any specific conditions or remarks..." className="bg-white shadow-none border-slate-200 rounded-none min-h-[80px] resize-y text-xs" />
                </div>

                <div className="pt-6 mt-8 border-t border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Safety Officer <span className="text-red-500">*</span></label>
                      <SearchableSelect required={activeStage === 4} options={users.filter(u => u.tags.includes("SAFETY_OFFICER"))} value={formData.target_safety_id} onValueChange={v => handleChange('target_safety_id', v)} placeholder="Select Safety Officer..." className="bg-white shadow-none border-slate-200 rounded-none h-8 text-xs" />
                    </div>
                    <div className="space-y-2 border-l border-slate-100 pl-8">
                      <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Forward Permit Approver (If Required)</label>
                      <SearchableSelect options={users.filter(u => u.tags.includes("PERMIT_APPROVER"))} value={formData.forward_to_user_id} onValueChange={v => handleChange('forward_to_user_id', v)} placeholder="Select User To Forward This Permit..." className="bg-blue-50/50 shadow-none border-blue-200 rounded-none h-8 text-xs" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STAGE 5: SAFETY */}
          {visibleStages.some(s => s.id === 5) && (
            <Card className={`relative mt-6 border border-slate-200 shadow-none rounded-none overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white`}>
              {(activeStage !== 5 || isViewMode) && <div className="absolute inset-0 z-50 bg-slate-50/40 cursor-not-allowed" title="This stage is locked and read-only" />}
              <div className={`${STAGES[4].color} h-1 w-full`}></div>
              <CardHeader className="bg-white border-b border-slate-100 py-4">
                <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <span className={`h-5 w-5 rounded-none ${STAGES[4].color} text-white flex items-center justify-center text-[10px]`}>5</span>
                  Safety Officer Final Sign-off
                </CardTitle>
                <CardDescription className="text-xs">Mandatory safety clearance before work commences.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col gap-2 mb-6">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Any other safety precautions recommended?</label>
                  <Textarea value={formData.safety_recommendations} onChange={e => handleChange('safety_recommendations', e.target.value)} placeholder="Type manual recommendations here..." className="bg-slate-50/50 shadow-none border-slate-200 rounded-none min-h-[100px] resize-y [field-sizing:fixed]" />
                </div>
                
                <div className="flex items-start gap-3 p-4 border border-slate-200 bg-white mb-6">
                  <Checkbox 
                    id="safety-declaration" 
                    checked={isSafetyDeclared}
                    onCheckedChange={setIsSafetyDeclared}
                    className="mt-0.5 shadow-none border-slate-300 bg-white shrink-0" 
                  />
                  <label htmlFor="safety-declaration" className="text-[10px] text-slate-500 leading-relaxed cursor-pointer font-medium">
                    <span className="text-red-500 font-bold mr-1">*</span>Inspected & checked all necessary precautions, Isolation and compliance of condition stipulated in work permit & found to my satisfaction.
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

        {/* Action Footer */}
        {!isViewMode && canSubmitCurrentStage() && (
          <div className="flex items-center justify-end p-4 bg-white border border-slate-200 rounded-none shadow-none">
            <div className="flex gap-3">
              {activeStage === 4 && (
                <Button 
                  type="button"
                  variant="outline" 
                  disabled={loading || !formData.forward_to_user_id}
                  onClick={async () => {
                    try {
                      setLoading(true)
                      const payload = { ...formData, action: "FORWARD" }
                      await WorkPermitService.approvePermit(id, payload)
                      toast.success("Permit Forwarded Successfully")
                      setView("list")
                      navigate('/work-permit')
                    } catch (error) {
                      toast.error(error?.response?.data?.message || "Failed to forward permit")
                    } finally {
                      setLoading(false)
                    }
                  }}
                  className="bg-white hover:bg-slate-50 text-blue-600 border-blue-200 disabled:opacity-50"
                >
                  Forward Permit
                </Button>
              )}
              
              <Button 
                type="submit"
                disabled={loading || (activeStage === 4 && !isApproverDeclared) || (activeStage === 5 && !isSafetyDeclared)}
                className={`${STAGES[activeStage-1].color} hover:brightness-110 text-white font-semibold px-6 shadow-none transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer`}
              >
                {loading ? "Processing..." : (activeStage === 5 ? "Issue Final Permit ✓" : activeStage === 4 ? "Approve Permit ✓" : "Submit & Continue")}
                {!loading && activeStage < 4 && <ArrowRight className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          </div>
        )}
        </form>
      </div>
      )}
    </PageContainer>
  )
}
