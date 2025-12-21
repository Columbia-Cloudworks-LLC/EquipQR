import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Settings, Palette } from 'lucide-react';
import { QuickBooksIntegration } from './QuickBooksIntegration';

const organizationFormSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100, 'Name too long'),
  logo: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  backgroundColor: z.string().optional(),
});

type OrganizationFormData = z.infer<typeof organizationFormSchema>;

interface OrganizationSettingsTabProps {
  currentUserRole: 'owner' | 'admin' | 'member';
}

const OrganizationSettingsTab: React.FC<OrganizationSettingsTabProps> = ({
  currentUserRole
}) => {
  const { currentOrganization } = useOrganization();
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: currentOrganization?.name || '',
      logo: currentOrganization?.logo || '',
      backgroundColor: currentOrganization?.backgroundColor || '#ffffff',
    },
  });

  const canEdit = currentUserRole === 'owner' || currentUserRole === 'admin';

  const onSubmit = async (data: OrganizationFormData) => {
    if (!canEdit || !currentOrganization) {
      toast.error('You do not have permission to edit organization settings');
      return;
    }

    setIsUpdating(true);
    try {
      const updates: {
        name: string;
        updated_at: string;
        logo?: string;
        background_color?: string;
      } = {
        name: data.name,
        updated_at: new Date().toISOString(),
      };

      if (data.logo) {
        updates.logo = data.logo;
      }

      if (data.backgroundColor) {
        updates.background_color = data.backgroundColor;
      }

      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', currentOrganization.id);

      if (error) throw error;

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['organizations'] });
      await queryClient.invalidateQueries({ queryKey: ['simple-organizations'] });

      toast.success('Organization settings updated successfully');
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('Failed to update organization settings');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!currentOrganization) {
    return null;
  }

  const isDirty = form.formState.isDirty;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Organization Settings</h2>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Update your organization's basic information and branding.
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
                        placeholder="Enter organization name"
                        disabled={!canEdit || isUpdating}
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
                        placeholder="https://example.com/logo.png"
                        disabled={!canEdit || isUpdating}
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
                          type="color"
                          className="w-16 h-10 border border-input"
                          disabled={!canEdit || isUpdating}
                        />
                        <Input
                          {...field}
                          placeholder="#ffffff"
                          className="flex-1"
                          disabled={!canEdit || isUpdating}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {canEdit && (
                <Button
                  type="submit"
                  disabled={!isDirty || isUpdating}
                  className="w-full sm:w-auto"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </form>
          </Form>

          {!canEdit && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Only organization owners and admins can modify these settings.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QuickBooks Integration Section */}
      <QuickBooksIntegration currentUserRole={currentUserRole} />
    </div>
  );
};

export default OrganizationSettingsTab;
