
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Save, Settings, Palette, Building2, Link2, Image as ImageIcon, AlertCircle, Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { SessionOrganization } from '@/contexts/SessionContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { updateOrganization } from '@/features/organization/services/organizationService';
import type { OrganizationUpdatePayload } from '@/features/organization/types/organization';
import { organizationFormSchema, OrganizationFormData } from './organizationSettingsSchema';
import { QuickBooksIntegration } from './QuickBooksIntegration';
import { GoogleWorkspaceIntegration } from './GoogleWorkspaceIntegration';
import { DangerZoneSection } from './DangerZoneSection';
import { useOrganizationMembersQuery } from '@/features/organization/hooks/useOrganizationMembers';
import { useMemo } from 'react';

interface OrganizationSettingsProps {
  organization: SessionOrganization;
  currentUserRole: 'owner' | 'admin' | 'member';
}

export const OrganizationSettings: React.FC<OrganizationSettingsProps> = ({
  organization,
  currentUserRole,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const queryClient = useQueryClient();
  const { refetch } = useOrganization();

  // Fetch members to get admins for transfer ownership
  const { data: members = [] } = useOrganizationMembersQuery(organization?.id || '');

  // Filter to get only active admins (for ownership transfer)
  const admins = useMemo(() => {
    return members
      .filter(m => m.role === 'admin' && m.status === 'active')
      .map(m => ({
        id: m.id,
        userId: m.userId,
        name: m.name,
        email: m.email,
      }));
  }, [members]);

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: organization.name,
      logo: organization.logo || '',
      backgroundColor: organization.backgroundColor || '',
      scan_location_collection_enabled: (organization as any).scan_location_collection_enabled ?? true,
    },
  });

  // Watch form values for previews
  const watchedLogo = form.watch('logo');
  const watchedBackgroundColor = form.watch('backgroundColor');

  const onSubmit = async (data: OrganizationFormData) => {
    if (currentUserRole !== 'owner' && currentUserRole !== 'admin') {
      toast.error('You do not have permission to update organization settings');
      return;
    }

    try {
      setIsUpdating(true);
      
      const updatePayload: OrganizationUpdatePayload = {
        name: data.name,
        logo: data.logo || null,
        background_color: data.backgroundColor || null,
        scan_location_collection_enabled: data.scan_location_collection_enabled,
      };

      const success = await updateOrganization(organization.id, updatePayload);

      if (!success) {
        throw new Error('Failed to update organization');
      }

      // Invalidate React Query cache
      await queryClient.invalidateQueries({ queryKey: ['organizations'] });
      await queryClient.invalidateQueries({ queryKey: ['organization', organization.id] });
      
      // Refresh organization context to update sidebar immediately
      await refetch();
      
      toast.success('Organization settings updated successfully');
      form.reset(data);
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('Failed to update organization settings');
    } finally {
      setIsUpdating(false);
    }
  };

  const canEdit = currentUserRole === 'owner' || currentUserRole === 'admin';

  if (!canEdit) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Organization Settings
            </CardTitle>
            <CardDescription>
              Configure your organization preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Contact an admin to update organization settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper to validate if URL is valid for preview
  const isValidLogoUrl = (url: string | undefined): boolean => {
    if (!url || url.trim() === '') return false;
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  };

  // Helper to validate hex color
  const isValidHexColor = (color: string | undefined): boolean => {
    if (!color || color.trim() === '') return false;
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color.trim());
  };

  const showLogoPreview = isValidLogoUrl(watchedLogo);
  const backgroundColorValue = watchedBackgroundColor || '#ffffff';
  const showColorPreview = isValidHexColor(watchedBackgroundColor) || backgroundColorValue === '#ffffff';

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Update your organization's name and branding settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        disabled={isUpdating}
                        placeholder="Enter organization name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Logo URL
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <Input 
                          {...field} 
                          disabled={isUpdating}
                          placeholder="https://example.com/logo.png"
                          type="url"
                          onChange={(e) => {
                            field.onChange(e);
                            setLogoError(false);
                          }}
                        />
                        {showLogoPreview && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground font-medium">Preview:</p>
                            <div className="border rounded-lg p-4 bg-muted/50 flex items-center justify-center min-h-[120px]">
                              <img
                                src={watchedLogo}
                                alt="Logo preview"
                                className="max-w-full max-h-24 object-contain"
                                onError={() => setLogoError(true)}
                                onLoad={() => setLogoError(false)}
                              />
                            </div>
                            {logoError && (
                              <div className="flex items-center gap-2 text-xs text-destructive">
                                <AlertCircle className="h-3 w-3" />
                                <span>Unable to load image from this URL</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Enter a publicly accessible URL to your organization's logo image
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="backgroundColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Background Color
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input 
                            {...field} 
                            disabled={isUpdating}
                            placeholder="#ffffff"
                            type="text"
                            className="flex-1"
                          />
                          <input
                            type="color"
                            value={field.value || '#ffffff'}
                            onChange={(e) => field.onChange(e.target.value)}
                            disabled={isUpdating}
                            className="w-14 h-10 rounded border border-input cursor-pointer disabled:cursor-not-allowed"
                            title="Pick a color"
                          />
                        </div>
                        {showColorPreview && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground font-medium">Preview:</p>
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-20 h-20 rounded-lg border-2 border-border shadow-sm"
                                style={{ backgroundColor: backgroundColorValue }}
                                title={`Color: ${backgroundColorValue}`}
                              />
                              <div className="flex-1 space-y-1">
                                <p className="text-sm font-mono text-muted-foreground">
                                  {backgroundColorValue}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  This color will be used for organization branding
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Choose a color in hex format (e.g., #FF5733) or use the color picker
                    </p>
                  </FormItem>
                )}
              />

            </CardContent>
          </Card>

          {/* Privacy & Location Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy &amp; Location
              </CardTitle>
              <CardDescription>
                Control how location data is collected across your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="scan_location_collection_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">QR Scan Location Collection</FormLabel>
                      <FormDescription>
                        When enabled, QR code scans will capture GPS coordinates for the Fleet Map.
                        Disabling this will prevent all future scans from collecting location data.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isUpdating}
                        aria-label="Toggle QR scan location collection"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isUpdating || !form.formState.isDirty}>
              <Save className="mr-2 h-4 w-4" />
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Integrations Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Integrations</h3>
        </div>
        <QuickBooksIntegration currentUserRole={currentUserRole} />
        <GoogleWorkspaceIntegration currentUserRole={currentUserRole} />
      </div>

      {/* Danger Zone Section */}
      <DangerZoneSection
        organization={organization}
        currentUserRole={currentUserRole}
        admins={admins}
      />
    </div>
  );
};

