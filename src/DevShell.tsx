import { useEffect, useState } from 'react';
import {
  callService as hassCallService,
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  type Connection,
  type HassEntities,
  type HassServiceTarget,
} from 'home-assistant-js-websocket';
import { hassStore } from './sdk/hass/store';
import type { AppHass } from './sdk/hass/types';
import Studio from './studio/Studio';

const hassUrl = import.meta.env.VITE_HASS_URL as string | undefined;
const token = import.meta.env.VITE_HASS_TOKEN as string | undefined;

async function connectToHass(): Promise<void> {
  if (!hassUrl?.trim() || !token?.trim()) {
    throw new Error('missing-env');
  }

  const auth = createLongLivedTokenAuth(hassUrl.replace(/\/+$/, ''), token);
  const connection: Connection = await createConnection({ auth });

  const callService: AppHass['callService'] = (
    domain,
    service,
    serviceData,
    target,
  ) =>
    hassCallService(
      connection,
      domain,
      service,
      serviceData,
      target as HassServiceTarget | undefined,
    );

  subscribeEntities(connection, (entities: HassEntities) => {
    const hass: AppHass = {
      states: entities as unknown as AppHass['states'],
      callService,
      connection,
      callApi: async (method, path) => {
        const res = await fetch(`/__ha-api/${path}`, { method });
        if (!res.ok) throw new Error(`HA API ${res.status}`);
        return res.json();
      },
    };
    hassStore.setHass(hass);
  });
}

function bannerMessage(error: string | null, missingEnv: boolean): string {
  if (missingEnv) {
    return (
      'VITE_HASS_URL und VITE_HASS_TOKEN fehlen. ' +
      'Lege .env.local an (Vorlage: .env.local.example) und starte npm run dev neu.'
    );
  }
  if (error === 'missing-env') return '';
  if (error) {
    return (
      `Verbindung zu Home Assistant fehlgeschlagen: ${error} ` +
      'Prüfe URL und Token in .env.local.'
    );
  }
  return 'Verbinde mit Home Assistant…';
}

/** Dev entry: HA connection + banner, then the Studio preview. */
export default function DevShell() {
  const missingEnv = !hassUrl?.trim() || !token?.trim();
  const [error, setError] = useState<string | null>(missingEnv ? 'missing-env' : null);
  const [connecting, setConnecting] = useState(!missingEnv);

  useEffect(() => {
    if (missingEnv) return;

    let cancelled = false;
    connectToHass()
      .then(() => {
        if (!cancelled) {
          setError(null);
          setConnecting(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message || 'Unbekannter Fehler');
          setConnecting(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [missingEnv]);

  const showBanner = missingEnv || connecting || Boolean(error);

  return (
    <>
      {showBanner && (
        <div
          className={`rd-dev-banner ${missingEnv || error ? 'is-error' : 'is-pending'}`}
          role="status"
        >
          {bannerMessage(error, missingEnv)}
        </div>
      )}
      <Studio />
    </>
  );
}
