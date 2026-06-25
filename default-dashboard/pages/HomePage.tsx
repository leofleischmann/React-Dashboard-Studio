import { useMemo, type ReactNode } from 'react';
import {
  callServiceWithTarget,
  getAppHass,
  useAreas,
  useCalendarEvents,
  useDarkMode,
  useEntities,
  useEntityHistory,
  useEntityHistoryPending,
  useEntityStatistics,
  useHassReady,
  useTheme,
  type HassEntity,
} from '@ha';
import {
  entityDisplayName,
  greeting,
  num,
  relativeTime,
  stateLabel,
  weatherIcon,
} from '@ha/format';
import { LightTile, SparkChart, SunArc, LiveClock, ValueOrb3D } from '@ha/ui';
import type { ExampleTab } from '../types';
import { homeContext } from '../lib/pickers';

/* ── small presentational helpers ──────────────────────────────────────── */

function Panel({
  title,
  icon,
  action,
  span,
  children,
}: {
  title: string;
  icon: string;
  action?: ReactNode;
  span?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`rd-panel rd-glass rd-rise ${span ? 'rd-panel--span' : ''}`}>
      <header className="rd-panel__head">
        <h3>
          <span className="rd-panel__icon" aria-hidden>{icon}</span>
          {title}
        </h3>
        {action}
      </header>
      <div className="rd-panel__body">{children}</div>
    </section>
  );
}

