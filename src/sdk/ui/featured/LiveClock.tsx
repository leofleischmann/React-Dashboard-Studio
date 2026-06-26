import { useMemo } from 'react';
import { useTime } from '../../hass/hooks';
import './LiveClock.css';

export type LiveClockProps = {
  /** IANA timezone, e.g. `Europe/Berlin` (default: browser local). */
  timeZone?: string;
  /** BCP 47 locale (default `de-DE`). */
  locale?: string;
  /** Show ticking seconds (default true). */
  showSeconds?: boolean;
  /** 12-hour clock when true, 24-hour when false (default false). */
  hour12?: boolean;
  /** Show date line below time (default true). */
  showDate?: boolean;
  /** `compact` for sidebars; default is hero-sized. */
  size?: 'compact' | 'default';
};

/** Large clock + date — isolated tick via useTime(1000). */
export function LiveClock({
  timeZone,
  locale = 'de-DE',
  showSeconds = true,
  hour12 = false,
  showDate = true,
  size = 'default',
}: LiveClockProps = {}) {
  const now = useTime(1000);

  const timeOpts = useMemo(
    () => ({
      hour: '2-digit' as const,
      minute: '2-digit' as const,
      hour12,
      ...(timeZone ? { timeZone } : {}),
    }),
    [hour12, timeZone],
  );

  const secOpts = useMemo(
    () => ({
      second: '2-digit' as const,
      ...(timeZone ? { timeZone } : {}),
    }),
    [timeZone],
  );

  const dateOpts = useMemo(
    () => ({
      weekday: 'long' as const,
      day: 'numeric' as const,
      month: 'long' as const,
      ...(timeZone ? { timeZone } : {}),
    }),
    [timeZone],
  );

  const time = now.toLocaleTimeString(locale, timeOpts);
  const sec = now.toLocaleTimeString(locale, secOpts);
  const date = now.toLocaleDateString(locale, dateOpts);

  return (
    <div className={`rd-clock${size === 'compact' ? ' rd-clock--compact' : ''}`}>
      <div className="rd-clock__time">
        <strong>{time}</strong>
        {showSeconds && <span className="rd-clock__sec">{sec}</span>}
      </div>
      {showDate && <span className="rd-clock__date">{date}</span>}
    </div>
  );
}
