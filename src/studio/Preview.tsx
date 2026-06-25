import { type ComponentType } from 'react';
import { DashboardProvider } from '../sdk/dashboard';
import { ErrorBoundary } from '../sdk/ui/ErrorBoundary';

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
    <ErrorBoundary
      key={version}
      className="rd-studio__runtime-error"
      onError={(error) => onRuntimeError(error.message)}
      fallback={(error) => (
        <div className="rd-studio__runtime-error">
          <strong>Laufzeitfehler beim Rendern</strong>
          <pre>{error.message}</pre>
        </div>
      )}
    >
      <DashboardProvider>
        <Dashboard />
      </DashboardProvider>
    </ErrorBoundary>
  );
}
