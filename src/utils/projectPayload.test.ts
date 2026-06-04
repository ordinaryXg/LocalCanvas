import { describe, it, expect } from 'vitest'
import type { Node } from '@xyflow/react'
import { extractGroupsFromNodes, serializeNodeForSave, buildProjectSavePayload } from './projectPayload'

describe('projectPayload', () => {
  it('extractGroupsFromNodes reads group nodes', () => {
    const nodes: Node[] = [
      {
        id: 'g1',
        type: 'group',
        position: { x: 10, y: 20 },
        data: { label: '场景 A' },
        style: { width: 500, height: 400 },
      },
    ]
    const groups = extractGroupsFromNodes(nodes)
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('场景 A')
    expect(groups[0].width).toBe(500)
  })

  it('serializeNodeForSave strips transient media', () => {
    const node: Node = {
      id: 'n1',
      type: 'image',
      position: { x: 0, y: 0 },
      data: { imageAssetPath: 'images/x.png', imageSrc: 'blob:x' },
    }
    const saved = serializeNodeForSave(node)
    expect(saved.data.imageAssetPath).toBe('images/x.png')
    expect(saved.data).not.toHaveProperty('imageSrc')
  })

  it('buildProjectSavePayload includes groups from nodes', () => {
    const payload = buildProjectSavePayload({
      id: 'p1',
      name: 'Test',
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [
        { id: 'g1', type: 'group', position: { x: 0, y: 0 }, data: {} },
        { id: 'n1', type: 'text', position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [],
    })
    expect(payload.groups).toHaveLength(1)
    expect(payload.nodes).toHaveLength(2)
  })
})
