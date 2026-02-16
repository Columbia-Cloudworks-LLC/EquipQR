import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  useCreateAlternateGroup,
  useUpdateAlternateGroup,
} from '@/features/inventory/hooks/useAlternateGroups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PartAlternateGroup, VerificationStatus } from '@/features/inventory/types/inventory';

// Form validation schema
const alternateGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name is too long'),
  description: z.string().max(1000, 'Description is too long').optional(),
  status: z.enum(['unverified', 'verified', 'deprecated']),
  notes: z.string().max(2000, 'Notes are too long').optional(),
  evidence_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type AlternateGroupFormData = z.infer<typeof alternateGroupSchema>;

interface AlternateGroupFormProps {
  group?: PartAlternateGroup;
  onSuccess: () => void;
  onCancel: () => void;
}

export const AlternateGroupForm: React.FC<AlternateGroupFormProps> = ({
  group,
  onSuccess,
  onCancel,
}) => {
  const { currentOrganization } = useOrganization();
  const createMutation = useCreateAlternateGroup();
  const updateMutation = useUpdateAlternateGroup();

  const isEditing = !!group;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AlternateGroupFormData>({
    resolver: zodResolver(alternateGroupSchema),
    defaultValues: {
      name: group?.name || '',
      description: group?.description || '',
      status: group?.status || 'unverified',
      notes: group?.notes || '',
      evidence_url: group?.evidence_url || '',
    },
  });

  const status = watch('status');

  const onSubmit = async (data: AlternateGroupFormData) => {
    if (!currentOrganization) return;

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          organizationId: currentOrganization.id,
          groupId: group.id,
          data: {
            name: data.name,
            description: data.description || undefined,
            status: data.status,
            notes: data.notes || undefined,
            evidence_url: data.evidence_url || undefined,
          },
        });
      } else {
        await createMutation.mutateAsync({
          organizationId: currentOrganization.id,
          data: {
            name: data.name,
            description: data.description || undefined,
            status: data.status,
            notes: data.notes || undefined,
            evidence_url: data.evidence_url || undefined,
          },
        });
      }
      onSuccess();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g., Oil Filter - CAT D6T Compatible"
          {...register('name')}
          disabled={isPending}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Optional description of this alternate group..."
          rows={2}
          {...register('description')}
          disabled={isPending}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label htmlFor="status">Verification Status</Label>
        <Select
          value={status}
          onValueChange={(value) => setValue('status', value as VerificationStatus)}
          disabled={isPending}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unverified">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                Unverified
              </span>
            </SelectItem>
            <SelectItem value="verified">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Verified
              </span>
            </SelectItem>
            <SelectItem value="deprecated">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                Deprecated
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Verified groups are shown with higher priority in search results.
        </p>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Verification Notes</Label>
        <Textarea
          id="notes"
          placeholder="Evidence or notes supporting this alternate relationship..."
          rows={3}
          {...register('notes')}
          disabled={isPending}
        />
        {errors.notes && (
          <p className="text-sm text-destructive">{errors.notes.message}</p>
        )}
      </div>

      {/* Evidence URL */}
      <div className="space-y-2">
        <Label htmlFor="evidence_url">Evidence URL</Label>
        <Input
          id="evidence_url"
          type="url"
          placeholder="https://example.com/cross-reference-guide"
          {...register('evidence_url')}
          disabled={isPending}
        />
        {errors.evidence_url && (
          <p className="text-sm text-destructive">{errors.evidence_url.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Link to manufacturer cross-reference guide or other verification source.
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Group'}
        </Button>
      </div>
    </form>
  );
};
