-- First, list all current policies on work_order_notes to see what exists
SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'work_order_notes'
ORDER BY policyname;