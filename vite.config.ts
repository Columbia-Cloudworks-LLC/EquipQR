import { defineConfig, PluginOption } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import fs from "fs";
import { writeMarketingHtmlFiles } from "./scripts/generate-marketing-html";
import { buildCsp } from "./scripts/csp";

// HTTP request logger plugin for dev server
function httpLogger(): PluginOption {
  return {
    name: 'http-logger',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
          const duration = Date.now() - start;
          // eslint-disable-next-line no-console -- intentional dev-only HTTP logging
          console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
        });
        next();
      });
    },
  };
}

function marketingPrerenderPlugin(): PluginOption {
  return {
    name: 'equipqr-marketing-prerender',
    apply: 'build',
    closeBundle() {
      writeMarketingHtmlFiles();
    },
  };
}

// Read package.json version safely at config time
const pkg = JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url), "utf-8"));
const PKG_VERSION = pkg.version || "0.0.0";

const vendorChunkModules: Record<string, string[]> = {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-query': ['@tanstack/react-query'],
  'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
  'vendor-radix-core': [
    '@radix-ui/react-dialog',
    '@radix-ui/react-popover',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-select',
    '@radix-ui/react-tooltip',
  ],
  'vendor-radix-form': [
    '@radix-ui/react-checkbox',
    '@radix-ui/react-radio-group',
    '@radix-ui/react-switch',
    '@radix-ui/react-label',
  ],
  'vendor-radix-layout': [
    '@radix-ui/react-accordion',
    '@radix-ui/react-collapsible',
    '@radix-ui/react-tabs',
    '@radix-ui/react-scroll-area',
    '@radix-ui/react-separator',
  ],
  'vendor-supabase': ['@supabase/supabase-js'],
  'vendor-date': ['date-fns', 'date-fns-tz'],
  'vendor-charts': ['recharts'],
};

function resolveManualChunk(id: string): string | undefined {
  if (!id.includes('node_modules')) {
    return undefined;
  }

  for (const [chunkName, modules] of Object.entries(vendorChunkModules)) {
    if (modules.some((moduleName) => id.includes(`/node_modules/${moduleName}/`))) {
      return chunkName;
    }
  }

  return undefined;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    // Expose version to the client (prefers env var, falls back to package.json)
    __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION || PKG_VERSION),
  },
  server: {
    host: "::",
    port: 8080,
    headers: {
      "Permissions-Policy": "camera=(self), microphone=(), geolocation=(self)",
      "Content-Security-Policy": buildCsp({ dev: true }),
    }
  },
  plugins: [
    mode === 'development' && httpLogger(),
    react(),
    marketingPrerenderPlugin(),
    // PWA / service worker. We use `injectManifest` mode so we can keep our
    // own custom Push notification handlers (see `src/sw.ts`); generateSW
    // would overwrite them. The output filename MUST stay `sw.js` because
    // `src/main.tsx` and `src/hooks/usePushNotifications.ts` register and
    // resolve the worker by that exact path.
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // Register manually from `src/main.tsx` so we keep control of the
      // registration scope and the periodic update check.
      injectRegister: false,
      // Reuse the existing `public/manifest.webmanifest` rather than letting
      // the plugin generate a new one. Setting `manifest: false` tells
      // vite-plugin-pwa not to emit its own manifest file.
      manifest: false,
      // Disable the SW in dev — we don't want stale precache while editing.
      // Note: push notification subscribe/unsubscribe flows require a live
      // /sw.js registration and cannot be tested in local dev (HTTPS push is
      // not testable locally anyway; production or preview is the intended
      // validation path for push notification flows).
      devOptions: { enabled: false },
      injectManifest: {
        // Keep precache lean: HTML shell, JS, CSS, fonts, and the small icon
        // set. Excludes large images, source maps, and the OG asset which
        // doesn't need to be cached for the app to run.
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        globIgnores: ['**/og-image.png', '**/sw.js.map'],
        // 4 MB ceiling per file to prevent accidental precaching of giant
        // chunks. Anything larger will fail the build with a clear error.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          return resolveManualChunk(id);
        },
      },
    },
  },
}));
