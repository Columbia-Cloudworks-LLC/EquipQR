import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from '@/components/ui/external-link';

const CONTACT_EMAIL = 'mailto:nicholas.king@columbiacloudworks.com';
const GITHUB_REPO_URL = 'https://github.com/Columbia-Cloudworks-LLC/EquipQR';
const EQUIPQR_APP_URL = 'https://equipqr.app';
const COLUMBIA_CLOUDWORKS_URL = 'https://columbiacloudworks.com';

const LandingFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background/50 backdrop-blur-sm mt-auto">
      <nav
        className="container mx-auto px-4 py-8 sm:py-10"
        aria-label="Footer navigation"
      >
        <p className="text-sm text-muted-foreground max-w-xl mb-8">
          EquipQR helps teams track equipment, manage work orders, and run operations from one platform. Built for repair shops, rental ops, and field crews.
        </p>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Product</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#features" className="hover:text-foreground transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-foreground transition-colors">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Company</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#about" className="hover:text-foreground transition-colors">
                  About
                </a>
              </li>
              <li>
                <ExternalLink
                  href={COLUMBIA_CLOUDWORKS_URL}
                  className="hover:text-foreground transition-colors"
                  showIcon={false}
                >
                  Columbia Cloudworks
                </ExternalLink>
              </li>
              <li>
                <a
                  href={CONTACT_EMAIL}
                  className="hover:text-foreground transition-colors"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/terms-of-service" className="hover:text-foreground transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="hover:text-foreground transition-colors">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Connect</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="https://calendly.com/nicholas-king-columbiacloudworks/30min" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  Schedule a Demo
                </a>
              </li>
              <li>
                <ExternalLink
                  href={EQUIPQR_APP_URL}
                  className="hover:text-foreground transition-colors"
                  showIcon={false}
                >
                  EquipQR™.app
                </ExternalLink>
              </li>
              <li>
                <ExternalLink
                  href={GITHUB_REPO_URL}
                  className="hover:text-foreground transition-colors"
                  showIcon={true}
                >
                  GitHub
                </ExternalLink>
              </li>
            </ul>
          </div>
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
