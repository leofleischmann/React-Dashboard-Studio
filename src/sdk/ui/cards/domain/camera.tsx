import { useEffect, useState } from 'react';
import { useEntity } from '../../../hass/hooks';
import { entityDisplayName } from '../../../format';

function cameraProxyUrl(entityId: string, cacheBust: number): string {
  const base =
    typeof import.meta !== 'undefined' && import.meta.env?.DEV
      ? '/__ha-api'
      : '/api';
  return `${base}/camera_proxy/${entityId}?t=${cacheBust}`;
}

/** Camera snapshot tile (refreshes periodically). */
export function CameraTile({
  entityId,
  label,
  refreshSec = 10,
  fit = 'cover',
  enlargeOnClick = false,
}: {
  entityId: string;
  label?: string;
  refreshSec?: number;
  /** CSS object-fit for the snapshot (default `cover`). */
  fit?: 'cover' | 'contain';
  /** Open full snapshot in a new tab on click (default false). */
  enlargeOnClick?: boolean;
}) {
  const camera = useEntity(entityId);
  const name = label ?? entityDisplayName(camera, entityId);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), refreshSec * 1000);
    return () => window.clearInterval(id);
  }, [refreshSec]);

  const src = cameraProxyUrl(entityId, tick);

  const img = (
    <img
      className="rd-camera__img"
      src={src}
      alt={name}
      loading="lazy"
      style={{ objectFit: fit }}
    />
  );

  return (
    <div className="rd-card rd-camera">
      <span className="rd-camera__name">{name}</span>
      {enlargeOnClick ? (
        <button
          type="button"
          className="rd-camera__zoom"
          onClick={() => window.open(src, '_blank', 'noopener,noreferrer')}
          aria-label={`${name} vergrößern`}
        >
          {img}
        </button>
      ) : (
        img
      )}
    </div>
  );
}
