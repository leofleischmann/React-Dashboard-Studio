# Dashboard Studio MCP Server

Lokaler [MCP](https://modelcontextprotocol.io)-Server für Cursor und andere KI-Tools. Stellt die **SDK-Referenz** und **live HA-Entities** bereit.

## Voraussetzungen

1. Im Repo-Root: `npm run gen:sdk-reference` (erzeugt `docs/sdk-reference.json`)
2. `.env.local` mit `VITE_HASS_URL` und `VITE_HASS_TOKEN` (für Entity-Tools)

## Installation

```bash
cd mcp-server
npm install
```

## Cursor konfigurieren

In **Cursor Settings → MCP** oder `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "ha-dashboard-studio": {
      "command": "node",
      "args": ["${workspaceFolder}/mcp-server/index.mjs"]
    }
  }
}
```

`${workspaceFolder}` ist der Cursor-Workspace (Repo-Root). Alternativ den absoluten Pfad zu deinem Checkout eintragen.

## Tools

| Tool | Beschreibung |
| --- | --- |
| `get_sdk_reference` | Vollständiges SDK-Manifest (Hooks, Widgets, Layout, Format) |
| `list_widgets` | Alle Widgets mit Snippets |
| `get_widget_snippet` | JSX für Widget-Name oder `entity_id` |
| `list_module_exports` | Exporte von `@ha`, `@ha/ui`, `@ha/layout`, `@ha/format` |
| `search_entities` | Live-Suche in HA |
| `get_entity` | Zustand einer Entity |
| `list_entities_by_domain` | Entities nach Domain |

## SDK-Referenz aktuell halten

```bash
npm run gen:sdk-reference   # nur SDK
npm run gen:all             # SDK + Entity-Typen (mit HA)
npm run sync:pull           # pull + beides automatisch
```

Die generierten Dateien liegen in `docs/` (im Repo) und optional in `dashboard/` (lokal, gitignored).
