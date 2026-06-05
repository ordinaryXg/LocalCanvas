import { describe, it, expect } from 'vitest'
import { SLASH_COMMANDS, filterSlashCommands } from './slashCommands'

describe('slashCommands', () => {
  it('includes core v5 commands', () => {
    const ids = SLASH_COMMANDS.map((c) => c.id)
    expect(ids).toContain('run')
    expect(ids).toContain('agent')
    expect(ids).toContain('exportStoryboard')
    expect(ids).toContain('style')
  })

  it('filters by query', () => {
    const results = filterSlashCommands('export')
    expect(results.some((c) => c.id === 'exportStoryboard')).toBe(true)
    expect(filterSlashCommands('xyz-none')).toHaveLength(0)
  })
})
