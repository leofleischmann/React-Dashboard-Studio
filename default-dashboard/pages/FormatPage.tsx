import { useEntities, useEntity } from '@ha';
import {
  batteryColor,
  brightness,
  colorTemp,
  deviceClassIcon,
  duration,
  energy,
  entityDisplayName,
  entityDisplayNameForId,
  euro,
  greeting,
  isAvailable,
  num,
  pct,
  power,
  relativeTime,
  stateColor,
  stateLabel,
  stateNumber,
  temp,
  weatherIcon,
} from '@ha/format';
import { Card, Section } from '@ha/ui';
import { PageHead } from '../components/PageHead';

type FormatRow = { fn: string; result: string };

function FormatTable({ rows }: { rows: FormatRow[] }) {
  return (
    <div className="rd-dd-format-table">
      {rows.map((row) => (
        <div key={row.fn} className="rd-dd-format-row">
          <code>{row.fn}</code>
          <span>{row.result}</span>
        </div>
      ))}
    </div>
  );
}

const WEATHER_CONDITIONS = ['sunny', 'partlycloudy', 'cloudy', 'rainy', 'snowy', 'lightning', 'fog'];
const STATE_SWATCHES = ['on', 'off', 'home', 'not_home', 'unavailable', 'playing', 'triggered'];

export function FormatPage() {
  const entities = useEntities();
  const sensor = entities.find((e) => e.entity_id.startsWith('sensor.'));
  const light = entities.find((e) => e.entity_id.startsWith('light.'));
  const weather = entities.find((e) => e.entity_id.startsWith('weather.'));
  const sample = useEntity(sensor?.entity_id ?? 'sensor.example');
  const lightEntity = useEntity(light?.entity_id ?? 'light.example');

  const rows: FormatRow[] = [
    { fn: 'greeting()', result: greeting() },
    { fn: `num('${sample?.state ?? '23.4'}')`, result: num(sample?.state ?? '23.4') },
    { fn: 'temp(state)', result: temp(sample?.state ?? 21.5) },
    { fn: 'pct(72)', result: pct(72) },
    { fn: 'power(450)', result: power(450) },
    { fn: 'energy(12.3)', result: energy(12.3) },
    { fn: 'euro(4.56)', result: euro(4.56) },
    { fn: 'duration(3665)', result: duration(3665) },
    { fn: 'relativeTime(-1h)', result: relativeTime(new Date(Date.now() - 3600_000)) },
    { fn: 'entityDisplayName(entity)', result: sample ? entityDisplayName(sample, sample.entity_id) : '–' },
    { fn: 'entityDisplayNameForId(id)', result: sensor ? entityDisplayNameForId(sensor.entity_id) : '–' },
    { fn: 'stateNumber(entity)', result: sample ? String(stateNumber(sample) ?? '–') : '–' },
    { fn: 'isAvailable(entity)', result: sample && isAvailable(sample) ? 'verfügbar' : 'nicht verfügbar' },
    { fn: 'stateLabel(state, domain)', result: sample ? stateLabel(sample.state, sample.entity_id.split('.')[0]) : '–' },
    { fn: 'deviceClassIcon(class)', result: deviceClassIcon(sample?.attributes.device_class as string | undefined) },
  ];

  if (lightEntity) {
    rows.push(
      { fn: 'brightness(attr)', result: brightness(lightEntity.attributes.brightness as number | undefined) },
      { fn: 'colorTemp(attr)', result: colorTemp(lightEntity.attributes.color_temp as number | undefined) },
    );
  }

  return (
    <>
      <PageHead icon="🔤" module="@ha/format" title="Werte, Zustände & Zeiten">
        Einheitliche, lokalisierte Darstellung — Zahlen, Einheiten, Zustände, Farben und Zeiten.
        Alle Beispiele rechnen mit echten Werten aus deinen Entities.
      </PageHead>

      <Section title="Formatter (Live-Werte)">
        <FormatTable rows={rows} />
      </Section>

      <Section title="stateColor() — semantische Farben">
        <div className="rd-fmt-swatches">
          {STATE_SWATCHES.map((s) => (
            <span key={s} className="rd-fmt-swatch">
              <i style={{ background: stateColor(s) }} />
              <code>{s}</code>
            </span>
          ))}
        </div>
      </Section>

      <Section title="batteryColor() — Ladestand-Ampel">
        <div className="rd-fmt-swatches">
          {[8, 25, 60, 95].map((v) => (
            <span key={v} className="rd-fmt-swatch">
              <i style={{ background: batteryColor(v) }} />
              <code>{v} %</code>
            </span>
          ))}
        </div>
      </Section>

      <Section title="weatherIcon() — Bedingungen">
        <div className="rd-fmt-weather">
          {WEATHER_CONDITIONS.map((c) => (
            <span key={c} className="rd-fmt-weather__item">
              <strong>{weatherIcon(c)}</strong>
              <code>{c}</code>
            </span>
          ))}
          {weather && (
            <span className="rd-fmt-weather__item is-live">
              <strong>{weatherIcon(weather.state)}</strong>
              <code>{weather.state}</code>
            </span>
          )}
        </div>
      </Section>

      <Section title="Import">
        <Card>
          <code className="rd-fmt-import">
            {`import { num, temp, stateColor, weatherIcon, relativeTime } from '@ha/format';`}
          </code>
        </Card>
      </Section>
    </>
  );
}
