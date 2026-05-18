import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from '@/components/ui/external-link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const CONTACT_EMAIL = 'mailto:nicholas.king@columbiacloudworks.com';
const GITHUB_REPO_URL = 'https://github.com/Columbia-Cloudworks-LLC/EquipQR';
const EQUIPQR_APP_URL = 'https://equipqr.app';
const COLUMBIA_CLOUDWORKS_URL = 'https://columbiacloudworks.com';

interface FooterLinkItem {
  href: string;
  label: string;
  type: 'hash' | 'route' | 'external';
  showIcon?: boolean;
}

interface FooterSection {
  title: string;
  links: FooterLinkItem[];
}

const footerSections: FooterSection[] = [
  {
    title: 'Product',
    links: [
      { href: '#features', label: 'Features', type: 'hash' },
      { href: '#pricing', label: 'Pricing', type: 'hash' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '#about', label: 'About', type: 'hash' },
      {
        href: COLUMBIA_CLOUDWORKS_URL,
        label: 'Columbia Cloudworks',
        type: 'external',
      },
      { href: CONTACT_EMAIL, label: 'Contact', type: 'hash' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/terms-of-service', label: 'Terms', type: 'route' },
      { href: '/privacy-policy', label: 'Privacy', type: 'route' },
      { href: '/do-not-sell-or-share', label: 'Do Not Sell or Share', type: 'route' },
    ],
  },
  {
    title: 'Connect',
    links: [
      {
        href: 'https://calendly.com/nicholas-king-columbiacloudworks/30min',
        label: 'Schedule a Demo',
        type: 'external',
      },
      { href: EQUIPQR_APP_URL, label: 'EquipQR™.app', type: 'external' },
      {
        href: GITHUB_REPO_URL,
        label: 'GitHub',
        type: 'external',
        showIcon: true,
      },
    ],
  },
];

function renderFooterLink(item: FooterLinkItem, className: string) {
  if (item.type === 'route') {
    return (
      <Link to={item.href} className={className}>
        {item.label}
      </Link>
    );
  }

  if (item.type === 'external') {
    return (
      <ExternalLink
        href={item.href}
        className={className}
        showIcon={item.showIcon ?? false}
      >
        {item.label}
      </ExternalLink>
    );
  }

  return (
    <a href={item.href} className={className}>
      {item.label}
    </a>
  );
}

const LandingFooter = () => {
  const currentYear = new Date().getFullYear();
  const footerLinkClassName =
    'block min-h-[44px] py-3 text-sm text-muted-foreground transition-colors hover:text-foreground';

  return (
    <footer className="border-t border-border bg-background/50 backdrop-blur-sm mt-auto">
      <nav
        className="container mx-auto px-4 py-8 sm:py-10"
        aria-label="Footer navigation"
      >
        <p className="text-sm text-muted-foreground max-w-xl mb-8">
          EquipQR helps teams track equipment, manage work orders, and run operations from one platform. Built for repair shops, rental ops, and field crews.
        </p>
        <div className="sm:hidden">
          <Accordion
            type="multiple"
            className="rounded-2xl border border-border/60 bg-background/30 px-4"
          >
            {footerSections.map((section) => (
              <AccordionItem key={section.title} value={section.title}>
                <AccordionTrigger className="min-h-[52px] py-4 text-sm font-semibold text-foreground hover:no-underline">
                  {section.title}
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="pb-2">
                    {section.links.map((item) => (
                      <li key={`${section.title}-${item.label}`}>
                        {renderFooterLink(item, footerLinkClassName)}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="hidden grid-cols-2 gap-8 sm:grid sm:grid-cols-4">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-3 text-sm font-semibold text-foreground">{section.title}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {section.links.map((item) => (
                  <li key={`${section.title}-${item.label}`}>
                    {renderFooterLink(item, 'hover:text-foreground transition-colors')}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-muted-foreground">
          <span>© {currentYear} EquipQR™</span>
          <ExternalLink
            href={COLUMBIA_CLOUDWORKS_URL}
            className="hover:text-foreground transition-colors flex items-center gap-1.5"
            showIcon={false}
          >
            <img
              src="/icons/Columbia-Cloudworks-Icon-Small.png"
              alt=""
              className="w-5 h-5 rounded-sm opacity-90 ring-1 ring-background/10"
            />
            Columbia Cloudworks LLC
          </ExternalLink>
        </div>
      </nav>
    </footer>
  );
};

export default LandingFooter;
