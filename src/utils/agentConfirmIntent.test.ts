import { describe, it, expect } from 'vitest'
import { isPatchConfirmMessage, isPlanConfirmMessage } from './agentConfirmIntent'

describe('agentConfirmIntent', () => {
  it('detects patch confirm phrases', () => {
    expect(isPatchConfirmMessage('确认并应用补丁')).toBe(true)
    expect(isPatchConfirmMessage('  确认并应用补丁  ', '确认并应用补丁')).toBe(true)
    expect(isPatchConfirmMessage('在这张图后面接视频')).toBe(false)
  })

  it('detects plan confirm phrases', () => {
    expect(isPlanConfirmMessage('确认并添加到画布')).toBe(true)
  })
})
