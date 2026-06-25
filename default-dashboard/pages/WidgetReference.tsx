import { useEntities } from '@ha';
import { entityDisplayName } from '@ha/format';
import {
  BatteryRow,
  Card,
  DeviceCard,
  Grid,
  RoomCard,
  Section,
  Stat,
  WidgetCatalogGrid,
} from '@ha/ui';
import { ResponsiveGrid } from '@ha/layout';

function findBatterySensor(entities: ReturnType<typeof useEntities>) {
  return entities.find(
    (e) =>
      e.entity_id.startsWith('sensor.') &&
      e.attributes.device_class === 'battery',
  );
}

function findRoomPattern(entities: ReturnType<typeof useEntities>) {
  const match = entities.find((e) =>
    /^sensor\.sensor_(.+)_temperature$/.test(e.entity_id),
  );
  if (!match) return null;
  const key = match.entity_id.match(/^sensor\.sensor_(.+)_temperature$/)?.[1];
  return key ?? null;
}

function findDeviceSet(entities: ReturnType<typeof useEntities>) {
  const power = entities.find(
    (e) =>
      e.entity_id.startsWith('sensor.') &&
      (e.attributes.device_class === 'power' ||
        e.attributes.unit_of_measurement === 'W'),
  );
  const sw = entities.find((e) => e.entity_id.startsWith('switch.'));
  if (!power || !sw) return null;
  return {
    name: entityDisplayName(power, power.entity_id),
    powerId: power.entity_id,
    kwhId: power.entity_id,
    costId: power.entity_id,
    switchId: sw.entity_id,
  };
}

export function WidgetReference() {
  const entities = useEntities();
  const battery = findBatterySensor(entities);
  const roomKey = findRoomPattern(entities);
  const deviceSet = findDeviceSet(entities);
  const sampleLight = entities.find((e) => e.entity_id.startsWith('light.'));

  return (
    <div className="rd-sdk-widgets">
      <header className="rd-sdk-showcase__page-head">
        <h2>Widget-Galerie</h2>
        <p>
          Alle 30+ Domain-Widgets — live mit der ersten passenden Entity deiner Installation.
          Klick im Studio unter <strong>⚡ Entities → Galerie</strong> zum Kopieren.
        </p>
      </header>

      <Section title="Domain-Widgets (@ha/ui)">
        <WidgetCatalogGrid />
      </Section>

      <Section title="Composite-Widgets">
        <p className="rd-sdk-ref__lead">
          Zusammengesetzte Karten — RoomCard, DeviceCard, BatteryRow und Grid.
        </p>
        <ResponsiveGrid min={260}>
          {roomKey ? (
            <RoomCard
              name={`Raum (${roomKey})`}
              sensorKey={roomKey}
              lightId={sampleLight?.entity_id}
            />
          ) : (
            <Card>
              <strong>RoomCard</strong>
              <p className="rd-empty">
                Kein sensor.sensor_*_temperature-Muster gefunden. Beispiel:
                <code>{' <RoomCard name="Wohnzimmer" sensorKey="wohnzimmer" lightId="light.…" />'}</code>
              </p>
            </Card>
          )}

          {deviceSet ? (
            <DeviceCard {...deviceSet} />
          ) : (
            <Card>
              <strong>DeviceCard</strong>
              <p className="rd-empty">
                Kein Power-Sensor + Switch-Paar gefunden. Ideal für Energie-Monitoring.
              </p>
            </Card>
          )}

          {battery ? (
            <div className="rd-card">
              <strong className="rd-sdk-ref-card__head">BatteryRow</strong>
              <BatteryRow
                name={entityDisplayName(battery, battery.entity_id)}
                entityId={battery.entity_id}
              />
            </div>
          ) : (
            <Card>
              <strong>BatteryRow</strong>
              <p className="rd-empty">Kein sensor mit device_class=battery.</p>
            </Card>
          )}

          <div className="rd-card">
            <strong>Grid</strong>
            <Grid min={100}>
              <Stat label="A" value="1" />
              <Stat label="B" value="2" accent />
              <Stat label="C" value="3" />
            </Grid>
          </div>
        </ResponsiveGrid>
      </Section>
    </div>
  );
}
