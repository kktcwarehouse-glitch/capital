-- Add additional fields to startup_profiles table
-- Founders, Business Metrics, and Investment Details

begin;

-- Add new columns to startup_profiles
alter table startup_profiles
  add column if not exists founders jsonb default '[]'::jsonb,
  add column if not exists monthly_recurring_revenue numeric check (monthly_recurring_revenue is null or monthly_recurring_revenue >= 0),
  add column if not exists growth_percentage numeric check (growth_percentage is null or growth_percentage >= 0),
  add column if not exists growth_period_months integer check (growth_period_months is null or (growth_period_months >= 6 and growth_period_months <= 12)),
  add column if not exists important_partnerships text,
  add column if not exists equity_offered numeric check (equity_offered is null or (equity_offered >= 0 and equity_offered <= 100)),
  add column if not exists company_valuation_pre_money numeric check (company_valuation_pre_money is null or company_valuation_pre_money >= 0),
  add column if not exists minimum_investment numeric check (minimum_investment is null or minimum_investment >= 0);

commit;



