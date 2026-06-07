const LS_EDITOR_SHELL = 'lc-editor-shell'
const LS_LEGACY_LAYOUT = 'lc-legacy-layout'
const LS_COACH_DONE = 'editorCoachDone'

export function isLegacyLayoutForced(): boolean {
  if (import.meta.env.VITE_LEGACY_LAYOUT === '1') return true
  try {
    return localStorage.getItem(LS_LEGACY_LAYOUT) === '1'
  } catch {
    return false
  }
}

/** v8 EditorShell 是否启用（经典布局优先） */
export function isEditorShell(): boolean {
  if (isLegacyLayoutForced()) return false
  if (import.meta.env.VITE_EDITOR_SHELL === '1') return true
  if (import.meta.env.VITE_EDITOR_SHELL === '0') return false
  try {
    const v = localStorage.getItem(LS_EDITOR_SHELL)
    if (v === '0') return false
    if (v === '1') return true
  } catch {
    /* ignore */
  }
  return true
}

export function setEditorShellEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(LS_EDITOR_SHELL, enabled ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function setLegacyLayoutEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(LS_LEGACY_LAYOUT, enabled ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function isEditorCoachEnabled(): boolean {
  if (import.meta.env.VITE_EDITOR_COACH === '0') return false
  return true
}

export function isEditorCoachDone(): boolean {
  try {
    return localStorage.getItem(LS_COACH_DONE) === '1'
  } catch {
    return false
  }
}

export function markEditorCoachDone(): void {
  try {
    localStorage.setItem(LS_COACH_DONE, '1')
  } catch {
    /* ignore */
  }
}

export const GENERATABLE_NODE_TYPES = new Set([
  'text',
  'image',
  'video',
  'audio',
  'script',
  'storyboard',
])
