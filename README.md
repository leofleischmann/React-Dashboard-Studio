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
| **Entities einfügen** | **⚡ Sensor / Aktion** — Wert / Aktion / ID / **Widget** (Entities + **Galerie**), Domain-Filter |
| **Importierbare Module** | `@ha`, `@ha/ui`, `@ha/layout`, `@ha/format`, `react` — keine beliebigen npm-Pakete |
| **Erstinstallation** | SDK-Referenz aus `default-dashboard/` (Tabs: Start, Widgets, Layout) — ersetzbar via ✎ Bearbeiten |
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

**Windows:** `studio.bat` — interaktives Menü für alle npm-Befehle.

| Befehl | Wann |
| --- | --- |
| `npm run dev` | Nur **Live-Vorschau** + **⚡ Entities** (Snippet kopieren) · Code in VS Code |
| `npm run sync:watch` | Optional parallel: Push (mit Compile-Check) bei jedem Speichern |
| `npm run sync:pull` / `sync:push` | Laden / Hochladen · `pull` prüft lokal + warnt bei Konflikten |
| `npm run check:dashboard` | `./dashboard/` manuell auf Compile-Fehler prüfen |
| `npm run dev:default` | Live-Vorschau des **HACS-Start-Dashboards** (`default-dashboard/`) |
| `npm run check:default` | `default-dashboard/` auf Compile-Fehler prüfen |
| `npm run gen:types` | Manuell: Entity-Liste (läuft automatisch bei `sync:pull`) |

**Typischer Ablauf:** Terminal 1 → `npm run dev` (Vorschau) · VS Code → `./dashboard/` · Terminal 2 optional → `npm run sync:watch` (Push inkl. Löschen entfernter Dateien in HA).

Oben **📁 dashboard/** = lokaler Modus (nur Entwicklung, Ordner ist **gitignored** — dein persönliches Projekt, nicht das HACS-Start-Dashboard). **⚡ Entities** öffnet den Browser zum Kopieren von Snippets. `sync:pull` validiert `./dashboard/` vor dem Laden und warnt, wenn lokale Änderungen noch nicht gepusht wurden.

Release-Notes pro Version: [`CHANGELOG.md`](CHANGELOG.md) (erscheinen in HACS als GitHub-Release).

---

## API-Referenz (Kurz)

| Modul | Inhalt |
| --- | --- |
| `@ha` | `useEntity`, `useEntityHistory`, `useEntityStatistics`, `useAreas`, `useTheme`, `callService`, … |
| `@ha/ui` | `Stat`, `SparkChart`, `LightTile`, `ClimateCard`, `PageShell`-Widgets, Domain-Cards, … |
| `@ha/layout` | `PageShell`, `Tabs`, `Stack`, `Row`, `ResponsiveGrid`, `useHashRoute` |
| `@ha/format` | `num`, `temp`, `stateLabel`, `relativeTime`, `entityDisplayName`, … |
| `react` | React inkl. Hooks |

Details & Changelog: [`CHANGELOG.md`](CHANGELOG.md).

---

## Optional: Panel selbst erweitern

Nur wenn du **diese Integration** (Editor, API, Widgets) weiterentwickelst — nicht für normales Dashboard-Bauen:

```bash
npm run build   # → custom_components/homeassistant_dashboard_studio/dashboard.js
```

Neue Exports in `src/sdk/` (Hooks, UI, Layout, Format) und in [`src/sdk/runtime.ts`](src/sdk/runtime.ts) registrieren. Das Start-Dashboard liegt in [`default-dashboard/`](default-dashboard/) — nach Änderungen `npm run embed:default` (läuft automatisch bei `npm run build`).

---
