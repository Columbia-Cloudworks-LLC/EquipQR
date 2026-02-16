import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Forklift, Info, Loader2, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipmentManufacturersAndModels } from '@/features/equipment/hooks/useEquipment';
import { useCreateQuickEquipment } from '@/features/equipment/hooks/useCreateQuickEquipment';
import { useTeams } from '@/features/teams/hooks/useTeams';
import {
  quickEquipmentSchema,
  generateEquipmentName,
  type QuickEquipmentFormData,
} from '@/features/equipment/types/equipment';

interface QuickEquipmentFormProps {
  /**
   * Called when equipment is successfully created with the new equipment ID
   */
  onEquipmentCreated: (equipmentId: string) => void;
  /**
   * Called when user cancels the form
   */
  onCancel: () => void;
  /**
   * Function to check if user can create equipment for a given team
   */
  canCreateForTeam: (teamId: string) => boolean;
}

/**
 * Compact inline form for quick equipment creation during work order creation.
 * 
 * Features:
 * - Manufacturer autocomplete from existing equipment (with free text input)
 * - Model autocomplete filtered by selected manufacturer (with free text input)
 * - Auto-generated equipment name (editable)
 * - Team selector (only teams user has access to)
 * - Info tooltip about parts auto-matching
 */
export const QuickEquipmentForm: React.FC<QuickEquipmentFormProps> = ({
  onEquipmentCreated,
  onCancel,
  canCreateForTeam,
}) => {
  const { currentOrganization } = useOrganization();

  // Get manufacturer/model suggestions from existing equipment
  const { data: manufacturersData = [] } = useEquipmentManufacturersAndModels(
    currentOrganization?.id
  );

  // Get teams for team selector
  const { teams = [], isLoading: isLoadingTeams } = useTeams();

  // Filter to teams user can create equipment for
  const availableTeams = useMemo(() => {
    return teams.filter(team => canCreateForTeam(team.id));
  }, [teams, canCreateForTeam]);

  // Create mutation
  const createMutation = useCreateQuickEquipment();

  // Form state
  const form = useForm<QuickEquipmentFormData>({
    resolver: zodResolver(quickEquipmentSchema),
    defaultValues: {
      manufacturer: '',
      model: '',
      serial_number: '',
      working_hours: null,
      team_id: availableTeams.length === 1 ? availableTeams[0].id : '',
      name: '',
    },
  });

  const { watch, setValue, formState: { errors } } = form;
  const manufacturer = watch('manufacturer');
  const model = watch('model');
  const name = watch('name');

  // Track if name has been manually edited
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);

  // Auto-generate name when manufacturer/model changes (if not manually edited)
  useEffect(() => {
    if (!nameManuallyEdited) {
      const generatedName = generateEquipmentName(manufacturer || '', model || '');
      if (generatedName) {
        setValue('name', generatedName);
      }
    }
  }, [manufacturer, model, nameManuallyEdited, setValue]);

  // Set default team if only one available
  useEffect(() => {
    if (availableTeams.length === 1 && !form.getValues('team_id')) {
      setValue('team_id', availableTeams[0].id);
    }
  }, [availableTeams, form, setValue]);

  // Get manufacturers list for autocomplete suggestions
  const manufacturers = useMemo(() => {
    return manufacturersData.map(m => m.manufacturer);
  }, [manufacturersData]);

  // Get models for selected manufacturer (for autocomplete suggestions)
  const modelsForManufacturer = useMemo(() => {
    if (!manufacturer) return [];
    const mfrData = manufacturersData.find(
      m => m.manufacturer.toLowerCase() === manufacturer.toLowerCase()
    );
    return mfrData?.models || [];
  }, [manufacturer, manufacturersData]);

  // Handle form submission
  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      const result = await createMutation.mutateAsync(data);
      onEquipmentCreated(result.id);
    } catch {
      // Error toast is handled by the mutation hook
    }
  });

  // Handle name change - mark as manually edited
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNameManuallyEdited(true);
    setValue('name', e.target.value);
  }, [setValue]);

  // Handle manufacturer change
  const handleManufacturerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue('manufacturer', value);
    if (!value) {
      setNameManuallyEdited(false);
    }
  }, [setValue]);

  // Handle model change
  const handleModelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue('model', value);
    if (!value) {
      setNameManuallyEdited(false);
    }
  }, [setValue]);

  const isSubmitting = createMutation.isPending;

  return (
    <Card className="border-dashed border-primary/50 bg-primary/5">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Forklift className="h-4 w-4" />
          <span>Quick Equipment Entry</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Create a new equipment record with minimal info. Compatible parts
                  will automatically match based on manufacturer and model.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Manufacturer - Input with datalist for autocomplete */}
          <div className="space-y-2">
            <Label htmlFor="manufacturer">Manufacturer *</Label>
            <Input
              id="manufacturer"
              list="manufacturer-suggestions"
              placeholder="Type or select manufacturer"
              value={manufacturer}
              onChange={handleManufacturerChange}
              disabled={isSubmitting}
              autoComplete="off"
            />
            <datalist id="manufacturer-suggestions">
              {manufacturers.map((mfr) => (
                <option key={mfr} value={mfr} />
              ))}
            </datalist>
            {manufacturers.length > 0 && !manufacturer && (
              <p className="text-xs text-muted-foreground">
                {manufacturers.length} existing manufacturer{manufacturers.length !== 1 ? 's' : ''} available as suggestions
              </p>
            )}
            {errors.manufacturer && (
              <p className="text-sm text-destructive">{errors.manufacturer.message}</p>
            )}
          </div>

          {/* Model - Input with datalist for autocomplete */}
          <div className="space-y-2">
            <Label htmlFor="model">Model *</Label>
            <Input
              id="model"
              list="model-suggestions"
              placeholder="Type or select model"
              value={model}
              onChange={handleModelChange}
              disabled={isSubmitting}
              autoComplete="off"
            />
            <datalist id="model-suggestions">
              {modelsForManufacturer.map((mdl) => (
                <option key={mdl} value={mdl} />
              ))}
            </datalist>
            {modelsForManufacturer.length > 0 && !model && (
              <p className="text-xs text-muted-foreground">
                {modelsForManufacturer.length} existing model{modelsForManufacturer.length !== 1 ? 's' : ''} for {manufacturer}
              </p>
            )}
            {errors.model && (
              <p className="text-sm text-destructive">{errors.model.message}</p>
            )}
          </div>

          {/* Serial Number */}
          <div className="space-y-2">
            <Label htmlFor="serial_number">Serial Number *</Label>
            <Input
              id="serial_number"
              placeholder="Enter serial number"
              {...form.register('serial_number')}
              disabled={isSubmitting}
            />
            {errors.serial_number && (
              <p className="text-sm text-destructive">{errors.serial_number.message}</p>
            )}
          </div>

          {/* Working Hours (optional) */}
          <div className="space-y-2">
            <Label htmlFor="working_hours">
              Machine Hours
              <span className="text-muted-foreground ml-1">(optional)</span>
            </Label>
            <Input
              id="working_hours"
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g., 1250.5"
              {...form.register('working_hours', { valueAsNumber: true })}
              disabled={isSubmitting}
            />
            {errors.working_hours && (
              <p className="text-sm text-destructive">{errors.working_hours.message}</p>
            )}
          </div>

          {/* Team Selector */}
          <div className="space-y-2">
            <Label htmlFor="team_id">Assign to Team *</Label>
            {isLoadingTeams ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading teams...
              </div>
            ) : availableTeams.length === 0 ? (
              <Alert variant="destructive">
                <AlertDescription>
                  You don't have permission to create equipment for any team.
                </AlertDescription>
              </Alert>
            ) : availableTeams.length === 1 ? (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border text-sm">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span>{availableTeams[0].name}</span>
              </div>
            ) : (
              <Select
                value={form.watch('team_id')}
                onValueChange={(value) => setValue('team_id', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="team_id">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {availableTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.team_id && (
              <p className="text-sm text-destructive">{errors.team_id.message}</p>
            )}
          </div>

          {/* Equipment Name (auto-generated, editable) */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Equipment Name
              {!nameManuallyEdited && name && (
                <span className="text-muted-foreground ml-1">(auto-generated)</span>
              )}
            </Label>
            <Input
              id="name"
              placeholder="Auto-generated from manufacturer + model"
              value={name}
              onChange={handleNameChange}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Info about parts matching */}
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              Parts with compatibility rules matching this manufacturer/model will
              be automatically suggested for work orders on this equipment.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || availableTeams.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Forklift className="h-4 w-4 mr-2" />
                  Create Equipment
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default QuickEquipmentForm;
