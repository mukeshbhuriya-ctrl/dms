import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { SearchableSelect } from "@/components/shared/SearchableSelect"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, CheckCircle2 } from "lucide-react"

const CONFINED_SPACE_CHECKLIST = [
  { no: '1', text: 'Persons engaged are trained.' },
  { no: '2', text: 'The vessel/confined space is free from toxic & Flammable material & Cooled (< 45oC).' },
  { no: '3', text: 'Cross Ventilation to be kept on by keeping two manholes / nozzles/ bottom valve open.' },
  { no: '4', text: '24 Volt supply hand lamp provided.' },
  { no: '5', text: 'Working area is made safe including access to the work place.' },
  { no: '6', text: 'At least one attendant is provided outside the permitted confined space during job.' },
  { no: '7', text: 'Rescue procedure can be followed in the event of an emergency?' }
]

const WORK_AT_HEIGHT_CHECKLIST = [
  { no: '1', text: 'Persons engaged are trained.' },
  { no: '2', text: 'Open vertical drops are identified & properly guarded.' },
  { no: '3', text: 'Fall Arrestor' },
  { no: '4', text: 'The Scaffolding/ platfon-n/ proper approach for Working at height provided.' },
  { no: '5', text: 'Safety ladder Provided (Ladder only to be used for light work for short duration)' },
  { no: '6', text: 'Hydraulic /Mechanical platform is inspected thoroughly.' },
  { no: '7', text: 'Other arrangements made :' },
  { no: '7.1', text: 'Safety Net', isSub: true },
  { no: '7.2', text: 'Cordoning off area', isSub: true },
  { no: '8', text: 'Life line provided for anchoring safety belt.' },
  { no: '9', text: 'Advance hard wares are used for roof top & super height work (> 7 Mtrs.)' },
  { no: '', text: 'Rope Grab / Crawling board', isSub: true },
  { no: '', text: 'Roof FP system', isSub: true },
  { no: '10', text: 'Others -' }
]

const HOT_WORK_CHECKLIST = [
  { no: '1', text: 'Persons engaged are trained' },
  { no: '2', text: 'Surrounding area is properly cleaned and made free from presence of any flammables.' },
  { no: '3', text: 'All necessary arrangements are made so that welding / cutting spark falls in the safe zone.' },
  { no: '4', text: 'Cutting/ welding equipment are in good condition' },
  { no: '5', text: 'Flash Back Arrestor attached' },
  { no: '6', text: 'Fire watcher is assigned during & till 60 minutes after the job completion.' },
  { no: '7', text: 'Drums are not used as approach/ platform.' },
  { no: '8', text: 'All required Tools/ Tackles / PPE\'s are checked' },
  { no: '9', text: 'Welding / cutting goggles &Leather hand gloves' },
  { no: '10', text: 'Water hose/ fire extinguisher available nearby' },
  { no: '11', text: 'Flammable gas cylinders are kept at ground only and properly chained.' },
  { no: '12', text: 'Sewers / vents near workplaces are free from any flammable liquid/gas.' },
  { no: '13', text: 'Good house - keeping ensured' },
  { no: '14', text: 'Cordoning off the area during the process' }
]

