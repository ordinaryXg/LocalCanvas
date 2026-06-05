import { describe, it, expect } from 'vitest'
import { parseSrt, findCueAtTime } from './parseSrt'

const SAMPLE = `1
00:00:01,000 --> 00:00:03,500
Hello world

2
00:00:04,000 --> 00:00:06,000
Second line
with break
`

describe('parseSrt', () => {
  it('parses cues with timestamps and text', () => {
    const cues = parseSrt(SAMPLE)
    expect(cues).toHaveLength(2)
    expect(cues[0].startTime).toBeCloseTo(1)
    expect(cues[0].endTime).toBeCloseTo(3.5)
    expect(cues[0].text).toBe('Hello world')
    expect(cues[1].text).toBe('Second line\nwith break')
  })

  it('finds cue at playhead time', () => {
    const cues = parseSrt(SAMPLE)
    expect(findCueAtTime(cues, 2)?.text).toBe('Hello world')
    expect(findCueAtTime(cues, 5)?.text).toBe('Second line\nwith break')
    expect(findCueAtTime(cues, 0)).toBeNull()
  })
})
