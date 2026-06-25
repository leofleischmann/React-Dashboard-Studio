import { useCallback, useEffect, useState, type ReactNode } from 'react';

export type TabItem<T extends string = string> = {
  id: T;
  label: string;
  icon?: string;
};

/** Vertical stack with consistent gap. */
export function Stack({
  children,
  gap = 14,
}: {
  children: ReactNode;
  gap?: number;
}) {
  return (
    <div className="rd-stack" style={{ gap }}>
      {children}
    </div>
  );
}

/** Horizontal row with wrap. */
export function Row({
  children,
  gap = 12,
  align = 'stretch',
}: {
  children: ReactNode;
  gap?: number;
  align?: 'start' | 'center' | 'stretch' | 'end';
}) {
  return (
    <div
      className="rd-row"
      style={{ gap, alignItems: align }}
    >
      {children}
    </div>
  );
}

/** Responsive auto-fill grid. */
export function ResponsiveGrid({
  children,
  min = 180,
  gap = 14,
}: {
  children: ReactNode;
  min?: number;
  gap?: number;
}) {
  return (
    <div
      className="rd-responsive-grid"
      style={{
        gap,
        gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}

/** Bottom tab bar for multi-page dashboards. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel = 'Navigation',
}: {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
}) {
  return (
    <nav className="rd-tabs" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`rd-tabs__item ${value === tab.id ? 'is-active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon && (
            <span className="rd-tabs__icon" aria-hidden>
              {tab.icon}
            </span>
          )}
          <span className="rd-tabs__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

/** Page shell with scrollable main area and optional bottom navigation. */
export function PageShell({
  children,
  nav,
  className = '',
}: {
  children: ReactNode;
  nav?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rd-page-shell ${className}`.trim()}>
      <main className="rd-page-shell__main">{children}</main>
      {nav}
    </div>
  );
}

function readHashRoute<T extends string>(
  defaultRoute: T,
  validRoutes: readonly T[],
): T {
  if (typeof window === 'undefined') return defaultRoute;
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  return (validRoutes.includes(raw as T) ? raw : defaultRoute) as T;
}

/** Hash-based routing for deep links, e.g. `#/energie`. */
export function useHashRoute<T extends string>(
  defaultRoute: T,
  validRoutes: readonly T[],
): [T, (route: T) => void] {
  const [route, setRoute] = useState<T>(() =>
    readHashRoute(defaultRoute, validRoutes),
  );

  useEffect(() => {
    const onHashChange = () => {
      setRoute(readHashRoute(defaultRoute, validRoutes));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [defaultRoute, validRoutes]);

  const navigate = useCallback(
    (next: T) => {
      if (typeof window === 'undefined') return;
      const prefix = window.location.hash.startsWith('#/') ? '#/' : '#/';
      window.location.hash = `${prefix}${next}`;
      setRoute(next);
    },
    [],
  );

  return [route, navigate];
}

/** Combine {@link PageShell} + {@link Tabs} + {@link useHashRoute}. */
export function RoutedPageShell<T extends string>({
  tabs,
  defaultRoute,
  pages,
  className = '',
}: {
  tabs: TabItem<T>[];
  defaultRoute: T;
  pages: Record<T, ReactNode>;
  className?: string;
}) {
  const validRoutes = tabs.map((t) => t.id);
  const [route, setRoute] = useHashRoute(defaultRoute, validRoutes);

  return (
    <PageShell
      className={className}
      nav={<Tabs tabs={tabs} value={route} onChange={setRoute} />}
    >
      {pages[route]}
    </PageShell>
  );
}
