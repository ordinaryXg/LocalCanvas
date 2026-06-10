/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { TopBar } from './TopBar'
import { useCanvasStore } from '../../stores/canvasStore'
import { useProjectStore } from '../../stores/projectStore'

vi.mock('../../i18n', () => ({
  useT: () => (key: string) => key,
}))

vi.mock('../../hooks/useAutoSave', () => ({
  useManualSave: () => vi.fn(),
}))

vi.mock('../common/AccountMenu', () => ({
  AccountMenu: () => null,
}))

describe('TopBar store selectors', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    useProjectStore.setState({
      projectName: '测试',
      isDirty: false,
      isSaving: false,
      saveError: null,
    })
    useCanvasStore.setState({
      nodes: [
        {
          id: 'n1',
          type: 'image',
          position: { x: 0, y: 0 },
          data: { isGenerating: true, progress: 40 },
        },
        {
          id: 'n2',
          type: 'text',
          position: { x: 0, y: 0 },
          data: { isGenerating: true, progress: 60 },
        },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      selectedNodeIds: [],
      focusNodeRequestId: null,
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('does not trigger getSnapshot infinite loop with generating nodes', async () => {
    const errorHandler = vi.fn()
    const prev = window.onerror
    window.onerror = (...args) => {
      errorHandler(...args)
      return true
    }

    await act(async () => {
      root.render(
        <StrictMode>
          <TopBar onBack={() => {}} />
        </StrictMode>,
      )
      await new Promise((r) => setTimeout(r, 200))
    })

    window.onerror = prev
    expect(errorHandler).not.toHaveBeenCalled()
    expect(container.textContent).toContain('生成中')
  })
})
