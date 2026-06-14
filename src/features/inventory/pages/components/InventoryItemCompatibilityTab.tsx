import React from 'react';
import { handleKeyboardActivation } from '@/components/a11y/keyboard';
import {
  Plus,
  Minus,
  Settings2,
  Cpu,
  LinkIcon,
  Layers,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  AlternatePartResult,
  ModelMatchType,
  PartCompatibilityRule,
  VerificationStatus,
} from '@/features/inventory/types/inventory';
import { getCompatibilityRuleMatchTypeLabel } from '@/features/inventory/utils/compatibilityRulePresentation';

type CompatibleEquipmentSummary = {
  id: string;
  name: string;
  manufacturer?: string | null;
  model?: string | null;
};

type EquipmentMatchedByRule = {
  equipment_id: string;
  name: string;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  matched_rule_match_type: string;
  matched_rule_status?: string | null;
};

export interface InventoryItemCompatibilityTabProps {
  itemId: string | undefined;
  canEdit: boolean;
  compatibilityRules: PartCompatibilityRule[];
  rulesLoading: boolean;
  equipmentMatchedByRules: EquipmentMatchedByRule[];
  matchedEquipmentLoading: boolean;
  compatibleEquipment: CompatibleEquipmentSummary[];
  unlinkEquipmentPending: boolean;
  groupedAlternates: Array<[string, AlternatePartResult[]]>;
  alternatesLoading: boolean;
  availableGroupsCount: number;
  onEditRules: () => void;
  onAddRules: () => void;
  onOpenManageEquipment: () => void;
  onRemoveEquipment: (equipmentId: string) => void;
  onNavigateToEquipment: (equipmentId: string) => void;
  onNavigateToInventoryItem: (inventoryItemId: string) => void;
  onOpenAddToGroup: () => void;
  onOpenCreateGroup: () => void;
  onRefetchAlternates: () => void;
}

