import { describe, it, expect } from 'vitest'
import type { Node, Edge } from '@xyflow/react'
import { computeDataFlowPatches, simulateDataFlowUntilStable } from './dataFlow'

describe('computeDataFlowPatches', () => {
  it('syncs text content to image prompt', () => {
    const nodes: Node[] = [
      { id: 't1', type: 'text', position: { x: 0, y: 0 }, data: { content: 'sunset' } },
      { id: 'i1', type: 'image', position: { x: 0, y: 0 }, data: { prompt: '' } },
    ]
    const edges: Edge[] = [
      {
        id: 'e1',
        source: 't1',
        target: 'i1',
        sourceHandle: 'prompt',
        targetHandle: 'prompt',
      },
    ]
    const patches = computeDataFlowPatches(nodes, edges)
    expect(patches).toEqual([{ nodeId: 'i1', data: { prompt: 'sunset' } }])
  })

  it('syncs passthrough draft to downstream when output follows draft', () => {
    const nodes: Node[] = [
      {
        id: 't1',
        type: 'text',
        position: { x: 0, y: 0 },
        data: {
          draft: 'updated prompt text',
          output: 'updated prompt text',
          outputMode: 'passthrough',
          outputEdited: false,
        },
      },
      { id: 'i1', type: 'image', position: { x: 0, y: 0 }, data: { prompt: 'old' } },
    ]
    const edges: Edge[] = [
      { id: 'e1', source: 't1', target: 'i1', sourceHandle: 'prompt', targetHandle: 'prompt' },
    ]
    const patches = computeDataFlowPatches(nodes, edges)
    expect(patches[0].data.prompt).toBe('updated prompt text')
  })

  it('syncs text output field to image prompt', () => {
    const nodes: Node[] = [
      {
        id: 't1',
        type: 'text',
        position: { x: 0, y: 0 },
        data: {
          draft: 'raw story draft',
          output: 'polished prompt for image',
          outputMode: 'generated',
        },
      },
      { id: 'i1', type: 'image', position: { x: 0, y: 0 }, data: { prompt: '' } },
    ]
    const edges: Edge[] = [
      { id: 'e1', source: 't1', target: 'i1', sourceHandle: 'prompt', targetHandle: 'prompt' },
    ]
    const patches = computeDataFlowPatches(nodes, edges)
    expect(patches[0].data.prompt).toBe('polished prompt for image')
  })

  it('falls back to legacy fields when output empty', () => {
    const nodes: Node[] = [
      {
        id: 't1',
        type: 'text',
        position: { x: 0, y: 0 },
        data: { inputContent: 'direct prompt only' },
      },
      { id: 'i1', type: 'image', position: { x: 0, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [
      { id: 'e1', source: 't1', target: 'i1', sourceHandle: 'prompt', targetHandle: 'prompt' },
    ]
    const patches = computeDataFlowPatches(nodes, edges)
    expect(patches[0].data.prompt).toBe('direct prompt only')
  })

  it('falls back to storyInput for script prompt', () => {
    const nodes: Node[] = [
      { id: 's1', type: 'script', position: { x: 0, y: 0 }, data: { storyInput: 'epic tale' } },
      { id: 'i1', type: 'image', position: { x: 0, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [
      { id: 'e1', source: 's1', target: 'i1', sourceHandle: 'script', targetHandle: 'prompt' },
    ]
    const patches = computeDataFlowPatches(nodes, edges)
    expect(patches[0].data.prompt).toBe('epic tale')
  })

  it('syncs script rows to video prompt', () => {
    const nodes: Node[] = [
      {
        id: 's1',
        type: 'script',
        position: { x: 0, y: 0 },
        data: {
          scriptRows: [{ id: 'r1', sequence: 1, description: '', prompt: 'cat', duration: 5, camera: '' }],
        },
      },
      { id: 'v1', type: 'video', position: { x: 0, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [
      { id: 'e1', source: 's1', target: 'v1', sourceHandle: 'script', targetHandle: 'prompt' },
    ]
    const patches = computeDataFlowPatches(nodes, edges)
    expect(patches[0].data.prompt).toBe('cat')
  })

  it('syncs image output to video firstFrame', () => {
    const nodes: Node[] = [
      {
        id: 'i1',
        type: 'image',
        position: { x: 0, y: 0 },
        data: { imageSrc: 'blob:a', imageAssetPath: 'images/a.png' },
      },
      { id: 'v1', type: 'video', position: { x: 0, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [
      {
        id: 'e1',
        source: 'i1',
        target: 'v1',
        sourceHandle: 'image',
        targetHandle: 'firstFrame',
      },
    ]
    const patches = computeDataFlowPatches(nodes, edges)
    expect(patches[0].data.firstFrameSrc).toBe('blob:a')
    expect(patches[0].data.firstFrameAssetPath).toBe('images/a.png')
  })

  it('skips patch when values already equal', () => {
    const nodes: Node[] = [
      { id: 't1', type: 'text', position: { x: 0, y: 0 }, data: { content: 'x' } },
      { id: 'i1', type: 'image', position: { x: 0, y: 0 }, data: { prompt: 'x' } },
    ]
    const edges: Edge[] = [
      { id: 'e1', source: 't1', target: 'i1', sourceHandle: 'prompt', targetHandle: 'prompt' },
    ]
    expect(computeDataFlowPatches(nodes, edges)).toHaveLength(0)
  })

  it('syncs audio to video', () => {
    const nodes: Node[] = [
      {
        id: 'a1',
        type: 'audio',
        position: { x: 0, y: 0 },
        data: { audioSrc: 'blob:audio', audioAssetPath: 'audios/x.mp3' },
      },
      { id: 'v1', type: 'video', position: { x: 0, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [
      { id: 'e1', source: 'a1', target: 'v1', sourceHandle: 'audio', targetHandle: 'audio' },
    ]
    const patches = computeDataFlowPatches(nodes, edges)
    expect(patches[0].data.audioSrc).toBe('blob:audio')
    expect(patches[0].data.audioAssetPath).toBe('audios/x.mp3')
  })

  it('syncs image output to target image reference', () => {
    const nodes: Node[] = [
      {
        id: 'i1',
        type: 'image',
        position: { x: 0, y: 0 },
        data: { imageSrc: 'blob:a', imageAssetPath: 'images/a.png' },
      },
      { id: 'i2', type: 'image', position: { x: 0, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [
      {
        id: 'e1',
        source: 'i1',
        target: 'i2',
        sourceHandle: 'image',
        targetHandle: 'reference',
      },
    ]
    const patches = computeDataFlowPatches(nodes, edges)
    expect(patches[0].data.referenceSrc).toBe('blob:a')
    expect(patches[0].data.referenceAssetPath).toBe('images/a.png')
  })

  it('converges when two images connect to the same video firstFrame port', () => {
    const nodes: Node[] = [
      {
        id: 'i1',
        type: 'image',
        position: { x: 0, y: 0 },
        data: { imageSrc: 'blob:a', imageAssetPath: 'images/a.png' },
      },
      {
        id: 'i2',
        type: 'image',
        position: { x: 0, y: 0 },
        data: { imageSrc: 'blob:b', imageAssetPath: 'images/b.png' },
      },
      { id: 'v1', type: 'video', position: { x: 0, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [
      {
        id: 'e1',
        source: 'i1',
        target: 'v1',
        sourceHandle: 'image',
        targetHandle: 'firstFrame',
      },
      {
        id: 'e2',
        source: 'i2',
        target: 'v1',
        sourceHandle: 'image',
        targetHandle: 'firstFrame',
      },
    ]

    const { nodes: stable, iterations } = simulateDataFlowUntilStable(nodes, edges)
    expect(iterations).toBeLessThanOrEqual(2)
    expect(computeDataFlowPatches(stable, edges)).toHaveLength(0)
    expect(stable.find((n) => n.id === 'v1')?.data.firstFrameSrc).toBe('blob:b')
  })

  it('syncs two images to video firstFrame and lastFrame', () => {
    const nodes: Node[] = [
      {
        id: 'i1',
        type: 'image',
        position: { x: 0, y: 0 },
        data: { imageSrc: 'blob:a' },
      },
      {
        id: 'i2',
        type: 'image',
        position: { x: 0, y: 0 },
        data: { imageSrc: 'blob:b' },
      },
      { id: 'v1', type: 'video', position: { x: 0, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [
      {
        id: 'e1',
        source: 'i1',
        target: 'v1',
        sourceHandle: 'image',
        targetHandle: 'firstFrame',
      },
      {
        id: 'e2',
        source: 'i2',
        target: 'v1',
        sourceHandle: 'image',
        targetHandle: 'lastFrame',
      },
    ]

    const { iterations } = simulateDataFlowUntilStable(nodes, edges)
    expect(iterations).toBeLessThanOrEqual(2)
    const video = simulateDataFlowUntilStable(nodes, edges).nodes.find((n) => n.id === 'v1')
    expect(video?.data.firstFrameSrc).toBe('blob:a')
    expect(video?.data.lastFrameSrc).toBe('blob:b')
  })

  it('fans out one image to multiple video nodes', () => {
    const nodes: Node[] = [
      {
        id: 'i1',
        type: 'image',
        position: { x: 0, y: 0 },
        data: { imageSrc: 'blob:shared', imageAssetPath: 'images/shared.png' },
      },
      { id: 'v1', type: 'video', position: { x: 0, y: 0 }, data: {} },
      { id: 'v2', type: 'video', position: { x: 0, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [
      {
        id: 'e1',
        source: 'i1',
        target: 'v1',
        sourceHandle: 'image',
        targetHandle: 'firstFrame',
      },
      {
        id: 'e2',
        source: 'i1',
        target: 'v2',
        sourceHandle: 'image',
        targetHandle: 'firstFrame',
      },
    ]
    const patches = computeDataFlowPatches(nodes, edges)
    expect(patches).toHaveLength(2)
    expect(patches.find((p) => p.nodeId === 'v1')?.data.firstFrameSrc).toBe('blob:shared')
    expect(patches.find((p) => p.nodeId === 'v2')?.data.firstFrameSrc).toBe('blob:shared')
  })

  it('clears firstFrame on video when edge removed', () => {
    const nodes: Node[] = [
      { id: 'i1', type: 'image', position: { x: 0, y: 0 }, data: { imageSrc: 'blob:a', imageAssetPath: 'images/a.png' } },
      {
        id: 'v1',
        type: 'video',
        position: { x: 0, y: 0 },
        data: { firstFrameSrc: 'blob:a', firstFrameAssetPath: 'images/a.png' },
      },
    ]
    const patches = computeDataFlowPatches(nodes, [])
    expect(patches).toEqual([
      {
        nodeId: 'v1',
        data: { firstFrameSrc: undefined, firstFrameAssetPath: undefined },
      },
    ])
  })

  it('clears image prompt when text edge removed', () => {
    const nodes: Node[] = [
      { id: 't1', type: 'text', position: { x: 0, y: 0 }, data: { output: 'hello' } },
      { id: 'i1', type: 'image', position: { x: 0, y: 0 }, data: { prompt: 'hello' } },
    ]
    const patches = computeDataFlowPatches(nodes, [])
    expect(patches).toEqual([{ nodeId: 'i1', data: { prompt: undefined } }])
  })

  it('clears video prompt when upstream disconnected', () => {
    const nodes: Node[] = [
      {
        id: 'v1',
        type: 'video',
        position: { x: 0, y: 0 },
        data: { prompt: 'scene description' },
      },
    ]
    const patches = computeDataFlowPatches(nodes, [])
    expect(patches).toEqual([{ nodeId: 'v1', data: { prompt: undefined } }])
  })
})
