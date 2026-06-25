import { Section, WidgetCatalogGrid } from '@ha/ui';

export function WidgetReference() {
  return (
    <Section title="Widget-Galerie · Live mit deinen Entities">
      <p className="rd-sdk-ref__lead">
        Jede Karte zeigt das Widget mit der ersten passenden Entity deiner Installation.
      </p>
      <WidgetCatalogGrid />
    </Section>
  );
}
