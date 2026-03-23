/**
 * EquipmentPanel -- slide-out panel for the Fleet Map showing located
 * and unlocated equipment with search, stats, and click-to-focus.
 */

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  MapPin,
  Search,
  X,
  ChevronDown,
  Users,
  AlertCircle,
  AlertTriangle,
  Forklift,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import type { EquipmentLocation } from './MapView';

// ── Source badge classes (aligned with MapView SOURCE_TOKEN_CLASSES) ──────────
// Using Tailwind semantic token classes instead of hardcoded hex so badges
// adapt to both light and dark mode and stay in sync with map marker colors.

const SOURCE_BADGE: Record<string, { badge: string; label: string }> = {
  team:      { badge: 'bg-info text-info-foreground',     label: 'Team' },
  equipment: { badge: 'bg-primary text-primary-foreground', label: 'Manual' },
  scan:      { badge: 'bg-success text-success-foreground', label: 'Scan' },
  geocoded:  { badge: 'bg-warning text-warning-foreground', label: 'Geocoded' },
};

// ── Types ─────────────────────────────────────────────────────

export interface UnlocatedEquipment {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  team_name?: string;
}

interface EquipmentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  locatedEquipment: EquipmentLocation[];
  unlocatedEquipment: UnlocatedEquipment[];
  totalEquipmentCount: number;
  selectedEquipmentId?: string | null;
  onEquipmentSelect: (id: string) => void;
}

// ── Component ─────────────────────────────────────────────────

