import {
  useAreas,
  useDarkMode,
  useEntities,
  useEntitiesByDomain,
  useHassReady,
  useSun,
  useTime,
} from '@ha';
import { greeting, num, relativeTime, weatherIcon } from '@ha/format';
import { Card, Section, Stat } from '@ha/ui';
import { ResponsiveGrid, Row } from '@ha/layout';
import type { ShowcasePage } from '../types';

const DOMAIN_COLORS = [
  '#6ea8fe',
  '#a78bfa',
  '#34d399',
  '#fbbf24',
  '#f87171',
  '#fb923c',
  '#38bdf8',
  '#e879f9',
];

function domainCounts(entities: ReturnType<typeof useEntities>) {
  const map = new Map<string, number>();
  for (const e of entities) {
    const d = e.entity_id.split('.')[0] ?? 'other';
    map.set(d, (map.get(d) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export function OverviewPage({ onNavigate }: { onNavigate: (p: ShowcasePage) => void }) {
  const ready = useHassReady();
  const now = useTime(1000);
  const sun = useSun();
  const dark = useDarkMode();
  const entities = useEntities();
  const areas = useAreas();
  const lights = useEntitiesByDomain('light');
  const weather = useEntitiesByDomain('weather')[0];
  const people = useEntitiesByDomain('person');

  const lightsOn = lights.filter((l) => l.state === 'on').length;
  const peopleHome = people.filter((p) => p.state === 'home').length;
  const domains = domainCounts(entities).slice(0, 12);

  return (
    <div className="rd-sdk-overview">
      <header className="rd-sdk-showcase__hero">
        <div className="rd-sdk-showcase__hero-main">
          <p className="rd-sdk-showcase__eyebrow">{greeting(now)} · Home Assistant Dashboard Studio</p>
          <h1>Dein Zuhause als Code</h1>
          <p className="rd-sdk-showcase__tagline">
            Live-SDK-Showcase — jede Karte hier nutzt deine echten Home-Assistant-Entities.
            Alles, was du siehst, kannst du kopieren und anpassen.
          </p>
          {!ready && (
            <p className="rd-sdk-start__hint">Verbinde mit Home Assistant …</p>
          )}
        </div>
        <div className="rd-sdk-showcase__hero-aside">
          <div className="rd-sdk-showcase__clock">
            <strong>
              {now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            </strong>
            <span>
              {now.toLocaleDateString('de-DE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>
          </div>
          {sun.entity && (
            <div className="rd-sdk-showcase__sun">
              <span>{sun.isDay ? '☀️' : '🌙'}</span>
              <div>
                <strong>{sun.isDay ? 'Tag' : 'Nacht'}</strong>
                <small>
                  {sun.rising && `Aufgang ${relativeTime(sun.rising)}`}
                  {sun.setting && ` · Untergang ${relativeTime(sun.setting)}`}
                </small>
              </div>
            </div>
          )}
          <div className="rd-sdk-showcase__theme-pill">
            Theme: <strong>{dark ? 'Dark' : 'Light'}</strong>
          </div>
        </div>
      </header>

      <div className="rd-sdk-showcase__stats-wrap">
        <ResponsiveGrid min={150}>
          <Stat label="Entities" value={String(entities.length)} accent />
          <Stat label="Domains" value={String(domainCounts(entities).length)} />
          <Stat label="Areas" value={String(areas.length)} />
          <Stat label="Lichter an" value={`${lightsOn}/${lights.length}`} />
          <Stat label="Personen da" value={String(peopleHome)} />
          {weather && (
            <Stat
              label="Wetter"
              value={`${weatherIcon(weather.state)} ${num(weather.attributes.temperature as string | number)}`}
              unit="°C"
            />
          )}
        </ResponsiveGrid>
      </div>

      <Section title="SDK-Module — alles importierbar">
        <ResponsiveGrid min={220}>
          <div className="rd-card rd-sdk-module-card">
            <h3>@ha</h3>
            <p>useEntity, useEntityHistory, useAreas, useSun, useTheme, callService, …</p>
            <button type="button" className="rd-sdk-chip" onClick={() => onNavigate('hooks')}>
              Hooks ansehen →
            </button>
          </div>
          <div className="rd-card rd-sdk-module-card">
            <h3>@ha/ui</h3>
            <p>30+ Widgets: Stat, LightTile, ClimateCard, SparkChart, LockCard, …</p>
            <button type="button" className="rd-sdk-chip" onClick={() => onNavigate('widgets')}>
              Galerie →
            </button>
          </div>
          <div className="rd-card rd-sdk-module-card">
            <h3>@ha/layout</h3>
            <p>PageShell, Tabs, Stack, Row, ResponsiveGrid, useHashRoute</p>
            <button type="button" className="rd-sdk-chip" onClick={() => onNavigate('layout')}>
              Layout →
            </button>
          </div>
          <div className="rd-card rd-sdk-module-card">
            <h3>@ha/format</h3>
            <p>num, temp, stateLabel, relativeTime, entityDisplayName, …</p>
            <button type="button" className="rd-sdk-chip" onClick={() => onNavigate('format')}>
              Format →
            </button>
          </div>
        </ResponsiveGrid>
      </Section>

      <Section title="Domains in deiner Installation">
        <div className="rd-sdk-domain-row">
          <Row gap={8}>
            {domains.map(([domain, count], i) => (
              <span
                key={domain}
                className="rd-sdk-domain-pill"
                style={{ borderColor: DOMAIN_COLORS[i % DOMAIN_COLORS.length] }}
              >
                <strong>{domain}</strong>
                <small>{count}</small>
              </span>
            ))}
          </Row>
        </div>
      </Section>

      {areas.length > 0 && (
        <Section title={`Areas (${areas.length})`}>
          <ResponsiveGrid min={180}>
            {areas.slice(0, 8).map((area) => (
              <Card key={area.area_id}>
                <strong>{area.name}</strong>
                <br />
                <small>{area.area_id}</small>
              </Card>
            ))}
          </ResponsiveGrid>
        </Section>
      )}

      <Section title="Charts & Verlauf">
        <p className="rd-sdk-ref__lead">
          SparkChart, HistoryChart, useEntityHistory und useEntityStatistics — mit deinen Sensoren.
        </p>
        <button type="button" className="rd-sdk-cta" onClick={() => onNavigate('charts')}>
          Charts entdecken →
        </button>
      </Section>
    </div>
  );
}
