import * as React from "react"
import { Check, ChevronDown, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

export function SearchableSelect({
  options = [],
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  multi = false,
  isFilter = false,
  className,
  disabled = false,
}) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  const selectedValues = Array.isArray(value) 
    ? value 
    : (value && value !== "all" ? [value.toString()] : [])

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (val) => {
    if (multi) {
      const newVal = selectedValues.includes(val)
        ? selectedValues.filter((v) => v !== val)
        : [...selectedValues, val]
      onValueChange(newVal)
    } else {
      onValueChange(val)
      setOpen(false)
      setSearchTerm("")
    }
  }

  const clearSelection = (e) => {
    e.stopPropagation()
    onValueChange(multi ? [] : "")
    setSearchTerm("")
  }

  const getDisplayLabel = () => {
    if (multi) {
      if (selectedValues.length === 0) return placeholder
      if (selectedValues.length === 1) {
        return options.find((o) => o.value.toString() === selectedValues[0])?.label || placeholder
      }
      return `${selectedValues.length} selected`
    }
    
    if (!value || value === "all") return isFilter ? "All" : placeholder
    return options.find((o) => o.value.toString() === value.toString())?.label || placeholder
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal bg-background",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate mr-2 uppercase">{getDisplayLabel()?.toString().toUpperCase()}</span>
          <div className="flex items-center gap-1 shrink-0 opacity-50">
            {selectedValues.length > 0 && !disabled && (
              <X
                className="h-3 w-3 hover:text-destructive transition-colors pointer-events-auto"
                onClick={clearSelection}
              />
            )}
            <ChevronDown className="h-4 w-4" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[200px] z-[100]" 
        align="start"
        side="bottom"
        avoidCollisions={false}
      >
        <div className="flex flex-col flex-1 max-h-[300px]">
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 w-full border-none bg-transparent p-0 shadow-none focus-visible:ring-0 text-sm"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto overflow-x-hidden p-1 custom-scrollbar flex-1 min-h-[50px]">
            {isFilter && !searchTerm && (
               <div
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    (!value || value === "all") && "bg-accent/50"
                  )}
                  onClick={() => {
                    onValueChange("");
                    setOpen(false);
                    setSearchTerm("");
                  }}
                >
                  <span className="flex-1 uppercase">All</span>
                  {(!value || value === "all") && <Check className="ml-2 h-4 w-4 text-primary shrink-0" />}
                </div>
            )}
            
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = multi 
                  ? selectedValues.includes(option.value.toString())
                  : value?.toString() === option.value.toString()

                return (
                    <div
                      key={option.value}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                        isSelected && "bg-accent/50"
                      )}
                      onClick={() => handleSelect(option.value.toString())}
                    >
                      <span className="flex-1 truncate uppercase">{option.label?.toString().toUpperCase()}</span>
                      {isSelected && <Check className="ml-2 h-4 w-4 text-primary shrink-0" />}
                    </div>
                )
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
