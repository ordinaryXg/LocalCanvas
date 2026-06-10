import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorShellStore } from './editorShellStore'

const LS_MODE = 'lc-editor-mode'

describe('editorShellStore mode persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    useEditorShellStore.setState({ mode: 'canvas' })
  })

  it('persists workbench mode to localStorage', () => {
    useEditorShellStore.getState().setMode('workbench')
    expect(localStorage.getItem(LS_MODE)).toBe('workbench')
  })

  it('restores mode from localStorage on init', () => {
    localStorage.setItem(LS_MODE, 'workbench')
    useEditorShellStore.setState({ mode: 'canvas' })
    useEditorShellStore.getState().hydrateModeFromStorage()
    expect(useEditorShellStore.getState().mode).toBe('workbench')
  })
})
