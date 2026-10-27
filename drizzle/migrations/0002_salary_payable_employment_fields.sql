ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS hire_date date, ADD COLUMN IF NOT EXISTS basic_salary numeric, ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE public.chart_of_accounts ADD CONSTRAINT chart_of_accounts_basic_salary_nonnegative CHECK (basic_salary IS NULL OR basic_salary >= 0);
COMMENT ON COLUMN public.chart_of_accounts.hire_date IS 'Employment date for salary payable subaccounts';
COMMENT ON COLUMN public.chart_of_accounts.basic_salary IS 'Basic salary for salary payable subaccounts';
COMMENT ON COLUMN public.chart_of_accounts.job_title IS 'Job title for salary payable subaccounts';