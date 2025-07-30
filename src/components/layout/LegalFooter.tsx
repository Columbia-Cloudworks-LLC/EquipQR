
import { Link } from 'react-router-dom';

export default function LegalFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            © {currentYear} EquipQR by{' '}
            <a 
              href="https://columbiacloudworks.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors underline inline"
            >
              <img 
                src="/eqr-icons/columbia-cloudworks-logo.png" 
                alt="Columbia Cloudworks" 
                className="w-4 h-4 sm:w-5 sm:h-5 align-middle mr-2"
              />
              COLUMBIA CLOUDWORKS LLC
            </a>
            . All rights reserved.
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 text-sm">
            <a 
              href="https://equipqr.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              EquipQR.app
            </a>
            
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
