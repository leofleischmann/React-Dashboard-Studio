# Home Assistant Dashboard Studio — SDK Reference

> Automatisch generiert von `npm run gen:sdk-reference` · 2026-06-25T18:09:22.753Z

Maschinenlesbare Version: [`sdk-reference.json`](./sdk-reference.json)

## Module

| Modul | Werte | Typen |
| --- | --- | --- |
| `@ha` | 51 | 24 |
| `@ha/ui` | 62 | 12 |
| `@ha/layout` | 7 | 1 |
| `@ha/format` | 23 | 1 |

## Entity-Inserter Modi

| Modus | Beispiel |
| --- | --- |
| Wert | `useEntity('sensor.temperatur')?.state` |
| Template | `useTemplate("{{ states('sensor.temperatur') }}").value` |
| Aktion | `callService('light', 'toggle', { entity_id: 'light.wohnzimmer' })` |
| nur ID | `'sensor.temperatur'` |
| Widget | `<Gauge entityId="sensor.temperatur" />` |

## Widgets

### composite

| Widget | Domains | Snippet |
| --- | --- | --- |
| **Raum** (`RoomCard`) | sensor | `<RoomCard name=` |
| **Energie-Gerät** (`EnergyDeviceCard`) | sensor | `<EnergyDeviceCard name=` |
| **Gerät (Energie)** (`DeviceCard`) | sensor | `<DeviceCard name=` |
| **Batterie** (`BatteryRow`) | sensor | `<BatteryRow name=` |
| **Grid** (`Grid`) | — | `<Grid min={180}>…</Grid>` |

### domain

| Widget | Domains | Snippet |
| --- | --- | --- |
| **Szene** (`SceneButton`) | scene | `<SceneButton entityId="scene.beispiel" />` |
| **Skript** (`ScriptButton`) | script | `<ScriptButton entityId="script.beispiel" />` |
| **Kalender** (`CalendarCard`) | calendar | `<CalendarCard entityId="calendar.beispiel" />` |
| **Kamera** (`CameraTile`) | camera | `<CameraTile entityId="camera.beispiel" refreshSec={10} fit="cover" />` |
| **Klima** (`ClimateCard`) | climate | `<ClimateCard entityId="climate.beispiel" />` |
| **Luftbefeuchter** (`HumidifierCard`) | humidifier | `<HumidifierCard entityId="humidifier.beispiel" />` |
| **Warmwasser** (`WaterHeaterCard`) | water_heater | `<WaterHeaterCard entityId="water_heater.beispiel" />` |
| **Rollo** (`CoverCard`) | cover | `<CoverCard entityId="cover.beispiel" />` |
| **Ventilator** (`FanCard`) | fan | `<FanCard entityId="fan.beispiel" />` |
| **Stat** (`Stat`) | sensor | `<Stat label="${id.split('.')[1] ?? 'Sensor'}" value={num(useEntity('sensor.beispiel')?.state)} />` |
| **Gauge** (`Gauge`) | sensor | `<Gauge entityId="sensor.beispiel" min={0} max={100} />` |
| **SparkChart** (`SparkChart`) | sensor | `<SparkChart series={[…]} height={120} axes={{ xLabel: ` |
| **Entity-Zeile** (`EntityRow`) | switch | `<EntityRow entityId="switch.beispiel" />` |
| **Binary** (`BinaryBadge`) | binary_sensor | `<BinaryBadge entityId="binary_sensor.beispiel" />` |
| **Aktion** (`ActionButton`) | button, automation | `<ActionButton entityId="button.beispiel" />` |
| **Zahl** (`NumberSlider`) | input_number | `<NumberSlider entityId="input_number.beispiel" min={0} max={100} step={1} />` |
| **Schalter** (`InputBooleanTile`) | input_boolean | `<InputBooleanTile entityId="input_boolean.beispiel" />` |
| **Auswahl** (`SelectCard`) | input_select, select | `<SelectCard entityId="input_select.beispiel" />` |
| **Licht** (`LightTile`) | light | `<LightTile entityId="light.beispiel" showBrightness />` |
| **Media** (`MediaPlayerCard`) | media_player | `<MediaPlayerCard entityId="media_player.beispiel" />` |
| **Person** (`PersonChip`) | person | `<PersonChip entityId="person.beispiel" />` |
| **Tracker** (`DeviceTrackerChip`) | device_tracker | `<DeviceTrackerChip entityId="device_tracker.beispiel" />` |
| **Schloss** (`LockCard`) | lock | `<LockCard entityId="lock.beispiel" />` |
| **Alarm** (`AlarmPanel`) | alarm_control_panel | `<AlarmPanel entityId="alarm_control_panel.beispiel" />` |
| **Sirene** (`SirenCard`) | siren | `<SirenCard entityId="siren.beispiel" />` |
| **Timer** (`TimerCard`) | timer | `<TimerCard entityId="timer.beispiel" />` |
| **Zähler** (`CounterCard`) | counter | `<CounterCard entityId="counter.beispiel" />` |
| **Update** (`UpdateCard`) | update | `<UpdateCard entityId="update.beispiel" />` |
| **Staubsauger** (`VacuumCard`) | vacuum | `<VacuumCard entityId="vacuum.beispiel" />` |
| **Ventil** (`ValveCard`) | valve | `<ValveCard entityId="valve.beispiel" />` |
| **Wetter** (`WeatherCard`) | weather | `<WeatherCard entityId="weather.beispiel" showWind />` |

