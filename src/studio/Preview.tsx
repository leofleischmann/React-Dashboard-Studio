import { Component, type ComponentType, type ReactNode } from 'react';
import { DashboardProvider } from '../sdk/dashboard';

class ErrorBoundary extends Component<
  { children: ReactNode; onError: (message: string) => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error.message);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rd-studio__runtime-error">
          <strong>Laufzeitfehler beim Rendern</strong>
          <pre>{this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export function Preview({
  Dashboard,
  version,
  onRuntimeError,
}: {
  Dashboard: ComponentType | null;
  version: number;
  onRuntimeError: (message: string) => void;
}) {
  if (!Dashboard) {
    return <div className="rd-studio__empty">Keine gültige Vorschau.</div>;
  }
  // key=version remounts the boundary + component on each successful compile,
  // so a previous render error doesn't stick around.
  return (
    <ErrorBoundary key={version} onError={onRuntimeError}>
      <DashboardProvider>
        <Dashboard />
      </DashboardProvider>
    </ErrorBoundary>
  );
}
