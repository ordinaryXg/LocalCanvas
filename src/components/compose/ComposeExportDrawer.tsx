interface Props {
  open: boolean
  reencode: boolean
  burnSubtitles: boolean
  hasSubtitles: boolean
  onReencodeChange: (v: boolean) => void
  onBurnChange: (v: boolean) => void
  onClose: () => void
}

export function ComposeExportDrawer({
  open,
  reencode,
  burnSubtitles,
  hasSubtitles,
  onReencodeChange,
  onBurnChange,
  onClose,
}: Props) {
  if (!open) return null

  return (
    <div className="absolute right-4 top-12 z-20 w-64 bg-bg-secondary border border-border rounded-lg shadow-xl p-3 text-xs">
      <div className="flex items-center justify-between mb-3">
        <span className="text-text-primary font-medium">导出设置</span>
        <button type="button" onClick={onClose} className="text-text-muted hover:text-white">
          ✕
        </button>
      </div>
      <label className="flex items-center gap-2 mb-2 cursor-pointer text-text-muted">
        <input
          type="checkbox"
          checked={reencode}
          onChange={(e) => onReencodeChange(e.target.checked)}
          className="rounded"
        />
        强制重编码（格式不一致时）
      </label>
      <label className="flex items-center gap-2 cursor-pointer text-text-muted">
        <input
          type="checkbox"
          checked={burnSubtitles}
          onChange={(e) => onBurnChange(e.target.checked)}
          disabled={!hasSubtitles}
          className="rounded"
        />
        烧录硬字幕
      </label>
      <p className="mt-3 text-[10px] text-text-muted">导出后自动在画布创建视频节点</p>
    </div>
  )
}
