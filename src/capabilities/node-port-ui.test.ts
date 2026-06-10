import { describe, expect, it } from 'vitest'
import { getImageNodePorts, getTextNodePorts, getVideoNodePorts } from './node-port-ui'

describe('getVideoNodePorts', () => {
  it('seedance 1.0 hides last frame and reference ports', () => {
    const ports = getVideoNodePorts('seedance-1-0-pro-fast')
    expect(ports.map((p) => p.id)).toEqual(['prompt', 'firstFrame'])
  })

  it('seedance 2.0 shows all reference ports including up to 9 reference images', () => {
    const ports = getVideoNodePorts('seedance-2-0')
    expect(ports.map((p) => p.id)).toEqual([
      'prompt',
      'video',
      'firstFrame',
      'lastFrame',
      'reference1',
      'reference2',
      'reference3',
      'reference4',
      'reference5',
      'reference6',
      'reference7',
      'reference8',
      'reference9',
      'audio',
    ])
  })
})

describe('getTextNodePorts', () => {
  it('gpt-4o shows 10 vision image ports', () => {
    const ports = getTextNodePorts('gpt-4o')
    expect(ports).toHaveLength(10)
    expect(ports[0]?.id).toBe('image1')
    expect(ports[9]?.id).toBe('image10')
  })

  it('deepseek hides vision ports', () => {
    expect(getTextNodePorts('deepseek-v4-flash')).toEqual([])
  })
})

describe('getImageNodePorts', () => {
  it('seedream shows multi reference ports', () => {
    expect(getImageNodePorts('seedream-4-5').map((p) => p.id)).toEqual([
      'prompt',
      'reference1',
      'reference2',
      'reference3',
      'reference4',
    ])
  })

  it('dall-e-3 hides reference port', () => {
    expect(getImageNodePorts('dall-e-3').map((p) => p.id)).toEqual(['prompt'])
  })
})