function Kpi({
  icon,
  label,
  value,
  unit,
  sub,
  tone,
  onClick,
}: {
  icon: string;
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  tone: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`rd-kpi rd-glass rd-rise tone-${tone}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <span className="rd-kpi__icon" aria-hidden>{icon}</span>
      <span className="rd-kpi__value">
        {value}
        {unit && <small>{unit}</small>}
      </span>
      <span className="rd-kpi__label">{label}</span>
      {sub && <span className="rd-kpi__sub">{sub}</span>}
    </button>
  );
}

/** Radial temperature ring — current temp in the centre, target as the arc. */
function ClimateRing({ climate }: { climate: HassEntity }) {
  const current = Number.parseFloat(String(climate.attributes.current_temperature ?? climate.state));
  const target = Number.parseFloat(String(climate.attributes.temperature ?? current));
  const min = Number(climate.attributes.min_temp ?? 7);
  const max = Number(climate.attributes.max_temp ?? 30);
  const frac = Math.min(1, Math.max(0, ((target - min) / (max - min)) || 0));
  const R = 52;
  const C = 2 * Math.PI * R;
  const action = String(climate.attributes.hvac_action ?? climate.state);
  const heating = action.includes('heat');
  const cooling = action.includes('cool');

  return (
    <div className="rd-ring">
      <svg viewBox="0 0 140 140" className="rd-ring__svg" aria-hidden>
        <circle cx="70" cy="70" r={R} className="rd-ring__track" />
        <circle
          cx="70"
          cy="70"
          r={R}
          className={`rd-ring__value ${heating ? 'is-heat' : cooling ? 'is-cool' : ''}`}
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
          transform="rotate(-90 70 70)"
        />
      </svg>
      <div className="rd-ring__center">
        <strong>{Number.isFinite(current) ? current.toFixed(1) : '–'}<small>°</small></strong>
        <span>{Number.isFinite(target) ? `Ziel ${target.toFixed(1)}°` : ''}</span>
      </div>
      <span className={`rd-ring__badge ${heating ? 'is-heat' : cooling ? 'is-cool' : ''}`}>
        {heating ? '🔥 Heizt' : cooling ? '❄️ Kühlt' : stateLabel(climate.state, 'climate')}
      </span>
    </div>
  );
}

function pickPrimaryPower(power: HassEntity[]): HassEntity | undefined {
  return (
    power.find((e) => /verbrauch|consum|haus|grid|total/i.test(e.entity_id)) ?? power[0]
  );
}

/* ── page ──────────────────────────────────────────────────────────────── */

export function HomePage({ onNavigate }: { onNavigate: (p: ExampleTab) => void }) {
  const ready = useHassReady();
  const dark = useDarkMode();
  const theme = useTheme();
  const entities = useEntities();
  const areas = useAreas();
  const ctx = useMemo(() => homeContext(entities), [entities]);

  const userName = getAppHass()?.user?.name;
  const primaryPower = pickPrimaryPower(ctx.power);
  const powerIds = useMemo(
    () => (primaryPower ? [primaryPower.entity_id] : []),
    [primaryPower],
  );
  const history = useEntityHistory(powerIds, { hours: 24 });
  const historyLoading = useEntityHistoryPending(powerIds, { hours: 24 });
  const statsMap = useEntityStatistics(powerIds, { days: 7 });
  const powerStats = primaryPower ? statsMap[primaryPower.entity_id] : undefined;

  const calendarId = ctx.calendars[0]?.entity_id ?? '';
  const events = useCalendarEvents(calendarId, 10);

  const allLightIds = ctx.lights.map((l) => l.entity_id);
  const quickLights = ctx.lights.slice(0, 4);
  const lowBatteries = ctx.battery.slice(0, 4);

  return (
    <div className="rd-home">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <header className="rd-hero rd-glass">
        <div className="rd-hero__aurora" aria-hidden />
        <div className="rd-hero__grid">
          <div className="rd-hero__left">
            <p className="rd-hero__eyebrow">
              <span className="rd-live-dot" /> Live · Home Assistant Dashboard Studio
            </p>
            <h1 className="rd-hero__greeting">
              {greeting()}
              {userName ? `, ${userName}` : ''} <span className="rd-hero__wave">👋</span>
            </h1>
            <p className="rd-hero__tagline">
              Dein Zuhause, in Echtzeit aus <strong>{entities.length}</strong> Entities
              gerendert. Jede Kachel hier ist React-Code aus dem SDK — kopierbar,
              anpassbar, deins.
            </p>
            <div className="rd-hero__chips">
              <span className="rd-chip">
                <i className="rd-chip__dot" style={{ background: ready ? 'var(--rd-ok)' : 'var(--rd-warn)' }} />
                {ready ? 'Verbunden' : 'Verbinde…'}
              </span>
              <span className="rd-chip">{dark ? '🌙 Dark' : '☀️ Light'}</span>
              <span className="rd-chip">
                <i className="rd-chip__swatch" style={{ background: theme.primary }} />
                Theme-Akzent
              </span>
              <span className="rd-chip">🗂 {areas.length} Räume</span>
            </div>
          </div>
          <div className="rd-hero__right">
            <LiveClock />
            <SunArc />
          </div>
        </div>
      </header>

      {/* ── KPI ROW ──────────────────────────────────────────── */}
      <div className="rd-kpis">
        <Kpi
          icon="💡"
          tone="amber"
          label="Lichter an"
          value={ctx.lightsOn}
          sub={`von ${ctx.lights.length}`}
          onClick={() => onNavigate('widgets')}
        />
        <Kpi
          icon="🏠"
          tone="green"
          label="Daheim"
          value={ctx.personsHome}
          sub={`${ctx.persons.length} Personen`}
        />
        {primaryPower && (
          <Kpi
            icon="⚡"
            tone="blue"
            label="Verbrauch"
            value={num(primaryPower.state, 0)}
            unit="W"
            sub={entityDisplayName(primaryPower, primaryPower.entity_id)}
            onClick={() => onNavigate('charts')}
          />
        )}
        {ctx.weather && (
          <Kpi
            icon={weatherIcon(ctx.weather.state)}
            tone="sky"
            label="Wetter"
            value={num(ctx.weather.attributes.temperature as number)}
            unit="°"
            sub={stateLabel(ctx.weather.state)}
          />
        )}
        {ctx.climate && (
          <Kpi
            icon="🌡️"
            tone="red"
            label="Klima"
            value={num(ctx.climate.attributes.current_temperature as number)}
            unit="°"
            sub={entityDisplayName(ctx.climate, ctx.climate.entity_id)}
          />
        )}
        <Kpi
          icon="🧩"
          tone="violet"
          label="Entities"
          value={entities.length}
          sub={`${areas.length} Areas`}
          onClick={() => onNavigate('hooks')}
        />
      </div>

      {primaryPower && (
        <Panel title="Wert-Orb" icon="⚡" span>
          <ValueOrb3D entityId={primaryPower.entity_id} min={0} max={4500} />
        </Panel>
      )}

      {/* ── MAIN GRID ────────────────────────────────────────── */}
      <div className="rd-home__grid">
        {/* Scenes & quick controls */}
        {(ctx.scenes.length > 0 || ctx.lights.length > 0) && (
          <Panel
            title="Schnellzugriff"
            icon="✨"
            span
            action={
              allLightIds.length > 0 ? (
                <button
                  type="button"
                  className="rd-panel__action"
                  onClick={() =>
                    callServiceWithTarget('light', 'turn_off', {}, { entity_id: allLightIds })
                  }
                >
                  Alle Lichter aus
                </button>
              ) : undefined
            }
          >
            {ctx.scenes.length > 0 && (
              <div className="rd-scenes">
                {ctx.scenes.slice(0, 4).map((s, i) => (
                  <button
                    key={s.entity_id}
                    type="button"
                    className={`rd-scene tone-${['violet', 'amber', 'sky', 'green'][i % 4]}`}
                    onClick={() => callServiceWithTarget('scene', 'turn_on', {}, { entity_id: s.entity_id })}
                  >
                    <span className="rd-scene__glow" aria-hidden />
                    <span className="rd-scene__icon">🎬</span>
                    <span className="rd-scene__name">{entityDisplayName(s, s.entity_id)}</span>
                  </button>
                ))}
              </div>
            )}
            {quickLights.length > 0 && (
              <div className="rd-quick-lights">
                {quickLights.map((l) => (
                  <LightTile key={l.entity_id} entityId={l.entity_id} />
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* Energy */}
        {primaryPower && (
          <Panel title="Energie" icon="⚡" action={<button type="button" className="rd-panel__action" onClick={() => onNavigate('charts')}>Charts →</button>}>
            <div className="rd-energy">
              <div className="rd-energy__now">
                <strong>{num(primaryPower.state, 0)}<small> W</small></strong>
                <span>{entityDisplayName(primaryPower, primaryPower.entity_id)} · jetzt</span>
              </div>
              <SparkChart
                height={110}
                showLegend={false}
                loading={historyLoading}
                series={[{ label: 'Verbrauch', color: theme.primary, points: history[primaryPower.entity_id] ?? [] }]}
                axes={{ xLabel: 'Zeit', yLabel: 'W' }}
              />
              {powerStats && (
                <div className="rd-energy__stats">
                  <span><small>Ø 7 T</small>{num(powerStats.mean, 0)} W</span>
                  <span><small>Min</small>{num(powerStats.min, 0)} W</span>
                  <span><small>Max</small>{num(powerStats.max, 0)} W</span>
                </div>
              )}
            </div>
            {ctx.power.length > 1 && (
              <div className="rd-energy__more">
                {ctx.power.slice(0, 3).map((p) => (
                  <div key={p.entity_id} className="rd-energy__chip">
                    <span>{entityDisplayName(p, p.entity_id)}</span>
                    <strong>{num(p.state, 0)} W</strong>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* Climate */}
        {ctx.climate && (
          <Panel title="Klima" icon="🌡️">
            <ClimateRing climate={ctx.climate} />
            {ctx.climates.length > 1 && (
              <div className="rd-climate-strip">
                {ctx.climates.slice(0, 3).map((c) => (
                  <div key={c.entity_id} className="rd-climate-strip__item">
                    <span>{entityDisplayName(c, c.entity_id)}</span>
                    <strong>{num(c.attributes.current_temperature as number)}°</strong>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* Presence */}
        {ctx.persons.length > 0 && (
          <Panel title="Anwesenheit" icon="🧍">
            <div className="rd-presence">
              {ctx.persons.slice(0, 5).map((p) => {
                const home = p.state === 'home' || p.state === 'on';
                return (
                  <div key={p.entity_id} className={`rd-presence__row ${home ? 'is-home' : ''}`}>
                    <span className="rd-presence__avatar">{home ? '🟢' : '⚪'}</span>
                    <span className="rd-presence__name">{entityDisplayName(p, p.entity_id)}</span>
                    <span className="rd-presence__state">{home ? 'Zuhause' : stateLabel(p.state, 'person')}</span>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        {/* Security */}
        {(ctx.locks.length > 0 || ctx.motion.length > 0) && (
          <Panel title="Sicherheit" icon="🛡️">
            <div className="rd-secure">
              {ctx.locks.slice(0, 3).map((l) => {
                const locked = l.state === 'locked';
                return (
                  <div key={l.entity_id} className={`rd-secure__row ${locked ? 'is-ok' : 'is-warn'}`}>
                    <span>{locked ? '🔒' : '🔓'}</span>
                    <span className="rd-secure__name">{entityDisplayName(l, l.entity_id)}</span>
                    <strong>{stateLabel(l.state, 'lock')}</strong>
                  </div>
                );
              })}
              {ctx.motion.slice(0, 2).map((m) => {
                const active = m.state === 'on';
                return (
                  <div key={m.entity_id} className={`rd-secure__row ${active ? 'is-active' : ''}`}>
                    <span>{active ? '🚶' : '🟢'}</span>
                    <span className="rd-secure__name">{entityDisplayName(m, m.entity_id)}</span>
                    <strong>{active ? 'Bewegung' : 'Ruhig'}</strong>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        {/* Agenda */}
        {calendarId && (
          <Panel title="Agenda" icon="📅">
            {events.length === 0 ? (
              <p className="rd-empty">Keine anstehenden Termine.</p>
            ) : (
              <ul className="rd-agenda">
                {events.slice(0, 4).map((ev) => (
                  <li key={ev.summary + ev.start.toISOString()}>
                    <span className="rd-agenda__date">
                      {ev.start.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                    </span>
                    <span className="rd-agenda__sum">{ev.summary}</span>
                    <small>{relativeTime(ev.start)}</small>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {/* Battery watch */}
        {lowBatteries.length > 0 && (
          <Panel title="Batterien" icon="🔋">
            <div className="rd-batteries">
              {lowBatteries.map((b) => {
                const v = Number.parseFloat(b.state);
                const tone = v <= 15 ? 'is-low' : v <= 35 ? 'is-mid' : 'is-ok';
                return (
                  <div key={b.entity_id} className="rd-batteries__row">
                    <span className="rd-batteries__name">{entityDisplayName(b, b.entity_id)}</span>
                    <div className="rd-batteries__track">
                      <div className={`rd-batteries__fill ${tone}`} style={{ width: `${Math.max(4, v)}%` }} />
                    </div>
                    <strong>{num(b.state, 0)}%</strong>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}
      </div>

      {/* ── REVEAL ───────────────────────────────────────────── */}
      <section className="rd-reveal rd-glass">
        <div className="rd-reveal__text">
          <h2>Alles, was du hier siehst, ist Code.</h2>
          <p>
            Kein YAML, keine Karten-Konfiguration — echtes React. Vier Module,
            volle Freiheit. Tippe dich durch den Showcase:
          </p>
        </div>
        <div className="rd-reveal__mods">
          {([
            ['@ha', 'Reaktive Hooks & Services', 'hooks'],
            ['@ha/ui', '30+ Live-Widgets', 'widgets'],
            ['@ha/layout', 'Seiten, Tabs, Grids', 'layout'],
            ['@ha/format', 'Werte & Zustände', 'format'],
          ] as const).map(([mod, desc, page]) => (
            <button key={mod} type="button" className="rd-reveal__mod" onClick={() => onNavigate(page)}>
              <code>{mod}</code>
              <span>{desc}</span>
              <em>→</em>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
