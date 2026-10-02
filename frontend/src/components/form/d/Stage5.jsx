import React, { useState, useEffect } from "react"
import WpjService from '@/services/wpj.service';
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

const Stage5D = ({ initialData, inspectionData, isReview = false, isUpdate = false, readOnly = false, stage = "stage5", onSuccess  }) => {

    const [basicFields, setBasicFields] = useState({ equipment: "", tagNo: "", drgNo: "" });

    const handleBasicFieldChange = (e) => {
        const { name, value } = e.target;
        setBasicFields(prev => ({ ...prev, [name]: value }));
    };

    useEffect(() => {
        let info = null;
        
        if (initialData?.weld_joint_report_info) {
            info = initialData.weld_joint_report_info;
        } else if ((inspectionData?.data_json || initialData?.inspectionData?.data_json || initialData?.weld_joint_inspection?.data_json)) {
            try {
                const rawData = typeof (inspectionData?.data_json || initialData?.inspectionData?.data_json || initialData?.weld_joint_inspection?.data_json) === 'string' ? JSON.parse((inspectionData?.data_json || initialData?.inspectionData?.data_json || initialData?.weld_joint_inspection?.data_json)) : (inspectionData?.data_json || initialData?.inspectionData?.data_json || initialData?.weld_joint_inspection?.data_json);
                const catKey = initialData?.joint_type?.toLowerCase() || 'd';
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
    }, [initialData, inspectionData]);

    const sPrefix = stage.replace('stage', 's');
    
    
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
    const [userRole, setUserRole] = useState("")
        const [alert, setAlert] = useState({ show: false, type: 'success', message: '' })

    const [formData, setFormData] = useState({
        tackWelder: "",
        materialId: "",
        lSeamNdt: "",
        cleaning: "",
        grooveAngle: "",
        rootFace: "",
        rootGap: "",
        projection: "",
        pcdHole: "",
        rfPad: ""
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
                const roles = parsed?.payload?.roles || parsed?.payload?.user?.roles || []
                const roleNames = roles.map(r => (typeof r === 'object' && r.name) ? r.name : r);
if (roleNames.some(r => ['QC_ENGINEER', 'NDT_ENGINEER'].includes(r))) {
                    setUserRole('QC')
                } else {
                    setUserRole('PROD')
                }
            } catch (e) { console.error(e) }
        }
    }, [isReview])

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

    useEffect(() => {
        const inspData = inspectionData || initialData?.inspectionData;
        if (inspData) {
            if (inspData[`${sPrefix}_qc_group_id`]) setSelectedQcGroupId(inspData[`${sPrefix}_qc_group_id`]);
            if (inspData[`${sPrefix}_remarks`]) setQcRemarks(inspData[`${sPrefix}_remarks`]);
            if (inspData[`${sPrefix}_prod_eng_name`]) setProductionEngineerName(inspData[`${sPrefix}_prod_eng_name`]);

            if (inspData[`${sPrefix}_data`]) {
                try {
                    const rawData = typeof inspData[`${sPrefix}_data`] === 'string' ? JSON.parse(inspData[`${sPrefix}_data`]) : inspData[`${sPrefix}_data`];
                    const sData = rawData?.d?.[sPrefix] || rawData?.d || rawData || {};

                    if (sData.productionEngineerName) setProductionEngineerName(sData.productionEngineerName);
                    if (sData.submissionDate) setTodayDate(sData.submissionDate);
                    
                    if (inspData[`${sPrefix}_qc_group_id`]) {
                        setSelectedQcGroupId(inspData[`${sPrefix}_qc_group_id`]);
                    }
                    if (inspData[`${sPrefix}_production_group_id`] && !selectedProdGroupId) {
                        setSelectedProdGroupId(inspData[`${sPrefix}_production_group_id`]);
                    } else if (sData.qcGroupId) {
                        setSelectedQcGroupId(sData.qcGroupId);
            }
            if (sData.productionGroupId) setSelectedProdGroupId(sData.productionGroupId);

                    setFormData(prev => ({
                        ...prev,
                        tackWelder: sData.tackWelder || "",
                        materialId: sData.materialId || "",
                        lSeamNdt: sData.lSeamNdt || "",
                        cleaning: sData.cleaning || "",
                        grooveAngle: sData.grooveAngle || "",
                        rootFace: sData.rootFace || "",
                        rootGap: sData.rootGap || "",
                        projection: sData.projection || "",
                        pcdHole: sData.pcdHole || "",
                        rfPad: sData.rfPad || ""
                    }));
                } catch (e) { console.error(`Error parsing ${sPrefix}_data`, e) }
            }
        }
    }, [initialData, inspectionData, stage]);

    const isReadOnly = readOnly || (isReview && userRole !== 'QC');

    const handleFormChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async () => {
        setIsSubmitting(true)
        setAlert({ show: false, type: '', message: '' })
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
            const authData = localStorage.getItem("user_auth")
            let token = null
            let userId = null;

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

            const currentStageData = {
                qcGroupId: selectedQcGroupId,
        productionGroupId: selectedProdGroupId,
                productionEngineerName,
                submissionDate: todayDate,
                ...formData
            };

            const inspData = inspectionData || initialData?.inspectionData;
            let existingData = {};
            if (inspData?.[`${sPrefix}_data`]) {
                existingData = typeof inspData[`${sPrefix}_data`] === 'string' ? JSON.parse(inspData[`${sPrefix}_data`]) : inspData[`${sPrefix}_data`];
            }

            const finalData = {
                ...existingData,
                d: {
                    ...existingData?.d,
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
                    [initialData?.joint_type?.toLowerCase() || 'd']: {
                        equipment: basicFields.equipment,
                        tagNo: basicFields.tagNo,
                        drgNo: basicFields.drgNo
                    }
                }
            }

            const res = await api.post("/api/wpj/update-stage-status", payload);

            if (res.success) {
                setAlert({ show: true, type: 'success', message: `${stage.replace('stage', 'Stage ')} Submitted Successfully` });
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
        setIsSubmitting(true)
        setAlert({ show: false, type: '', message: '' })
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
            const authData = localStorage.getItem("user_auth")
            let token = null
            let userId = null;

            if (authData) {
                const parsed = JSON.parse(authData)
                token = parsed?.payload?.token || parsed?.token
                userId = parsed?.payload?.user?.id || parsed?.user?.id
            }

            // If Approved by QC, save changes first
            if (status === 'approved') {
                const currentStageData = {
                    qcGroupId: selectedQcGroupId,
        productionGroupId: selectedProdGroupId,
                    productionEngineerName,
                    submissionDate: todayDate,
                    ...formData
                };

                const inspData = inspectionData || initialData?.inspectionData;
                let existingData = {};
                if (inspData?.[`${sPrefix}_data`]) {
                    existingData = typeof inspData[`${sPrefix}_data`] === 'string' ? JSON.parse(inspData[`${sPrefix}_data`]) : inspData[`${sPrefix}_data`];
                }

                const finalData = {
                    ...existingData,
                    d: {
                        ...existingData?.d,
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
                    [initialData?.joint_type?.toLowerCase() || 'd']: {
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
                    [initialData?.joint_type?.toLowerCase() || 'd']: {
                        equipment: basicFields.equipment,
                        tagNo: basicFields.tagNo,
                        drgNo: basicFields.drgNo
                    }
                }
            });

            if (res.success) {
                setAlert({ show: true, type: 'success', message: `${stage.replace('stage', 'Stage ')} ${status} Successfully` });
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

    return (
        <div className="w-full space-y-6">
            {alert.show && <FormAlert type={alert.type} message={alert.message} />}

            {/* Basic Information Section */}
            <div className="border rounded-lg p-4 space-y-4">
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
                    <h3 className="text-sm font-bold text-slate-800 capitalize tracking-wider">Nozzle Set-Up Inspection Report</h3>
                </div>
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Tack Welder</label>
                            <Input value={formData.tackWelder} placeholder='Enter Tack Welder' onChange={(e) => handleFormChange('tackWelder', e.target.value)} disabled={isReadOnly} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Material ID</label>
                            <Select
                                value={formData.materialId}
                                onValueChange={(val) => handleFormChange('materialId', val)}
                                disabled={isReadOnly}
                            >
                                <SelectTrigger className="w-full h-8 text-xs shadow-none border-slate-200 rounded-none bg-white">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Available">Available</SelectItem>
                                    <SelectItem value="Not Available">Not Available</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">L-Seam NDT</label>
                            <Select
                                value={formData.lSeamNdt}
                                onValueChange={(val) => handleFormChange('lSeamNdt', val)}
                                disabled={isReadOnly}
                            >
                                <SelectTrigger className="w-full h-8 text-xs shadow-none border-slate-200 rounded-none bg-white">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OK">OK</SelectItem>
                                    <SelectItem value="Not OK">Not OK</SelectItem>
                                    <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Cleaning</label>
                            <Select
                                value={formData.cleaning}
                                onValueChange={(val) => handleFormChange('cleaning', val)}
                                disabled={isReadOnly}
                            >
                                <SelectTrigger className="w-full h-8 text-xs shadow-none border-slate-200 rounded-none bg-white">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OK">OK</SelectItem>
                                    <SelectItem value="Not OK">Not OK</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Groove Angle</label>
                            <Input value={formData.grooveAngle} placeholder='Enter Groove Angle' onChange={(e) => handleFormChange('grooveAngle', e.target.value)} disabled={isReadOnly} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Root face</label>
                            <Input value={formData.rootFace} placeholder='Enter Root Face' onChange={(e) => handleFormChange('rootFace', e.target.value)} disabled={isReadOnly} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Root Gap</label>
                            <Input value={formData.rootGap} placeholder='Enter Root Gap' onChange={(e) => handleFormChange('rootGap', e.target.value)} disabled={isReadOnly} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Projection</label>
                            <Input value={formData.projection} placeholder='Enter Projection' onChange={(e) => handleFormChange('projection', e.target.value)} disabled={isReadOnly} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">PCD Hole</label>
                            <Select
                                value={formData.pcdHole}
                                onValueChange={(val) => handleFormChange('pcdHole', val)}
                                disabled={isReadOnly}
                            >
                                <SelectTrigger className="w-full h-8 text-xs shadow-none border-slate-200 rounded-none bg-white">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ON center">ON center</SelectItem>
                                    <SelectItem value="OFF center">OFF center</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">RF Pad</label>
                            <Select
                                value={formData.rfPad}
                                onValueChange={(val) => handleFormChange('rfPad', val)}
                                disabled={isReadOnly}
                            >
                                <SelectTrigger className="w-full h-8 text-xs shadow-none border-slate-200 rounded-none bg-white">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OK">OK</SelectItem>
                                    <SelectItem value="Not OK">Not OK</SelectItem>
                                    <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
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
                                <Input value={todayDate} readOnly className="bg-slate-50 text-slate-500 h-8 text-xs shadow-none border-slate-200 rounded-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">QC Group Name</label>
                                <Select value={selectedQcGroupId} onValueChange={setSelectedQcGroupId} disabled={isReview}>
                                    <SelectTrigger className="w-full h-8 text-xs shadow-none border-slate-200 rounded-none bg-white">
                                        <SelectValue placeholder="Select QC Group" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {qcGroups.map(group => (
                                            <SelectItem key={group.id} value={group.id}>{group.name?.toUpperCase()}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                            <div className="mt-6 flex justify-end pb-2">
                                <Button onClick={handleSubmit} disabled={isSubmitting} className="h-8 rounded-none bg-blue-600 hover:bg-blue-700 text-white shadow-none text-xs cursor-pointer">
                                    {isSubmitting ? "Processing..." : isUpdate ? "Update Report" : "Submit Report"}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Stage5D




