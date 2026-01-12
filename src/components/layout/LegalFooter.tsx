
import { Link } from 'react-router-dom';
import { ExternalLink } from '@/components/ui/external-link';
import { APP_VERSION } from '@/lib/version';

export default function LegalFooter() {
  const currentYear = new Date().getFullYear();
  const appVersion = APP_VERSION;

  return (
    <footer className="border-t border-border bg-background/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          {/* Copyright section - stacked on mobile, inline on larger screens */}
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            <span className="block sm:inline">
              © {currentYear} EquipQR™ v{appVersion}
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
