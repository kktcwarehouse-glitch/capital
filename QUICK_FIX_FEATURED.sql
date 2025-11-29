-- ============================================================================
-- QUICK FIX: Add is_featured Column (If Migration Wasn't Run)
-- ============================================================================
-- Run this in Supabase SQL Editor if the featured feature isn't working
-- This will add the column if it doesn't exist

BEGIN;

-- Add is_featured to startup_profiles if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'startup_profiles' 
        AND column_name = 'is_featured'
    ) THEN
        ALTER TABLE startup_profiles 
        ADD COLUMN is_featured boolean NOT NULL DEFAULT false;
        
        RAISE NOTICE 'Added is_featured column to startup_profiles';
    ELSE
        RAISE NOTICE 'is_featured column already exists in startup_profiles';
    END IF;
END $$;

-- Add is_featured to investor_profiles if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'investor_profiles' 
        AND column_name = 'is_featured'
    ) THEN
        ALTER TABLE investor_profiles 
        ADD COLUMN is_featured boolean NOT NULL DEFAULT false;
        
        RAISE NOTICE 'Added is_featured column to investor_profiles';
    ELSE
        RAISE NOTICE 'is_featured column already exists in investor_profiles';
    END IF;
END $$;

-- Verify the columns exist
SELECT 
    'startup_profiles' as table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'startup_profiles' 
AND column_name = 'is_featured'

UNION ALL

SELECT 
    'investor_profiles' as table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'investor_profiles' 
AND column_name = 'is_featured';

COMMIT;

-- ============================================================================
-- TEST: Manually set a company as featured (replace with your startup ID)
-- ============================================================================
-- UPDATE startup_profiles 
-- SET is_featured = true 
-- WHERE company_name = 'Your Company Name';
-- 
-- Then verify:
-- SELECT id, company_name, is_featured FROM startup_profiles WHERE is_featured = true;

