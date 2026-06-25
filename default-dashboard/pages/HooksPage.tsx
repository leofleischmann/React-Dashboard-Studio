import {
  useAreas,
  useCalendarEvents,
  useDarkMode,
  useEntities,
  useEntitiesByDomain,
  useEntity,
  useEntityAttribute,
  useEntityRegistry,
  useEntityStatistics,
  useHassReady,
  useSun,
  useTime,
} from '@ha';
import { entityDisplayName, num, stateLabel } from '@ha/format';
import { Section } from '@ha/ui';
import { ResponsiveGrid } from '@ha/layout';
import { HookDemoCard } from '../components/HookDemoCard';

export function HooksPage() {
  const ready = useHassReady();
  const now = useTime(1000);
  const sun = useSun();
  const dark = useDarkMode();
  const entities = useEntities();
  const areas = useAreas();
  const lights = useEntitiesByDomain('light');
  const filtered = useEntities({ domain: 'sensor', deviceClass: 'temperature' });
  const sample = entities[0];
  const sampleId = sample?.entity_id ?? 'sensor.example';
  const entity = useEntity(sampleId);
  const registryEntry = useEntityRegistry(sampleId as never);
  const attr = useEntityAttribute<string>(sampleId, 'friendly_name');
  const calendar = useEntitiesByDomain('calendar')[0];
  const events = useCalendarEvents(calendar?.entity_id ?? '', 7);
  const statsEntityId = filtered[0]?.entity_id;
  const stats = useEntityStatistics(statsEntityId ? [statsEntityId] : [], { days: 7 });

  return (
    <div className="rd-sdk-hooks">
      <header className="rd-sdk-showcase__page-head">
        <h2>Hooks & API (@ha)</h2>
        <p>
          Reaktive Hooks — jede Karte zeigt Live-Daten aus deiner Installation.
          Komponenten re-rendern nur, wenn sich relevante Entities ändern.
        </p>
      </header>

      <Section title="Core">
        <ResponsiveGrid min={280}>
          <HookDemoCard module="@ha" name="useHassReady()" hint="Verbindung zu HA bereit?">
            <strong>{ready ? '✓ verbunden' : '… verbindet'}</strong>
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useEntity(id)" hint={`Beispiel: ${sampleId}`}>
            {entity ? (
              <>
                <strong>{entity.state}</strong>
                <small>{entityDisplayName(entity, sampleId)}</small>
              </>
            ) : (
              <span className="rd-empty">Keine Entity</span>
            )}
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useEntityAttribute(id, attr)">
            <strong>{attr ?? '–'}</strong>
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useEntities()">
            <strong>{entities.length}</strong> Entities gesamt
          </HookDemoCard>

          <HookDemoCard
            module="@ha"
            name="useEntities({ filter })"
            hint="domain: sensor, deviceClass: temperature"
          >
            <strong>{filtered.length}</strong> Temperatur-Sensoren
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useEntitiesByDomain('light')">
            <strong>{lights.length}</strong> Lichter ·{' '}
            {lights.filter((l) => l.state === 'on').length} an
          </HookDemoCard>
        </ResponsiveGrid>
      </Section>

      <Section title="Registry & Räume">
        <ResponsiveGrid min={280}>
          <HookDemoCard module="@ha" name="useAreas()">
            <ul className="rd-sdk-hook-list">
              {areas.slice(0, 6).map((a) => (
                <li key={a.area_id}>{a.name}</li>
              ))}
              {areas.length === 0 && <li className="rd-empty">Keine Areas</li>}
            </ul>
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useEntityRegistry(id)" hint={sampleId}>
            {registryEntry ? (
              <>
                <strong>{registryEntry.entity_id}</strong>
                <small>Area: {registryEntry.area_id ?? '–'}</small>
              </>
            ) : (
              <span className="rd-empty">Kein Registry-Eintrag</span>
            )}
          </HookDemoCard>
        </ResponsiveGrid>
      </Section>

      <Section title="Zeit, Sonne & Theme">
        <ResponsiveGrid min={280}>
          <HookDemoCard module="@ha" name="useTime(tickMs)">
            <strong>{now.toLocaleTimeString('de-DE')}</strong>
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useSun()">
            {sun.entity ? (
              <>
                <strong>{stateLabel(sun.state, 'sun')}</strong>
                <small>
                  Elev. {num(sun.elevation)}° · Azimut {num(sun.azimuth)}°
                </small>
              </>
            ) : (
              <span className="rd-empty">sun.sun nicht verfügbar</span>
            )}
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useDarkMode()">
            <strong>{dark ? 'Dark Mode' : 'Light Mode'}</strong>
          </HookDemoCard>
        </ResponsiveGrid>
      </Section>

      <Section title="History, Statistics & Kalender">
        <ResponsiveGrid min={280}>
          <HookDemoCard
            module="@ha"
            name="useEntityStatistics(ids, { days: 7 })"
            hint={statsEntityId}
          >
            {statsEntityId && stats[statsEntityId] ? (
              <>
                min {num(stats[statsEntityId].min)} · max{' '}
                {num(stats[statsEntityId].max)} · mean{' '}
                {num(stats[statsEntityId].mean)}
              </>
            ) : (
              <span className="rd-empty">Statistik nicht verfügbar</span>
            )}
          </HookDemoCard>

          <HookDemoCard
            module="@ha"
            name="useCalendarEvents(id, days)"
            hint={calendar?.entity_id ?? 'calendar.*'}
          >
            {calendar ? (
              <ul className="rd-sdk-hook-list">
                {events.slice(0, 4).map((ev) => (
                  <li key={ev.summary + ev.start}>
                    {ev.summary}{' '}
                    <small>{new Date(ev.start).toLocaleDateString('de-DE')}</small>
                  </li>
                ))}
                {events.length === 0 && <li className="rd-empty">Keine Termine</li>}
              </ul>
            ) : (
              <span className="rd-empty">Kein calendar.* gefunden</span>
            )}
          </HookDemoCard>
        </ResponsiveGrid>
      </Section>

      <Section title="Weitere Hooks">
        <p className="rd-sdk-ref__lead">
          Auch verfügbar: <code>useEntityHistory</code> (Tab Charts),{' '}
          <code>useAreaEntities</code>, <code>useEntitiesByLabel</code>,{' '}
          <code>useAreaName</code>, <code>callService</code>,{' '}
          <code>callServiceWithTarget</code>, <code>getAppHass()</code>,{' '}
          <code>useTheme()</code>, <code>applyThemeVars()</code>
        </p>
      </Section>
    </div>
  );
}
