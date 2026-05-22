import { useState, useEffect, useRef } from "react"
import apiClient from "@/api/api.client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Printer, Download, Loader2, CheckCircle2 } from "lucide-react"

/**
 * WPJ Cumulative Preview — Professional Grid Layout
 *
 * Renders an HTML table matching the client's PDF report templates:
 * - Joint Types A/B: "Seam Welding Report" layout
 * - Joint Types C/D/F: "Nozzle Report" layout
 *
 * All stages are shown in a single continuous table with
 * section headers and inline signature blocks.
 */
export default function WPJCumulativePreview({ jointId, onDownload }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [jointData, setJointData] = useState(null)
  const [approvedStages, setApprovedStages] = useState([])
  const [category, setCategory] = useState("")
  const [downloading, setDownloading] = useState(false)
  const printRef = useRef(null)

  useEffect(() => {
    if (!jointId) return
    const fetchData = async () => {
      setLoading(true)
      setError("")
      try {
        const response = await apiClient.get(`/api/wpj/cumulative-data/${jointId}`)
        if (response && response.success) {
          setJointData(response.data.joint)
          setApprovedStages(response.data.approvedStages || [])
          setCategory(response.data.category)
        } else {
          setError("Failed to load preview data")
        }
      } catch (err) {
        console.error("Cumulative preview fetch error:", err)
        setError("Failed to load preview data")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [jointId])

  const fetchCumulativePdf = async () => {
    if (!jointId) return null
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
    const authData = localStorage.getItem("user_auth")
    let token = null
    if (authData) {
      try {
        const parsed = JSON.parse(authData)
        token = parsed?.payload?.token || parsed?.token
      } catch (e) {}
    }
    const response = await fetch(`${backendUrl}/api/wpj/generate-report/${jointId}/all`, {
      method: "GET",
      headers: { "Authorization": token ? `Bearer ${token}` : "" },
      credentials: "include",
    })
    if (!response.ok) throw new Error("Failed to fetch PDF")
    return await response.blob()
  }

  const handlePrint = async () => {
    setDownloading(true)
    try {
      const blob = await fetchCumulativePdf()
      const url = window.URL.createObjectURL(blob)
      const printWindow = window.open(url, "_blank")
      if (printWindow) {
        printWindow.onload = () => { printWindow.print() }
      }
    } catch (e) {
      console.error("Print error:", e)
    } finally {
      setDownloading(false)
    }
  }

  const handleDownload = async () => {
    if (!jointData) return
    setDownloading(true)
    try {
      const blob = await fetchCumulativePdf()
      const dateTime = new Date().toISOString().replace(/:/g, '-').split('.')[0]
      const filename = `Complete_Report_${jointData.joint_no}_${dateTime}.pdf`
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (e) {
      console.error("Download error:", e)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-lg text-muted-foreground">Loading preview...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-destructive text-lg">{error}</p>
      </div>
    )
  }

  if (!jointData || approvedStages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <CheckCircle2 className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-lg text-muted-foreground">No approved stages available for preview.</p>
      </div>
    )
  }

  const plan = jointData.weld_joint_plan || {}
  const job = plan.job || {}
  const insp = jointData.weld_joint_inspection || {}
  const jt = (category || jointData.joint_type || "A").toUpperCase()

  // Helper to get stage data from inspection JSON
  const getStageData = (stageKey) => {
    const sPrefix = stageKey.replace("stage", "s")
    const dataKey = `${sPrefix}_data`
    const raw = insp[dataKey]
    if (!raw) return {}
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
      const catKey = jt.toLowerCase()
      return parsed?.[catKey]?.[sPrefix] || parsed?.[catKey] || parsed || {}
    } catch (e) {
      return {}
    }
  }

  const getSignature = (stageKey) => {
    const sPrefix = stageKey.replace("stage", "s")
    return {
      prodName: insp[`${sPrefix}_production_engineer_name`] || "",
      prodDate: insp[`${sPrefix}_submitted_at`] ? new Date(insp[`${sPrefix}_submitted_at`]).toLocaleDateString() : "",
      qcName: insp[`${sPrefix}_qc_engineer_name`] || "",
      qcDate: insp[`${sPrefix}_approved_at`] ? new Date(insp[`${sPrefix}_approved_at`]).toLocaleDateString() : "",
      status: insp[`${sPrefix}_status`] || "pending"
    }
  }

  const isAB = ["A", "B"].includes(jt)

  return (
    <div className="cumulative-preview-container">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 print:hidden sticky top-0 bg-background z-10 py-3 border-b">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm px-3 py-1">Category {category}</Badge>
          <span className="text-sm text-muted-foreground">
            {approvedStages.length} approved stage{approvedStages.length !== 1 ? "s" : ""} shown
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={downloading}>
            <Printer className="h-4 w-4 mr-2" />
            {downloading ? "Generating..." : "Print"}
          </Button>
          <Button size="sm" onClick={handleDownload} disabled={downloading}>
            <Download className="h-4 w-4 mr-2" />
            {downloading ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Preview Content */}
      <div ref={printRef}>
        <style>{`
          .wpj-grid-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            font-family: 'Helvetica', 'Arial', sans-serif;
          }
          .wpj-grid-table th,
          .wpj-grid-table td {
            border: 1px solid #333;
            padding: 6px 8px;
            text-align: left;
            vertical-align: middle;
          }
          .wpj-grid-table .section-header {
            background: #f8f8f8;
            font-weight: 700;
            text-align: center;
            font-size: 13px;
          }
          .wpj-grid-table .label-cell {
            font-weight: 600;
          }
          .wpj-grid-table .sig-label {
            font-weight: 600;
            font-size: 12px;
            color: #333;
          }
          .wpj-grid-table .sig-value {
            font-size: 12px;
            color: #555;
          }
          .wpj-grid-table .header-meta td {
            font-size: 12px;
          }
        `}</style>

        {isAB ? (
          <SeamWeldingPreview
            jointData={jointData}
            job={job}
            plan={plan}
            insp={insp}
            approvedStages={approvedStages}
            getStageData={getStageData}
            getSignature={getSignature}
          />
        ) : (
          <NozzleReportPreview
            jointData={jointData}
            job={job}
            plan={plan}
            jt={jt}
            insp={insp}
            approvedStages={approvedStages}
            getStageData={getStageData}
            getSignature={getSignature}
          />
        )}
      </div>
    </div>
  )
}

// ==========================================
// SEAM WELDING REPORT PREVIEW (A/B)
// ==========================================
function SeamWeldingPreview({ jointData, job, plan, insp, approvedStages, getStageData, getSignature }) {
  const s1 = getStageData("stage1")
  const s1Sig = getSignature("stage1")
  const s2 = getStageData("stage2")
  const s2Sig = getSignature("stage2")
  const s3 = getStageData("stage3")
  const s3Sig = getSignature("stage3")
  const s4Sig = getSignature("stage4")
  const s5Sig = getSignature("stage5")
  const s6Sig = getSignature("stage6")
  const s7Sig = getSignature("stage7")

  const inspectionRows = s1.inspectionRows || []
  const defaultChars = [
    "Material Identification", "Weld joint configuration", "Root Gap",
    "Root Face", 'Degree for "V"', "Offset", "Alignment",
    "Weld edge Visual", "Length of the Shell", "Outside circumference",
    "Inside Gauge / Template Verification",
    "Outside Gauge / Template verification (if Applicable)",
    "Tack Welder Number"
  ]

  const hasStage = (key) => approvedStages.some(s => s.id === key)

  return (
    <div>
      {/* ===== HEADER: Title + Report No ===== */}
      <table className="wpj-grid-table" style={{ marginBottom: 0 }}>
        <tbody>
          <tr>
            <td style={{ width: "30%", textAlign: "center", fontWeight: 700, fontSize: 12, padding: "12px 8px" }}>
              {/* Logo / Company Name placeholder */}
              <span style={{ color: "#000080" }}>Shreno Engineering Limited</span>
            </td>
            <td style={{ width: "70%" }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#FF0000", textAlign: "center", paddingBottom: 4 }}>
                SET UP & WELD VISUAL INSPECTION REPORT
              </div>
              <div style={{ fontWeight: 700, fontSize: 11, color: "#FF0000", textAlign: "center", borderTop: "1px solid #333", paddingTop: 4 }}>
                Report No : <span style={{ color: "#000", fontWeight: 400 }}>{jointData.weld_joint_report_info?.report_no || `SHR/${job.job_number || "000"}/${plan.serial_no || "000"}`}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ===== INFO GRID: MSN, Client, PO, etc. ===== */}
      <table className="wpj-grid-table" style={{ marginBottom: 12 }}>
        <tbody>
          <tr>
            <td className="label-cell" style={{ width: "15%", color: "#FF0000" }}>MSN:</td>
            <td style={{ width: "35%" }}>{job.job_number || "-"}</td>
            <td className="label-cell" style={{ width: "15%", color: "#FF0000" }}>TAG NO.:</td>
            <td style={{ width: "35%" }}>{job.tag_number || "-"}</td>
          </tr>
          <tr>
            <td className="label-cell" style={{ color: "#FF0000" }}>CLIENT:</td>
            <td>{job.customer?.customer_name || "-"}</td>
            <td className="label-cell" style={{ color: "#FF0000" }}>EQUIPMENT:</td>
            <td>{job.equipement_name || "-"}</td>
          </tr>
          <tr>
            <td className="label-cell" style={{ color: "#FF0000" }}>Projects ID</td>
            <td>{job.project_id || "-"}</td>
            <td className="label-cell" style={{ color: "#FF0000" }}>Linde DRG No:</td>
            <td>{plan.shreno_drg_no || "-"}</td>
          </tr>
          <tr>
            <td className="label-cell" style={{ color: "#FF0000" }}>P.O. NO.:</td>
            <td>{job.po?.po_number || "-"}</td>
            <td className="label-cell" style={{ color: "#FF0000" }}>DRG. NO.:</td>
            <td>{plan.customer_drg_no || "-"}</td>
          </tr>
          <tr>
            <td className="label-cell" style={{ color: "#FF0000" }}>CODE:</td>
            <td>{job.code || "-"}</td>
            <td className="label-cell" style={{ color: "#FF0000" }}>INSP. AGENCY:</td>
            <td>TPIA</td>
          </tr>
        </tbody>
      </table>

      {/* ===== MAIN TABLE: Long Seam Inspection ===== */}
      <table className="wpj-grid-table">
      <tbody>
        {/* Title */}
        <tr>
          <td colSpan={4} className="section-header" style={{ fontSize: 14, padding: "10px" }}>
            LONG SEAM / CIRCUMFERENCE SEAM INSPECTION REPORT
          </td>
        </tr>

        {/* Joint Number */}
        <tr>
          <td className="label-cell" style={{ color: "#FF0000" }}>Joint Number</td>
          <td style={{ fontWeight: 600 }}>{jointData.joint_no || "-"}</td>
          <td></td>
          <td></td>
        </tr>

        {/* Stage 1: Setup Inspection Characteristics */}
        {defaultChars.map((charName, idx) => {
          const row = inspectionRows.find(r => r.name === charName) || inspectionRows[idx] || {}
          return (
            <tr key={`char-${idx}`}>
              <td className="label-cell">{charName}</td>
              <td>{row.value || ""}</td>
              <td></td>
              <td></td>
            </tr>
          )
        })}

        {/* Stage 1 Signatures */}
        <tr><td colSpan={4} className="section-header">Set Up Inspection by</td></tr>
        <SignatureRows sig={s1Sig} qcTitle="QC Engineer" />

        {/* Stage 2: Back Chip */}
        <tr><td colSpan={4} className="section-header">Back chip – Required / not required</td></tr>
        <tr>
          <td className="label-cell">Back Chip PT</td>
          <td>YES / No</td>
          <td style={{ fontWeight: 600 }}>{jointData.back_chip_req ? "YES" : "NO"}</td>
          <td></td>
        </tr>
        {hasStage("stage2") && <SignatureRows sig={s2Sig} qcTitle="QC Engineer" />}

        {/* Stage 3: Weld Visual */}
        <tr><td colSpan={4} className="section-header">Weld Visual Inspection by</td></tr>
        <tr>
          <td className="label-cell">Welder No.</td>
          <td></td>
          <td>{s3.welderNo || s3.welderNumber || ""}</td>
          <td></td>
        </tr>
        <tr>
          <td className="label-cell">Welding process</td>
          <td></td>
          <td>{s3.weldingProcess || ""}</td>
          <td></td>
        </tr>
        {hasStage("stage3") && <SignatureRows sig={s3Sig} qcTitle="QC Engineer" />}

        {/* Stage 4: RT */}
        <tr><td colSpan={4} className="section-header">Radiography Testing Requirement</td></tr>
        {hasStage("stage4") && <SignatureRows sig={s4Sig} qcTitle="NDT Engineer" />}

        {/* Stage 5: PT */}
        <tr><td colSpan={4} className="section-header">Liquid Penetrant Testing (Required / Not required)</td></tr>
        {hasStage("stage5") && <SignatureRows sig={s5Sig} qcTitle="NDT Engineer" />}

        {/* Stage 6: PWHT + RT after PWHT */}
        <tr><td colSpan={4} className="section-header">PWHT (Required / Not required)</td></tr>
        <tr><td colSpan={4} className="section-header">Radiography Testing Requirement (After PWHT)</td></tr>
        {hasStage("stage6") && <SignatureRows sig={s6Sig} qcTitle="NDT Engineer" />}

        {/* Stage 7: LP after PWHT */}
        <tr><td colSpan={4} className="section-header">Liquid Penetrant Testing (Required / Not required) – After PWHT</td></tr>
        {hasStage("stage7") && <SignatureRows sig={s7Sig} qcTitle="NDT Engineer" />}
      </tbody>
    </table>
    </div>
  )
}

// ==========================================
// NOZZLE REPORT PREVIEW (C/D/F)
// ==========================================
function NozzleReportPreview({ jointData, job, plan, jt, insp, approvedStages, getStageData, getSignature }) {
  const isD = jt === "D"
  const isF = jt === "F"

  // For F: stage mapping is different (stage1=setup, stage2=weld visual, stage3=PWHT-RT, stage4=PWHT-PT)
  // For C: stage1=setup, stage2=backchip, stage3=weld visual, stage4=PWHT-RT, stage5=PWHT-PT
  // For D: stage1=setup, stage2=backchip, stage3=weld visual, stage4=nozzle opening, stage5=nozzle setup, stage6=full welding, stage7=RF pad, stage8=PWHT-RT, stage9=PWHT-PT

  const s1 = getStageData("stage1")
  const s1Sig = getSignature("stage1")

  const hasStage = (key) => approvedStages.some(s => s.id === key)

  // Build characteristics based on joint type
  const characteristics = []

  // Char 1: Material Identification
  characteristics.push({
    sr: "1",
    title: "Material identification Marks",
    rows: [
      { detail: s1.materialIdMarks || "Available / Not Available", value: "" }
    ],
    sig: s1Sig,
    qcType: "QC"
  })

  if (!isF) {
    // Char 2: Nozzle pipe to Flange Set-Up (C/D)
    characteristics.push({
      sr: "2",
      title: "Nozzle pipe to Flange Set-Up",
      rows: [
        { detail: "Tack Welder", value: s1.tackWelder || "" },
        { detail: "Visual Inspection", value: s1.visualInspection || "OK / Not OK" },
        { detail: "Acceptance of L-Seam RT", value: s1.lSeamRt || "OK / Not OK" },
        { detail: `Dimensions\n  - Nozzle Size: ${s1.nozzleSize || "-"}\n  - Total Length: ${s1.totalLength || "-"}`, value: "" }
      ],
      sig: s1Sig,
      qcType: "QC"
    })

    // Char 3: Weld Visual (C/D)
    const s3_cd = getStageData("stage3")
    const s3Sig = getSignature("stage3")
    characteristics.push({
      sr: "3",
      title: "Weld Visual",
      rows: [
        { detail: "Welder Number", value: s3_cd.welderNumber || s3_cd.welderNo || "" },
        { detail: "Overlay PT (If applicable)", value: s3_cd.overlayPt || "" }
      ],
      sig: s3Sig,
      qcType: "QC"
    })

    if (isD) {
      // Char 4: Nozzle Opening (D only)
      const s4_d = getStageData("stage4")
      const s4Sig = getSignature("stage4")
      characteristics.push({
        sr: "4",
        title: "Inspection Of Nozzle Opening",
        rows: [
          { detail: "Opening size", value: s4_d.openingSize || "" },
          { detail: "Orientation (°)", value: s4_d.orientation || "" },
          { detail: "Elevation", value: s4_d.elevation || "" },
          { detail: "Edge preparation", value: s4_d.edgePreparation || "" }
        ],
        sig: s4Sig,
        qcType: "QC"
      })

      // Char 5: Nozzle Set-Up (D only)
      const s5_d = getStageData("stage5")
      const s5Sig = getSignature("stage5")
      characteristics.push({
        sr: "5",
        title: "Nozzle Set-Up on Shell / Dish (RF pad setup as applicable)",
        rows: [
          { detail: "Tack Welder", value: s5_d.tackWelder || "" },
          { detail: "Cleaning of Nozzle & Weld Area", value: s5_d.cleaning || "OK / Not OK" },
          { detail: "Groove Angle", value: s5_d.grooveAngle || "" },
          { detail: "Root face", value: s5_d.rootFace || "" },
          { detail: "Root Gap", value: s5_d.rootGap || "" },
          { detail: "Projection from Reference line to Flange face", value: s5_d.projection || "" },
          { detail: "PCD hole OFF center / ON center", value: s5_d.pcdHole || "OFF center / ON center" }
        ],
        sig: s5Sig,
        qcType: "QC"
      })

      // Char 6: Full Welding (D only)
      const s6_d = getStageData("stage6")
      const s6Sig = getSignature("stage6")
      characteristics.push({
        sr: "6",
        title: "Inspection after full Welding",
        rows: [
          { detail: "Visual Inspection", value: s6_d.visualInspection || "OK / Not OK" },
          { detail: "Welder No.", value: s6_d.welderNo || s6_d.welderNumber || "" },
          { detail: "Fillet size", value: s6_d.filletSize || "" }
        ],
        sig: s6Sig,
        qcType: "QC"
      })

      // Char 7: RF Pad (D only)
      const s7_d = getStageData("stage7")
      const s7Sig = getSignature("stage7")
      characteristics.push({
        sr: "7",
        title: "R.F. Pad Pneumatic (Applicable / Not Applicable)",
        rows: [
          { detail: s7_d.rfPadPneumatic || "OK / Not OK", value: "" }
        ],
        sig: s7Sig,
        qcType: "QC"
      })
    }
  } else {
    // F-specific: simplified
    characteristics.push({
      sr: "1b",
      title: "",
      rows: [{ detail: "Tack Welder", value: s1.tackWelder || "" }],
      sig: s1Sig,
      qcType: "QC",
      noSig: true
    })

    const s2_f = getStageData("stage2")
    const s2Sig = getSignature("stage2")
    characteristics.push({
      sr: "2",
      title: "Weld Visual",
      rows: [
        { detail: "Welder Number", value: s2_f.welderNumber || s2_f.welderNo || "" },
        { detail: "Welding Process", value: s2_f.weldingProcess || "" }
      ],
      sig: s2Sig,
      qcType: "QC"
    })

    // PWHT stages for F
    if (hasStage("stage3")) {
      const s3Sig = getSignature("stage3")
      characteristics.push({
        sr: "3",
        title: "PWHT - Radiography Testing (RT)",
        rows: [{ detail: "Required / Not required", value: "" }],
        sig: s3Sig,
        qcType: "NDT"
      })
    }
    if (hasStage("stage4")) {
      const s4Sig = getSignature("stage4")
      characteristics.push({
        sr: "4",
        title: "PWHT - Penetrant Testing (PT)",
        rows: [{ detail: "Required / Not required", value: "" }],
        sig: s4Sig,
        qcType: "NDT"
      })
    }
  }

  return (
    <div>
      {/* ===== HEADER: Title + Report No ===== */}
      <table className="wpj-grid-table" style={{ marginBottom: 0 }}>
        <tbody>
          <tr>
            <td style={{ width: "30%", textAlign: "center", fontWeight: 700, fontSize: 12, padding: "12px 8px" }}>
              <span style={{ color: "#000080" }}>Shreno Engineering Limited</span>
            </td>
            <td style={{ width: "70%" }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#FF0000", textAlign: "center", paddingBottom: 4 }}>
                GENERAL INSPECTION REPORT
              </div>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#FF0000", textAlign: "center" }}>
                (CHECK SHEET FOR
              </div>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#FF0000", textAlign: "center" }}>
                NOZZLE SET-UP & WELDING INSPECTION)
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Header Metadata Table */}
      <table className="wpj-grid-table" style={{ marginBottom: 12 }}>
        <tbody className="header-meta">
          <tr>
            <td className="label-cell" style={{ width: "40%", color: "#FF0000" }}>Shreno Manufacturer sr. no.:</td>
            <td>{job.job_number || "-"}</td>
          </tr>
          <tr>
            <td className="label-cell" style={{ color: "#FF0000" }}>Equipment Name & Tag Number:</td>
            <td>{`${job.equipement_name || ""} ${job.tag_number || ""}`.trim() || "-"}</td>
          </tr>
          <tr>
            <td className="label-cell" style={{ color: "#FF0000" }}>Drawing no. :</td>
            <td>{plan.customer_drg_no || "-"}</td>
          </tr>
        </tbody>
      </table>

      {/* Main Characteristics Table */}
      <table className="wpj-grid-table">
        <thead>
          <tr style={{ backgroundColor: "#f5f5f5" }}>
            <th style={{ width: "7%" }}>Sr. No.</th>
            <th style={{ width: "30%" }}>Characteristics to be checked</th>
            <th style={{ width: "35%" }}></th>
            <th style={{ width: "28%" }}></th>
          </tr>
          <tr>
            <td></td>
            <td className="label-cell" style={{ color: "#FF0000" }}>Nozzle Number</td>
            <td>{jointData.joint_no || "-"}</td>
            <td></td>
          </tr>
        </thead>
        <tbody>
          {characteristics.map((char, cIdx) => (
            <CharacteristicGroup key={cIdx} char={char} />
          ))}
        </tbody>
      </table>

      <p style={{ fontSize: 11, fontWeight: 600, marginTop: 12 }}>NOTE: All Dimensions Are in MM</p>
    </div>
  )
}

// ==========================================
// Characteristic group component
// ==========================================
function CharacteristicGroup({ char }) {
  return (
    <>
      {char.rows.map((row, rIdx) => (
        <tr key={`${char.sr}-${rIdx}`}>
          <td style={{ textAlign: "center", fontWeight: 600 }}>
            {rIdx === 0 ? (char.sr === "1b" ? "" : char.sr) : ""}
          </td>
          <td className="label-cell" style={{ whiteSpace: "pre-wrap", color: "#FF0000" }}>
            {rIdx === 0 ? char.title : ""}
          </td>
          <td style={{ whiteSpace: "pre-wrap", color: "#FF0000", fontWeight: 600 }}>{row.detail}</td>
          <td>{row.value}</td>
        </tr>
      ))}
      {!char.noSig && char.sig && (
        <>
          <tr>
            <td></td>
            <td className="sig-label" style={{ color: "#FF0000" }}>Engineer Production  Dated Signature</td>
            <td className="sig-value" colSpan={2}>
              {char.sig.prodName} {char.sig.prodDate ? `/ ${char.sig.prodDate}` : ""}
            </td>
          </tr>
          <tr>
            <td></td>
            <td className="sig-label" style={{ color: "#FF0000" }}>Engineer Shop {char.qcType}  Dated Signature</td>
            <td className="sig-value" colSpan={2}>
              {char.sig.qcName} {char.sig.qcDate ? `/ ${char.sig.qcDate}` : ""}
              {char.sig.status === "approved" ? " / Approve" : ""}
            </td>
          </tr>
          <tr>
            <td></td>
            <td className="sig-label" style={{ color: "#FF0000" }}>CLIENT / AI /TPIA  Dated Signature</td>
            <td className="sig-value"></td>
            <td className="sig-value">Yes/No</td>
          </tr>
        </>
      )}
    </>
  )
}

// ==========================================
// Signature rows component for Seam Welding (A/B)
// ==========================================
function SignatureRows({ sig, qcTitle }) {
  return (
    <>
      <tr>
        <td className="label-cell">Production Engineer</td>
        <td>Name</td>
        <td>{sig.prodName || ""}</td>
        <td></td>
      </tr>
      <tr>
        <td></td>
        <td>Date</td>
        <td>{sig.prodDate || ""}</td>
        <td></td>
      </tr>
      <tr>
        <td className="label-cell">{qcTitle}</td>
        <td>Name</td>
        <td>{sig.qcName || ""}</td>
        <td></td>
      </tr>
      <tr>
        <td></td>
        <td>Date</td>
        <td>{sig.qcDate || ""}</td>
        <td></td>
      </tr>
      <tr>
        <td></td>
        <td>Sign</td>
        <td>{sig.status === "approved" ? "Approve" : ""}</td>
        <td></td>
      </tr>
      <tr>
        <td className="label-cell">AI / CLIENT / TPIA</td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    </>
  )
}

