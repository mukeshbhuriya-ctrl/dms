import React from "react";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { Card, CardContent } from "@/components/ui/card";

const dummyData = [
  { id: "1A03", process: "GTAW+SAW", wps: "SE50101-A-1-B Rev.0", tackWelder: "SCW-216", finalWelder: "SCW-216" },
  { id: "A2", process: "SMAW", wps: "SE50101-A-1-B", tackWelder: "SCW-215", finalWelder: "SCW-215" },
  { id: "B1", process: "GTAW", wps: "SE50101-A-1-C", tackWelder: "SCW-210", finalWelder: "SCW-210" },
  { id: "B2", process: "GTAW", wps: "SE50101-A-1-C", tackWelder: "SCW-210", finalWelder: "SCW-210" },
  { id: "B3", process: "GTAW", wps: "SE50101-A-1-C", tackWelder: "SCW-211", finalWelder: "SCW-211" },
];

export default function TravelerWeldingNDE() {
  return (
    <div>
      <ModuleHeader 
        title="Traveler Welding & NDE" 
        description="Welding and Non-Destructive Examination Inspection Records"
      />
      
      <div className="p-6">
        <Card className="rounded-md shadow-sm border border-border bg-white overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[calc(100vh-150px)] w-full border-t border-black bg-white">
              <div className="min-w-[2800px] inline-block align-top">
                <table className="w-full border-collapse text-[11px] font-sans text-black table-fixed relative">
                  <thead className="sticky top-0 z-30 shadow-[0_1px_0_0_black]">
                    {/* Row 1 */}
                    <tr className="bg-[#BFBFBF]">
                      <th rowSpan={4} className="border border-black px-2 py-1.5 font-bold w-[70px] sticky left-0 z-40 bg-[#BFBFBF] shadow-[1px_0_0_0_black]">
                        Joint No.
                      </th>
                      <th rowSpan={4} className="border border-black px-2 py-1.5 font-bold w-[90px] -rotate-90 origin-center whitespace-nowrap">
                        Process
                      </th>
                      <th rowSpan={4} className="border border-black px-2 py-1.5 font-bold w-[140px] -rotate-90 origin-center whitespace-nowrap">
                        WPS No.
                      </th>
                      <th colSpan={2} className="border border-black px-2 py-1.5 font-bold w-[120px]">
                        Assigned Welder ID
                      </th>
                      <th colSpan={6} className="border border-black px-2 py-1.5 font-bold w-[360px]">
                        Fit Up Inspection
                      </th>
                      <th colSpan={2} className="border border-black px-2 py-1.5 font-bold w-[120px]">
                        Back Chip NDE (PT)
                      </th>
                      <th colSpan={6} className="border border-black px-2 py-1.5 font-bold w-[360px]">
                        Weld Visual Inspection
                      </th>
                      <th colSpan={16} className="border border-black px-2 py-1.5 font-bold w-[960px]">
                        Final NDE
                      </th>
                    </tr>

                    {/* Row 2 */}
                    <tr className="bg-[#BFBFBF]">
                      <th rowSpan={3} className="border border-black px-1 py-1 font-bold -rotate-90 origin-center whitespace-nowrap w-[60px]">
                        Tack
                      </th>
                      <th rowSpan={3} className="border border-black px-1 py-1 font-bold -rotate-90 origin-center whitespace-nowrap w-[60px]">
                        Final
                      </th>
                      <th colSpan={2} className="border border-black px-2 py-1 font-bold">Production</th>
                      <th colSpan={2} className="border border-black px-2 py-1 font-bold">QC Engineer</th>
                      <th colSpan={2} className="border border-black px-2 py-1 font-bold">AI</th>
                      
                      <th colSpan={2} className="border border-black px-2 py-1 font-bold">QC Engineer</th>
                      
                      <th colSpan={2} className="border border-black px-2 py-1 font-bold">Production</th>
                      <th colSpan={2} className="border border-black px-2 py-1 font-bold">QC Engineer</th>
                      <th colSpan={2} className="border border-black px-2 py-1 font-bold">AI</th>

                      <th colSpan={4} className="border border-black px-2 py-1 font-bold">PT</th>
                      <th colSpan={4} className="border border-black px-2 py-1 font-bold">RT</th>
                      <th colSpan={4} className="border border-black px-2 py-1 font-bold">UT</th>
                      <th colSpan={4} className="border border-black px-2 py-1 font-bold">MT</th>
                    </tr>

                    {/* Row 3 */}
                    <tr className="bg-[#BFBFBF]">
                      {/* Fit Up - Production */}
                      <th rowSpan={2} className="border border-black px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Sign</th>
                      <th rowSpan={2} className="border border-black px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Date</th>
                      {/* Fit Up - QC Engineer */}
                      <th rowSpan={2} className="border border-black px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Check Point</th>
                      <th rowSpan={2} className="border border-black px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Sign & Date</th>
                      {/* Fit Up - AI */}
                      <th rowSpan={2} className="border border-black px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Check Point</th>
                      <th rowSpan={2} className="border border-black px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Sign & Date</th>

                      {/* Back Chip - QC Engineer */}
                      <th rowSpan={2} className="border border-black px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Check Point</th>
                      <th rowSpan={2} className="border border-black px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Sign & Date</th>

                      {/* Weld Visual - Production */}
                      <th rowSpan={2} className="border border-black px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Sign</th>
                      <th rowSpan={2} className="border border-black px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Date</th>
                      {/* Weld Visual - QC Engineer */}
                      <th rowSpan={2} className="border border-black px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Check Point</th>
                      <th rowSpan={2} className="border border-black px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Sign & Date</th>
                      {/* Weld Visual - AI */}
                      <th rowSpan={2} className="border border-black px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Check Point</th>
                      <th rowSpan={2} className="border border-black px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Sign & Date</th>

                      {/* Final NDE */}
                      <th colSpan={2} className="border border-black px-1 py-1 font-bold">QC Engineer</th>
                      <th colSpan={2} className="border border-black px-1 py-1 font-bold">AI</th>
                      <th colSpan={2} className="border border-black px-1 py-1 font-bold">QC Engineer</th>
                      <th colSpan={2} className="border border-black px-1 py-1 font-bold">AI</th>
                      <th colSpan={2} className="border border-black px-1 py-1 font-bold">QC Engineer</th>
                      <th colSpan={2} className="border border-black px-1 py-1 font-bold">AI</th>
                      <th colSpan={2} className="border border-black px-1 py-1 font-bold">QC Engineer</th>
                      <th colSpan={2} className="border border-black px-1 py-1 font-bold">AI</th>
                    </tr>

                    {/* Row 4 */}
                    <tr className="bg-[#BFBFBF]">
                      {/* Final NDE check points */}
                      {[...Array(4)].map((_, i) => (
                        <React.Fragment key={i}>
                          <th className="border border-black px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px] h-[80px]">Check Point</th>
                          <th className="border border-black px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px] h-[80px]">Sign & Date</th>
                          <th className="border border-black px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px] h-[80px]">Check Point</th>
                          <th className="border border-black px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px] h-[80px]">Sign & Date</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {dummyData.map((row, index) => (
                      <tr key={index} className="h-[40px]">
                        <td className="border border-black px-2 py-1 text-center font-bold text-red-600 sticky left-0 z-20 bg-white shadow-[1px_0_0_0_black]">
                          {row.id}
                        </td>
                        <td className="border border-black px-2 py-1 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                          {row.process}
                        </td>
                        <td className="border border-black px-2 py-1 text-center">
                          {row.wps}
                        </td>
                        <td className="border border-black px-1 py-1 text-center text-[10px]">
                          {row.tackWelder}
                        </td>
                        <td className="border border-black px-1 py-1 text-center text-[10px]">
                          {row.finalWelder}
                        </td>

                        {Array.from({ length: 30 }).map((_, i) => (
                          <td key={i} className="border border-black px-1 py-1 text-center"></td>
                        ))}
                      </tr>
                    ))}
                    
                    {Array.from({ length: 25 }).map((_, rowIndex) => (
                      <tr key={`empty-${rowIndex}`} className="h-[40px]">
                        <td className="border border-black px-1 py-1 text-center sticky left-0 z-20 bg-white shadow-[1px_0_0_0_black]"></td>
                        {Array.from({ length: 34 }).map((_, colIndex) => (
                          <td key={colIndex} className="border border-black px-1 py-1 text-center"></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Bottom Section: Instructions & Legends */}
                <table className="w-full border-collapse text-[11px] font-sans text-black table-fixed border-t-0">
                  <tbody>
                    <tr>
                      <td className="w-1/2 border border-t-0 border-black text-center p-1">
                        To Be Checked While Fit-Up Inspection
                      </td>
                      <td className="w-1/2 border border-t-0 border-black text-center p-1">
                        To Be Checked While Weld Visual Inspection
                      </td>
                    </tr>
                    <tr>
                      <td className="w-1/2 border border-black align-top p-1 pl-2">
                        <ul className="list-none space-y-[2px]">
                          <li><span className="mr-1">•</span>Edge preparation, Root Gap, Root Face, Bevel Angle as shown in drawing</li>
                          <li><span className="mr-1">•</span>Surface to be weld is free from Scale, Rust, Oil, Slag, Foreign Material Etc.</li>
                          <li><span className="mr-1">•</span>Tack Welding for any defects</li>
                          <li><span className="mr-1">•</span>Mis-Match (Tolerance as per UW-33)</li>
                          <li><span className="mr-1">•</span>Orientation</li>
                          <li><span className="mr-1">•</span>Identification Mark</li>
                          <li><span className="mr-1">•</span>Previous stage NDE completion (If Entry in to vessel not possible after closing)</li>
                        </ul>
                      </td>
                      <td className="w-1/2 border border-black align-top p-1 pl-2">
                        <ul className="list-none space-y-[2px]">
                          <li><span className="mr-1">•</span>As welded surface are sufficiently free from coarse ripples, Groove, Overlaps, abrupt ridges, valise, undercuts, weld spatters & Slags.</li>
                          <li><span className="mr-1">•</span>Weld Reinforcement of Butt joints as per UW – 35</li>
                          <li><span className="mr-1">•</span>Leg Length of fillet welds with required throat</li>
                          <li><span className="mr-1">•</span>In complete penetration & Fusion in single welded joints.</li>
                        </ul>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="border border-black p-1 pl-2 align-top">
                        <div className="mb-0">LEGENDS:</div>
                        <div className="space-y-[2px]">
                          <div>H – Inspection stage of Manufacturing beyond which no further operation shall be carried out until the Engr. QC & AI have signed off the traveler or other applicable documents signifying their acceptance. The AI shall be notified for HOLD Point Inspection in advance.</div>
                          <div>W – Witness Point. A Stage beyond which no work can proceed until the AI has seen it or granted his / her written consent or permission to proceed further.</div>
                          <div>R – Review an indication that documents result of test, examination OR Inspection requires review prior to completion of the job. Presence of the AI during the action being reported is not required.</div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
