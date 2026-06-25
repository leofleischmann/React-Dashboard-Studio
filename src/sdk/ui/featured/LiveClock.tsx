import { useTime } from '../../hass/hooks';

/** Large clock + date — isolated tick via useTime(1000). */
export function LiveClock() {
  const now = useTime(1000);
  const time = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const sec = now.toLocaleTimeString('de-DE', { second: '2-digit' });
  const date = now.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="rd-clock">
      <div className="rd-clock__time">
        <strong>{time}</strong>
        <span className="rd-clock__sec">{sec}</span>
      </div>
      <span className="rd-clock__date">{date}</span>
    </div>
  );
}
