import { useEntities, useEntity } from '@ha';
import {
  brightness,
  colorTemp,
  deviceClassIcon,
  duration,
  energy,
  entityDisplayName,
  euro,
  greeting,
  num,
  pct,
  power,
  relativeTime,
  stateColor,
  stateLabel,
  temp,
  weatherIcon,
} from '@ha/format';
import { Card, Section } from '@ha/ui';

type FormatRow = { fn: string; result: string };

function FormatDemo({ rows }: { rows: FormatRow[] }) {
  return (
    <div className="rd-sdk-format-table">
      {rows.map((row) => (
        <div key={row.fn} className="rd-sdk-format-row">
          <code>{row.fn}</code>
          <span>{row.result}</span>
        </div>
      ))}
    </div>
  );
}

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
    {
      fn: 'relativeTime(now)',
      result: relativeTime(new Date(Date.now() - 3600_000)),
    },
    {
      fn: 'entityDisplayName(entity)',
      result: sample
        ? entityDisplayName(sample, sample.entity_id)
        : '–',
    },
    {
      fn: 'stateLabel(state, domain)',
      result: sample
        ? stateLabel(sample.state, sample.entity_id.split('.')[0])
        : '–',
    },
    {
      fn: 'stateColor(state)',
      result: sample ? stateColor(sample.state) : '–',
    },
    {
      fn: 'deviceClassIcon(device_class)',
      result: deviceClassIcon(sample?.attributes.device_class as string | undefined),
    },
  ];

  if (lightEntity) {
    rows.push(
      {
        fn: 'brightness(attr)',
        result: brightness(lightEntity.attributes.brightness as number | undefined),
      },
      {
        fn: 'colorTemp(attr)',
        result: colorTemp(lightEntity.attributes.color_temp as number | undefined),
      },
    );
  }

  if (weather) {
    rows.push({
      fn: 'weatherIcon(condition)',
      result: weatherIcon(weather.state),
    });
  }

  return (
    <div className="rd-sdk-format">
      <header className="rd-sdk-showcase__page-head">
        <h2>Format-Helfer (@ha/format)</h2>
        <p>
          Einheitliche Darstellung von Werten, Zuständen und Zeiten — mit Live-Beispielen
          aus deinen Entities.
        </p>
      </header>

      <Section title="Alle Formatter">
        <FormatDemo rows={rows} />
      </Section>

      <Section title="Import">
        <Card>
          <code>{`import { num, temp, stateLabel, relativeTime, entityDisplayName } from '@ha/format';`}</code>
        </Card>
      </Section>
    </div>
  );
}
