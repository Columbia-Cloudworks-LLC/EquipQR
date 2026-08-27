import { useEffect, type JSX } from 'react';
import { Link, useLocation } from 'react-router-dom';
import LandingHeader from '@/components/landing/LandingHeader';
import { PageBackButton } from '@/components/layout/PageBackButton';
import LegalFooter from '@/components/layout/LegalFooter';
import { PageSEO } from '@/components/seo/PageSEO';
import { Button } from '@/components/ui/button';

function NotFound(): JSX.Element {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <>
      <PageSEO
        title="Page not found"
        description="The requested EquipQR page could not be found."
        noindex
      />
      <div className="flex min-h-screen flex-col bg-background">
        <LandingHeader />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <section className="relative bg-linear-to-br from-background via-background to-primary/5 pb-16 pt-32">
            <div className="container mx-auto px-4">
              <div className="mx-auto max-w-3xl">
                <PageBackButton className="mb-6" />
                <div className="rounded-3xl border border-border/60 bg-card/80 px-6 py-12 text-center shadow-xs sm:px-10">
                  <p className="text-sm font-medium uppercase tracking-wide text-primary">404</p>
                  <h1
                    data-route-heading="true"
                    tabIndex={-1}
                    className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
                  >
                    Page not found
                  </h1>
                  <p className="mt-4 text-base text-muted-foreground sm:text-lg">
                    We couldn&apos;t find the public EquipQR page at{' '}
                    <span className="font-mono text-sm text-foreground">{location.pathname}</span>.
                    Check the address or jump back to a known page.
                  </p>
                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Button asChild>
                      <Link to="/">Return home</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/releases">View releases</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
        <LegalFooter contextAware={false} />
      </div>
    </>
  );
}

export default NotFound;

