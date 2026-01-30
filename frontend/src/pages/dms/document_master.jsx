import { useState, useEffect } from "react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus } from "lucide-react"

function DocumentMaster() {
  const [documentFormData, setDocumentFormData] = useState({
    document_number: "",
    document_name: "",
    document_type_id: "",
  })
  const [documentTypeFormData, setDocumentTypeFormData] = useState({
    name: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingType, setIsLoadingType] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [documents, setDocuments] = useState([])
  const [documentTypes, setDocumentTypes] = useState([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [typeError, setTypeError] = useState("")
  const [typeSuccess, setTypeSuccess] = useState("")
  const [showTypeForm, setShowTypeForm] = useState(false)

  // Fetch documents and document types from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
        
        // Get auth token
        const authData = localStorage.getItem("user_auth")
        let token = null
        if (authData) {
          try {
            const parsed = JSON.parse(authData)
            token = parsed?.payload?.token || parsed?.token
          } catch {
            // If parsing fails, continue without token
          }
        }

        const headers = {
          "Content-Type": "application/json",
        }
        if (token) {
          headers["Authorization"] = `Bearer ${token}`
        }

        // Fetch documents and document types in parallel
        const [documentsRes, typesRes] = await Promise.all([
          fetch(`${backendUrl}/api/dcc/document`, {
            method: "GET",
            headers,
            credentials: "include",
          }),
          fetch(`${backendUrl}/api/dcc/document-type`, {
            method: "GET",
            headers,
            credentials: "include",
          }),
        ])

        const documentsContentType = documentsRes.headers.get("content-type") || ""
        const documentsPayload = documentsContentType.includes("application/json")
          ? await documentsRes.json()
          : await documentsRes.text()

        const typesContentType = typesRes.headers.get("content-type") || ""
        const typesPayload = typesContentType.includes("application/json")
          ? await typesRes.json()
          : await typesRes.text()

        if (!documentsRes.ok) {
          const message =
            typeof documentsPayload === "string"
              ? documentsPayload
              : documentsPayload?.message || "Failed to fetch documents"
          throw new Error(message)
        }

        if (!typesRes.ok) {
          const message =
            typeof typesPayload === "string"
              ? typesPayload
              : typesPayload?.message || "Failed to fetch document types"
          throw new Error(message)
        }

        // Extract data from responses
        const documentsData = documentsPayload?.data || documentsPayload?.documents || []
        const typesData = typesPayload?.data || typesPayload?.documentTypes || []

        setDocuments(documentsData)
        setDocumentTypes(typesData)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err?.message || "Failed to load data")
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchData()
  }, [])

  // Handle document form input changes
  const handleDocumentInputChange = (e) => {
    const { name, value } = e.target
    setDocumentFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (error) setError("")
  }

  const handleDocumentTypeSelectChange = (value) => {
    setDocumentFormData((prev) => ({
      ...prev,
      document_type_id: value,
    }))
    if (error) setError("")
  }

  // Handle document type form input changes
  const handleTypeInputChange = (e) => {
    const { name, value } = e.target
    setDocumentTypeFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (typeError) setTypeError("")
  }

  // Create document type
  const handleCreateDocumentType = async (e) => {
    e.preventDefault()
    setTypeError("")
    setTypeSuccess("")
    setIsLoadingType(true)

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
      
      // Get auth token
      const authData = localStorage.getItem("user_auth")
      let token = null
      if (authData) {
        try {
          const parsed = JSON.parse(authData)
          token = parsed?.payload?.token || parsed?.token
        } catch {
          // If parsing fails, continue without token
        }
      }

      const headers = {
        "Content-Type": "application/json",
      }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const res = await fetch(`${backendUrl}/api/dcc/create-document-type`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          name: documentTypeFormData.name.trim(),
        }),
      })

      const contentType = res.headers.get("content-type") || ""
      const payload = contentType.includes("application/json")
        ? await res.json()
        : await res.text()

      if (!res.ok) {
        const message =
          typeof payload === "string"
            ? payload
            : payload?.message || "Failed to create document type"
        throw new Error(message)
      }

      setTypeSuccess("Document type created successfully!")
      setDocumentTypeFormData({ name: "" })
      setShowTypeForm(false)

      // Refresh document types list
      const typesRes = await fetch(`${backendUrl}/api/dcc/document-type`, {
        method: "GET",
        headers,
        credentials: "include",
      })
      const typesContentType = typesRes.headers.get("content-type") || ""
      const typesPayload = typesContentType.includes("application/json")
        ? await typesRes.json()
        : await typesRes.text()

      if (typesRes.ok) {
        const typesData = typesPayload?.data || typesPayload?.documentTypes || []
        setDocumentTypes(typesData)
      }

      setTimeout(() => {
        setTypeSuccess("")
      }, 3000)
    } catch (err) {
      setTypeError(err?.message || "Something went wrong")
    } finally {
      setIsLoadingType(false)
    }
  }

  // Create document
  const handleCreateDocument = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
      
      // Get auth token
      const authData = localStorage.getItem("user_auth")
      let token = null
      if (authData) {
        try {
          const parsed = JSON.parse(authData)
          token = parsed?.payload?.token || parsed?.token
        } catch {
          // If parsing fails, continue without token
        }
      }

      const headers = {
        "Content-Type": "application/json",
      }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const res = await fetch(`${backendUrl}/api/dcc/create-document-master`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          document_number: documentFormData.document_number.trim(),
          document_name: documentFormData.document_name.trim(),
          document_type_id: documentFormData.document_type_id,
        }),
      })

      const contentType = res.headers.get("content-type") || ""
      const payload = contentType.includes("application/json")
        ? await res.json()
        : await res.text()

      if (!res.ok) {
        const message =
          typeof payload === "string"
            ? payload
            : payload?.message || "Failed to create document"
        throw new Error(message)
      }

      setSuccess("Document created successfully!")
      setDocumentFormData({
        document_number: "",
        document_name: "",
        document_type_id: "",
      })

      // Refresh documents list
      const documentsRes = await fetch(`${backendUrl}/api/dcc/document`, {
        method: "GET",
        headers,
        credentials: "include",
      })
      const documentsContentType = documentsRes.headers.get("content-type") || ""
      const documentsPayload = documentsContentType.includes("application/json")
        ? await documentsRes.json()
        : await documentsRes.text()

      if (documentsRes.ok) {
        const documentsData = documentsPayload?.data || documentsPayload?.documents || []
        setDocuments(documentsData)
      }

      setTimeout(() => {
        setSuccess("")
      }, 3000)
    } catch (err) {
      setError(err?.message || "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Document Master</h1>
              <p className="text-muted-foreground">
                Create and manage document types and documents in the system.
              </p>
            </div>

            {/* Error and Success Messages */}
            {error && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-md">
                <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
              </div>
            )}

            {isLoadingData ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground">Loading data...</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Create Document Type Section */}
                <Card className="mb-6">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Create Document Type</CardTitle>
                        <CardDescription>
                          Add a new document type to the system
                        </CardDescription>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTypeForm(!showTypeForm)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {showTypeForm ? "Hide" : "Add Type"}
                      </Button>
                    </div>
                  </CardHeader>
                  {showTypeForm && (
                    <CardContent>
                      {typeError && (
                        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                          <p className="text-sm text-destructive">{typeError}</p>
                        </div>
                      )}
                      {typeSuccess && (
                        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                          <p className="text-sm text-green-600 dark:text-green-400">{typeSuccess}</p>
                        </div>
                      )}
                      <form onSubmit={handleCreateDocumentType}>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="typeName">
                              Document Type Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="typeName"
                              name="name"
                              type="text"
                              placeholder="e.g., Invoice, Receipt, Certificate"
                              value={documentTypeFormData.name}
                              onChange={handleTypeInputChange}
                              required
                              disabled={isLoadingType}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowTypeForm(false)
                                setDocumentTypeFormData({ name: "" })
                                setTypeError("")
                                setTypeSuccess("")
                              }}
                              disabled={isLoadingType}
                            >
                              Cancel
                            </Button>
                            <Button type="submit" disabled={isLoadingType}>
                              {isLoadingType ? "Creating..." : "Create Type"}
                            </Button>
                          </div>
                        </div>
                      </form>
                    </CardContent>
                  )}
                </Card>

                {/* Create Document Section */}
                <form onSubmit={handleCreateDocument}>
                  <Card>
                    <CardHeader>
                      <CardTitle>Create Document</CardTitle>
                      <CardDescription>
                        Enter the details for the new document
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="document_number">
                          Document Number <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="document_number"
                          name="document_number"
                          type="text"
                          placeholder="e.g., DOC-001, INV-001"
                          value={documentFormData.document_number}
                          onChange={handleDocumentInputChange}
                          required
                          disabled={isLoading}
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter a unique number for this document
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="document_name">
                          Document Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="document_name"
                          name="document_name"
                          type="text"
                          placeholder="e.g., Sales Invoice, Purchase Receipt"
                          value={documentFormData.document_name}
                          onChange={handleDocumentInputChange}
                          required
                          disabled={isLoading}
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter a descriptive name for this document
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="document_type_id">
                            Document Type <span className="text-destructive">*</span>
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowTypeForm(true)}
                            className="text-xs h-auto p-1"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add New Type
                          </Button>
                        </div>
                        <Select
                          value={documentFormData.document_type_id}
                          onValueChange={handleDocumentTypeSelectChange}
                          disabled={isLoading || documentTypes.length === 0}
                          required
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a document type" />
                          </SelectTrigger>
                          <SelectContent>
                            {documentTypes.length > 0 ? (
                              documentTypes.map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                  {type.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-type" disabled>
                                No document types available. Create one first.
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Select the category for this document
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Submit Buttons */}
                  <div className="flex justify-end gap-4 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDocumentFormData({
                          document_number: "",
                          document_name: "",
                          document_type_id: "",
                        })
                        setError("")
                      }}
                      disabled={isLoading}
                    >
                      Reset
                    </Button>
                    <Button type="submit" disabled={isLoading || documentTypes.length === 0}>
                      {isLoading ? "Creating..." : "Create Document"}
                    </Button>
                  </div>
                </form>
              </>
            )}

            {/* Documents List Table */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Documents List</CardTitle>
                <CardDescription>
                  List of all documents in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">S.No</TableHead>
                        <TableHead>Document Number</TableHead>
                        <TableHead>Document Name</TableHead>
                        <TableHead>Document Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.length > 0 ? (
                        documents.map((document, index) => (
                          <TableRow key={document.id}>
                            <TableCell className="font-medium">
                              {index + 1}
                            </TableCell>
                            <TableCell>{document.document_number || document.documentNumber}</TableCell>
                            <TableCell>{document.document_name || document.documentName}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                {document.document_type?.name || document.documentType || "N/A"}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="h-24 text-center"
                          >
                            No documents found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default DocumentMaster

