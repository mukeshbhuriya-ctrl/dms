import { useState, useEffect, useMemo, useCallback } from "react"
import { AdminSidebar } from "@/components"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Plus, ArrowLeft, Mail } from "lucide-react"
import { toast } from 'react-toastify';
import { dccService } from "../../services/dcc.service";
import { useNavigate } from "react-router-dom";
import { DataTable } from "@/components/shared/DataTable";
import { exportApi } from "@/api/export.api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function CreateTransmission() {
  const navigate = useNavigate();
  const [view, setView] = useState("list") // 'list' | 'create'

  // --- List View State ---
  const [transmissions, setTransmissions] = useState([])
  const [loadingList, setLoadingList] = useState(false)

  // --- Create View State ---
  const [formData, setFormData] = useState({
    customerId: "",
    locationId: "",
    poId: "",
  })
  const [autoFilled, setAutoFilled] = useState({
    customerId: false,
    locationId: false
  })
  const [customers, setCustomers] = useState([])
  const [allDocuments, setAllDocuments] = useState([]) // Documents for selected PO
  const [selectedDocuments, setSelectedDocuments] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successData, setSuccessData] = useState(null) // { zip_url, password }
  const [refreshKey, setRefreshKey] = useState(0);

  // --- Job Selection Logic ---
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [jobs, setJobs] = useState([]);

  // --- Initial Data Fetch (Customers for Create View) ---
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await dccService.getCustomers({ limit: 1000 });
      if (res.success) {
        setCustomers(res.data || []);
      } else {
        console.error("Failed to fetch customers:", res.message);
        toast.error("Failed to load customers");
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
      toast.error("Failed to load customers");
    }
  }

  // --- Helpers for Dropdowns ---
  const getLocationsForCustomer = (customerId) => {
    const customer = customers.find(c => c.id === customerId)
    return customer?.customer_locations || []
  }

  const getPOsForLocation = (locationId) => {
    if (!formData.customerId || !locationId) return []
    const customer = customers.find(c => c.id === formData.customerId)
    if (!customer) return []
    const location = customer.customer_locations?.find(loc => loc.id === locationId)
    return location?.pos || []
  }

  // Get all POs from all customers/locations
  const getAllPOs = () => {
    const allPOs = [];
    customers.forEach(customer => {
      customer.customer_locations?.forEach(location => {
        location.pos?.forEach(po => {
          allPOs.push({
            ...po,
            customerName: customer.customer_name,
            locationName: location.location_name
          });
        });
      });
    });
    return allPOs;
  }

  const fetchDocumentsForPO = async (poId, jobIds = []) => {
    setLoadingDocs(true);
    try {
      // Fetch approved documents for this PO
      const params = {
        status_filter: 'done', // Filter by 'Done' status which includes Approved/Uploaded
        approver_status_filter: 'approved', // Ensure strictly approved
        limit: 1000,
        po_id: poId, // Important: Filter by PO
        job_ids: jobIds, // Filter by selected job IDs!
        exclude_transmitted: true // Exclude documents already part of a transmission
      };

      const data = await dccService.getDocumentsForApproval(params);
      if (data.success) {
        setAllDocuments(data.data);
      } else {
        toast.error(data.message || "Failed to load documents");
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoadingDocs(false);
    }
  };

  const fetchJobsForPO = async (poId) => {
    try {
      const res = await dccService.getJobs({ po_id: poId, limit: 1000 });
      if (res.success) {
        setJobs(res.data || []);
      } else {
        toast.error("Failed to load jobs");
      }
    } catch (err) {
      console.error("Error fetching jobs:", err);
    }
  }

  // --- Handlers for Create/Form ---
  const handleCustomerChange = (customerId) => {
    setFormData({ customerId, locationId: "", poId: "" })
    setAutoFilled({ customerId: false, locationId: false })
    setAllDocuments([])
    setJobs([])
    setSelectedDocuments([])
    setSelectedJobs([])
  }

  const handleLocationChange = (locationId) => {
    setFormData((prev) => ({ ...prev, locationId, poId: "" }))
    setAutoFilled((prev) => ({ ...prev, locationId: false }))
    setAllDocuments([])
    setJobs([])
    setSelectedDocuments([])
    setSelectedJobs([])
  }

  const handlePOChange = (poId) => {
    if (poId) {
      // Find the PO in the customer data to auto-fill customer and location
      let foundCustomer = null;
      let foundLocation = null;
      let foundPO = null;

      for (const customer of customers) {
        for (const location of customer.customer_locations || []) {
          const po = location.pos?.find(p => p.id === poId);
          if (po) {
            foundCustomer = customer;
            foundLocation = location;
            foundPO = po;
            break;
          }
        }
        if (foundPO) break;
      }

      if (foundCustomer && foundLocation) {
        // Auto-fill customer and location
        setFormData({
          customerId: foundCustomer.id,
          locationId: foundLocation.id,
          poId: poId
        });
        setAutoFilled({
          customerId: true,
          locationId: true
        });
      } else {
        // Just set the PO if not found (shouldn't happen)
        setFormData((prev) => ({ ...prev, poId }));
      }

      fetchJobsForPO(poId);
    } else {
      setFormData((prev) => ({ ...prev, poId: "" }));
      setAllDocuments([]);
      setJobs([]);
      setSelectedJobs([]);
    }
    setSelectedDocuments([]);
  }

  // --- Job Selection Logic ---
  // Use API fetched jobs
  const uniqueJobs = useMemo(() => jobs, [jobs]);


  // Refetch documents when selectedJobs change
  useEffect(() => {
    if (formData.poId && selectedJobs.length > 0) {
      fetchDocumentsForPO(formData.poId, selectedJobs);
    } else if (formData.poId && selectedJobs.length === 0) {
      setAllDocuments([]);
    }
  }, [selectedJobs, formData.poId]);

  // Use allDocuments directly since they are now server-filtered
  const filteredDocuments = allDocuments;

  const itemsWithSNo = useMemo(() => filteredDocuments.map((doc, index) => ({ ...doc, s_no: index + 1 })), [filteredDocuments]);

  const handleJobToggle = (jobId) => {
    setSelectedJobs(prev => {
      if (prev.includes(jobId)) {
        return prev.filter(j => j !== jobId);
      } else {
        return [...prev, jobId];
      }
    });
  };

  const handleSelectAllJobs = () => {
    if (selectedJobs.length === uniqueJobs.length) {
      setSelectedJobs([]);
    } else {
      setSelectedJobs(uniqueJobs.map(j => j.id));
    }
  }

  // --- Document Selection Logic ---
  const handleSelectAllDocs = (checked) => {
    if (checked) {
      // Select visible documents only or all filtered?
      // Usually all filtered.
      setSelectedDocuments(filteredDocuments.map(d => d.id));
    } else {
      setSelectedDocuments([]);
    }
  };

  const handleSelectOneDoc = (docId, checked) => {
    if (checked) {
      setSelectedDocuments(prev => [...prev, docId]);
    } else {
      setSelectedDocuments(prev => prev.filter(id => id !== docId));
    }
  };

  const handleSubmitTransmission = async () => {
    if (selectedDocuments.length === 0) {
      toast.error("Please select at least one document");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customer_id: formData.customerId,
        customer_location_id: formData.locationId,
        po_id: formData.poId,
        document_ids: selectedDocuments
      };

      const result = await dccService.createTransmission(payload);
      console.log("Create Transmission Result:", result);
      if (result.success) {
        toast.success(`Transmission created successfully!`);
        setView("list");
        setSuccessData(null);
        setFormData({ customerId: "", locationId: "", poId: "" });
        setAllDocuments([]);
        setSelectedDocuments([]);
        setSelectedJobs([]);
      } else {
        const errorMsg = result.message || result.error || "Failed to create transmission";
        console.error("Backend error:", errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Submission error:", error);
      const errorMsg = error.response?.data?.message || error.message || "Failed to create transmission";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleReset = () => {
    setFormData({ customerId: "", locationId: "", poId: "" });
    setAllDocuments([]);
    setSelectedDocuments([]);
    setSelectedJobs([]);
    setView("list"); // Optional: go back to list, or stay in create mode? User implies stay.
    // Actually typically reset clears the form so they can start over.
  };


  const handleExport = async () => {
    try {
      await exportApi.exportModule('transmission');
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Transmission Export failed:", error);
    }
  };

  // --- List View Data Fetching ---
  const fetchTransmissions = useCallback(async ({ page, limit, search, sorting }) => {
    try {
      const params = {
        page,
        limit,
        search,
      };

      const res = await dccService.getTransmissions(params);

      if (res.success && res.data) {
        console.log("Transmissions data:", res.data.data);
        return {
          data: res.data.data || [],
          meta: res.data.meta || {}
        }
      }
      return { data: [], meta: {} };
    } catch (error) {
      console.error("Error fetching transmissions:", error);
      return { data: [], meta: {} };
    }
  }, []);

  // --- Helper for Status Badge ---
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Approved</span>
      case 'Rejected':
        return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Rejected</span>
      case 'Pending':
      default:
        return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">Pending</span>
    }
  };

  // --- Columns Definition ---

  // List View Columns
  const listColumns = useMemo(() => [
    {
      header: "Transmission No",
      accessorKey: "transmission_number",
      cell: (row) => row?.transmission_number || '-'
    },
    {
      header: "PO Number",
      accessorKey: "po.po_number",
      cell: (row) => row?.po?.po_number || '-'
    },
    {
      header: "Customer",
      accessorKey: "customer.customer_name",
      cell: (row) => row?.customer?.customer_name || '-'
    },
    {
      header: "Document Count",
      id: "document_count",
      cell: (row) => row?.documents?.length || 0
    },
    {
      header: "Password",
      accessorKey: "password",
      cell: (row) => {
        const password = row?.password;
        if (!password) return '-';
        return (
          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
            {password}
          </span>
        );
      }
    },
    {
      header: "Created Date",
      accessorKey: "createdAt",
      cell: (row) => {
        const date = row?.createdAt;
        if (!date) return '-';
        return new Date(date).toISOString().split('T')[0]
      }
    },
    {
      header: "Client Status",
      accessorKey: "client_status",
      cell: (row) => getStatusBadge(row.client_status)
    },
    {
      header: "Actions",
      id: "actions",
      cell: (row) => {
        if (!row) return null;
        return (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              if (row.password) {
                navigator.clipboard.writeText(row.password);
                toast.success("Password copied to clipboard");
              }
            }}>
              Copy Password
            </Button>
            {row.zip_url && (
              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard.writeText(row.zip_url);
                toast.success("Zip URL copied to clipboard");
              }}>
                Copy Zip URL
              </Button>
            )}
          </div>
        );
      }
    }
  ], [navigate]);

  // Create View Document Columns
  const documentColumns = useMemo(() => [
    {
      header: ({ table }) => (
        <Checkbox
          checked={filteredDocuments.length > 0 && selectedDocuments.length === filteredDocuments.length}
          onCheckedChange={(value) => handleSelectAllDocs(!!value)}
          aria-label="Select all"
        />
      ),
      accessorKey: "select",
      cell: ({ row }) => (
        <Checkbox
          checked={selectedDocuments.includes(row.original.id)}
          onCheckedChange={(checked) => handleSelectOneDoc(row.original.id, checked)}
          aria-label={`Select ${row.original.document.document_number}`}
        />
      ),
      className: "w-[50px]"
    },
    { header: "S.No", accessorKey: "s_no" },
    { header: "Document Code", accessorKey: "document.document_number" },
    { header: "Document Name", accessorKey: "document.document_name" },
    {
      header: "Document Type",
      accessorKey: "document.document_type.name",
      cell: ({ row }) => row.original.document?.document_type?.name || '-'
    },
    {
      header: "Job Number",
      accessorKey: "group.job_group.0.job.job_number",
      cell: ({ row }) => {
        const jobs = row.original.group?.job_group;
        return jobs && jobs.length > 0 ? jobs.map(j => j.job?.job_number).join(', ') : '-';
      }
    },
    {
      header: "Version No",
      accessorKey: "display_version_no",
      cell: ({ row }) => row.original.display_version_no ? `v${row.original.display_version_no}` : '-'
    },
    { header: "Status", accessorKey: "status" }
  ], [selectedDocuments, filteredDocuments]);


  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-auto p-6 flex flex-col">
          <div className="flex-1 flex flex-col w-full">

            {/* Header Section */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {view === 'list' ? 'Transmissions' : 'Create Transmission'}
                </h1>
                <p className="text-muted-foreground">
                  {view === 'list' ? 'Manage and view existing transmissions.' : 'Select approved documents to create a new transmission.'}
                </p>
              </div>
              <div>
                {view === 'list' ? (
                  <Button onClick={() => setView('create')}>
                    <Plus className="mr-2 h-4 w-4" /> Create Transmission
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setView('list')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                  </Button>
                )}
              </div>
            </div>

            {/* Content Section */}
            {view === 'list' ? (
              <Card>
                <CardHeader><CardTitle>Transmission List</CardTitle></CardHeader>
                <CardContent>
                  <DataTable
                    columns={listColumns}
                    fetchData={fetchTransmissions}
                    pageCount={0}
                    onExport={handleExport}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {/* Selection Context */}
                <Card>
                  <CardHeader>
                    <CardTitle>Selection</CardTitle>
                    <CardDescription>Select customer, location, PO, and job in sequence</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>
                          Customer Name <span className="text-red-500">*</span>
                          {autoFilled.customerId && <span className="ml-2 text-xs text-muted-foreground">(auto-filled)</span>}
                        </Label>
                        <Select value={formData.customerId} onValueChange={handleCustomerChange}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select Customer" /></SelectTrigger>
                          <SelectContent>
                            {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>
                          Location <span className="text-red-500">*</span>
                          {autoFilled.locationId && <span className="ml-2 text-xs text-muted-foreground">(auto-filled)</span>}
                        </Label>
                        <Select value={formData.locationId} onValueChange={handleLocationChange} disabled={!formData.customerId}>
                          <SelectTrigger className="w-full h-auto py-2"><SelectValue placeholder="Select Location" /></SelectTrigger>
                          <SelectContent>
                            {getLocationsForCustomer(formData.customerId).map(l => (
                              <SelectItem key={l.id} value={l.id} className="py-2">
                                <div className="flex flex-col items-start text-left">
                                  <span className="font-medium">{l.location_name}</span>
                                  {l.gst_number && <span className="text-xs text-muted-foreground">GST: {l.gst_number}</span>}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>PO Number <span className="text-red-500">*</span></Label>
                        <Select value={formData.poId} onValueChange={handlePOChange}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select a PO" /></SelectTrigger>
                          <SelectContent>
                            {getAllPOs().map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                <div className="flex flex-col items-start text-left">
                                  <span className="font-medium">{p.po_number}</span>
                                  <span className="text-xs text-muted-foreground">{p.customerName} - {p.locationName}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Job Selection */}
                {formData.poId && uniqueJobs.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <CardTitle>Select Jobs</CardTitle>
                          <CardDescription>Select one or more jobs to include in the transmission</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleSelectAllJobs}>
                          {selectedJobs.length === uniqueJobs.length ? "Deselect All" : "Select All"}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {uniqueJobs.map(job => (
                          <div key={job.id} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50 transition-colors">
                            <Checkbox
                              id={`job-${job.id}`}
                              checked={selectedJobs.includes(job.id)}
                              onCheckedChange={() => handleJobToggle(job.id)}
                            />
                            <Label htmlFor={`job-${job.id}`} className="cursor-pointer font-medium flex-1">
                              {job.job_number}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Document List */}
                {formData.poId && (
                  <Card>
                    <CardHeader>
                      <div className="space-y-1">
                        <CardTitle>Select Approved Documents</CardTitle>
                        <CardDescription>Select documents from the selected jobs to include</CardDescription>
                      </div>

                    </CardHeader>
                    <CardContent>
                      {loadingDocs ? (
                        <div className="text-center py-4">Loading documents...</div>
                      ) : (
                        itemsWithSNo.length > 0 ? (
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[50px]">
                                    <Checkbox
                                      checked={itemsWithSNo.length > 0 && selectedDocuments.length === itemsWithSNo.length}
                                      onCheckedChange={(value) => handleSelectAllDocs(!!value)}
                                      aria-label="Select all"
                                    />
                                  </TableHead>
                                  <TableHead>S.No</TableHead>
                                  <TableHead>Document Code</TableHead>
                                  <TableHead>Document Name</TableHead>
                                  <TableHead>Document Type</TableHead>
                                  <TableHead>Job Number</TableHead>
                                  <TableHead>Version No</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {itemsWithSNo.map((doc) => (
                                  <TableRow key={doc.id}>
                                    <TableCell>
                                      <Checkbox
                                        checked={selectedDocuments.includes(doc.id)}
                                        onCheckedChange={(checked) => handleSelectOneDoc(doc.id, checked)}
                                        aria-label={`Select ${doc.document.document_number}`}
                                      />
                                    </TableCell>
                                    <TableCell>{doc.s_no}</TableCell>
                                    <TableCell>{doc.document.document_number}</TableCell>
                                    <TableCell>{doc.document.document_name}</TableCell>
                                    <TableCell>{doc.document?.document_type?.name || '-'}</TableCell>
                                    <TableCell>
                                      {(() => {
                                        const jobs = doc.group?.job_group;
                                        return jobs && jobs.length > 0 ? jobs.map(j => j.job?.job_number).join(', ') : '-';
                                      })()}
                                    </TableCell>
                                    <TableCell>
                                      {doc.display_version_no ? `v${doc.display_version_no}` : '-'}
                                    </TableCell>
                                    <TableCell>{doc.status}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            {uniqueJobs.length > 0 && selectedJobs.length === 0 ?
                              "Please select at least one job to view documents." :
                              "No approved documents found for this PO."}
                          </div>
                        )
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 mt-4">
                  <Button variant="outline" onClick={handleReset}>
                    Reset
                  </Button>
                  <Button onClick={handleSubmitTransmission} disabled={isSubmitting || selectedDocuments.length === 0}>
                    {isSubmitting ? "Creating..." : "Create Transmission"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider >
  )
}

export default CreateTransmission
