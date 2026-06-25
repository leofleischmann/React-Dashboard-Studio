import { useMemo } from 'react';
import { useEntities, useEntityHistory, useEntityStatistics } from '@ha';
import { entityDisplayName, num } from '@ha/format';
import { Card, HistoryChart, Section, SparkChart, Stat } from '@ha/ui';
import { ResponsiveGrid } from '@ha/layout';

const CHART_COLORS = ['#6ea8fe', '#34d399', '#fbbf24', '#f87171'];

function pickChartSensors(entities: ReturnType<typeof useEntities>, limit = 4) {
  const numeric = entities.filter(
    (e) =>
      e.entity_id.startsWith('sensor.') &&
      !Number.isNaN(Number.parseFloat(e.state)) &&
      e.state !== 'unavailable' &&
      e.state !== 'unknown',
  );
  const temp = numeric.filter((e) => e.attributes.device_class === 'temperature');
  const pool = temp.length >= 2 ? temp : numeric;
  return pool.slice(0, limit);
}

export function ChartsPage() {
  const entities = useEntities();
  const sensors = useMemo(() => pickChartSensors(entities), [entities]);
  const ids = useMemo(() => sensors.map((s) => s.entity_id), [sensors]);
  const history = useEntityHistory(ids, { hours: 48 });
  const primaryId = ids[0];
  const statsMap = useEntityStatistics(primaryId ? [primaryId] : [], { days: 7 });
  const stats = primaryId ? statsMap[primaryId] : undefined;

  const series = sensors.map((s, i) => ({
    label: entityDisplayName(s, s.entity_id),
    color: CHART_COLORS[i % CHART_COLORS.length],
    points: history[s.entity_id] ?? [],
  }));

  return (
    <div className="rd-sdk-charts">
      <header className="rd-sdk-showcase__page-head">
        <h2>Charts & History</h2>
        <p>
          SparkChart, HistoryChart, useEntityHistory und useEntityStatistics — Echtzeit-Verläufe
          aus deiner HA-Instanz.
        </p>
      </header>

      {sensors.length === 0 ? (
        <Card>
          <p className="rd-empty">Keine numerischen Sensoren für Charts gefunden.</p>
        </Card>
      ) : (
        <>
          <Section title="SparkChart · Multi-Series (48 h)">
            <div className="rd-sdk-chart-card">
              <SparkChart series={series} height={120} />
            </div>
          </Section>

          <Section title="HistoryChart · Einzelverlauf">
            <div className="rd-sdk-chart-card">
              <HistoryChart
                series={[
                  {
                    label: entityDisplayName(sensors[0], sensors[0].entity_id),
                    color: '#6ea8fe',
                    points: history[sensors[0].entity_id] ?? [],
                  },
                ]}
                height={160}
                showLegend
              />
            </div>
          </Section>

          {primaryId && stats && (
            <Section title="useEntityStatistics · 24 h">
              <ResponsiveGrid min={140}>
                <Stat label="Min" value={num(stats.min)} />
                <Stat label="Max" value={num(stats.max)} />
                <Stat label="Mean" value={num(stats.mean)} accent />
                <Stat label="Sum" value={num(stats.sum)} />
              </ResponsiveGrid>
              <p className="rd-sdk-ref__lead">
                Entity: <code>{primaryId}</code>
              </p>
            </Section>
          )}

          <Section title="Ausgewählte Sensoren">
            <ResponsiveGrid min={160}>
              {sensors.map((s) => (
                <Stat
                  key={s.entity_id}
                  label={entityDisplayName(s, s.entity_id)}
                  value={num(s.state)}
                  unit={s.attributes.unit_of_measurement as string | undefined}
                />
              ))}
            </ResponsiveGrid>
          </Section>
        </>
      )}
    </div>
  );
}
