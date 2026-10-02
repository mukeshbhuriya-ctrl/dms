import WpjService from '@/services/wpj.service';
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
import { FormAlert } from "@/components/ui/form-alert"
import api from "@/api/api.client"
import QCReviewSection from "@/components/wpj/QCReviewSection"

function Stage4({ initialData, inspectionData, isReview = false, isUpdate = false, readOnly = false, onSuccess }) {
    
    const [qcGroups, setQcGroups] = useState([]);
    const [productionGroups, setProductionGroups] = useState([]);

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const [qcRes, prodRes, myGroupsRes] = await Promise.all([
                    WpjService.getEmployeeGroups('QUALITY'),
                    WpjService.getEmployeeGroups('PRODUCTION'),
                    WpjService.getMyGroups()
                ]);
                if (qcRes?.success) setQcGroups(qcRes.data || []);
                if (prodRes?.success) setProductionGroups(prodRes.data || []);
                
                if (myGroupsRes?.success && myGroupsRes.data) {
                    const myQcGroup = myGroupsRes.data.find(g => g.group_type === 'QUALITY' || g.type === 'QUALITY');
                    const myProdGroup = myGroupsRes.data.find(g => g.group_type === 'PRODUCTION' || g.type === 'PRODUCTION');
                    
                    // QC Group is intentionally NOT auto-selected based on user request
                    if (myProdGroup) {
                        setSelectedProdGroupId(prev => prev || myProdGroup.id);
                    }
                }
            } catch (err) {
                console.error("Error fetching groups:", err);
            }
        };
        fetchGroups();
    }, []);

    const [productionEngineerName, setProductionEngineerName] = useState("")
    const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString())
    const [selectedQcGroupId, setSelectedQcGroupId] = useState("")
    const [selectedProdGroupId, setSelectedProdGroupId] = useState("");
    const [qcRemarks, setQcRemarks] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [userRole, setUserRole] = useState("")
    const [rtStatus, setRtStatus] = useState("")
    const [rtRemark, setRtRemark] = useState("")

    // Basic Info State
    const [displayFields, setDisplayFields] = useState({
        msn: "",
        client: "",
        poNo: "",
    })

    const [inputFields, setInputFields] = useState({
        reportNo: "",
        tagNo: "",
        equipment: "",
        projectsId: "",
        lindeDrgNo: "",
        drgNo: "",
        code: "",
        inspAgency: "",
    })

    useEffect(() => {
        const authData = localStorage.getItem("user_auth")
        if (authData) {
            try {
                const parsed = JSON.parse(authData)
                const user = parsed?.payload?.user || parsed?.user
                if (user?.name) {
                    if (!isReview) setProductionEngineerName(user.name)
                }
                // Extract role for QC check
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

    // Populate Basic Info
    useEffect(() => {
        if (initialData) {
            setDisplayFields({
                msn: initialData.msnNumber || "",
                client: initialData.client || "",
                poNo: initialData.poNo || "",
            })

            // Fetch dynamic report NO from dedicated API if not already present in inspection data
            if (!initialData.inspectionData?.reportNo) {
                api.get(`/api/wpj/report-no/${initialData.id}`).then(res => {
                    if (res.success && res.reportNo) {
                        setInputFields(prev => ({ ...prev, reportNo: res.reportNo }));
                    }
                }).catch(err => console.error("Error fetching report no", err));
            }

            setInputFields((prev) => ({
                ...prev,
                reportNo: initialData.inspectionData?.reportNo || prev.reportNo || "",
                tagNo: initialData.tagNo || "",
                equipment: initialData.equipment || "",
                projectsId: initialData.projectsId || "",
                lindeDrgNo: initialData.lindeDrgNo || "",
                drgNo: initialData.drgNo || "",
                code: initialData.code || "",
            }))
        }
    }, [initialData])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setInputFields((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    const handleDisplayFieldChange = (e) => {
        const { name, value } = e.target
        setDisplayFields((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    
    useEffect(() => {
        const fetchQcGroups = async () => {
            try {
                const response = await api.get('/api/employee-groups');
                if (response && response.success) {
                    setQcGroups(response.data || []);
                }
            } catch (error) {
                console.error("Error fetching QC groups:", error);
            }
        };
        fetchQcGroups();
    }, []);

    // Helper to determine category key
    const getCategoryKey = () => {
        return initialData?.jointCategory?.toLowerCase() || initialData?.joint_type?.toLowerCase() || 'a';
    }

    useEffect(() => {
        if (inspectionData) {
            const categoryKey = getCategoryKey();

            // 1. Load Basic Info (from data_json)
            if (inspectionData.data_json) {
                try {
                    const rawBasic = typeof inspectionData.data_json === 'string' ? JSON.parse(inspectionData.data_json) : inspectionData.data_json;
                    const basicInfo = rawBasic?.[categoryKey] || {};

                    setInputFields(prev => ({
                        ...prev,
                        reportNo: basicInfo.reportNo || prev.reportNo,
                        tagNo: basicInfo.tagNo || prev.tagNo,
                        equipment: basicInfo.equipment || prev.equipment,
                        projectsId: basicInfo.projectsId || prev.projectsId,
                        lindeDrgNo: basicInfo.lindeDrgNo || prev.lindeDrgNo,
                        drgNo: basicInfo.drgNo || prev.drgNo,
                        code: basicInfo.code || prev.code,
                        inspAgency: basicInfo.inspAgency || prev.inspAgency,
                    }));
                } catch (e) { console.error("Error parsing data_json", e) }
            }

            if (inspectionData.s4_qc_group_id) {
                setSelectedQcGroupId(inspectionData.s4_qc_group_id);
              }
              if (inspectionData.s4_production_group_id && !selectedProdGroupId) {
                setSelectedProdGroupId(inspectionData.s4_production_group_id);
              }
            if (inspectionData.s4_prod_eng_name) {
                setProductionEngineerName(inspectionData.s4_prod_eng_name);
            }
            if (inspectionData.s4_remarks) {
                setQcRemarks(inspectionData.s4_remarks);
            }

            if (inspectionData.s4_data) {
                try {
                    const rawData = typeof inspectionData.s4_data === 'string' ? JSON.parse(inspectionData.s4_data) : inspectionData.s4_data;
                    const s4Data = rawData?.[categoryKey]?.s4 || rawData?.[categoryKey] || rawData || {};

                    if (s4Data?.productionEngineerName) setProductionEngineerName(s4Data.productionEngineerName);
                    if (s4Data?.submissionDate) setTodayDate(s4Data.submissionDate);
                    
                    if (inspectionData.s4_qc_group_id) {
                setSelectedQcGroupId(inspectionData.s4_qc_group_id);
              }
              if (inspectionData.s4_production_group_id && !selectedProdGroupId) {
                setSelectedProdGroupId(inspectionData.s4_production_group_id);
              } else if (s4Data?.qcGroupId) {
                        setSelectedQcGroupId(s4Data.qcGroupId);
            }
            if (s4Data.productionGroupId) setSelectedProdGroupId(s4Data.productionGroupId);

                    if (s4Data?.rtStatus) setRtStatus(s4Data.rtStatus);
                    if (s4Data?.rtRemark) setRtRemark(s4Data.rtRemark);
                } catch (e) { }
            }
        }
    }, [inspectionData, initialData]);

    // ReadOnly Condition: Review mode AND not QC
    const isReadOnly = readOnly || (isReview && userRole !== 'QC');

    const handleSubmit = async () => {
        setIsSubmitting(true)
        try {
            const authData = localStorage.getItem("user_auth")
            let token = null
            let userId = null;

            if (authData) {
                const parsed = JSON.parse(authData)
                token = parsed?.payload?.token || parsed?.token
                userId = parsed?.payload?.user?.id || parsed?.user?.id
            }

            if (!selectedQcGroupId) {
                setError("Please select QC Group for Stage 4");
                setIsSubmitting(false);
                return;
            }

       if (!selectedProdGroupId) {
         setError("Please select Production Group");
         setIsSubmitting(false);
         return;
       }

            const categoryKey = getCategoryKey();
            let existingData = {};
            if (initialData?.inspectionData?.s4_data) {
                existingData = typeof initialData.inspectionData.s4_data === 'string'
                    ? JSON.parse(initialData.inspectionData.s4_data)
                    : initialData.inspectionData.s4_data;
            }

            const currentStageData = {
                qcGroupId: selectedQcGroupId,
        productionGroupId: selectedProdGroupId,
                productionEngineerName,
                submissionDate: todayDate,
                rtStatus,
                rtRemark
            };

            const finalData = {
                ...existingData,
                [categoryKey]: {
                    ...existingData[categoryKey],
                    s4: currentStageData
                }
            };

            const basicInfo = {
                [categoryKey]: {
                    ...displayFields,
                    ...inputFields
                }
            };

            const payload = {
                jointId: initialData?.id,
                stage: "stage4",
                status: "pending",
                engineerId: userId,
                role: "PROD",
                data: finalData,
                basicInfo: basicInfo
            }

            const res = await api.post("/api/wpj/update-stage-status", payload);

            if (res.success) {
                setSuccess("Stage 4 (RT) submitted successfully");
                setTimeout(() => { if (onSuccess) onSuccess(); }, 1500);
            } else {
                setError(res.message || "Submission failed");
            }

        } catch (error) {
            console.error(error);
            setError("Error submitting form");
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleReviewAction = async (status) => {
        setIsSubmitting(true);
        setError("");
        setSuccess("");
        try {
            const authData = localStorage.getItem("user_auth")
            let userId = null;

            if (authData) {
                const parsed = JSON.parse(authData)
                userId = parsed?.payload?.user?.id || parsed?.user?.id
            }

            if (userRole === 'QC' && status === 'approved') {
                const categoryKey = getCategoryKey();
                let existingData = {};
                if (initialData?.inspectionData?.s4_data) {
                    existingData = typeof initialData.inspectionData.s4_data === 'string'
                        ? JSON.parse(initialData.inspectionData.s4_data)
                        : initialData.inspectionData.s4_data;
                }
                const currentStageData = {
                    qcGroupId: selectedQcGroupId,
        productionGroupId: selectedProdGroupId,
                    productionEngineerName,
                    submissionDate: todayDate,
                    rtStatus,
                    rtRemark
                };
                const finalData = {
                    ...existingData,
                    [categoryKey]: {
                        ...existingData[categoryKey],
                        s4: currentStageData
                    }
                };
                
                const basicInfo = {
                    [categoryKey]: {
                        ...displayFields,
                        ...inputFields
                    }
                };

                await api.post("/api/wpj/update-stage-status", {
                    jointId: initialData?.id,
                    stage: "stage4",
                    status: status,
                    engineerId: userId,
                    role: 'QC',
                    data: finalData,
                    basicInfo: basicInfo
                });
            }

            const res = await api.post("/api/wpj/review-stage", {
                jointId: initialData?.id,
                stage: "stage4",
                status: status,
                engineerId: userId,
                role: 'QC',
                remarks: qcRemarks
            });

            if (res.success) {
                setSuccess(`Stage 4 ${status} successfully`);
                setTimeout(() => { if (onSuccess) onSuccess(); }, 1500);
            } else {
                setError(res.message || "Review action failed");
            }
        } catch (error) {
            console.error(error);
            setError("Error processing review");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="w-full space-y-6">
            <FormAlert type="error" message={error} />
            <FormAlert type="success" message={success} />
            <div className="mb-8">
                <div className="mb-4 border-b pb-2">
          <h3 className="text-sm font-bold text-slate-800 capitalize tracking-wider">Basic Information</h3>
        </div>
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider" htmlFor="msn">MSN</label>
              <Input id="msn" name="msn" type="text" value={displayFields?.msn || ""} readOnly className="bg-slate-50 text-slate-500 h-8 text-xs shadow-none border-slate-200 rounded-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider" htmlFor="client">CLIENT</label>
              <Input id="client" name="client" type="text" value={displayFields?.client || ""} readOnly className="bg-slate-50 text-slate-500 h-8 text-xs shadow-none border-slate-200 rounded-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider" htmlFor="poNo">P.O. NO.</label>
              <Input id="poNo" name="poNo" type="text" value={displayFields?.poNo || ""} readOnly className="bg-slate-50 text-slate-500 h-8 text-xs shadow-none border-slate-200 rounded-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider" htmlFor="reportNo">Report No</label>
              <Input id="reportNo" name="reportNo" type="text" value={inputFields?.reportNo || ""} readOnly className="bg-slate-50 text-slate-500 h-8 text-xs shadow-none border-slate-200 rounded-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider" htmlFor="tagNo">TAG NO.</label>
              <Input id="tagNo" name="tagNo" type="text" value={inputFields?.tagNo || ""} onChange={handleInputChange} placeholder="Enter TAG NO." readOnly={isReadOnly} className={isReadOnly ? "bg-muted h-8 text-xs shadow-none border-slate-200 rounded-none bg-white" : "h-8 text-xs shadow-none border-slate-200 rounded-none bg-white"}/>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider" htmlFor="equipment">EQUIPMENT</label>
              <Input id="equipment" name="equipment" type="text" value={inputFields?.equipment || ""} onChange={handleInputChange} placeholder="Enter EQUIPMENT" readOnly={isReadOnly} className={isReadOnly ? "bg-muted h-8 text-xs shadow-none border-slate-200 rounded-none bg-white" : "h-8 text-xs shadow-none border-slate-200 rounded-none bg-white"}/>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider" htmlFor="projectsId">Projects ID</label>
              <Input id="projectsId" name="projectsId" type="text" value={inputFields?.projectsId || ""} onChange={handleInputChange} placeholder="Enter Projects ID" readOnly={isReadOnly} className={isReadOnly ? "bg-muted h-8 text-xs shadow-none border-slate-200 rounded-none bg-white" : "h-8 text-xs shadow-none border-slate-200 rounded-none bg-white"}/>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider" htmlFor="lindeDrgNo">CLIENT DRG.</label>
              <Input id="lindeDrgNo" name="lindeDrgNo" type="text" value={inputFields?.lindeDrgNo || ""} onChange={handleInputChange} placeholder="Enter CLIENT DRG." readOnly={isReadOnly} className={isReadOnly ? "bg-muted h-8 text-xs shadow-none border-slate-200 rounded-none bg-white" : "h-8 text-xs shadow-none border-slate-200 rounded-none bg-white"}/>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider" htmlFor="drgNo">SHRENO DRG NO.</label>
              <Input id="drgNo" name="drgNo" type="text" value={inputFields?.drgNo || ""} onChange={handleInputChange} placeholder="Enter SHRENO DRG NO." readOnly={isReadOnly} className={isReadOnly ? "bg-muted h-8 text-xs shadow-none border-slate-200 rounded-none bg-white" : "h-8 text-xs shadow-none border-slate-200 rounded-none bg-white"}/>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider" htmlFor="code">CODE</label>
              <Input id="code" name="code" type="text" value={inputFields?.code || ""} onChange={handleInputChange} placeholder="Enter CODE" readOnly={isReadOnly} className={isReadOnly ? "bg-muted h-8 text-xs shadow-none border-slate-200 rounded-none bg-white" : "h-8 text-xs shadow-none border-slate-200 rounded-none bg-white"}/>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider" htmlFor="inspAgency">INSP. AGENCY</label>
              <Input id="inspAgency" name="inspAgency" type="text" value={inputFields?.inspAgency || ""} onChange={handleInputChange} placeholder="Enter INSP. AGENCY" readOnly={isReadOnly} className={isReadOnly ? "bg-muted h-8 text-xs shadow-none border-slate-200 rounded-none bg-white" : "h-8 text-xs shadow-none border-slate-200 rounded-none bg-white"}/>
            </div>
          </div>
        </div>
            </div>
            <div className="mb-8">
                <div className="mb-4 border-b pb-2">
                    <h3 className="text-sm font-bold text-slate-800 capitalize tracking-wider">Radiography Testing (RT)</h3>
                </div>
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                value={initialData?.inspectionData?.s4_submitted_at ? new Date(initialData.inspectionData.s4_submitted_at).toLocaleDateString() : todayDate}
                                readOnly
                                className="bg-slate-50 text-slate-500 h-8 text-xs shadow-none border-slate-200 rounded-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">QC Group Name</label>
                            <Select value={selectedQcGroupId} onValueChange={setSelectedQcGroupId} disabled={isReview || readOnly}>
                                <SelectTrigger className="w-full h-8 text-xs shadow-none border-slate-200 rounded-none bg-white">
                                    <SelectValue placeholder="Select QC Group" />
                                </SelectTrigger>
                                <SelectContent>
                                    {qcGroups.map((group) => (
                                        <SelectItem key={group.id} value={group.id}>
                                            {group.name?.toUpperCase()}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider" htmlFor="rtStatus">RT Status</label>
                            <Select value={rtStatus} onValueChange={setRtStatus} disabled={isReadOnly}>
                                <SelectTrigger id="rtStatus" className="w-full h-8 text-xs shadow-none border-slate-200 rounded-none bg-white">
                                    <SelectValue placeholder="Select RT Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OK">OK</SelectItem>
                                    <SelectItem value="NOT OK">NOT OK</SelectItem>
                                    <SelectItem value="REPAIR">REPAIR</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider" htmlFor="rtRemark">RT Remark</label>
                            <Input
                                id="rtRemark"
                                type="text"
                                value={rtRemark}
                                onChange={(e) => setRtRemark(e.target.value)}
                                placeholder="Enter RT Remark"
                                disabled={isReadOnly}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Shared QC Review & Approval Section */}
            {true && (
              <QCReviewSection
                isReview={isReview}
                userRole={userRole}
                status={initialData?.inspectionData?.s4_status}
                remarks={qcRemarks}
                setRemarks={setQcRemarks}
                onAction={handleReviewAction}
                isSubmitting={isSubmitting}
                reviewDate={
                    initialData?.inspectionData?.s4_approved_at ? new Date(initialData.inspectionData.s4_approved_at).toLocaleString() :
                    initialData?.inspectionData?.s4_rejected_at ? new Date(initialData.inspectionData.s4_rejected_at).toLocaleString() : ""
                }
            />
            )}

            {!isReview && !readOnly && (
                <div className="mt-6 flex justify-end pb-2">
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="h-8 rounded-none bg-blue-600 hover:bg-blue-700 text-white shadow-none text-xs cursor-pointer">
                        {isSubmitting ? "Processing..." : isUpdate ? "Update Report" : "Submit Report"}
                    </Button>
                </div>
            )}
        </div>
    )
}

export default Stage4





