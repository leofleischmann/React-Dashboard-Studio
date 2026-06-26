import { useEffect, useMemo, useState } from 'react';
import {
  aggregateHistoryByDay,
  aggregateHistoryDelta,
  fetchEntityHistory,
  useEntities,
  useEntityHistory,
  useEntityHistoryPending,
  useEntityStatistics,
  type HistoryPoint,
} from '@ha';
import { entityDisplayName, num } from '@ha/format';
import { db } from '@ha/debug';
import { Card, Section, SparkChart, Stat } from '@ha/ui';
import { ResponsiveGrid } from '@ha/layout';
import { PageHead } from '../components/PageHead';
import { energySensor, numericSensors } from '../lib/pickers';

const CHART_COLORS = ['#6ea8fe', '#34d399', '#fbbf24', '#f87171'];

const log = db.scope('ChartsPage');

/** Demonstrates aggregateHistoryByDay / aggregateHistoryDelta on an energy sensor. */
function EnergyAggregation({ entityId, label }: { entityId: string; label: string }) {
  const [points, setPoints] = useState<HistoryPoint[]>([]);

  useEffect(() => {
    let alive = true;
    // fetchEntityHistory — the imperative, promise-based recorder API.
    fetchEntityHistory([entityId], 168)
      .then((res) => {
        if (alive) setPoints(res[entityId] ?? []);
      })
      .catch((err) => {
        log.warn('fetchEntityHistory failed', entityId, err);
      });
    return () => {
      alive = false;
    };
  }, [entityId]);

  const byDay = useMemo(() => aggregateHistoryByDay(points), [points]);
  const total = useMemo(() => aggregateHistoryDelta(points), [points]);
  const days = Object.entries(byDay).slice(-7);
  const peak = Math.max(1, ...days.map(([, v]) => v));

  return (
    <div>
      {days.length === 0 ? (
        <p className="rd-empty">Kein kumulativer Verlauf für {label}.</p>
      ) : (
        <>
          <div className="rd-aggbars">
            {days.map(([day, v]) => (
              <div key={day} className="rd-aggbar">
                <span className="rd-aggbar__val">{num(v, 1)}</span>
                <div className="rd-aggbar__fill" style={{ height: `${(v / peak) * 100}%` }} />
                <span className="rd-aggbar__label">
                  {new Date(day).toLocaleDateString('de-DE', { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
          <div className="rd-agg-total">
            <span>
              <small>aggregateHistoryDelta · 7 Tage</small>
              <strong>{num(total, 1)} {(/kwh/i.test(label) ? 'kWh' : '')}</strong>
            </span>
            <span>
              <small>aggregateHistoryByDay · Tage</small>
              <strong>{Object.keys(byDay).length}</strong>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export function ChartsPage() {
  const entities = useEntities();
  const sensors = useMemo(() => numericSensors(entities), [entities]);
  const ids = useMemo(() => sensors.map((s) => s.entity_id), [sensors]);
  const history = useEntityHistory(ids, { hours: 48 });
  const historyLoading = useEntityHistoryPending(ids, { hours: 48 });
  const primaryId = ids[0];
  const statsMap = useEntityStatistics(primaryId ? [primaryId] : [], { days: 7 });
  const stats = primaryId ? statsMap[primaryId] : undefined;
  const energy = useMemo(() => energySensor(entities), [entities]);

  useEffect(() => {
    log.log('loaded', {
      sensors: sensors.length,
      historyLoading,
      primaryId: primaryId ?? null,
      energy: energy?.entity_id ?? null,
    });
  }, [sensors.length, historyLoading, primaryId, energy?.entity_id]);

  const series = sensors.map((s, i) => ({
    label: entityDisplayName(s, s.entity_id),
    color: CHART_COLORS[i % CHART_COLORS.length],
    points: history[s.entity_id] ?? [],
  }));

  return (
    <>
      <PageHead icon="📈" module="@ha · @ha/ui" title="Charts, Verlauf & Statistik">
        SparkChart, useEntityHistory, useEntityStatistics und die
        aggregateHistory-Helfer — Echtzeit-Verläufe direkt aus deinem Recorder.
      </PageHead>

      {sensors.length === 0 ? (
        <Card>
          <p className="rd-empty">Keine numerischen Sensoren für Charts gefunden.</p>
        </Card>
      ) : (
        <>
          <Section title="SparkChart · Multi-Series (48 h)">
            <div className="rd-glass rd-chart-panel">
              <SparkChart series={series} height={80} loading={historyLoading} axes={{ xLabel: 'Zeit', yLabel: 'Wert' }} />
            </div>
          </Section>

          <Section title="SparkChart · Einzelverlauf mit Achse">
            <div className="rd-glass rd-chart-panel">
              <SparkChart
                loading={historyLoading}
                series={[
                  {
                    label: entityDisplayName(sensors[0], sensors[0].entity_id),
                    color: '#6ea8fe',
                    points: history[sensors[0].entity_id] ?? [],
                  },
                ]}
                height={96}
                showLegend
                axes={{
                  xLabel: 'Zeit',
                  yLabel: (sensors[0].attributes.unit_of_measurement as string | undefined) ?? 'Wert',
                }}
              />
            </div>
          </Section>

          {primaryId && stats && (
            <Section title="useEntityStatistics · 7 Tage">
              <ResponsiveGrid min={140}>
                <Stat label="Min" value={num(stats.min)} />
                <Stat label="Max" value={num(stats.max)} />
                <Stat label="Mittel" value={num(stats.mean)} accent />
                <Stat label="Summe" value={num(stats.sum)} />
              </ResponsiveGrid>
              <p className="rd-dd-lead" style={{ marginTop: 10 }}>
                Entity: <code>{primaryId}</code> · geladen über WebSocket
                (<code>recorder/statistics_during_period</code>).
              </p>
            </Section>
          )}

          {energy && (
            <Section title="aggregateHistory · Tagesverbrauch">
              <div className="rd-glass rd-chart-panel">
                <p className="rd-dd-lead">
                  Aus dem kumulativen Zähler{' '}
                  <code>{entityDisplayName(energy, energy.entity_id)}</code> werden über
                  <code> aggregateHistoryByDay</code> Tages-Deltas berechnet:
                </p>
                <EnergyAggregation
                  entityId={energy.entity_id}
                  label={entityDisplayName(energy, energy.entity_id)}
                />
              </div>
            </Section>
          )}

          <Section title="Live-Werte der Chart-Sensoren">
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
    </>
  );
}
