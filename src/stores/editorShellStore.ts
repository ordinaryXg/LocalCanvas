import { create } from 'zustand'
import { GENERATABLE_NODE_TYPES } from '../constants/editorFeatures'
import { useCanvasStore } from './canvasStore'
import { useComposeEditorStore } from './composeEditorStore'

export type EditorMode = 'canvas' | 'workbench'
export type DockDrawer = 'nodes' | 'tools' | 'assets' | 'history' | 'health' | null
export type SettingsTabId = 'models' | 'defaults' | 'tools' | 'general' | 'shortcuts' | 'agent'
export type SettingsFocus = 'readiness' | 'templates' | 'prefs' | 'default_llm' | 'default_image' | 'default_video' | null

const LS_DRAWER_HEIGHT = 'lc-generator-drawer-ratio'
const LS_INSPECTOR_WIDTH = 'lc-inspector-width'
const LS_DOCK_DRAWER_WIDTH = 'lc-dock-drawer-width'
const LS_WORKBENCH_SIDEBAR_WIDTH = 'lc-workbench-sidebar-width'
const LS_MODE = 'lc-editor-mode'

export const DOCK_DRAWER_WIDTH_DEFAULT = 320
export const DOCK_DRAWER_WIDTH_MIN = 240
export const DOCK_DRAWER_WIDTH_MAX = 520

export const WORKBENCH_SIDEBAR_WIDTH_DEFAULT = 320
export const WORKBENCH_SIDEBAR_WIDTH_MIN = 200
export const WORKBENCH_SIDEBAR_WIDTH_MAX = 520

function readPersistedMode(): EditorMode {
  try {
    const raw = localStorage.getItem(LS_MODE)
    return raw === 'workbench' ? 'workbench' : 'canvas'
  } catch {
    return 'canvas'
  }
}

function persistMode(mode: EditorMode): void {
  try {
    localStorage.setItem(LS_MODE, mode)
  } catch {
    /* ignore */
  }
}

function readDrawerRatio(): number {
  try {
    const raw = localStorage.getItem(LS_DRAWER_HEIGHT)
    if (!raw) return 0.4
    const n = parseFloat(raw)
    if (Number.isNaN(n)) return 0.4
    return Math.min(0.7, Math.max(0.25, n))
  } catch {
    return 0.4
  }
}

function readInspectorWidth(): number {
  try {
    const raw = localStorage.getItem(LS_INSPECTOR_WIDTH)
    if (!raw) return 280
    const n = parseInt(raw, 10)
    if (Number.isNaN(n)) return 280
    return Math.min(360, Math.max(240, n))
  } catch {
    return 280
  }
}

function readDockDrawerWidth(): number {
  try {
    const raw = localStorage.getItem(LS_DOCK_DRAWER_WIDTH)
    if (!raw) return DOCK_DRAWER_WIDTH_DEFAULT
    const n = parseInt(raw, 10)
    if (Number.isNaN(n)) return DOCK_DRAWER_WIDTH_DEFAULT
    return Math.min(DOCK_DRAWER_WIDTH_MAX, Math.max(DOCK_DRAWER_WIDTH_MIN, n))
  } catch {
    return DOCK_DRAWER_WIDTH_DEFAULT
  }
}

function readWorkbenchSidebarWidth(): number {
  try {
    const raw = localStorage.getItem(LS_WORKBENCH_SIDEBAR_WIDTH)
    if (!raw) return WORKBENCH_SIDEBAR_WIDTH_DEFAULT
    const n = parseInt(raw, 10)
    if (Number.isNaN(n)) return WORKBENCH_SIDEBAR_WIDTH_DEFAULT
    return Math.min(WORKBENCH_SIDEBAR_WIDTH_MAX, Math.max(WORKBENCH_SIDEBAR_WIDTH_MIN, n))
  } catch {
    return WORKBENCH_SIDEBAR_WIDTH_DEFAULT
  }
}

interface EditorShellState {
  mode: EditorMode
  openDrawer: DockDrawer
  generatorDrawerOpen: boolean
  generatorDrawerHeightRatio: number
  inspectorCollapsed: boolean
  inspectorWidth: number
  dockDrawerWidth: number
  workbenchSidebarWidth: number
  agentExpanded: boolean
  agentPinned: boolean
  shortcutsOpen: boolean
  settingsOpen: boolean
  pendingSettingsTab: SettingsTabId | null
  pendingSettingsFocus: SettingsFocus
  focusStyleChips: boolean
  scrollToGeneratorWarnings: boolean
  nodeCanvasDragging: boolean

  setMode: (mode: EditorMode) => void
  toggleDrawer: (drawer: Exclude<DockDrawer, null>) => void
  closeDrawer: () => void
  setGeneratorDrawerOpen: (open: boolean) => void
  setNodeCanvasDragging: (dragging: boolean) => void
  setGeneratorDrawerHeightRatio: (ratio: number) => void
  setInspectorCollapsed: (collapsed: boolean) => void
  setInspectorWidth: (width: number) => void
  setDockDrawerWidth: (width: number) => void
  setWorkbenchSidebarWidth: (width: number) => void
  setAgentExpanded: (expanded: boolean) => void
  setAgentPinned: (pinned: boolean) => void
  setShortcutsOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  openSettings: (opts?: { tab?: SettingsTabId; focus?: SettingsFocus }) => void
  consumePendingSettingsNav: () => void
  requestFocusStyleChips: () => void
  clearFocusStyleChips: () => void
  requestScrollToGeneratorWarnings: () => void
  clearScrollToGeneratorWarnings: () => void
  openWorkbenchForGenerate: (nodeId: string, nodeType: string | undefined) => void
  openWorkbenchForCompose: (nodeId: string) => void
  hydrateModeFromStorage: () => void
}

