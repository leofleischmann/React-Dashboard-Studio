import type { ReactNode } from 'react';

/** Page header for example-dashboard reference tabs. */
export function PageHead({
  icon,
  module,
  title,
  children,
}: {
  icon: string;
  module: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <header className="rd-pagehead rd-glass">
      <span className="rd-pagehead__icon" aria-hidden>{icon}</span>
      <div className="rd-pagehead__text">
        <span className="rd-pagehead__module">{module}</span>
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
    </header>
  );
}
