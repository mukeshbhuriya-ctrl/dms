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

function Stage4F({ initialData, inspectionData, isReview = false, readOnly = false, onSuccess }) {
    const stage = "stage4"
    
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

    const getCategoryKey = () => initialData?.joint_type?.toLowerCase() || initialData?.jointCategory?.toLowerCase() || 'f';

    useEffect(() => {
        if (inspectionData) {
            const categoryKey = getCategoryKey();
            setQcRemarks(inspectionData.s4_remarks || "");

            if (inspectionData.s4_data) {
                try {
                    const rawData = typeof inspectionData.s4_data === 'string' ? JSON.parse(inspectionData.s4_data) : inspectionData.s4_data;
                    const s4Data = rawData?.[categoryKey]?.s4 || rawData?.[categoryKey] || rawData || {};

                    if (s4Data.productionEngineerName) setProductionEngineerName(s4Data.productionEngineerName);
                    if (s4Data.submissionDate) setTodayDate(s4Data.submissionDate);

                    if (inspectionData.s4_qc_group_id) {
                setSelectedQcGroupId(inspectionData.s4_qc_group_id);
              }
              if (inspectionData.s4_production_group_id && !selectedProdGroupId) {
                setSelectedProdGroupId(inspectionData.s4_production_group_id);
              } else if (s4Data.qcGroupId) {
                        setSelectedQcGroupId(s4Data.qcGroupId);
            }
            if (s4Data.productionGroupId) setSelectedProdGroupId(s4Data.productionGroupId);

                } catch (e) {
                    console.error("Error parsing s4_data", e)
                }
            }
            if (inspectionData.s4_prod_eng_name) setProductionEngineerName(inspectionData.s4_prod_eng_name);
        }
    }, [inspectionData])

    const handleSubmit = async () => {
        setIsSubmitting(true)
        setAlert({ show: false, type: 'success', message: '' })
        try {
            const authData = localStorage.getItem("user_auth")
            let userId = null;

            if (authData) {
                const parsed = JSON.parse(authData)
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

            const categoryKey = getCategoryKey();

            let existingStageData = {};
            if (inspectionData?.s4_data) {
                existingStageData = typeof inspectionData.s4_data === 'string'
                    ? JSON.parse(inspectionData.s4_data)
                    : inspectionData.s4_data;
            }

            const currentStageInnerData = {
                qcGroupId: selectedQcGroupId,
        productionGroupId: selectedProdGroupId,
                productionEngineerName: productionEngineerName,
                submissionDate: todayDate,
            };

            const stageData = {
                ...existingStageData,
                [categoryKey]: {
                    ...existingStageData[categoryKey],
                    s4: currentStageInnerData
                }
            };

            const basicInfo = {
                [categoryKey]: {
                    msnNumber: initialData?.msnNumber,
                    equipment: initialData?.equipment,
                    drgNo: initialData?.drgNo,
                    tagNo: initialData?.tagNo,
                }
            };

            const payload = {
                jointId: initialData?.id,
                stage: "stage4",
                status: "pending",
                engineerId: userId,
                role: "PROD",
                data: stageData,
                basicInfo: basicInfo
            }

            const res = await api.post("/api/wpj/update-stage-status", payload);

            if (res.success) {
                setAlert({ show: true, type: 'success', message: "Stage 4 submitted successfully" });
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
            const authData = localStorage.getItem("user_auth")
            let userId = null;

            if (authData) {
                const parsed = JSON.parse(authData)
                userId = parsed?.payload?.user?.id || parsed?.user?.id
            }

            if (userRole === 'QC' && status === 'approved') {
                const categoryKey = getCategoryKey();

                let existingStageData = {};
                if (inspectionData?.s4_data) {
                    existingStageData = typeof inspectionData.s4_data === 'string'
                        ? JSON.parse(inspectionData.s4_data)
                        : inspectionData.s4_data;
                }

                const currentStageInnerData = {
                    qcGroupId: selectedQcGroupId,
        productionGroupId: selectedProdGroupId,
                    productionEngineerName,
                    submissionDate: todayDate
                };

                const stageData = {
                    ...existingStageData,
                    [categoryKey]: {
                        ...existingStageData[categoryKey],
                        s4: currentStageInnerData
                    }
                };

                const basicInfo = {
                    [categoryKey]: {
                        msnNumber: initialData?.msnNumber,
                        equipment: initialData?.equipment,
                        drgNo: initialData?.drgNo,
                        tagNo: initialData?.tagNo,
                    }
                };

                await api.post("/api/wpj/update-stage-status", {
                    jointId: initialData?.id,
                    stage: "stage4",
                    status: status,
                    engineerId: userId,
                    role: 'QC',
                    data: stageData,
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
                setAlert({ show: true, type: 'success', message: `Stage 4 ${status} successfully` });
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
        <div className="w-full mx-auto p-6 space-y-6">
            {alert.show && <FormAlert type={alert.type} message={alert.message} onClose={() => setAlert({ ...alert, show: false })} />}
            <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label>Shreno Manufacturer sr. no.:</Label>
                        <Input value={initialData?.msnNumber || ""} className="bg-muted" placeholder="MSN" readOnly />
                    </div>
                    <div className="space-y-2">
                        <Label>Equipment Name & Tag Number:</Label>
                        <Input value={`${initialData?.equipment || ""} ${initialData?.tagNo || ""}`} readOnly className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                        <Label>Drawing no. :</Label>
                        <Input value={initialData?.drgNo || ""} readOnly className="bg-muted" />
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Post Weld Heat Treatment (PWHT) {initialData?.pwht && (
                        <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                            Yes
                        </span>
                    )}</CardTitle>
                </CardHeader>
                <CardHeader>
                    <CardTitle>Penetrant Testing (PT) {initialData?.pwht && (
                        <span className="ml-2 text-xs text-muted-foreground">(After PWHT)</span>
                    )}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-2">
                    <div className="border-b pb-2"></div>
                    <div className="space-y-4">
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
                                <Input
                                    value={inspectionData?.s4_submitted_at ? new Date(inspectionData.s4_submitted_at).toLocaleDateString() : todayDate}
                                    readOnly
                                    className="bg-muted"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>QC Group Name:</Label>
                                <Select value={selectedQcGroupId} onValueChange={setSelectedQcGroupId} disabled={isReview}>
                                    <SelectTrigger className="w-full">
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

                        {/* Shared QC Review Section */}
                        {!readOnly && (

                          <QCReviewSection
                            isReview={isReview}
                            userRole={userRole}
                            status={inspectionData?.s4_status}
                            remarks={qcRemarks}
                            setRemarks={setQcRemarks}
                            onAction={handleReviewAction}
                            isSubmitting={isSubmitting}
                            reviewDate={
                                inspectionData?.s4_approved_at ? new Date(inspectionData.s4_approved_at).toLocaleString() :
                                    inspectionData?.s4_rejected_at ? new Date(inspectionData.s4_rejected_at).toLocaleString() : ""
                            }
                        />

                        )}

                        {!isReview && !readOnly && (
                            <div className="mt-12 flex justify-end pb-10">
                                <Button onClick={handleSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? "Processing..." : "Save & Complete Stage 4"}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default Stage4F



