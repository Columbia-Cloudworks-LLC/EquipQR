import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import TextField from '@/components/form/TextField';
import SelectField from '@/components/form/SelectField';
import TextareaField from '@/components/form/TextareaField';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/ui/empty-state';
import TableToolbar from '@/components/ui/table-toolbar';
import { useAppToast } from '@/hooks/useAppToast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Package, Plus, Trash2, Edit } from 'lucide-react';

// Example form schema
const exampleFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  role: z.string().min(1, 'Role is required'),
  description: z.string().optional(),
});

type ExampleFormData = z.infer<typeof exampleFormSchema>;

const UISystemExample: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const selectedCount = 0;
  const { success, error, info, warning } = useAppToast();

  const form = useForm<ExampleFormData>({
    resolver: zodResolver(exampleFormSchema),
    defaultValues: {
      name: '',
      email: '',
      role: '',
      description: '',
    },
  });

  const onSubmit = async (data: ExampleFormData) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    success({ title: 'Form submitted', description: `Saved details for ${data.name}` });
    form.reset();
    setIsLoading(false);
  };

  const handleBulkAction = () => {
    info({ title: 'Bulk action', description: `Performed action on ${selectedCount} items` });
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'UI System', href: '#' },
  ];

  return (
    <Page>
      <PageHeader
        title="UI System Example"
        description="Demonstration of the new UI system components and design tokens"
        breadcrumbs={breadcrumbs}
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        }
      />

      <div className="space-y-8 mt-8">
        {/* Typography and Design Tokens */}
        <Card>
          <CardHeader>
            <CardTitle>Typography Scale</CardTitle>
            <CardDescription>Consistent typography using design tokens</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <h1 className="text-3xl font-bold">Heading 1 (3xl)</h1>
            <h2 className="text-2xl font-semibold">Heading 2 (2xl)</h2>
            <h3 className="text-xl font-medium">Heading 3 (xl)</h3>
            <p className="text-base">Body text (base)</p>
            <p className="text-sm text-muted-foreground">Small text (sm)</p>
            <p className="text-xs text-muted-foreground">Extra small text (xs)</p>
          </CardContent>
        </Card>

        {/* Form Example */}
        <Card>
          <CardHeader>
            <CardTitle>Form Components</CardTitle>
            <CardDescription>Standardized form fields with validation</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField
                    name="name"
                    label="Name"
                    placeholder="Enter your name"
                    description="Your full name"
                    required
                  />
                  <TextField
                    name="email"
                    label="Email"
                    type="email"
                    placeholder="Enter your email"
                    description="Your email address"
                    required
                  />
                </div>
                
                <SelectField
                  name="role"
                  label="Role"
                  placeholder="Select a role"
                  description="Your role in the organization"
                  options={[
                    { value: 'admin', label: 'Administrator' },
                    { value: 'manager', label: 'Manager' },
                    { value: 'user', label: 'User' },
                  ]}
                  required
                />
                
                <TextareaField
                  name="description"
                  label="Description"
                  placeholder="Enter a description"
                  description="Optional description"
                  rows={4}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => form.reset()}>
                    Reset
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Submitting...' : 'Submit'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Loading States */}
        <Card>
          <CardHeader>
            <CardTitle>Loading States</CardTitle>
            <CardDescription>Skeleton components for consistent loading experiences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        <Card>
          <CardHeader>
            <CardTitle>Empty States</CardTitle>
            <CardDescription>Consistent empty state messaging</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Package}
              title="No items found"
              description="Get started by creating your first item. This will help you organize your workflow."
              action={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Item
                </Button>
              }
            />
          </CardContent>
        </Card>

        {/* Table Toolbar */}
        <Card>
          <CardHeader>
            <CardTitle>Table Toolbar</CardTitle>
            <CardDescription>Search, filters, and bulk actions</CardDescription>
          </CardHeader>
          <CardContent>
            <TableToolbar
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              searchPlaceholder="Search items..."
              selectedCount={selectedCount}
              bulkActions={[
                {
                  label: 'Delete Selected',
                  onClick: handleBulkAction,
                  icon: <Trash2 className="h-4 w-4" />,
                },
                {
                  label: 'Edit Selected',
                  onClick: handleBulkAction,
                  icon: <Edit className="h-4 w-4" />,
                },
              ]}
              actions={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              }
            />
          </CardContent>
        </Card>

        {/* Dialog Example */}
        <Card>
          <CardHeader>
            <CardTitle>Dialog Sizes</CardTitle>
            <CardDescription>Standardized dialog sizes and layouts</CardDescription>
          </CardHeader>
          <CardContent className="flex space-x-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Small Dialog</Button>
              </DialogTrigger>
              <DialogContent size="sm">
                <DialogHeader>
                  <DialogTitle>Small Dialog</DialogTitle>
                  <DialogDescription>
                    This is a small dialog with minimal content.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button>Confirm</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Large Dialog</Button>
              </DialogTrigger>
              <DialogContent size="lg">
                <DialogHeader>
                  <DialogTitle>Large Dialog</DialogTitle>
                  <DialogDescription>
                    This is a large dialog with more content and space for forms or detailed information.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <p>This dialog has more space for content and is suitable for forms or detailed views.</p>
                  <p>The content area can accommodate complex layouts and multiple sections.</p>
                </div>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button>Save Changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Toast Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Toast Notifications</CardTitle>
            <CardDescription>Standardized feedback messages</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => success({ title: 'Success!', description: 'Operation completed successfully' })}
            >
              Success Toast
            </Button>
            <Button 
              variant="outline" 
              onClick={() => error({ title: 'Error!', description: 'Something went wrong' })}
            >
              Error Toast
            </Button>
            <Button 
              variant="outline" 
              onClick={() => warning({ title: 'Warning!', description: 'Please check your input' })}
            >
              Warning Toast
            </Button>
            <Button 
              variant="outline" 
              onClick={() => info({ title: 'Info', description: 'Here is some information' })}
            >
              Info Toast
            </Button>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
};

export default UISystemExample;
