
import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Building2, Plus } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { useTeamMutations } from '@/features/teams/hooks/useTeamManagement';
import { useQueryClient } from '@tanstack/react-query';
import GooglePlacesAutocomplete, { type PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { useCustomersByOrg, useCustomerMutations } from '@/features/teams/hooks/useCustomerAccount';
import { linkTeamToCustomer } from '@/features/teams/services/customerAccountService';

interface CreateTeamDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
}

const DESCRIPTION_MAX_LENGTH = 500;

const CreateTeamDialog: React.FC<CreateTeamDialogProps> = ({ open, onClose, organizationId }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');
  const [locationData, setLocationData] = useState<PlaceLocationData | null>(null);
  const [overrideEquipmentLocation, setOverrideEquipmentLocation] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const { createTeamWithCreator } = useTeamMutations();
  const queryClient = useQueryClient();
  const { isLoaded } = useGoogleMapsLoader();
  const { data: orgCustomers } = useCustomersByOrg(open ? organizationId : undefined);
  const customerMutations = useCustomerMutations(organizationId);

  const handlePlaceSelect = useCallback((data: PlaceLocationData) => {
    setLocationData(data);
  }, []);

  const handleLocationClear = useCallback(() => {
    setLocationData(null);
  }, []);

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setNameError('');
    setLocationData(null);
    setOverrideEquipmentLocation(false);
    setSelectedCustomerId(null);
    setShowNewAccount(false);
    setNewAccountName('');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setNameError('Team name is required');
      return;
    }

    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create a team",
        variant: "destructive",
      });
      return;
    }

    try {
      // Resolve customer ID: create new account if user chose that option
      let customerId = selectedCustomerId;
      if (showNewAccount && newAccountName.trim()) {
        const created = await customerMutations.create.mutateAsync({
          organization_id: organizationId,
          name: newAccountName.trim(),
          status: 'active',
        });
        customerId = created.id;
      }

      const result = await createTeamWithCreator.mutateAsync({
        teamData: {
          name: name.trim(),
          description: description.trim() || null,
          organization_id: organizationId,
          customer_id: customerId,
          ...(locationData && {
            location_address: locationData.street || null,
            location_city: locationData.city || null,
            location_state: locationData.state || null,
            location_country: locationData.country || null,
            location_lat: locationData.lat,
            location_lng: locationData.lng,
          }),
          override_equipment_location: overrideEquipmentLocation,
        },
        creatorId: user.id
      });

      toast({
        title: "Success",
        description: "Team created successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['access-snapshot'] });
      
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            Create a new team to organize your maintenance work and assign team members.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              placeholder="Enter team name"
              className={nameError ? 'border-destructive focus-visible:ring-destructive' : ''}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? 'name-error' : undefined}
            />
            {nameError && (
              <p id="name-error" className="text-sm text-destructive">{nameError}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX_LENGTH))}
              placeholder="Enter team description (optional)"
              rows={3}
              maxLength={DESCRIPTION_MAX_LENGTH}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length} / {DESCRIPTION_MAX_LENGTH}
            </p>
          </div>

          {/* Customer Account */}
          <div className="space-y-2">
            <Label>Customer Account</Label>
            {showNewAccount ? (
              <div className="space-y-2">
                <Input
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="New account name"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => { setShowNewAccount(false); setNewAccountName(''); }}
                >
                  Cancel new account
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={selectedCustomerId ?? ''}
                  onChange={(e) => setSelectedCustomerId(e.target.value || null)}
                >
                  <option value="">None (no account)</option>
                  {(orgCustomers ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1"
                  onClick={() => {
                    setShowNewAccount(true);
                    setNewAccountName(name.trim());
                    setSelectedCustomerId(null);
                  }}
                >
                  <Plus className="h-3 w-3" />
                  Create new account
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <GooglePlacesAutocomplete
              value={locationData?.formatted_address ?? ''}
              onPlaceSelect={handlePlaceSelect}
              onClear={handleLocationClear}
              placeholder="Search for a team address..."
              isLoaded={isLoaded}
            />
          </div>

          <div className="flex items-center gap-2 rounded-md border p-3">
            <Checkbox
              id="override_equipment_location"
              checked={overrideEquipmentLocation}
              onCheckedChange={(checked) => setOverrideEquipmentLocation(!!checked)}
            />
            <Label
              htmlFor="override_equipment_location"
              className="flex-1 cursor-pointer text-sm font-normal"
            >
              Override Equipment Location
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring cursor-help"
                    aria-label="Override equipment location info"
                  >
                    <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px]">
                  <p>
                    When enabled, all equipment assigned to this team will use
                    this team's address as their effective location on the
                    Fleet Map.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTeamWithCreator.isPending}>
              {createTeamWithCreator.isPending ? 'Creating...' : 'Create Team'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTeamDialog;
