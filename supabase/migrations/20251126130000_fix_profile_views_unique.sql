-- ============================================================================
-- Fix Profile Views to Count Each Investor Only Once
-- This prevents duplicate view records from the same investor
-- ============================================================================

BEGIN;

-- Add unique constraint so each investor can only view once
-- (This will fail if duplicates exist, so we clean them first)

-- Step 1: Remove duplicate views, keeping only the most recent for each investor
WITH duplicates AS (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY startup_id, viewer_id 
        ORDER BY viewed_at DESC
      ) as rn
    FROM profile_views
  ) ranked
  WHERE rn > 1
)
DELETE FROM profile_views
WHERE id IN (SELECT id FROM duplicates);

-- Step 2: Add unique constraint
ALTER TABLE profile_views
  ADD CONSTRAINT profile_views_startup_viewer_unique
  UNIQUE (startup_id, viewer_id);

-- Step 3: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profile_views_startup_viewer 
  ON profile_views(startup_id, viewer_id);

COMMIT;

-- Verification: Check for any remaining duplicates (should return 0)
SELECT 
  startup_id, 
  viewer_id, 
  COUNT(*) as view_count
FROM profile_views
GROUP BY startup_id, viewer_id
HAVING COUNT(*) > 1;

