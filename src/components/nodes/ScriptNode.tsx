import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { PortHandle } from './PortHandle'
import { useScriptNodeActions } from '../../hooks/useScriptNodeActions'

function ScriptNodeComponent({ id, selected, width, height }: NodeProps) {
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
  } = useScriptNodeActions(id)

  return (
    <BaseNode
      color="var(--node-script)"
      icon={<span className="text-sm">🎬</span>}
      title={scriptTitle || '脚本'}
      selected={selected}
      width={width}
      height={height}
      defaultWidth={360}
      minWidth={280}
      minHeight={160}
    >
      <textarea
        value={storyInput}
        onChange={(e) => setStoryInput(e.target.value)}
        placeholder="输入故事梗概..."
        className="nodrag nowheel w-full h-16 bg-bg-tertiary text-white text-xs p-2 rounded resize-none outline-none border border-border focus:border-accent"
      />

      <div className="flex gap-1 mt-2">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void handleGenerateScript()}
          className="flex-1 text-xs bg-amber-600/30 text-amber-300 py-1 rounded hover:bg-amber-600/50 transition disabled:opacity-50 nodrag"
        >
          {generating === 'script' ? '🤖 生成中...' : '🤖 生成脚本'}
        </button>
      </div>

      {isBusy && (
        <div className="mt-2">
          <div className="h-1 bg-bg-tertiary rounded overflow-hidden">
            <div className="h-full bg-amber-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[10px] text-text-muted mt-1">{progress}%</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-2 max-h-[200px] overflow-y-auto nowheel">
          <table className="w-full text-[10px] text-text-primary table-fixed">
            <thead>
              <tr className="text-text-secondary">
                <th className="px-1 text-left w-6">#</th>
                <th className="px-1 text-left">画面</th>
                <th className="px-1 text-left">提示词</th>
                <th className="px-1 w-8">时长</th>
                <th className="px-1 w-10">运镜</th>
                <th className="px-1 w-6" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-1 py-1">{row.sequence}</td>
                  <td className="px-1 py-1">
                    <input
                      value={row.description}
                      onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                      className="nodrag w-full bg-transparent outline-none text-text-primary truncate"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      value={row.prompt}
                      onChange={(e) => updateRow(row.id, 'prompt', e.target.value)}
                      className="nodrag w-full bg-transparent outline-none text-text-primary truncate"
                    />
                  </td>
                  <td className="px-1 py-1 text-center">{row.duration}s</td>
                  <td className="px-1 py-1 text-center truncate">{row.camera}</td>
                  <td className="px-1 py-1 text-center">
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

      <div className="flex gap-1 mt-2 items-center">
        <button type="button" onClick={addRow} className="text-[10px] text-amber-300 hover:underline nodrag">
          + 添加分镜
        </button>
        <button
          type="button"
          disabled={isBusy || rows.length === 0}
          onClick={() => void handleBatchImages()}
          className="text-[10px] text-amber-300 ml-auto hover:underline disabled:opacity-50 nodrag"
        >
          {generating === 'images' ? '生成中...' : '生成分镜图'}
        </button>
        <button
          type="button"
          disabled={isBusy || rows.length === 0}
          onClick={() => void handleBatchVideos()}
          className="text-[10px] text-amber-300 hover:underline disabled:opacity-50 nodrag"
        >
          {generating === 'videos' ? '生成中...' : 'Seedance 视频'}
        </button>
      </div>

      {rows.length > 0 && (
        <p className="text-[10px] text-text-muted mt-1">选中节点可在下方编辑面板操作</p>
      )}

      <PortHandle id="script" type="source" color="var(--node-script)" top="50%" />
    </BaseNode>
  )
}

export const ScriptNode = memo(ScriptNodeComponent)
