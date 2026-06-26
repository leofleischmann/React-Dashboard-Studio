export type { HassEntity } from '../types';
export type { EntityFilter } from '../entityFilter';
export type { EntityStatistics } from '../statistics';
export type { CalendarEvent } from '../calendar';
export type { LogbookEntry } from '../logbook';
export { fetchLogbook, logbookCacheMarker } from '../logbook';
export type { WeatherForecastEntry, WeatherForecastType } from '../weather';
export { fetchWeatherForecast, FORECAST_TYPE_PARAM } from '../weather';
export type { EntityRegistryEntry, AreaEntry, LabelEntry } from '../registryStore';
export { fetchEntityHistory, aggregateHistory, aggregateHistoryByDay, aggregateHistoryDelta } from '../history';
export { fetchEntityStatistics } from '../statistics';
export { fetchCalendarEvents } from '../calendar';
export type { HistoryPoint } from '../history';
export { useTheme, useDarkMode, applyThemeVars } from '../theme';
export {
  DashboardProvider,
  useDashboardState,
  usePersistentState,
  clearPersistentState,
  useDashboardScope,
} from '../../dashboard';

export { useHassReady } from './ready';
export {
  useTime,
  useIsMobile,
  states,
  callService,
  callServiceWithTarget,
  getAppHass,
  type HassServiceTarget,
} from './app';
export type { EntityHookOptions } from './entity';
export {
  useEntity,
  useEntityState,
  useEntityAttribute,
  useEntities,
  useAreaEntities,
  useEntitiesByLabel,
  useAreas,
  useLabels,
  useAreaName,
  useEntityRegistry,
  useEntitiesByDomain,
  useSun,
} from './entity';
export {
  useEntityHistory,
  useEntityHistoryPending,
  useEntityStatistics,
  useCalendarEvents,
} from './rest';
export { useLogbook, type UseLogbookOptions, type UseLogbookResult } from './logbook';
export {
  useWeatherForecast,
  type UseWeatherForecastOptions,
  type UseWeatherForecastResult,
} from './weather';
export {
  useTemplate,
  type UseTemplateOptions,
  type UseTemplateResult,
  type TemplateListeners,
} from './template';
export {
  useEnergy,
  type UseEnergyOptions,
  type UseEnergyResult,
  type EnergyPeriod,
  computeEnergyKwh,
  energyDailySeries,
  energyPeriodHours,
  energyPeriodLabel,
  energyPeriodStartMs,
} from './energy';
export {
  useEntityAge,
  type UseEntityAgeOptions,
  type UseEntityAgeResult,
} from './entityAge';
export { useEntityActions, type EntityActions } from './actions';
// Entity-action helpers — public so ejected widget sources resolve against `@ha`.
export {
  entityDomain,
  defaultEntityService,
  isEntityOn,
  isEntityAvailable,
  TOGGLE_DOMAINS,
  PRESS_DOMAINS,
} from '../../entityActions';
