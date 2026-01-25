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
  SheetTrigger,
} from '@/components/ui/sheet';

interface NavigationItem {
  name: string;
  href: string;
}

const navigation: NavigationItem[] = [
  { name: 'Features', href: '#features' },
  { name: 'About', href: '#about' },
  { name: 'Field-Tested', href: '#pricing' },
];

// Stable constant for section IDs to avoid unnecessary re-renders
const SECTION_IDS = ['features', 'pricing', 'about'] as const;

const LandingHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isOnLandingPage = location.pathname === '/' || location.pathname === '/landing';

  const handleNavClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      if (isOnLandingPage) {
        // If on landing page, smooth scroll to section
        const element = document.querySelector(href);
        element?.scrollIntoView({ behavior: 'smooth' });
      } else {
        // If on other pages, navigate to /landing with anchor (bypasses SmartLanding redirect)
        navigate(`/landing${href}`);
      }
    }
  };

  const activeSection = useActiveSection(isOnLandingPage ? SECTION_IDS : []);
  const activeSectionToUse = isOnLandingPage ? activeSection : null;
  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/landing" className="flex items-center gap-2">
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
              if (isOnLandingPage && isHash) {
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
            <Button asChild variant="ghost">
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
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col space-y-4 mt-8">
                  {navigation.map((item) => {
                    const isHash = item.href.startsWith('#');
                    let isActive = false;
                    if (isOnLandingPage && isHash) {
                      isActive = activeSectionToUse ? `#${activeSectionToUse}` === item.href : false;
                    }
                    
                    // For hash links, prepend /landing when not on landing page
                    const href = isHash && !isOnLandingPage ? `/landing${item.href}` : item.href;
                    
                    return (
                      <SheetClose asChild key={item.name}>
                        <a
                          href={href}
                          className={[
                            'text-lg font-medium transition-colors',
                            'text-muted-foreground hover:text-foreground',
                            isActive ? 'text-foreground font-semibold' : ''
                          ].join(' ')}
                          onClick={(e) => handleNavClick(e, item.href)}
                        >
                          {item.name}
                        </a>
                      </SheetClose>
                    );
                  })}
                  <div className="pt-4 border-t border-border space-y-2">
                    <SheetClose asChild>
                      <Button asChild variant="ghost" className="w-full justify-start">
                        <Link to="/auth?tab=signin">Sign In</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button asChild className="w-full">
                        <Link to="/auth?tab=signup">Get Started</Link>
                      </Button>
                    </SheetClose>
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