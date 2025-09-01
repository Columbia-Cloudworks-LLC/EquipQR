-- Drop ALL existing policies on work_order_notes (comprehensive cleanup)
DO $$ 
DECLARE
    pol_name TEXT;
BEGIN
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'work_order_notes'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON work_order_notes', pol_name);
    END LOOP;
END $$;

-- Verify all policies are dropped
SELECT COUNT(*) as remaining_policies 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'work_order_notes';