export const useEditorShellStore = create<EditorShellState>((set, get) => ({
  mode: readPersistedMode(),
  openDrawer: 'nodes',
  generatorDrawerOpen: false,
  generatorDrawerHeightRatio: readDrawerRatio(),
  inspectorCollapsed: false,
  inspectorWidth: readInspectorWidth(),
  dockDrawerWidth: readDockDrawerWidth(),
  workbenchSidebarWidth: readWorkbenchSidebarWidth(),
  agentExpanded: false,
  agentPinned: false,
  shortcutsOpen: false,
  settingsOpen: false,
  pendingSettingsTab: null,
  pendingSettingsFocus: null,
  focusStyleChips: false,
  scrollToGeneratorWarnings: false,
  nodeCanvasDragging: false,

  setMode: (mode) => {
    persistMode(mode)
    if (mode === 'canvas') {
      const updates: Partial<Pick<EditorShellState, 'mode' | 'openDrawer' | 'inspectorCollapsed'>> = {
        mode: 'canvas',
        inspectorCollapsed: false,
      }
      if (get().openDrawer === null) {
        updates.openDrawer = 'nodes'
      }
      set(updates)
      return
    }
    set({ mode })
  },

  hydrateModeFromStorage: () => {
    const mode = readPersistedMode()
    if (mode === get().mode) return
    get().setMode(mode)
  },

  toggleDrawer: (drawer) => {
    const current = get().openDrawer
    set({ openDrawer: current === drawer ? null : drawer })
  },

  closeDrawer: () => set({ openDrawer: null }),

  setGeneratorDrawerOpen: (open) => set({ generatorDrawerOpen: open }),

  setNodeCanvasDragging: (dragging) => set({ nodeCanvasDragging: dragging }),

  setGeneratorDrawerHeightRatio: (ratio) => {
    const clamped = Math.min(0.7, Math.max(0.25, ratio))
    try {
      localStorage.setItem(LS_DRAWER_HEIGHT, String(clamped))
    } catch {
      /* ignore */
    }
    set({ generatorDrawerHeightRatio: clamped })
  },

  setInspectorCollapsed: (collapsed) => set({ inspectorCollapsed: collapsed }),

  setInspectorWidth: (width) => {
    const clamped = Math.min(360, Math.max(240, width))
    try {
      localStorage.setItem(LS_INSPECTOR_WIDTH, String(clamped))
    } catch {
      /* ignore */
    }
    set({ inspectorWidth: clamped })
  },

  setDockDrawerWidth: (width) => {
    const clamped = Math.min(DOCK_DRAWER_WIDTH_MAX, Math.max(DOCK_DRAWER_WIDTH_MIN, width))
    try {
      localStorage.setItem(LS_DOCK_DRAWER_WIDTH, String(clamped))
    } catch {
      /* ignore */
    }
    set({ dockDrawerWidth: clamped })
  },

  setWorkbenchSidebarWidth: (width) => {
    const clamped = Math.min(WORKBENCH_SIDEBAR_WIDTH_MAX, Math.max(WORKBENCH_SIDEBAR_WIDTH_MIN, width))
    try {
      localStorage.setItem(LS_WORKBENCH_SIDEBAR_WIDTH, String(clamped))
    } catch {
      /* ignore */
    }
    set({ workbenchSidebarWidth: clamped })
  },

  setAgentExpanded: (expanded) => set({ agentExpanded: expanded }),
  setAgentPinned: (pinned) => set({ agentPinned: pinned, agentExpanded: pinned ? true : get().agentExpanded }),
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),

  setSettingsOpen: (open) => {
    if (open) {
      set({ settingsOpen: true, generatorDrawerOpen: false })
      return
    }
    set({ settingsOpen: false, pendingSettingsTab: null, pendingSettingsFocus: null })
  },

  openSettings: (opts) => {
    set({
      settingsOpen: true,
      generatorDrawerOpen: false,
      pendingSettingsTab: opts?.tab ?? null,
      pendingSettingsFocus: opts?.focus ?? null,
    })
  },

  consumePendingSettingsNav: () => set({ pendingSettingsTab: null, pendingSettingsFocus: null }),

  requestFocusStyleChips: () => set({ focusStyleChips: true, generatorDrawerOpen: true }),
  clearFocusStyleChips: () => set({ focusStyleChips: false }),

  requestScrollToGeneratorWarnings: () =>
    set({ scrollToGeneratorWarnings: true, generatorDrawerOpen: true }),
  clearScrollToGeneratorWarnings: () => set({ scrollToGeneratorWarnings: false }),

  openWorkbenchForGenerate: (nodeId, nodeType) => {
    if (!nodeType || !GENERATABLE_NODE_TYPES.has(nodeType)) return
    set({ mode: 'workbench', generatorDrawerOpen: false, openDrawer: null })
    void nodeId
  },

  openWorkbenchForCompose: (nodeId) => {
    useCanvasStore.getState().setSelectedNodes([nodeId])
    useComposeEditorStore.getState().open(nodeId)
    set({ mode: 'workbench', openDrawer: null, inspectorCollapsed: true })
  },
}))
