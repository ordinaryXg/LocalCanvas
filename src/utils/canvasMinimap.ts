/** MiniMap 节点色，与 theme.css --node-* 保持一致 */
export const MINIMAP_NODE_COLORS: Record<string, string> = {
  text: 'var(--node-text)',
  image: 'var(--node-image)',
  video: 'var(--node-video)',
  audio: 'var(--node-audio)',
  script: 'var(--node-script)',
  compose: 'var(--node-compose)',
  storyboard: 'var(--node-storyboard)',
}

export function minimapNodeColor(type: string | undefined): string {
  return MINIMAP_NODE_COLORS[type ?? 'text'] ?? 'var(--node-compose)'
}
