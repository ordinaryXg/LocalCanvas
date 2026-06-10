const LS_COACH_DONE = 'editorCoachDone'

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
