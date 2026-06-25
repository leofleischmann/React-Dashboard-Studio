import { Card, Section } from '@ha/ui';
import {
  ResponsiveGrid,
  Row,
  Stack,
  Tabs,
  useHashRoute,
  type TabItem,
} from '@ha/layout';

type LayoutTab = 'grid' | 'stack' | 'row' | 'shell';

const LAYOUT_TABS: TabItem<LayoutTab>[] = [
  { id: 'grid', label: 'Grid', icon: '▦' },
  { id: 'stack', label: 'Stack', icon: '☰' },
  { id: 'row', label: 'Row', icon: '↔' },
  { id: 'shell', label: 'Shell', icon: '📱' },
];

export function LayoutDemo() {
  const [tab, setTab] = useHashRoute<LayoutTab>('grid', ['grid', 'stack', 'row', 'shell']);

  return (
    <div className="rd-sdk-layout">
      <header className="rd-sdk-showcase__page-head">
        <h2>Layout (@ha/layout)</h2>
        <p>
          ResponsiveGrid, Stack, Row, PageShell, Tabs, useHashRoute und RoutedPageShell —
          baue Multi-Page-Dashboards wie diese Referenz.
        </p>
      </header>

      <Section title="Layout-Komponenten">
        <Tabs tabs={LAYOUT_TABS} value={tab} onChange={setTab} ariaLabel="Layout Demo" />

        {tab === 'grid' && (
          <ResponsiveGrid min={140}>
            <Card><strong>ResponsiveGrid</strong><p>auto-fill Spalten, min-Breite konfigurierbar</p></Card>
            <Card><strong>Card</strong><p>Basis-Karte aus @ha/ui</p></Card>
            <Card><strong>Card</strong><p>passt sich der Viewport-Breite an</p></Card>
            <Card><strong>Card</strong><p>ideal für Widget-Raster</p></Card>
          </ResponsiveGrid>
        )}

        {tab === 'stack' && (
          <Stack gap={10}>
            <Card>Stack — vertikal, gleichmäßiger gap</Card>
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

        {tab === 'shell' && (
          <Card>
            <strong>RoutedPageShell</strong>
            <p className="rd-sdk-ref__lead">
              Kombiniert PageShell + Tabs + useHashRoute in einer Komponente:
            </p>
            <pre className="rd-sdk-code">{`import { RoutedPageShell } from '@ha/layout';

<RoutedPageShell
  tabs={[
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'energy', label: 'Energie', icon: '⚡' },
  ]}
  defaultRoute="home"
  pages={{
    home: <HomePage />,
    energy: <EnergyPage />,
  }}
/>`}</pre>
            <p className="rd-sdk-ref__lead" style={{ marginBottom: 0 }}>
              Dieses Showcase nutzt dieselben Bausteine manuell in <code>dashboard.tsx</code> —
              Hash-Routing für Deep-Links (<code>#overview</code>, <code>#widgets</code>, …).
            </p>
          </Card>
        )}
      </Section>
    </div>
  );
}
