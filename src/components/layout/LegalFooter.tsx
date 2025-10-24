
import { Link } from 'react-router-dom';
import { ExternalLink } from '@/components/ui/external-link';
import { APP_VERSION } from '@/lib/version';

export default function LegalFooter() {
  const currentYear = new Date().getFullYear();
  const appVersion = APP_VERSION;

  return (
    <footer className="border-t border-border bg-background/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            © {currentYear} EquipQR v{appVersion} by{' '}
            <ExternalLink href="https://columbiacloudworks.com" className="hover:text-foreground">
              <img 
                src="/eqr-icons/columbia-cloudworks-logo.png" 
                alt="Columbia Cloudworks" 
                className="w-4 h-4 sm:w-5 sm:h-5"
              />
              COLUMBIA CLOUDWORKS LLC
            </ExternalLink>
            . All rights reserved.
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 text-sm">
            <ExternalLink 
              href="https://equipqr.app" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              EquipQR.app
            </ExternalLink>
            
            <div className="flex items-center gap-4">
              <Link 
                to="/terms-of-service" 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
              <Link 
                to="/privacy-policy" 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
