
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProviders } from '@/components/providers/AppProviders';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { RouteAnnouncer } from '@/components/a11y/RouteAnnouncer';
import { publicRouteElements } from '@/routes/PublicRoutes';
import { legacyRedirectRouteElements } from '@/routes/LegacyRedirectRoutes';
import { DashboardRouteLayout } from '@/routes/DashboardRouteLayout';
function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>
        <RouteAnnouncer />
        <ErrorBoundary>
          <Routes>
            {publicRouteElements}
            {legacyRedirectRouteElements}
            <Route path="/dashboard/*" element={<DashboardRouteLayout />} />
          </Routes>
        </ErrorBoundary>
      </AppProviders>
    </BrowserRouter>
  );
}

export default App;
