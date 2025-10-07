-- Fix security issues in RLS policies

-- 1. Fix profiles table: Only allow users to view their own profile or admins can view all
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles 
  FOR SELECT TO authenticated 
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- 2. Fix employees table: Only admins and managers can view employee data
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;
CREATE POLICY "Admins and managers can view employees" ON public.employees 
  FOR SELECT TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- 3. Fix employee_transactions table: Only admins and managers can view transactions
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON public.employee_transactions;
CREATE POLICY "Admins and managers can view transactions" ON public.employee_transactions 
  FOR SELECT TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));