const InventoryItemCompatibilityTab: React.FC<InventoryItemCompatibilityTabProps> = ({
  itemId,
  canEdit,
  compatibilityRules,
  rulesLoading,
  equipmentMatchedByRules,
  matchedEquipmentLoading,
  compatibleEquipment,
  unlinkEquipmentPending,
  groupedAlternates,
  alternatesLoading,
  availableGroupsCount,
  onEditRules,
  onAddRules,
  onOpenManageEquipment,
  onRemoveEquipment,
  onNavigateToEquipment,
  onNavigateToInventoryItem,
  onOpenAddToGroup,
  onOpenCreateGroup,
  onRefetchAlternates,
}) => (
  <div className="space-y-4">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Compatibility Rules</CardTitle>
        {canEdit && (
          <Button onClick={onEditRules} size="sm">
            <Settings2 className="h-4 w-4 mr-2" />
            Edit Rules
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {rulesLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        ) : compatibilityRules.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-2">No compatibility rules defined</p>
            <p className="text-sm text-muted-foreground">
              Rules automatically match parts to equipment by manufacturer and model.
            </p>
            {canEdit && (
              <Button onClick={onAddRules} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Rules
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {compatibilityRules.map((rule) => {
              const matchType = (rule.match_type || 'exact') as ModelMatchType;
              const status = (rule.status || 'unverified') as VerificationStatus;
              const matchTypeLabel = getCompatibilityRuleMatchTypeLabel(rule);

              return (
                <div key={rule.id} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{rule.manufacturer}</span>
                    <span className="text-muted-foreground">→</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {matchType === 'any' ? 'Any' : matchType}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{matchTypeLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {status === 'verified' && (
                      <Badge className="bg-success text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                    {status === 'deprecated' && (
                      <Badge variant="secondary" className="text-xs">
                        Deprecated
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>

    {compatibilityRules.length > 0 && (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-muted-foreground" />
              Equipment Matched by Rules
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Equipment auto-discovered via the compatibility rules above
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {matchedEquipmentLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-3/4" />
            </div>
          ) : equipmentMatchedByRules.length === 0 ? (
            <div className="text-center py-8">
              <Cpu className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground mb-2">No equipment matches the current rules</p>
              <p className="text-sm text-muted-foreground">
                Equipment with matching manufacturer and model will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {equipmentMatchedByRules.map((equipment) => (
                <div
                  key={equipment.equipment_id}
                  role="button"
                  tabIndex={0}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => onNavigateToEquipment(equipment.equipment_id)}
                  onKeyDown={(e) =>
                    handleKeyboardActivation(e, () => onNavigateToEquipment(equipment.equipment_id))
                  }
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{equipment.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {equipment.manufacturer} {equipment.model}
                      {equipment.serial_number && ` • S/N: ${equipment.serial_number}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {equipment.matched_rule_match_type}
                    </Badge>
                    {equipment.matched_rule_status === 'verified' && (
                      <Badge className="bg-success text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground text-center pt-2">
                {equipmentMatchedByRules.length} equipment{' '}
                {equipmentMatchedByRules.length === 1 ? 'item' : 'items'} matched
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    )}

    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-muted-foreground" />
            Direct Associations
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Equipment manually linked to this part (independent of rules)
          </p>
        </div>
        {canEdit && (
          <Button onClick={onOpenManageEquipment} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Manage
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {compatibleEquipment.length === 0 ? (
          <div className="text-center py-8">
            <LinkIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground mb-2">No equipment directly linked</p>
            <p className="text-sm text-muted-foreground mb-4">
              Direct associations are useful for special cases not covered by rules.
            </p>
            {canEdit && (
              <Button onClick={onOpenManageEquipment} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Equipment
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {compatibleEquipment.map((equipment) => (
              <div key={equipment.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div
                  role="button"
                  tabIndex={0}
                  className="flex-1 min-w-0 cursor-pointer hover:text-primary text-left"
                  onClick={() => onNavigateToEquipment(equipment.id)}
                  onKeyDown={(e) =>
                    handleKeyboardActivation(e, () => onNavigateToEquipment(equipment.id))
                  }
                >
                  <p className="font-medium">{equipment.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {equipment.manufacturer} {equipment.model}
                  </p>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveEquipment(equipment.id)}
                    disabled={unlinkEquipmentPending}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>Part Alternates</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Interchangeable parts based on part number equivalence groups
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenAddToGroup}
                disabled={availableGroupsCount === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add to Group
              </Button>
              <Button size="sm" onClick={onOpenCreateGroup}>
                <Layers className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={onRefetchAlternates} disabled={alternatesLoading}>
            <RefreshCw className={`h-4 w-4 ${alternatesLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {alternatesLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-3/4" />
          </div>
        ) : groupedAlternates.length === 0 ? (
          <div className="text-center py-8">
            <Layers className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground mb-2">No alternate part groups found</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add this part to an existing group or create a new one to define interchangeable parts.
            </p>
            {canEdit && (
              <div className="flex justify-center gap-2">
                {availableGroupsCount > 0 && (
                  <Button variant="outline" onClick={onOpenAddToGroup}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Existing Group
                  </Button>
                )}
                <Button onClick={onOpenCreateGroup}>
                  <Layers className="h-4 w-4 mr-2" />
                  Create New Group
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {groupedAlternates.map(([groupId, parts]) => {
              const groupName = parts[0].group_name;
              const groupVerified = parts[0].group_verified;
              const groupNotes = parts[0].group_notes;
              const inventoryParts = parts.filter((p) => p.inventory_item_id);
              const inStockParts = parts.filter((p) => p.is_in_stock);

              return (
                <div key={groupId} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{groupName}</h4>
                        {groupVerified && (
                          <Badge className="bg-success text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      {groupNotes && (
                        <p className="text-sm text-muted-foreground mt-1">{groupNotes}</p>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>{inventoryParts.length} in inventory</div>
                      <div className={inStockParts.length > 0 ? 'text-success font-medium' : ''}>
                        {inStockParts.length} in stock
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {parts.map((part, idx) => {
                      const isCurrentItem = part.inventory_item_id === itemId;

                      return (
                        <div
                          key={idx}
                          role={part.inventory_item_id && !isCurrentItem ? 'button' : undefined}
                          tabIndex={part.inventory_item_id && !isCurrentItem ? 0 : undefined}
                          className={`flex items-center justify-between p-2 rounded border ${
                            isCurrentItem
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted/50'
                          } ${part.inventory_item_id && !isCurrentItem ? 'cursor-pointer' : ''}`}
                          onClick={() => {
                            if (part.inventory_item_id && !isCurrentItem) {
                              onNavigateToInventoryItem(part.inventory_item_id);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (part.inventory_item_id && !isCurrentItem) {
                              handleKeyboardActivation(e, () =>
                                onNavigateToInventoryItem(part.inventory_item_id!),
                              );
                            }
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {part.inventory_name ? (
                                <span className="font-medium">{part.inventory_name}</span>
                              ) : (
                                <span className="text-muted-foreground">
                                  {part.identifier_manufacturer && `${part.identifier_manufacturer} `}
                                  {part.identifier_value}
                                </span>
                              )}
                              {isCurrentItem && (
                                <Badge variant="outline" className="text-xs">
                                  This item
                                </Badge>
                              )}
                              {part.is_primary && (
                                <Badge variant="secondary" className="text-xs">
                                  Primary
                                </Badge>
                              )}
                              {part.identifier_type && (
                                <Badge variant="outline" className="text-xs uppercase">
                                  {part.identifier_type}
                                </Badge>
                              )}
                            </div>
                            {part.inventory_item_id && part.inventory_sku && (
                              <div className="text-sm text-muted-foreground mt-0.5">
                                SKU: {part.inventory_sku}
                                {part.location && ` • ${part.location}`}
                              </div>
                            )}
                          </div>
                          {part.inventory_item_id && (
                            <div className="text-right ml-4">
                              <div
                                className={`font-medium ${
                                  part.is_low_stock
                                    ? 'text-destructive'
                                    : part.is_in_stock
                                      ? 'text-success'
                                      : 'text-muted-foreground'
                                }`}
                              >
                                {part.quantity_on_hand}
                              </div>
                              {part.is_low_stock && (
                                <div className="text-xs text-destructive flex items-center justify-end gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Low
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  </div>
);

export default InventoryItemCompatibilityTab;
