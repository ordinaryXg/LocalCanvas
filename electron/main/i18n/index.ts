import { Menu, app, shell, type BrowserWindow } from 'electron'

export type MainLocale = 'zh-CN' | 'en-US'

let currentLocale: MainLocale = 'zh-CN'

const messages: Record<MainLocale, Record<string, string>> = {
  'zh-CN': {
    'dialog.unsaved.title': '未保存的更改',
    'dialog.unsaved.message': '项目有未保存的更改，是否保存？',
    'dialog.unsaved.saveQuit': '保存并退出',
    'dialog.unsaved.discard': '不保存',
    'dialog.unsaved.cancel': '取消',
    'ffmpeg.required.title': '需要 FFmpeg',
    'ffmpeg.required.message': '视频裁切与合成依赖 FFmpeg，当前未检测到可用安装。',
    'ffmpeg.required.detail':
      '你可以自动下载、手动安装后在「设置 → FFmpeg 路径」中填写，或直接选择 ffmpeg 可执行文件。',
    'ffmpeg.pickFile': '选择 ffmpeg 文件',
    'ffmpeg.autoDownload': '自动下载 FFmpeg',
    'ffmpeg.openDownloadPage': '打开下载页',
    'ffmpeg.cancel': '取消',
    'ffmpeg.downloadFailed.title': '下载失败',
    'ffmpeg.invalid.title': 'FFmpeg 无效',
    'ffmpeg.invalid.message': '所选文件无法作为 FFmpeg 运行，请重新选择或在设置中配置路径。',
    'ffmpeg.pickDialog.title': '选择 FFmpeg 可执行文件',
    'ffmpeg.filterName': 'FFmpeg',
    'workflow.export.title': '导出工作流',
    'workflow.import.title': '导入工作流',
    'project.import.title': '导入项目',
    'dialog.filter.json': 'JSON',
    'menu.file': '文件',
    'menu.edit': '编辑',
    'menu.view': '视图',
    'menu.help': '帮助',
    'menu.quit': '退出',
    'menu.about': '关于 LocalCanvas',
    'menu.reload': '重新加载',
    'menu.toggleDevTools': '开发者工具',
    'menu.toggleFullscreen': '全屏',
    'menu.documentation': '使用文档',
  },
  'en-US': {
    'dialog.unsaved.title': 'Unsaved changes',
    'dialog.unsaved.message': 'This project has unsaved changes. Save before quitting?',
    'dialog.unsaved.saveQuit': 'Save & Quit',
    'dialog.unsaved.discard': "Don't Save",
    'dialog.unsaved.cancel': 'Cancel',
    'ffmpeg.required.title': 'FFmpeg required',
    'ffmpeg.required.message': 'Video trim and compose require FFmpeg, but none was detected.',
    'ffmpeg.required.detail':
      'Auto-download FFmpeg, install manually and set the path in Settings, or pick an ffmpeg executable.',
    'ffmpeg.pickFile': 'Choose ffmpeg file',
    'ffmpeg.autoDownload': 'Download FFmpeg',
    'ffmpeg.openDownloadPage': 'Open download page',
    'ffmpeg.cancel': 'Cancel',
    'ffmpeg.downloadFailed.title': 'Download failed',
    'ffmpeg.invalid.title': 'Invalid FFmpeg',
    'ffmpeg.invalid.message':
      'The selected file is not a valid FFmpeg executable. Pick another file or set the path in Settings.',
    'ffmpeg.pickDialog.title': 'Select FFmpeg executable',
    'ffmpeg.filterName': 'FFmpeg',
    'workflow.export.title': 'Export workflow',
    'workflow.import.title': 'Import workflow',
    'project.import.title': 'Import project',
    'dialog.filter.json': 'JSON',
    'menu.file': 'File',
    'menu.edit': 'Edit',
    'menu.view': 'View',
    'menu.help': 'Help',
    'menu.quit': 'Quit',
    'menu.about': 'About LocalCanvas',
    'menu.reload': 'Reload',
    'menu.toggleDevTools': 'Toggle Developer Tools',
    'menu.toggleFullscreen': 'Toggle Full Screen',
    'menu.documentation': 'Documentation',
  },
}

export function mt(key: string): string {
  return messages[currentLocale][key] ?? messages['zh-CN'][key] ?? key
}

export function setMainLocale(_locale: MainLocale, _getWindow?: () => BrowserWindow | null): void {
  currentLocale = _locale
  Menu.setApplicationMenu(null)
}

export function buildApplicationMenu(
  getWindow?: () => BrowserWindow | null,
): Electron.Menu {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { label: mt('menu.about'), role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: mt('menu.file'),
      submenu: [
        isMac
          ? { role: 'close' as const }
          : { label: mt('menu.quit'), role: 'quit' as const },
      ],
    },
    {
      label: mt('menu.edit'),
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const },
      ],
    },
    {
      label: mt('menu.view'),
      submenu: [
        { label: mt('menu.reload'), role: 'reload' as const },
        { label: mt('menu.toggleDevTools'), role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { label: mt('menu.toggleFullscreen'), role: 'togglefullscreen' as const },
      ],
    },
    {
      label: mt('menu.help'),
      submenu: [
        {
          label: mt('menu.documentation'),
          click: () => {
            void shell.openExternal('https://github.com/localcanvas/localcanvas')
          },
        },
      ],
    },
  ]

  void getWindow
  return Menu.buildFromTemplate(template)
}