### featured

| Widget | Domains | Snippet |
| --- | --- | --- |
| **Sonnenbogen** (`SunArc`) | sun | `<SunArc entityId="sun.beispiel" showStars showMoon />` |
| **Wert-Orb** (`ValueOrb3D`) | sensor, number, input_number | `<ValueOrb3D entityId="sensor.beispiel" min={0} max={100} />` |
| **Uhr** (`LiveClock`) | — | `<LiveClock showSeconds locale=` |
| **5-Tage-Vorhersage** (`WeatherForecastRow`) | weather | `<WeatherForecastRow entityId="weather.beispiel" days={5} />` |
| **Aktivitäts-Timeline** (`Minitimeline`) | binary_sensor, light, switch, sensor | `<Minitimeline entityId="binary_sensor.beispiel" limit={8} hours={24} />` |

## Domain → Standard-Widget

| Domain | Widget |
| --- | --- |
| `alarm_control_panel` | `AlarmPanel` |
| `automation` | `ActionButton` |
| `binary_sensor` | `BinaryBadge` |
| `button` | `ActionButton` |
| `calendar` | `CalendarCard` |
| `camera` | `CameraTile` |
| `climate` | `ClimateCard` |
| `counter` | `CounterCard` |
| `cover` | `CoverCard` |
| `device_tracker` | `DeviceTrackerChip` |
| `fan` | `FanCard` |
| `humidifier` | `HumidifierCard` |
| `input_boolean` | `InputBooleanTile` |
| `input_number` | `NumberSlider` |
| `input_select` | `SelectCard` |
| `light` | `LightTile` |
| `lock` | `LockCard` |
| `media_player` | `MediaPlayerCard` |
| `number` | `ValueOrb3D` |
| `person` | `PersonChip` |
| `scene` | `SceneButton` |
| `script` | `ScriptButton` |
| `select` | `SelectCard` |
| `sensor` | `Gauge` |
| `siren` | `SirenCard` |
| `sun` | `SunArc` |
| `switch` | `EntityRow` |
| `timer` | `TimerCard` |
| `update` | `UpdateCard` |
| `vacuum` | `VacuumCard` |
| `valve` | `ValveCard` |
| `water_heater` | `WaterHeaterCard` |
| `weather` | `WeatherCard` |

## Hooks (`@ha`)

```
DashboardProvider, FORECAST_TYPE_PARAM, aggregateHistory, aggregateHistoryByDay, aggregateHistoryDelta, applyThemeVars, callService, callServiceWithTarget, clearPersistentState, computeEnergyKwh, energyDailySeries, energyPeriodHours, energyPeriodLabel, energyPeriodStartMs, fetchCalendarEvents, fetchEntityHistory, fetchEntityStatistics, fetchLogbook, fetchWeatherForecast, getAppHass, logbookCacheMarker, states, useAreaEntities, useAreaName, useAreas, useCalendarEvents, useDarkMode, useDashboardScope, useDashboardState, useEnergy, useEntities, useEntitiesByDomain, useEntitiesByLabel, useEntity, useEntityAge, useEntityAttribute, useEntityHistory, useEntityHistoryPending, useEntityRegistry, useEntityState, useEntityStatistics, useHassReady, useIsMobile, useLabels, useLogbook, usePersistentState, useSun, useTemplate, useTheme, useTime, useWeatherForecast
```

## Layout (`@ha/layout`)

```
PageShell, ResponsiveGrid, RoutedPageShell, Row, Stack, Tabs, useHashRoute
```

`import { PageShell, ResponsiveGrid, RoutedPageShell, Row, Stack, Tabs, useHashRoute } from '@ha/layout';`

## Format (`@ha/format`)

```
batteryColor, brightness, colorTemp, deviceClassIcon, duration, energy, entityAgeLabel, entityAgeMs, entityDisplayName, entityDisplayNameForId, euro, forecastDayLabel, greeting, isAvailable, num, pct, power, relativeTime, stateColor, stateLabel, stateNumber, temp, weatherIcon
```

## Charts (`@ha/ui`)

```
HistoryChart, SparkChart
```

`import { ActionButton, AlarmPanel, BatteryRow, BinaryBadge, CalendarCard, CameraTile, ClimateCard, CounterCard, CoverCard, DeviceCard, DeviceTrackerChip, EnergyDeviceCard, EntityRow, FanCard, Gauge, Grid, HumidifierCard, InputBooleanTile, LightTile, LiveClock, LockCard, MediaPlayerCard, Minitimeline, NumberSlider, PersonChip, RoomCard, SceneButton, ScriptButton, SelectCard, SirenCard, SparkChart, Stat, SunArc, TimerCard, UpdateCard, VacuumCard, ValueOrb3D, ValveCard, WaterHeaterCard, WeatherCard, WeatherForecastRow } from '@ha/ui';`
