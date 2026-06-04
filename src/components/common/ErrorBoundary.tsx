import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[LocalCanvas] Renderer error:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="w-screen h-screen flex items-center justify-center bg-bg-primary text-text-primary p-8">
          <div className="max-w-lg text-center space-y-4">
            <h1 className="text-lg font-medium text-danger">界面渲染出错</h1>
            <p className="text-sm text-text-muted break-words">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ error: null })
                window.location.reload()
              }}
              className="px-4 py-2 text-sm bg-accent text-white rounded hover:bg-accent-hover"
            >
              重新加载
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
