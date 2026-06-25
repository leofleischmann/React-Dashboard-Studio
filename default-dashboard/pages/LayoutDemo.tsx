import { useState } from 'react';
import { Card, Section, Stat } from '@ha/ui';
import {
  ResponsiveGrid,
  Row,
  Stack,
  Tabs,
  type TabItem,
} from '@ha/layout';
import { PageHead } from '../components/PageHead';

type LayoutTab = 'grid' | 'stack' | 'row';

const LAYOUT_TABS: TabItem<LayoutTab>[] = [
  { id: 'grid', label: 'ResponsiveGrid', icon: '▦' },
  { id: 'stack', label: 'Stack', icon: '☰' },
  { id: 'row', label: 'Row', icon: '↔' },
];

type MiniTab = 'a' | 'b' | 'c';
const MINI_TABS: TabItem<MiniTab>[] = [
  { id: 'a', label: 'Übersicht', icon: '🏠' },
  { id: 'b', label: 'Energie', icon: '⚡' },
  { id: 'c', label: 'Mehr', icon: '✨' },
];

/** A self-contained mini multi-page app — Tabs + local state, live. */
function MiniApp() {
  const [tab, setTab] = useState<MiniTab>('a');
  return (
    <div className="rd-miniapp">
      <Tabs tabs={MINI_TABS} value={tab} onChange={(id) => setTab(id)} variant="segment" ariaLabel="Mini-App" />
      <div className="rd-miniapp__body">
        {tab === 'a' && (
          <ResponsiveGrid min={110}>
            <Stat label="Räume" value="5" accent />
            <Stat label="Geräte" value="42" />
            <Stat label="Szenen" value="4" />
          </ResponsiveGrid>
        )}
        {tab === 'b' && <Card>⚡ Seite zwei — eigener Inhalt pro Tab.</Card>}
        {tab === 'c' && <Card>✨ So baust du Multi-Page-Dashboards.</Card>}
      </div>
    </div>
  );
}

export function LayoutDemo() {
  // Local state — a second useHashRoute here would share the global URL hash.
  const [tab, setTab] = useState<LayoutTab>('grid');

  return (
    <>
      <PageHead icon="📐" module="@ha/layout" title="Layout-Bausteine">
        ResponsiveGrid, Stack, Row, Tabs, PageShell, useHashRoute und RoutedPageShell —
        die Bausteine für Multi-Page-Dashboards wie diese Referenz.
      </PageHead>

      <Section title="ResponsiveGrid · Stack · Row">
        <Tabs
          tabs={LAYOUT_TABS}
          value={tab}
          onChange={(id) => setTab(id)}
          variant="segment"
          ariaLabel="Layout Demo"
        />

        {tab === 'grid' && (
          <ResponsiveGrid min={150}>
            <Card><strong>ResponsiveGrid</strong><p>auto-fill Spalten, min-Breite je Karte</p></Card>
            <Card><strong>Card</strong><p>Basis-Karte aus @ha/ui</p></Card>
            <Card><strong>Card</strong><p>passt sich der Viewport-Breite an</p></Card>
            <Card><strong>Card</strong><p>ideal für Widget-Raster</p></Card>
          </ResponsiveGrid>
        )}

        {tab === 'stack' && (
          <Stack gap={10}>
            <Card>Stack — vertikal, gleichmäßiger Abstand</Card>
            <Card>Element 2</Card>
            <Card>Element 3</Card>
          </Stack>
        )}

        {tab === 'row' && (
          <Row gap={10}>
            <Card style={{ flex: 1 }}>Row — horizontal</Card>
            <Card style={{ flex: 1 }}>mit Umbruch</Card>
            <Card style={{ flex: 1 }}>und Abstand</Card>
          </Row>
        )}
      </Section>

      <Section title="Tabs · Mini-App (live)">
        <p className="rd-dd-lead">
          Eine eigenständige Mini-App aus <code>Tabs</code> + Komponenten-State:
        </p>
        <MiniApp />
      </Section>

      <Section title="PageShell · useHashRoute · RoutedPageShell">
        <Card>
          <p className="rd-dd-lead" style={{ marginTop: 0 }}>
            Dieses ganze Dashboard ist eine <code>PageShell</code> mit <code>Tabs</code> und{' '}
            <code>useHashRoute</code> — Deep-Links wie <code>#/home</code>, <code>#/charts</code>.
            <code> RoutedPageShell</code> fasst alle drei zu einer Zeile zusammen:
          </p>
          <pre className="rd-dd-code">{`import { RoutedPageShell } from '@ha/layout';

export default function Dashboard() {
  return (
    <RoutedPageShell
      defaultRoute="home"
      tabs={[
        { id: 'home',   label: 'Home',   icon: '🏠' },
        { id: 'energy', label: 'Energie', icon: '⚡' },
      ]}
      pages={{ home: <HomePage />, energy: <EnergyPage /> }}
    />
  );
}`}</pre>
        </Card>
      </Section>
    </>
  );
}
