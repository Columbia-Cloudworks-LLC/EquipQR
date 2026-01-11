import { defineConfig, PluginOption } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// HTTP request logger plugin for dev server
function httpLogger(): PluginOption {
  return {
    name: 'http-logger',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
          const duration = Date.now() - start;
          console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
        });
        next();
      });
    },
  };
}

// Read package.json version safely at config time
const pkg = JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url), "utf-8"));
const PKG_VERSION = pkg.version || "0.0.0";

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
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://hcaptcha.com https://*.hcaptcha.com https://cdn.gpteng.co https://js.sentry-cdn.com https://maps.googleapis.com https://*.googleapis.com https://*.gstatic.com",
        "style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com https://cdn.gpteng.co https://*.googleapis.com https://*.gstatic.com",
        "frame-src 'self' https://hcaptcha.com https://*.hcaptcha.com",
        "connect-src 'self' https://hcaptcha.com https://*.hcaptcha.com https://lovable-api.com https://*.sentry.io https://*.supabase.co https://*.equipqr.app https://*.vercel.app https://maps.googleapis.com https://*.googleapis.com https://*.gstatic.com wss://*.equipqr.app wss://*.vercel.app wss://localhost:8080 ws://localhost:8080 http://localhost:8080 http://localhost:54321 http://127.0.0.1:54321 http://127.0.0.1:7243",
        "img-src 'self' data: blob: https: https://*.googleapis.com https://*.gstatic.com",
        "font-src 'self' data: https://cdn.gpteng.co",
        "worker-src 'self' blob:"
      ].join("; ")
    }
  },
  plugins: [
    mode === 'development' && httpLogger(),
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React ecosystem - cached long-term, rarely changes
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // TanStack Query - server state management
          'vendor-query': ['@tanstack/react-query'],
          // Form handling
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Radix UI primitives - split into logical groups
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
            '@radix-ui/react-slider',
            '@radix-ui/react-label',
          ],
          'vendor-radix-layout': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-tabs',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
          ],
          // Supabase client
          'vendor-supabase': ['@supabase/supabase-js'],
          // Date utilities
          'vendor-date': ['date-fns', 'date-fns-tz'],
          // Charting - heavy, only loaded on Reports page
          'vendor-charts': ['recharts'],
        },
      },
    },
  },
}));
