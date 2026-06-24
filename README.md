# React Dashboard Studio für Home Assistant

![Home Assistant Custom Panel](https://img.shields.io/badge/Home%20Assistant-Custom%20Panel-41BDF5?style=for-the-badge&logo=home-assistant&logoColor=white)
![HACS Dashboard](https://img.shields.io/badge/HACS-Dashboard-9D4EDD?style=for-the-badge)

Ein **Custom Panel** für Home Assistant, in dem du dein Dashboard **direkt in HA
mit React programmierst** – wie der normale Dashboard-Editor, nur mit voller
Code-Freiheit (JSX, eigenes CSS, deine Komponenten). Installierbar über **HACS**.

Kein lokales Node, kein Build, kein Re-Deploy: Du tippst React, ein Transpiler im
Browser (Sucrase) macht daraus live JS, die Vorschau aktualisiert sich sofort,
und dein Code wird **in Home Assistant gespeichert**.

---

## Workflow für dich als Nutzer

1. Panel über HACS installieren + einmal in `configuration.yaml` registrieren (siehe unten).
2. In der Seitenleiste auf **„Dashboard Studio"** klicken.
3. Oben rechts **„✎ Bearbeiten"** → links Datei-Panel + Code-Editor, rechts die Live-Vorschau.
4. React schreiben. Sensoren holst du dir als reaktive Variablen:
   ```tsx
   import { useEntity, callService } from '@ha';
   import { Card, Stat, Section } from '@ha/ui';
   import { num } from '@ha/format';

   export default function Dashboard() {
     const temp = useEntity('sensor.aussentemperatur');
     return <Stat label="Außen" value={num(temp?.state)} unit="°C" />;
   }
   ```
5. **Strg/⌘ + S** speichert in HA. **„◀ Ansicht"** zeigt das Dashboard im Vollbild.

### Mehrere Dateien (modulare Codebasis)

Im Datei-Panel legst du beliebig viele Dateien an (z. B. `components/Karte.tsx`) und
importierst sie relativ – wie in einem echten Projekt:

```tsx
import { Overview } from './components/Overview';
```

Die Einstiegsdatei (⌂) braucht die Komponente als `export default`; alle anderen
exportierst du normal (`export function …`). Das ganze Projekt wird zusammen in HA gespeichert.

### Sensoren & Aktionen einfügen

Klick auf **„⚡ Sensor / Aktion"** öffnet eine durchsuchbare Liste deiner echten
Entities. Wähle den Einfügemodus und klick auf einen Eintrag – das passende Snippet
landet am Cursor:

| Modus | fügt ein |
| --- | --- |
| **Wert** | `useEntity('sensor.aussentemperatur')?.state` |
| **Aktion** | `callService('light', 'toggle', { entity_id: 'light.kino' })` |
| **nur ID** | `'sensor.aussentemperatur'` |

### Eingebaute API (per `import` verfügbar)

| Modul | Inhalt |
| --- | --- |
| `@ha` | `useEntity`, `useEntityState`, `useEntitiesByDomain`, `useHassReady`, `callService`, `states` |
| `@ha/ui` | `Card`, `Stat`, `Section`, `RoomCard`, `DeviceCard`, `BatteryRow` |
| `@ha/format` | `num`, `euro`, `isAvailable`, `stateNumber`, `weatherIcon`, `greeting`, `batteryColor` |
| `react` | das volle React (Hooks, `useState`, …) |

> Sucrase transpiliert nur (kein Bundler). Du nutzt also die hier bereitgestellten
> Module – beliebige npm-Pakete `import`en geht in diesem Modus nicht.

---

## Installation in Home Assistant (HACS)

> **Hinweis:** Im Gegensatz zu Integrations-Repos (z. B. DeepSeek Conversation) ist dies ein
> **HACS-Dashboard-Plugin** (Frontend). Es gibt kein `custom_components`-Verzeichnis und kein
> Integrations-Icon in *Einstellungen → Geräte & Dienste* — stattdessen registrierst du das
> Panel einmalig in `configuration.yaml`.

1. **HACS** → ⋮ → **Custom repositories** → URL dieses Repos, Kategorie **Dashboard** → installieren.
   (HACS lädt `dashboard.js` aus dem `dist/`-Ordner bzw. aus GitHub-Release-Assets.)
2. **Repository-Name merken:** Der Pfad lautet `/hacsfiles/<repo-name>/dashboard.js`, wobei
   `<repo-name>` der **GitHub-Repository-Name in Kleinbuchstaben** ist (z. B. `react-dashboard-studio`).
   Nach der Installation zeigt HACS den exakten Pfad in den Repository-Details.
3. Einmalig in `configuration.yaml` (danach HA neu starten) — siehe auch [`examples/panel_custom.yaml`](examples/panel_custom.yaml):
   ```yaml
   panel_custom:
     - name: react-dashboard-studio-panel  # MUSS dem Custom-Element-Tag entsprechen
       sidebar_title: Dashboard Studio
       sidebar_icon: mdi:react
       url_path: react-dashboard-studio
       module_url: /hacsfiles/react-dashboard-studio/dashboard.js
   ```

Dein Dashboard-Code wird pro HA-Benutzer über `frontend/user_data` gespeichert.

---

## Das Panel selbst weiterentwickeln (optional)

Nur nötig, wenn du die *eingebaute API* oder das Studio selbst erweitern willst –
für normales Dashboard-Bauen brauchst du das nicht.

```bash
npm install
cp .env.local.example .env.local   # HA-URL + Long-Lived-Token eintragen
npm run dev                        # Studio lokal, verbunden mit echter HA
npm run build                      # → dist/dashboard.js (eine Datei für HACS)
```

### Struktur

```
src/
├─ panel.tsx              Custom-Element für HA (Prod-Entry) → rendert Studio
├─ dev.tsx                Lokaler Entry: verbindet via WebSocket mit echter HA
├─ studio/
│  ├─ Studio.tsx          Shell: Datei-Panel + Editor + Vorschau + Speichern
│  ├─ Editor.tsx          CodeMirror
│  ├─ FilePanel.tsx       Datei-Liste (anlegen/umbenennen/löschen/Einstieg)
│  ├─ EntityInserter.tsx  Sensor/Aktion-Sucher → Snippet am Cursor
│  ├─ Preview.tsx         Rendert deinen Code + Error-Boundary
│  ├─ compile.ts          Sucrase + Modul-Resolver (Multi-File, im Browser)
│  ├─ runtime.ts          Registry der `import`-baren Module (@ha, …)
│  ├─ storage.ts          Projekt speichern/laden via Home Assistant
│  └─ project.ts          Projekt-Typ, Default-Projekt, Pfad-Helfer
├─ hass/                  Sensor-Schicht (Store + Hooks) — die eingebaute API
├─ components/widgets.tsx Mitgelieferte UI-Komponenten (@ha/ui)
└─ lib/format.ts          Formatierungs-Helfer (@ha/format)
```

Neue API ergänzen = in `widgets.tsx`/`format.ts`/`hooks.ts` exportieren und in
[`runtime.ts`](src/studio/runtime.ts) der passenden Registry zuordnen.
