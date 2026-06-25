# <img src="https://raw.githubusercontent.com/leofleischmann/Home-Assistant-Dashboard-Studio/main/images/icon.png" width="36" align="top" alt=""> Home Assistant Dashboard Studio

![Preview](https://raw.githubusercontent.com/leofleischmann/Home-Assistant-Dashboard-Studio/main/images/preview.png)

## The problem

Home Assistant dashboards are great for quick cards, but painful when you want **real UI code**: reusable components, live entity data, charts, and layouts you fully control. YAML and card stacks hit a ceiling fast.

## The solution

**Home Assistant Dashboard Studio** is a Home Assistant **custom panel** with a built-in code editor and **live preview**. You write JSX against a small SDK (`@ha`, `@ha/ui`, `@ha/layout`, `@ha/format`), save in HA, and run it as a panel — **no Node.js on your HA server**, no `configuration.yaml` entry. Code survives HACS updates and normal backups.

Fresh installs ship a **showcase dashboard** (Widgets, Charts, Hooks, Layout, Format) you can replace anytime.

---

## Install (HACS)

1. **HACS → Integrations → ⋮ → Custom repositories** → `https://github.com/leofleischmann/Home-Assistant-Dashboard-Studio` (category: **Integration**)
2. Install **Home Assistant Dashboard Studio** → restart HA
3. **Settings → Devices & services → Add integration** → **Home Assistant Dashboard Studio**

---

## Build a dashboard (in HA)

1. Sidebar → **Dashboard Studio**
2. **✎ Edit** — files + editor on the left, live preview on the right
3. **Ctrl/⌘ + S** to save · **◀ View** for fullscreen

```tsx
import { useEntity } from '@ha';
import { Stat } from '@ha/ui';
import { num } from '@ha/format';

export default function Dashboard() {
  const temp = useEntity('sensor.outdoor_temperature');
  return <Stat label="Outside" value={num(temp?.state)} unit="°C" />;
}
```

| Topic | Notes |
| --- | --- |
| **Files** | Multi-file projects in the file panel; `./components/Card.tsx` imports work. ⌂ = entry file |
| **Insert entities** | **⚡ Sensor / Action** — value, service, template, ID, or widget snippets + gallery |
| **Modules** | `@ha`, `@ha/ui`, `@ha/layout`, `@ha/format`, `react` only |
| **Mobile** | View-only, no editor |

### SDK (short)

| Module | What you get |
| --- | --- |
| `@ha` | Entity hooks, history, logbook, weather, energy, templates, persistent state, `callService`, … |
| `@ha/ui` | Stats, charts, domain cards, featured widgets (`SunArc`, `Minitimeline`, …) |
| `@ha/layout` | `PageShell`, `Tabs`, grids, routing helpers |
| `@ha/format` | Numbers, labels, time, icons |

Explore the **Hooks**, **Widgets**, and **Format** pages in the default dashboard. [Releases](https://github.com/leofleischmann/Home-Assistant-Dashboard-Studio/releases) for changelog.

---

## Local dev (optional)

Clone this repo (not the HACS zip), use **VS Code + live HA data**:

```bash
npm install
cp .env.local.example .env.local   # VITE_HASS_URL + long-lived token
npm run sync:pull                  # HA → ./dashboard/
npm run dev                        # preview + entity snippets
```

`npm run sync:watch` pushes on save. Windows: `studio.bat`. `./dashboard/` is gitignored (your project, not the HACS starter).

### SDK reference & AI tools

```bash
npm run gen:sdk-reference   # docs/sdk-reference.json + .md (no HA needed)
npm run gen:all               # SDK reference + entity types (needs .env.local)
```

After `sync:pull`, entity types (`ha-entities.d.ts`, `ENTITIES.md`) and `SDK-REFERENCE.json` land in `./dashboard/` next to your project.

**Cursor MCP** (optional): see [`mcp-server/README.md`](mcp-server/README.md) for live SDK + entity tools in the editor.

---

## Contributing to the panel itself

```bash
npm run build   # → custom_components/homeassistant_dashboard_studio/dashboard.js
```

Register new SDK exports in [`src/sdk/runtime.ts`](src/sdk/runtime.ts). Starter dashboard: [`default-dashboard/`](default-dashboard/).
