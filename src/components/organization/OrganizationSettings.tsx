
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Save, Settings, Palette } from 'lucide-react';
import { SessionOrganization } from '@/contexts/SessionContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { updateOrganization, OrganizationUpdatePayload } from '@/services/optimizedOrganizationService';
import { organizationFormSchema, OrganizationFormData } from './organizationSettingsSchema';

interface OrganizationSettingsProps {
  organization: SessionOrganization;
  currentUserRole: 'owner' | 'admin' | 'member';
}

export const OrganizationSettings: React.FC<OrganizationSettingsProps> = ({
  organization,
  currentUserRole,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();
  const { refetch } = useOrganization();

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: organization.name,
      logo: organization.logo || '',
      backgroundColor: organization.backgroundColor || '',
    },
  });

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
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
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
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Organization Settings
        </CardTitle>
        <CardDescription>
          Update your organization's name and branding
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  <FormLabel>Logo URL</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      disabled={isUpdating}
                      placeholder="Enter logo URL"
                      type="url"
                    />
                  </FormControl>
                  <FormMessage />
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
                    <div className="flex gap-2">
                      <Input 
                        {...field} 
                        disabled={isUpdating}
                        placeholder="#ffffff"
                        type="text"
                      />
                      <input
                        type="color"
                        value={field.value || '#ffffff'}
                        onChange={(e) => field.onChange(e.target.value)}
                        disabled={isUpdating}
                        className="w-12 h-10 rounded border border-input"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={isUpdating || !form.formState.isDirty}>
                <Save className="mr-2 h-4 w-4" />
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
        
        {/* Future settings: billing integration, API keys, etc. */}
      </CardContent>
    </Card>
  );
};
