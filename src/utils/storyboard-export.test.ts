import { describe, expect, it } from 'vitest'
import {
  buildStoryboardCellVideoFilter,
  truncateDrawtextLabel,
} from '../../electron/utility/services/storyboard-export'

describe('storyboard-export', () => {
  it('truncates long drawtext labels', () => {
    const long = 'a'.repeat(50)
    expect(truncateDrawtextLabel(long, 36)).toHaveLength(36)
    expect(truncateDrawtextLabel(long, 36).endsWith('...')).toBe(true)
  })

  it('builds drawtext filter with fontfile and without unsupported w option', () => {
    const fontOpt = ":fontfile='C\\:/Windows/Fonts/msyh.ttc'"
    const vf = buildStoryboardCellVideoFilter(
      { sequence: 1, description: '测试镜头描述', imagePath: '/tmp/x.png' },
      true,
      fontOpt,
    )
    expect(vf).toContain('drawtext=')
    expect(vf).toContain('fontfile=')
    expect(vf).not.toMatch(/drawtext=[^:]*:w=/)
  })

  it('omits drawtext when font unavailable', () => {
    const vf = buildStoryboardCellVideoFilter(
      { sequence: 2, description: 'no font', imagePath: '/tmp/x.png' },
      true,
      '',
    )
    expect(vf).not.toContain('drawtext=')
    expect(vf).toContain('scale=')
  })
})
