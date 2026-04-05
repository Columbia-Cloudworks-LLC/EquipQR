import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Palette, Bell, Shield, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SettingsSection {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
  { id: 'personalization', label: 'Personalization', icon: <Palette className="h-4 w-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  { id: 'privacy', label: 'Privacy', icon: <Shield className="h-4 w-4" /> },
  { id: 'security', label: 'Security', icon: <Lock className="h-4 w-4" /> },
];

export const SettingsNav: React.FC = () => {
  const [activeSection, setActiveSection] = useState(SETTINGS_SECTIONS[0].id);
  const isClickScrolling = useRef(false);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    if (isClickScrolling.current) return;

    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
        setActiveSection(entry.target.id);
        break;
      }
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin: '-80px 0px -60% 0px',
      threshold: [0.3, 0.5],
    });

    for (const section of SETTINGS_SECTIONS) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => {
      observer.disconnect();
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, [handleIntersection]);

  const handleClick = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (!el) return;

    isClickScrolling.current = true;
    setActiveSection(sectionId);

    el.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(() => {
      isClickScrolling.current = false;
    }, 800);
  };

  return (
    <>
      {/* Desktop: vertical sticky sidebar */}
      <nav className="hidden md:block w-48 shrink-0" aria-label="Settings sections">
        <div className="sticky top-20 space-y-0.5">
          {SETTINGS_SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => handleClick(section.id)}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors text-left',
                activeSection === section.id
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              {section.icon}
              {section.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile: horizontal scrollable chip bar */}
      <nav
        className="md:hidden flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none"
        aria-label="Settings sections"
      >
        {SETTINGS_SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => handleClick(section.id)}
            className={cn(
              'flex items-center gap-1.5 shrink-0 px-3 py-1.5 text-sm rounded-full border transition-colors',
              activeSection === section.id
                ? 'bg-primary/10 border-primary/30 font-medium text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            {section.icon}
            {section.label}
          </button>
        ))}
      </nav>
    </>
  );
};
