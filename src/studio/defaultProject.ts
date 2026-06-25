const DASHBOARD_TSX = `import { PageShell, Tabs, useHashRoute } from '@ha/layout';
import { StartPage } from './pages/StartPage';
import { WidgetReference } from './pages/WidgetReference';
import { LayoutDemo } from './pages/LayoutDemo';

// SDK-Referenz — wird bei der Erstinstallation in Home Assistant geladen.
// Ersetze oder erweitere es jederzeit (✎ Bearbeiten). Dein Code bleibt bei Updates erhalten.
const TABS = [
  { id: 'start', label: 'Start', icon: '📘' },
  { id: 'widgets', label: 'Widgets', icon: '🧩' },
  { id: 'layout', label: 'Layout', icon: '📐' },
];

export default function Dashboard() {
  const [page, setPage] = useHashRoute('start', ['start', 'widgets', 'layout']);

  return (
    <div className="rd-root rd-sdk-ref">
      <PageShell nav={<Tabs tabs={TABS} value={page} onChange={setPage} ariaLabel="SDK Referenz" />}>
        {page === 'start' && <StartPage />}
        {page === 'widgets' && <WidgetReference />}
        {page === 'layout' && <LayoutDemo />}
      </PageShell>
    </div>
  );
}
`;

const START_PAGE = `import { Section } from '@ha/ui';
import { useHassReady } from '@ha';

export function StartPage() {
  const ready = useHassReady();

  return (
    <div className="rd-sdk-start">
      <header className="rd-sdk-start__hero">
        <h1>Home Assistant Dashboard Studio</h1>
        <p>Live-SDK-Referenz — alle @ha-Module mit deinen echten Entities.</p>
        {!ready && <p className="rd-sdk-start__hint">Verbinde mit Home Assistant …</p>}
      </header>

      <Section title="Importierbare Module">
        <div className="rd-sdk-modules">
          <article className="rd-card rd-sdk-module">
            <h3>@ha</h3>
            <p>Hooks & API: useEntity, useEntityHistory, useEntityStatistics, useAreas, useTheme, callService, …</p>
          </article>
          <article className="rd-card rd-sdk-module">
            <h3>@ha/ui</h3>
            <p>Widgets: Stat, LightTile, ClimateCard, SparkChart, LockCard, CalendarCard, …</p>
          </article>
          <article className="rd-card rd-sdk-module">
            <h3>@ha/layout</h3>
            <p>PageShell, Tabs, Stack, Row, ResponsiveGrid, useHashRoute</p>
          </article>
          <article className="rd-card rd-sdk-module">
            <h3>@ha/format</h3>
            <p>num, temp, stateLabel, relativeTime, entityDisplayName, …</p>
          </article>
        </div>
      </Section>

      <Section title="Nächste Schritte">
        <ul className="rd-sdk-steps">
          <li>Tab <strong>Widgets</strong> — alle Komponenten mit Live-Daten</li>
          <li>Tab <strong>Layout</strong> — Navigation & Layout-Helfer</li>
          <li><strong>✎ Bearbeiten</strong> — Code anpassen oder Dateien im Panel anlegen</li>
          <li><strong>⚡ Entities</strong> — Snippets aus deiner HA-Instanz einfügen</li>
        </ul>
      </Section>
    </div>
  );
}
`;

const WIDGET_REFERENCE = `import { Section } from '@ha/ui';
import { WidgetShowcase } from '../components/WidgetShowcase';

export function WidgetReference() {
  return (
    <Section title="Widget-Galerie · Live mit deinen Entities">
      <p className="rd-sdk-ref__lead">
        Jede Karte zeigt das Widget mit der ersten passenden Entity deiner Installation.
      </p>
      <WidgetShowcase />
    </Section>
  );
}
`;

