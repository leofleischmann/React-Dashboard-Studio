import { Section, WidgetCatalogGrid } from '@ha/ui';
import { PageHead } from '../components/PageHead';

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
    </>
  );
}
