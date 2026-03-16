import { useState, useCallback, useEffect, useRef } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Download } from "lucide-react"

export function DataTable({
    columns,
    fetchData,
    initialData = [],
    initialMeta = {},
    onExport = null,
}) {
    const [data, setData] = useState(initialData)
    const [meta, setMeta] = useState(initialMeta)
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [search, setSearch] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const isFirstRender = useRef(true)

    // Debounce the search input — only update debouncedSearch after 500ms
    useEffect(() => {
        // Skip debounce on first render (initial empty value)
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }
        const timer = setTimeout(() => {
            setDebouncedSearch(search)
            setPage(1) // Reset to page 1 on search
        }, 500)
        return () => clearTimeout(timer)
    }, [search])

    // Single effect for all data loading — fires once on mount and when deps change
    useEffect(() => {
        let cancelled = false
        const loadData = async () => {
            setLoading(true)
            try {
                const result = await fetchData({ page, limit: pageSize, search: debouncedSearch })
                if (!cancelled) {
                    setData(result.data || [])
                    setMeta(result.meta || {})
                }
            } catch (error) {
                console.error("Failed to load data", error)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        loadData()
        return () => { cancelled = true }
    }, [fetchData, page, pageSize, debouncedSearch])

    const handleSearchChange = (e) => {
        setSearch(e.target.value)
    }

    const handlePageChange = (newPage) => {
        setPage(newPage)
    }

    const handlePageSizeChange = (val) => {
        setPageSize(parseInt(val))
        setPage(1)
    }

    // Helper to resolve dot notation (e.g. "job.job_number")
    const resolvePath = (object, path) => {
        if (!path) return undefined;
        return path.split('.').reduce((o, p) => (o ? o[p] : undefined), object);
    };

    const handleExport = () => {
        if (typeof onExport === 'function') {
            onExport();
            return;
        }

        // Basic CSV Export
        if (!data || !data.length) return;

        const headers = columns.map(col => col.header).join(",");
        const rows = data.map(row => {
            return columns.map(col => {
                let value = resolvePath(row, col.accessorKey);

                // Try to use cell renderer if value is missing or for formatting
                if (col.cell && typeof col.cell === 'function') {
                    try {
                        const rendered = col.cell(row);
                        if (typeof rendered === 'string' || typeof rendered === 'number') {
                            value = rendered;
                        }
                    } catch (e) {
                        // Fallback to accessor if cell render fails (e.g. expects complex props)
                    }
                }

                return `"${String(value || "").replace(/"/g, '""')}"`; // Escape quotes
            }).join(",");
        }).join("\n");

        const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Input
                    placeholder="Search..."
                    value={search}
                    onChange={handleSearchChange}
                    className="max-w-sm"
                />
                <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map((col, idx) => (
                                <TableHead key={idx} className={col.className}>
                                    {col.header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : data.length ? (
                            data.map((row, rIdx) => (
                                <TableRow key={rIdx}>
                                    {columns.map((col, cIdx) => (
                                        <TableCell key={cIdx} className={col.className}>
                                            {col.cell ? col.cell(row) : resolvePath(row, col.accessorKey)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Rows per page</p>
                    <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={pageSize} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                        Page {meta.page} of {meta.totalPages} ({meta.total} items)
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page <= 1 || loading}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page >= meta.totalPages || loading}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
