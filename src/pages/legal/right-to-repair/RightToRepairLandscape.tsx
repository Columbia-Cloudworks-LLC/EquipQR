import { useMemo, useState, type JSX } from 'react';
import { ExternalLink } from '@/components/ui/external-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import EmptyState from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  EMPTY_LANDSCAPE_FILTERS,
  filterLandscapeCases,
} from '@/pages/legal/right-to-repair/filterLandscapeCases';
import {
  LANDSCAPE_CASES,
  LENS_LABELS,
  MECHANISM_LABELS,
  SECTOR_LABELS,
} from '@/pages/legal/right-to-repair/rightToRepairContent';
import type {
  LandscapeCase,
  LandscapeFilters,
  LandscapeLens,
  LandscapeMechanism,
  LandscapeSector,
} from '@/pages/legal/right-to-repair/types';

const LENS_OPTIONS: Array<LandscapeLens | 'all'> = ['all', 'software', 'hardware', 'physical'];
const SECTOR_OPTIONS: Array<LandscapeSector | 'all'> = [
  'all',
  'enterprise',
  'consumer',
  'agriculture-fleet',
];
const MECHANISM_OPTIONS: Array<LandscapeMechanism | 'all'> = [
  'all',
  'cloud-tether',
  'subscription-lock',
  'parts-pairing',
  'firmware-paywall',
  'diagnostic-lockout',
  'buy-vs-license',
];

function FilterRow<T extends string>({
  legend,
  value,
  options,
  labels,
  onChange,
}: {
  legend: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
}): JSX.Element {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">{legend}</legend>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(next) => {
          if (next) onChange(next as T);
        }}
        className="flex flex-wrap justify-start gap-1"
        variant="outline"
        size="sm"
      >
        {options.map((option) => (
          <ToggleGroupItem key={option} value={option} className="px-3">
            {labels[option]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </fieldset>
  );
}

function CaseCard({
  item,
  onOpen,
}: {
  item: LandscapeCase;
  onOpen: (item: LandscapeCase) => void;
}): JSX.Element {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.vendor}</p>
        <CardTitle className="text-lg">{item.title}</CardTitle>
        <CardDescription>{item.period}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto flex flex-1 flex-col gap-3">
        <p className="text-sm text-muted-foreground line-clamp-3">{item.practice}</p>
        <div className="flex flex-wrap gap-1">
          {item.lenses.map((lens) => (
            <Badge key={lens} variant="secondary">
              {LENS_LABELS[lens]}
            </Badge>
          ))}
          {item.mechanisms.map((mechanism) => (
            <Badge key={mechanism} variant="outline">
              {MECHANISM_LABELS[mechanism]}
            </Badge>
          ))}
        </div>
        <Button type="button" variant="outline" className="mt-auto w-full" onClick={() => onOpen(item)}>
          Read the case
        </Button>
      </CardContent>
    </Card>
  );
}

export function RightToRepairLandscape(): JSX.Element {
  const [filters, setFilters] = useState<LandscapeFilters>(EMPTY_LANDSCAPE_FILTERS);
  const [openCase, setOpenCase] = useState<LandscapeCase | null>(null);

  const visibleCases = useMemo(
    () => filterLandscapeCases(LANDSCAPE_CASES, filters),
    [filters],
  );

  return (
    <section aria-labelledby="industry-patterns-heading" className="space-y-8">
      <div className="max-w-3xl space-y-3">
        <h2 id="industry-patterns-heading" className="text-3xl font-bold tracking-tight">
          How control moves after the sale
        </h2>
        <p className="text-muted-foreground">
          These are public, widely reported patterns. They are teaching examples, not accusations we
          litigated. Filter by layer, sector, or mechanism. Open a case for the practice, the harm,
          and the source.
        </p>
      </div>

      <div className="space-y-6 rounded-lg border border-border/60 bg-card/40 p-4 sm:p-6">
        <FilterRow
          legend="Layer"
          value={filters.lens}
          options={LENS_OPTIONS}
          labels={LENS_LABELS}
          onChange={(lens) => setFilters((current) => ({ ...current, lens }))}
        />
        <FilterRow
          legend="Sector"
          value={filters.sector}
          options={SECTOR_OPTIONS}
          labels={SECTOR_LABELS}
          onChange={(sector) => setFilters((current) => ({ ...current, sector }))}
        />
        <FilterRow
          legend="Mechanism"
          value={filters.mechanism}
          options={MECHANISM_OPTIONS}
          labels={MECHANISM_LABELS}
          onChange={(mechanism) => setFilters((current) => ({ ...current, mechanism }))}
        />
        <div className="space-y-2">
          <label htmlFor="right-to-repair-case-search" className="text-sm font-medium">
            Search cases
          </label>
          <Input
            id="right-to-repair-case-search"
            type="search"
            value={filters.query}
            onChange={(event) =>
              setFilters((current) => ({ ...current, query: event.target.value }))
            }
            placeholder="Vendor, title, or practice"
          />
        </div>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {visibleCases.length === 1 ? '1 case' : `${visibleCases.length} cases`}
      </p>

      {visibleCases.length === 0 ? (
        <EmptyState
          title="No cases match those filters"
          description="Switch a layer, sector, or mechanism back to All, or clear the search."
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => setFilters(EMPTY_LANDSCAPE_FILTERS)}
            >
              Reset filters
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCases.map((item) => (
            <li key={item.id}>
              <CaseCard item={item} onOpen={setOpenCase} />
            </li>
          ))}
        </ul>
      )}

      <Sheet open={openCase !== null} onOpenChange={(open) => !open && setOpenCase(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {openCase ? (
            <>
              <SheetHeader>
                <SheetTitle>{openCase.title}</SheetTitle>
                <SheetDescription>
                  {openCase.vendor} · {openCase.period}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <div>
                  <h3 className="font-semibold text-foreground">What happened</h3>
                  <p className="mt-1 text-muted-foreground">{openCase.practice}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Who it hurt</h3>
                  <p className="mt-1 text-muted-foreground">{openCase.harm}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {openCase.lenses.map((lens) => (
                    <Badge key={lens} variant="secondary">
                      {LENS_LABELS[lens]}
                    </Badge>
                  ))}
                  {openCase.mechanisms.map((mechanism) => (
                    <Badge key={mechanism} variant="outline">
                      {MECHANISM_LABELS[mechanism]}
                    </Badge>
                  ))}
                </div>
                <p>
                  <ExternalLink href={openCase.sourceHref}>{openCase.sourceLabel}</ExternalLink>
                </p>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}
