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
import { DataTable } from "@/components/shared/DataTable"
import { Plus, ArrowLeft } from "lucide-react"

function DocumentMaster() {
  const [view, setView] = useState("list") // 'list' or 'create'

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
  const [documentTypes, setDocumentTypes] = useState([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [typeError, setTypeError] = useState("")
  const [typeSuccess, setTypeSuccess] = useState("")
  const [showTypeForm, setShowTypeForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const columns = useMemo(() => [
    {
      accessorKey: "document_number",
      header: "Document Number",
    },
    {
      accessorKey: "document_name",
      header: "Document Name",
    },
    {
      accessorKey: "document_type.name",
      header: "Document Type",
      cell: (row) => (
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {row.document_type?.name || "N/A"}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created Date",
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ], [])

  const fetchDocuments = useCallback(async ({ page, limit, search, sorting }) => {
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

      const headers = {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
      }

      const params = new URLSearchParams()
      params.append("page", page)
      params.append("limit", limit)
      if (search) params.append("search", search)
      if (sorting && sorting.length > 0) {
        params.append("sortBy", sorting[0].id)
        params.append("sortOrder", sorting[0].desc ? "desc" : "asc")
      }

      const res = await fetch(`${backendUrl}/api/dcc/document?${params.toString()}`, {
        method: "GET",
        headers,
        credentials: "include",
      })

      const responseData = await res.json()

      if (res.ok && responseData.success) {
        return {
          data: responseData.data || [],
          meta: responseData.meta || {}
        }
      } else {
        console.error("Failed to fetch documents", responseData)
        return { data: [], meta: {} }
      }
    } catch (err) {
      console.error("Error fetching documents:", err)
      return { data: [], meta: {} }
    }
  }, [])

  // Fetch document types
  const fetchDocumentTypes = async () => {
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

      const headers = {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
      }

      const res = await fetch(`${backendUrl}/api/dcc/document-type`, {
        method: "GET",
        headers,
        credentials: "include",
      })

      const responseData = await res.json()
      if (res.ok) {
        setDocumentTypes(responseData.data || responseData.documentTypes || [])
      } else {
        console.error("Failed to fetch document types", responseData)
      }
    } catch (err) {
      console.error("Error fetching document types:", err)
    }
  }

  useEffect(() => {
    if (view === "create") {
      fetchDocumentTypes()
    }
  }, [view])

  const handleDocumentInputChange = (e) => {
    const { name, value } = e.target
    setDocumentFormData((prev) => ({ ...prev, [name]: value }))
    if (error) setError("")
  }

  const handleDocumentTypeSelectChange = (value) => {
    setDocumentFormData((prev) => ({ ...prev, document_type_id: value }))
    if (error) setError("")
  }

  const handleTypeInputChange = (e) => {
    const { name, value } = e.target
    setDocumentTypeFormData((prev) => ({ ...prev, [name]: value }))
    if (typeError) setTypeError("")
  }

  const handleCreateDocumentType = async (e) => {
    e.preventDefault()
    setTypeError("")
    setTypeSuccess("")
    setIsLoadingType(true)

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

      const headers = {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
      }

      const res = await fetch(`${backendUrl}/api/dcc/create-document-type`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ name: documentTypeFormData.name.trim() }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.message || "Failed to create document type")

      setTypeSuccess("Document type created successfully!")
      setDocumentTypeFormData({ name: "" })
      setShowTypeForm(false)

      fetchDocumentTypes() // Refresh types

      setTimeout(() => setTypeSuccess(""), 3000)
    } catch (err) {
      setTypeError(err?.message || "Something went wrong")
    } finally {
      setIsLoadingType(false)
    }
  }

  const handleCreateDocument = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

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

      const headers = {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
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

      const data = await res.json()

      if (!res.ok) throw new Error(data.message || "Failed to create document")

      setSuccess("Document created successfully!")
      setDocumentFormData({
        document_number: "",
        document_name: "",
        document_type_id: "",
      })

      setRefreshKey(prev => prev + 1)
      setTimeout(() => {
        setSuccess("")
        setView("list")
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
        <main className="flex-1 overflow-auto p-6 flex flex-col">
          <div className="flex-1 flex flex-col w-full">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {view === "list" ? "Document Master List" : "Create Document"}
                </h1>
                <p className="text-muted-foreground">
                  {view === "list"
                    ? "List of all documents and types"
                    : "Create and manage document types and documents."}
                </p>
              </div>
              <div>
                {view === "list" ? (
                  <Button onClick={() => setView("create")}>
                    <Plus className="mr-2 h-4 w-4" /> Create Document
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setView("list")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                  </Button>
                )}
              </div>
            </div>

            {view === "list" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>View all documents in the system.</CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={columns}
                    fetchData={fetchDocuments}
                    key={refreshKey}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Create Document Type Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Create Document Type</CardTitle>
                        <CardDescription>Add a new document type to the system</CardDescription>
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
                            <Label htmlFor="typeName">Document Type Name *</Label>
                            <Input
                              id="typeName"
                              name="name"
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
                      <CardDescription>Enter the details for the new document</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {error && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {error}
                        </div>
                      )}
                      {success && (
                        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
                          {success}
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="document_number">Document Number *</Label>
                        <Input
                          id="document_number"
                          name="document_number"
                          placeholder="e.g., DOC-001, INV-001"
                          value={documentFormData.document_number}
                          onChange={handleDocumentInputChange}
                          required
                          disabled={isLoading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="document_name">Document Name *</Label>
                        <Input
                          id="document_name"
                          name="document_name"
                          placeholder="e.g., Sales Invoice, Purchase Receipt"
                          value={documentFormData.document_name}
                          onChange={handleDocumentInputChange}
                          required
                          disabled={isLoading}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="document_type_id">Document Type *</Label>
                          {!showTypeForm && (
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              onClick={() => setShowTypeForm(true)}
                              className="h-auto p-0 text-xs"
                            >
                              + Add New Type
                            </Button>
                          )}
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
                                <SelectItem key={type.id} value={String(type.id)}>
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
                      </div>

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
                    </CardContent>
                  </Card>
                </form>
              </div>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default DocumentMaster
