import {
  useDashboardScope,
  useDashboardState,
  usePersistentState,
} from '@ha';
import { HookDemoCard } from './HookDemoCard';
import { ResponsiveGrid } from '@ha/layout';
import { Section } from '@ha/ui';

const DEMO_ROOMS = ['wohnzimmer', 'küche', 'schlafzimmer'] as const;

function SharedRoomWriter() {
  const [room, setRoom] = useDashboardState('hooks-demo-room', 'wohnzimmer');

  return (
    <HookDemoCard module="@ha" name="useDashboardState(key)" hint="Raum setzen (Widget A)">
      <div className="rd-dd-btn-row">
        {DEMO_ROOMS.map((id) => (
          <button
            key={id}
            type="button"
            className={`rd-demo-btn ${room === id ? 'is-active' : ''}`}
            onClick={() => setRoom(id)}
          >
            {id}
          </button>
        ))}
      </div>
    </HookDemoCard>
  );
}

function SharedRoomReader() {
  const [room] = useDashboardState('hooks-demo-room', 'wohnzimmer');

  return (
    <HookDemoCard module="@ha" name="useDashboardState(key)" hint="gleicher Key (Widget B)">
      <strong>Ausgewählt: {room}</strong>
      <small>Reagiert sofort auf Widget A — nur im Speicher</small>
    </HookDemoCard>
  );
}

function PersistentCounterDemo() {
  const [count, setCount] = usePersistentState('hooks-demo-count', 0);
  const scope = useDashboardScope();

  return (
    <>
      <HookDemoCard
        module="@ha"
        name="usePersistentState(key, initial)"
        hint="localStorage · überlebt Reload"
      >
        <button
          type="button"
          className="rd-demo-btn"
          onClick={() => setCount((c) => c + 1)}
        >
          Zähler: {count}
        </button>
        <small>Seite neu laden — Wert bleibt (pro HA-User)</small>
      </HookDemoCard>

      <HookDemoCard module="@ha" name="useDashboardScope()" hint="localStorage-Namespace">
        <strong>{scope}</strong>
        <small>Scope für persistente Keys</small>
      </HookDemoCard>
    </>
  );
}

export function DashboardStateSection() {
  return (
    <Section title="Dashboard-State & Persistenz">
      <ResponsiveGrid min={270}>
        <SharedRoomWriter />
        <SharedRoomReader />
        <PersistentCounterDemo />
      </ResponsiveGrid>
      <p className="rd-dd-lead" style={{ marginTop: 14 }}>
        <code>DashboardProvider</code> umschließt das Dashboard automatisch in der
        Vorschau. Persistente Keys:{' '}
        <code>homeassistant_dashboard_studio:state:&lt;scope&gt;:&lt;key&gt;</code>
      </p>
    </Section>
  );
}
