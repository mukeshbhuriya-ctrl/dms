import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
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
  Calendar,
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  Check,
  Upload,
  FileText,
  SlidersHorizontal
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Utility to resolve nested object paths (e.g., "group.name")
 */
const resolvePath = (obj, path) => {
  if (!path) return ""
  return path.split(".").reduce((prev, curr) => (prev ? prev[curr] : ""), obj) || ""
}

/**
 * Density configurations for row sizing and spacing
 */
const DENSITY_CONFIG = {
  compact: {
    label: "Compact",
    rowHeight: "h-8 min-h-[32px]",
    cellPadding: "py-1 px-3",
    fontSize: "text-[11px]",
  },
  standard: {
    label: "Standard",
    rowHeight: "h-10 min-h-[40px]",
    cellPadding: "py-2 px-3",
    fontSize: "text-xs",
  },
  relaxed: {
    label: "Relaxed",
    rowHeight: "h-12 min-h-[48px]",
    cellPadding: "py-3 px-3",
    fontSize: "text-xs",
  },
}

/**
 * MultiSelectFilter - Popover filter for multiple selection options
 */
const MultiSelectFilter = ({ options, value, onChange, placeholder }) => {
  const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = (options || []).filter(opt => 
    String(opt.label || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (val) => {
    const newVal = selectedValues.includes(val)
      ? selectedValues.filter(v => v !== val)
      : [...selectedValues, val];
    onChange(newVal);
  };

  const clearFilters = (e) => {
    e?.stopPropagation?.();
    onChange([]);
    setSearchTerm("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-6 px-1.5 text-[10px] font-medium transition-colors rounded-xs",
            selectedValues.length > 0 
              ? "bg-blue-50 text-blue-600 hover:bg-blue-100" 
              : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          )}
          title={`Filter by ${placeholder}`}
        >
          <Filter className="h-3 w-3 shrink-0" />
          {selectedValues.length > 0 && (
            <span className="ml-1 text-[9px] font-bold bg-blue-600 text-white rounded-full px-1 min-w-[14px] h-[14px] inline-flex items-center justify-center">
              {selectedValues.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0 shadow-lg" align="start">
        <div className="flex flex-col max-h-[260px]">
          <div className="p-2 border-b bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search options..."
                className="h-7 pl-7 text-xs shadow-none bg-white border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <p className="text-center text-[11px] text-slate-400 py-3">No options</p>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-100 rounded-xs cursor-pointer select-none"
                  onClick={() => toggleOption(opt.value)}
                >
                  <Checkbox checked={selectedValues.includes(opt.value)} className="h-3.5 w-3.5" />
                  <span className="text-xs text-slate-700 truncate">{opt.label}</span>
                </div>
              ))
            )}
          </div>
          {selectedValues.length > 0 && (
            <div className="p-1.5 border-t bg-slate-50 flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="w-full h-7 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Clear All ({selectedValues.length})
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

/**
 * TextFilterPopover - Fixed-dimension text filter popover (prevents column width jumps)
 */
const TextFilterPopover = ({ value, onChange, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [tempVal, setTempVal] = useState(value || "");
  const hasFilter = Boolean(value);

  useEffect(() => {
    setTempVal(value || "");
  }, [value]);

  const handleApply = (e) => {
    e?.preventDefault?.();
    onChange(tempVal);
    setOpen(false);
  };

  const handleClear = () => {
    setTempVal("");
    onChange("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-6 px-1.5 text-[10px] font-medium transition-colors rounded-xs",
            hasFilter 
              ? "bg-blue-50 text-blue-600 hover:bg-blue-100" 
              : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          )}
          title={`Filter by ${placeholder}`}
        >
          <Search className="h-3 w-3 shrink-0" />
          {hasFilter && (
            <span className="ml-1 w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-2.5 shadow-lg" align="start">
        <form onSubmit={handleApply} className="space-y-2">
          <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Filter {placeholder}
          </p>
          <Input
            autoFocus
            placeholder={`Contains text...`}
            value={tempVal}
            onChange={(e) => setTempVal(e.target.value)}
            className="h-8 text-xs bg-white border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-400 shadow-none"
          />
          <div className="flex items-center justify-between pt-1 gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="h-7 text-[11px] text-slate-500 hover:text-red-600 px-2 shadow-none"
            >
              Clear
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-7 text-[11px] bg-slate-800 text-white hover:bg-slate-700 px-3 shadow-none"
            >
              Apply
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
};

/**
 * DateFilterPopover - Fixed-dimension date filter popover
 */
const DateFilterPopover = ({ value, onChange, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [tempVal, setTempVal] = useState(value || "");
  const hasFilter = Boolean(value);

  useEffect(() => {
    setTempVal(value || "");
  }, [value]);

  const handleApply = (e) => {
    e?.preventDefault?.();
    onChange(tempVal);
    setOpen(false);
  };

  const handleClear = () => {
    setTempVal("");
    onChange("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-6 px-1.5 text-[10px] font-medium transition-colors rounded-xs",
            hasFilter 
              ? "bg-blue-50 text-blue-600 hover:bg-blue-100" 
              : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          )}
          title={`Filter date for ${placeholder}`}
        >
          <Calendar className="h-3 w-3 shrink-0" />
          {hasFilter && (
            <span className="ml-1 w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-2.5 shadow-lg" align="start">
        <form onSubmit={handleApply} className="space-y-2">
          <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Filter {placeholder}
          </p>
          <Input
            type="date"
            autoFocus
            value={tempVal}
            onChange={(e) => setTempVal(e.target.value)}
            className="h-8 text-xs bg-white border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-400 shadow-none"
          />
          <div className="flex items-center justify-between pt-1 gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="h-7 text-[11px] text-slate-500 hover:text-red-600 px-2 shadow-none"
            >
              Clear
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-7 text-[11px] bg-slate-800 text-white hover:bg-slate-700 px-3 shadow-none"
            >
              Apply
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
};

/**
 * SingleSelectFilterPopover - Fixed-dimension single select filter
 */
const SingleSelectFilterPopover = ({ options, value, onChange, placeholder }) => {
  const [open, setOpen] = useState(false);
  const hasFilter = Boolean(value && value !== "all");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-6 px-1.5 text-[10px] font-medium transition-colors rounded-xs",
            hasFilter 
              ? "bg-blue-50 text-blue-600 hover:bg-blue-100" 
              : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          )}
          title={`Filter by ${placeholder}`}
        >
          <Filter className="h-3 w-3 shrink-0" />
          {hasFilter && (
            <span className="ml-1 w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-2 shadow-lg" align="start">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider px-1">
            Filter {placeholder}
          </p>
          <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-0.5">
            <div
              className={cn(
                "px-2 py-1.5 rounded-xs text-xs cursor-pointer transition-colors",
                !hasFilter ? "bg-blue-50 text-blue-700 font-semibold" : "hover:bg-slate-100 text-slate-600"
              )}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              All {placeholder}
            </div>
            {(options || []).map((opt) => {
              const isSelected = String(value) === String(opt.value);
              return (
                <div
                  key={opt.value}
                  className={cn(
                    "px-2 py-1.5 rounded-xs text-xs cursor-pointer flex items-center justify-between transition-colors",
                    isSelected ? "bg-blue-50 text-blue-700 font-semibold" : "hover:bg-slate-100 text-slate-700"
                  )}
                  onClick={() => {
                    onChange(String(opt.value));
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="h-3 w-3 text-blue-600 shrink-0 ml-1" />}
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/**
 * TableSettings - Settings for sticky column and row density
 */
const TableSettings = ({ columns, stickyColumns, setStickyColumns, density, setDensity }) => {
  const [open, setOpen] = useState(false);

  const toggleSticky = (colId) => {
    setStickyColumns(prev => {
      const isCurrentlySticky = prev.includes(colId);
      if (isCurrentlySticky) {
        return prev.filter(id => id !== colId);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, colId];
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200 text-slate-600 shadow-none hover:bg-slate-50 shrink-0">
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0 shadow-lg" align="end">
        <div className="p-3 border-b bg-slate-50/70">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Table Settings</h4>
        </div>
        
        {/* Row Density Settings */}
        <div className="p-3 border-b">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Row Density</p>
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-md">
            {Object.keys(DENSITY_CONFIG).map((dKey) => (
              <button
                key={dKey}
                type="button"
                onClick={() => setDensity(dKey)}
                className={cn(
                  "py-1 text-[11px] font-medium rounded-xs transition-colors",
                  density === dKey
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {DENSITY_CONFIG[dKey].label}
              </button>
            ))}
          </div>
        </div>

        {/* Sticky Columns Settings */}
        <div className="p-2">
          <div className="flex items-center justify-between px-1 mb-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Sticky Columns</p>
            <span className="text-[10px] text-slate-400">Max 3</span>
          </div>
          <div className="max-h-[220px] overflow-y-auto custom-scrollbar space-y-0.5">
            {columns.map(col => {
              const id = col.id || col.accessorKey;
              if (!id) return null;
              const isChecked = stickyColumns.includes(id);
              return (
                <div 
                  key={id} 
                  className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-50 rounded-xs cursor-pointer select-none"
                  onClick={() => toggleSticky(id)}
                >
                  <Checkbox checked={isChecked} className="h-3.5 w-3.5" />
                  <span className="text-xs text-slate-700 truncate">{col.header}</span>
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const DEFAULT_COLUMN_FILTERS = {};
const DEFAULT_TOP_FILTERS = [];

/**
 * ProDataTable - Enterprise Data Grid Component
 * Guaranteed strict viewport containment, 2D sticky layering, and responsive layout.
 */
const ProDataTable = ({
  columns = [],
  fetchData,
  onAdd,
  onExport,
  columnFilters = DEFAULT_COLUMN_FILTERS,
  onFilterChange,
  refreshKey = 0,
  topFilters = DEFAULT_TOP_FILTERS,
  globalSearchPlaceholder = "Search...",
  initialStickyColumns = [],
  onAddTooltip = "Add New",
  onImport,
  onDownloadTemplate,
  // Controlled Selection Props
  selectedRows: controlledSelectedRows,
  onSelectionChange,
  showSelectionColumn = true,
  lockActiveFilters = false,
  customToolbarActions,
  // Row Density & Viewport Props
  density: propDensity,
  emptyMessage = "No records found.",
  className = "",
}) => {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem("table_page_size");
    return saved ? parseInt(saved) : 10;
  });
  const [density, setDensity] = useState(() => {
    if (propDensity) return propDensity;
    const saved = localStorage.getItem("table_density");
    return saved && DENSITY_CONFIG[saved] ? saved : "standard";
  });

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [internalSelectedRows, setInternalSelectedRows] = useState(new Set());
  const [stickyColumns, setStickyColumns] = useState(initialStickyColumns);
  const [isMobile, setIsMobile] = useState(false);

  // Use controlled or internal selection
  const selectedRows = controlledSelectedRows || internalSelectedRows;
  const isControlledSelection = !!onSelectionChange;

  const [stickyOffsets, setStickyOffsets] = useState({});
  const headerRefs = useRef({});
  const isFirstRender = useRef(true);

  // Monitor screen size for mobile responsiveness
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Save density preference
  const handleDensityChange = (newDensity) => {
    setDensity(newDensity);
    localStorage.setItem("table_density", newDensity);
  };

  // Measure actual header widths for sticky horizontal positioning
  useEffect(() => {
    if (typeof window === "undefined") return;

    const calculateOffsets = () => {
      const newOffsets = {};
      let currentOffset = showSelectionColumn ? 40 : 0;
      
      // On small mobile screens, limit sticky columns to avoid covering the whole screen
      const activeStickyCols = isMobile ? stickyColumns.slice(0, 1) : stickyColumns;

      const stickyColIds = columns
        .map(c => c.id || c.accessorKey)
        .filter(id => activeStickyCols.includes(id));
      
      stickyColIds.forEach((id) => {
        newOffsets[id] = currentOffset;
        const el = headerRefs.current[id];
        if (el) {
          currentOffset += el.getBoundingClientRect().width;
        } else {
          currentOffset += 130;
        }
      });

      setStickyOffsets(prev => {
        const hasChanged = Object.keys(newOffsets).some(k => newOffsets[k] !== prev[k]) ||
                           Object.keys(prev).some(k => !(k in newOffsets));
        return hasChanged ? newOffsets : prev;
      });
    };

    calculateOffsets();

    const observer = new ResizeObserver(() => {
      calculateOffsets();
    });

    stickyColumns.forEach(id => {
      if (headerRefs.current[id]) observer.observe(headerRefs.current[id]);
    });

    return () => observer.disconnect();
  }, [stickyColumns, showSelectionColumn, columns, isMobile]);

  // Process columns with sticky offsets and sort hoisted sticky columns to the front
  const processedColumns = useMemo(() => {
    const activeStickyCols = isMobile ? stickyColumns.slice(0, 1) : stickyColumns;
    const sticky = [];
    const nonSticky = [];
    
    columns.forEach(col => {
      const id = col.id || col.accessorKey;
      if (activeStickyCols.includes(id)) {
        sticky.push(col);
      } else {
        nonSticky.push(col);
      }
    });

    const sorted = [...sticky, ...nonSticky];
    
    return sorted.map(col => {
      const colId = col.id || col.accessorKey;
      const isSticky = activeStickyCols.includes(colId);
      const offset = stickyOffsets[colId] || 0;
      
      return { ...col, isSticky, stickyOffset: offset };
    });
  }, [columns, stickyColumns, stickyOffsets, isMobile]);

  // Debounce global search
  useEffect(() => {
    if (isFirstRender.current) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
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

  // Persist Page Size changes
  useEffect(() => {
    localStorage.setItem("table_page_size", pageSize.toString());
  }, [pageSize]);

  // Handlers
  const toggleRow = (id) => {
    if (isControlledSelection) {
      const next = new Set(selectedRows);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectionChange(next);
    } else {
      setInternalSelectedRows(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  };

  const toggleAll = () => {
    let next;
    if (selectedRows.size === data.length) {
      next = new Set();
    } else {
      next = new Set(data.map(item => item.id));
    }

    if (isControlledSelection) {
      onSelectionChange(next);
    } else {
      setInternalSelectedRows(next);
    }
  };

  const densityConfig = DENSITY_CONFIG[density] || DENSITY_CONFIG.standard;

  return (
    <div className={cn("flex flex-col flex-1 h-full min-h-0 w-full overflow-hidden space-y-2.5", className)}>
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0 w-full">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-xs transition-all focus-within:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={globalSearchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-white border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500 text-xs rounded-md shadow-none"
          />
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {customToolbarActions && (
            <div className="flex items-center mr-1">
              {customToolbarActions}
            </div>
          )}

          <TooltipProvider>
            {/* Top-Right Dropdown Filters */}
            {topFilters.map((tf, i) => (
              <Select key={i} value={tf.value} onValueChange={tf.onChange}>
                <SelectTrigger className="w-[130px] sm:w-[140px] h-9 bg-white border-slate-200 text-xs font-semibold shadow-none">
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
              density={density}
              setDensity={handleDensityChange}
            />

            {onAdd && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={onAdd} className="h-9 w-9 bg-slate-800 text-white hover:bg-slate-700 shadow-none ml-0.5">
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">{onAddTooltip}</p></TooltipContent>
              </Tooltip>
            )}

            {onDownloadTemplate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={onDownloadTemplate} className="h-9 w-9 border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-none ml-0.5">
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">Download Sample Template</p></TooltipContent>
              </Tooltip>
            )}

            {onImport && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.xlsx, .xls';
                    input.onchange = (e) => onImport(e.target.files[0]);
                    input.click();
                  }} className="h-9 w-9 border-slate-200 bg-white text-emerald-600 hover:bg-emerald-50 shadow-none ml-0.5">
                    <Upload className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">Bulk Import from Excel</p></TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </div>

      {/* ── Stable Table Grid Container (Scrollable Inside Only) ── */}
      <div className="rounded-md border border-slate-200 bg-white relative flex flex-col flex-1 min-h-0 w-full overflow-hidden shadow-2xs">
        <div className="flex-1 min-h-0 w-full overflow-auto custom-scrollbar overscroll-contain bg-white">
          <Table className="relative border-separate border-spacing-0 w-full min-w-max text-left">
            <TableHeader className="bg-slate-100 border-b border-slate-200 sticky top-0 z-30">
              <TableRow className="hover:bg-transparent h-9 border-none">
                {showSelectionColumn && (
                  <TableHead 
                    className="w-[40px] min-w-[40px] max-w-[40px] sticky top-0 left-0 border-r border-b border-slate-200 px-0 text-center h-9 bg-slate-100 shadow-[1px_0_0_0_#e2e8f0]"
                    style={{ zIndex: 50, left: 0 }}
                  >
                    <div className="flex items-center justify-center h-full w-full">
                      <Checkbox
                        checked={selectedRows.size === data.length && data.length > 0}
                        onCheckedChange={() => toggleAll()}
                        className="h-3.5 w-3.5"
                      />
                    </div>
                  </TableHead>
                )}
                {processedColumns.map((col, idx) => {
                  const columnId = col.id || col.accessorKey;
                  const isSticky = col.isSticky;
                  const stickyClass = isSticky ? "sticky border-r border-slate-200 shadow-[1px_0_0_0_#e2e8f0]" : "";
                  const colFilterVal = columnFilters[columnId];

                  return (
                    <TableHead 
                      key={columnId || idx} 
                      ref={el => headerRefs.current[columnId] = el}
                      className={cn(
                        col.className,
                        stickyClass,
                        "sticky top-0 h-9 whitespace-nowrap px-3 text-[11px] font-bold uppercase text-slate-700 tracking-wider bg-slate-100 border-b border-slate-200 transition-colors"
                      )}
                      style={{ 
                        width: col.width || 'auto',
                        minWidth: col.width || (col.filterType ? '110px' : '70px'),
                        maxWidth: col.maxWidth || 'auto',
                        left: isSticky ? `${col.stickyOffset}px` : 'auto',
                        zIndex: isSticky ? 50 : 30
                      }}
                    >
                      <div className="flex items-center justify-between gap-1.5 h-full py-1">
                        <span className="truncate">{col.header}</span>
                        {col.filterType && (
                          <div className="shrink-0">
                            {col.filterType === 'select' ? (
                              col.isMulti ? (
                                <MultiSelectFilter
                                  options={col.filterOptions || []}
                                  value={colFilterVal}
                                  onChange={(val) => onFilterChange({ [columnId]: val })}
                                  placeholder={col.header}
                                />
                              ) : (
                                <SingleSelectFilterPopover
                                  options={col.filterOptions || []}
                                  value={colFilterVal}
                                  onChange={(val) => onFilterChange({ [columnId]: val })}
                                  placeholder={col.header}
                                />
                              )
                            ) : col.filterType === 'date' ? (
                              <DateFilterPopover
                                value={colFilterVal}
                                onChange={(val) => onFilterChange({ [columnId]: val })}
                                placeholder={col.header}
                              />
                            ) : (
                              <TextFilterPopover
                                value={colFilterVal}
                                onChange={(val) => onFilterChange({ [columnId]: val })}
                                placeholder={col.header}
                              />
                            )}
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
                Array.from({ length: 8 }).map((_, rIdx) => (
                  <TableRow key={`skeleton-${rIdx}`} className={cn("hover:bg-transparent border-b border-slate-100", densityConfig.rowHeight)}>
                    {showSelectionColumn && (
                      <TableCell 
                        className="w-[40px] min-w-[40px] max-w-[40px] sticky left-0 border-r border-b border-slate-100 p-0 bg-white"
                        style={{ zIndex: 20, left: 0 }}
                      >
                         <div className="flex items-center justify-center h-full w-full">
                             <div className="h-3.5 w-3.5 rounded-sm bg-slate-200 animate-pulse" />
                         </div>
                      </TableCell>
                    )}
                    {processedColumns.map((col, idx) => {
                      const columnId = col.id || col.accessorKey || String(idx);
                      const isSticky = col.isSticky;
                      const stickyClass = isSticky ? 'sticky border-r border-slate-100 shadow-[1px_0_0_0_#f1f5f9]' : '';
                      const widths = ['w-16', 'w-24', 'w-28', 'w-32', 'w-20'];
                      const randomWidth = widths[(rIdx + idx) % widths.length];

                      return (
                        <TableCell 
                          key={columnId || idx}
                          className={cn(
                            "p-2.5 px-3 whitespace-nowrap border-b border-slate-100/60",
                            stickyClass,
                            col.className,
                            isSticky ? "bg-white" : "bg-transparent"
                          )}
                          style={{
                            width: col.width || 'auto',
                            left: isSticky ? `${col.stickyOffset}px` : 'auto',
                            zIndex: isSticky ? 20 : 1
                          }}
                        >
                          <div className={`h-3.5 ${randomWidth} bg-slate-200/70 rounded-[4px] animate-pulse`} />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              ) : data.length ? (
                data.map((row, rIdx) => {
                  const isSelected = selectedRows.has(row.id);
                  return (
                    <TableRow 
                      key={row.id || rIdx} 
                      className={cn(
                        "transition-colors group",
                        densityConfig.rowHeight,
                        isSelected ? "bg-sky-50/80 hover:bg-sky-100/90" : "hover:bg-slate-50/70"
                      )}
                    >
                      {showSelectionColumn && (
                        <TableCell 
                          className={cn(
                            "w-[40px] min-w-[40px] max-w-[40px] sticky left-0 border-r border-b border-slate-100 p-0 transition-colors",
                            isSelected 
                              ? "bg-sky-100 group-hover:bg-sky-200" 
                              : "bg-white group-hover:bg-slate-50"
                          )}
                          style={{ zIndex: 20, left: 0 }}
                        >
                          <div className="flex items-center justify-center h-full w-full">
                            <Checkbox 
                              checked={isSelected} 
                              onCheckedChange={() => toggleRow(row.id)} 
                              className="h-3.5 w-3.5" 
                            />
                          </div>
                        </TableCell>
                      )}
                      {processedColumns.map((col, cIdx) => {
                        const columnId = col.id || col.accessorKey;
                        const isSticky = col.isSticky;
                        const stickyClass = isSticky 
                          ? "sticky border-r border-slate-100 shadow-[1px_0_0_0_#f1f5f9]" 
                          : "";
                        
                        const rawContent = col.cell ? col.cell(row, rIdx) : resolvePath(row, col.accessorKey);

                        return (
                          <TableCell 
                            key={columnId || cIdx} 
                            className={cn(
                              col.className,
                              stickyClass,
                              densityConfig.cellPadding,
                              densityConfig.fontSize,
                              "font-medium text-slate-700 border-b border-slate-100/70 transition-colors align-middle",
                              isSelected 
                                ? "bg-sky-100 group-hover:bg-sky-200" 
                                : isSticky 
                                  ? "bg-white group-hover:bg-slate-50" 
                                  : "bg-transparent group-hover:bg-slate-50/40"
                            )}
                            style={{
                              width: col.width || 'auto',
                              minWidth: col.width || (col.filterType ? '110px' : '70px'),
                              maxWidth: col.maxWidth || 'auto',
                              left: isSticky ? `${col.stickyOffset}px` : 'auto',
                              zIndex: isSticky ? 20 : 1
                            }}
                          >
                            <div className="flex items-center min-w-0 max-w-full h-full overflow-hidden">
                              {col.cell ? (
                                rawContent
                              ) : (
                                <span 
                                  className="truncate block w-full text-slate-700" 
                                  title={typeof rawContent === 'string' || typeof rawContent === 'number' ? String(rawContent) : undefined}
                                >
                                  {rawContent !== undefined && rawContent !== null && rawContent !== "" ? rawContent : "-"}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell 
                    colSpan={columns.length + (showSelectionColumn ? 1 : 0)} 
                    className="h-32 text-center text-slate-400 font-medium whitespace-nowrap"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Responsive Pagination Footer ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-2 px-3 border border-slate-200 bg-slate-50/80 rounded-md shrink-0 w-full">
        {/* Rows per page */}
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Rows</p>
          <Select 
            value={pageSize.toString()} 
            onValueChange={(val) => { 
              setPageSize(parseInt(val)); 
              setPage(1); 
            }}
          >
            <SelectTrigger className="h-7 w-[68px] bg-white border-slate-200 text-xs shadow-none">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 20, 50, 100].map(sz => (
                <SelectItem key={sz} value={sz.toString()} className="text-xs">{sz}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page status & controls */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-[11px] font-medium text-slate-500">
            Page <span className="text-slate-900 font-semibold">{meta.page || 1}</span> of <span className="text-slate-900 font-semibold">{meta.totalPages || 1}</span> (<span className="text-slate-900 font-semibold">{meta.total || 0}</span> items)
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-2.5 bg-white border-slate-200 text-slate-600 hover:bg-slate-100 shadow-none disabled:opacity-50" 
              onClick={() => setPage(page - 1)} 
              disabled={page <= 1 || loading}
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-0.5" /> <span className="text-xs">Prev</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-2.5 bg-white border-slate-200 text-slate-600 hover:bg-slate-100 shadow-none disabled:opacity-50" 
              onClick={() => setPage(page + 1)} 
              disabled={page >= (meta.totalPages || 1) || loading}
            >
              <span className="text-xs">Next</span> <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProDataTable;
