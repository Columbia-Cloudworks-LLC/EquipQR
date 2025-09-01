-- Add RLS policies for invitation_performance_logs table to fix security warning
-- This table is for system monitoring, so we'll restrict access to system operations only

-- Policy to allow system-level functions to insert performance logs
CREATE POLICY "system_insert_performance_logs" ON public.invitation_performance_logs
  FOR INSERT
  WITH CHECK (true);

-- Policy to restrict all other operations (no one can read, update, or delete these logs through normal queries)
CREATE POLICY "no_user_access_performance_logs" ON public.invitation_performance_logs
  FOR ALL
  USING (false);