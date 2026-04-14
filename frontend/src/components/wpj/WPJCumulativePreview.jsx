import { useState, useEffect, useRef } from "react"
import apiClient from "@/api/api.client"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Printer, Download, CheckCircle2, Loader2 } from "lucide-react"

// AB Components
import Stage1 from "@/components/form/ab/stage1"
import Stage2 from "@/components/form/ab/Stage2"
import Stage3 from "@/components/form/ab/Stage3"
import Stage4 from "@/components/form/ab/stage4"
import Stage5 from "@/components/form/ab/stage5"
import Stage6 from "@/components/form/ab/stage6"
import Stage7 from "@/components/form/ab/Stage7"

// Category C
import Stage1C from "@/components/form/c/Stage1"
import Stage2C from "@/components/form/c/Stage2"
import Stage3C from "@/components/form/c/Stage3C"
import Stage4C from "@/components/form/c/Stage4"
import Stage5C from "@/components/form/c/Stage5"

// Category D
import Stage1D from "@/components/form/d/Stage1"
import Stage2D from "@/components/form/d/Stage2"
import Stage3D from "@/components/form/d/Stage3"
import Stage4D from "@/components/form/d/Stage4"
import Stage5D from "@/components/form/d/Stage5"
import Stage6D from "@/components/form/d/Stage6"
import Stage7D from "@/components/form/d/Stage7"
import Stage8D from "@/components/form/d/Stage8"
import Stage9D from "@/components/form/d/Stage9"

// Category F
import Stage1F from "@/components/form/f/Stage1"
import Stage2F from "@/components/form/f/Stage2"
import Stage3F from "@/components/form/f/Stage3"
import Stage4F from "@/components/form/f/Stage4"

const componentMap = {
  Stage1, Stage2, Stage3, Stage4, Stage5, Stage6, Stage7,
  Stage1C, Stage2C, Stage3C, Stage4C, Stage5C,
  Stage1D, Stage2D, Stage3D, Stage4D, Stage5D, Stage6D, Stage7D, Stage8D, Stage9D,
  Stage1F, Stage2F, Stage3F, Stage4F
}

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

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = async () => {
    if (!jointData) return
    setDownloading(true)
    try {
      const dateTime = new Date().toISOString().replace(/:/g, '-').split('.')[0]
      const filename = `Complete_Report_${jointData.joint_no}_${dateTime}.pdf`
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
        headers: {
          "Authorization": token ? `Bearer ${token}` : ""
        },
        credentials: "include",
      })
      if (!response.ok) throw new Error("Download failed")
      const blob = await response.blob()
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

  // Map raw joint data to the format stage components expect
  const mappedInitialData = {
    id: jointData.id,
    msnNumber: job.job_number || "",
    client: job.customer?.customer_name || "",
    poNo: job.po?.po_number || "",
    tagNo: job.tag_number || "",
    equipment: job.equipement_name || "",
    projectsId: job.project_id || "",
    lindeDrgNo: plan.shreno_drg_no || "",
    drgNo: plan.customer_drg_no || "",
    code: job.code || "",
    jointNo: jointData.joint_no || "",
    jointCategory: jointData.joint_type || "",
    joint_type: jointData.joint_type || "",
    back_chip_req: jointData.back_chip_req || false,
    inspectionData: jointData.weld_joint_inspection || {},
  }

  return (
    <div className="cumulative-preview-container">
      {/* Toolbar - Hidden in print */}
      <div className="flex items-center justify-between mb-6 print:hidden sticky top-0 bg-background z-10 py-3 border-b">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm px-3 py-1">
            Category {category}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {approvedStages.length} of {approvedStages.length} approved stage{approvedStages.length !== 1 ? 's' : ''} shown
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button size="sm" onClick={handleDownload} disabled={downloading}>
            <Download className="h-4 w-4 mr-2" />
            {downloading ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Header Info */}
      <div ref={printRef} className="space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border mb-6 print:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase">MSN / Job No</p>
            <p className="text-sm font-semibold">{job.job_number || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase">Client</p>
            <p className="text-sm font-semibold">{job.customer?.customer_name || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase">Joint No</p>
            <p className="text-sm font-semibold">{jointData.joint_no || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase">Equipment</p>
            <p className="text-sm font-semibold">{job.equipement_name || "-"}</p>
          </div>
        </div>

        {/* All Approved Stages */}
        {approvedStages.map((stageInfo, index) => {
          const StageComponent = componentMap[stageInfo.component]
          if (!StageComponent) return null

          return (
            <div key={stageInfo.id} className="mb-8 print:break-before-page">
              {/* Stage Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-100 text-green-700 font-bold text-sm shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{stageInfo.label}</h3>
                  <p className="text-xs text-muted-foreground">
                    Stage {stageInfo.id.replace('stage', '')} • Approved ✓
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  Approved
                </Badge>
              </div>

              {/* Stage Component in ReadOnly mode */}
              <div className="border rounded-lg p-4 bg-card">
                <StageComponent
                  initialData={mappedInitialData}
                  inspectionData={mappedInitialData.inspectionData}
                  isReview={false}
                  readOnly={true}
                  stage={stageInfo.id}
                  onSuccess={() => {}}
                />
              </div>

              {index < approvedStages.length - 1 && (
                <Separator className="my-8" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
