# How to Apply the Migration

The migration adds new fields to the `startup_profiles` table. You need to run it in your Supabase database.

## Option 1: Supabase SQL Editor (Recommended)

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the following SQL:

```sql
-- Add additional fields to startup_profiles table
ALTER TABLE startup_profiles
  ADD COLUMN IF NOT EXISTS founders jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS monthly_recurring_revenue numeric CHECK (monthly_recurring_revenue IS NULL OR monthly_recurring_revenue >= 0),
  ADD COLUMN IF NOT EXISTS growth_percentage numeric CHECK (growth_percentage IS NULL OR growth_percentage >= 0),
  ADD COLUMN IF NOT EXISTS growth_period_months integer CHECK (growth_period_months IS NULL OR (growth_period_months >= 6 AND growth_period_months <= 12)),
  ADD COLUMN IF NOT EXISTS important_partnerships text,
  ADD COLUMN IF NOT EXISTS equity_offered numeric CHECK (equity_offered IS NULL OR (equity_offered >= 0 AND equity_offered <= 100)),
  ADD COLUMN IF NOT EXISTS company_valuation_pre_money numeric CHECK (company_valuation_pre_money IS NULL OR company_valuation_pre_money >= 0),
  ADD COLUMN IF NOT EXISTS minimum_investment numeric CHECK (minimum_investment IS NULL OR minimum_investment >= 0);
```

6. Click **Run** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
7. You should see "Success. No rows returned"

## Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

This will apply all pending migrations.

## Verification

After running the migration, you can verify it worked by running this query in SQL Editor:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'startup_profiles' 
AND column_name IN ('founders', 'monthly_recurring_revenue', 'growth_percentage', 'equity_offered');
```

You should see all 4 columns listed.



