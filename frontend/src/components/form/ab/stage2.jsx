import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card"


function Stage2({ backChip = false, stage = "stage2", initialData, inspectionData, isReview = false }) {
  // Back chip section
  // Back chip section
  const [productionEngineerName, setProductionEngineerName] = useState("")
  const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString())
  const [backChipQcEngineer, setBackChipQcEngineer] = useState("")

  useEffect(() => {
    if (isReview) return;
    const authData = localStorage.getItem("user_auth")
    if (authData) {
      try {
        const parsed = JSON.parse(authData)
        const user = parsed?.payload?.user || parsed?.user
        if (user?.name) {
          setProductionEngineerName(user.name)
        }
      } catch (e) {
        console.error("Error parsing auth data", e)
      }
    }
  }, [])

  // Weld Visual Inspection section
  const [weldVisualQcEngineer, setWeldVisualQcEngineer] = useState("")
  const [welderNo, setWelderNo] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Mock QC Engineers data - In real app, fetch this or pass as prop
  const [qcEngineers, setQcEngineers] = useState([])

  useEffect(() => {
    const fetchQcEngineers = async () => {
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

        const res = await fetch(`${backendUrl}/api/users/by-role/QC_ENGINEER`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
          },
          credentials: "include",
        })
        const data = await res.json()
        if (res.ok && data.success) {
          setQcEngineers(data.data || [])
        } else {
          console.error("Failed to fetch QC Engineers:", data.message)
        }
      } catch (error) {
        console.error("Error fetching QC Engineers:", error)
      }
    }

    fetchQcEngineers()
  }, [])

  useEffect(() => {
    // autofill data if available in inspectionData
    if (inspectionData) {
      if (stage === 'stage2') {
        // Prioritize column data for QC, fallback to parsed data later if needed
        if (inspectionData.s2_qc_eng_id) {
          setBackChipQcEngineer(inspectionData.s2_qc_eng_id);
        }
        // Pre-fill Prod Name from injected data
        if (inspectionData.s2_prod_eng_name) {
          setProductionEngineerName(inspectionData.s2_prod_eng_name);
        }

        if (inspectionData.s2_data) {
          try {
            const s2Data = typeof inspectionData.s2_data === 'string' ? JSON.parse(inspectionData.s2_data) : inspectionData.s2_data;
            if (s2Data?.productionEngineerName) setProductionEngineerName(s2Data.productionEngineerName);
            if (s2Data?.submissionDate) setTodayDate(s2Data.submissionDate);
            // Fallback for QC ID if column data was missing
            if (!inspectionData.s2_qc_eng_id && s2Data?.assignedQcEngineerId) {
              setBackChipQcEngineer(s2Data.assignedQcEngineerId);
            }
          } catch (e) { console.error("Error parsing s2_data", e) }
        }
      }

      if (stage === 'stage3') {
        if (inspectionData.s3_qc_eng_id) setWeldVisualQcEngineer(inspectionData.s3_qc_eng_id);
        // Pre-fill Prod Name from injected data
        if (inspectionData.s3_prod_eng_name) {
          setProductionEngineerName(inspectionData.s3_prod_eng_name);
        }

        let loadedWelderNo = inspectionData.s3_welder_no || "";

        if (inspectionData.s3_data) {
          try {
            const savedData = typeof inspectionData.s3_data === 'string'
              ? JSON.parse(inspectionData.s3_data)
              : inspectionData.s3_data;
            if (savedData?.welderNo) {
              loadedWelderNo = savedData.welderNo;
            }
            if (savedData?.productionEngineerName) setProductionEngineerName(savedData.productionEngineerName);
            if (savedData?.submissionDate) setTodayDate(savedData.submissionDate);

            if (!inspectionData.s3_qc_eng_id && savedData?.assignedQcEngineerId) {
              setWeldVisualQcEngineer(savedData.assignedQcEngineerId);
            }
          } catch (e) {
            console.error("Error parsing s3_data", e);
          }
        }

        if (loadedWelderNo) setWelderNo(loadedWelderNo);
      }
    }
  }, [inspectionData, stage]);

  // For stage3 with backChip: true, show Weld Visual Inspection section only
  // For stage2: backChip: true shows Back chip, backChip: false shows Weld Visual Inspection
  const shouldShowBackChipSection =
    stage === "stage2" && backChip === true
  const shouldShowWeldVisualSection =
    (stage === "stage2" && backChip === false) ||
    (stage === "stage3" && backChip === true)

  const handleSubmit = async (currentStage) => {
    setIsSubmitting(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
      const authData = localStorage.getItem("user_auth")
      let token = null
      let userId = null;
      let role = 'PROD';

      if (authData) {
        const parsed = JSON.parse(authData)
        token = parsed?.payload?.token || parsed?.token
        userId = parsed?.payload?.user?.id || parsed?.user?.id
      }

      const payload = {
        jointId: initialData?.id,
        stage: currentStage,
        status: "pending",
        engineerId: userId,
        role: role,
        data: {}
      }

      if (currentStage === 'stage2') {
        if (!backChipQcEngineer) {
          alert("Please select QC Engineer");
          setIsSubmitting(false);
          return;
        }
        payload.data = {
          assignedQcEngineerId: backChipQcEngineer,
          productionEngineerName: productionEngineerName,
          submissionDate: todayDate
        };
      }

      if (currentStage === 'stage3') {
        payload.data = {
          welderNo,
          assignedQcEngineerId: weldVisualQcEngineer,
          productionEngineerName: productionEngineerName,
          submissionDate: todayDate
        };
      }

      const res = await fetch(`${backendUrl}/api/wpj/update-stage-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const data = await res.json();
      if (res.ok) {
        alert(`${currentStage} submitted successfully`);
        window.location.reload();
      } else {
        alert(data.message || "Submission failed");
      }

    } catch (error) {
      console.error(error);
      alert("Error submitting form");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleReviewAction = async (status, currentStage) => {
    setIsSubmitting(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
      const authData = localStorage.getItem("user_auth")
      let token = null
      let userId = null;
      const role = 'QC';

      if (authData) {
        const parsed = JSON.parse(authData)
        token = parsed?.payload?.token || parsed?.token
        userId = parsed?.payload?.user?.id || parsed?.user?.id
      }

      const payload = {
        jointId: initialData?.id,
        stage: currentStage,
        status: status,
        engineerId: userId,
        role: role
      }

      const res = await fetch(`${backendUrl}/api/wpj/review-stage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const data = await res.json();
      if (res.ok) {
        alert(`${currentStage} ${status} successfully`);
        window.location.reload();
      } else {
        alert(data.message || "Review action failed");
      }
    } catch (error) {
      console.error(error);
      alert("Error processing review");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full mx-auto p-6 space-y-6">
      {/* Section 1: Back chip - Only show for stage2 with backChip = true */}
      {shouldShowBackChipSection && (
        <Card>
          <CardHeader>
            <CardTitle>Back chip</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Production Engineer Name:</Label>
                <Input
                  type="text"
                  value={productionEngineerName}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>Date:</Label>
                <Input
                  type="text"
                  value={todayDate}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="backChipQcEngineer">QC Engineer Name:</Label>
                <Select
                  value={backChipQcEngineer}
                  onValueChange={setBackChipQcEngineer}
                  disabled={isReview}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select QC Engineer" />
                  </SelectTrigger>
                  <SelectContent>
                    {qcEngineers.map((engineer) => (
                      <SelectItem key={engineer.id} value={engineer.id}>
                        {engineer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              {!isReview ? (
                <Button onClick={() => handleSubmit('stage2')} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save & Complete Stage 2"}
                </Button>
              ) : (
                <>
                  <Button onClick={() => handleReviewAction('rejected', 'stage2')} variant="outline" disabled={isSubmitting}>
                    {isSubmitting ? "Processing..." : "Reject"}
                  </Button>
                  <Button onClick={() => handleReviewAction('approved', 'stage2')} className="bg-black hover:bg-gray-800 text-white" disabled={isSubmitting}>
                    {isSubmitting ? "Processing..." : "Approve"}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 2: Weld Visual Inspection by - Show for stage2 with backChip = false OR stage3 with backChip = true */}
      {shouldShowWeldVisualSection && (
        <Card>
          <CardHeader>
            <CardTitle>Weld Visual Inspection by</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Production Engineer Name:</Label>
                <Input
                  type="text"
                  value={productionEngineerName}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>Date:</Label>
                <Input
                  type="text"
                  value={todayDate}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weldVisualQcEngineer">QC Engineer Name:</Label>
                <Select
                  value={weldVisualQcEngineer}
                  onValueChange={setWeldVisualQcEngineer}
                  disabled={isReview}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select QC Engineer" />
                  </SelectTrigger>
                  <SelectContent>
                    {qcEngineers.map((engineer) => (
                      <SelectItem key={engineer.id} value={engineer.id}>
                        {engineer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="welderNo">Welder No.:</Label>
                <Input
                  id="welderNo"
                  type="text"
                  value={welderNo}
                  onChange={(e) => setWelderNo(e.target.value)}
                  placeholder="Enter Welder No."
                  readOnly={isReview}
                  className={isReview ? "bg-muted" : ""}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              {!isReview ? (
                <Button onClick={() => handleSubmit('stage3')} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save & Complete Stage 3"}
                </Button>
              ) : (
                <>
                  <Button onClick={() => handleReviewAction('rejected', 'stage3')} variant="outline" disabled={isSubmitting}>
                    {isSubmitting ? "Processing..." : "Reject"}
                  </Button>
                  <Button onClick={() => handleReviewAction('approved', 'stage3')} className="bg-black hover:bg-gray-800 text-white" disabled={isSubmitting}>
                    {isSubmitting ? "Processing..." : "Approve"}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Stage2
