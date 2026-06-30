import React, { useState, useEffect, useRef, useCallback } from "react";
import { TableVirtuoso } from "react-virtuoso";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import apiClient from "@/api/api.client";

export default function TravelerWeldingNDE() {
  const [joints, setJoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  /* 
   * NOTE: TRUE SERVER-SIDE BIDIRECTIONAL SCROLLING (Client Option 1)
   * If you ever need to fetch back previous rows from the server when scrolling UP (and clearing them from DOM),
   * you must:
   * 1. Maintain a 'startPage' and 'endPage' in state.
   * 2. Add an IntersectionObserver to the FIRST row in the table.
   * 3. When scrolling UP hits the top observer, fetch 'startPage - 1', prepend to 'joints' array, and slice off the bottom of the array.
   * 4. When scrolling DOWN hits the bottom observer, fetch 'endPage + 1', append to 'joints', and slice off the top of the array.
   * 5. You MUST maintain empty space (padding) above the first row to preserve the scrollbar position (using padding-top based on deleted row count).
   * 
   * We are currently using DOM Virtualization (Option 2) via react-virtuoso.
   * It destroys HTML elements off-screen but keeps JSON data in RAM, giving the same performance boost but a much smoother scroll experience.
   */
  const [loadingMore, setLoadingMore] = useState(false);
  const limit = 50;

  useEffect(() => {
    const fetchJoints = async () => {
      try {
        if (page === 1) setLoading(true);
        else setLoadingMore(true);

        const response = await apiClient.get('/api/wpj/traveler-summary', { 
          limit, 
          page,
          sortBy: 'joint_no',
          sortOrder: 'asc'
        });
        
        if (response && response.success) {
          const newData = response.data || [];
          setJoints(prev => page === 1 ? newData : [...prev, ...newData]);
          
          if (response.meta && response.meta.totalPages) {
             setHasMore(page < response.meta.totalPages);
          } else {
             setHasMore(newData.length === limit);
          }
        }
      } catch (error) {
        console.error("Error fetching weld joints:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };
    
    fetchJoints();
  }, [page]);
  return (
    <div>
      <ModuleHeader 
        title="Traveler Welding & NDE" 
        description="Welding and Non-Destructive Examination Inspection Records"
      />
      
      <div className="p-6">
        <Card className="rounded-md shadow-sm border border-border bg-card overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[calc(100vh-150px)] w-full border-t border-border bg-card">
              <div className="min-w-[2800px] inline-block align-top">
                
                <TableVirtuoso
                  style={{ height: 'calc(100vh - 150px)', width: '100%', minWidth: '2800px' }}
                  data={joints}
                  endReached={() => {
                    if (hasMore && !loadingMore && !loading) {
                      setPage(prevPage => prevPage + 1);
                    }
                  }}
                  components={{
                    Table: (props) => <table {...props} className="w-full border-collapse text-[11px] font-sans text-foreground table-fixed relative min-w-[2800px]" />,
                    TableHead: React.forwardRef((props, ref) => <thead {...props} ref={ref} className="sticky top-0 z-50 shadow-[0_1px_0_0_hsl(var(--border))] bg-muted" />),
                    TableBody: React.forwardRef((props, ref) => <tbody {...props} ref={ref} className="bg-card relative z-0" />),
                    TableRow: (props) => <tr {...props} className="h-[40px]" />,
                    TableFoot: React.forwardRef((props, ref) => (
                      <tfoot {...props} ref={ref}>
                        {(!loading && joints.length < 25) && Array.from({ length: 25 - joints.length }).map((_, rowIndex) => (
                          <tr key={`empty-padding-${rowIndex}`} className="h-[40px]">
                            <td className="border border-border px-1 py-1 text-center sticky left-0 z-10 bg-card shadow-[1px_0_0_0_hsl(var(--border))]"></td>
                            {Array.from({ length: 34 }).map((_, colIndex) => (
                              <td key={colIndex} className="border border-border px-1 py-1 text-center"></td>
                            ))}
                          </tr>
                        ))}
                        {loadingMore && (
                          <tr>
                            <td colSpan={35} className="border border-border px-2 py-3 text-center sticky left-0 z-10 bg-gray-50 text-gray-500 font-medium">
                              <div className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Loading more joints...
                              </div>
                            </td>
                          </tr>
                        )}
                        {loading && joints.length === 0 && (
                          <tr>
                            <td colSpan={35} className="border border-border px-2 py-4 text-center sticky left-0 z-10 bg-card shadow-[1px_0_0_0_hsl(var(--border))]">
                              Loading joints...
                            </td>
                          </tr>
                        )}
                        {!loading && joints.length === 0 && (
                          <tr>
                            <td colSpan={35} className="border border-border px-2 py-4 text-center sticky left-0 z-10 bg-card shadow-[1px_0_0_0_hsl(var(--border))]">
                              No joints found.
                            </td>
                          </tr>
                        )}
                      </tfoot>
                    ))
                  }}
                  fixedHeaderContent={() => (
                    <>
                      
                    {/* Row 1 */}
                    <tr className="bg-muted">
                      <th rowSpan={4} className="border border-border px-2 py-1.5 font-bold w-[70px] sticky left-0 z-[60] bg-muted shadow-[1px_0_0_0_hsl(var(--border))]">
                        Joint No.
                      </th>
                      <th rowSpan={4} className="border border-border px-2 py-1.5 font-bold w-[90px] -rotate-90 origin-center whitespace-nowrap">
                        Process
                      </th>
                      <th rowSpan={4} className="border border-border px-2 py-1.5 font-bold w-[140px] -rotate-90 origin-center whitespace-nowrap">
                        WPS No.
                      </th>
                      <th colSpan={2} className="border border-border px-2 py-1.5 font-bold w-[120px]">
                        Assigned Welder ID
                      </th>
                      <th colSpan={6} className="border border-border px-2 py-1.5 font-bold w-[360px]">
                        Fit Up Inspection
                      </th>
                      <th colSpan={2} className="border border-border px-2 py-1.5 font-bold w-[120px]">
                        Back Chip NDE (PT)
                      </th>
                      <th colSpan={6} className="border border-border px-2 py-1.5 font-bold w-[360px]">
                        Weld Visual Inspection
                      </th>
                      <th colSpan={16} className="border border-border px-2 py-1.5 font-bold w-[960px]">
                        Final NDE
                      </th>
                    </tr>

                    {/* Row 2 */}
                    <tr className="bg-muted">
                      <th rowSpan={3} className="border border-border px-1 py-1 font-bold -rotate-90 origin-center whitespace-nowrap w-[60px]">
                        Tack
                      </th>
                      <th rowSpan={3} className="border border-border px-1 py-1 font-bold -rotate-90 origin-center whitespace-nowrap w-[60px]">
                        Final
                      </th>
                      <th colSpan={2} className="border border-border px-2 py-1 font-bold">Production</th>
                      <th colSpan={2} className="border border-border px-2 py-1 font-bold">QC Engineer</th>
                      <th colSpan={2} className="border border-border px-2 py-1 font-bold">AI</th>
                      
                      <th colSpan={2} className="border border-border px-2 py-1 font-bold">QC Engineer</th>
                      
                      <th colSpan={2} className="border border-border px-2 py-1 font-bold">Production</th>
                      <th colSpan={2} className="border border-border px-2 py-1 font-bold">QC Engineer</th>
                      <th colSpan={2} className="border border-border px-2 py-1 font-bold">AI</th>

                      <th colSpan={4} className="border border-border px-2 py-1 font-bold">PT</th>
                      <th colSpan={4} className="border border-border px-2 py-1 font-bold">RT</th>
                      <th colSpan={4} className="border border-border px-2 py-1 font-bold">UT</th>
                      <th colSpan={4} className="border border-border px-2 py-1 font-bold">MT</th>
                    </tr>

                    {/* Row 3 */}
                    <tr className="bg-muted">
                      {/* Fit Up - Production */}
                      <th rowSpan={2} className="border border-border px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Sign</th>
                      <th rowSpan={2} className="border border-border px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Date</th>
                      {/* Fit Up - QC Engineer */}
                      <th rowSpan={2} className="border border-border px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Check Point</th>
                      <th rowSpan={2} className="border border-border px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Sign & Date</th>
                      {/* Fit Up - AI */}
                      <th rowSpan={2} className="border border-border px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Check Point</th>
                      <th rowSpan={2} className="border border-border px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Sign & Date</th>

                      {/* Back Chip - QC Engineer */}
                      <th rowSpan={2} className="border border-border px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Check Point</th>
                      <th rowSpan={2} className="border border-border px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Sign & Date</th>

                      {/* Weld Visual - Production */}
                      <th rowSpan={2} className="border border-border px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Sign</th>
                      <th rowSpan={2} className="border border-border px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Date</th>
                      {/* Weld Visual - QC Engineer */}
                      <th rowSpan={2} className="border border-border px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Check Point</th>
                      <th rowSpan={2} className="border border-border px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Sign & Date</th>
                      {/* Weld Visual - AI */}
                      <th rowSpan={2} className="border border-border px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Check Point</th>
                      <th rowSpan={2} className="border border-border px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px]">Sign & Date</th>

                      {/* Final NDE */}
                      <th colSpan={2} className="border border-border px-1 py-1 font-bold">QC Engineer</th>
                      <th colSpan={2} className="border border-border px-1 py-1 font-bold">AI</th>
                      <th colSpan={2} className="border border-border px-1 py-1 font-bold">QC Engineer</th>
                      <th colSpan={2} className="border border-border px-1 py-1 font-bold">AI</th>
                      <th colSpan={2} className="border border-border px-1 py-1 font-bold">QC Engineer</th>
                      <th colSpan={2} className="border border-border px-1 py-1 font-bold">AI</th>
                      <th colSpan={2} className="border border-border px-1 py-1 font-bold">QC Engineer</th>
                      <th colSpan={2} className="border border-border px-1 py-1 font-bold">AI</th>
                    </tr>

                    {/* Row 4 */}
                    <tr className="bg-muted">
                      {/* Final NDE check points */}
                      {[...Array(4)].map((_, i) => (
                        <React.Fragment key={i}>
                          <th className="border border-border px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px] h-[80px]">Check Point</th>
                          <th className="border border-border px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px] h-[80px]">Sign & Date</th>
                          <th className="border border-border px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px] h-[80px]">Check Point</th>
                          <th className="border border-border px-1 py-1 font-normal -rotate-90 origin-center whitespace-nowrap w-[60px] h-[80px]">Sign & Date</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  
                    </>
                  )}
                  itemContent={(index, joint) => {
                    const jointNo = joint.joint_no || "-";
                    const process = joint.process || "-";
                    const wps = joint.wps_pqr_no || "-";
                    
                    let tackWelder = "-";
                    let finalWelder = "-";
                    
                    const inspectionData = joint.weld_joint_inspection;
                    if (inspectionData) {
                      const catKey = (joint.joint_type || "A").toLowerCase();
                      const s1Data = inspectionData[catKey]?.s1;
                      const s3Data = inspectionData[catKey]?.s3;
                      
                      tackWelder = s1Data?.tackWelder || s1Data?.welderNumber || s1Data?.welderNo || "-";
                      finalWelder = s3Data?.welderNumber || s3Data?.welderNo || s1Data?.welderNumber || s1Data?.welderNo || tackWelder;
                    }
                    return (
                      <>
                        <td className="border border-border px-2 py-1 text-center font-bold text-red-600 sticky left-0 z-10 bg-card shadow-[1px_0_0_0_hsl(var(--border))]">
                          {jointNo}
                        </td>
                        <td className="border border-border px-2 py-1 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                          {process}
                        </td>
                        <td className="border border-border px-2 py-1 text-center">
                          {wps}
                        </td>
                        <td className="border border-border px-1 py-1 text-center text-[10px]">
                          {tackWelder}
                        </td>
                        <td className="border border-border px-1 py-1 text-center text-[10px]">
                          {finalWelder}
                        </td>
                        {Array.from({ length: 30 }).map((_, i) => (
                          <td key={`empty-${index}-${i}`} className="border border-border px-1 py-1 text-center"></td>
                        ))}
                      </>
                    )
                  }}
                />

              </div>
            </div>
            
            {/* Bottom Section: Instructions & Legends (Outside the horizontal scroll container) */}
            <div className="w-full bg-card">
              <table className="w-full border-collapse text-[11px] font-sans text-foreground table-fixed border border-t-0 border-border">
                <tbody>
                  <tr>
                    <td className="w-1/2 border border-border border-t-0 text-center p-1">
                      To Be Checked While Fit-Up Inspection
                    </td>
                    <td className="w-1/2 border border-border border-t-0 text-center p-1">
                      To Be Checked While Weld Visual Inspection
                    </td>
                  </tr>
                  <tr>
                    <td className="w-1/2 border border-border align-top p-1 pl-2">
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
                    <td className="w-1/2 border border-border align-top p-1 pl-2">
                      <ul className="list-none space-y-[2px]">
                        <li><span className="mr-1">•</span>As welded surface are sufficiently free from coarse ripples, Groove, Overlaps, abrupt ridges, valise, undercuts, weld spatters & Slags.</li>
                        <li><span className="mr-1">•</span>Weld Reinforcement of Butt joints as per UW – 35</li>
                        <li><span className="mr-1">•</span>Leg Length of fillet welds with required throat</li>
                        <li><span className="mr-1">•</span>In complete penetration & Fusion in single welded joints.</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="border border-border p-1 pl-2 align-top">
                      <div className="mb-0 font-bold">LEGENDS:</div>
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

            {/* Remarks Section */}
            <div className="w-full bg-card p-2 border-x border-b border-border">
              <div className="text-[11px] font-bold font-sans text-foreground mb-1">
                Remarks.:-
              </div>
              <Textarea 
                className="min-h-[80px] text-[11px] resize-y rounded-none border-border focus-visible:ring-0 focus-visible:ring-offset-0" 
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
