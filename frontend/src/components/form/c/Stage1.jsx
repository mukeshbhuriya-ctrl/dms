import React, { useState, useEffect } from 'react'
import WpjService from '@/services/wpj.service';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormAlert } from "@/components/ui/form-alert"
import api from "@/api/api.client"
import QCReviewSection from "@/components/wpj/QCReviewSection"
import { AlertCircle } from "lucide-react"

const Stage1C = ({ initialData, isReview = false, isUpdate = false, isRejected = false, readOnly = false, onSuccess }) => {


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

    const [formData, setFormData] = useState({
        materialIdMarks: "",
        nozzleNumber: "",
        tackWelder: "",
        visualInspection: "",
        lSeamRt: "",
        nozzleSize: "",
        totalLength: "",
        date: new Date().toLocaleDateString()
    })

    const [productionEngineerName, setProductionEngineerName] = useState("")
    const [todayDate, setTodayDate] = useState(new Date().toLocaleDateString())
    const [selectedQcGroupId, setSelectedQcGroupId] = useState("")
    const [selectedProdGroupId, setSelectedProdGroupId] = useState("");

    const [qcRemarks, setQcRemarks] = useState("")
        const [isSubmitting, setIsSubmitting] = useState(false)
    const [userRole, setUserRole] = useState("")

    const [alert, setAlert] = useState({ show: false, type: 'success', message: '' })
    const [mhcItems, setMhcItems] = useState([])
    const [selectedPart1, setSelectedPart1] = useState("")
    const [selectedPart2, setSelectedPart2] = useState("")

    useEffect(() => {
        const authData = localStorage.getItem("user_auth")
        if (authData) {
            try {
                const parsed = JSON.parse(authData)
                const user = parsed?.payload?.user || parsed?.user
                if (user?.name && !isReview) {
                    setProductionEngineerName(user.name)
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

    // Fetch Approved MHC Items
    useEffect(() => {
        const fetchMhcItems = async () => {
            const msn = initialData?.msnNumber;
            const equipment = basicFields.equipment || initialData?.equipment || "";
            if (!msn || msn === '-') return;

            try {
                const res = await api.get(`/api/mhc/approved-items-by-msn-equipment?msn=${msn}&equipment_name=${encodeURIComponent(equipment)}`);
                if (res.success) {
                    setMhcItems(res.data || []);
                }
            } catch (error) {
                console.error("Error fetching MHC items:", error);
            }
        };
        fetchMhcItems();
    }, [initialData?.msnNumber, basicFields.equipment, initialData?.equipment]);

    const handlePartSelection = (partType, itemId) => {
        if (partType === 'part1') {
            setSelectedPart1(itemId);
        } else {
            setSelectedPart2(itemId);
        }
    }

    // Auto-populate Nozzle Number and Size based on selections
    useEffect(() => {
        // Skip during initial load if we already have inspection data but no selection has been made yet
        if (!mhcItems.length) return;
        if (!selectedPart1 && !selectedPart2) return;

        const item1 = mhcItems.find(i => i.id === selectedPart1);
        const item2 = mhcItems.find(i => i.id === selectedPart2);

        const desc1 = item1 ? `${item1.item_no || ''} - ${item1.description || ''}`.trim() : "";
        const desc2 = item2 ? `${item2.item_no || ''} - ${item2.description || ''}`.trim() : "";
        
        const size1 = item1?.size || "";
        const size2 = item2?.size || "";

        setFormData(prev => ({
            ...prev,
            nozzleNumber: [desc1, desc2].filter(Boolean).join(" | "),
            nozzleSize: [size1, size2].filter(Boolean).join(" | ")
        }));
    }, [selectedPart1, selectedPart2, mhcItems]);

    const getCategoryKey = () => {
        return initialData?.jointCategory?.toLowerCase() || initialData?.joint_type?.toLowerCase() || 'c';
    }

    useEffect(() => {
        if (initialData?.inspectionData) {
            const categoryKey = getCategoryKey();
            const insp = initialData.inspectionData;

            if (insp.s1_data) {
                try {
                    const rawData = typeof insp.s1_data === 'string' ? JSON.parse(insp.s1_data) : insp.s1_data;
                    const s1Data = rawData?.[categoryKey]?.s1 || rawData?.[categoryKey] || rawData || {};

                    setFormData(prev => ({
                        ...prev,
                        materialIdMarks: s1Data.materialIdMarks || prev.materialIdMarks,
                        nozzleNumber: s1Data.nozzleNumber || prev.nozzleNumber,
                        tackWelder: s1Data.tackWelder || prev.tackWelder,
                        visualInspection: s1Data.visualInspection || prev.visualInspection,
                        lSeamRt: s1Data.lSeamRt || prev.lSeamRt,
                        nozzleSize: s1Data.nozzleSize || prev.nozzleSize,
                        totalLength: s1Data.totalLength || prev.totalLength,
                        date: s1Data.date || prev.date,
                    }));

                    if (s1Data.productionEngineerName) setProductionEngineerName(s1Data.productionEngineerName);
                    if (s1Data.submissionDate) setTodayDate(s1Data.submissionDate);

                    if (insp.s1_qc_group_id) setSelectedQcGroupId(insp.s1_qc_group_id);
                    else if (s1Data.qcGroupId) setSelectedQcGroupId(s1Data.qcGroupId);

                    if (insp.s1_production_group_id && !selectedProdGroupId) setSelectedProdGroupId(insp.s1_production_group_id);
                    else if (s1Data.productionGroupId && !selectedProdGroupId) setSelectedProdGroupId(s1Data.productionGroupId);

                    if (s1Data.mhcPart1ItemId) setSelectedPart1(s1Data.mhcPart1ItemId);
                    if (s1Data.mhcPart2ItemId) setSelectedPart2(s1Data.mhcPart2ItemId);

                } catch (e) {
                    console.error("Error parsing s1_data", e)
                }
            }
            // Fallback / Override from columns if JSON missing/incomplete
            if (insp.s1_remarks) setQcRemarks(insp.s1_remarks);
            if (insp.s1_prod_eng_name) setProductionEngineerName(insp.s1_prod_eng_name);
        }
    }, [initialData])

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async () => {
        setIsSubmitting(true)
        setAlert({ show: false, type: 'success', message: '' })
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

            if (!selectedQcGroupId) {
                setAlert({ show: true, type: "error", message: "Please select QC Group" });
                setIsSubmitting(false);
                return;
            }

            if (!selectedProdGroupId) {
                setAlert({ show: true, type: 'error', message: "Please select Production Group" });
                setIsSubmitting(false);
                return;
            }

            if (!selectedPart1 || !selectedPart2) {
                setAlert({ show: true, type: "error", message: "Please select both MHC Part 1 and Part 2" });
                setIsSubmitting(false);
                return;
            }

            const item1 = mhcItems.find(i => i.id === selectedPart1);
            const item2 = mhcItems.find(i => i.id === selectedPart2);

            if (item1?.item_no !== initialData?.joint_no && item2?.item_no !== initialData?.joint_no) {
                setAlert({ show: true, type: "error", message: `At least one selected MHC item must match the Weld Joint Number (${initialData?.joint_no})` });
                setIsSubmitting(false);
                return;
            }

            const categoryKey = getCategoryKey();

            // Fetch existing Stage Data
            let existingStageData = {};
            if (initialData?.inspectionData?.s1_data) {
                existingStageData = typeof initialData.inspectionData.s1_data === 'string'
                    ? JSON.parse(initialData.inspectionData.s1_data)
                    : initialData.inspectionData.s1_data;
            }

            const currentStageInnerData = {
                ...formData,
                qcGroupId: selectedQcGroupId,
        productionGroupId: selectedProdGroupId,
                productionEngineerName: productionEngineerName,
                submissionDate: todayDate,
                mhcPart1ItemId: selectedPart1,
                mhcPart2ItemId: selectedPart2
            };

            const stageData = {
                ...existingStageData,
                [categoryKey]: {
                    ...existingStageData[categoryKey],
                    s1: currentStageInnerData
                }
            };
            const payload = {
                jointId: initialData?.id,
                stage: "stage1",
                status: "pending",
                engineerId: userId,
                role: role,
                data: stageData,
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
                setAlert({ show: true, type: 'success', message: "Stage 1 submitted successfully" });
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
        setAlert({ show: false, type: 'success', message: '' })
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

            // If Approved by QC, save changes first
            if (userRole === 'QC' && status === 'approved') {
                const categoryKey = getCategoryKey();

                let existingStageData = {};
                if (initialData?.inspectionData?.s1_data) {
                    existingStageData = typeof initialData.inspectionData.s1_data === 'string'
                        ? JSON.parse(initialData.inspectionData.s1_data)
                        : initialData.inspectionData.s1_data;
                }

                const currentStageInnerData = {
                    ...formData,
                    qcGroupId: selectedQcGroupId,
        productionGroupId: selectedProdGroupId,
                    productionEngineerName,
                    submissionDate: todayDate
                };

                const stageData = {
                    ...existingStageData,
                    [categoryKey]: {
                        ...existingStageData[categoryKey],
                        s1: currentStageInnerData
                    }
                };
await api.post("/api/wpj/update-stage-status", {
                    jointId: initialData?.id,
                    stage: "stage1",
                    status: status,
                    engineerId: userId,
                    role: 'QC',
                    data: stageData,
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
                stage: "stage1",
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
                setAlert({ show: true, type: 'success', message: `Stage 1 ${status} successfully` });
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
        <div className="mb-8">
            <div className="mb-4 border-b pb-2">
                <h3 className="text-sm font-bold text-slate-800 capitalize tracking-wider">Material Identification Marks & Setup</h3>
            </div>
            <div>
                {alert.show && <FormAlert type={alert.type} message={alert.message} onClose={() => setAlert({ ...alert, show: false })} />}

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

                {/* Stage 1: Material Identification Section */}
                <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold text-lg">I. Material Identification</h3>

                    {/* MHC Part Selection - Hidden for QC */}
                    {userRole !== 'QC' && (
                        <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg border border-dashed mb-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider text-primary">MHC Part No. 1</label>
                                        <Select 
                                            key={`part1-${mhcItems.length}-${selectedPart1}`}
                                            value={selectedPart1} 
                                            onValueChange={(val) => handlePartSelection('part1', val)} 
                                            disabled={isReadOnly || mhcItems.length === 0}
                                        >
                                            <SelectTrigger className="w-full h-8 text-xs shadow-none border-slate-200 rounded-none bg-white">
                                                <SelectValue placeholder="Select Part 1" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {mhcItems.map(item => (
                                                    <SelectItem key={item.id} value={item.id}>
                                                        {item.item_no} {item.description ? `- ${item.description}` : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider text-primary">MHC Part No. 2</label>
                                        <Select 
                                            key={`part2-${mhcItems.length}-${selectedPart2}`}
                                            value={selectedPart2} 
                                            onValueChange={(val) => handlePartSelection('part2', val)} 
                                            disabled={isReadOnly || mhcItems.length === 0}
                                        >
                                            <SelectTrigger className="w-full h-8 text-xs shadow-none border-slate-200 rounded-none bg-white">
                                                <SelectValue placeholder="Select Part 2" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {mhcItems.map(item => (
                                                    <SelectItem key={item.id} value={item.id}>
                                                        {item.item_no} {item.description ? `- ${item.description}` : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {mhcItems.length === 0 && (
                                        <div className="col-span-1 md:col-span-2 mt-1">
                                            <p className="text-xs text-blue-600 italic text-center bg-blue-50 py-2 rounded border border-blue-100">
                                                No approved MHC items are currently available for this Equipment and Job Number.
                                            </p>
                                        </div>
                                    )}
                                </div>
                        </>
                    )}


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Characteristics to be checked</label>
                            <Input value={initialData?.jointNo || ""} disabled />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Nozzle Number</label>
                            <Input
                                value={formData.nozzleNumber}
                                placeholder='Enter Nozzle Number'
                                onChange={(e) => handleChange('nozzleNumber', e.target.value)}
                                disabled={isReadOnly}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Material identification Marks</label>
                            <Select
                                value={formData.materialIdMarks}
                                onValueChange={(val) => handleChange('materialIdMarks', val)}
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
                    </div>
                </div>

                {/* Stage 2: Setup Section */}
                <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold text-lg">II. Set Up</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Tack Welder</label>
                            <Input
                                value={formData.tackWelder}
                                placeholder='Enter Tack Welder'
                                onChange={(e) => handleChange('tackWelder', e.target.value)}
                                disabled={isReadOnly}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Visual Inspection</label>
                            <Select
                                value={formData.visualInspection}
                                onValueChange={(val) => handleChange('visualInspection', val)}
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
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Acceptance of L-Seam RT</label>
                            <Select
                                value={formData.lSeamRt}
                                onValueChange={(val) => handleChange('lSeamRt', val)}
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

                    <div className="border p-4 rounded-md space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">Dimensions</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Nozzle Size</label>
                                <Input
                                    value={formData.nozzleSize}
                                    placeholder='Enter Nozzle Size'
                                    onChange={(e) => handleChange('nozzleSize', e.target.value)}
                                    disabled={isReadOnly}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">Total Length</label>
                                <Input
                                    value={formData.totalLength}
                                    placeholder='Enter Total Length'
                                    onChange={(e) => handleChange('totalLength', e.target.value)}
                                    disabled={isReadOnly}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-lg">Set Up Inspection by</h3>
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
                            <Input
                                value={initialData?.inspectionData?.s1_submitted_at ? new Date(initialData.inspectionData.s1_submitted_at).toLocaleDateString() : todayDate}
                                readOnly
                                className="bg-slate-50 text-slate-500 h-8 text-xs shadow-none border-slate-200 rounded-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 capitalize tracking-wider">QC Group Name</label>
                            <Select value={selectedQcGroupId} onValueChange={setSelectedQcGroupId} disabled={isReview}>
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

                    {/* Shared QC Review & Approval Section */}
                    {true && (

                      <QCReviewSection
                        isReview={isReview}
                        userRole={userRole}
                        status={initialData?.inspectionData?.s1_status}
                        remarks={qcRemarks}
                        setRemarks={setQcRemarks}
                        onAction={handleReviewAction}
                        isSubmitting={isSubmitting}
                        reviewDate={
                            initialData?.inspectionData?.s1_approved_at ? new Date(initialData.inspectionData.s1_approved_at).toLocaleString() :
                                initialData?.inspectionData?.s1_rejected_at ? new Date(initialData.inspectionData.s1_rejected_at).toLocaleString() : ""
                        }
                    />

                    )}

                    {!isReview && !readOnly && (
                        <div className="mt-6 flex justify-end pb-2">
                            <Button onClick={handleSubmit} disabled={isSubmitting || !selectedPart1 || !selectedPart2} className="h-8 rounded-none bg-blue-600 hover:bg-blue-700 text-white shadow-none text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                                {isSubmitting ? "Processing..." : isUpdate ? (isRejected ? "Resubmit Report" : "Update Report") : "Submit Report"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Stage1C




