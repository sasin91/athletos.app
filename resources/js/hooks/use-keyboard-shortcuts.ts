import { useEffect, useRef } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: () => void
  description: string
  category?: string
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts)
  
  // Update shortcuts ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return
      }

      const matchingShortcut = shortcutsRef.current.find(shortcut => {
        return (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          !!event.ctrlKey === !!shortcut.ctrlKey &&
          !!event.metaKey === !!shortcut.metaKey &&
          !!event.shiftKey === !!shortcut.shiftKey &&
          !!event.altKey === !!shortcut.altKey
        )
      })

      if (matchingShortcut) {
        event.preventDefault()
        matchingShortcut.action()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled])

  return { shortcuts }
}

// Hook for displaying keyboard shortcuts help
export function useKeyboardShortcutsHelp() {
  const getDisplayKey = (shortcut: KeyboardShortcut): string => {
    const parts: string[] = []
    
    if (shortcut.ctrlKey) parts.push('Ctrl')
    if (shortcut.metaKey) parts.push('⌘')
    if (shortcut.shiftKey) parts.push('Shift')
    if (shortcut.altKey) parts.push('Alt')
    
    parts.push(shortcut.key.toUpperCase())
    
    return parts.join(' + ')
  }

  const groupShortcutsByCategory = (shortcuts: KeyboardShortcut[]) => {
    const grouped = shortcuts.reduce((acc, shortcut) => {
      const category = shortcut.category || 'General'
      if (!acc[category]) acc[category] = []
      acc[category].push(shortcut)
      return acc
    }, {} as Record<string, KeyboardShortcut[]>)
    
    return grouped
  }

  return { getDisplayKey, groupShortcutsByCategory }
}

// Common keyboard shortcuts
export const commonShortcuts = {
  search: { key: 'k', metaKey: true, description: 'Open search', category: 'Navigation' },
  help: { key: '?', description: 'Show keyboard shortcuts', category: 'General' },
  newItem: { key: 'n', description: 'Create new item', category: 'Actions' },
  save: { key: 's', metaKey: true, description: 'Save changes', category: 'Actions' },
  undo: { key: 'z', metaKey: true, description: 'Undo', category: 'Actions' },
  redo: { key: 'z', metaKey: true, shiftKey: true, description: 'Redo', category: 'Actions' },
}