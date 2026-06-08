import { useCallback, useState } from 'react'
import { useScriptNodeActions } from '../../hooks/useScriptNodeActions'
import { ColumnResizeHandle } from '../common/ColumnResizeHandle'
import { ResizableTextarea } from '../common/ResizableTextarea'

const DESC_COL_STORAGE_KEY = 'lc-script-description-col-width'
const DEFAULT_DESC_COL_WIDTH = 200
const MIN_DESC_COL_WIDTH = 96
const MAX_DESC_COL_WIDTH = 520

function loadDescriptionColWidth(): number {
  try {
    const raw = localStorage.getItem(DESC_COL_STORAGE_KEY)
    if (!raw) return DEFAULT_DESC_COL_WIDTH
    const n = Number(raw)
    if (!Number.isFinite(n)) return DEFAULT_DESC_COL_WIDTH
    return Math.min(MAX_DESC_COL_WIDTH, Math.max(MIN_DESC_COL_WIDTH, n))
  } catch {
    return DEFAULT_DESC_COL_WIDTH
  }
}

interface ScriptGeneratorProps {
  nodeId: string
}

export function ScriptGenerator({ nodeId }: ScriptGeneratorProps) {
  const [descriptionColWidth, setDescriptionColWidth] = useState(loadDescriptionColWidth)

  const handleDescriptionColWidth = useCallback((width: number) => {
    setDescriptionColWidth(width)
    try {
      localStorage.setItem(DESC_COL_STORAGE_KEY, String(width))
    } catch {
      /* ignore */
    }
  }, [])
  const {
    rows,
    storyInput,
    scriptTitle,
    generating,
    progress,
    isBusy,
    setStoryInput,
    addRow,
    updateRow,
    removeRow,
    handleGenerateScript,
    handleBatchImages,
    handleBatchVideos,
  } = useScriptNodeActions(nodeId)

  return (
    <div className="space-y-3">
      <div className="flex gap-4 items-start">
        <div className="flex-1 space-y-2">
          <div>
            <label className="text-[10px] text-text-muted">故事梗概</label>
            <ResizableTextarea
              value={storyInput}
              onChange={(e) => setStoryInput(e.target.value)}
              placeholder="输入故事梗概，AI 将自动拆分为分镜脚本..."
              minHeight={100}
            />
          </div>
          {scriptTitle && (
            <p className="text-xs text-amber-300">标题：{scriptTitle}</p>
          )}
        </div>

        <div className="w-48 space-y-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void handleGenerateScript()}
            className="w-full text-sm bg-amber-600 text-white py-1.5 rounded hover:bg-amber-700 disabled:opacity-50 transition"
          >
            {generating === 'script' ? '🤖 生成中...' : '🤖 生成脚本'}
          </button>
          <button
            type="button"
            disabled={isBusy || rows.length === 0}
            onClick={() => void handleBatchImages()}
            className="w-full text-sm bg-cyan-600 text-white py-1.5 rounded hover:bg-cyan-700 disabled:opacity-50 transition"
          >
            {generating === 'images' ? `分镜图 ${progress}%` : '🖼️ 批量分镜图'}
          </button>
          <button
            type="button"
            disabled={isBusy || rows.length === 0}
            onClick={() => void handleBatchVideos()}
            className="w-full text-sm bg-rose-600 text-white py-1.5 rounded hover:bg-rose-700 disabled:opacity-50 transition"
          >
            {generating === 'videos' ? `视频 ${progress}%` : '🎥 Seedance 视频'}
          </button>
          {isBusy && (
            <div className="w-full bg-bg-tertiary rounded-full h-1.5">
              <div
                className="bg-amber-500 h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="max-h-[240px] overflow-y-auto lc-scroll nowheel border border-border rounded">
          <table className="w-full table-fixed text-xs text-text-primary">
            <colgroup>
              <col className="w-8" />
              <col style={{ width: descriptionColWidth }} />
              <col />
              <col className="w-12" />
              <col className="w-16" />
              <col className="w-8" />
            </colgroup>
            <thead className="sticky top-0 bg-bg-secondary z-[1]">
              <tr className="text-text-secondary">
                <th className="px-2 py-1 text-left">#</th>
                <th className="relative px-2 py-1 text-left select-none">
                  画面描述
                  <ColumnResizeHandle
                    value={descriptionColWidth}
                    onChange={handleDescriptionColWidth}
                    min={MIN_DESC_COL_WIDTH}
                    max={MAX_DESC_COL_WIDTH}
                    ariaLabel="调整画面描述与提示词列宽"
                  />
                </th>
                <th className="px-2 py-1 text-left">提示词</th>
                <th className="px-2 py-1">时长</th>
                <th className="px-2 py-1">运镜</th>
                <th className="px-2 py-1" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-2 py-1">{row.sequence}</td>
                  <td className="px-2 py-1 align-top overflow-hidden">
                    <input
                      value={row.description}
                      onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                      className="nodrag w-full min-w-0 bg-transparent outline-none text-text-primary"
                    />
                  </td>
                  <td className="px-2 py-1 align-top overflow-hidden">
                    <ResizableTextarea
                      value={row.prompt}
                      onChange={(e) => updateRow(row.id, 'prompt', e.target.value)}
                      className="nodrag min-h-[48px] max-h-[160px] text-[11px] p-1.5"
                      minHeight={48}
                      maxHeight={160}
                    />
                  </td>
                  <td className="px-2 py-1 text-center">{row.duration}s</td>
                  <td className="px-2 py-1 text-center">{row.camera}</td>
                  <td className="px-2 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="text-danger hover:text-red-400 nodrag"
                      title="删除分镜"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={addRow}
        className="text-xs text-amber-300 hover:underline nodrag"
      >
        + 添加分镜
      </button>
    </div>
  )
}
