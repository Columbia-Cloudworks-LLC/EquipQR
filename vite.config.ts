import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://hcaptcha.com https://*.hcaptcha.com https://cdn.gpteng.co https://js.sentry-cdn.com",
        "style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com https://cdn.gpteng.co",
        "frame-src 'self' https://hcaptcha.com https://*.hcaptcha.com",
        "connect-src 'self' https://hcaptcha.com https://*.hcaptcha.com https://lovable-api.com https://*.sentry.io https://ymxkzronkhwxzcdcbnwq.supabase.co https://*.equipqr.app wss://*.equipqr.app wss://localhost:* ws://localhost:*",
        "img-src 'self' data: https:",
        "font-src 'self' data: https://cdn.gpteng.co",
        "worker-src 'self' blob:"
      ].join("; ")
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
