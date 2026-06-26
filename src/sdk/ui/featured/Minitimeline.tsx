import { useLogbook } from '../../hass/hooks';
import { entityDisplayNameForId, relativeTime, stateLabel } from '../../format';

export type MinitimelineProps = {
  /** Filter to one entity. */
  entityId?: string;
  /** Filter to a domain, e.g. `binary_sensor`. */
  domain?: string;
  hours?: number;
  limit?: number;
  /** Section title — pass empty string to hide. */
  title?: string;
  /** BCP 47 locale for clock column (default `de-DE`). */
  locale?: string;
  /** Left column: `clock` (HH:MM) or `relative` (vor 5 Min). */
  timeFormat?: 'clock' | 'relative';
  /** Show relative hint under each entry (default true). */
  showRelativeHint?: boolean;
  emptyLabel?: string;
};

function formatEntryLine(entry: {
  name: string;
  message: string;
  entityId?: string;
  domain?: string;
  state?: string;
}): string {
  if (entry.message.trim()) return entry.message;
  if (entry.state && entry.entityId) {
    const dom = entry.entityId.split('.')[0];
    return `${entry.name} → ${stateLabel(entry.state, dom)}`;
  }
  return entry.name;
}

function formatTimeColumn(
  when: Date,
  timeFormat: 'clock' | 'relative',
  locale: string,
): string {
  if (timeFormat === 'relative') return relativeTime(when);
  return when.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

/** Vertical timeline of recent logbook events. */
export function Minitimeline({
  entityId,
  domain,
  hours = 24,
  limit = 8,
  title = 'Letzte Aktivität',
  locale = 'de-DE',
  timeFormat = 'clock',
  showRelativeHint = true,
  emptyLabel = 'Keine Einträge im Zeitraum',
}: MinitimelineProps) {
  const { entries, loading } = useLogbook({
    entityId,
    domain,
    hours,
    limit,
  });

  return (
    <div className="rd-card rd-minitimeline">
      {title ? <h3 className="rd-minitimeline__title">{title}</h3> : null}

      {loading && entries.length === 0 ? (
        <p className="rd-empty">Logbook lädt…</p>
      ) : entries.length === 0 ? (
        <p className="rd-empty">{emptyLabel}</p>
      ) : (
        <ol className="rd-minitimeline__list">
          {entries.map((entry) => {
            const key = `${entry.when.toISOString()}\0${entry.entityId ?? ''}\0${entry.message}`;
            const label = entry.entityId
              ? entityDisplayNameForId(entry.entityId, entry.name)
              : entry.name;
            return (
              <li key={key} className="rd-minitimeline__item">
                <span className="rd-minitimeline__time">
                  {formatTimeColumn(entry.when, timeFormat, locale)}
                </span>
                <span className="rd-minitimeline__dot" aria-hidden />
                <div className="rd-minitimeline__body">
                  <strong>{label}</strong>
                  <span>{formatEntryLine(entry)}</span>
                  {showRelativeHint && timeFormat === 'clock' && (
                    <small>{relativeTime(entry.when)}</small>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
