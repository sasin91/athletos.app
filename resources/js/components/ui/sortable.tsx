import * as React from "react"
import { cn } from "@/lib/utils"
import { GripVertical } from "lucide-react"

interface DragItem {
  id: string
  [key: string]: any
}

interface SortableItemProps {
  item: DragItem
  index: number
  children: React.ReactNode
  onDragStart: (index: number) => void
  onDragOver: (index: number) => void
  onDragEnd: () => void
  isDragging: boolean
  isDragOver: boolean
  className?: string
  showHandle?: boolean
}

export function SortableItem({
  item,
  index,
  children,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isDragOver,
  className,
  showHandle = true
}: SortableItemProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', item.id)
    onDragStart(index)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    onDragOver(index)
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    onDragEnd()
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDrop={handleDrop}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative transition-all duration-200",
        isDragging && "opacity-50 scale-95 rotate-2",
        isDragOver && "scale-105",
        "hover:shadow-md",
        className
      )}
    >
      {showHandle && (
        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className={cn(showHandle && "pl-8")}>
        {children}
      </div>
    </div>
  )
}

interface SortableListProps<T extends DragItem> {
  items: T[]
  onReorder: (items: T[]) => void
  renderItem: (item: T, index: number, isDragging: boolean, isDragOver: boolean) => React.ReactNode
  className?: string
  itemClassName?: string
  showHandles?: boolean
  keyExtractor?: (item: T) => string
}

export function SortableList<T extends DragItem>({
  items,
  onReorder,
  renderItem,
  className,
  itemClassName,
  showHandles = true,
  keyExtractor = (item) => item.id
}: SortableListProps<T>) {
  const [dragIndex, setDragIndex] = React.useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null)
  const [localItems, setLocalItems] = React.useState(items)

  // Update local items when props change
  React.useEffect(() => {
    setLocalItems(items)
  }, [items])

  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (index: number) => {
    if (dragIndex === null) return
    
    setDragOverIndex(index)
    
    if (dragIndex !== index) {
      const newItems = [...localItems]
      const draggedItem = newItems[dragIndex]
      newItems.splice(dragIndex, 1)
      newItems.splice(index, 0, draggedItem)
      
      setLocalItems(newItems)
      setDragIndex(index)
    }
  }

  const handleDragEnd = () => {
    if (dragIndex !== null) {
      onReorder(localItems)
    }
    setDragIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className={cn("space-y-2", className)}>
      {localItems.map((item, index) => (
        <SortableItem
          key={keyExtractor(item)}
          item={item}
          index={index}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          isDragging={dragIndex === index}
          isDragOver={dragOverIndex === index}
          className={itemClassName}
          showHandle={showHandles}
        >
          {renderItem(item, index, dragIndex === index, dragOverIndex === index)}
        </SortableItem>
      ))}
    </div>
  )
}

// Drag and drop between different lists
interface DroppableAreaProps {
  onDrop: (data: any) => void
  onDragOver?: () => void
  onDragLeave?: () => void
  children: React.ReactNode
  className?: string
  acceptTypes?: string[]
  isActive?: boolean
}

export function DroppableArea({
  onDrop,
  onDragOver,
  onDragLeave,
  children,
  className,
  acceptTypes = ['text/plain'],
  isActive = false
}: DroppableAreaProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    onDragOver?.()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const data = e.dataTransfer.getData('text/plain')
    if (data) {
      onDrop(data)
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
      className={cn(
        "transition-all duration-200",
        isActive && "ring-2 ring-primary ring-offset-2 bg-primary/5",
        className
      )}
    >
      {children}
    </div>
  )
}

// Draggable item for cross-list dragging
interface DraggableProps {
  data: any
  children: React.ReactNode
  className?: string
  onDragStart?: () => void
  onDragEnd?: () => void
}

export function Draggable({
  data,
  children,
  className,
  onDragStart,
  onDragEnd
}: DraggableProps) {
  const [isDragging, setIsDragging] = React.useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify(data))
    setIsDragging(true)
    onDragStart?.()
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    onDragEnd?.()
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-all duration-200",
        isDragging && "opacity-50 scale-95",
        className
      )}
    >
      {children}
    </div>
  )
}