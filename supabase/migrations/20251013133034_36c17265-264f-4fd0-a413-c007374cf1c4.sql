-- Create attendance records table
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_in_location TEXT,
  check_out_time TIMESTAMP WITH TIME ZONE,
  check_out_location TEXT,
  notes TEXT,
  organization_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Create policies for attendance records
CREATE POLICY "Admins and managers can manage attendance records" 
ON public.attendance_records 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Employees can create own attendance records" 
ON public.attendance_records 
FOR INSERT 
WITH CHECK (employee_id IN (
  SELECT id FROM employees WHERE user_id = auth.uid()
));

CREATE POLICY "Employees can view own attendance records" 
ON public.attendance_records 
FOR SELECT 
USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- Create index for better performance
CREATE INDEX idx_attendance_employee_date ON public.attendance_records(employee_id, attendance_date);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_attendance_records_updated_at
BEFORE UPDATE ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();