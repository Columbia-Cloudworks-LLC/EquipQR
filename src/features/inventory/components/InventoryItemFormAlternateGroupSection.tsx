import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import type { InventoryItemFormData } from '@/features/inventory/schemas/inventorySchema';
import type { PartAlternateGroup } from '@/features/inventory/types/inventory';

type InventoryItemFormAlternateGroupSectionProps = {
  form: UseFormReturn<InventoryItemFormData>;
  alternateGroups: PartAlternateGroup[];
  isFormDisabled: boolean;
};

export function InventoryItemFormAlternateGroupSection({
  form,
  alternateGroups,
  isFormDisabled,
}: InventoryItemFormAlternateGroupSectionProps) {
  const [alternateGroupOpen, setAlternateGroupOpen] = useState(false);

  return (
    <Collapsible open={alternateGroupOpen} onOpenChange={setAlternateGroupOpen}>
      <Card>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-between w-full text-left hover:bg-muted/50 -mx-2 px-2 py-1 rounded transition-colors"
            >
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Alternate Parts Group
                <Badge variant="outline" className="ml-2 font-normal">
                  Optional
                </Badge>
              </CardTitle>
              {alternateGroupOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>
          <p className="text-sm text-muted-foreground mt-1">
            Add this part to a group of interchangeable parts for cross-reference lookups.
          </p>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <FormField
              control={form.control}
              name="alternateGroupMode"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="none" id="alt-none" />
                        <Label htmlFor="alt-none" className="font-normal cursor-pointer">
                          Don't add to a group
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="existing" id="alt-existing" />
                        <Label htmlFor="alt-existing" className="font-normal cursor-pointer">
                          Add to existing group
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="new" id="alt-new" />
                        <Label htmlFor="alt-new" className="font-normal cursor-pointer">
                          Create new group
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('alternateGroupMode') === 'existing' && (
              <FormField
                control={form.control}
                name="alternateGroupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Group</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        disabled={isFormDisabled}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an alternate group..." />
                        </SelectTrigger>
                        <SelectContent>
                          {alternateGroups.length === 0 ? (
                            <SelectItem value="" disabled>
                              No groups available
                            </SelectItem>
                          ) : (
                            alternateGroups.map((group) => (
                              <SelectItem key={group.id} value={group.id}>
                                <div className="flex items-center gap-2">
                                  <span>{group.name}</span>
                                  {group.status === 'verified' && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Check className="h-3 w-3 mr-1" />
                                      Verified
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {form.watch('alternateGroupMode') === 'new' && (
              <FormField
                control={form.control}
                name="newAlternateGroupName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Group Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Oil Filter - CAT D6T Compatible"
                        {...field}
                        value={field.value || ''}
                        disabled={isFormDisabled}
                      />
                    </FormControl>
                    <FormDescription>
                      A descriptive name for this group of interchangeable parts.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
