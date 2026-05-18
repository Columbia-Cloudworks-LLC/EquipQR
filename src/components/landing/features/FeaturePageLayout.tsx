import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import LandingHeader from '@/components/landing/LandingHeader';
import LegalFooter from '@/components/layout/LegalFooter';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  buildBreadcrumbListSchema,
  buildFaqPageSchema,
  buildHowToSchema,
} from '@/lib/structuredData';
import { getFeatureSeoByPath } from '@/pages/features/data/featureSeoContent';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const MAIN_FOCUS_RING =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

interface FeaturePageLayoutProps {
  children: ReactNode;
}

export const FeaturePageLayout = ({ children }: FeaturePageLayoutProps) => {
  const { pathname } = useLocation();
  const seo = getFeatureSeoByPath(pathname);
  const slug =
    pathname
      .replace(/^\//, '')
      .replace(/\//g, '-')
      .replace(/[^a-z0-9-]/gi, '') || 'feature';

  const breadcrumbItems = seo
    ? ([
        { name: 'Home', path: '/' },
        { name: 'Features', path: '/#features' },
        { name: seo.breadcrumbLabel, path: seo.path },
      ] as const)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main id="main-content" tabIndex={-1} className={MAIN_FOCUS_RING}>
        {breadcrumbItems ? (
          <>
            <nav
              aria-label="Breadcrumb"
              className="border-b border-border/60 bg-background/90 backdrop-blur-sm"
            >
              <div className="container px-4 mx-auto pt-28 pb-3">
                <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <li>
                    <Link
                      to="/"
                      className="text-foreground hover:underline font-medium"
                    >
                      Home
                    </Link>
                  </li>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 opacity-60"
                    aria-hidden
                  />
                  <li>
                    <Link to="/#features" className="hover:text-foreground hover:underline">
                      Features
                    </Link>
                  </li>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 opacity-60"
                    aria-hidden
                  />
                  <li className="text-foreground font-medium" aria-current="page">
                    {seo.breadcrumbLabel}
                  </li>
                </ol>
              </div>
            </nav>
            <JsonLd
              id={`breadcrumb-${slug}`}
              data={buildBreadcrumbListSchema([...breadcrumbItems])}
            />
          </>
        ) : null}

        {children}

        {seo?.faq?.length ? (
          <section
            className="border-t border-border bg-muted/20 py-16"
            aria-labelledby={`${slug}-faq-heading`}
          >
            <JsonLd id={`faq-${slug}`} data={buildFaqPageSchema(seo.faq)} />
            <div className="container px-4 mx-auto max-w-3xl">
              <h2
                id={`${slug}-faq-heading`}
                className="text-2xl font-bold text-foreground mb-6"
              >
                Frequently asked questions
              </h2>
              <Accordion type="single" collapsible className="w-full">
                {seo.faq.map((item, i) => (
                  <AccordionItem key={`${slug}-faq-${i}`} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left text-foreground">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        ) : null}

        {seo?.howTo ? (
          <JsonLd
            id={`howto-${slug}`}
            data={buildHowToSchema(
              seo.howTo.name,
              seo.howTo.description,
              seo.howTo.steps
            )}
          />
        ) : null}
      </main>
      <LegalFooter />
    </div>
  );
};
