export interface SubtitleCue {
  id: string
  index: number
  startTime: number
  endTime: number
  text: string
}

function parseTimestamp(ts: string): number {
  const m = ts.trim().match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/)
  if (!m) return 0
  return (
    parseInt(m[1]) * 3600 +
    parseInt(m[2]) * 60 +
    parseInt(m[3]) +
    parseInt(m[4]) / 1000
  )
}

export function parseSrt(content: string): SubtitleCue[] {
  const blocks = content.replace(/\r\n/g, '\n').trim().split(/\n\n+/)
  const cues: SubtitleCue[] = []

  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim())
    if (lines.length < 2) continue

    let timeLineIdx = 0
    const firstNum = parseInt(lines[0], 10)
    if (!Number.isNaN(firstNum)) {
      timeLineIdx = 1
    }
    if (timeLineIdx >= lines.length) continue

    const timeLine = lines[timeLineIdx]
    const timeMatch = timeLine.match(
      /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/,
    )
    if (!timeMatch) continue

    const text = lines.slice(timeLineIdx + 1).join('\n').trim()
    if (!text) continue

    const index = Number.isNaN(firstNum) ? cues.length + 1 : firstNum
    cues.push({
      id: `cue-${index}`,
      index,
      startTime: parseTimestamp(timeMatch[1]),
      endTime: parseTimestamp(timeMatch[2]),
      text,
    })
  }

  return cues
}

export function findCueAtTime(cues: SubtitleCue[], time: number): SubtitleCue | null {
  return cues.find((c) => time >= c.startTime && time < c.endTime) ?? null
}
