/** A single entity's state, as Home Assistant represents it. */
export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    unit_of_measurement?: string;
    icon?: string;
    device_class?: string;
    [key: string]: unknown;
  };
  last_changed: string;
  last_updated: string;
  context: { id: string; parent_id: string | null; user_id: string | null };
}

/**
 * The slice of Home Assistant's `hass` object we actually rely on.
 *
 * In production HA hands the panel a much richer object; we only type what we
 * use (states + callService) and let the rest pass through via the index
 * signature. In dev we build a compatible object from the WebSocket connection.
 */
export interface HassConnection {
  sendMessagePromise: <T = unknown>(message: {
    type: string;
    [key: string]: unknown;
  }) => Promise<T>;
  subscribeMessage?: <T = unknown>(
    callback: (msg: T) => void,
    subscribeMessage: { type: string; [key: string]: unknown },
  ) => Promise<() => void>;
}

export interface AppHass {
  states: Record<string, HassEntity>;
  callService: (
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
    target?: Record<string, unknown>,
  ) => Promise<unknown>;
  /** The live WebSocket connection — used to persist the dashboard code in HA. */
  connection?: HassConnection;
  /** Home Assistant frontend REST helper (panel only). */
  callApi?: (
    method: string,
    path: string,
    parameters?: Record<string, unknown>,
  ) => Promise<unknown>;
  user?: { name: string; is_admin: boolean };
  language?: string;
  [key: string]: unknown;
}
