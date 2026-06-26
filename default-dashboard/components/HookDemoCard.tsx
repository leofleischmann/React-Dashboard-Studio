import type { ReactNode } from 'react';

export function HookDemoCard({
  module,
  name,
  hint,
  children,
}: {
  module: '@ha' | '@ha/ui' | '@ha/layout' | '@ha/format' | '@ha/debug';
  name: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <article className="rd-card rd-dd-hook">
      <header className="rd-dd-hook__head">
        <span className="rd-dd-hook__module">{module}</span>
        <code className="rd-dd-hook__name">{name}</code>
        {hint && <p className="rd-dd-hook__hint">{hint}</p>}
      </header>
      <div className="rd-dd-hook__live">{children}</div>
    </article>
  );
}
