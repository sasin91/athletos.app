import * as React from "react"
import { Search, ArrowRight, Clock, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "./dialog"
import { Badge } from "./badge"

export interface Command {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  keywords?: string[]
  category?: string
  action: () => void
  shortcut?: string
  recent?: boolean
  favorite?: boolean
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  commands: Command[]
  placeholder?: string
  emptyMessage?: string
  recentCommands?: string[]
  onCommandSelect?: (command: Command) => void
}

export function CommandPalette({
  open,
  onOpenChange,
  commands,
  placeholder = "Type a command or search...",
  emptyMessage = "No commands found.",
  recentCommands = [],
  onCommandSelect
}: CommandPaletteProps) {
  const [search, setSearch] = React.useState("")
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  
  // Filter and sort commands
  const filteredCommands = React.useMemo(() => {
    if (!search.trim()) {
      // Show recent and favorites first when no search
      const recent = commands.filter(cmd => recentCommands.includes(cmd.id))
      const favorites = commands.filter(cmd => cmd.favorite && !recentCommands.includes(cmd.id))
      const others = commands.filter(cmd => !cmd.favorite && !recentCommands.includes(cmd.id))
      return [...recent, ...favorites, ...others]
    }
    
    const searchLower = search.toLowerCase()
    return commands.filter(command => {
      const matchesLabel = command.label.toLowerCase().includes(searchLower)
      const matchesDescription = command.description?.toLowerCase().includes(searchLower)
      const matchesKeywords = command.keywords?.some(keyword => 
        keyword.toLowerCase().includes(searchLower)
      )
      return matchesLabel || matchesDescription || matchesKeywords
    }).sort((a, b) => {
      // Prioritize exact matches
      const aExact = a.label.toLowerCase().startsWith(searchLower)
      const bExact = b.label.toLowerCase().startsWith(searchLower)
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      
      // Then favorites
      if (a.favorite && !b.favorite) return -1
      if (!a.favorite && b.favorite) return 1
      
      return 0
    })
  }, [commands, search, recentCommands])

  // Group commands by category
  const groupedCommands = React.useMemo(() => {
    const groups: Record<string, Command[]> = {}
    
    filteredCommands.forEach(command => {
      const category = command.category || 'Commands'
      if (!groups[category]) groups[category] = []
      groups[category].push(command)
    })
    
    return groups
  }, [filteredCommands])

  // Keyboard navigation
  React.useEffect(() => {
    if (!open) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onOpenChange(false)
          break
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, filteredCommands, selectedIndex])

  // Reset selection when search changes
  React.useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSearch("")
      setSelectedIndex(0)
    }
  }, [open])

  const executeCommand = (command: Command) => {
    command.action()
    onCommandSelect?.(command)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-2xl">
        <div className="flex items-center border-b px-4 py-3">
          <Search className="mr-3 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <Badge variant="outline" className="ml-3 text-xs">
            ⌘K
          </Badge>
        </div>
        
        <div className="max-h-96 overflow-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-sm text-muted-foreground">{emptyMessage}</div>
            </div>
          ) : (
            <div className="space-y-1">
              {Object.entries(groupedCommands).map(([category, categoryCommands]) => (
                <div key={category}>
                  {Object.keys(groupedCommands).length > 1 && (
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      {category}
                    </div>
                  )}
                  {categoryCommands.map((command, index) => {
                    const globalIndex = filteredCommands.indexOf(command)
                    const isSelected = globalIndex === selectedIndex
                    
                    return (
                      <div
                        key={command.id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors",
                          isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                        )}
                        onClick={() => executeCommand(command)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {command.icon && (
                            <div className="flex-shrink-0 w-4 h-4 text-muted-foreground">
                              {command.icon}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{command.label}</span>
                              <div className="flex items-center gap-1">
                                {recentCommands.includes(command.id) && (
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                )}
                                {command.favorite && (
                                  <Star className="h-3 w-3 text-yellow-500" />
                                )}
                              </div>
                            </div>
                            {command.description && (
                              <div className="text-xs text-muted-foreground truncate">
                                {command.description}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {command.shortcut && (
                            <Badge variant="outline" className="text-xs">
                              {command.shortcut}
                            </Badge>
                          )}
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="border-t px-4 py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>↑↓ to navigate</span>
              <span>↵ to select</span>
              <span>esc to close</span>
            </div>
            <div>{filteredCommands.length} commands</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}