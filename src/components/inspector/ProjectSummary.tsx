import { useMemo, useCallback } from 'react'

import type { Edge, Node } from '@xyflow/react'

import { useCanvasStore } from '../../stores/canvasStore'

import { generateNodeId } from '../../utils/id'

import { showToast } from '../../utils/ErrorHandler'

import { TYPE_LABELS } from './constants'

import { InspectorField } from './InspectorField'

import { InspectorSection } from './InspectorSection'



interface Props {

  nodes: Node[]

  edges: Edge[]

}



function isWarnEdge(edge: Edge): boolean {

  return (edge.data as { compatStatus?: string } | undefined)?.compatStatus === 'dashed_warn'

}



export function ProjectSummary({ nodes, edges }: Props) {

  const addNode = useCanvasStore((s) => s.addNode)

  const removeEdges = useCanvasStore((s) => s.removeEdges)



  const typeCounts = useMemo(() => {

    const counts: Record<string, number> = {}

    for (const n of nodes) {

      const t = n.type ?? 'unknown'

      counts[t] = (counts[t] ?? 0) + 1

    }

    return counts

  }, [nodes])



  const warnEdges = useMemo(() => edges.filter(isWarnEdge), [edges])

  const warnEdgeCount = warnEdges.length



  const disconnectWarnEdges = useCallback(() => {

    if (warnEdgeCount === 0) return

    removeEdges(warnEdges.map((e) => e.id))

    showToast(`已断开 ${warnEdgeCount} 条能力警告连线`, 'info')

  }, [warnEdgeCount, warnEdges, removeEdges])



  return (

    <div className="space-y-4">

      <h3 className="text-sm font-medium text-text-primary">项目摘要</h3>

      <div className="space-y-1.5 rounded-lg border border-border/60 bg-bg-tertiary/20 p-2.5 text-xs">

        <InspectorField label="节点" value={nodes.length} />

        <InspectorField label="连线" value={edges.length} />

        {warnEdgeCount > 0 && (

          <div className="pt-1 space-y-1.5">

            <p className="text-[10px] text-[var(--status-error)]">

              {warnEdgeCount} 条连线存在能力警告（虚线边）

            </p>

            <button

              type="button"

              onClick={disconnectWarnEdges}

              className="w-full py-1.5 rounded border border-[var(--status-error)]/40 text-[10px] text-[var(--status-error)] hover:bg-[var(--status-error)]/10"

            >

              断开全部警告连线

            </button>

          </div>

        )}

      </div>

      {Object.keys(typeCounts).length > 0 && (

        <InspectorSection title="节点分布">

          <div className="space-y-1">

            {Object.entries(typeCounts).map(([t, count]) => (

              <InspectorField key={t} label={TYPE_LABELS[t] ?? t} value={count} />

            ))}

          </div>

        </InspectorSection>

      )}

      <button

        type="button"

        onClick={() =>

          addNode({

            id: generateNodeId('text'),

            type: 'text',

            position: { x: 160, y: 160 },

            data: { title: '文本', draft: '', output: '', outputMode: 'passthrough' },

            selected: true,

          })

        }

        className="w-full py-2 rounded-lg border border-[var(--studio-border)] text-xs hover:bg-[var(--studio-surface-hover)]"

      >

        + 新建文本节点

      </button>

    </div>

  )

}


