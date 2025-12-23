
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateWorkOrderCost, useUpdateWorkOrderCost } from '@/features/work-orders/hooks/useWorkOrderCosts';
import { WorkOrderCost } from '@/features/work-orders/services/workOrderCostsService';

const costFormSchema = z.object({
  description: z.string().min(1, 'Description is required').max(255, 'Description too long'),
  quantity: z.coerce.number().min(0.01, 'Quantity must be greater than 0').max(9999.99, 'Quantity too large'),
  unit_price: z.coerce.number().min(0, 'Unit price cannot be negative').max(999999.99, 'Unit price too large'),
});

type CostFormData = z.infer<typeof costFormSchema>;

interface WorkOrderCostFormProps {
  open: boolean;
  onClose: () => void;
  workOrderId: string;
  editingCost?: WorkOrderCost | null;
}

const WorkOrderCostForm: React.FC<WorkOrderCostFormProps> = ({
  open,
  onClose,
  workOrderId,
  editingCost
}) => {
  const createCostMutation = useCreateWorkOrderCost();
  const updateCostMutation = useUpdateWorkOrderCost();

  const form = useForm<CostFormData>({
    resolver: zodResolver(costFormSchema),
    defaultValues: {
      description: editingCost?.description || '',
      quantity: editingCost?.quantity || 1,
      unit_price: editingCost ? editingCost.unit_price_cents / 100 : 0,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        description: editingCost?.description || '',
        quantity: editingCost?.quantity || 1,
        unit_price: editingCost ? editingCost.unit_price_cents / 100 : 0,
      });
    }
  }, [open, editingCost, form]);

  const onSubmit = async (data: CostFormData) => {
    try {
      const costData = {
        description: data.description,
        quantity: data.quantity,
        unit_price_cents: Math.round(data.unit_price * 100), // Convert dollars to cents
      };

      if (editingCost) {
        await updateCostMutation.mutateAsync({
          costId: editingCost.id,
          updateData: costData
        });
      } else {
        await createCostMutation.mutateAsync({
          work_order_id: workOrderId,
          ...costData
        });
      }

      form.reset();
      onClose();
    } catch {
      // Error handling is done in the mutation hooks
    }
  };

  const isLoading = createCostMutation.isPending || updateCostMutation.isPending;
  const handleFormSubmit = form.handleSubmit(onSubmit);

  const calculateTotal = () => {
    const quantity = form.watch('quantity') || 0;
    const unitPrice = form.watch('unit_price') || 0;
    return quantity * unitPrice;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingCost ? 'Edit Cost Item' : 'Add Cost Item'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(event) => {
              handleFormSubmit(event);
            }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter cost description..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="1.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Price ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Total Preview */}
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total:</span>
                <span className="font-semibold">
                  ${calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : editingCost ? 'Update' : 'Add'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default WorkOrderCostForm;