const LAYOUT_DEMO = `import { Card, Section } from '@ha/ui';
import { Stack, Row, ResponsiveGrid, Tabs, useHashRoute } from '@ha/layout';

export function LayoutDemo() {
  const [tab, setTab] = useHashRoute('grid', ['grid', 'stack', 'row']);

  return (
    <Section title="Layout (@ha/layout)">
      <Tabs
        tabs={[
          { id: 'grid', label: 'Grid', icon: '▦' },
          { id: 'stack', label: 'Stack', icon: '☰' },
          { id: 'row', label: 'Row', icon: '↔' },
        ]}
        value={tab}
        onChange={setTab}
        ariaLabel="Layout Demo"
      />

      {tab === 'grid' && (
        <ResponsiveGrid min={140}>
          <Card><strong>ResponsiveGrid</strong><p>auto-fill Spalten</p></Card>
          <Card><strong>Card</strong><p>Basis-Karte</p></Card>
          <Card><strong>Card</strong><p>passt sich der Breite an</p></Card>
        </ResponsiveGrid>
      )}

      {tab === 'stack' && (
        <Stack gap={10}>
          <Card>Stack — vertikal</Card>
          <Card>Element 2</Card>
          <Card>Element 3</Card>
        </Stack>
      )}

      {tab === 'row' && (
        <Row gap={10}>
          <Card style={{ flex: 1 }}>Row — horizontal</Card>
          <Card style={{ flex: 1 }}>mit Wrap</Card>
          <Card style={{ flex: 1 }}>und gap</Card>
        </Row>
      )}

      <p className="rd-sdk-ref__lead" style={{ marginTop: 16 }}>
        Multi-Page: <code>PageShell</code> + <code>Tabs</code> + <code>useHashRoute()</code> (siehe dashboard.tsx).
      </p>
    </Section>
  );
}
`;

