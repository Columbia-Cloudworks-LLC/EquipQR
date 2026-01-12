import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Factory,
  Tag,
  DollarSign,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipmentManufacturersAndModels } from '@/features/equipment/hooks/useEquipment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { 
  getAlternatesForPartNumber, 
  getCompatiblePartsForMakeModel 
} from '@/features/inventory/services/partAlternatesService';
import type { AlternatePartResult, MakeModelCompatiblePart } from '@/features/inventory/types/inventory';
import { useDebounced } from '@/hooks/useDebounced';

const PartLookup: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  
  // Part number lookup state
  const [partNumber, setPartNumber] = useState('');
  const debouncedPartNumber = useDebounced(partNumber, 300);
  
  // Make/Model lookup state
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const debouncedManufacturer = useDebounced(manufacturer, 300);
  const debouncedModel = useDebounced(model, 300);
  
  // Active tab
  const [activeTab, setActiveTab] = useState<'part-number' | 'make-model'>('part-number');
  
  // Get manufacturers/models for dropdown
  const { data: manufacturersData = [] } = useEquipmentManufacturersAndModels(
    currentOrganization?.id
  );
  
  const manufacturers = useMemo(() => 
    manufacturersData.map(m => m.manufacturer),
    [manufacturersData]
  );
  
  const modelsForManufacturer = useMemo(() => {
    const mfr = manufacturersData.find(m => 
      m.manufacturer.toLowerCase() === manufacturer.toLowerCase()
    );
    return mfr?.models || [];
  }, [manufacturersData, manufacturer]);
  
  // Part number alternates query
  const { 
    data: alternates = [], 
    isLoading: isLoadingAlternates,
    refetch: refetchAlternates
  } = useQuery({
    queryKey: ['part-alternates', currentOrganization?.id, debouncedPartNumber],
    queryFn: () => getAlternatesForPartNumber(
      currentOrganization!.id, 
      debouncedPartNumber
    ),
    enabled: !!currentOrganization?.id && debouncedPartNumber.length >= 2
  });
  
  // Make/Model compatible parts query
  const { 
    data: compatibleParts = [], 
    isLoading: isLoadingCompatible,
    refetch: refetchCompatible
  } = useQuery({
    queryKey: ['make-model-parts', currentOrganization?.id, debouncedManufacturer, debouncedModel],
    queryFn: () => getCompatiblePartsForMakeModel(
      currentOrganization!.id, 
      debouncedManufacturer,
      debouncedModel || undefined
    ),
    enabled: !!currentOrganization?.id && debouncedManufacturer.length >= 2
  });
  
  // Group alternates by group
  const groupedAlternates = useMemo(() => {
    const groups = new Map<string, AlternatePartResult[]>();
    for (const alt of alternates) {
      const existing = groups.get(alt.group_id) || [];
      existing.push(alt);
      groups.set(alt.group_id, existing);
    }
    return Array.from(groups.entries());
  }, [alternates]);
  
  const handleViewItem = useCallback((itemId: string) => {
    navigate(`/dashboard/inventory/${itemId}`);
  }, [navigate]);
  
  const handleManufacturerChange = useCallback((value: string) => {
    setManufacturer(value);
    setModel(''); // Reset model when manufacturer changes
  }, []);
  
  if (!currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader
          title="Part Lookup"
          description="Please select an organization to look up parts."
        />
      </Page>
    );
  }
  
  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-6">
        <PageHeader
          title="Part Lookup"
          description="Find compatible and alternate parts without needing an equipment record"
        />
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="part-number" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              By Part Number
            </TabsTrigger>
            <TabsTrigger value="make-model" className="flex items-center gap-2">
              <Factory className="h-4 w-4" />
              By Make/Model
            </TabsTrigger>
          </TabsList>
          
          {/* Part Number Lookup */}
          <TabsContent value="part-number" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Look Up by Part Number</CardTitle>
                <CardDescription>
                  Enter an OEM part number, aftermarket part number, or SKU to find interchangeable alternatives
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Enter part number (e.g., CAT-1R-0750, WIX 51773)..."
                      value={partNumber}
                      onChange={(e) => setPartNumber(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => refetchAlternates()}
                    disabled={isLoadingAlternates}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingAlternates ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                {partNumber && partNumber.length < 2 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Enter at least 2 characters to search
                  </p>
                )}
              </CardContent>
            </Card>
            
            {/* Part Number Results */}
            {isLoadingAlternates ? (
              <Card>
                <CardContent className="py-8">
                  <div className="flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Searching...</span>
                  </div>
                </CardContent>
              </Card>
            ) : debouncedPartNumber.length >= 2 && groupedAlternates.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No alternates found</h3>
                  <p className="text-muted-foreground">
                    No alternate parts were found for "{debouncedPartNumber}".
                    Try a different part number or check the spelling.
                  </p>
                </CardContent>
              </Card>
            ) : groupedAlternates.length > 0 && (
              <div className="space-y-4">
                {groupedAlternates.map(([groupId, parts]) => (
                  <AlternateGroupCard
                    key={groupId}
                    groupName={parts[0].group_name}
                    groupVerified={parts[0].group_verified}
                    groupNotes={parts[0].group_notes}
                    parts={parts}
                    onViewItem={handleViewItem}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Make/Model Lookup */}
          <TabsContent value="make-model" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Look Up by Make/Model</CardTitle>
                <CardDescription>
                  Enter an equipment manufacturer and optional model to find compatible parts based on your shop's compatibility rules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Select value={manufacturer} onValueChange={handleManufacturerChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select manufacturer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {manufacturers.map((mfr) => (
                          <SelectItem key={mfr} value={mfr}>
                            {mfr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Select 
                      value={model || '__any__'} 
                      onValueChange={(v) => setModel(v === '__any__' ? '' : v)}
                      disabled={!manufacturer}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={manufacturer ? "Select model (optional)..." : "Select manufacturer first..."} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__any__">
                          <span className="italic">Any Model</span>
                        </SelectItem>
                        {modelsForManufacturer.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => refetchCompatible()}
                    disabled={isLoadingCompatible}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingCompatible ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                {manufacturers.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    No equipment found. Add equipment to your organization to use make/model lookup.
                  </p>
                )}
              </CardContent>
            </Card>
            
            {/* Make/Model Results */}
            {isLoadingCompatible ? (
              <Card>
                <CardContent className="py-8">
                  <div className="flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Searching...</span>
                  </div>
                </CardContent>
              </Card>
            ) : debouncedManufacturer.length >= 2 && compatibleParts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No compatible parts found</h3>
                  <p className="text-muted-foreground">
                    No parts have compatibility rules matching {debouncedManufacturer}
                    {debouncedModel ? ` ${debouncedModel}` : ''}.
                  </p>
                </CardContent>
              </Card>
            ) : compatibleParts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Compatible Parts
                    <Badge variant="secondary">{compatibleParts.length}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Parts compatible with {manufacturer} {model || '(any model)'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {compatibleParts.map((part) => (
                      <CompatiblePartRow
                        key={part.inventory_item_id}
                        part={part}
                        onViewItem={handleViewItem}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Page>
  );
};

// ============================================
// Sub-components
// ============================================

interface AlternateGroupCardProps {
  groupName: string;
  groupVerified: boolean;
  groupNotes: string | null;
  parts: AlternatePartResult[];
  onViewItem: (itemId: string) => void;
}

const AlternateGroupCard: React.FC<AlternateGroupCardProps> = ({
  groupName,
  groupVerified,
  groupNotes,
  parts,
  onViewItem
}) => {
  const inventoryParts = parts.filter(p => p.inventory_item_id);
  const inStockParts = parts.filter(p => p.is_in_stock);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {groupName}
              {groupVerified && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </CardTitle>
            {groupNotes && (
              <CardDescription className="mt-1">{groupNotes}</CardDescription>
            )}
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div>{inventoryParts.length} in inventory</div>
            <div className={inStockParts.length > 0 ? 'text-green-600 font-medium' : ''}>
              {inStockParts.length} in stock
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {parts.map((part, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                part.is_matching_input 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:bg-muted/50'
              } ${part.inventory_item_id ? 'cursor-pointer' : ''}`}
              onClick={() => part.inventory_item_id && onViewItem(part.inventory_item_id)}
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
                  
                  {part.is_matching_input && (
                    <Badge variant="outline" className="text-xs">
                      Searched
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
                
                {part.inventory_item_id && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    {part.inventory_sku && (
                      <span>SKU: {part.inventory_sku}</span>
                    )}
                    {part.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {part.location}
                      </span>
                    )}
                    {part.default_unit_cost && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {part.default_unit_cost.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3 ml-4">
                {part.inventory_item_id && (
                  <>
                    <div className="text-right">
                      <div className={`font-semibold ${
                        part.is_low_stock 
                          ? 'text-destructive' 
                          : part.is_in_stock 
                            ? 'text-green-600' 
                            : 'text-muted-foreground'
                      }`}>
                        {part.quantity_on_hand} in stock
                      </div>
                      {part.is_low_stock && (
                        <div className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Low stock
                        </div>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

interface CompatiblePartRowProps {
  part: MakeModelCompatiblePart;
  onViewItem: (itemId: string) => void;
}

const CompatiblePartRow: React.FC<CompatiblePartRowProps> = ({ part, onViewItem }) => {
  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer"
      onClick={() => onViewItem(part.inventory_item_id)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{part.name}</span>
          
          {part.is_verified && (
            <Badge variant="default" className="bg-green-600 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          )}
          
          <Badge variant="outline" className="text-xs capitalize">
            {part.rule_match_type === 'any' ? 'Any model' : part.rule_match_type}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
          {part.sku && (
            <span>SKU: {part.sku}</span>
          )}
          {part.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {part.location}
            </span>
          )}
          {part.default_unit_cost && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {part.default_unit_cost.toFixed(2)}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3 ml-4">
        <div className="text-right">
          <div className={`font-semibold ${
            part.quantity_on_hand <= part.low_stock_threshold 
              ? 'text-destructive' 
              : part.is_in_stock 
                ? 'text-green-600' 
                : 'text-muted-foreground'
          }`}>
            {part.quantity_on_hand} in stock
          </div>
          {part.quantity_on_hand <= part.low_stock_threshold && (
            <div className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Low stock
            </div>
          )}
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
};

export default PartLookup;
