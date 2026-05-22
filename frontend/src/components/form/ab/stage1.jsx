import WpjService from '@/services/wpj.service';
import { useState, useEffect } from "react"
import api from "@/api/api.client"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import QCReviewSection from "@/components/wpj/QCReviewSection"

function Stage1({ initialData, isReview = false, readOnly = false, onSuccess }) {
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [userRole, setUserRole] = useState("")

  // First section - Display fields (read-only)
  const [displayFields, setDisplayFields] = useState({
    msn: "",
    client: "",
    poNo: "",
  })

  // First section - Input fields
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

  const [inspectionRows, setInspectionRows] = useState([
    { id: 1, name: "Material Identification", value: "" },
    { id: 2, name: "Weld joint configuration", value: "" },
    { id: 3, name: "Root Gap", value: "" },
    { id: 4, name: "Root Face", value: "" },
    { id: 5, name: 'Degree for "V"', value: "" },
    { id: 6, name: "Offset", value: "" },
    { id: 7, name: "Alignment", value: "" },
    { id: 8, name: "Weld edge Visual", value: "" },
    { id: 9, name: "Length of the Shell", value: "" },
    { id: 10, name: "Outside circumference", value: "" },
    { id: 11, name: "Inside Gauge / Template Verification", value: "" },
    { id: 12, name: "Outside Gauge / Template verification (if Applicable)", value: "" },
    { id: 13, name: "Tack Welder Number", value: "" },
  ])

  
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [qcRemarks, setQcRemarks] = useState("")

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

  const getCategoryKey = () => {
        return initialData?.jointCategory?.toLowerCase() || initialData?.joint_type?.toLowerCase() || 'a';
    }

  // Populate Data
  useEffect(() => {
    if (initialData) {
      setDisplayFields({
        msn: initialData.msnNumber || "",
        client: initialData.client || "",
        poNo: initialData.poNo || "",
      })

      // Fetch dynamic report NO from dedicated API
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

      if (initialData.inspectionData) {
        const categoryKey = getCategoryKey();
        const insp = initialData.inspectionData;

        // 1. Load Stage Data (from s1_data)
        if (insp.s1_data) {
          try {
            const rawData = typeof insp.s1_data === 'string' ? JSON.parse(insp.s1_data) : insp.s1_data;
            // Check for nested s1 key: { ab: { s1: ... } } or legacy { ab: ... }
            const s1Data = rawData?.[categoryKey]?.s1 || rawData?.[categoryKey] || rawData || {};

            if (s1Data.inspectionRows) setInspectionRows(s1Data.inspectionRows);
            if (s1Data.productionEngineerName) setProductionEngineerName(s1Data.productionEngineerName);
            if (s1Data.submissionDate) setTodayDate(s1Data.submissionDate);
            // Legacy fallback: if inputFields in s1_data and NOT in data_json
            if (s1Data.inputFields && !insp.data_json) {
              setInputFields(prev => ({ ...prev, ...s1Data.inputFields }));
            }
            if (s1Data.qcGroupId) setSelectedQcGroupId(s1Data.qcGroupId);
            if (s1Data.productionGroupId) setSelectedProdGroupId(s1Data.productionGroupId);
            } catch (e) {
            console.error("Error parsing s1_data", e)
          }
        }

        // 2. Load Basic Info (from data_json)
        if (insp.data_json) {
          try {
            const rawBasic = typeof insp.data_json === 'string' ? JSON.parse(insp.data_json) : insp.data_json;
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

        // Fallback / Override from columns if JSON missing/incomplete
        if (insp.s1_qc_group_id && !selectedQcGroupId) setSelectedQcGroupId(insp.s1_qc_group_id);
        if (insp.s1_production_group_id && !selectedProdGroupId) setSelectedProdGroupId(insp.s1_production_group_id);
        if (insp.s1_prod_eng_name) setProductionEngineerName(insp.s1_prod_eng_name);
        if (insp.s1_remarks) setQcRemarks(insp.s1_remarks);
      }
    }
  }, [initialData])


  const handleInputChange = (e) => {
    const { name, value } = e.target
    setInputFields((prev) => ({ ...prev, [name]: value }))
  }

  const handleInspectionRowChange = (id, value) => {
    setInspectionRows(inspectionRows.map((row) => row.id === id ? { ...row, value: value } : row))
  }

  // ReadOnly: Review mode AND not QC
  const isReadOnly = readOnly || (isReview && userRole !== 'QC');

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError("")
    setSuccess("")
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
         setError("Please select QC Group");
         setIsSubmitting(false);
         return;
       }

       if (!selectedProdGroupId) {
         setError("Please select Production Group");
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

      // 1. Construct Stage Data (Nest s1 inside category)
      const currentStageInnerData = {
        inspectionRows,
        qcGroupId: selectedQcGroupId,
        productionGroupId: selectedProdGroupId,
        productionEngineerName: productionEngineerName,
        submissionDate: todayDate
      };

      const stageData = {
        ...existingStageData,
        [categoryKey]: {
          ...existingStageData[categoryKey],
          s1: currentStageInnerData
        }
      };

      // 2. Construct Basic Info
      const basicInfo = {
        [categoryKey]: {
          ...displayFields,
          ...inputFields
        }
      };

      const payload = {
        jointId: initialData?.id,
        stage: "stage1",
        status: "pending",
        engineerId: userId,
        role: role,
        data: stageData,
        basicInfo: basicInfo
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
        setSuccess("Stage 1 submitted successfully");
        setTimeout(() => { if (onSuccess) onSuccess(); }, 1500);
      } else {
        setError(data.message || "Submission failed");
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
    setError("")
    setSuccess("")
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
          inspectionRows,
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

        const basicInfo = {
          [categoryKey]: {
            ...displayFields,
            ...inputFields
          }
        };

        await fetch(`${backendUrl}/api/wpj/update-stage-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" },
          body: JSON.stringify({
            jointId: initialData?.id,
            stage: "stage1",
            status: status,
            engineerId: userId,
            role: 'QC',
            data: stageData,
            basicInfo: basicInfo
          }),
          credentials: "include",
        });
      }

      const payload = {
        jointId: initialData?.id,
        stage: "stage1",
        status: status,
        engineerId: userId,
        role: role,
        remarks: qcRemarks,
        data: {} // No data update on simple status change review
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
        setSuccess(`Stage 1 ${status} successfully`);
        setTimeout(() => { if (onSuccess) onSuccess(); }, 1500);
      } else {
        setError(data.message || "Review action failed");
      }
    } catch (error) {
      console.error(error);
      setError("Error processing review");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full mx-auto p-6 space-y-6">
      <FormAlert type="error" message={error} />
      <FormAlert type="success" message={success} />
      {/* First Section */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Display Fields (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="msn">MSN:</Label>
              <Input
                id="msn"
                name="msn"
                type="text"
                value={displayFields.msn}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">CLIENT:</Label>
              <Input
                id="client"
                name="client"
                type="text"
                value={displayFields.client}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="poNo">P.O. NO.:</Label>
              <Input
                id="poNo"
                name="poNo"
                type="text"
                value={displayFields.poNo}
                readOnly
                className="bg-muted"
              />
            </div>

            {/* Input Fields */}
            <div className="space-y-2">
              <Label htmlFor="reportNo">Report No:</Label>
              <Input
                id="reportNo"
                name="reportNo"
                type="text"
                value={inputFields.reportNo}
                onChange={handleInputChange}
                placeholder="Enter Report No"
                readOnly={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagNo">TAG NO.:</Label>
              <Input
                id="tagNo"
                name="tagNo"
                type="text"
                value={inputFields.tagNo}
                onChange={handleInputChange}
                placeholder="Enter TAG NO."
                readOnly={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment">EQUIPMENT:</Label>
              <Input
                id="equipment"
                name="equipment"
                type="text"
                value={inputFields.equipment}
                onChange={handleInputChange}
                placeholder="Enter EQUIPMENT"
                readOnly={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectsId">Projects ID:</Label>
              <Input
                id="projectsId"
                name="projectsId"
                type="text"
                value={inputFields.projectsId}
                onChange={handleInputChange}
                placeholder="Enter Projects ID"
                readOnly={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lindeDrgNo">CLIENT DRG.:</Label>
              <Input
                id="lindeDrgNo"
                name="lindeDrgNo"
                type="text"
                value={inputFields.lindeDrgNo}
                onChange={handleInputChange}
                placeholder="Enter CLIENT DRG."
                readOnly={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="drgNo">SHRENO DRG NO.:</Label>
              <Input
                id="drgNo"
                name="drgNo"
                type="text"
                value={inputFields.drgNo}
                onChange={handleInputChange}
                placeholder="Enter SHRENO DRG NO."
                readOnly={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">CODE:</Label>
              <Input
                id="code"
                name="code"
                type="text"
                value={inputFields.code}
                onChange={handleInputChange}
                placeholder="Enter CODE"
                readOnly={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspAgency">INSP. AGENCY:</Label>
              <Input
                id="inspAgency"
                name="inspAgency"
                type="text"
                value={inputFields.inspAgency}
                onChange={handleInputChange}
                placeholder="Enter INSP. AGENCY"
                readOnly={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Second Section */}
      <Card>
        <CardHeader>
          <CardTitle>LONG SEAM / CIRCUMFERENCE SEAM INSPECTION REPORT</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Name</th>
                    <th className="text-left p-2 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectionRows.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="p-2">
                        <Input
                          type="text"
                          value={row.name}
                          readOnly
                          className="bg-muted w-full"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="text"
                          value={row.value}
                          onChange={(e) =>
                            handleInspectionRowChange(row.id, e.target.value)
                          }
                          placeholder="Enter value"
                          className={`w-full ${isReadOnly ? "bg-muted" : ""}`}
                          readOnly={isReadOnly}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Third Section */}
      <Card>
        <CardHeader>
          <CardTitle>Set Up Inspection by</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="productionGroup">Production Group:</Label>
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
                type="text"
                value={initialData?.inspectionData?.s1_submitted_at ? new Date(initialData.inspectionData.s1_submitted_at).toLocaleDateString() : todayDate}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qcGroup">QC Group:</Label>
              <Select value={selectedQcGroupId} onValueChange={setSelectedQcGroupId} disabled={isReview}>
                <SelectTrigger id="qcGroup" className="w-full">
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


        </CardContent>
      </Card>

      {!readOnly && (
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
        <div className="mt-12 flex justify-end pb-10">
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Save & Complete Stage 1"}
          </Button>
        </div>
      )}
    </div>
  )
}

export default Stage1



