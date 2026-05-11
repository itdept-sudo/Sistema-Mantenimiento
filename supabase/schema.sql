-- Borrar tablas si existen (para limpieza)
-- DROP TABLE IF EXISTS public.order_parts;
-- DROP TABLE IF EXISTS public.work_orders;
-- DROP TABLE IF EXISTS public.maintenance_schedules;
-- DROP TABLE IF EXISTS public.inventory;
-- DROP TABLE IF EXISTS public.machines;
-- DROP TABLE IF EXISTS public.profiles;

-- Tabla de Perfiles
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'technician' CHECK (role IN ('manager', 'technician')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Tabla de Máquinas
CREATE TABLE public.machines (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  type TEXT,
  status TEXT DEFAULT 'operating' CHECK (status IN ('operating', 'failure', 'maintenance')),
  x_pos FLOAT DEFAULT 0,
  y_pos FLOAT DEFAULT 0,
  last_maintenance TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

-- Tabla de Inventario (Repuestos)
CREATE TABLE public.inventory (
  id SERIAL PRIMARY KEY,
  part_number TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  stock_current INTEGER DEFAULT 0,
  stock_min INTEGER DEFAULT 0,
  unit_price DECIMAL(10, 2),
  location TEXT,
  provider TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Tabla de Órdenes de Trabajo
CREATE TABLE public.work_orders (
  id SERIAL PRIMARY KEY,
  machine_id INTEGER REFERENCES public.machines(id),
  technician_id UUID REFERENCES public.profiles(id),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deadline TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  photo_urls TEXT[],
  maintenance_type TEXT DEFAULT 'corrective' CHECK (maintenance_type IN ('preventive', 'corrective')),
  reporter_emp_num TEXT,
  reporter_name TEXT
);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- Tabla de Consumo de Repuestos por Orden
CREATE TABLE public.order_parts (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES public.work_orders(id) ON DELETE CASCADE,
  part_id INTEGER REFERENCES public.inventory(id),
  quantity INTEGER DEFAULT 1,
  consumed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.order_parts ENABLE ROW LEVEL SECURITY;

-- Tabla de Programación de Mantenimiento Preventivo
CREATE TABLE public.maintenance_schedules (
  id SERIAL PRIMARY KEY,
  machine_id INTEGER REFERENCES public.machines(id),
  task_description TEXT NOT NULL,
  interval_days INTEGER,
  last_performed TIMESTAMPTZ,
  next_due TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE SEGURIDAD (RLS) --

-- Perfiles: Todos pueden ver perfiles, solo el dueño puede editar su nombre.
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Máquinas: Todos pueden ver, solo managers pueden editar.
CREATE POLICY "Machines are viewable by everyone" ON public.machines FOR SELECT USING (true);
CREATE POLICY "Managers can manage machines" ON public.machines FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
);

-- Inventario: Todos pueden ver, usuarios autenticados pueden editar stock.
CREATE POLICY "Inventory is viewable by everyone" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Authorized users can update inventory" ON public.inventory FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
);

-- Órdenes de Trabajo: Todos pueden ver y editar si están autenticados.
CREATE POLICY "Work orders are viewable by everyone" ON public.work_orders FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create work orders" ON public.work_orders FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update work orders" ON public.work_orders FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Consumo de Repuestos: Todos pueden ver y manejar si están autenticados.
CREATE POLICY "Order parts are viewable by everyone" ON public.order_parts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage order parts" ON public.order_parts FOR ALL USING (auth.uid() IS NOT NULL);

-- TRIGGER para crear perfil automáticamente al registrarse un usuario en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, 'technician');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- HABILITAR REALTIME PARA TABLAS CLAVE
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.machines;
