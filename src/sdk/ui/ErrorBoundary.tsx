import { Component, type ErrorInfo, type ReactNode } from 'react';

export type ErrorBoundaryProps = {
  children: ReactNode;
  /** Custom UI when a child throws. */
  fallback?: ReactNode | ((error: Error) => ReactNode);
  /** Called when an error is caught (e.g. Studio preview logging). */
  onError?: (error: Error, info: ErrorInfo) => void;
  className?: string;
};

type ErrorBoundaryState = { error: Error | null };

/**
 * Catches render errors in a subtree so one broken widget does not crash the dashboard.
 *
 *   <ErrorBoundary>
 *     <MyWidget />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[Debug ErrorBoundary]:', error.message, info.componentStack);
    this.props.onError?.(error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const { fallback, className = '' } = this.props;
    if (typeof fallback === 'function') return fallback(error);
    if (fallback) return fallback;

    return (
      <div className={`rd-error-boundary ${className}`.trim()} role="alert">
        <strong className="rd-error-boundary__title">Widget-Fehler</strong>
        <p className="rd-error-boundary__message">{error.message}</p>
      </div>
    );
  }
}