const EquipmentPanel: React.FC<EquipmentPanelProps> = ({
  isOpen,
  onClose,
  locatedEquipment,
  unlocatedEquipment,
  totalEquipmentCount,
  selectedEquipmentId,
  onEquipmentSelect,
}) => {
  const [search, setSearch] = useState('');
  const [showUnlocated, setShowUnlocated] = useState(false);

  const lowerSearch = search.toLowerCase();

  const filteredLocated = useMemo(() => {
    if (!lowerSearch) return locatedEquipment;
    return locatedEquipment.filter(
      (e) =>
        e.name.toLowerCase().includes(lowerSearch) ||
        e.manufacturer.toLowerCase().includes(lowerSearch) ||
        e.model.toLowerCase().includes(lowerSearch) ||
        e.serial_number.toLowerCase().includes(lowerSearch) ||
        (e.team_name?.toLowerCase().includes(lowerSearch) ?? false),
    );
  }, [locatedEquipment, lowerSearch]);

  const filteredUnlocated = useMemo(() => {
    if (!lowerSearch) return unlocatedEquipment;
    return unlocatedEquipment.filter(
      (e) =>
        e.name.toLowerCase().includes(lowerSearch) ||
        e.manufacturer.toLowerCase().includes(lowerSearch) ||
        e.model.toLowerCase().includes(lowerSearch) ||
        e.serial_number.toLowerCase().includes(lowerSearch) ||
        (e.team_name?.toLowerCase().includes(lowerSearch) ?? false),
    );
  }, [unlocatedEquipment, lowerSearch]);

  const locatedCount = locatedEquipment.length;
  const coveragePct = totalEquipmentCount > 0 ? Math.round((locatedCount / totalEquipmentCount) * 100) : 0;

  // Most recent location update — derives both the label and a staleness flag.
  // Data older than 24 hours is considered stale and rendered in amber.
  const lastUpdatedInfo = useMemo(() => {
    const timestamps = locatedEquipment
      .map((e) => e.location_updated_at)
      .filter(Boolean) as string[];
    if (timestamps.length === 0) return null;
    const mostRecent = timestamps
      .map((ts) => parseISO(ts))
      .filter(isValid)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    if (!mostRecent) return null;
    const isStale = Date.now() - mostRecent.getTime() > 24 * 60 * 60 * 1000;
    return {
      label: formatDistanceToNow(mostRecent, { addSuffix: true }),
      isStale,
    };
  }, [locatedEquipment]);

  return (
    <div
      className={`absolute top-0 left-0 h-full z-20 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      style={{ width: '380px', maxWidth: '90vw' }}
    >
      <div className="h-full bg-background/95 backdrop-blur-sm border-r shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b space-y-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Forklift className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-sm">Fleet Equipment</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0" aria-label="Close equipment panel">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Stats bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{locatedCount}</span> of {totalEquipmentCount} located
              </span>
              <span className="font-mono text-muted-foreground">{coveragePct}%</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${coveragePct}%`,
                  // Hex required for inline style; semantic equivalents: success, warning, destructive
                  backgroundColor: coveragePct >= 80 ? '#16A34A' : coveragePct >= 40 ? '#F59E0B' : '#EF4444',
                }}
              />
            </div>
            {lastUpdatedInfo && (
              lastUpdatedInfo.isStale ? (
                <div className="inline-flex items-center gap-1 bg-warning/15 text-warning border border-warning/30 rounded-md px-1.5 py-0.5 text-[10px] font-medium">
                  <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0" />
                  <span>Stale · {lastUpdatedInfo.label}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                  <RefreshCw className="h-2.5 w-2.5" />
                  <span>Updated {lastUpdatedInfo.label}</span>
                </div>
              )
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search equipment..."
              className="h-8 pl-8 text-xs"
            />
            {search && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearch('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Equipment List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredLocated.length === 0 && filteredUnlocated.length === 0 ? (
              <div className="py-8 text-center">
                <MapPin className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  {search ? 'No equipment matches your search' : 'No equipment found'}
                </p>
              </div>
            ) : (
              <>
                {/* Located Equipment */}
                {filteredLocated.map((equip) => {
                  const badge = SOURCE_BADGE[equip.source] || SOURCE_BADGE.equipment;
                  const isSelected = equip.id === selectedEquipmentId;

                  return (
                    <button
                      key={equip.id}
                      onClick={() => onEquipmentSelect(equip.id)}
                      className={cn(
                        'w-full text-left rounded-lg py-3 px-3 transition-colors cursor-pointer',
                        'border-b border-border/10 last:border-b-0',
                        isSelected
                          ? 'bg-primary/[0.08] border border-primary/25 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.15)] last:border-b last:border-primary/25'
                          : 'hover:bg-accent/60 border-transparent'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{equip.name}</p>
                          <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                            {equip.manufacturer} {equip.model}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium flex-shrink-0',
                            badge.badge
                          )}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 mt-2">
                        {equip.team_name && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/70">
                            <Users className="h-2.5 w-2.5 opacity-70" />
                            {equip.team_name}
                          </span>
                        )}
                        {equip.formatted_address && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/55 truncate">
                            <MapPin className="h-2.5 w-2.5 flex-shrink-0 opacity-50" />
                            {equip.formatted_address}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Unlocated Equipment */}
                {filteredUnlocated.length > 0 && (
                  <Collapsible open={showUnlocated} onOpenChange={setShowUnlocated}>
                    <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2.5 mt-1 rounded-lg hover:bg-accent/60 transition-colors">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <AlertCircle className="h-3.5 w-3.5 text-warning" />
                        Unlocated ({filteredUnlocated.length})
                      </span>
                      <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', showUnlocated ? 'rotate-180' : '')} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-1">
                      {filteredUnlocated.map((equip) => (
                        <div
                          key={equip.id}
                          className="rounded-lg py-3 px-3 border border-dashed border-muted-foreground/20 bg-muted/30"
                        >
                          <p className="text-xs font-medium truncate">{equip.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {equip.manufacturer} {equip.model}
                          </p>
                          {equip.team_name && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground mt-1">
                              <Users className="h-2.5 w-2.5 opacity-70" />
                              {equip.team_name}
                            </span>
                          )}
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default EquipmentPanel;

