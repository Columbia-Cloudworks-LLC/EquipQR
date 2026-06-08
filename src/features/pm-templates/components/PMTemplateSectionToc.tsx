import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ListTree } from 'lucide-react';

export interface PMTemplateSectionTocEntry {
  name: string;
  count: number;
}

export interface PMTemplateSectionTocProps {
  sections: PMTemplateSectionTocEntry[];
  onSectionClick: (sectionName: string) => void;
  sticky?: boolean;
  className?: string;
  showExpandCollapse?: boolean;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  expandedCount?: number;
}

function sectionDomId(name: string) {
  return `section-${encodeURIComponent(name)}`;
}

export const PMTemplateSectionToc: React.FC<PMTemplateSectionTocProps> = ({
  sections,
  onSectionClick,
  sticky = true,
  className,
  showExpandCollapse = false,
  onExpandAll,
  onCollapseAll,
  expandedCount = 0,
}) => {
  const [activeSection, setActiveSection] = useState<string | null>(sections[0]?.name ?? null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (sections.length === 0) {
      setActiveSection(null);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setActiveSection(sections[0]?.name ?? null);
      return;
    }

    observerRef.current?.disconnect();

    const visibleSections = new Map<string, number>();

    let observer: IntersectionObserver;
    try {
      observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id;
          const name = decodeURIComponent(id.replace(/^section-/, ''));
          if (entry.isIntersecting) {
            visibleSections.set(name, entry.intersectionRatio);
          } else {
            visibleSections.delete(name);
          }
        });

        if (visibleSections.size === 0) return;

        let bestName: string | null = null;
        let bestRatio = -1;
        for (const [name, ratio] of visibleSections) {
          if (ratio >= bestRatio) {
            bestRatio = ratio;
            bestName = name;
          }
        }
        if (bestName) setActiveSection(bestName);
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    } catch {
      setActiveSection(sections[0]?.name ?? null);
      return;
    }

    observerRef.current = observer;

    sections.forEach((section) => {
      const el = document.getElementById(sectionDomId(section.name));
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [sections]);

  const handleClick = useCallback(
    (name: string) => {
      const el = document.getElementById(sectionDomId(name));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setActiveSection(name);
      onSectionClick(name);
    },
    [onSectionClick]
  );

  if (sections.length === 0) return null;

  return (
    <div className={cn(sticky && 'lg:sticky lg:top-4 lg:self-start', className)}>
      <Card>
        <CardContent standalone>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ListTree className="h-4 w-4" />
              Table of Contents
            </div>
            {showExpandCollapse && onExpandAll && onCollapseAll && (
              expandedCount < sections.length ? (
                <Button size="sm" variant="ghost" onClick={onExpandAll}>
                  Expand all
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={onCollapseAll}>
                  Collapse all
                </Button>
              )
            )}
          </div>
          <div className="max-h-[50vh] overflow-y-auto pr-2">
            <nav aria-label="Template sections table of contents">
              <ul className="space-y-1 text-sm">
                {sections.map((section) => (
                  <li key={section.name}>
                    <button
                      type="button"
                      onClick={() => handleClick(section.name)}
                      className={cn(
                        'w-full text-left rounded px-2 py-1 hover:bg-muted transition-colors',
                        activeSection === section.name && 'bg-muted font-medium'
                      )}
                    >
                      {section.name} ({section.count})
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
