import { supabase } from '@/integrations/supabase/client';
import type { WorkOrderExcelFilters } from '@/features/work-orders/types/workOrderExcel';

export interface ExportErrorResponse {
  error: string;
  code?: string;
}

export async function postWorkOrderExport(
  endpoint: string,
  organizationId: string,
  filters: WorkOrderExcelFilters,
): Promise<Response> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      organizationId,
      filters,
    }),
  });
}

export async function parseWorkOrderExportError(
  response: Response,
): Promise<Error & { code?: string }> {
  const errorData: ExportErrorResponse = await response.json().catch(() => ({ error: 'Unknown error' }));
  const error = new Error(errorData.error || `HTTP ${response.status}`) as Error & { code?: string };
  error.code = errorData.code;
  return error;
}

export function generateWorkOrderExportFilename(organizationName: string): string {
  const sanitizedOrgName = organizationName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = new Date().toISOString().split('T')[0];
  return `${sanitizedOrgName}_internal_work_order_packet_${timestamp}.xlsx`;
}

export function generateSingleWorkOrderPacketFilename(workOrderId: string): string {
  const timestamp = new Date().toISOString().split('T')[0];
  return `work_order_${workOrderId.slice(0, 8)}_internal_packet_${timestamp}.xlsx`;
}

export function generateSingleWorkOrderCsvFilename(workOrderId: string): string {
  const timestamp = new Date().toISOString().split('T')[0];
  return `work_order_${workOrderId.slice(0, 8)}_${timestamp}.csv`;
}

export function generateSingleWorkOrderDocxFilename(workOrderId: string): string {
  const timestamp = new Date().toISOString().split('T')[0];
  return `work_order_${workOrderId.slice(0, 8)}_internal_packet_${timestamp}.docx`;
}
