import React, { useState, useEffect  } from "react"
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
import { Flame, Info, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, ShieldCheck, Wrench, FileSignature, CheckSquare, ChevronDown, ChevronUp, Trash2, CalendarClock, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PermitExtension } from "./permit_extension"

/* =======================================================================================
   BUSINESS LOGIC REQUIREMENT (CLIENT SPECIFIED WORKFLOW): 
   The Permit issuer, acceptor, approver & HOD must take the sign of the safety Department 
   only after approval.
   Ensure backend constraints strictly enforce that Stage 5 (Safety) can ONLY be executed 
   AFTER Stage 4 (Approval) is fully complete. 
======================================================================================= */

const STAGES = [
  { id: 1, title: "Initiation", desc: "Production/Maintenance", icon: Wrench, color: "bg-blue-500", text: "text-blue-600", bgLight: "bg-blue-500/10", border: "border-blue-500/30" },
  { id: 2, title: "Electrical", desc: "Electrical Supervisor", icon: AlertTriangle, color: "bg-blue-500", text: "text-blue-600", bgLight: "bg-blue-500/10", border: "border-blue-500/30" },
  { id: 3, title: "Acceptance", desc: "Gas Testing & Acceptor", icon: CheckSquare, color: "bg-blue-500", text: "text-blue-600", bgLight: "bg-blue-500/10", border: "border-blue-500/30" },
  { id: 4, title: "Approval", desc: "Permit Approver", icon: FileSignature, color: "bg-blue-500", text: "text-blue-600", bgLight: "bg-blue-500/10", border: "border-blue-500/30" },
  { id: 5, title: "Safety", desc: "Safety Officer", icon: ShieldCheck, color: "bg-blue-500", text: "text-blue-600", bgLight: "bg-blue-500/10", border: "border-blue-500/30" }
]

const JOBS = ["Confined Space entry", "Working at Height", "Hot work"]
const ELECTRICAL_QUESTIONS = [
  "Are all electrical sources isolated?",
  "Is the area free from flammable gases/vapors?",
  "Are appropriate fire extinguishers available?",
  "Is ventilation adequate?",
  "Are all workers wearing proper PPE?"
]

