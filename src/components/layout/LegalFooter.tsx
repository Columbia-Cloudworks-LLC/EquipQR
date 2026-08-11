import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { ExternalLink } from '@/components/ui/external-link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SUPPORT_DOCS_URL } from '@/lib/documentationUrl';
import { APP_VERSION } from '@/lib/version';
import { useSimpleOrganizationSafe } from '@/hooks/useSimpleOrganization';

const linkClassName =
  'whitespace-nowrap text-muted-foreground hover:text-foreground transition-colors no-underline hover:underline';

const legalLinks = [
  { to: '/terms-of-service', label: 'Terms of Service' },
  { to: '/security', label: 'Security' },
  { to: '/privacy-policy', label: 'Privacy Policy' },
  { to: '/do-not-sell-or-share', label: 'Do Not Sell or Share' },
] as const;

export default function LegalFooter() {
  const currentYear = new Date().getFullYear();
  const organization = useSimpleOrganizationSafe();
  const role = organization?.currentOrganization?.userRole;
  const canManageDsr = role === 'owner' || role === 'admin';

  return (
    <footer className="hidden md:block border-t border-border bg-background/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs leading-tight text-muted-foreground">
          <p className="inline-flex min-w-0 flex-wrap items-center gap-x-1">
            <span className="whitespace-nowrap">
              © {currentYear} EquipQR™ v{APP_VERSION}
            </span>
            <span aria-hidden="true" className="text-muted-foreground/40">
              ·
            </span>
            <ExternalLink
              href="https://columbiacloudworks.com"
              className={`${linkClassName} inline-flex items-center gap-1`}
              showIcon={false}
            >
              <img
                src="/icons/Columbia-Cloudworks-Icon-Small.png"
                alt=""
                className="h-3.5 w-3.5 shrink-0 rounded-sm opacity-90 ring-1 ring-background/10"
              />
              <span>Columbia Cloudworks LLC</span>
            </ExternalLink>
          </p>

          <nav
            aria-label="Legal and support links"
            className="flex flex-wrap items-center gap-x-2 gap-y-0.5"
          >
            <ExternalLink href={SUPPORT_DOCS_URL} className={linkClassName} showIcon={false}>
              Help Center
            </ExternalLink>
            <span aria-hidden="true" className="text-muted-foreground/40">
              ·
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-sm text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Legal links"
              >
                Legal
                <ChevronDown className="h-3 w-3 opacity-70" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                {legalLinks.map(({ to, label }) => (
                  <DropdownMenuItem key={to} asChild>
                    <Link to={to} className="cursor-pointer">
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                {canManageDsr ? (
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/dsr" className="cursor-pointer">
                      DSR Cockpit
                    </Link>
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>

            <span aria-hidden="true" className="text-muted-foreground/40">
              ·
            </span>
            <ExternalLink href="https://status.equipqr.app" className={linkClassName} showIcon={false}>
              Status
            </ExternalLink>
          </nav>
        </div>
      </div>
    </footer>
  );
}
