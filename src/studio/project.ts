// A "project" is your virtual filesystem: many files, one entry point.
export interface Project {
  files: Record<string, string>;
  entry: string;
}

// ── Virtual path helpers (posix-style, no leading slash) ─────────────────────
export function dirname(path: string): string {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i);
}

export function joinPath(base: string, rel: string): string {
  const parts = base ? base.split('/') : [];
  for (const seg of rel.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

// ── Default project ──────────────────────────────────────────────────────────
// A polished, *self-configuring* showcase: every section auto-discovers your
// entities (lights, sensors, persons, scenes …), so a fresh install instantly
// shows a beautiful, working dashboard — and demonstrates the modular,
// multi-file structure (each section lives in its own file).

const DASHBOARD_TSX = `import { Header } from './components/Header';
import { Summary } from './components/Summary';
import { Lights } from './components/Lights';
import { Sensors } from './components/Sensors';
import { QuickActions } from './components/QuickActions';

// 👋 Willkommen im React Dashboard Studio!
// Dieses Start-Dashboard erkennt deine Geräte AUTOMATISCH – es zeigt also
// sofort etwas Sinnvolles, egal welche Entities du in Home Assistant hast.
//
// Jede Sektion ist eine eigene Datei (links im Datei-Panel) – so siehst du,
// wie eine modulare Codebasis aussieht. Klick auf "✎ Bearbeiten" und leg los.
export default function Dashboard() {
  return (
    <div className="rd-root rd-home">
      <Header />
      <Summary />
      <Lights />
      <div className="rd-home__split">
        <Sensors />
        <QuickActions />
      </div>
    </div>
  );
}
`;

const HEADER_TSX = `import { useEffect, useState } from 'react';
import { useEntitiesByDomain } from '@ha';
import { greeting, weatherIcon, num } from '@ha/format';

// Kopfbereich mit lebender Uhr, Begrüßung und – falls vorhanden – dem Wetter.
export function Header() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Erste 'weather.*'-Entity automatisch verwenden.
  const weather = useEntitiesByDomain('weather')[0];

  const time = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <header className="rd-hero">
      <div className="rd-hero__left">
        <p className="rd-hero__clock">{time}</p>
        <p className="rd-hero__greet">{greeting(now)} 👋</p>
        <p className="rd-hero__date">{date}</p>
      </div>

      {weather && (
        <div className="rd-hero__weather">
          <span className="rd-hero__wicon">{weatherIcon(weather.state)}</span>
          <span className="rd-hero__wtemp">{num(weather.attributes.temperature)}°</span>
          <span className="rd-hero__wsub">
            {weather.attributes.friendly_name || 'Wetter'}
          </span>
        </div>
      )}
    </header>
  );
}
`;

const SUMMARY_TSX = `import { useEntitiesByDomain } from '@ha';
import { stateNumber } from '@ha/format';

// Auto-Überblick: zählt deine Entities und zeigt die wichtigsten Kennzahlen.
export function Summary() {
  const lights = useEntitiesByDomain('light');
  const persons = useEntitiesByDomain('person');
  const switches = useEntitiesByDomain('switch');
  const sensors = useEntitiesByDomain('sensor');

  const lightsOn = lights.filter((l) => l.state === 'on').length;
  const peopleHome = persons.filter((p) => p.state === 'home').length;
  const switchesOn = switches.filter((s) => s.state === 'on').length;

  // Durchschnitt aller Temperatur-Sensoren.
  const temps = sensors
    .filter((s) => s.attributes.device_class === 'temperature')
    .map(stateNumber)
    .filter((n) => n !== undefined);
  const avgTemp = temps.length
    ? Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10
    : undefined;

  const chips = [
    { icon: '💡', value: lightsOn, sub: '/ ' + lights.length, label: 'Lichter an' },
    {
      icon: '🌡️',
      value: avgTemp === undefined ? '–' : avgTemp,
      sub: avgTemp === undefined ? '' : '°C',
      label: 'Ø Temperatur',
    },
    {
      icon: '🏠',
      value: peopleHome,
      sub: persons.length ? '/ ' + persons.length : '',
      label: 'zuhause',
    },
    {
      icon: '🔌',
      value: switchesOn,
      sub: switches.length ? '/ ' + switches.length : '',
      label: 'Schalter an',
    },
  ];

  return (
    <div className="rd-chips">
      {chips.map((c) => (
        <div className="rd-chip" key={c.label}>
          <span className="rd-chip__icon">{c.icon}</span>
          <span className="rd-chip__value">
            {c.value} {c.sub && <small>{c.sub}</small>}
          </span>
          <span className="rd-chip__label">{c.label}</span>
        </div>
      ))}
    </div>
  );
}
`;

const LIGHTS_TSX = `import { useEntitiesByDomain } from '@ha';
import { Section, LightTile } from '@ha/ui';

// Alle Lichter automatisch als antippbare Kacheln (leuchten, wenn an).
export function Lights() {
  const lights = useEntitiesByDomain('light');

  if (lights.length === 0) {
    return (
      <Section title="Lichter">
        <div className="rd-empty">Keine 'light.*'-Entities gefunden.</div>
      </Section>
    );
  }

  return (
    <Section title={'Lichter · ' + lights.length}>
      <div className="rd-tiles">
        {lights.slice(0, 12).map((light) => (
          <LightTile key={light.entity_id} entityId={light.entity_id} />
        ))}
      </div>
    </Section>
  );
}
`;

const SENSORS_TSX = `import { useEntitiesByDomain } from '@ha';
import { Section, Stat } from '@ha/ui';
import { num } from '@ha/format';

// Temperatur- und Feuchtesensoren automatisch als Kennzahl-Kacheln.
export function Sensors() {
  const sensors = useEntitiesByDomain('sensor');
  const climate = sensors.filter(
    (s) =>
      s.attributes.device_class === 'temperature' ||
      s.attributes.device_class === 'humidity',
  );

  if (climate.length === 0) {
    return (
      <Section title="Klima">
        <div className="rd-empty">Keine Temperatur-/Feuchtesensoren gefunden.</div>
      </Section>
    );
  }

  return (
    <Section title="Klima">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 12,
        }}
      >
        {climate.slice(0, 8).map((s) => (
          <Stat
            key={s.entity_id}
            label={s.attributes.friendly_name || s.entity_id}
            value={num(s.state)}
            unit={s.attributes.unit_of_measurement}
          />
        ))}
      </div>
    </Section>
  );
}
`;

const QUICK_ACTIONS_TSX = `import { useEntitiesByDomain, callService } from '@ha';
import { Section } from '@ha/ui';

// Schnellzugriff: aktiviert Szenen und schaltet Schalter mit einem Klick.
export function QuickActions() {
  const scenes = useEntitiesByDomain('scene');
  const switches = useEntitiesByDomain('switch');

  const actions = [
    ...scenes.slice(0, 4).map((s) => ({
      id: s.entity_id,
      name: s.attributes.friendly_name || s.entity_id,
      on: false,
      run: () => callService('scene', 'turn_on', { entity_id: s.entity_id }),
    })),
    ...switches.slice(0, 6).map((s) => ({
      id: s.entity_id,
      name: s.attributes.friendly_name || s.entity_id,
      on: s.state === 'on',
      run: () => callService('switch', 'toggle', { entity_id: s.entity_id }),
    })),
  ];

  if (actions.length === 0) {
    return (
      <Section title="Schnellzugriff">
        <div className="rd-empty">Keine Szenen oder Schalter gefunden.</div>
      </Section>
    );
  }

  return (
    <Section title="Schnellzugriff">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {actions.map((a) => (
          <button
            key={a.id}
            className={'rd-pill ' + (a.on ? 'is-on' : '')}
            onClick={a.run}
          >
            {a.name}
          </button>
        ))}
      </div>
    </Section>
  );
}
`;

export const DEFAULT_PROJECT: Project = {
  entry: 'dashboard.tsx',
  files: {
    'dashboard.tsx': DASHBOARD_TSX,
    'components/Header.tsx': HEADER_TSX,
    'components/Summary.tsx': SUMMARY_TSX,
    'components/Lights.tsx': LIGHTS_TSX,
    'components/Sensors.tsx': SENSORS_TSX,
    'components/QuickActions.tsx': QUICK_ACTIONS_TSX,
  },
};

/** Starter content when you add a brand-new file. */
export function newFileTemplate(path: string): string {
  const base = path.split('/').pop()!.replace(/\.(tsx?|jsx?)$/, '');
  const name = base.charAt(0).toUpperCase() + base.slice(1).replace(/[^a-zA-Z0-9]/g, '');
  return `export function ${name || 'Component'}() {
  return <div>${name}</div>;
}
`;
}
