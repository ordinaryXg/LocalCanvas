export interface SlashCommand {
  id: string
  command: string
  label: string
  description: string
  keywords?: string[]
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'run',
    command: '/run',
    label: '整组执行',
    description: '对当前选区按依赖顺序自动执行',
    keywords: ['execute', 'dag', '运行'],
  },
  {
    id: 'agent',
    command: '/agent',
    label: '打开 Agent',
    description: '打开 Agent 面板',
    keywords: ['ai', '助手'],
  },
  {
    id: 'grid3',
    command: '/grid 3x3',
    label: '九宫格分镜',
    description: '切换分镜组为 3×3 宫格',
    keywords: ['storyboard', '分镜'],
  },
  {
    id: 'grid5',
    command: '/grid 5x5',
    label: '二十五宫格',
    description: '切换分镜组为 5×5 宫格',
    keywords: ['storyboard'],
  },
  {
    id: 'exportStoryboard',
    command: '/export storyboard',
    label: '导出分镜板',
    description: '将分镜组导出为 PNG 拼图',
    keywords: ['export', 'png', '分镜'],
  },
  {
    id: 'style',
    command: '/style',
    label: '风格模板',
    description: '在生成器面板选择风格预设（图像/视频）',
    keywords: ['preset', '风格'],
  },
]

export function filterSlashCommands(query: string): SlashCommand[] {
  const q = query.trim().toLowerCase()
  if (!q) return SLASH_COMMANDS
  return SLASH_COMMANDS.filter(
    (c) =>
      c.command.toLowerCase().includes(q) ||
      c.label.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.keywords?.some((k) => k.toLowerCase().includes(q)),
  )
}