// Reusable Checklist Table Component
const ChecklistTable = ({ items, setItems }) => {
  const addRow = () => {
    const maxNo = Math.max(0, ...items.map(i => parseInt(i.no) || 0));
    setItems([...items, { id: Date.now().toString(), no: (maxNo + 1).toString(), text: '' }]);
  };

  const removeRow = (id) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateText = (id, text) => {
    setItems(items.map(i => i.id === id ? { ...i, text } : i));
  };

  return (
    <div className="border border-slate-200 border-t-0 bg-white">
      <table className="w-full text-left border-collapse">
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.id} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/50 transition-colors">
              <td className="px-3 py-2 text-xs font-bold text-slate-600 border-r border-slate-200 w-12 text-center bg-slate-50/50">{item.no}</td>
              <td className={`px-2 py-1 text-xs font-medium text-slate-700 border-r border-slate-200 ${item.isSub ? 'pl-8' : ''}`}>
                <Input 
                  value={item.text} 
                  onChange={(e) => updateText(item.id, e.target.value)} 
                  className="h-7 text-xs shadow-none border-transparent focus-visible:ring-0 focus:border-slate-300 focus:bg-white bg-transparent rounded-none px-2 w-full"
                />
              </td>
              <td className="px-2 py-2 w-48 bg-white border-r border-slate-200">
                {item.no === '7' && item.text.includes('Other arrangements') ? null : (
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center space-x-1">
                      <Checkbox id={`yes-${item.id}`} className="shadow-none border-slate-300 bg-white rounded-none h-4 w-4" />
                      <Label htmlFor={`yes-${item.id}`} className="text-[10px] font-bold text-slate-600 cursor-pointer">Y</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Checkbox id={`no-${item.id}`} className="shadow-none border-slate-300 bg-white rounded-none h-4 w-4" />
                      <Label htmlFor={`no-${item.id}`} className="text-[10px] font-bold text-slate-600 cursor-pointer">N</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Checkbox id={`na-${item.id}`} className="shadow-none border-slate-300 bg-white rounded-none h-4 w-4" />
                      <Label htmlFor={`na-${item.id}`} className="text-[10px] font-bold text-slate-600 cursor-pointer">NA</Label>
                    </div>
                  </div>
                )}
              </td>
              <td className="px-2 py-2 w-10 text-center bg-white">
                <button 
                  type="button" 
                  onClick={() => removeRow(item.id)} 
                  className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-2 flex justify-end bg-slate-50 border-t border-slate-200">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={addRow}
          className="h-7 text-[10px] rounded-none border-slate-200 shadow-none uppercase tracking-wider font-bold text-slate-600 hover:bg-white hover:text-blue-600 transition-colors cursor-pointer"
        >
          <Plus className="w-3 h-3 mr-1 stroke-[3]" /> Add Row
        </Button>
      </div>
    </div>
  );
};

export function PermitExtension() {
  const [extensionRows, setExtensionRows] = useState([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
  
  const [confinedItems, setConfinedItems] = useState(CONFINED_SPACE_CHECKLIST.map((item, i) => ({ ...item, id: `conf-${i}` })));
  const [heightItems, setHeightItems] = useState(WORK_AT_HEIGHT_CHECKLIST.map((item, i) => ({ ...item, id: `height-${i}` })));
  const [hotItems, setHotItems] = useState(HOT_WORK_CHECKLIST.map((item, i) => ({ ...item, id: `hot-${i}` })));

  const removeRow = (id) => {
    if (extensionRows.length > 1) {
      setExtensionRows(extensionRows.filter(row => row.id !== id));
    }
  };

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
                <th rowSpan={2} className="w-8 border-b border-slate-200"></th>
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
              {extensionRows.map((row) => (
                <tr key={row.id} className="divide-x divide-slate-200 h-8 hover:bg-slate-50 transition-colors">
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
                  <td className="p-0 text-center">
                    <button 
                      type="button" 
                      onClick={() => removeRow(row.id)} 
                      disabled={extensionRows.length <= 1}
                      className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-400 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setExtensionRows([...extensionRows, { id: Date.now() }])}
            className="h-7 text-[10px] rounded-none border-slate-200 shadow-none uppercase tracking-wider font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3 mr-1 stroke-[3]" /> Add Row
          </Button>
        </div>
      </div>


      {/* CHECKLISTS SECTION */}
      <div>
        <h3 className="text-xs font-extrabold text-slate-800 tracking-widest border-b border-slate-200 pb-2 mb-4">
          <span className="uppercase">Hazardous Work Permit Check List:</span> <span className="font-semibold text-slate-600 normal-case tracking-normal ml-1">Precaution checklist: (Mark Clearly Yes -Y, No-N of Not Applicable - NA)</span>
        </h3>
        
        {/* A. CONFINED SPACE */}
        <div className="mb-6">
          <h4 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider bg-slate-100 p-2 border border-slate-200 border-b-0">
            A. CHECKLIST FOR CONFINED SPACE ENTRY
          </h4>
          <ChecklistTable items={confinedItems} setItems={setConfinedItems} />
        </div>

        {/* B. WORK AT HEIGHT */}
        <div className="mb-6">
          <h4 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider bg-slate-100 p-2 border border-slate-200 border-b-0">
            B. CHECKLIST FOR WORK AT HEIGHT
          </h4>
          <ChecklistTable items={heightItems} setItems={setHeightItems} />
        </div>

        {/* C. HOT WORK */}
        <div className="mb-2">
          <h4 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider bg-slate-100 p-2 border border-slate-200 border-b-0">
            C. CHECKLIST FOR HOT WORK
          </h4>
          <ChecklistTable items={hotItems} setItems={setHotItems} />
        </div>

        {/* Auto-saved indicator for extension */}
        <div className="flex items-center text-slate-400 text-[11px] font-medium gap-1">
          <CheckCircle2 className="w-3 h-3" /> Auto Saved
        </div>
      </div>



    </div>
  )
}
