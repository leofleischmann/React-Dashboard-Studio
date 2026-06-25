import type { WidgetCatalogEntry } from '../types';
import { ACTIONS_DOMAIN_CATALOG } from './actions';
import { CALENDAR_DOMAIN_CATALOG } from './calendar';
import { CAMERA_DOMAIN_CATALOG } from './camera';
import { CLIMATE_DOMAIN_CATALOG } from './climate';
import { COVER_DOMAIN_CATALOG } from './cover';
import { FAN_DOMAIN_CATALOG } from './fan';
import { GENERIC_DOMAIN_CATALOG } from './generic';
import { INPUT_DOMAIN_CATALOG } from './input';
import { LIGHT_DOMAIN_CATALOG } from './light';
import { MEDIA_DOMAIN_CATALOG } from './media';
import { PRESENCE_DOMAIN_CATALOG } from './presence';
import { SECURITY_DOMAIN_CATALOG } from './security';
import { TIMER_DOMAIN_CATALOG } from './timer';
import { UPDATE_DOMAIN_CATALOG } from './update';
import { VALVE_DOMAIN_CATALOG } from './valve';
import { VACUUM_DOMAIN_CATALOG } from './vacuum';
import { WEATHER_DOMAIN_CATALOG } from './weather';

/** Entity-bound cards — one widget per HA domain (implementations in `cards/domain/`). */
export const DOMAIN_WIDGET_CATALOG: WidgetCatalogEntry[] = [
  ...GENERIC_DOMAIN_CATALOG,
  ...LIGHT_DOMAIN_CATALOG,
  ...INPUT_DOMAIN_CATALOG,
  ...CLIMATE_DOMAIN_CATALOG,
  ...MEDIA_DOMAIN_CATALOG,
  ...CAMERA_DOMAIN_CATALOG,
  ...COVER_DOMAIN_CATALOG,
  ...WEATHER_DOMAIN_CATALOG,
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
