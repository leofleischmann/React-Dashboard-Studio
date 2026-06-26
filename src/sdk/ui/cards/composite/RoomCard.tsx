import { useEntity, useEntityActions } from '../../../hass/hooks';
import { num } from '../../../format';

/** A climate card for one room. Sensor IDs follow the `sensor_<key>_*` pattern. */
export function RoomCard({
  name,
  sensorKey,
  lightId,
}: {
  name: string;
  sensorKey: string;
  lightId?: string;
}) {
  const temp = useEntity(`sensor.sensor_${sensorKey}_temperature`);
  const humidity = useEntity(`sensor.sensor_${sensorKey}_humidity`);
  const lux = useEntity(`sensor.sensor_${sensorKey}_illuminance`);
  const presence = useEntity(`binary_sensor.sensor_${sensorKey}_presence`);
  const light = useEntityActions(lightId ?? '');

  const occupied = presence?.state === 'on';
  const lightOn = light.isOn;
  const lightUsable = light.isAvailable;

  return (
    <div className="rd-card rd-room">
      <div className="rd-room__head">
        <span className="rd-room__name">{name}</span>
        <span className={`rd-dot ${occupied ? 'is-on' : ''}`} title={occupied ? 'belegt' : 'frei'} />
      </div>

      <div className="rd-room__temp">
        {num(temp?.state)}
        <small>°C</small>
      </div>

      <div className="rd-room__metrics">
        <span>💧 {num(humidity?.state, 0)} %</span>
        <span>💡 {num(lux?.state, 0)} lx</span>
      </div>

      {lightId && (
        <button
          className={`rd-pill ${lightOn ? 'is-on' : ''}`}
          disabled={!lightUsable}
          onClick={() => light.toggle()}
        >
          {lightUsable ? (lightOn ? 'Licht an' : 'Licht aus') : 'nicht verfügbar'}
        </button>
      )}
    </div>
  );
}