export default function CreateWorkPermit() {
  const [activeStage, setActiveStage] = useState(1)
  const [isExtensionExpanded, setIsExtensionExpanded] = useState(false)
  const [keyPersons, setKeyPersons] = useState(Array.from({ length: 3 }, () => ({ name: "", designation: "" })))
  const [isApproverDeclared, setIsApproverDeclared] = useState(false)
  const [isSafetyDeclared, setIsSafetyDeclared] = useState(false)

  // Auto-expand permit extension when in read-only/approval stages
  useEffect(() => {
    if (activeStage > 1) {
      setIsExtensionExpanded(true)
    }
  }, [activeStage])

  const addKeyPerson = () => setKeyPersons([...keyPersons, { name: "", designation: "" }])
  const removeKeyPerson = (index) => setKeyPersons(keyPersons.filter((_, i) => i !== index))
  const handleKeyPersonUpdate = (index, field, value) => {
    const updated = [...keyPersons];
    updated[index][field] = value;
    setKeyPersons(updated);
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-4 pt-2 pb-6 w-full">
        <div className="flex items-center justify-end shrink-0">
          <Button variant="outline" onClick={() => window.history.back()} className="shadow-none h-9 text-slate-700 border-slate-200 bg-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to List
          </Button>
        </div>

        {/* Stepper Timeline */}
        <Card className="shadow-none rounded-none border border-slate-200 bg-white">
          <CardContent className="p-6">
            <div className="relative flex justify-between">
              <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-100 -translate-y-1/2 z-0"></div>
              {STAGES.map((stage) => {
                const isActive = stage.id === activeStage
                const isPast = stage.id < activeStage
                const Icon = stage.icon
                return (
                  <div key={stage.id} className="relative z-10 flex flex-col items-center gap-2 bg-white px-2 cursor-pointer" onClick={() => setActiveStage(stage.id)}>
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isActive ? `${stage.color} text-white shadow-lg shadow-${stage.color.split('-')[1]}-500/40 border-transparent` : isPast ? 'bg-slate-800 text-white border-transparent' : 'bg-white border-slate-200 text-slate-400'}`}>
                      {isPast ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <div className="text-center">
                      <p className={`text-xs font-bold uppercase tracking-wider ${isActive ? stage.text : 'text-slate-500'}`}>{stage.title}</p>
                      <p className="text-[10px] text-muted-foreground">{stage.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Form Stages Container */}
        <div className="space-y-6">

          {/* STAGE 1: INITIATION */}
          {activeStage >= 1 && (
            <Card className={`relative border border-slate-200 shadow-none rounded-none overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white`}>
              {activeStage !== 1 && <div className="absolute inset-0 z-50 bg-slate-50/40 cursor-not-allowed" title="Not Editable" />}
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
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Issuer Dept.</label>
                      <Input value="Production" disabled className="h-8 text-xs bg-slate-50 border-slate-200 rounded-none text-slate-500 shadow-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Location <span className="text-red-500">*</span></label>
                      <Input placeholder="Enter location" className="h-8 text-xs bg-white shadow-none border-slate-200 rounded-none" />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Accepter <span className="text-red-500">*</span></label>
                      <Input placeholder="Enter location" className="h-8 text-xs bg-white shadow-none border-slate-200 rounded-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Job No. <span className="text-red-500">*</span></label>
                      <Input placeholder="Enter Job No." className="h-8 text-xs bg-white shadow-none border-slate-200 rounded-none" />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description of Job <span className="text-red-500">*</span></label>
                      <Textarea placeholder="Enter detailed description of the job..." className="bg-white shadow-none border-slate-200 rounded-none min-h-[60px] resize-y text-xs" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Name of the Contractor</label>
                      <Input placeholder="Enter contractor name" className="h-8 text-xs bg-white shadow-none border-slate-200 rounded-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">No. of Persons Engaged</label>
                      <Input value={keyPersons.length} disabled className="h-8 text-xs bg-slate-50 border-slate-200 rounded-none text-slate-500 shadow-none" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Name of Contractor Supervisor</label>
                      <Input placeholder="Enter supervisor name" className="h-8 text-xs bg-white shadow-none border-slate-200 rounded-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sign. of the Contractor Supervisor</label>
                      <div className="h-8 flex items-center px-3 border border-slate-200 bg-slate-50 text-[10px] text-slate-400 uppercase tracking-wider rounded-none">
                        Auto-captured on approval
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valid Date From</label>
                      <Input type="datetime-local" disabled value={new Date().toISOString().slice(0, 16)} className="h-8 text-xs bg-slate-50 border-slate-200 rounded-none text-slate-500 shadow-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valid To</label>
                      <Input type="datetime-local" className="h-8 text-xs bg-white shadow-none border-slate-200 rounded-none" />
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
                          <Checkbox id={`job-${job}`} className="shadow-none border-slate-300 rounded-none h-4 w-4" />
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
                    {/* General Checks */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Surrounding Area Checked</label>
                        <Select defaultValue="no">
                          <SelectTrigger className="w-full bg-white shadow-none border-slate-200 rounded-none h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent rounded-none>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cleaned</label>
                        <Select defaultValue="no">
                          <SelectTrigger className="w-full bg-white shadow-none border-slate-200 rounded-none h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent rounded-none>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Change Control Applicable</label>
                        <Select defaultValue="no">
                          <SelectTrigger className="w-full bg-white shadow-none border-slate-200 rounded-none h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent rounded-none>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Isolation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mechanical Isolation</label>
                        <Select defaultValue="not_required">
                          <SelectTrigger className="w-full bg-white shadow-none border-slate-200 rounded-none h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent rounded-none>
                            <SelectItem value="required">Required</SelectItem>
                            <SelectItem value="not_required">Not Required</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Electrical Isolation</label>
                        <Select defaultValue="not_required">
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
                        {[
                          "Isolated", "Area Cordoned", "Drained", 
                          "Ventilation", "Railing", "PPE's Identified", 
                          "Caution board", "Contractor Supervisor Standby", "Electrical Connection check"
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center space-x-3">
                            <Checkbox id={`safety-${idx}`} className="shadow-none border-slate-300 bg-white" />
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
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Permit Issuer <span className="text-red-500">*</span></label>
                      <SearchableSelect options={[]} placeholder="Select Permit Issuer..." className="bg-white shadow-none border-slate-200 rounded-none h-8 text-xs" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Electrical Group <span className="text-red-500">*</span></label>
                      <SearchableSelect options={[]} placeholder="Select Electrical Group..." className="bg-white shadow-none border-slate-200 rounded-none h-8 text-xs" />
                    </div>
                  </div>
                </div>

                {/* PERMIT EXTENSION (Inside Stage 1) */}
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
          {activeStage >= 2 && (
            <Card className={`relative mt-6 border border-slate-200 shadow-none rounded-none overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white`}>
              {activeStage !== 2 && <div className="absolute inset-0 z-50 bg-slate-50/40 cursor-not-allowed" title="This stage is locked and read-only" />}
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
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Safety Checklist</label>
                  <div className="border border-slate-200 rounded-none overflow-hidden bg-white shadow-none divide-y divide-slate-100">
                    {ELECTRICAL_QUESTIONS.map((q, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50/50 transition-colors">
                        <span className="text-xs font-semibold text-slate-700 tracking-wide">{idx + 1}. {q}</span>
                        <div className="flex space-x-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox id={`q${idx}-yes`} className="shadow-none data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-slate-300" />
                            <label htmlFor={`q${idx}-yes`} className="text-[10px] uppercase font-bold tracking-wider cursor-pointer text-slate-600">Yes</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id={`q${idx}-no`} className="shadow-none data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500 border-slate-300" />
                            <label htmlFor={`q${idx}-no`} className="text-[10px] uppercase font-bold tracking-wider cursor-pointer text-slate-600">No</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id={`q${idx}-na`} className="shadow-none data-[state=checked]:bg-slate-500 data-[state=checked]:border-slate-500 border-slate-300" />
                            <label htmlFor={`q${idx}-na`} className="text-[10px] uppercase font-bold tracking-wider cursor-pointer text-slate-400">N/A</label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-6 border-t border-slate-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">LOTO Ref. Equipment I</label>
                    <Select>
                      <SelectTrigger className="w-full bg-white shadow-none border-slate-200 rounded-none h-8 text-xs"><SelectValue placeholder="Select machine/equipment..." /></SelectTrigger>
                      <SelectContent rounded-none>
                        <SelectItem value="a">Main Panel Board A</SelectItem>
                        <SelectItem value="b">Transformer TX-01</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">LOTO Ref. Equipment II (Optional)</label>
                    <Select>
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
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Electrical Supervisor <span className="text-red-500">*</span></label>
                      <SearchableSelect options={[]} placeholder="Select Supervisor..." className="bg-white shadow-none border-slate-200 rounded-none h-8 text-xs" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Production Group/Maintenance Group <span className="text-red-500">*</span></label>
                      <Select defaultValue="initiator">
                        <SelectTrigger className="w-full bg-slate-50/50 shadow-none border-slate-200 rounded-none h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent rounded-none>
                          <SelectItem value="initiator">Back to Initiator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STAGE 3: ACCEPTOR */}
          {activeStage >= 3 && (
            <Card className={`relative mt-6 border border-slate-200 shadow-none rounded-none overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white`}>
              {activeStage !== 3 && <div className="absolute inset-0 z-50 bg-slate-50/40 cursor-not-allowed" title="This stage is locked and read-only" />}
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
                    {[
                      "Lighting", "Earthing", "Hand gloves", "Overall suits/apron",
                      "Ventilation", "Safety Helmet", "Full Body Harness/ Safety Belt", "Fall Arrestor",
                      "Area cordoned", "Face shield/Goggles", "Safety shoes/Gum Boot", "Safety Talk",
                      "Caution board", "Ear Plug/ Muff", "Respirators", "Others"
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-3">
                        <Checkbox id={`acceptor-${idx}`} className="shadow-none border-slate-300 bg-white" />
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
                      <Input placeholder="Enter full name" className="h-8 text-xs bg-white shadow-none border-slate-200 rounded-none" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-end mb-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">% O2 Level</label>
                        <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Range: (19.5% to 23.5%)</span>
                      </div>
                      <div className="relative">
                        <Input type="number" step="0.1" placeholder="e.g. 20.9" className="h-8 text-xs bg-white shadow-none border-slate-200 rounded-none pr-8" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">%</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Time</label>
                      <Input type="datetime-local" disabled value={new Date().toISOString().slice(0, 16)} className="h-8 text-xs bg-slate-50 border-slate-200 rounded-none text-slate-500 shadow-none cursor-not-allowed" />
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-8 border-t border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Permit Acceptor <span className="text-red-500">*</span></label>
                      <SearchableSelect options={[]} placeholder="Select Acceptor..." className="bg-white shadow-none border-slate-200 rounded-none h-8 text-xs" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Permit Approver <span className="text-red-500">*</span></label>
                      <SearchableSelect options={[]} placeholder="Select Approver..." className="bg-white shadow-none border-slate-200 rounded-none h-8 text-xs" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STAGE 4: APPROVAL */}
          {activeStage >= 4 && (
            <Card className={`relative mt-6 border border-slate-200 shadow-none rounded-none overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white`}>
              {activeStage !== 4 && <div className="absolute inset-0 z-50 bg-slate-50/40 cursor-not-allowed" title="This stage is locked and read-only" />}
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
                  <Textarea placeholder="Add any specific conditions or remarks..." className="bg-white shadow-none border-slate-200 rounded-none min-h-[80px] resize-y text-xs" />
                </div>

                <div className="pt-6 mt-8 border-t border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Permit Approver <span className="text-red-500">*</span></label>
                      <SearchableSelect options={[]} placeholder="Select Approver..." className="bg-white shadow-none border-slate-200 rounded-none h-8 text-xs" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Safety Officer <span className="text-red-500">*</span></label>
                      <SearchableSelect options={[]} placeholder="Select Safety Officer..." className="bg-white shadow-none border-slate-200 rounded-none h-8 text-xs" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STAGE 5: SAFETY */}
          {activeStage >= 5 && (
            <Card className={`relative mt-6 border border-slate-200 shadow-none rounded-none overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white`}>
              {activeStage !== 5 && <div className="absolute inset-0 z-50 bg-slate-50/40 cursor-not-allowed" title="This stage is locked and read-only" />}
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
                  <Textarea placeholder="Type manual recommendations here..." className="bg-slate-50/50 shadow-none border-slate-200 rounded-none min-h-[100px] resize-y [field-sizing:fixed]" />
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

        </div>

        {/* Action Footer (Non-Sticky) */}
        <div className="flex items-center justify-end p-4 bg-white border border-slate-200 rounded-none shadow-none">
          <div className="flex gap-3">
            {activeStage === 4 && (
              <Button variant="outline" className="bg-white hover:bg-slate-50">
                Forward Permit
              </Button>
            )}
            
            <Button 
              disabled={(activeStage === 4 && !isApproverDeclared) || (activeStage === 5 && !isSafetyDeclared)}
              className={`${STAGES[activeStage-1].color} hover:brightness-110 text-white font-semibold px-6 shadow-none transition-all disabled:opacity-50 disabled:pointer-events-none`}
            >
              {activeStage === 5 ? "Issue Final Permit ✓" : activeStage === 4 ? "Approve Permit ✓" : "Submit & Continue"}
              {activeStage < 4 && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
