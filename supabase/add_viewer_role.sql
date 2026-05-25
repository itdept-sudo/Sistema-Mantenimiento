ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'manager', 'supervisor', 'inventory', 'technician', 'employee', 'viewer'));

ALTER TABLE public.pre_approved_users DROP CONSTRAINT IF EXISTS pre_approved_users_role_check;
ALTER TABLE public.pre_approved_users ADD CONSTRAINT pre_approved_users_role_check CHECK (role IN ('admin', 'manager', 'supervisor', 'inventory', 'technician', 'employee', 'viewer'));
