import type { MouseEvent } from 'react';
import { useActiveSection } from '@/hooks/useActiveSection';
import { Button } from '@/components/ui/button';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '@/components/ui/Logo';
import { Menu } from 'lucide-react';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface NavigationItem {
  name: string;
  href: string;
}

const navigation: NavigationItem[] = [
  { name: 'Features', href: '#features' },
  { name: 'About', href: '#about' },
  { name: 'Customers', href: '#customers' },
  { name: 'Pricing', href: '#pricing' },
];

// Stable constant for section IDs to avoid unnecessary re-renders (order matches page flow)
const SECTION_IDS: string[] = ['features', 'about', 'customers', 'pricing'];

const LandingHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isOnMarketingHome = location.pathname === '/';

  const handleNavClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      if (isOnMarketingHome) {
        const element = document.querySelector(href);
        element?.scrollIntoView({ behavior: 'smooth' });
      } else {
        const id = href.slice(1);
        navigate({ pathname: '/', hash: id });
      }
    }
  };

  const activeSection = useActiveSection(isOnMarketingHome ? SECTION_IDS : []);
  const activeSectionToUse = isOnMarketingHome ? activeSection : null;
  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <Logo size="sm" />
              <span className="font-bold text-xl text-foreground">EquipQR™</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const isHash = item.href.startsWith('#');
              // Active logic only on landing page
              let isActive = false;
              if (isOnMarketingHome && isHash) {
                isActive = activeSectionToUse ? `#${activeSectionToUse}` === item.href : false;
              }
              
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={[
                    'transition-colors',
                    'text-muted-foreground hover:text-foreground',
                    isActive ? 'text-foreground font-semibold' : ''
                  ].join(' ')}
                  onClick={(e) => handleNavClick(e, item.href)}
                >
                  {item.name}
                </a>
              );
            })}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-4">
            <Button asChild variant="outline">
              <Link to="/auth?tab=signin">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/auth?tab=signup">Get Started</Link>
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader className="sr-only">
                  <SheetTitle>Site navigation</SheetTitle>
                  <SheetDescription>
                    Jump to a section, sign in, or create an account.
                  </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-8 mt-6">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                      On this page
                    </p>
                    <nav className="flex flex-col gap-1" aria-label="Marketing page sections">
                      {navigation.map((item) => {
                        const isHash = item.href.startsWith('#');
                        let isActive = false;
                        if (isOnMarketingHome && isHash) {
                          isActive = activeSectionToUse ? `#${activeSectionToUse}` === item.href : false;
                        }

                        const href =
                          isHash && !isOnMarketingHome ? `/${item.href}` : item.href;

                        return (
                          <SheetClose asChild key={item.name}>
                            <a
                              href={href}
                              className={[
                                'rounded-lg px-3 py-2.5 text-base font-medium transition-colors',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                isActive
                                  ? 'bg-primary/10 text-foreground ring-1 ring-primary/20'
                                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                              ].join(' ')}
                              aria-current={isActive ? 'location' : undefined}
                              onClick={(e) => handleNavClick(e, item.href)}
                            >
                              {item.name}
                            </a>
                          </SheetClose>
                        );
                      })}
                    </nav>
                  </div>
                  <div className="space-y-3 border-t border-border pt-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                      Account
                    </p>
                    <div className="flex flex-col gap-2">
                      <SheetClose asChild>
                        <Button asChild variant="outline" className="w-full justify-start h-11">
                          <Link to="/auth?tab=signin">Sign In</Link>
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button asChild className="w-full h-11">
                          <Link to="/auth?tab=signup">Get Started Free</Link>
                        </Button>
                      </SheetClose>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default LandingHeader;