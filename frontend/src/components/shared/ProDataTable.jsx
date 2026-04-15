import React, { useState, useEffect, useCallback, useRef } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { 
  Search, 
  Plus, 
  Download, 
  Settings2, 
  Filter, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  Check 
} from "lucide-react"

/**
 * Utility to resolve nested object paths (e.g., "group.name")
 */
const resolvePath = (obj, path) => {
  if (!path) return ""
  return path.split(".").reduce((prev, curr) => (prev ? prev[curr] : ""), obj) || ""
}

/**
 * MultiSelectFilter - Compact inline select for headers
 */
const MultiSelectFilter = ({ options, value, onChange, placeholder }) => {
  const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (val) => {
    const newVal = selectedValues.includes(val)
      ? selectedValues.filter(v => v !== val)
      : [...selectedValues, val];
    onChange(newVal);
  };

  const clearFilters = (e) => {
    e.stopPropagation();
    onChange([]);
    setSearchTerm("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-[10px] font-normal w-full min-w-[90px] justify-between px-2 bg-white border-slate-300 shadow-none"
        >
          <div className="flex items-center gap-1 truncate mr-1">
            {selectedValues.length === 0 ? (
              <span className="text-slate-400 capitalize">{placeholder}</span>
            ) : (
                <div className="flex items-center gap-1">
                    <span className="font-bold text-blue-600 bg-blue-50 px-1 rounded-sm">
                        {selectedValues.length}
                    </span>
                    <span className="truncate normal-case">{options.find(o => o.value === selectedValues[0])?.label}</span>
                    {selectedValues.length > 1 && <span className="text-slate-400">...</span>}
                </div>
            )}
          </div>
          <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[180px] p-0" align="start">
        <div className="flex flex-col max-h-[250px]">
          <div className="p-2 border-b">
            <div className="relative">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                <Input
                    placeholder="Search..."
                    className="h-8 pl-8 text-xs shadow-none border-none focus-visible:ring-0"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
            {filteredOptions.map((opt) => (
              <div
                key={opt.value}
                className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-100 rounded-sm cursor-pointer"
                onClick={() => toggleOption(opt.value)}
              >
                <Checkbox checked={selectedValues.includes(opt.value)} className="h-3.5 w-3.5" />
                <span className="text-xs text-slate-700">{opt.label}</span>
              </div>
            ))}
          </div>
          {selectedValues.length > 0 && (
            <div className="p-1.5 border-t bg-slate-50">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="w-full h-7 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Clear All
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

/**
 * TableSettings - Gear menu for sticky column management
 */
const TableSettings = ({ columns, stickyColumns, setStickyColumns }) => {
  const [open, setOpen] = useState(false)

  const toggleSticky = (colId) => {
    setStickyColumns(prev => 
      prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200 text-slate-600 shadow-none">
           <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="end">
        <div className="p-3 border-b bg-slate-50">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Table Settings</h4>
        </div>
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
          <p className="px-2 py-1.5 text-[10px] font-semibold text-slate-400 uppercase">Sticky Columns</p>
          <div className="space-y-0.5 pb-1">
            {columns.map(col => {
              const id = col.id || col.accessorKey;
              if (!id) return null;
              return (
                <div 
                  key={id} 
                  className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer"
                  onClick={() => toggleSticky(id)}
                >
                  <Checkbox checked={stickyColumns.includes(id)} className="h-4 w-4" />
                  <span className="text-xs text-slate-700">{col.header}</span>
                </div>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * ProDataTable - The "Ideal Table" shared component
 */
const ProDataTable = ({
  columns,
  fetchData,
  onAdd,
  onExport,
  columnFilters = {},
  onFilterChange,
  refreshKey = 0,
  topFilters = [], // Array of { value, onChange, options: [{label, value}], placeholder }
  globalSearchPlaceholder = "Search...",
  initialStickyColumns = [],
  onAddTooltip = "Add New"
}) => {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [stickyColumns, setStickyColumns] = useState(initialStickyColumns);
  const [activeHeaderFilters, setActiveHeaderFilters] = useState(new Set());

  const isFirstRender = useRef(true);

  // Debounce global search
  useEffect(() => {
    if (isFirstRender.current) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Sync Data
  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await fetchData({
          page,
          limit: pageSize,
          search: debouncedSearch,
          columnFilters
        });
        if (!cancelled) {
          setData(result.data || []);
          setMeta(result.meta || {});
        }
      } catch (error) {
        console.error("ProDataTable sync error:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, [page, pageSize, debouncedSearch, columnFilters, fetchData, refreshKey]);

  useEffect(() => {
    if (isFirstRender.current) isFirstRender.current = false;
  }, []);

  // Handlers
  const toggleRow = (id) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === data.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(data.map(item => item.id)));
  };

  const toggleHeaderFilter = (columnId) => {
    setActiveHeaderFilters(prev => {
      const next = new Set(prev);
      if (next.has(columnId)) next.delete(columnId);
      else next.add(columnId);
      return next;
    });
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden space-y-2.5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xs transition-all focus-within:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={globalSearchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-white border-slate-200 focus-visible:ring-1 text-xs rounded-md shadow-none"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <TooltipProvider>
            {/* Top-Right Dropdown Filters */}
            {topFilters.map((tf, i) => (
              <Select key={i} value={tf.value} onValueChange={tf.onChange}>
                <SelectTrigger className="w-[140px] h-9 bg-white border-slate-200 text-xs font-semibold shadow-none">
                  <SelectValue placeholder={tf.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {tf.options.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}

            {onExport && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={onExport} className="h-9 w-9 border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-none">
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">Export Data</p></TooltipContent>
              </Tooltip>
            )}

            <TableSettings 
              columns={columns} 
              stickyColumns={stickyColumns} 
              setStickyColumns={setStickyColumns} 
            />

            {onAdd && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={onAdd} className="h-9 w-9 bg-slate-800 text-white hover:bg-slate-700 shadow-none ml-1">
                    <Plus className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">{onAddTooltip}</p></TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded border bg-white relative flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto custom-scrollbar bg-white">
          <Table className="relative border-collapse w-max min-w-full">
            <TableHeader className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200">
              <TableRow className="hover:bg-transparent h-9 border-none">
                <TableHead className="w-[40px] sticky left-0 z-40 bg-slate-100 border-r border-slate-200 px-0 flex items-center justify-center h-9">
                    <Checkbox
                      checked={selectedRows.size === data.length && data.length > 0}
                      onCheckedChange={() => toggleAll()}
                      className="h-3.5 w-3.5"
                    />
                </TableHead>
                {columns.map((col, idx) => {
                  const columnId = col.id || col.accessorKey;
                  const isSticky = stickyColumns.includes(columnId);
                  const stickyClass = isSticky ? "sticky left-[40px] z-40 bg-slate-100 border-r border-slate-200" : "";
                  const hasFilter = !!(columnFilters[columnId]);

                  return (
                    <TableHead 
                      key={idx} 
                      className={`${col.className || ""} ${stickyClass} h-9 whitespace-nowrap px-3 text-[11px] font-bold uppercase text-slate-700 tracking-wider transition-all`}
                      style={{ width: col.width || 'auto' }}
                    >
                      <div className="flex items-center justify-between gap-1 h-full py-1">
                        {!activeHeaderFilters.has(columnId) ? (
                          <>
                            <span className="truncate">{col.header}</span>
                            {col.filterType && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => toggleHeaderFilter(columnId)}
                                className={`h-6 w-6 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 ${hasFilter ? 'text-blue-600' : ''}`}
                              >
                                {col.filterType === 'select' ? <Filter className="h-3 w-3" /> : <Search className="h-3 w-3" />}
                              </Button>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-1 w-full animate-in fade-in duration-200">
                             {col.filterType === 'select' ? (
                               col.isMulti ? (
                                <MultiSelectFilter
                                  options={col.filterOptions || []}
                                  value={columnFilters[columnId]}
                                  onChange={(val) => onFilterChange({ [columnId]: val })}
                                  placeholder={col.header}
                                />
                               ) : (
                                <Select
                                  value={columnFilters[columnId] || "all"}
                                  onValueChange={(val) => onFilterChange({ [columnId]: val === 'all' ? "" : val })}
                                >
                                  <SelectTrigger className="h-7 text-[10px] w-full bg-white border-slate-300 shadow-none ring-0 focus:ring-1 focus:ring-blue-400 font-normal">
                                    <SelectValue placeholder={`All ${col.header}`} />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[250px]">
                                    <SelectItem value="all" className="text-xs italic text-slate-400 font-normal">All {col.header}</SelectItem>
                                    {col.filterOptions?.map((opt, i) => (
                                      <SelectItem key={`${opt.value}-${i}`} value={opt.value.toString()} className="text-xs font-normal">{opt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                               )
                             ) : (
                              <div className="relative flex-1">
                                <Input
                                  autoFocus
                                  placeholder={`Filter ${col.header}...`}
                                  value={columnFilters[columnId] || ""}
                                  onChange={(e) => onFilterChange({ [columnId]: e.target.value })}
                                  className="h-7 text-[10px] px-2 bg-white border-slate-300 focus-visible:ring-1 focus-visible:ring-blue-400 shadow-none normal-case font-normal"
                                />
                              </div>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => {
                                if (columnFilters[columnId]) onFilterChange({ [columnId]: "" });
                                toggleHeaderFilter(columnId);
                              }}
                              className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={columns.length + 1} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                    Loading...
                  </div>
                </TableCell></TableRow>
              ) : data.length ? (
                data.map((row, rIdx) => {
                  const isSelected = selectedRows.has(row.id);
                  return (
                    <TableRow 
                      key={rIdx} 
                      className={`h-8 transition-colors group ${isSelected ? 'bg-[#e0f2fe] hover:bg-[#bae6fd]' : 'hover:bg-slate-50/50'}`}
                    >
                      <TableCell className={`w-[40px] min-w-[40px] max-w-[40px] sticky left-0 z-30 border-r border-slate-100 p-0 h-8 ${isSelected ? 'bg-[#bae6fd] group-hover:bg-[#7dd3fc]' : 'bg-white group-hover:bg-slate-50/80'} transition-colors`}>
                        <div className="flex items-center justify-center h-full w-full">
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleRow(row.id)} className="h-3.5 w-3.5" />
                        </div>
                      </TableCell>
                      {columns.map((col, cIdx) => {
                        const columnId = col.id || col.accessorKey;
                        const isSticky = stickyColumns.includes(columnId);
                        const stickyClass = isSticky 
                          ? `sticky left-[40px] z-30 border-r border-slate-100 ${isSelected ? 'bg-[#bae6fd] group-hover:bg-[#7dd3fc]' : 'bg-white group-hover:bg-slate-50/80'}` 
                          : "";
                        
                        return (
                          <TableCell key={cIdx} className={`${col.className || ""} ${stickyClass} py-0 px-3 h-8 text-[11px] font-medium text-slate-600 truncate border-b border-slate-100/60 transition-colors`}>
                            {col.cell ? col.cell(row) : resolvePath(row, col.accessorKey)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow><TableCell colSpan={columns.length + 1} className="h-24 text-center text-slate-400 font-medium whitespace-nowrap">No records found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between py-2 px-3 border-t bg-slate-50/50 rounded-b-md">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Rows per page</p>
          <Select value={pageSize.toString()} onValueChange={(val) => { setPageSize(parseInt(val)); setPage(1); }}>
            <SelectTrigger className="h-7 w-[65px] bg-white border-slate-200 text-xs">
                <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
                {[5, 10, 20, 50, 100].map(sz => (
                  <SelectItem key={sz} value={sz.toString()} className="text-xs">{sz}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-6">
            <div className="text-[11px] font-medium text-slate-500">
                Page <span className="text-slate-900">{meta.page || 1}</span> of <span className="text-slate-900">{meta.totalPages || 1}</span> (<span className="text-slate-900">{meta.total || 0}</span> items)
            </div>
            <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" className="h-8 px-2.5 text-slate-600 hover:bg-slate-200" onClick={() => setPage(page - 1)} disabled={page <= 1 || loading}>
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> <span className="text-xs">Prev</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-2.5 text-slate-600 hover:bg-slate-200" onClick={() => setPage(page + 1)} disabled={page >= (meta.totalPages || 1) || loading}>
                    <span className="text-xs">Next</span> <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProDataTable;
