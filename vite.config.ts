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
}));
