# <img src="https://raw.githubusercontent.com/leofleischmann/Home-Assistant-Dashboard-Studio/main/images/icon.png" width="36" align="top" alt=""> Home Assistant Dashboard Studio für Home Assistant

![Home Assistant Dashboard Studio — Code-Editor mit Live-Vorschau](https://raw.githubusercontent.com/leofleischmann/Home-Assistant-Dashboard-Studio/main/images/preview.png)

React-Dashboard als **Custom Panel** in Home Assistant: JSX schreiben, live im Browser ansehen, in HA speichern. Installierbar über **HACS** — für normale Nutzung brauchst du **kein Node.js** auf dem Rechner.

---

## Installation (HACS)

1. **HACS → Integrations → ⋮ → Custom repositories**
   - URL: `https://github.com/leofleischmann/Home-Assistant-Dashboard-Studio`
   - Kategorie: **Integration** (nicht Dashboard)
2. **HACS → Integrations** → **Home Assistant Dashboard Studio** → Download → **Home Assistant neu starten**
3. **Einstellungen → Geräte & Dienste → Integration hinzufügen** → **Home Assistant Dashboard Studio**

Kein Eintrag in der `configuration.yaml` nötig. Dein Dashboard-Code wird in HA gespeichert und überlebt HACS-Updates sowie normale Backups.

---

## Dashboard bauen (in Home Assistant)

1. Sidebar → **Dashboard Studio**
2. **✎ Bearbeiten** — links Dateien & Editor, rechts Live-Vorschau
3. **Strg/⌘ + S** speichert · **◀ Ansicht** zeigt das Dashboard im Vollbild

```tsx
import { useEntity } from '@ha';
import { Stat } from '@ha/ui';
import { num } from '@ha/format';

export default function Dashboard() {
  const temp = useEntity('sensor.aussentemperatur');
  return <Stat label="Außen" value={num(temp?.state)} unit="°C" />;
}
```

| Thema | Kurz |
| --- | --- |
| **Mehrere Dateien** | Im Datei-Panel anlegen, z. B. `components/Karte.tsx`, per `./…` importieren. ⌂ = Einstiegsdatei |
| **Entities einfügen** | **⚡ Sensor / Aktion** — Domain-Filter, suchen, Snippet einfügen |
| **Importierbare Module** | `@ha`, `@ha/ui`, `@ha/format`, `react` — keine beliebigen npm-Pakete |
| **Mobil** | Nur Anzeige, kein Editor |

---

## Optional: VS Code + Live-Vorschau

**Für wen:** Du willst in **VS Code** (Git, Autocomplete) arbeiten, aber echte Sensorwerte aus HA sehen — ohne das Studio in HA parallel offen zu haben.

**Voraussetzung:** Dieses Repo **von GitHub klonen** (nicht der HACS-Download). Node.js installiert.

```bash
npm install
cp .env.local.example .env.local   # VITE_HASS_URL + VITE_HASS_TOKEN eintragen
npm run sync:pull                  # Dashboard aus HA → ./dashboard/ (+ gen:types)
```

Token: HA → Profil → **Sicherheit** → **Long-Lived Access Tokens** → erstellen.

| Befehl | Wann |
| --- | --- |
| `npm run dev` | Nur **Live-Vorschau** (kein Browser-Editor) — Code in VS Code unter `./dashboard/` |
| `npm run sync:watch` | Optional parallel: jede Speicherung in VS Code wird zu HA hochladen |
| `npm run sync:pull` / `sync:push` | Einmalig laden bzw. hochladen (`pull` generiert auch `ENTITIES.md`) |
| `npm run gen:types` | Manuell: Entity-Liste für VS Code (läuft automatisch bei `sync:pull`) |

**Typischer Ablauf:** Terminal 1 → `npm run dev` (Vorschau) · VS Code → `./dashboard/` · Terminal 2 optional → `npm run sync:watch` (Push inkl. Löschen entfernter Dateien in HA).

Oben **📁 dashboard/** = lokaler Modus. Der Dev-Server zeigt **keinen Editor** — bearbeiten nur in VS Code.

---

## Optional: Panel selbst erweitern

Nur wenn du **diese Integration** (Editor, API, Widgets) weiterentwickelst — nicht für normales Dashboard-Bauen:

```bash
npm run build   # → custom_components/homeassistant_dashboard_studio/dashboard.js
```

Neue Exports in `hooks.ts` / `widgets.tsx` / `format.ts` und in [`runtime.ts`](src/studio/runtime.ts) registrieren.

---

## API-Referenz

| Modul | Inhalt |
| --- | --- |
| `@ha` | `useEntity`, `useEntityState`, `useEntitiesByDomain`, `useHassReady`, `callService`, `states` |
| `@ha/ui` | `Card`, `Stat`, `Section`, `Grid`, `EntityRow`, `Gauge`, `ActionButton`, `ClimateCard`, `BinaryBadge`, `LightTile`, `RoomCard`, `DeviceCard`, `BatteryRow` |
| `@ha/format` | `num`, `euro`, `isAvailable`, `stateNumber`, `weatherIcon`, `greeting`, `batteryColor` |
| `react` | React inkl. Hooks |
