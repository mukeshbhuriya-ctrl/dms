import React, { useState, useEffect } from "react"
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
import { FormAlert } from "@/components/ui/form-alert"
import api from "@/api/api.client"

function Stage2({ initialData, isReview = false, isUpdate = false, stage = "stage2", onSuccess }) {
  const [productionEngineerName, setProductionEngineerName] = useState("")
  const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString())
  const [backChipQcEngineer, setBackChipQcEngineer] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userRole, setUserRole] = useState("")
  const [qcEngineers, setQcEngineers] = useState([])
  const [productionGroups, setProductionGroups] = useState([])
  const [selectedProdGroupId, setSelectedProdGroupId] = useState("")

  const [alert, setAlert] = useState({ show: false, type: 'success', message: '' })

  const sPrefix = stage.replace('stage', 's');

  useEffect(() => {
    const authData = localStorage.getItem("user_auth")
    if (authData) {
      try {
        const parsed = JSON.parse(authData)
        const user = parsed?.payload?.user || parsed?.user
        if (user?.name) {
          if (!isReview) setProductionEngineerName(user.name)
        }
        const roles = parsed?.payload?.roles || parsed?.payload?.user?.roles || []
        const roleNames = roles.map(r => (typeof r === 'object' && r.name) ? r.name : r);
        if (roleNames.some(r => ['QC_ENGINEER', 'NDT_ENGINEER'].includes(r))) {
          setUserRole('QC')
        } else {
          setUserRole('PROD')
        }
      } catch (e) {
        console.error("Error parsing auth data", e)
      }
    }
  }, [isReview])

  useEffect(() => {
    const fetchProductionGroups = async () => {
      try {
        const response = await api.get('/api/employee-groups/type/PRODUCTION');
        if (response.success) setProductionGroups(response.data || []);
      } catch (error) {
        console.error("Error fetching production groups:", error);
      }
    }
    fetchProductionGroups();
  }, [])

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

  const getCategoryKey = () => {
    return initialData?.jointCategory?.toLowerCase() || initialData?.joint_type?.toLowerCase() || 'c';
  }

  useEffect(() => {
    if (initialData?.inspectionData) {
      const categoryKey = getCategoryKey();
      const inspectionData = initialData.inspectionData;

      if (inspectionData[`${sPrefix}_qc_engineer_id`]) {
        setBackChipQcEngineer(inspectionData[`${sPrefix}_qc_engineer_id`]);
      }
      if (inspectionData[`${sPrefix}_prod_eng_name`]) {
        setProductionEngineerName(inspectionData[`${sPrefix}_prod_eng_name`]);
      }

      if (inspectionData[`${sPrefix}_data`]) {
        try {
          const rawData = typeof inspectionData[`${sPrefix}_data`] === 'string' ? JSON.parse(inspectionData[`${sPrefix}_data`]) : inspectionData[`${sPrefix}_data`];
          const sbcData = rawData?.[categoryKey]?.[sPrefix] || rawData?.[categoryKey] || rawData || {};

          if (sbcData?.productionEngineerName) setProductionEngineerName(sbcData.productionEngineerName);
          if (sbcData?.submissionDate) setTodayDate(sbcData.submissionDate);
          if (!inspectionData[`${sPrefix}_qc_engineer_id`] && sbcData?.qcEngineerId) {
            setBackChipQcEngineer(sbcData.qcEngineerId);
          }
        } catch (e) { console.error(`Error parsing ${sPrefix}_data`, e) }
      }
    }
  }, [initialData])

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setAlert({ show: false, type: '', message: '' });
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

      if (!backChipQcEngineer) {
        setAlert({ show: true, type: 'error', message: "Please select QC Engineer" });
        setIsSubmitting(false);
        return;
      }

      const categoryKey = getCategoryKey();

      let existingData = {};
      if (initialData?.inspectionData?.[`${sPrefix}_data`]) {
        existingData = typeof initialData.inspectionData[`${sPrefix}_data`] === 'string'
          ? JSON.parse(initialData.inspectionData[`${sPrefix}_data`])
          : initialData.inspectionData[`${sPrefix}_data`];
      }

      const currentStageData = {
        productionEngineerName,
        submissionDate: todayDate,
        qcEngineerId: backChipQcEngineer
      };

      const finalData = {
        ...existingData,
        [categoryKey]: {
          ...existingData[categoryKey],
          [sPrefix]: currentStageData
        }
      };

      const payload = {
        jointId: initialData?.id,
        stage: stage,
        status: "pending",
        engineerId: userId,
        role: role,
        data: finalData
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
        setAlert({ show: true, type: 'success', message: "Back Chip submitted successfully" });
        setTimeout(() => { if (onSuccess) onSuccess(); }, 1500);
      } else {
        setAlert({ show: true, type: 'error', message: data.message || "Submission failed" });
      }

    } catch (error) {
      console.error(error);
      setAlert({ show: true, type: 'error', message: "Error submitting form" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleReviewAction = async (status) => {
    setIsSubmitting(true);
    setAlert({ show: false, type: '', message: '' });
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

      if (userRole === 'QC' && status === 'approved') {
        const categoryKey = getCategoryKey();

        let existingData = {};
        if (initialData?.inspectionData?.[`${sPrefix}_data`]) {
          existingData = typeof initialData.inspectionData[`${sPrefix}_data`] === 'string'
            ? JSON.parse(initialData.inspectionData[`${sPrefix}_data`])
            : initialData.inspectionData[`${sPrefix}_data`];
        }

        const currentStageData = {
          productionEngineerName,
          submissionDate: todayDate,
          qcEngineerId: backChipQcEngineer
        };

        const finalData = {
          ...existingData,
          [categoryKey]: {
            ...existingData[categoryKey],
            [sPrefix]: currentStageData
          }
        };

        await fetch(`${backendUrl}/api/wpj/update-stage-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
          body: JSON.stringify({
            jointId: initialData?.id,
            stage: stage,
            status: status,
            engineerId: userId,
            role: 'QC',
            data: finalData
          }),
          credentials: "include",
        });
      }

      const payload = {
        jointId: initialData?.id,
        stage: stage,
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
        setAlert({ show: true, type: 'success', message: `Back Chip ${status} successfully` });
        setTimeout(() => { if (onSuccess) onSuccess(); }, 1500);
      } else {
        setAlert({ show: true, type: 'error', message: data.message || "Review action failed" });
      }
    } catch (error) {
      console.error(error);
      setAlert({ show: true, type: 'error', message: "Error processing review" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="mb-8">
        <div>
          {/* Basic Information Section */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-lg">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Shreno Manufacturer sr. no.</label>
                <Input value={initialData?.msnNumber || ""} className="bg-slate-50 text-slate-500 h-8 text-xs shadow-none border-slate-200 rounded-none" placeholder="MSN" readOnly />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Equipment Name & Tag Number</label>
                <Input value={`${initialData?.equipment || ""} ${initialData?.tagNo || ""}`} readOnly className="bg-slate-50 text-slate-500 h-8 text-xs shadow-none border-slate-200 rounded-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Drawing no. </label>
                <Input value={initialData?.drgNo || ""} readOnly className="bg-slate-50 text-slate-500 h-8 text-xs shadow-none border-slate-200 rounded-none" />
              </div>
            </div>
          </div>

          <div className="mb-4 border-b pb-2">
            <h3 className="text-sm font-bold text-slate-800 capitalize tracking-wider">
              Back chip
              {initialData?.back_chip_req && (
                <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                  Yes
                </span>
              )}
            </h3>
          </div>
          {/* Back chip Status Update Section */}
          <div className="space-y-4 pt-4 border-t">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider" htmlFor="productionGroup">Production Group</label>
                <Select value={selectedProdGroupId} onValueChange={setSelectedProdGroupId} disabled={isReview}>
                  <SelectTrigger id="productionGroup" className="w-full h-8 text-xs shadow-none border-slate-200 rounded-none bg-white">
                    <SelectValue placeholder="Select Production Group" />
                  </SelectTrigger>
                  <SelectContent>
                    {productionGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name?.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Date</label>
                <Input
                  type="text"
                  value={initialData?.inspectionData?.[`${sPrefix}_submitted_at`] ? new Date(initialData.inspectionData[`${sPrefix}_submitted_at`]).toLocaleDateString() : todayDate}
                  readOnly
                  className="bg-slate-50 text-slate-500 h-8 text-xs shadow-none border-slate-200 rounded-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider" htmlFor="backChipQcEngineer">QC Engineer Name</label>
                <Select
                  value={backChipQcEngineer}
                  onValueChange={setBackChipQcEngineer}
                  disabled={isReview}
                >
                  <SelectTrigger className="w-full h-8 text-xs shadow-none border-slate-200 rounded-none bg-white">
                    <SelectValue placeholder="Select QC Engineer" />
                  </SelectTrigger>
                  <SelectContent>
                    {qcEngineers.map((engineer) => (
                      <SelectItem key={engineer.id} value={engineer.id}>
                        {engineer.name?.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 items-center">
            {!isReview ? (
              <Button onClick={() => handleSubmit()} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : isUpdate ? "Update Report" : "Submit Report"}
              </Button>
            ) : (
              <>
                {(isReview || initialData?.inspectionData?.[`${sPrefix}_approved_at`]) && (
                  <Input
                    type="text"
                    value={`Approve Date: ${initialData?.inspectionData?.[`${sPrefix}_approved_at`] ? new Date(initialData.inspectionData[`${sPrefix}_approved_at`]).toLocaleDateString() : new Date().toLocaleDateString()}`}
                    readOnly
                    className="bg-slate-50 text-slate-500 w-auto min-w-[200px] text-center h-9 font-medium h-8 text-xs shadow-none border-slate-200 rounded-none"
                    placeholder="Approve Date"
                  />
                )}
                <Button onClick={() => handleReviewAction('rejected')} variant="outline" disabled={isSubmitting}>
                  {isSubmitting ? "Processing..." : "Reject"}
                </Button>
                <Button onClick={() => handleReviewAction('approved')} className="bg-black hover:bg-gray-800 text-white" disabled={isSubmitting}>
                  {isSubmitting ? "Processing..." : "Approve"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Stage2;




