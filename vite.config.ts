import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { dashboardDevPlugin } from './scripts/dashboard-dev-plugin.mjs';

// Two modes from one config:
//  - `vite`         → dev server using index.html + src/dev.tsx (live HA over WebSocket)
//  - `vite build`   → panel bundle copied to custom_components/homeassistant_dashboard_studio/
//
// CSS is imported as `?inline` strings (src/mount.tsx) and injected into the
// panel's shadow root at runtime, so the single bundled JS file stays the only
// asset HACS has to serve — no separate stylesheet, and the styles actually
// reach the panel inside Home Assistant's shadow DOM.
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const hassUrl = env.VITE_HASS_URL?.replace(/\/+$/, '');
  const hassToken = env.VITE_HASS_TOKEN;

  return {
    plugins: [react(), ...(command === 'serve' ? [dashboardDevPlugin()] : [])],
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
    // Vite's lib mode does NOT replace process.env.NODE_ENV (it assumes a
    // downstream bundler will). But we ship a finished, self-contained file, so
    // we must force React's production build ourselves — otherwise the dev build
    // (~5x larger, full of warnings) gets bundled. Only for `build`, so dev keeps
    // React's development build and proper warnings.
    define:
      command === 'build'
        ? { 'process.env.NODE_ENV': JSON.stringify('production') }
        : {},
    build: {
      target: 'esnext',
      outDir: 'dist',
      emptyOutDir: true,
      // Single self-contained bundle — copied to custom_components/ by scripts/copy-dashboard.mjs
      lib: {
        entry: 'src/panel.tsx',
        formats: ['es'],
        fileName: () => 'dashboard.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  };
});
