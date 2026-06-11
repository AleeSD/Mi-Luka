import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F9FAFB]">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Algo salió mal</h2>
          <p className="text-gray-500 text-sm text-center mb-6">
            Ocurrió un error inesperado. Por favor recarga la página.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl text-white text-sm font-medium"
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
          >
            Recargar página
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
