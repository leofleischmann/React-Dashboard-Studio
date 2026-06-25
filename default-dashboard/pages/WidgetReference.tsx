import { useState } from 'react';
import { Section, WidgetCatalogGrid, ErrorBoundary } from '@ha/ui';
import { PageHead } from '../components/PageHead';

function BrokenWidgetDemo({ armed }: { armed: boolean }) {
  if (armed) throw new Error('Demo: absichtlicher Render-Fehler');
  return (
    <p className="rd-dd-lead" style={{ margin: 0 }}>
      Widget läuft normal — klicke „Fehler auslösen“, um die Fehlerkachel zu sehen.
    </p>
  );
}

function ErrorBoundaryDemo() {
  const [armed, setArmed] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  return (
    <div className="rd-error-boundary-demo">
      <div className="rd-row" style={{ marginBottom: 12 }}>
        <button type="button" className="rd-action-btn" onClick={() => setArmed(true)}>
          Fehler auslösen
        </button>
        <button
          type="button"
          className="rd-action-btn"
          onClick={() => {
            setArmed(false);
            setResetKey((k) => k + 1);
          }}
        >
          Zurücksetzen
        </button>
      </div>
      <ErrorBoundary key={resetKey}>
        <BrokenWidgetDemo armed={armed} />
      </ErrorBoundary>
    </div>
  );
}

export function WidgetReference() {
  return (
    <>
      <PageHead icon="🧩" module="@ha/ui" title="Widget-Galerie">
        Domain-, Featured- und Composite-Widgets — live mit Entities deiner Installation.
        Im Studio unter <strong>⚡ Entities → Galerie</strong> zum Kopieren.
      </PageHead>

      <Section title="Domain-Widgets">
        <p className="rd-dd-lead">
          Eine Entity, ein Widget — z. B. Licht, Klima, Sensor.
        </p>
        <WidgetCatalogGrid categories={['domain']} />
      </Section>

      <Section title="Featured-Widgets">
        <p className="rd-dd-lead">
          Eigene Visualisierungen — z. B. Sonnenbogen mit SVG und Hooks.
        </p>
        <WidgetCatalogGrid categories={['featured']} />
      </Section>

      <Section title="Composite-Widgets">
        <p className="rd-dd-lead">
          Mehrere Entities oder Layout-Bausteine — RoomCard, DeviceCard, Grid.
        </p>
        <WidgetCatalogGrid categories={['composite']} />
      </Section>

      <Section title="ErrorBoundary">
        <p className="rd-dd-lead">
          Ein kaputtes Widget sprengt nicht das ganze Dashboard — Fehler bleiben in der
          Kachel eingegrenzt.
        </p>
        <ErrorBoundaryDemo />
      </Section>
    </>
  );
}
