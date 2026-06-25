import type { ReactNode } from 'react';

export function HookDemoCard({
  module,
  name,
  hint,
  children,
}: {
  module: '@ha' | '@ha/ui' | '@ha/layout' | '@ha/format';
  name: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <article className="rd-card rd-sdk-hook">
      <header className="rd-sdk-hook__head">
        <span className="rd-sdk-hook__module">{module}</span>
        <code className="rd-sdk-hook__name">{name}</code>
        {hint && <p className="rd-sdk-hook__hint">{hint}</p>}
      </header>
      <div className="rd-sdk-hook__live">{children}</div>
    </article>
  );
}
