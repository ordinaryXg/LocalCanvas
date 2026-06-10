export type ShortcutCategory = 'canvas' | 'edit' | 'workbench' | 'general'

export interface KeyboardShortcutItem {
  id: string
  keys: string
  descKey: string
  descFallback: string
  category: ShortcutCategory
}

export const SHORTCUT_CATEGORY_KEYS: Record<ShortcutCategory, { key: string; fallback: string }> = {
  canvas: { key: 'shortcuts.category.canvas', fallback: '画布' },
  edit: { key: 'shortcuts.category.edit', fallback: '编辑' },
  workbench: { key: 'shortcuts.category.workbench', fallback: '工作台' },
  general: { key: 'shortcuts.category.general', fallback: '通用' },
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcutItem[] = [
  {
    id: 'pan-space',
    keys: 'Space（按住）',
    descKey: 'shortcuts.panSpace',
    descFallback: '拖动画布（不可选中节点）',
    category: 'canvas',
  },
  {
    id: 'slash-cmd',
    keys: '/',
    descKey: 'shortcuts.slashCommand',
    descFallback: '打开画布命令面板',
    category: 'canvas',
  },
  {
    id: 'save',
    keys: 'Ctrl+S',
    descKey: 'shortcuts.save',
    descFallback: '保存项目',
    category: 'edit',
  },
  {
    id: 'undo',
    keys: 'Ctrl+Z',
    descKey: 'shortcuts.undo',
    descFallback: '撤销',
    category: 'edit',
  },
  {
    id: 'redo',
    keys: 'Ctrl+Shift+Z',
    descKey: 'shortcuts.redo',
    descFallback: '重做',
    category: 'edit',
  },
  {
    id: 'group',
    keys: 'Ctrl+G',
    descKey: 'shortcuts.group',
    descFallback: '将选中节点编组',
    category: 'edit',
  },
  {
    id: 'workbench-generate',
    keys: 'G',
    descKey: 'shortcuts.workbenchGenerate',
    descFallback: '打开工作台 · 生成（选中可生成节点）',
    category: 'workbench',
  },
  {
    id: 'workbench-compose',
    keys: 'E',
    descKey: 'shortcuts.workbenchCompose',
    descFallback: '打开工作台 · 剪辑（选中合成节点）',
    category: 'workbench',
  },
  {
    id: 'esc',
    keys: 'Esc',
    descKey: 'shortcuts.esc',
    descFallback: '关闭抽屉 / 返回画布模式',
    category: 'general',
  },
  {
    id: 'help',
    keys: '?',
    descKey: 'shortcuts.help',
    descFallback: '显示快捷键速查',
    category: 'general',
  },
]

export const SHORTCUT_CATEGORIES: ShortcutCategory[] = ['canvas', 'edit', 'workbench', 'general']
