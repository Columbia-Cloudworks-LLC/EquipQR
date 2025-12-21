import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

export interface WorkOrderCost {
  id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  created_at: string;
}

export const generateCostsCSV = async (workOrderId: string): Promise<void> => {
  try {
    // Fetch work order costs
    const { data: costs, error } = await supabase
      .from('work_order_costs')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!costs || costs.length === 0) {
      throw new Error('No costs found for this work order');
    }

    // Fetch work order info for filename
    const { data: workOrder } = await supabase
      .from('work_orders')
      .select('title')
      .eq('id', workOrderId)
      .single();

    // Generate CSV content
    const headers = ['Description', 'Quantity', 'Unit Price', 'Total Price', 'Date Added'];
    const rows = costs.map(cost => [
      cost.description,
      cost.quantity.toString(),
      `$${(cost.unit_price_cents / 100).toFixed(2)}`,
      `$${((cost.total_price_cents || cost.unit_price_cents * cost.quantity) / 100).toFixed(2)}`,
      new Date(cost.created_at).toLocaleDateString()
    ]);

    // Calculate totals
    const totalCosts = costs.reduce((sum, cost) => 
      sum + (cost.total_price_cents || cost.unit_price_cents * cost.quantity), 0
    );

    // Add totals row
    rows.push(['', '', '', `Total: $${(totalCosts / 100).toFixed(2)}`, '']);

    // Convert to CSV
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `work-order-costs-${workOrder?.title || workOrderId}-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    logger.error('Error generating costs CSV:', error);
    throw error;
  }
};

