// Assembles the domain widget catalog from the descriptors that live next to
// each component (`cards/domain/<x>.widget.ts`). The only hand-maintained part
// is the display order below — there is no separate metadata tree to sync.

import type { WidgetCatalogEntry } from './types';
import { GENERIC_DOMAIN_CATALOG } from '../cards/domain/generic.widget';
import { LIGHT_DOMAIN_CATALOG } from '../cards/domain/light.widget';
import { INPUT_DOMAIN_CATALOG } from '../cards/domain/input.widget';
import { CLIMATE_DOMAIN_CATALOG } from '../cards/domain/climate.widget';
import { MEDIA_DOMAIN_CATALOG } from '../cards/domain/media.widget';
import { CAMERA_DOMAIN_CATALOG } from '../cards/domain/camera.widget';
import { COVER_DOMAIN_CATALOG } from '../cards/domain/cover.widget';
import { PRESENCE_DOMAIN_CATALOG } from '../cards/domain/presence.widget';
import { SECURITY_DOMAIN_CATALOG } from '../cards/domain/security.widget';
import { FAN_DOMAIN_CATALOG } from '../cards/domain/fan.widget';
import { VACUUM_DOMAIN_CATALOG } from '../cards/domain/vacuum.widget';
import { VALVE_DOMAIN_CATALOG } from '../cards/domain/valve.widget';
import { TIMER_DOMAIN_CATALOG } from '../cards/domain/timer.widget';
import { ACTIONS_DOMAIN_CATALOG } from '../cards/domain/actions.widget';
import { UPDATE_DOMAIN_CATALOG } from '../cards/domain/update.widget';
import { CALENDAR_DOMAIN_CATALOG } from '../cards/domain/calendar.widget';

/** Entity-bound cards — one widget per HA domain (implementations in `cards/domain/`). */
export const DOMAIN_WIDGET_CATALOG: WidgetCatalogEntry[] = [
  ...GENERIC_DOMAIN_CATALOG,
  ...LIGHT_DOMAIN_CATALOG,
  ...INPUT_DOMAIN_CATALOG,
  ...CLIMATE_DOMAIN_CATALOG,
  ...MEDIA_DOMAIN_CATALOG,
  ...CAMERA_DOMAIN_CATALOG,
  ...COVER_DOMAIN_CATALOG,
  ...PRESENCE_DOMAIN_CATALOG,
  ...SECURITY_DOMAIN_CATALOG,
  ...FAN_DOMAIN_CATALOG,
  ...VACUUM_DOMAIN_CATALOG,
  ...VALVE_DOMAIN_CATALOG,
  ...TIMER_DOMAIN_CATALOG,
  ...ACTIONS_DOMAIN_CATALOG,
  ...UPDATE_DOMAIN_CATALOG,
  ...CALENDAR_DOMAIN_CATALOG,
];
