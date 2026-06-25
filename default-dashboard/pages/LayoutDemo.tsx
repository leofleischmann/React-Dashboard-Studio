import { Card, Section } from '@ha/ui';
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
