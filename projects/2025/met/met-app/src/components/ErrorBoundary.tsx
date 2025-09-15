import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode; fallback?: ReactNode }
type State = { hasError: boolean; error?: any }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: any, info: any) {
    console.error('ErrorBoundary caught error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: '1rem', border: '1px solid #552', background: '#220', color: '#faa', borderRadius: 8 }}>
          <strong>Произошла ошибка визуализации 3D сцены.</strong>
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>См. консоль разработчика для подробностей.</div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
