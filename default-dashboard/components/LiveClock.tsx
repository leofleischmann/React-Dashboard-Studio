import { useTime } from '@ha';
import { greeting } from '@ha/format';

/** Isolated clock — verhindert 1-Sekunden-Re-Renders der ganzen Overview-Seite. */
export function LiveClock() {
  const now = useTime(1000);

  return (
    <div className="rd-sdk-showcase__clock">
      <strong>{now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</strong>
      <span>
        {greeting(now)} ·{' '}
        {now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
      </span>
    </div>
  );
}
