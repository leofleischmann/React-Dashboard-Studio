import { hassStore } from './store';

export type CalendarEvent = {
  summary: string;
  start: Date;
  end?: Date;
  location?: string;
  allDay?: boolean;
};

type CalendarEventRow = {
  summary?: string;
  start?: string;
  end?: string;
  location?: string;
  all_day?: boolean;
};

function parseEvents(raw: unknown): CalendarEvent[] {
  if (!raw || typeof raw !== 'object') return [];
  const out: CalendarEvent[] = [];

  for (const value of Object.values(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const events = (value as { events?: CalendarEventRow[] }).events;
    if (!Array.isArray(events)) continue;

    for (const row of events) {
      if (!row.start) continue;
      const start = new Date(row.start);
      if (!Number.isFinite(start.getTime())) continue;
      out.push({
        summary: row.summary ?? 'Termin',
        start,
        end: row.end ? new Date(row.end) : undefined,
        location: row.location,
        allDay: row.all_day,
      });
    }
  }

  out.sort((a, b) => a.start.getTime() - b.start.getTime());
  return out;
}

/** Fetch upcoming calendar events via WebSocket service call. */
export async function fetchCalendarEvents(
  entityId: string,
  daysAhead = 7,
): Promise<CalendarEvent[]> {
  const connection = hassStore.getHass()?.connection;
  if (!connection) return [];

  const start = new Date();
  const end = new Date(start.getTime() + daysAhead * 86_400_000);

  const result = (await connection.sendMessagePromise({
    type: 'call_service',
    domain: 'calendar',
    service: 'get_events',
    target: { entity_id: entityId },
    service_data: {
      start_date_time: start.toISOString(),
      end_date_time: end.toISOString(),
    },
    return_response: true,
  })) as { response?: Record<string, unknown> };

  return parseEvents(result.response);
}
