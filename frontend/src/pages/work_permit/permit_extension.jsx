import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { SearchableSelect } from "@/components/shared/SearchableSelect"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

const CONFINED_SPACE_CHECKLIST = [
  "Persons engaged are trained.",
  "Working area is made safe including access to the work place.",
  "The vessel/confined space is free from toxic & Flammable material & Cooled (< 45oC).",
  "At least one attendant is provided outside the permitted confined space during job.",
  "Cross Ventilation to be kept on by keeping two manholes / nozzles/ bottom valve open.",
  "Rescue procedure can be followed in the event of an emergency."
]

const WORK_AT_HEIGHT_CHECKLIST = [
  "Persons engaged are trained.",
  "Open vertical drops are identified & properly guarded.",
  "Safety Net provided.",
  "Surrounding area is properly cleaned and made free from presence of any flammables.",
  "The Scaffolding/ platform/ proper approach for Working at height provided.",
  "Life line provided for anchoring safety belt.",
  "Safety ladder Provided (Ladder only to be used for light work for short duration).",
  "Advance hard wares are used for roof top & super height work (> 7 Mtrs.).",
  "Hydraulic /Mechanical platform is inspected thoroughly.",
  "Rope Grab / Crawling board / Roof FP system available.",
  "Drums are not used as approach/ platform.",
  "Cordoning off the area during the process."
]

const HOT_WORK_CHECKLIST = [
  "Persons engaged are trained.",
  "Welding / cutting goggles & Leather hand gloves provided.",
  "24 Volt supply hand lamp provided.",
  "Flash Back Arrestor attached.",
  "Sewers / vents near workplaces are free from any flammable liquid/gas.",
  "Fire watcher is assigned during & till 60 minutes after the job completion.",
  "Good house - keeping ensured.",
  "All necessary arrangements are made so that welding / cutting spark falls in the safe zone.",
  "Water hose/ fire extinguisher available nearby.",
  "Cutting/ welding equipment are in good condition.",
  "Flammable gas cylinders are kept at ground only and properly chained.",
  "All required Tools/ Tackles / PPE's are checked."
]

