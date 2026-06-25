import { Section } from '@ha/ui';
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
