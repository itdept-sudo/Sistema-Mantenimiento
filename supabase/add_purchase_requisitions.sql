-- 1. Agregar columna responsable_id a inventories para asignar encargados de almacén
ALTER TABLE public.inventories ADD COLUMN IF NOT EXISTS responsable_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.inventories.responsable_id IS 'ID del perfil asignado como responsable exclusivo de este almacén';

-- 2. Actualizar el CHECK constraint de roles en profiles para incluir el rol 'buyer' (Comprador)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'manager', 'supervisor', 'inventory', 'technician', 'employee', 'viewer', 'buyer'));

-- 3. Crear la tabla de Requisiciones de Compra
CREATE TABLE IF NOT EXISTS public.purchase_requisitions (
  id SERIAL PRIMARY KEY,
  inventory_id INTEGER REFERENCES public.inventories(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  folio TEXT UNIQUE,
  type TEXT CHECK (type IN ('mexican', 'american')),
  provider TEXT,
  department TEXT,
  ex_rate NUMERIC(10, 4) DEFAULT 1.0,
  currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'MXP')),
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'sent_for_approval', 'completed', 'rejected')),
  boss_emails TEXT,
  quotation_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.purchase_requisitions IS 'Tabla que almacena las solicitudes de compra del inventario';

-- 4. Crear la tabla de Items en las Requisiciones de Compra
CREATE TABLE IF NOT EXISTS public.purchase_requisition_items (
  id SERIAL PRIMARY KEY,
  requisition_id INTEGER REFERENCES public.purchase_requisitions(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES public.inventory(id) ON DELETE SET NULL,
  qty NUMERIC(10, 2) NOT NULL,
  description TEXT NOT NULL,
  unit_price NUMERIC(10, 2) DEFAULT 0.00,
  dept_client TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.purchase_requisition_items IS 'Tabla que almacena los artículos o conceptos asociados a una requisición de compra';

-- 5. Crear el Trigger para generar el folio automático en formato PP-0001
CREATE OR REPLACE FUNCTION public.generate_purchase_requisition_folio()
RETURNS trigger AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(id), 0) + 1 INTO next_seq FROM public.purchase_requisitions;
  NEW.folio := 'PP-' || lpad(next_seq::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_purchase_requisition_folio ON public.purchase_requisitions;
CREATE TRIGGER trg_generate_purchase_requisition_folio
BEFORE INSERT ON public.purchase_requisitions
FOR EACH ROW
WHEN (NEW.folio IS NULL)
EXECUTE FUNCTION public.generate_purchase_requisition_folio();

-- 6. Habilitar la Seguridad a Nivel de Fila (RLS) en ambas tablas
ALTER TABLE public.purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requisition_items ENABLE ROW LEVEL SECURITY;

-- 7. Crear Políticas de Seguridad
-- Requisiciones
CREATE POLICY "Purchase requisitions are viewable by everyone authenticated" ON public.purchase_requisitions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Purchase requisitions can be created by authenticated users" ON public.purchase_requisitions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Purchase requisitions can be updated by authorized users" ON public.purchase_requisitions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.role IN ('admin', 'supervisor', 'buyer'))
    )
  );

-- Items
CREATE POLICY "Purchase requisition items are viewable by everyone authenticated" ON public.purchase_requisition_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Purchase requisition items can be created by authenticated users" ON public.purchase_requisition_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Purchase requisition items can be updated by authorized users" ON public.purchase_requisition_items
  FOR ALL USING (auth.role() = 'authenticated');
