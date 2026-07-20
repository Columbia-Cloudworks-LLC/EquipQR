import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Gauge, Sparkles, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useWhenPreferenceStorageAllowed } from '@/contexts/CookieConsentContext';
import { cn } from '@/lib/utils';
import { OPERATOR_CHECKLIST_STARTER_TEMPLATES } from '@/features/operator-check-ins/data/operatorChecklistStarterTemplates';
import {
  getStarterCatalogExpandedPreference,
  setStarterCatalogExpandedPreference,
} from '@/features/operator-check-ins/utils/operatorChecklistCatalogPreferences';

const STARTER_ICON_MAP: Record<string, ReactNode> = {
  Gauge: <Gauge className="h-5 w-5" aria-hidden />,
  Truck: <Truck className="h-5 w-5" aria-hidden />,
};

function resolveStarterIcon(iconKey: string): ReactNode {
  return STARTER_ICON_MAP[iconKey] ?? <Sparkles className="h-5 w-5" aria-hidden />;
}

function resolveInitialExpanded(organizationId: string, hasExistingTemplates: boolean): boolean {
  const stored = getStarterCatalogExpandedPreference(organizationId);
  if (stored !== null) return stored;
  return !hasExistingTemplates;
}

interface OperatorChecklistStarterCatalogProps {
  organizationId: string;
  hasExistingTemplates: boolean;
  cloningStarterId: string | null;
  isCloning: boolean;
  onClone: (starterId: string) => void;
}

export function OperatorChecklistStarterCatalog({
  organizationId,
  hasExistingTemplates,
  cloningStarterId,
  isCloning,
  onClone,
}: OperatorChecklistStarterCatalogProps) {
  const [expanded, setExpanded] = useState(() =>
    resolveInitialExpanded(organizationId, hasExistingTemplates),
  );
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  const rehydrateOrFlushExpanded = useCallback(() => {
    const stored = getStarterCatalogExpandedPreference(organizationId);
    if (stored !== null) {
      setExpanded(stored);
      return;
    }
    setStarterCatalogExpandedPreference(organizationId, expandedRef.current);
  }, [organizationId]);
  useWhenPreferenceStorageAllowed(rehydrateOrFlushExpanded);

  function handleOpenChange(nextExpanded: boolean) {
    setExpanded(nextExpanded);
    setStarterCatalogExpandedPreference(organizationId, nextExpanded);
  }

  const starterCount = OPERATOR_CHECKLIST_STARTER_TEMPLATES.length;

  return (
    <Card>
      <Collapsible open={expanded} onOpenChange={handleOpenChange}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-start justify-between gap-3 rounded-md text-left transition-colors hover:bg-muted/50 -mx-2 px-2 py-1"
              aria-expanded={expanded}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <CardTitle className="text-base">Starter Template Catalog</CardTitle>
                  <Badge variant="secondary" className="font-normal">
                    {starterCount} available
                  </Badge>
                </div>
                <CardDescription>
                  Clone a ready-made checklist to get started quickly.
                </CardDescription>
              </div>
              {expanded ? (
                <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
            </button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {OPERATOR_CHECKLIST_STARTER_TEMPLATES.map((starter) => (
                <Card
                  key={starter.id}
                  className={cn('flex flex-col border-dashed bg-muted/20')}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                        aria-hidden
                      >
                        {resolveStarterIcon(starter.icon)}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <CardTitle className="text-base leading-tight">{starter.name}</CardTitle>
                        <CardDescription className="text-xs leading-snug">
                          {starter.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="mt-auto flex flex-col gap-3 pt-0">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="font-normal">
                        {starter.templateData.dataFields.length} data field
                        {starter.templateData.dataFields.length === 1 ? '' : 's'}
                      </Badge>
                      <Badge variant="outline" className="font-normal">
                        {starter.templateData.checklistItems.length} checklist item
                        {starter.templateData.checklistItems.length === 1 ? '' : 's'}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto sm:self-end"
                      disabled={isCloning}
                      onClick={() => onClone(starter.id)}
                    >
                      {cloningStarterId === starter.id ? 'Cloning…' : 'Clone template'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
