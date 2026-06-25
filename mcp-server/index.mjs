#!/usr/bin/env node
/**
 * Local MCP server for Home Assistant Dashboard Studio.
 * Serves SDK reference (docs/sdk-reference.json) + live HA entity data.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  createConnection,
  createLongLivedTokenAuth,
  getStates,
} from 'home-assistant-js-websocket';
import WebSocket from 'ws';

globalThis.WebSocket = WebSocket;

const MCP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const REPO_ROOT = resolve(MCP_ROOT, '..');

function loadEnv() {
  const env = { ...process.env };
  const envPath = join(REPO_ROOT, '.env.local');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (m && !line.trim().startsWith('#')) {
        env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
      }
    }
  }
  return env;
}

function loadSdkReference() {
  const candidates = [
    join(REPO_ROOT, 'docs', 'sdk-reference.json'),
    join(REPO_ROOT, 'dashboard', 'SDK-REFERENCE.json'),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      return { path, data: JSON.parse(readFileSync(path, 'utf8')) };
    }
  }
  throw new Error(
    'SDK-Referenz nicht gefunden. Bitte zuerst `npm run gen:sdk-reference` im Repo-Root ausführen.',
  );
}

let haConnection = null;
let haStatesCache = null;
let haStatesFetchedAt = 0;
const HA_CACHE_MS = 30_000;

async function getHaConnection() {
  if (haConnection) return haConnection;
  const env = loadEnv();
  const hassUrl = (env.VITE_HASS_URL ?? '').replace(/\/+$/, '');
  const token = env.VITE_HASS_TOKEN ?? '';
  if (!hassUrl || !token) {
    throw new Error(
      'HA nicht konfiguriert. Setze VITE_HASS_URL und VITE_HASS_TOKEN in .env.local.',
    );
  }
  const auth = createLongLivedTokenAuth(hassUrl, token);
  haConnection = await createConnection({ auth });
  console.error('[Debug ha-dashboard-studio-mcp]: HA verbunden');
  return haConnection;
}

async function getHaStates(force = false) {
  const now = Date.now();
  if (!force && haStatesCache && now - haStatesFetchedAt < HA_CACHE_MS) {
    return haStatesCache;
  }
  const conn = await getHaConnection();
  haStatesCache = await getStates(conn);
  haStatesFetchedAt = now;
  return haStatesCache;
}

function searchEntities(states, query, limit = 25, domain) {
  const q = query.trim().toLowerCase();
  let list = states;
  if (domain) {
    list = list.filter((e) => e.entity_id.startsWith(`${domain}.`));
  }
  if (!q) return list.slice(0, limit);
  return list
    .filter((e) => {
      const name = (e.attributes?.friendly_name ?? '').toLowerCase();
      return e.entity_id.toLowerCase().includes(q) || name.includes(q);
    })
    .slice(0, limit);
}

function entityWidgetSnippet(ref, entityId) {
  const domain = entityId.split('.')[0];
  const widget =
    ref.domainDefaultWidgets?.[domain] ??
    ref.widgets?.find((w) => w.domains?.includes(domain))?.name ??
    'EntityRow';
  return `<${widget} entityId="${entityId}" />`;
}

const sdk = loadSdkReference();

const server = new Server(
  {
    name: 'home-assistant-dashboard-studio',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_sdk_reference',
      description:
        'Full SDK manifest: modules, hooks, widgets, layout, format, entity inserter modes.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'list_widgets',
      description: 'List all dashboard widgets with domains and example snippets.',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['domain', 'featured', 'composite'],
            description: 'Optional filter by widget category.',
          },
        },
      },
    },
    {
      name: 'get_widget_snippet',
      description: 'Get JSX snippet for a widget name or entity_id.',
      inputSchema: {
        type: 'object',
        properties: {
          widget: { type: 'string', description: 'Widget component name, e.g. LightTile.' },
          entity_id: { type: 'string', description: 'HA entity id — picks widget by domain if widget omitted.' },
        },
      },
    },
    {
      name: 'list_module_exports',
      description: 'List exported symbols for @ha, @ha/ui, @ha/layout, or @ha/format.',
      inputSchema: {
        type: 'object',
        properties: {
          module: {
            type: 'string',
            enum: ['@ha', '@ha/ui', '@ha/layout', '@ha/format'],
          },
        },
        required: ['module'],
      },
    },
    {
      name: 'search_entities',
      description: 'Search live Home Assistant entities (requires .env.local).',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search in entity_id or friendly_name.' },
          domain: { type: 'string', description: 'Optional domain filter, e.g. sensor.' },
          limit: { type: 'number', description: 'Max results (default 25).' },
        },
      },
    },
    {
      name: 'get_entity',
      description: 'Get current state and attributes for one entity_id.',
      inputSchema: {
        type: 'object',
        properties: {
          entity_id: { type: 'string' },
        },
        required: ['entity_id'],
      },
    },
    {
      name: 'list_entities_by_domain',
      description: 'List entities for a HA domain.',
      inputSchema: {
        type: 'object',
        properties: {
          domain: { type: 'string' },
          limit: { type: 'number' },
        },
        required: ['domain'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const ref = sdk.data;

  try {
    if (name === 'get_sdk_reference') {
      return {
        content: [{ type: 'text', text: JSON.stringify(ref, null, 2) }],
      };
    }

    if (name === 'list_widgets') {
      const category = args?.category;
      const widgets = category
        ? ref.widgets.filter((w) => w.category === category)
        : ref.widgets;
      return {
        content: [{ type: 'text', text: JSON.stringify(widgets, null, 2) }],
      };
    }

    if (name === 'get_widget_snippet') {
      const entityId = args?.entity_id;
      const widgetName = args?.widget;
      if (widgetName) {
        const entry = ref.widgets.find((w) => w.name === widgetName);
        if (!entry) {
          return {
            content: [{ type: 'text', text: `Widget "${widgetName}" nicht gefunden.` }],
            isError: true,
          };
        }
        const example = entityId
          ? `<${entry.name} entityId="${entityId}" />`
          : entry.snippet?.example;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { widget: entry.name, snippet: example, importHint: ref.importHints?.widgets },
                null,
                2,
              ),
            },
          ],
        };
      }
      if (!entityId) {
        return {
          content: [{ type: 'text', text: 'Bitte widget oder entity_id angeben.' }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                entity_id: entityId,
                snippet: entityWidgetSnippet(ref, entityId),
                importHint: ref.importHints?.widgets,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    if (name === 'list_module_exports') {
      const mod = ref.modules.find((m) => m.id === args?.module);
      if (!mod) {
        return {
          content: [{ type: 'text', text: `Modul "${args?.module}" nicht gefunden.` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(mod.exports, null, 2) }],
      };
    }

    if (name === 'search_entities') {
      const states = await getHaStates();
      const results = searchEntities(
        states,
        args?.query ?? '',
        args?.limit ?? 25,
        args?.domain,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      };
    }

    if (name === 'get_entity') {
      const states = await getHaStates();
      const entity = states.find((e) => e.entity_id === args?.entity_id);
      if (!entity) {
        return {
          content: [{ type: 'text', text: `Entity "${args?.entity_id}" nicht gefunden.` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(entity, null, 2) }],
      };
    }

    if (name === 'list_entities_by_domain') {
      const states = await getHaStates();
      const domain = args?.domain;
      const limit = args?.limit ?? 50;
      const results = states
        .filter((e) => e.entity_id.startsWith(`${domain}.`))
        .slice(0, limit);
      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      };
    }

    return {
      content: [{ type: 'text', text: `Unbekanntes Tool: ${name}` }],
      isError: true,
    };
  } catch (err) {
    console.error(`[Debug ha-dashboard-studio-mcp]: Tool ${name} fehlgeschlagen:`, err.message);
    return {
      content: [{ type: 'text', text: err.message }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[Debug ha-dashboard-studio-mcp]: Bereit (SDK: ${sdk.path})`);
