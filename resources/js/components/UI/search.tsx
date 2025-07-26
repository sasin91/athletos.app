import * as React from "react"
import { Search, X, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Badge } from "./badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "./dropdown-menu"

interface SearchFilter {
  id: string
  label: string
  options: { value: string; label: string; count?: number }[]
}

interface SearchProps {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  filters?: SearchFilter[]
  activeFilters?: Record<string, string[]>
  onFilterChange?: (filterId: string, values: string[]) => void
  onClear?: () => void
  className?: string
}

export function AdvancedSearch({ 
  placeholder = "Search...", 
  value, 
  onChange, 
  filters = [],
  activeFilters = {},
  onFilterChange,
  onClear,
  className 
}: SearchProps) {
  const [isFocused, setIsFocused] = React.useState(false)
  
  const hasActiveFilters = Object.values(activeFilters).some(values => values.length > 0)
  const activeFilterCount = Object.values(activeFilters).reduce((sum, values) => sum + values.length, 0)

  const handleFilterToggle = (filterId: string, optionValue: string) => {
    if (!onFilterChange) return
    
    const currentValues = activeFilters[filterId] || []
    const newValues = currentValues.includes(optionValue)
      ? currentValues.filter(v => v !== optionValue)
      : [...currentValues, optionValue]
    
    onFilterChange(filterId, newValues)
  }

  const clearAllFilters = () => {
    if (!onFilterChange) return
    filters.forEach(filter => {
      onFilterChange(filter.id, [])
    })
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Input */}
      <div className={cn(
        "relative flex items-center border rounded-lg transition-all duration-200",
        isFocused ? "ring-2 ring-ring ring-offset-2" : "border-input"
      )}>
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="flex-1 pl-10 pr-4 py-2 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-3 p-1 hover:bg-muted rounded-sm"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Filters and Active Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Filter Dropdown */}
          {filters.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {filters.map((filter, index) => (
                  <React.Fragment key={filter.id}>
                    <DropdownMenuLabel>{filter.label}</DropdownMenuLabel>
                    {filter.options.map((option) => (
                      <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={activeFilters[filter.id]?.includes(option.value) || false}
                        onCheckedChange={() => handleFilterToggle(filter.id, option.value)}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{option.label}</span>
                          {option.count !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              {option.count}
                            </span>
                          )}
                        </div>
                      </DropdownMenuCheckboxItem>
                    ))}
                    {index < filters.length - 1 && <DropdownMenuSeparator />}
                  </React.Fragment>
                ))}
                {hasActiveFilters && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={clearAllFilters}>
                      Clear all filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Clear All Button */}
          {(value || hasActiveFilters) && onClear && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(activeFilters).map(([filterId, values]) => {
            const filter = filters.find(f => f.id === filterId)
            if (!filter || values.length === 0) return null
            
            return values.map(value => {
              const option = filter.options.find(o => o.value === value)
              if (!option) return null
              
              return (
                <Badge key={`${filterId}-${value}`} variant="secondary" className="gap-1">
                  {filter.label}: {option.label}
                  <button
                    onClick={() => handleFilterToggle(filterId, value)}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-sm p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )
            })
          })}
        </div>
      )}
    </div>
  )
}

// Simple search component for basic use cases
export function SimpleSearch({ 
  placeholder = "Search...", 
  value, 
  onChange, 
  className 
}: Omit<SearchProps, 'filters' | 'activeFilters' | 'onFilterChange'>) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-muted rounded-sm"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}