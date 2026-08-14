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

const Stage1D = ({ initialData, inspectionData, isReview = false, readOnly = false, stage = "stage1", onSuccess }) => {

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
    const [mhcItems, setMhcItems] = useState([])
    const [selectedPart1, setSelectedPart1] = useState("")
    const [selectedPart2, setSelectedPart2] = useState("")

    const [formData, setFormData] = useState({
        materialIdMarks: "",
        nozzleNumber: "",
        tackWelder: "",
        visualInspection: "",
        lSeamRt: "",
        nozzleSize: "",
        totalLength: "",
        date: new Date().toLocaleDateString(),
        openingSize: "",
        orientation: "",
        elevation: "",
        edgePreparation: ""
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

    // Fetch Approved MHC Items
    useEffect(() => {
        const fetchMhcItems = async () => {
            const msn = initialData?.msnNumber;
            if (!msn || msn === '-') return;

            try {
                const res = await api.get(`/api/mhc/approved-items-by-msn/${msn}`);
                if (res.success) {
                    setMhcItems(res.data || []);
                }
            } catch (error) {
                console.error("Error fetching MHC items:", error);
            }
        };
        fetchMhcItems();
    }, [initialData?.msnNumber]);

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
                        materialIdMarks: sData.materialIdMarks || "",
                        nozzleNumber: sData.nozzleNumber || "",
                        tackWelder: sData.tackWelder || "",
                        visualInspection: sData.visualInspection || "",
                        lSeamRt: sData.lSeamRt || "",
                        nozzleSize: sData.nozzleSize || "",
                        totalLength: sData.totalLength || "",
                        date: sData.date || prev.date,
                        openingSize: sData.openingSize || "",
                        orientation: sData.orientation || "",
                        elevation: sData.elevation || "",
                        edgePreparation: sData.edgePreparation || ""
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

            // If Approved by QC, save changes first (Standard pattern)
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
        <div className="w-full mx-auto p-6 space-y-6">
            {alert.show && <FormAlert type={alert.type} message={alert.message} />}

            {/* Basic Information Section */}
            <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <Label>Shreno Manufacturer sr. no.:</Label>
                            <Input value={initialData?.msnNumber || ""} className="bg-muted" placeholder="MSN" readOnly />
                        </div>
                        <div className="space-y-2">
                            <Label>Equipment Name:</Label>
                            <Input name="equipment" value={basicFields.equipment} onChange={handleBasicFieldChange} disabled={isReadOnly} />
                        </div>
                        <div className="space-y-2">
                            <Label>Tag Number:</Label>
                            <Input name="tagNo" value={basicFields.tagNo} onChange={handleBasicFieldChange} disabled={isReadOnly} />
                        </div>
                        <div className="space-y-2">
                            <Label>Drawing No. :</Label>
                            <Input name="drgNo" value={basicFields.drgNo} onChange={handleBasicFieldChange} disabled={isReadOnly} />
                        </div>
                    </div>
                </div>

            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Material Identification Marks & Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* I. Material Identification Section */}
                    <div className="space-y-4 border-t pt-4">
                        <h3 className="font-semibold text-lg">I. Material Identification</h3>

                        {/* MHC Part Selection - Hidden for QC */}
                        {userRole !== 'QC' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Part 1 Selection (ITEM NO./PART NO.)</Label>
                                    <Select 
                                        key={`part1-${mhcItems.length}-${selectedPart1}`}
                                        value={selectedPart1} 
                                        onValueChange={(val) => handlePartSelection('part1', val)} 
                                        disabled={isReadOnly}
                                    >
                                        <SelectTrigger className="w-full">
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
                                    <Label>Part 2 Selection (ITEM NO./PART NO.)</Label>
                                    <Select 
                                        key={`part2-${mhcItems.length}-${selectedPart2}`}
                                        value={selectedPart2} 
                                        onValueChange={(val) => handlePartSelection('part2', val)} 
                                        disabled={isReadOnly}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select Part 2 (Nozzle)" />
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
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Characteristics to be checked</Label>
                                <Input value={initialData?.jointNo || ""} readOnly className="bg-muted font-bold" />
                            </div>
                            <div className="space-y-2">
                                <Label>Nozzle Number</Label>
                                <Input
                                    value={formData.nozzleNumber}
                                    placeholder='Enter Nozzle Number'
                                    onChange={(e) => handleFormChange('nozzleNumber', e.target.value)}
                                    disabled={isReadOnly}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Material identification Marks</Label>
                                <Select
                                    value={formData.materialIdMarks}
                                    onValueChange={(val) => handleFormChange('materialIdMarks', val)}
                                    disabled={isReadOnly}
                                >
                                    <SelectTrigger className="w-full">
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

                    {/* II. Inspection of nozzle opening Section */}
                    <div className="space-y-4 border-t pt-4">
                        <h3 className="font-semibold text-lg">II. Inspection of nozzle opening</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Opening Size</Label>
                                <Input
                                    value={formData.openingSize}
                                    placeholder='Enter Opening Size'
                                    onChange={(e) => handleFormChange('openingSize', e.target.value)}
                                    disabled={isReadOnly}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Orientation (°)</Label>
                                <Input
                                    value={formData.orientation}
                                    placeholder='Enter Orientation'
                                    onChange={(e) => handleFormChange('orientation', e.target.value)}
                                    disabled={isReadOnly}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Elevation</Label>
                                <Input
                                    value={formData.elevation}
                                    placeholder='Enter Elevation'
                                    onChange={(e) => handleFormChange('elevation', e.target.value)}
                                    disabled={isReadOnly}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Edge Preparation</Label>
                                <Input
                                    value={formData.edgePreparation}
                                    placeholder='Enter Edge Preparation'
                                    onChange={(e) => handleFormChange('edgePreparation', e.target.value)}
                                    disabled={isReadOnly}
                                />
                            </div>
                        </div>
                    </div>

                    {/* III. Set Up Section */}
                    <div className="space-y-4 border-t pt-4">
                        <h3 className="font-semibold text-lg">III. Set Up</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label>Tack Welder</Label>
                                <Input
                                    value={formData.tackWelder}
                                    placeholder='Enter Tack Welder'
                                    onChange={(e) => handleFormChange('tackWelder', e.target.value)}
                                    disabled={isReadOnly}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Visual Inspection</Label>
                                <Select
                                    value={formData.visualInspection}
                                    onValueChange={(val) => handleFormChange('visualInspection', val)}
                                    disabled={isReadOnly}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="OK">OK</SelectItem>
                                        <SelectItem value="Not OK">Not OK</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Acceptance of L-Seam RT</Label>
                                <Select
                                    value={formData.lSeamRt}
                                    onValueChange={(val) => handleFormChange('lSeamRt', val)}
                                    disabled={isReadOnly}
                                >
                                    <SelectTrigger className="w-full">
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nozzle Size</Label>
                                    <Input
                                        value={formData.nozzleSize}
                                        placeholder='Enter Nozzle Size'
                                        onChange={(e) => handleFormChange('nozzleSize', e.target.value)}
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Total Length</Label>
                                    <Input
                                        value={formData.totalLength}
                                        placeholder='Enter Total Length'
                                        onChange={(e) => handleFormChange('totalLength', e.target.value)}
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="font-semibold text-lg">Set Up Inspection by</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
              <Label htmlFor="productionGroup">Production Group Name:</Label>
              <Select value={selectedProdGroupId} onValueChange={setSelectedProdGroupId} disabled={isReview}>
                <SelectTrigger id="productionGroup" className="w-full">
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
                                <Label>Date:</Label>
                                <Input value={todayDate} readOnly className="bg-muted" />
                            </div>
                            <div className="space-y-2">
                                <Label>QC Group Name:</Label>
                                <Select value={selectedQcGroupId} onValueChange={setSelectedQcGroupId} disabled={isReview}>
                                    <SelectTrigger className="w-full">
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
                        {!readOnly && (

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
                            <div className="mt-12 flex justify-end pb-10">
                                <Button onClick={handleSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? "Processing..." : `Save & Complete ${stage.replace('stage', 'Stage ')}`}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default Stage1D


