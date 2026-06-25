# Changelog

Alle wesentlichen Änderungen an Home Assistant Dashboard Studio. HACS-Updates zeigen die jeweilige Sektion als GitHub-Release-Notes.

## 0.4.0

### Neu in @ha

- **Charts:** `SparkChart`, `HistoryChart`, `useEntityHistory`, `useEntityStatistics`, `aggregateHistory`
- **Registry:** `useAreas`, `useAreaName`, `useEntityRegistry`, `useEntitiesByLabel`, `entityDisplayName` aus Registry
- **Layout-Modul `@ha/layout`:** `PageShell`, `Tabs`, `Stack`, `Row`, `ResponsiveGrid`, `useHashRoute`, `RoutedPageShell`
- **Theme:** `useTheme`, `useDarkMode`, `applyThemeVars`
- **Kalender:** `useCalendarEvents`, `fetchCalendarEvents`
- **Widgets:** `SelectCard`, `LockCard`, `VacuumCard`, `FanCard`, `AlarmPanel`, `CameraTile`, `TimerCard`, `CounterCard`, `SceneButton`, `ScriptButton`, `HumidifierCard`, `WaterHeaterCard`, `ValveCard`, `SirenCard`, `UpdateCard`, `DeviceTrackerChip`, `InputBooleanTile`, `CalendarCard`
- **Format:** `temp`, `pct`, `power`, `energy`, `brightness`, `colorTemp`, `stateLabel`, `stateColor`, `relativeTime`, `duration`, `deviceClassIcon`
- **Hooks:** `useEntityAttribute`, `useEntities`, `useAreaEntities`, `useSun`, `useTime`, `callServiceWithTarget`

### Sonstiges

- **Start-Dashboard:** SDK-Referenz mit Tabs Start / Widgets / Layout (Erstinstallation)
- Dev: Vite-Proxy für HA-REST (`/__ha-api`) — History & Charts ohne CORS in der lokalen Vorschau
- HACS-Releases nutzen diese Datei als Release-Notes

## 0.3.5

### Neu in @ha

- `getAppHass`, `callApi`-Typ für Dev-Panel
- Erste Domain-Widgets (Lock, Vacuum, Fan, …) und History über REST

### Sonstiges

- VS-Code-Workflow `./dashboard/` (gitignored, persönliches Projekt)
- `npm run sync:pull` / `sync:push` mit Validierung

## 0.3.4

### Neu in @ha

- Entity-Inserter, Widget-Galerie, modulares Default-Dashboard (Auto-Discovery)
- `@ha/ui`: `ClimateCard`, `MediaPlayerCard`, `CoverCard`, `WeatherCard`, …

---

Format: [Keep a Changelog](https://keepachangelog.com/) — Versionen folgen `manifest.json`.
