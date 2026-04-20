import { createRoot } from 'react-dom/client'
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
import App from './App.tsx'
import './index.css'
import { initConsoleErrorCapture } from '@/features/tickets/utils/consoleErrorBuffer';
import { ErrorBoundary } from '@/components/ui/error-boundary';

// Initialize console error capture for bug report diagnostics
// Must run before React renders so we capture errors during startup
initConsoleErrorCapture();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// Register service worker for PWA push notifications
// Only register in production or when explicitly enabled
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('[SW] Service worker registered:', registration.scope);
      }
      
      // Check for updates periodically (every hour)
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
    } catch (error) {
      // Service worker registration failed - non-critical for app functionality
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn('[SW] Service worker registration failed:', error);
      }
    }
  });
}