// Reusable Checklist Table Component
const ChecklistTable = ({ items }) => (
  <div className="border border-slate-200">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[70%] border-r border-slate-200">Precaution Checklist Item</th>
          <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Status (Yes / No / NA)</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => (
          <tr key={idx} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
            <td className="px-4 py-3 text-xs font-medium text-slate-700 border-r border-slate-200">{item}</td>
            <td className="px-4 py-3">
              <div className="flex items-center justify-center gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox id={`yes-${item.substring(0,5)}-${idx}`} className="shadow-none border-slate-300 bg-white data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 rounded-none h-4 w-4" />
                  <Label htmlFor={`yes-${item.substring(0,5)}-${idx}`} className="text-[10px] font-bold text-slate-600 cursor-pointer">Y</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id={`no-${item.substring(0,5)}-${idx}`} className="shadow-none border-slate-300 bg-white data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 rounded-none h-4 w-4" />
                  <Label htmlFor={`no-${item.substring(0,5)}-${idx}`} className="text-[10px] font-bold text-slate-600 cursor-pointer">N</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id={`na-${item.substring(0,5)}-${idx}`} className="shadow-none border-slate-300 bg-white data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 rounded-none h-4 w-4" />
                  <Label htmlFor={`na-${item.substring(0,5)}-${idx}`} className="text-[10px] font-bold text-slate-600 cursor-pointer">NA</Label>
                </div>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export function PermitExtension() {
  const [extensionRows, setExtensionRows] = useState([1, 2, 3, 4]);

  return (
    <div className="grid grid-cols-1 gap-10">
      
      {/* SECTION 1: PERMIT EXTENSION APPROVAL GRID */}
      <div>
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">
          Permit Extension & Approvals
        </h3>
        <div className="border border-slate-200 overflow-x-auto bg-white">
          <table className="w-full table-fixed text-left border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 divide-x divide-slate-200 text-center font-bold text-slate-800 uppercase">
                <th rowSpan={2} className="p-2 align-middle w-32">Date</th>
                <th colSpan={3} className="p-2 border-b border-slate-200">Time</th>
                <th colSpan={3} className="p-2 border-b border-slate-200">Shop Floor In charge</th>
                <th colSpan={3} className="p-2 border-b border-slate-200">Normal Approval<br/>8:30 AM to 5:00 PM</th>
                <th colSpan={3} className="p-2 border-b border-slate-200">Extension Approval</th>
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200 divide-x divide-slate-200 text-center font-bold text-slate-700 uppercase">
                {/* Time */}
                <th className="p-2 w-16">Start</th>
                <th className="p-2 w-16">End</th>
                <th className="p-2 w-16">Ext.</th>
                {/* Shop Floor In charge */}
                <th className="p-2 w-16">GIA</th>
                <th className="p-2 w-16">B</th>
                <th className="p-2 w-16">C</th>
                {/* Normal Approval */}
                <th className="p-2 w-20">Acceptor</th>
                <th className="p-2 w-20">HOD</th>
                <th className="p-2 w-20">Safety</th>
                {/* Extension Approval */}
                <th className="p-2 w-20">Acceptor</th>
                <th className="p-2 w-20">HOD</th>
                <th className="p-2 w-20">Safety</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {extensionRows.map((row, idx) => (
                <tr key={idx} className="divide-x divide-slate-200 h-8 hover:bg-slate-50 transition-colors">
                  <td className="p-0"><Input type="date" className="h-8 text-[10px] px-2 rounded-none shadow-none border-none bg-transparent w-full focus-visible:ring-0" /></td>
                  <td className="p-0"><Input type="time" className="h-8 text-[10px] px-1 rounded-none shadow-none border-none bg-transparent w-full focus-visible:ring-0 text-center" /></td>
                  <td className="p-0"><Input type="time" className="h-8 text-[10px] px-1 rounded-none shadow-none border-none bg-transparent w-full focus-visible:ring-0 text-center" /></td>
                  <td className="p-0"><Input type="time" className="h-8 text-[10px] px-1 rounded-none shadow-none border-none bg-transparent w-full focus-visible:ring-0 text-center" /></td>
                  <td className="p-0"><Input type="text" placeholder="Sign" className="h-8 text-[10px] px-2 rounded-none shadow-none border-none bg-transparent w-full focus-visible:ring-0 text-center" /></td>
                  <td className="p-0"><Input type="text" placeholder="Sign" className="h-8 text-[10px] px-2 rounded-none shadow-none border-none bg-transparent w-full focus-visible:ring-0 text-center" /></td>
                  <td className="p-0"><Input type="text" placeholder="Sign" className="h-8 text-[10px] px-2 rounded-none shadow-none border-none bg-transparent w-full focus-visible:ring-0 text-center" /></td>
                  <td className="p-0"><Input type="text" placeholder="Sign" className="h-8 text-[10px] px-2 rounded-none shadow-none border-none bg-transparent w-full focus-visible:ring-0 text-center" /></td>
                  <td className="p-0"><Input type="text" placeholder="Sign" className="h-8 text-[10px] px-2 rounded-none shadow-none border-none bg-transparent w-full focus-visible:ring-0 text-center" /></td>
                  <td className="p-0"><Input type="text" placeholder="Sign" className="h-8 text-[10px] px-2 rounded-none shadow-none border-none bg-transparent w-full focus-visible:ring-0 text-center" /></td>
                  <td className="p-0"><Input type="text" placeholder="Sign" className="h-8 text-[10px] px-2 rounded-none shadow-none border-none bg-transparent w-full focus-visible:ring-0 text-center" /></td>
                  <td className="p-0"><Input type="text" placeholder="Sign" className="h-8 text-[10px] px-2 rounded-none shadow-none border-none bg-transparent w-full focus-visible:ring-0 text-center" /></td>
                  <td className="p-0"><Input type="text" placeholder="Sign" className="h-8 text-[10px] px-2 rounded-none shadow-none border-none bg-transparent w-full focus-visible:ring-0 text-center" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setExtensionRows([...extensionRows, extensionRows.length + 1])}
            className="h-7 text-[10px] rounded-none border-slate-200 shadow-none uppercase tracking-wider font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
          >
            <Plus className="w-3 h-3 mr-1 stroke-[3]" /> Add Row
          </Button>
        </div>
      </div>

      {/* SECTION 2: CONFINED SPACE ENTRY */}
      <div>
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">
          Confined Space Entry Checklist
        </h3>
        <ChecklistTable items={CONFINED_SPACE_CHECKLIST} />
      </div>

      {/* SECTION 3: WORK AT HEIGHT */}
      <div>
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">
          Work At Height Checklist
        </h3>
        <ChecklistTable items={WORK_AT_HEIGHT_CHECKLIST} />
      </div>

      {/* SECTION 4: HOT WORK */}
      <div>
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">
          Hot Work Checklist
        </h3>
        <ChecklistTable items={HOT_WORK_CHECKLIST} />
      </div>

      {/* SECTION 5: PERMIT CLOSURE */}
      <div>
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">
          Work Completed / Permit Closed
        </h3>
        <div className="border border-slate-200 bg-white">
          <div className="flex items-start gap-3 p-4 border-b border-slate-200 bg-slate-50/50">
            <Checkbox 
              id="closure-declaration" 
              className="mt-0.5 shadow-none border-slate-300 bg-white shrink-0 rounded-none" 
            />
            <label htmlFor="closure-declaration" className="text-[10px] text-slate-700 leading-relaxed cursor-pointer font-bold uppercase tracking-wider">
              <span className="text-red-500 font-bold mr-1">*</span>
              The job described in this permit has been completed and safety devices put back again, area cleaned and persons on the job withdrawn.
            </label>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="flex items-center gap-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider w-40 shrink-0">Name of Permit Accepter:</label>
              <Input placeholder="Sign" className="h-8 rounded-none border-slate-200 shadow-none text-xs bg-white w-full" />
            </div>
            <div className="flex items-center gap-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Date:</label>
              <Input type="date" className="h-8 rounded-none border-slate-200 shadow-none text-xs bg-white w-32" />
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 ml-4">Time:</label>
              <Input type="time" className="h-8 rounded-none border-slate-200 shadow-none text-xs bg-white w-28" />
            </div>

            <div className="flex items-center gap-4 pt-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider w-40 shrink-0">Name of Permit Issuer:</label>
              <Input placeholder="Sign" className="h-8 rounded-none border-slate-200 shadow-none text-xs bg-white w-full" />
            </div>
            <div className="flex items-center gap-4 pt-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Date:</label>
              <Input type="date" className="h-8 rounded-none border-slate-200 shadow-none text-xs bg-white w-32" />
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 ml-4">Time:</label>
              <Input type="time" className="h-8 rounded-none border-slate-200 shadow-none text-xs bg-white w-28" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Legal Note */}
      <p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase flex items-center gap-2 px-2 mt-[-16px]">
        <span className="text-red-500">*</span> Permit Issuer & Approver & H.O.D will be fully responsible for Safety of People & Property.
      </p>

    </div>
  )
}
