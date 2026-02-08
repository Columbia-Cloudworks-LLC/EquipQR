
import { Link } from 'react-router-dom';
import { ExternalLink } from '@/components/ui/external-link';
import { APP_VERSION } from '@/lib/version';

function getChangelogHref(appVersion: string) {
  // Releases are tagged as `vX.Y.Z` by `.github/workflows/version-tag.yml`.
  // If we're on a dev build or a non-tag-like version string, fall back to `main`.
  const trimmed = (appVersion || '').trim();

  let ref = 'main';
  if (/^v?\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(trimmed)) {
    ref = trimmed.startsWith('v') ? trimmed : `v${trimmed}`;
  } else {
    const m = trimmed.match(/^v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/);
    if (m?.[1]) ref = `v${m[1]}`;
  }

  return `https://github.com/Columbia-Cloudworks-LLC/EquipQR/blob/${ref}/CHANGELOG.md`;
}

export default function LegalFooter() {
  const currentYear = new Date().getFullYear();
  const appVersion = APP_VERSION;
  const changelogHref = getChangelogHref(appVersion);

  return (
    <footer className="border-t border-border bg-background/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          {/* Copyright section - stacked on mobile, inline on larger screens */}
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            <span className="block sm:inline">
              © {currentYear} EquipQR™{' '}
              <ExternalLink
                href={changelogHref}
                className="text-muted-foreground hover:text-foreground transition-colors items-baseline no-underline hover:underline"
                showIcon={false}
                aria-label={`Release notes for EquipQR v${appVersion} (opens in a new tab)`}
              >
                v{appVersion}
              </ExternalLink>
            </span>
            <span className="hidden sm:inline"> by </span>
            <span className="block sm:inline mt-1 sm:mt-0">
              <span className="sm:hidden">by </span>
              <ExternalLink 
                href="https://columbiacloudworks.com" 
                className="hover:text-foreground no-underline hover:underline gap-1.5 items-baseline"
                showIcon={false}
              >
                <img 
                  src="/icons/Columbia-Cloudworks-Icon-Small.png" 
                  alt="Columbia Cloudworks" 
                  className="hidden sm:inline w-5 h-5 md:w-6 md:h-6 self-center rounded-sm opacity-90 ring-1 ring-white/10"
                />
                Columbia Cloudworks LLC
              </ExternalLink>
            </span>
          </div>
          
          {/* Links section */}
          <div className="flex items-baseline gap-3 text-sm">
            <ExternalLink 
              href="https://equipqr.app" 
              className="hidden sm:inline-flex text-muted-foreground hover:text-foreground transition-colors items-baseline no-underline hover:underline gap-1.5"
              showIcon={false}
            >
              <img 
                src="/icons/EquipQR-Icon-Purple-Small.png" 
                alt="EquipQR" 
                className="w-5 h-5 md:w-6 md:h-6 self-center rounded-sm opacity-90"
              />
              EquipQR™.app
            </ExternalLink>
            
            <span className="hidden sm:inline text-muted-foreground/50">·</span>
            
            <Link 
              to="/terms-of-service" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <span className="text-muted-foreground/50">·</span>
            <Link 
              to="/privacy-policy" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
