import * as React from "react"
import { cn } from "@/lib/utils"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "./dialog"
import { Button } from "./button"

interface ActionSheetAction {
  id: string
  label: string
  icon?: React.ReactNode
  variant?: 'default' | 'destructive' | 'secondary'
  disabled?: boolean
  onClick: () => void
}

interface ActionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  actions: ActionSheetAction[]
  className?: string
}

export function ActionSheet({
  open,
  onOpenChange,
  title,
  description,
  actions,
  className
}: ActionSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-md", className)}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        <div className="grid gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant || 'default'}
              disabled={action.disabled}
              onClick={() => {
                action.onClick()
                onOpenChange(false)
              }}
              className="justify-start gap-3 h-12"
            >
              {action.icon && (
                <span className="flex-shrink-0">{action.icon}</span>
              )}
              {action.label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Context menu version for right-click actions
interface ContextMenuProps {
  children: React.ReactNode
  actions: ActionSheetAction[]
  className?: string
}

export function ContextMenu({ children, actions, className }: ContextMenuProps) {
  const [open, setOpen] = React.useState(false)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setPosition({ x: e.clientX, y: e.clientY })
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  React.useEffect(() => {
    if (open) {
      const handleClickOutside = () => handleClose()
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') handleClose()
      }
      
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
      
      return () => {
        document.removeEventListener('click', handleClickOutside)
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [open])

  return (
    <>
      <div onContextMenu={handleContextMenu} className={className}>
        {children}
      </div>
      
      {open && (
        <div
          className="fixed z-50 min-w-[200px] bg-popover border rounded-md shadow-lg p-1"
          style={{
            left: position.x,
            top: position.y,
            transform: 'translate(-10px, -10px)'
          }}
        >
          {actions.map((action) => (
            <button
              key={action.id}
              disabled={action.disabled}
              onClick={() => {
                action.onClick()
                handleClose()
              }}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2 text-sm rounded-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                action.variant === 'destructive' && "text-destructive hover:bg-destructive/10"
              )}
            >
              {action.icon && (
                <span className="flex-shrink-0 w-4 h-4">{action.icon}</span>
              )}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

// Quick action floating button
interface QuickActionProps {
  actions: ActionSheetAction[]
  className?: string
}

export function QuickActionButton({ actions, className }: QuickActionProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40",
          "hover:scale-110 transition-all duration-200",
          className
        )}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </Button>
      
      <ActionSheet
        open={open}
        onOpenChange={setOpen}
        title="Quick Actions"
        actions={actions}
      />
    </>
  )
}