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

function Stage4({ initialData, inspectionData, isReview = false, isUpdate = false, isRejected = false, readOnly = false, stage = "stage4" , onSuccess }) {

    const [basicFields, setBasicFields] = useState({ equipment: "", tagNo: "", drgNo: "" });

    const handleBasicFieldChange = (e) => {
        const { name, value } = e.target;
        setBasicFields(prev => ({ ...prev, [name]: value }));
    };

    useEffect(() => {
        let info = null;
        
        if (initialData?.weld_joint_report_info) {
            info = initialData.weld_joint_report_info;
        } else if ((initialData?.inspectionData?.data_json || initialData?.weld_joint_inspection?.data_json)) {
            try {
                const rawData = typeof (initialData?.inspectionData?.data_json || initialData?.weld_joint_inspection?.data_json) === 'string' ? JSON.parse((initialData?.inspectionData?.data_json || initialData?.weld_joint_inspection?.data_json)) : (initialData?.inspectionData?.data_json || initialData?.weld_joint_inspection?.data_json);
                const catKey = initialData?.joint_type?.toLowerCase() || 'c';
                const parsedInfo = rawData?.[catKey];
                if (parsedInfo) {
                    info = {
                        equipment: parsedInfo.equipment,
                        tag_no: parsedInfo.tagNo,
                        drg_no: parsedInfo.drgNo
                    };
                }
            } catch(e) { console.error("Error parsing data_json", e); }
        }

        if (info) {
            setBasicFields({
                equipment: info.equipment !== null && info.equipment !== undefined ? info.equipment : (initialData?.equipment || ""),
                tagNo: info.tag_no !== null && info.tag_no !== undefined ? info.tag_no : (initialData?.tagNo || ""),
                drgNo: info.drg_no !== null && info.drg_no !== undefined ? info.drg_no : (initialData?.drgNo || "")
            });
        } else if (initialData) {
            setBasicFields({
                equipment: initialData?.equipment || "",
                tagNo: initialData?.tagNo || "",
                drgNo: initialData?.drgNo || ""
            });
        }
    }, [initialData]);

    
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
    const [alert, setAlert] = useState({ show: false, type: 'success', message: '' })
    const [userRole, setUserRole] = useState("")
    
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

            const stageNum = stage.replace('stage', '');
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
    }, [initialData, stage])

    // Fetch QC Groups
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
    const getCategoryKey = () => initialData?.joint_type?.toLowerCase() || initialData?.jointCategory?.toLowerCase() || 'c';

    useEffect(() => {
        const inspData = inspectionData || initialData?.inspectionData;
        if (inspData) {
            const categoryKey = getCategoryKey();
            const dataKey = `${sPrefix}_data`;

            // 1. Load Basic Info (from data_json)
            if (inspData.data_json) {
                try {
                    const rawBasic = typeof inspData.data_json === 'string' ? JSON.parse(inspData.data_json) : inspData.data_json;
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

            if (inspData[`${sPrefix}_qc_group_id`]) setSelectedQcGroupId(inspData[`${sPrefix}_qc_group_id`]);
            if (inspData[`${sPrefix}_remarks`]) setQcRemarks(inspData[`${sPrefix}_remarks`]);
            if (inspData[`${sPrefix}_prod_eng_name`]) setProductionEngineerName(inspData[`${sPrefix}_prod_eng_name`]);

            if (inspData[dataKey]) {
                try {
                    const rawData = typeof inspData[dataKey] === 'string' ? JSON.parse(inspData[dataKey]) : inspData[dataKey];
                    const stageData = rawData?.[categoryKey]?.[sPrefix] || rawData?.[categoryKey] || rawData || {};

                    if (stageData?.productionEngineerName) setProductionEngineerName(stageData.productionEngineerName);
                    if (stageData?.submissionDate) setTodayDate(stageData.submissionDate);
                    if (inspectionData[`${sPrefix}_qc_group_id`]) {
                setSelectedQcGroupId(inspectionData[`${sPrefix}_qc_group_id`]);
              } else if (stageData?.qcGroupId) {
                setSelectedQcGroupId(stageData.qcGroupId);
              }
              
              if (inspectionData[`${sPrefix}_production_group_id`] && !selectedProdGroupId) {
                setSelectedProdGroupId(inspectionData[`${sPrefix}_production_group_id`]);
              } else if (stageData?.productionGroupId && !selectedProdGroupId) {
                setSelectedProdGroupId(stageData.productionGroupId);
              }
                } catch (e) { console.error(`Error parsing ${dataKey}`, e) }
            }
        }
    }, [inspectionData, initialData, stage]);

    const handleSubmit = async () => {
        setIsSubmitting(true)
        setAlert({ show: false, type: '', message: '' })
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
            const authData = localStorage.getItem("user_auth")
            let token = null, userId = null;

            if (authData) {
                const parsed = JSON.parse(authData)
                token = parsed?.payload?.token || parsed?.token
                userId = parsed?.payload?.user?.id || parsed?.user?.id
            }

            if (!selectedQcGroupId) {
                setAlert({ show: true, type: 'error', message: "Please select QC Group" });
                setIsSubmitting(false);
                return;
            }

            if (!selectedProdGroupId) {
                setAlert({ show: true, type: 'error', message: "Please select Production Group" });
                setIsSubmitting(false);
                return;
            }

            const categoryKey = getCategoryKey();
            const dataKey = `${sPrefix}_data`;

            let existingData = {};
            const inspData = inspectionData || initialData?.inspectionData;
            if (inspData?.[dataKey]) {
                existingData = typeof inspData[dataKey] === 'string'
                    ? JSON.parse(inspData[dataKey])
                    : inspData[dataKey];
            }

            const currentStageData = {
                qcGroupId: selectedQcGroupId,
        productionGroupId: selectedProdGroupId,
                productionEngineerName,
                submissionDate: todayDate,
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
                role: 'PROD',
                data: finalData,
                basicInfo: {
                    [initialData?.joint_type?.toLowerCase() || 'c']: {
                        equipment: basicFields.equipment,
                        tagNo: basicFields.tagNo,
                        drgNo: basicFields.drgNo
                    }
                }
            }

            const res = await api.post("/api/wpj/update-stage-status", payload);

            if (res.success) {
                setAlert({ show: true, type: 'success', message: "Stage submitted successfully" });
                setTimeout(() => { if (onSuccess) onSuccess(); }, 1500);
            } else {
                setAlert({ show: true, type: 'error', message: res.message || "Submission failed" });
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
        setAlert({ show: false, type: '', message: '' })
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
            const authData = localStorage.getItem("user_auth")
            let token = null, userId = null;

            if (authData) {
                const parsed = JSON.parse(authData)
                token = parsed?.payload?.token || parsed?.token
                userId = parsed?.payload?.user?.id || parsed?.user?.id
            }

            if (userRole === 'QC' && status === 'approved') {
                const categoryKey = getCategoryKey();
                const dataKey = `${sPrefix}_data`;

                let existingData = {};
                const inspData = inspectionData || initialData?.inspectionData;
                if (inspData?.[dataKey]) {
                    existingData = typeof inspData[dataKey] === 'string'
                        ? JSON.parse(inspData[dataKey])
                        : inspData[dataKey];
                }

                const currentStageData = {
                    qcGroupId: selectedQcGroupId,
        productionGroupId: selectedProdGroupId,
                    productionEngineerName,
                    submissionDate: todayDate,
                };

                const finalData = {
                    ...existingData,
                    [categoryKey]: {
                        ...existingData[categoryKey],
                        [sPrefix]: currentStageData
                    }
                };
await api.post("/api/wpj/update-stage-status", {
                    jointId: initialData?.id,
                    stage: stage,
                    status: status,
                    engineerId: userId,
                    role: 'QC',
                    data: finalData,
                    basicInfo: {
                    [initialData?.joint_type?.toLowerCase() || 'c']: {
                        equipment: basicFields.equipment,
                        tagNo: basicFields.tagNo,
                        drgNo: basicFields.drgNo
                    }
                }
                });
            }

            const res = await api.post("/api/wpj/review-stage", {
                jointId: initialData?.id,
                stage: stage,
                status: status,
                engineerId: userId,
                role: 'QC',
                remarks: qcRemarks,
                basicInfo: {
                    [initialData?.joint_type?.toLowerCase() || 'c']: {
                        equipment: basicFields.equipment,
                        tagNo: basicFields.tagNo,
                        drgNo: basicFields.drgNo
                    }
                }
            });

            if (res.success) {
                setAlert({ show: true, type: 'success', message: `Stage ${status} successfully` });
                setTimeout(() => { if (onSuccess) onSuccess(); }, 1500);
            } else {
                setAlert({ show: true, type: 'error', message: res.message || "Review action failed" });
            }
        } catch (error) {
            console.error(error);
            setAlert({ show: true, type: 'error', message: "Error processing review" });
        } finally {
            setIsSubmitting(false);
        }
    }

      const isReadOnly = readOnly || (isReview && userRole !== 'QC');

return (
        <div className="w-full space-y-6">
            <FormAlert type={alert.type} message={alert.message} />
            <div className="border rounded-lg p-4 space-y-4 shadow-sm bg-card">
                <h3 className="font-semibold text-lg">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Shreno Manufacturer sr. no.</label>
                            <Input value={initialData?.msnNumber || ""} className="bg-slate-50 text-slate-500 h-8 text-xs shadow-none border-slate-200 rounded-none" placeholder="MSN" readOnly />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Equipment Name</label>
                            <Input name="equipment" value={basicFields.equipment} onChange={handleBasicFieldChange} disabled={isReadOnly}  className="h-8 text-xs shadow-none border-slate-200 rounded-none bg-white"/>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Tag Number</label>
                            <Input name="tagNo" value={basicFields.tagNo} onChange={handleBasicFieldChange} disabled={isReadOnly}  className="h-8 text-xs shadow-none border-slate-200 rounded-none bg-white"/>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Drawing No. </label>
                            <Input name="drgNo" value={basicFields.drgNo} onChange={handleBasicFieldChange} disabled={isReadOnly}  className="h-8 text-xs shadow-none border-slate-200 rounded-none bg-white"/>
                        </div>
                    </div>
                </div>

            <div className="mb-8">
                <div className="mb-4 border-b pb-2">
                    <h3 className="text-sm font-bold text-slate-800 capitalize tracking-wider">Post Weld Heat Treatment (PWHT) {initialData?.pwht && (
                        <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                            Yes
                        </span>
                    )}</h3>
                </div>
                <div className="mb-4 border-b pb-2">
                    <h3 className="text-sm font-bold text-slate-800 capitalize tracking-wider">
                        Radiography Testing (RT)
                        {initialData?.pwht && (
                            <span className="text-xs text-muted-foreground font-normal">
                                (After PWHT)
                            </span>
                        )}
                    </h3>
                </div>

                <div>
                    <div className="space-y-6 pt-6 border-t">
                        <h3 className="font-semibold text-lg">Set Up Inspection by</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider" htmlFor="productionGroup">Production Group Name</label>
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
                                    value={initialData?.inspectionData?.[`${sPrefix}_submitted_at`] 
                                        ? new Date(initialData.inspectionData[`${sPrefix}_submitted_at`]).toLocaleDateString() 
                                        : todayDate}
                                    readOnly
                                    className="bg-slate-50 text-slate-500 h-8 text-xs shadow-none border-slate-200 rounded-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">QC Group Name</label>
                                <Select value={selectedQcGroupId} onValueChange={setSelectedQcGroupId} disabled={isReview}>
                                    <SelectTrigger className="w-full focus:ring-2 focus:ring-primary h-8 text-xs shadow-none border-slate-200 rounded-none bg-white">
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
                    </div>

                    {/* Shared QC Review & Approval Section */}
                    {true && (

                      <QCReviewSection
                        isReview={isReview}
                        userRole={userRole}
                        status={initialData?.inspectionData?.[`${sPrefix}_status`]}
                        remarks={qcRemarks}
                        setRemarks={setQcRemarks}
                        onAction={handleReviewAction}
                        isSubmitting={isSubmitting}
                        reviewDate={
                            initialData?.inspectionData?.[`${sPrefix}_approved_at`] ? new Date(initialData.inspectionData[`${sPrefix}_approved_at`]).toLocaleString() :
                                initialData?.inspectionData?.[`${sPrefix}_rejected_at`] ? new Date(initialData.inspectionData[`${sPrefix}_rejected_at`]).toLocaleString() : ""
                        }
                    />

                    )}

                    {!isReview && !readOnly && (
                        <div className="mt-12 flex justify-end pb-10 gap-3 border-t pt-6">
                            <Button
                                onClick={handleSubmit}
                                className="min-w-[150px] shadow-sm hover:translate-y-[-1px] transition-all cursor-pointer"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Processing..." : isUpdate ? (isRejected ? "Resubmit Report" : "Update Report") : "Submit Report"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Stage4;





