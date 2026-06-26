import { useEffect, useMemo, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import {
  callServiceWithTarget,
  getAppHass,
  useAreas,
  useDarkMode,
  useEntities,
  useEntityHistory,
  useEntityHistoryPending,
  useEntityStatistics,
  useEnergy,
  useHassReady,
  useSun,
  useTheme,
  useTime,
  type HassEntity,
} from '@ha';
import {
  energy,
  entityDisplayName,
  greeting,
  num,
  relativeTime,
  stateLabel,
  weatherIcon,
} from '@ha/format';
import { db } from '@ha/debug';
import {
  LightTile,
  MediaPlayerCard,
  Minitimeline,
  SparkChart,
  SunArc,
  ValueOrb3D,
  WeatherNow,
} from '@ha/ui';
import type { ExampleTab } from '../types';
import { homeContext, energySensor } from '../lib/pickers';
import { AtmosphereCanvas, type AtmoMode } from '../components/AtmosphereCanvas';
import { RoomCard } from '../components/RoomCard';

/* ── helpers ─────────────────────────────────────────────────────────────── */

const ROOM_TONES = ['#a78bfa', '#38bdf8', '#22c55e', '#f59e0b', '#fb7185', '#2dd4bf', '#f472b6', '#60a5fa'];

function weatherToMode(condition: string | undefined): AtmoMode {
  const c = (condition ?? '').toLowerCase();
  if (/(rain|pour|drizzle|lightning)/.test(c)) return 'rain';
  if (/(snow|sleet|hail)/.test(c)) return 'snow';
  if (/(fog|mist|haze)/.test(c)) return 'fog';
  if (/(cloudy|overcast)/.test(c) && !c.includes('partly')) return 'clouds';
  return 'clear';
}

function pickPrimaryPower(power: HassEntity[]): HassEntity | undefined {
  return power.find((e) => /verbrauch|consum|haus|grid|total/i.test(e.entity_id)) ?? power[0];
}

function indoorTemp(entities: HassEntity[]): number | undefined {
  const t = entities.find(
    (e) =>
      e.entity_id.startsWith('sensor.') &&
      e.attributes.device_class === 'temperature' &&
      Number.isFinite(Number.parseFloat(e.state)),
  );
  return t ? Number.parseFloat(t.state) : undefined;
}

/* ── presentational pieces ───────────────────────────────────────────────── */

function Section({
  icon,
  eyebrow,
  title,
  aside,
}: {
  icon: string;
  eyebrow: string;
  title: string;
  aside?: ReactNode;
}) {
  return (
    <div className="rd-sec">
      <span className="rd-sec__bar" aria-hidden />
      <span className="rd-sec__icon" aria-hidden>{icon}</span>
      <div className="rd-sec__text">
        <span className="rd-sec__eyebrow">{eyebrow}</span>
        <h2 className="rd-sec__title">{title}</h2>
      </div>
      {aside !== undefined && <span className="rd-sec__aside">{aside}</span>}
    </div>
  );
}

function Panel({
  title,
  icon,
  action,
  span,
  tone = 'blue',
  children,
}: {
  title: string;
  icon: string;
  action?: ReactNode;
  span?: boolean;
  tone?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rd-panel rd-glass rd-rise tone-${tone} ${span ? 'rd-panel--span' : ''}`}>
      <div className="rd-panel__sheen" aria-hidden />
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

function Vital({
  icon,
  label,
  value,
  unit,
  tone,
  onClick,
}: {
  icon: string;
  label: string;
  value: string | number;
  unit?: string;
  tone: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" className={`rd-vital tone-${tone}`} onClick={onClick} disabled={!onClick}>
      <span className="rd-vital__icon" aria-hidden>{icon}</span>
      <span className="rd-vital__body">
        <span className="rd-vital__value">
          {value}
          {unit && <small>{unit}</small>}
        </span>
        <span className="rd-vital__label">{label}</span>
      </span>
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
      <span className="rd-ring__halo" aria-hidden />
      <svg viewBox="0 0 140 140" className="rd-ring__svg" aria-hidden>
        <defs>
          <linearGradient id="rd-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--rd-accent)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--rd-accent)" stopOpacity="1" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r={R} className="rd-ring__track" />
        <circle
          cx="70"
          cy="70"
          r={R}
          stroke="url(#rd-ring-grad)"
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

/* ── page ────────────────────────────────────────────────────────────────── */

export function HomePage({ onNavigate }: { onNavigate: (p: ExampleTab) => void }) {
  const ready = useHassReady();
  const dark = useDarkMode();
  const theme = useTheme();
  const entities = useEntities();
  const areas = useAreas();
  const sun = useSun();
  const now = useTime(30_000);
  const ctx = useMemo(() => homeContext(entities), [entities]);

  const userName = getAppHass()?.user?.name;
  const primaryPower = pickPrimaryPower(ctx.power);
  const powerIds = useMemo(() => (primaryPower ? [primaryPower.entity_id] : []), [primaryPower]);
  const history = useEntityHistory(powerIds, { hours: 24 });
  const historyLoading = useEntityHistoryPending(powerIds, { hours: 24 });
  const statsMap = useEntityStatistics(powerIds, { days: 7 });
  const powerStats = primaryPower ? statsMap[primaryPower.entity_id] : undefined;

  const energyId = useMemo(() => energySensor(entities)?.entity_id, [entities]);
  const todayEnergy = useEnergy(energyId ?? '', { period: 'today' });

  const allLightIds = ctx.lights.map((l) => l.entity_id);
  const quickLights = ctx.lights.slice(0, 6);
  const indoor = indoorTemp(entities);
  const weatherTemp = ctx.weather?.attributes.temperature as number | undefined;
  const weatherId = ctx.weather?.entity_id;
  const media = ctx.mediaPlaying && ctx.mediaPlaying.state !== 'off' && ctx.mediaPlaying.state !== 'unavailable'
    ? ctx.mediaPlaying
    : undefined;
  const lowBatteries = ctx.battery.slice(0, 4);
  const roomAreas = areas.slice(0, 8);

  // ── atmosphere inputs from live data ─────────────────────
  const hour = now.getHours() + now.getMinutes() / 60;
  const dayProgress = useMemo(() => {
    if (sun.isDay && sun.rising && sun.setting) {
      let rise = sun.rising.getTime();
      let set = sun.setting.getTime();
      const t = now.getTime();
      const DAY = 86_400_000;
      if (rise > t) rise -= DAY;
      if (set < t) set += DAY;
      if (set > rise) return Math.min(1, Math.max(0, (t - rise) / (set - rise)));
    }
    return undefined;
  }, [sun.isDay, sun.rising, sun.setting, now]);

  const powerVal = primaryPower ? Number.parseFloat(primaryPower.state) : 0;
  const energyMax = Math.max(2500, powerStats?.max ?? 0, powerVal * 1.3);
  const energy01 = Number.isFinite(powerVal) ? Math.min(1, Math.max(0, powerVal / energyMax)) : 0.25;

  const atmo = useMemo(
    () => ({
      hour,
      elevation: sun.elevation,
      dayProgress,
      mode: weatherToMode(ctx.weather?.state),
      energy: energy01,
      accent: theme.primary,
    }),
    [hour, sun.elevation, dayProgress, ctx.weather?.state, energy01, theme.primary],
  );

  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  const onHeroMove = (e: ReactPointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--rd-mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    e.currentTarget.style.setProperty('--rd-my', `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  const hasControl = ctx.scenes.length > 0 || ctx.lights.length > 0;
  const hasGuard = ctx.persons.length > 0 || ctx.locks.length > 0 || ctx.motion.length > 0 || lowBatteries.length > 0;

  useEffect(() => {
    if (!ready) {
      db.debug('HomePage', 'waiting for hass');
      return;
    }
    db.log('HomePage', 'snapshot', {
      entities: entities.length,
      areas: areas.length,
      lightsOn: ctx.lightsOn,
      lights: ctx.lights.length,
      personsHome: ctx.personsHome,
      power: primaryPower?.entity_id ?? null,
      weather: ctx.weather?.state ?? null,
    });
  }, [
    ready,
    entities.length,
    areas.length,
    ctx.lightsOn,
    ctx.lights.length,
    ctx.personsHome,
    primaryPower?.entity_id,
    ctx.weather?.state,
  ]);

  return (
    <div className={`rd-home ${dark ? 'is-dark' : 'is-light'}`}>
      <div className="rd-home__ambient" aria-hidden />

      {/* ── CINEMATIC HERO ───────────────────────────────────── */}
      <header className="rd-stage" onPointerMove={onHeroMove}>
        <AtmosphereCanvas inputs={atmo} />
        <div className="rd-stage__scrim" aria-hidden />
        <div className="rd-stage__spot" aria-hidden />

        <div className="rd-stage__content">
          <div className="rd-stage__top">
            <div className="rd-stage__intro">
              <p className="rd-stage__eyebrow">
                <span className="rd-live-dot" />
                LIVE · {entities.length} Entities · {areas.length} Räume
              </p>
              <h1 className="rd-stage__greeting">
                {greeting()}{userName ? `, ${userName}` : ''}
              </h1>
              <p className="rd-stage__sub">
                {ctx.weather ? (
                  <>
                    {weatherIcon(ctx.weather.state)} Draußen{' '}
                    <strong>{num(weatherTemp)}°</strong> · {stateLabel(ctx.weather.state)}
                  </>
                ) : (
                  <>Dein Zuhause, in Echtzeit gerendert.</>
                )}
                {indoor !== undefined && (
                  <> · 🏠 Drinnen <strong>{indoor.toFixed(1)}°</strong></>
                )}
              </p>
            </div>

            <div className="rd-stage__clock">
              <span className="rd-stage__time">{timeStr}</span>
              <span className="rd-stage__date">{dateStr}</span>
              <span className="rd-stage__conn">
                <i style={{ background: ready ? 'var(--rd-ok)' : 'var(--rd-warn)' }} />
                {ready ? 'Verbunden' : 'Verbinde…'} · {dark ? '🌙 Dark' : '☀️ Light'}
              </span>
            </div>
          </div>

          <div className="rd-stage__hud">
            <Vital icon="💡" tone="amber" label={`${ctx.lights.length} Lichter`} value={ctx.lightsOn} unit=" an" onClick={() => onNavigate('widgets')} />
            <Vital icon="🧍" tone="green" label={`${ctx.persons.length} Personen`} value={ctx.personsHome} unit=" daheim" />
            {primaryPower && (
              <Vital icon="⚡" tone="blue" label="Verbrauch" value={num(primaryPower.state, 0)} unit=" W" onClick={() => onNavigate('charts')} />
            )}
            {ctx.climate && (
              <Vital icon="🌡️" tone="red" label="Klima" value={num(ctx.climate.attributes.current_temperature as number)} unit="°" />
            )}
            <Vital icon="🧩" tone="violet" label="im SDK gerendert" value={entities.length} onClick={() => onNavigate('hooks')} />
          </div>
        </div>
      </header>

      {/* ── JETZT IM BLICK ───────────────────────────────────── */}
      {(ctx.weather || sun.entity) && (
        <>
          <Section icon="🌤️" eyebrow="Live" title="Jetzt im Blick" aside={timeStr} />
          <div className="rd-home__grid">
            {ctx.weather && weatherId && (
              <Panel title="Wetter" icon="🌦️" tone="sky" span>
                <WeatherNow entityId={weatherId} forecastDays={5} />
              </Panel>
            )}
            {sun.entity && (
              <Panel title="Sonne & Mond" icon="🌅" tone="amber">
                <SunArc />
              </Panel>
            )}
          </div>
        </>
      )}

      {/* ── RÄUME ────────────────────────────────────────────── */}
      {roomAreas.length > 0 && (
        <>
          <Section icon="🏠" eyebrow="Überblick" title="Räume" aside={`${areas.length} Bereiche`} />
          <div className="rd-rooms">
            {roomAreas.map((a, i) => (
              <RoomCard key={a.area_id} area={a} accent={ROOM_TONES[i % ROOM_TONES.length]} />
            ))}
          </div>
        </>
      )}

      {/* ── STEUERUNG ────────────────────────────────────────── */}
      {hasControl && (
        <>
          <Section icon="✨" eyebrow="Tippen & schalten" title="Steuerung" aside={`${ctx.lightsOn}/${ctx.lights.length} Lichter an`} />
          <Panel
            title="Schnellzugriff"
            icon="✨"
            span
            tone="violet"
            action={
              allLightIds.length > 0 ? (
                <button
                  type="button"
                  className="rd-panel__action"
                  onClick={() => callServiceWithTarget('light', 'turn_off', {}, { entity_id: allLightIds })}
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
                  <LightTile key={l.entity_id} entityId={l.entity_id} showBrightness />
                ))}
              </div>
            )}
          </Panel>
        </>
      )}

      {/* ── ENERGIE & KLIMA ──────────────────────────────────── */}
      {(primaryPower || ctx.climate) && (
        <>
          <Section
            icon="⚡"
            eyebrow="Verbrauch & Komfort"
            title="Energie & Klima"
            aside={primaryPower ? `${num(primaryPower.state, 0)} W jetzt` : undefined}
          />
          <div className="rd-home__grid">
            {primaryPower && (
              <Panel
                title="Energie"
                icon="⚡"
                span
                tone="blue"
                action={<button type="button" className="rd-panel__action" onClick={() => onNavigate('charts')}>Charts →</button>}
              >
                <div className="rd-energy__kpis">
                  <div className="rd-energy__kpi is-primary">
                    <span className="rd-live-dot" />
                    <strong>{num(primaryPower.state, 0)}<small>W</small></strong>
                    <span>jetzt</span>
                  </div>
                  {energyId && todayEnergy.kwh !== undefined && (
                    <div className="rd-energy__kpi">
                      <strong>{energy(todayEnergy.kwh)}</strong>
                      <span>heute</span>
                    </div>
                  )}
                  {powerStats && (
                    <>
                      <div className="rd-energy__kpi"><strong>{num(powerStats.mean, 0)}<small>W</small></strong><span>Ø 7 Tage</span></div>
                      <div className="rd-energy__kpi"><strong>{num(powerStats.max, 0)}<small>W</small></strong><span>Spitze</span></div>
                    </>
                  )}
                </div>
                <div className="rd-energy__layout">
                  <div className="rd-energy__orb">
                    <ValueOrb3D entityId={primaryPower.entity_id} min={0} max={Math.round(energyMax)} color="#3b82f6" />
                  </div>
                  <div className="rd-energy__main">
                    <SparkChart
                      height={84}
                      showLegend={false}
                      loading={historyLoading}
                      series={[{ label: 'Verbrauch', color: theme.primary, points: history[primaryPower.entity_id] ?? [] }]}
                      axes={{ xLabel: 'Zeit', yLabel: 'W' }}
                    />
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
                  </div>
                </div>
              </Panel>
            )}

            {ctx.climate && (
              <Panel title="Klima" icon="🌡️" tone="red">
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
          </div>
        </>
      )}

      {/* ── MEDIEN, PRÄSENZ & SICHERHEIT ─────────────────────── */}
      {(media || hasGuard) && (
        <>
          <Section icon="🛡️" eyebrow="Wer & was" title="Präsenz, Medien & Sicherheit" />
          <div className="rd-home__grid">
            {media && (
              <Panel title="Medien" icon="🎵" tone="violet">
                <MediaPlayerCard entityId={media.entity_id} />
              </Panel>
            )}

            {ctx.persons.length > 0 && (
              <Panel title="Anwesenheit" icon="🧍" tone="green">
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

            {(ctx.locks.length > 0 || ctx.motion.length > 0 || lowBatteries.length > 0) && (
              <Panel title="Sicherheit & Geräte" icon="🛡️" tone="sky">
                {(ctx.locks.length > 0 || ctx.motion.length > 0) && (
                  <div className="rd-secure">
                    {ctx.locks.slice(0, 2).map((l) => {
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
                )}
                {lowBatteries.length > 0 && (
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
                )}
              </Panel>
            )}
          </div>
        </>
      )}

      {/* ── AKTIVITÄT ────────────────────────────────────────── */}
      <Section icon="📜" eyebrow="Was gerade passiert" title="Aktivität" aside="Live-Logbuch" />
      <Panel title="Letzte Ereignisse" icon="📜" span tone="green">
        <div className="rd-activity">
          <Minitimeline hours={24} limit={8} title="" timeFormat="relative" emptyLabel="Noch keine Ereignisse aufgezeichnet." />
        </div>
      </Panel>

      {/* ── "IT'S ALL CODE" REVEAL ───────────────────────────── */}
      <section className="rd-reveal">
        <div className="rd-reveal__text">
          <h2>Das ist kein Theme. Das ist Code.</h2>
          <p>
            Der Himmel oben, jede Kachel, jeder Raum — Frame für Frame aus deinen
            Live-Daten gerendert. Kein YAML, keine Karten-Konfiguration. Vier Module,
            voller {dark ? 'Dark-Mode-' : 'Light-Mode-'}Feinschliff. Tippe dich durch den Showcase:
          </p>
          <div className="rd-reveal__meta">
            <span>🧩 {entities.length} Entities</span>
            <span>🗂 {areas.length} Räume</span>
            <span>{dark ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
            <span><i className="rd-reveal__swatch" style={{ background: theme.primary }} /> Theme-Akzent</span>
          </div>
        </div>
        <div className="rd-reveal__mods">
          {([
            ['@ha', 'Reaktive Hooks & Services', 'hooks'],
            ['@ha/ui', '30+ Live-Widgets', 'widgets'],
            ['@ha/layout', 'Seiten, Tabs, Grids', 'layout'],
            ['@ha/format', 'Werte & Zustände', 'format'],
            ['@ha/debug', 'db.log Debug-Engine', 'hooks'],
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
