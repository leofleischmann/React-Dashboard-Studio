import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { dashboardDevPlugin } from './scripts/dashboard-dev-plugin.mjs';
import { panelBundleNames } from './scripts/bundle-names.mjs';

const root = dirname(fileURLToPath(import.meta.url));

// Two modes from one config:
//  - `vite`         → dev server using index.html + src/dev.tsx (live HA over WebSocket)
//  - `vite build`   → dashboard.v<version>.js + studio-editor.v<version>.js in custom_components/
//
// Versioned filenames keep the lazy editor chunk importing the same ES module instance
// as the panel entry (a ?v= query on the entry URL would load React twice and break hooks).
//
// CSS is imported as `?inline` strings (src/mount.tsx) and injected into the
// panel's shadow root at runtime.
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const hassUrl = env.VITE_HASS_URL?.replace(/\/+$/, '');
  const hassToken = env.VITE_HASS_TOKEN;
  const bundles = panelBundleNames();

  return {
    plugins: [react(), ...(command === 'serve' ? [dashboardDevPlugin() as Plugin] : [])],
    server:
      command === 'serve' && hassUrl
        ? {
            proxy: {
              '/__ha-api/': {
                target: hassUrl,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/__ha-api\/?/, '/api/'),
                configure: (proxy) => {
                  if (hassToken) {
                    proxy.on('proxyReq', (proxyReq) => {
                      proxyReq.setHeader('Authorization', `Bearer ${hassToken}`);
                    });
                  }
                },
              },
            },
          }
        : undefined,
    define:
      command === 'build'
        ? { 'process.env.NODE_ENV': JSON.stringify('production') }
        : {},
    build: {
      target: 'esnext',
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: join(root, 'src/panel.tsx'),
        output: {
          format: 'es',
          entryFileNames: bundles.dashboard,
          // Single async chunk — CodeMirror/FilePanel load on ✎ Bearbeiten (or dev entity browser).
          chunkFileNames: bundles.studioEditor,
        },
      },
    },
  };
});
