import type { ReactNode } from 'react';
import { useEntityActions } from '../../../hass/hooks';

const BULB_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      fill="currentColor"
      d="M12 2a7 7 0 0 0-4 12.74V16a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-1.26A7 7 0 0 0 12 2Zm-3 17a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1H9v1Z"
    />
  </svg>
);

export function LightTile({
  entityId,
  name,
  icon,
  showBrightness = false,
}: {
  entityId: string;
  name?: string;
  /** Custom icon node — default bulb SVG. */
  icon?: ReactNode;
  /** Mini brightness bar when on (default false). */
  showBrightness?: boolean;
}) {
  const actions = useEntityActions(entityId);
  const light = actions.entity;
  const on = actions.isOn;
  const label = name ?? light?.attributes.friendly_name ?? entityId;
  const brightnessRaw = light?.attributes.brightness;
  const brightness =
    typeof brightnessRaw === 'number'
      ? Math.max(1, Math.round((brightnessRaw / 255) * 100))
      : undefined;

  return (
    <button
      className={`rd-light ${on ? 'is-on' : ''}`}
      onClick={() => actions.toggle()}
      aria-pressed={on}
    >
      <span className="rd-light__icon">{icon ?? BULB_ICON}</span>
      <span className="rd-light__name">{label}</span>
      {showBrightness && on && brightness !== undefined ? (
        <span className="rd-light__bar" aria-hidden>
          <span className="rd-light__bar-fill" style={{ width: `${brightness}%` }} />
        </span>
      ) : (
        <span className="rd-light__state">
          {on ? (brightness !== undefined ? `${brightness} %` : 'an') : 'aus'}
        </span>
      )}
    </button>
  );
}
