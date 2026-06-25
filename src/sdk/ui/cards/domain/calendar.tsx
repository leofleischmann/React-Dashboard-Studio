import { useCalendarEvents, useEntity } from '../../../hass/hooks';
import { entityDisplayName } from '../../../format';

/** Calendar — upcoming events list. */
export function CalendarCard({
  entityId,
  label,
  daysAhead = 7,
  maxEvents = 5,
}: {
  entityId: string;
  label?: string;
  daysAhead?: number;
  maxEvents?: number;
}) {
  const calendar = useEntity(entityId);
  const name = label ?? entityDisplayName(calendar, entityId);
  const events = useCalendarEvents(entityId, daysAhead);
  const shown = events.slice(0, maxEvents);

  return (
    <div className="rd-card rd-calendar">
      <span className="rd-calendar__name">{name}</span>
      {shown.length === 0 ? (
        <p className="rd-calendar__empty">Keine Termine</p>
      ) : (
        <ul className="rd-calendar__list">
          {shown.map((ev) => (
            <li key={`${ev.summary}-${ev.start.toISOString()}`}>
              <strong>{ev.summary}</strong>
              <span>
                {ev.start.toLocaleString('de-DE', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
