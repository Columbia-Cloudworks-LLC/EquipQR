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
  Forklift,
} from 'lucide-react';
import type { EquipmentLocation } from './MapView';

// ── Source colors (must match MapView) ────────────────────────

const SOURCE_BADGE: Record<string, { bg: string; label: string }> = {
  team:      { bg: '#3B82F6', label: 'Team' },
  equipment: { bg: '#7C3AED', label: 'Manual' },
  scan:      { bg: '#16A34A', label: 'Scan' },
  geocoded:  { bg: '#F59E0B', label: 'Geocoded' },
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
                  backgroundColor: coveragePct >= 80 ? '#16A34A' : coveragePct >= 40 ? '#F59E0B' : '#EF4444',
                }}
              />
            </div>
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
          <div className="p-2 space-y-1">
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
                      className={`w-full text-left rounded-lg p-2.5 transition-colors ${
                        isSelected
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-muted/70 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{equip.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {equip.manufacturer} {equip.model}
                          </p>
                        </div>
                        <span
                          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium text-white flex-shrink-0"
                          style={{ backgroundColor: badge.bg }}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {equip.team_name && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Users className="h-2.5 w-2.5" />
                            {equip.team_name}
                          </span>
                        )}
                        {equip.formatted_address && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground truncate">
                            <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
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
                    <CollapsibleTrigger className="w-full flex items-center justify-between px-2.5 py-2 mt-2 rounded-lg hover:bg-muted/70 transition-colors">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <AlertCircle className="h-3.5 w-3.5 text-warning" />
                        Unlocated ({filteredUnlocated.length})
                      </span>
                      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showUnlocated ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 mt-1">
                      {filteredUnlocated.map((equip) => (
                        <div
                          key={equip.id}
                          className="rounded-lg p-2.5 border border-dashed border-muted-foreground/20 bg-muted/30"
                        >
                          <p className="text-xs font-medium truncate">{equip.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {equip.manufacturer} {equip.model}
                          </p>
                          {equip.team_name && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground mt-0.5">
                              <Users className="h-2.5 w-2.5" />
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
