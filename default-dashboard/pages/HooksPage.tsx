import { useEffect, useRef, useState } from 'react';
import {
  applyThemeVars,
  callService,
  callServiceWithTarget,
  getAppHass,
  states,
  useAreaEntities,
  useAreaName,
  useAreas,
  useCalendarEvents,
  useDarkMode,
  useEntities,
  useEntitiesByDomain,
  useEntitiesByLabel,
  useEntity,
  useEntityAge,
  useEntityAttribute,
  useEnergy,
  useEntityRegistry,
  useEntityState,
  useEntityStatistics,
  useHassReady,
  useIsMobile,
  useLabels,
  useSun,
  useTemplate,
  useTheme,
  useTime,
} from '@ha';
import { entityDisplayName, energy, num, stateLabel } from '@ha/format';
import { Section } from '@ha/ui';
import { ResponsiveGrid } from '@ha/layout';
import { PageHead } from '../components/PageHead';
import { HookDemoCard } from '../components/HookDemoCard';
import { byDomain, numericSensors } from '../lib/pickers';

export function HooksPage() {
  const ready = useHassReady();
  const now = useTime(1000);
  const sun = useSun();
  const dark = useDarkMode();
  const theme = useTheme();
  const mobile = useIsMobile();
  const entities = useEntities();
  const areas = useAreas();
  const labels = useLabels();
  const lights = useEntitiesByDomain('light');
  const tempSensors = useEntities({ domain: 'sensor', deviceClass: 'temperature' });

  const sample = entities[0];
  const sampleId = sample?.entity_id ?? 'sensor.example';
  const tempEntityId = tempSensors[0]?.entity_id ?? sampleId;
  const tempTemplate = useTemplate(
    `{{ states('${tempEntityId}') | float | round(1) }}`,
  );
  const sunGreeting = useTemplate(
    "{% if is_state('sun.sun', 'above_horizon') %}Tag{% else %}Abend{% endif %}",
  );
  const sunIsDay = useTemplate("{{ is_state('sun.sun', 'above_horizon') }}", {
    parse: 'boolean',
  });

  const entity = useEntity(sampleId);
  const sampleState = useEntityState(sampleId);

  const ageCandidates = useEntities({ domain: 'binary_sensor' });
  const ageEntityId = ageCandidates[0]?.entity_id ?? sampleId;
  const entityAge = useEntityAge(ageEntityId as never, {
    style: 'since',
    tickMs: 1000,
  });

  const registryEntry = useEntityRegistry(sampleId as never);
  const friendly = useEntityAttribute<string>(sampleId, 'friendly_name');

  const areaId = areas[0]?.area_id ?? '';
  const areaName = useAreaName(areaId);
  const areaEntities = useAreaEntities(areaId);
  const labelId = labels[0]?.label_id ?? '';
  const labelEntities = useEntitiesByLabel(labelId);

  const statsId = numericSensors(entities, 1)[0]?.entity_id;
  const stats = useEntityStatistics(statsId ? [statsId] : [], { days: 7 });

  const energySensors = useEntities({ domain: 'sensor', deviceClass: 'energy' });
  const energyId = energySensors[0]?.entity_id ?? '';
  const todayEnergy = useEnergy(energyId as never, { period: 'today' });
  const weekEnergy = useEnergy(energyId as never, { period: 'week' });

  const calendar = useEntitiesByDomain('calendar')[0];
  const events = useCalendarEvents(calendar?.entity_id ?? '', 7);

  const firstLight = lights[0]?.entity_id;
  const allLightIds = lights.map((l) => l.entity_id);

  // applyThemeVars — inject HA theme variables onto a live element.
  const themeBoxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (themeBoxRef.current) return applyThemeVars(themeBoxRef.current, theme);
  }, [theme]);

  // states proxy — non-reactive read inside a handler.
  const [peek, setPeek] = useState<string>('—');
  const readImperative = () => {
    const [domain, name] = sampleId.split('.');
    const value = states[domain]?.[name]?.state ?? 'n/a';
    setPeek(`${value} · ${new Date().toLocaleTimeString('de-DE')}`);
  };

  const hass = getAppHass();
  const haVersion = (hass?.config as { version?: string } | undefined)?.version;

  return (
    <>
      <PageHead icon="⚡" module="@ha" title="Hooks, Services & State">
        Reaktive Hooks für jede Facette von Home Assistant. Komponenten rendern nur neu,
        wenn sich relevante Entities ändern — jede Karte zeigt Live-Daten.
      </PageHead>

      <Section title="Entities">
        <ResponsiveGrid min={270}>
          <HookDemoCard module="@ha" name="useHassReady()" hint="Verbindung zu HA bereit?">
            <strong>{ready ? '✓ verbunden' : '… verbindet'}</strong>
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useEntity(id)" hint={sampleId}>
            {entity ? (
              <>
                <strong>{entity.state}</strong>
                <small>{entityDisplayName(entity, sampleId)}</small>
              </>
            ) : (
              <span className="rd-empty">Keine Entity</span>
            )}
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useEntityState(id)" hint="nur der State-String">
            <strong>{sampleState ?? '–'}</strong>
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useEntityAge(id)" hint={`${ageEntityId} · seit …`}>
            {entityAge.entity ? (
              <>
                <strong>{entityAge.label}</strong>
                <small>
                  {stateLabel(entityAge.state)} · seit{' '}
                  {entityAge.changedAt?.toLocaleTimeString('de-DE') ?? '–'}
                </small>
              </>
            ) : (
              <span className="rd-empty">Keine Entity</span>
            )}
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useEntityAttribute(id, attr)" hint="friendly_name">
            <strong>{friendly ?? '–'}</strong>
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useEntities()">
            <strong>{entities.length}</strong> Entities gesamt
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useEntities({ filter })" hint="domain: sensor · deviceClass: temperature">
            <strong>{tempSensors.length}</strong> Temperatur-Sensoren
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useEntitiesByDomain('light')">
            <strong>{lights.length}</strong> Lichter ·{' '}
            {lights.filter((l) => l.state === 'on').length} an
          </HookDemoCard>
        </ResponsiveGrid>
      </Section>

      <Section title="Templates (HA Jinja)">
        <ResponsiveGrid min={270}>
          <HookDemoCard
            module="@ha"
            name="useTemplate(template)"
            hint="serverseitige HA-Engine via WebSocket"
          >
            {tempTemplate.loading ? (
              <span className="rd-empty">Template lädt…</span>
            ) : tempTemplate.error ? (
              <span className="rd-empty">{tempTemplate.error}</span>
            ) : (
              <>
                <strong>{tempTemplate.value ?? '–'}</strong>
                <small>{tempEntityId}</small>
              </>
            )}
          </HookDemoCard>

          <HookDemoCard
            module="@ha"
            name="useTemplate(…, { parse: 'boolean' })"
            hint="Bedingungen auswerten"
          >
            {sunIsDay.loading ? (
              <span className="rd-empty">…</span>
            ) : sunIsDay.error ? (
              <span className="rd-empty">{sunIsDay.error}</span>
            ) : (
              <>
                <strong>{sunIsDay.value ? '☀️ Tag' : '🌙 Nacht'}</strong>
                <small>raw: {sunIsDay.raw ?? '–'}</small>
              </>
            )}
          </HookDemoCard>

          <HookDemoCard
            module="@ha"
            name="useTemplate (Jinja if/else)"
            hint="{% if is_state('sun.sun', …) %}"
          >
            {sunGreeting.loading ? (
              <span className="rd-empty">…</span>
            ) : sunGreeting.error ? (
              <span className="rd-empty">{sunGreeting.error}</span>
            ) : (
              <>
                <strong>Guten {sunGreeting.value ?? '–'}</strong>
                <small>
                  {sunGreeting.listeners?.entities?.length ?? 0} Entity-Listener
                </small>
              </>
            )}
          </HookDemoCard>
        </ResponsiveGrid>
        <p className="rd-dd-lead" style={{ marginTop: 14 }}>
          HA Jinja2 live auswerten — Bedingungen, Berechnungen, Formatierung.
          Für einfache Entity-Werte weiterhin <code>useEntity</code> bevorzugen
          (schneller, typsicher). Im Entity-Inserter: Modus <strong>Template</strong>.
        </p>
      </Section>

      <Section title="Registry, Räume & Labels">
        <ResponsiveGrid min={270}>
          <HookDemoCard module="@ha" name="useAreas()">
            <ul className="rd-dd-hook-list">
              {areas.slice(0, 5).map((a) => (
                <li key={a.area_id}>{a.name}</li>
              ))}
              {areas.length === 0 && <li className="rd-empty">Keine Areas</li>}
            </ul>
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useAreaName(areaId)" hint={areaId || 'kein Raum'}>
            <strong>{areaName ?? '–'}</strong>
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useAreaEntities(areaId)" hint={areaName ?? areaId}>
            <strong>{areaEntities.length}</strong> Entities in diesem Raum
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useLabels()">
            <ul className="rd-dd-hook-list">
              {labels.slice(0, 5).map((l) => (
                <li key={l.label_id}>{l.name}</li>
              ))}
              {labels.length === 0 && <li className="rd-empty">Keine Labels vergeben</li>}
            </ul>
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useEntitiesByLabel(labelId)" hint={labels[0]?.name ?? 'kein Label'}>
            <strong>{labelEntities.length}</strong> Entities mit diesem Label
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useEntityRegistry(id)" hint={sampleId}>
            {registryEntry ? (
              <>
                <strong>{registryEntry.area_id ?? 'kein Raum'}</strong>
                <small>{registryEntry.labels.length} Labels · {registryEntry.hidden ? 'versteckt' : 'sichtbar'}</small>
              </>
            ) : (
              <span className="rd-empty">Kein Registry-Eintrag</span>
            )}
          </HookDemoCard>
        </ResponsiveGrid>
      </Section>

      <Section title="Zeit, Sonne & Theme">
        <ResponsiveGrid min={270}>
          <HookDemoCard module="@ha" name="useTime(1000)" hint="tickt jede Sekunde">
            <strong>{now.toLocaleTimeString('de-DE')}</strong>
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useSun()">
            {sun.entity ? (
              <>
                <strong>{stateLabel(sun.state, 'sun')}</strong>
                <small>Elev. {num(sun.elevation)}° · Azimut {num(sun.azimuth)}°</small>
              </>
            ) : (
              <span className="rd-empty">sun.sun nicht verfügbar</span>
            )}
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useDarkMode() · useIsMobile()">
            <strong>{dark ? '🌙 Dark' : '☀️ Light'}</strong>
            <small>{mobile ? '📱 Mobil-Layout' : '🖥 Desktop-Layout'}</small>
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useTheme()" hint="HA-Theme-Farben">
            <div className="rd-theme-swatches">
              <span style={{ background: theme.primary }} title="primary" />
              <span style={{ background: theme.accent }} title="accent" />
              <code>{theme.primary}</code>
            </div>
          </HookDemoCard>

          <HookDemoCard module="@ha" name="applyThemeVars(el, theme)" hint="CSS-Variablen injizieren">
            <div ref={themeBoxRef} className="rd-theme-box">
              <span style={{ color: 'var(--primary-color)' }}>var(--primary-color)</span>
            </div>
          </HookDemoCard>
        </ResponsiveGrid>
      </Section>

      <Section title="Verlauf, Statistik & Energie">
        <ResponsiveGrid min={270}>
          <HookDemoCard
            module="@ha"
            name="useEnergy(id, { period: 'today' })"
            hint={energyId || 'sensor.*_energy'}
          >
            {!energyId ? (
              <span className="rd-empty">Kein energy-Sensor</span>
            ) : todayEnergy.loading ? (
              <span className="rd-empty">Lade Verlauf…</span>
            ) : (
              <>
                <strong>{energy(todayEnergy.kwh)}</strong>
                <small>{todayEnergy.points.length} Recorder-Punkte</small>
              </>
            )}
          </HookDemoCard>

          <HookDemoCard
            module="@ha"
            name="useEnergy(id, { period: 'week' })"
            hint="7-Tage-Verbrauch"
          >
            {!energyId ? (
              <span className="rd-empty">Kein energy-Sensor</span>
            ) : weekEnergy.loading ? (
              <span className="rd-empty">Lade Verlauf…</span>
            ) : (
              <>
                <strong>{energy(weekEnergy.kwh)}</strong>
                <small>{weekEnergy.daily.length} Tage mit Daten</small>
              </>
            )}
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useEntityStatistics(ids, { days: 7 })" hint={statsId}>
            {statsId && stats[statsId] ? (
              <>
                <strong>Ø {num(stats[statsId].mean)}</strong>
                <small>min {num(stats[statsId].min)} · max {num(stats[statsId].max)}</small>
              </>
            ) : (
              <span className="rd-empty">Statistik nicht verfügbar</span>
            )}
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useCalendarEvents(id, days)" hint={calendar?.entity_id ?? 'calendar.*'}>
            {calendar ? (
              <ul className="rd-dd-hook-list">
                {events.slice(0, 3).map((ev) => (
                  <li key={ev.summary + ev.start.toISOString()}>
                    {ev.summary}{' '}
                    <small>{ev.start.toLocaleDateString('de-DE')}</small>
                  </li>
                ))}
                {events.length === 0 && <li className="rd-empty">Keine Termine</li>}
              </ul>
            ) : (
              <span className="rd-empty">Kein calendar.* gefunden</span>
            )}
          </HookDemoCard>

          <HookDemoCard module="@ha" name="useEntityHistory(ids, { hours })" hint="→ Tab Charts">
            <small>Recorder-Verläufe für SparkChart &amp; HistoryChart — siehe Charts.</small>
          </HookDemoCard>
        </ResponsiveGrid>
      </Section>

      <Section title="Services & imperative Escape-Hatches">
        <ResponsiveGrid min={270}>
          <HookDemoCard module="@ha" name="callService(domain, service, data)" hint={firstLight ?? 'kein Licht'}>
            <button
              type="button"
              className="rd-demo-btn"
              disabled={!firstLight}
              onClick={() => firstLight && callService('light', 'toggle', { entity_id: firstLight })}
            >
              Licht umschalten
            </button>
          </HookDemoCard>

          <HookDemoCard module="@ha" name="callServiceWithTarget(…, target)" hint="typisiertes HA-Target">
            <button
              type="button"
              className="rd-demo-btn"
              disabled={allLightIds.length === 0}
              onClick={() => callServiceWithTarget('light', 'turn_off', {}, { entity_id: allLightIds })}
            >
              Alle {allLightIds.length} Lichter aus
            </button>
          </HookDemoCard>

          <HookDemoCard module="@ha" name="states[domain][id]" hint="nicht-reaktiv, für Handler">
            <button type="button" className="rd-demo-btn" onClick={readImperative}>
              {sampleId} lesen
            </button>
            <small>{peek}</small>
          </HookDemoCard>

          <HookDemoCard module="@ha" name="getAppHass()" hint="rohes hass-Objekt">
            <strong>{hass?.user?.name ?? 'unbekannt'}</strong>
            <small>
              Sprache {String(hass?.language ?? '–')}
              {haVersion ? ` · HA ${haVersion}` : ''}
            </small>
          </HookDemoCard>
        </ResponsiveGrid>
        <p className="rd-dd-lead" style={{ marginTop: 14 }}>
          Ebenfalls exportiert: <code>fetchEntityHistory</code>, <code>fetchEntityStatistics</code>,{' '}
          <code>fetchCalendarEvents</code> (imperative Promise-APIs) sowie{' '}
          <code>aggregateHistory</code> &amp; Co. — live im Tab <strong>Charts</strong>.
        </p>
      </Section>
    </>
  );
}
