import { useState } from 'react'
import { isEditorCoachDone, markEditorCoachDone } from '../../constants/editorFeatures'

const STEPS = [
  { title: '画布', body: '画布用来搭流程和连线。' },
  { title: '节点 Dock', body: '从左侧 ⊕ 拖入节点。' },
  { title: '检查器', body: '右边看状态与连线；具体编辑在底部面板。' },
  { title: '模式切换', body: '顶栏可在画布 / 工作台间切换；工作台按选中节点自动显示生成或剪辑。' },
]

export function EditorCoachMark() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(() => !isEditorCoachDone())

  if (!visible) return null

  const current = STEPS[step]
  const isLast = step >= STEPS.length - 1

  const finish = () => {
    markEditorCoachDone()
    setVisible(false)
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center pb-8 pointer-events-none">
      <div className="pointer-events-auto max-w-md mx-4 rounded-xl border border-[var(--studio-border)] bg-bg-secondary p-4 shadow-xl">
        <p className="text-xs text-[var(--studio-accent)] mb-1">
          引导 {step + 1}/{STEPS.length}
        </p>
        <h3 className="text-sm font-medium text-text-primary mb-1">{current.title}</h3>
        <p className="text-sm text-text-muted mb-4">{current.body}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={finish} className="text-xs text-text-muted px-2 py-1">
            跳过
          </button>
          <button
            type="button"
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
            className="text-xs bg-[var(--studio-accent)] text-white px-3 py-1 rounded-lg"
          >
            {isLast ? '完成' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  )
}
