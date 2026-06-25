import { useLogbook } from '../../hass/hooks';
import { entityDisplayNameForId, relativeTime, stateLabel } from '../../format';

export type MinitimelineProps = {
  /** Filter to one entity. */
  entityId?: string;
  /** Filter to a domain, e.g. `binary_sensor`. */
  domain?: string;
  hours?: number;
  limit?: number;
  title?: string;
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

/** Vertical timeline of recent logbook events. */
export function Minitimeline({
  entityId,
  domain,
  hours = 24,
  limit = 8,
  title = 'Letzte Aktivität',
}: MinitimelineProps) {
  const { entries, loading } = useLogbook({
    entityId,
    domain,
    hours,
    limit,
  });

  return (
    <div className="rd-card rd-minitimeline">
      {title && <h3 className="rd-minitimeline__title">{title}</h3>}

      {loading && entries.length === 0 ? (
        <p className="rd-empty">Logbook lädt…</p>
      ) : entries.length === 0 ? (
        <p className="rd-empty">Keine Einträge im Zeitraum</p>
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
                  {entry.when.toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="rd-minitimeline__dot" aria-hidden />
                <div className="rd-minitimeline__body">
                  <strong>{label}</strong>
                  <span>{formatEntryLine(entry)}</span>
                  <small>{relativeTime(entry.when)}</small>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
