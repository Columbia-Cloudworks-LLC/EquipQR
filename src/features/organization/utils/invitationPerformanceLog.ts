import { supabase } from '@/integrations/supabase/client';

export async function logInvitationPerformance(params: {
  functionName: string;
  executionTimeMs: number;
  success: boolean;
  errorMessage?: string;
}): Promise<void> {
  try {
    await supabase.rpc('log_invitation_performance', {
      function_name: params.functionName,
      execution_time_ms: params.executionTimeMs,
      success: params.success,
      error_message: params.errorMessage ?? null,
    });
  } catch {
    // Performance logging is non-critical
  }
}
