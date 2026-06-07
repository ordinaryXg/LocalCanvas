export const TYPE_LABELS: Record<string, string> = {
  text: '文本',
  image: '图片',
  video: '视频',
  audio: '音频',
  script: '脚本',
  compose: '合成',
  storyboard: '分镜组',
  group: '分组',
}

export const NODE_TYPE_COLORS: Record<string, string> = {
  text: 'var(--node-text)',
  image: 'var(--node-image)',
  video: 'var(--node-video)',
  audio: 'var(--node-audio)',
  script: 'var(--node-script)',
  compose: 'var(--node-compose)',
  storyboard: 'var(--node-storyboard)',
}

export const EDITOR_ACTION_LABELS: Record<string, string> = {
  text: '打开文本编辑器',
  image: '打开图片编辑器',
  video: '打开视频编辑器',
  audio: '打开音频编辑器',
  script: '打开脚本编辑器',
  storyboard: '打开分镜编辑器',
}

export const STORYBOARD_LAYOUT_LABELS: Record<string, string> = {
  list: '列表',
  grid3: '九宫格',
  grid5: '二十五宫格',
}
