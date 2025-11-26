-- Seed global PM templates from markdown
-- This migration was applied directly to production
-- Idempotent: Safe to run multiple times

BEGIN;

-- This migration likely seeded templates from markdown files
-- Since we don't have the exact markdown content, we'll use a minimal idempotent version
-- The actual seeding was done via direct SQL in production

COMMIT;