const WIDGET_SHOWCASE = `import { useEntity, useEntityHistory, useEntitiesByDomain } from '@ha';
import { entityDisplayName, num } from '@ha/format';
import {
  ActionButton,
  AlarmPanel,
  BinaryBadge,
  CalendarCard,
  CameraTile,
  ClimateCard,
  CounterCard,
  CoverCard,
  DeviceTrackerChip,
  EntityRow,
  FanCard,
  Gauge,
  HumidifierCard,
  InputBooleanTile,
  LightTile,
  LockCard,
  MediaPlayerCard,
  NumberSlider,
  PersonChip,
  SceneButton,
  ScriptButton,
  SelectCard,
  SirenCard,
  SparkChart,
  Stat,
  TimerCard,
  UpdateCard,
  VacuumCard,
  ValveCard,
  WaterHeaterCard,
  WeatherCard,
} from '@ha/ui';
import { ResponsiveGrid } from '@ha/layout';

function RefCard({
  label,
  domain,
  snippet,
  children,
}: {
  label: string;
  domain: string;
  snippet: string;
  children: (entityId: string) => unknown;
}) {
  const entity = useEntitiesByDomain(domain)[0];
  return (
    <article className="rd-card rd-sdk-ref-card">
      <header className="rd-sdk-ref-card__head">
        <strong>{label}</strong>
        <code>{snippet}</code>
      </header>
      {entity ? children(entity.entity_id) : (
        <p className="rd-empty">Kein {domain}.* gefunden</p>
      )}
    </article>
  );
}

function StatDemo({ entityId }: { entityId: string }) {
  const e = useEntity(entityId);
  return (
    <Stat
      label={entityDisplayName(e, entityId)}
      value={num(e?.state)}
      unit={e?.attributes.unit_of_measurement as string | undefined}
    />
  );
}

function SparkDemo({ entityId }: { entityId: string }) {
  const history = useEntityHistory([entityId], { hours: 24 });
  return (
    <SparkChart
      series={[
        {
          label: entityId.split('.')[1] ?? 'Verlauf',
          color: '#6ea8fe',
          points: history[entityId] ?? [],
        },
      ]}
    />
  );
}

export function WidgetShowcase() {
  return (
    <ResponsiveGrid min={260}>
      <RefCard label="Stat" domain="sensor" snippet="<Stat … />">
        {(id) => <StatDemo entityId={id} />}
      </RefCard>
      <RefCard label="Gauge" domain="sensor" snippet={'<Gauge entityId="…" />'}>
        {(id) => <Gauge entityId={id} />}
      </RefCard>
      <RefCard label="SparkChart" domain="sensor" snippet="<SparkChart … />">
        {(id) => <SparkDemo entityId={id} />}
      </RefCard>
      <RefCard label="EntityRow" domain="switch" snippet="<EntityRow … />">
        {(id) => <EntityRow entityId={id} />}
      </RefCard>
      <RefCard label="BinaryBadge" domain="binary_sensor" snippet="<BinaryBadge … />">
        {(id) => <BinaryBadge entityId={id} />}
      </RefCard>
      <RefCard label="LightTile" domain="light" snippet="<LightTile … />">
        {(id) => <LightTile entityId={id} />}
      </RefCard>
      <RefCard label="ClimateCard" domain="climate" snippet="<ClimateCard … />">
        {(id) => <ClimateCard entityId={id} />}
      </RefCard>
      <RefCard label="CoverCard" domain="cover" snippet="<CoverCard … />">
        {(id) => <CoverCard entityId={id} />}
      </RefCard>
      <RefCard label="MediaPlayerCard" domain="media_player" snippet="<MediaPlayerCard … />">
        {(id) => <MediaPlayerCard entityId={id} />}
      </RefCard>
      <RefCard label="WeatherCard" domain="weather" snippet="<WeatherCard … />">
        {(id) => <WeatherCard entityId={id} />}
      </RefCard>
      <RefCard label="PersonChip" domain="person" snippet="<PersonChip … />">
        {(id) => <PersonChip entityId={id} />}
      </RefCard>
      <RefCard label="DeviceTrackerChip" domain="device_tracker" snippet="<DeviceTrackerChip … />">
        {(id) => <DeviceTrackerChip entityId={id} />}
      </RefCard>
      <RefCard label="NumberSlider" domain="input_number" snippet="<NumberSlider … />">
        {(id) => <NumberSlider entityId={id} />}
      </RefCard>
      <RefCard label="InputBooleanTile" domain="input_boolean" snippet="<InputBooleanTile … />">
        {(id) => <InputBooleanTile entityId={id} />}
      </RefCard>
      <RefCard label="ActionButton" domain="script" snippet="<ActionButton … />">
        {(id) => <ActionButton entityId={id} />}
      </RefCard>
      <RefCard label="SceneButton" domain="scene" snippet="<SceneButton … />">
        {(id) => <SceneButton entityId={id} />}
      </RefCard>
      <RefCard label="ScriptButton" domain="script" snippet="<ScriptButton … />">
        {(id) => <ScriptButton entityId={id} />}
      </RefCard>
      <RefCard label="SelectCard" domain="input_select" snippet="<SelectCard … />">
        {(id) => <SelectCard entityId={id} />}
      </RefCard>
      <RefCard label="LockCard" domain="lock" snippet="<LockCard … />">
        {(id) => <LockCard entityId={id} />}
      </RefCard>
      <RefCard label="VacuumCard" domain="vacuum" snippet="<VacuumCard … />">
        {(id) => <VacuumCard entityId={id} />}
      </RefCard>
      <RefCard label="FanCard" domain="fan" snippet="<FanCard … />">
        {(id) => <FanCard entityId={id} />}
      </RefCard>
      <RefCard label="AlarmPanel" domain="alarm_control_panel" snippet="<AlarmPanel … />">
        {(id) => <AlarmPanel entityId={id} />}
      </RefCard>
      <RefCard label="CameraTile" domain="camera" snippet="<CameraTile … />">
        {(id) => <CameraTile entityId={id} refreshSec={30} />}
      </RefCard>
      <RefCard label="TimerCard" domain="timer" snippet="<TimerCard … />">
        {(id) => <TimerCard entityId={id} />}
      </RefCard>
      <RefCard label="CounterCard" domain="counter" snippet="<CounterCard … />">
        {(id) => <CounterCard entityId={id} />}
      </RefCard>
      <RefCard label="HumidifierCard" domain="humidifier" snippet="<HumidifierCard … />">
        {(id) => <HumidifierCard entityId={id} />}
      </RefCard>
      <RefCard label="WaterHeaterCard" domain="water_heater" snippet="<WaterHeaterCard … />">
        {(id) => <WaterHeaterCard entityId={id} />}
      </RefCard>
      <RefCard label="ValveCard" domain="valve" snippet="<ValveCard … />">
        {(id) => <ValveCard entityId={id} />}
      </RefCard>
      <RefCard label="SirenCard" domain="siren" snippet="<SirenCard … />">
        {(id) => <SirenCard entityId={id} />}
      </RefCard>
      <RefCard label="UpdateCard" domain="update" snippet="<UpdateCard … />">
        {(id) => <UpdateCard entityId={id} />}
      </RefCard>
      <RefCard label="CalendarCard" domain="calendar" snippet="<CalendarCard … />">
        {(id) => <CalendarCard entityId={id} />}
      </RefCard>
    </ResponsiveGrid>
  );
}
`;

/** Shipped on first install — SDK reference (not your personal ./dashboard/ dev copy). */
export const DEFAULT_PROJECT = {
  entry: 'dashboard.tsx',
  files: {
    'dashboard.tsx': DASHBOARD_TSX,
    'pages/StartPage.tsx': START_PAGE,
    'pages/WidgetReference.tsx': WIDGET_REFERENCE,
    'pages/LayoutDemo.tsx': LAYOUT_DEMO,
    'components/WidgetShowcase.tsx': WIDGET_SHOWCASE,
  },
};
