import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { useCanvasStore } from '../../stores/canvasStore'
import type { ScriptRow } from '../../types/node'
import { generateId } from '../../utils/id'

function ScriptNodeComponent({ id, data, selected }: NodeProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const rows = (data.scriptRows as ScriptRow[]) || []
  const storyInput = (data.storyInput as string) || ''

  const addRow = () => {
    const newRow: ScriptRow = {
      id: generateId('row'),
      sequence: rows.length + 1,
      description: '',
      prompt: '',
      duration: 5,
      camera: '静止',
    }
    updateNodeData(id, { scriptRows: [...rows, newRow] })
  }

  const updateRow = (rowId: string, field: keyof ScriptRow, value: string | number) => {
    const updated = rows.map((r) => (r.id === rowId ? { ...r, [field]: value } : r))
    updateNodeData(id, { scriptRows: updated })
  }

  return (
    <BaseNode
      color="var(--node-script)"
      icon={<span className="text-sm">🎬</span>}
      title="脚本"
      selected={selected}
      width={360}
    >
      <textarea
        value={storyInput}
        onChange={(e) => updateNodeData(id, { storyInput: e.target.value })}
        placeholder="输入故事梗概..."
        className="nodrag nowheel w-full h-16 bg-bg-tertiary text-white text-xs p-2 rounded resize-none outline-none border border-border focus:border-accent"
      />

      <div className="flex gap-1 mt-2">
        <button
          type="button"
          disabled
          className="flex-1 text-xs bg-amber-600/30 text-amber-300 py-1 rounded opacity-50 cursor-not-allowed"
        >
          🤖 生成脚本 (v2)
        </button>
      </div>

      {rows.length > 0 && (
        <div className="mt-2 max-h-[200px] overflow-y-auto nowheel">
          <table className="w-full text-[10px] text-text-primary">
            <thead>
              <tr className="text-text-secondary">
                <th className="px-1 text-left">#</th>
                <th className="px-1 text-left">画面</th>
                <th className="px-1 text-left">提示词</th>
                <th className="px-1">时长</th>
                <th className="px-1">运镜</th>
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
                      className="nodrag w-full bg-transparent outline-none text-text-primary"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      value={row.prompt}
                      onChange={(e) => updateRow(row.id, 'prompt', e.target.value)}
                      className="nodrag w-full bg-transparent outline-none text-text-primary"
                    />
                  </td>
                  <td className="px-1 py-1 text-center">{row.duration}s</td>
                  <td className="px-1 py-1 text-center">{row.camera}</td>
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
        <button type="button" disabled className="text-[10px] text-amber-300/50 ml-auto opacity-50">
          生成分镜图 (v2)
        </button>
        <button type="button" disabled className="text-[10px] text-amber-300/50 opacity-50">
          生成视频 (v2)
        </button>
      </div>

      <Handle type="source" position={Position.Right} id="script"
        style={{ top: '50%', background: 'var(--node-script)', width: 10, height: 10 }} />
    </BaseNode>
  )
}

export const ScriptNode = memo(ScriptNodeComponent)
