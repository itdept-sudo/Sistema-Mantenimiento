-- =========================================================================
-- MIGRACIÓN Y CARGA DE DATOS PARA MÚLTIPLES INVENTARIOS
-- =========================================================================

-- 1. Crear tabla de Inventarios si no existe
CREATE TABLE IF NOT EXISTS public.inventories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en public.inventories
ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para evitar duplicados en re-ejecución
DROP POLICY IF EXISTS "Inventories are viewable by everyone" ON public.inventories;
DROP POLICY IF EXISTS "Authorized users can manage inventories" ON public.inventories;

-- Políticas para public.inventories
CREATE POLICY "Inventories are viewable by everyone" ON public.inventories FOR SELECT USING (true);
CREATE POLICY "Authorized users can manage inventories" ON public.inventories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
);

-- 2. Asegurar que existan los inventarios base en public.inventories
INSERT INTO public.inventories (name, description) VALUES
  ('Repuestos', 'Inventario de refacciones, partes y herramientas de mantenimiento.'),
  ('Productos de Limpieza', 'Inventario de artículos y suministros de aseo y limpieza.'),
  ('Producción', 'Inventario de suministros y materiales para las líneas de producción.')
ON CONFLICT (name) DO NOTHING;

-- 3. Modificar la tabla public.inventory para agregar relación
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS inventory_id INTEGER REFERENCES public.inventories(id) ON DELETE SET NULL;

-- 4. Modificar public.inventory para soportar las nuevas columnas del Sheet
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS stock_max INTEGER;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS weekly_usage NUMERIC;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS estimated_duration NUMERIC;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS estimated_date TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS extra_info TEXT;

-- 5. Asignar el inventario de "Repuestos" a todos los elementos existentes que no tengan asignación
UPDATE public.inventory 
SET inventory_id = (SELECT id FROM public.inventories WHERE name = 'Repuestos')
WHERE inventory_id IS NULL;

-- 6. Habilitar Realtime para public.inventories si no está habilitado
-- (Nota: Puede fallar si la tabla ya está en la publicación, por eso se ejecuta de manera segura)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'inventories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventories;
  END IF;
END
$$;

-- =========================================================================
-- 7. Insertar Productos de Limpieza
-- =========================================================================
DO $$
DECLARE
  v_limpieza_id INTEGER;
BEGIN
  SELECT id INTO v_limpieza_id FROM public.inventories WHERE name = 'Productos de Limpieza';

    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Tapete de mijitorio', 12, 25, 50, 'Piezas', 5, 5, 'June 29', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Aromatizante en barra para baño', 5, 10, 30, 'Piezas', 2, 5, 'June 29', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Aromatizante en spray', 5, 6, 10, 'Piezas', 1, 6, 'July 6', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Aceite para muebles en spray - Pledge', 5, 5, 30, 'Piezas', 1, 5, 'June 29', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Fibra scotch', 5, 8, 30, 'Piezas', 1, 8, 'July 20', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Trapo de limpieza', 5, 6, 20, 'Piezas', 1, 6, 'July 6', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Cepillo para taza', 1, 2, 5, 'Piezas', 0.1, 20, 'October 12', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Desengrasante', 2, 12, 12, 'Piezas', 2, 6, 'July 6', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Cloro', 2, 12, 12, 'Piezas', 2, 6, 'July 6', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Fabuloso', 1, 8, 12, 'Piezas', 2, 4, 'June 22', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Windex', 2, 4, 5, 'Piezas', 0.5, 8, 'July 20', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Rollo bolsa negra caja con 20 rollos 1000 pcs', 20, 140, 200, 'Rollo', 10, 14, 'August 31', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Bolsa negra grande', 50, 330, 300, 'Piezas', 40, 8.25, 'July 21', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Bolsa transparente grande', 50, 700, 800, 'Piezas', 40, 17.5, 'September 24', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Caja de servilletas', 10, 9, 20, 'CAJA', 1, 9, 'July 27', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Caja de conos 5000 pcs', 10, 14, 20, 'CAJA', 1, 14, 'August 31', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Caja de toalla rollo cafe 6 rollos', 15, 5, 40, 'CAJA', 5, 1, 'June 1', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Papel rollo oficinas - Elite Jumbo 12 rollos', 2, 0, 30, 'Paquetes', 1, NULL, 'May 25', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Papel rollo - Tork', 50, 19, 250, 'Piezas', 40, 0.475, 'May 28', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Jabon liquido de manos', 2, 2, 5, 'Piezas', 0.1, 20, 'October 12', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Jabon espuma de manos', 2, 15, 5, 'CAJA', 2, 7.5, 'July 16', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Jabon polvo', 2, 3, 5, 'Piezas', 0.5, 6, 'July 6', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Jabon AXION', 1, 1, 5, 'Piezas', 0.5, 2, 'June 8', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Aserin para piso', 2, 11, 5, 'COSTAL', 1.5, 7.333333333, 'July 15', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Porta papel cafe', 1, 1, 5, 'Piezas', 0.1, 10, 'August 3', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Repuesto mopa 90 cm', 2, 11, 10, 'Piezas', 1, 11, 'August 10', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Repuesto mopa 60 cm', 2, 11, 10, 'Piezas', 1, 11, 'August 10', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Dispensador sin bote', 1, 5, 5, 'Piezas', 0.1, 50, 'May 10', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Repuesto trapeador', 2, 4, 10, 'Piezas', 1, 4, 'June 22', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Escobas', 2, 2, 5, 'Piezas', 0.1, 20, 'October 12', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Trapeadores', 2, 4, 5, 'Piezas', 0.1, 40, 'March 1', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Recogedores', 2, 2, 5, 'Piezas', 0.1, 20, 'October 12', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Jaboneras negras para manos nuevas', 1, 2, 5, 'Piezas', 0.1, 20, 'October 12', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Jaboneras negras para manos usadas', 1, 2, 5, 'Piezas', 0.1, 20, 'October 12', v_limpieza_id);
    INSERT INTO public.inventory (name, stock_min, stock_current, stock_max, unit, weekly_usage, estimated_duration, estimated_date, inventory_id)
    VALUES ('Jaboneras blancas para manos', 1, 5, 5, 'Piezas', 0.1, 50, 'May 10', v_limpieza_id);
END;
$$;

-- =========================================================================
-- 8. Insertar Productos de Producción
-- =========================================================================
DO $$
DECLARE
  v_produccion_id INTEGER;
BEGIN
  SELECT id INTO v_produccion_id FROM public.inventories WHERE name = 'Producción';

    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Fleje', 'Rack 2 A', 'Costales de bolsa', 115, 'Pz', 120, 30, 150, 0.9583333333, 'May 31', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Papel rollo butcher 18x40 Rosa', 'Rack 2 A', NULL, 1, 'Pz', 0.1, 1, 5, 10, 'August 3', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Bolsa 11x16', 'Rack 2 A', '325.00', 1170000, 'Pz', 20, 40, 150, 16.25, 'September 15', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Bolsa 14x20', 'Rack 2 A', '250.00', 825000, 'Pz', 6, 40, 150, 41.66666667, 'March 12', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Papel de paleta 24', 'Rack 2 A', NULL, 3, 'Pz', 3, 0, NULL, 1, 'June 1', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Papel de paleta 18', 'Rack 2 A', NULL, 12, 'Pz', 5, 6, 25, 2.4, 'June 10', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Bolsa grande empaque', 'Rack 2 A', NULL, 0, 'Pz', 2, 0, NULL, NULL, 'May 25', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Tinta blocker kara', 'Rack 2 A', NULL, 2, 'Pz', 1.5, 2, 8, 1.333333333, 'June 3', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Clear', 'Rack 2 A', NULL, 0.5, 'Pz', 1, 2, 8, 0.5, 'May 28', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Tape transparente', 'Rack 2 A', NULL, 336, 'Pz', 240, 150, 600, 1.4, 'June 3', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Tape cafe', 'Rack 2 A', NULL, 0, 'Pz', 20, 24, 100, NULL, 'May 25', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Masking tape 1', 'Rack 2 A', NULL, 26, 'Pz', 24, 36, 150, 1.083333333, 'June 1', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Masking tape 2', 'Rack 2 A', NULL, 43, 'Pz', 20, 24, 150, 2.4, 'June 10', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Cinta polyken 3', 'Rack 2 A', NULL, 0, 'Pz', 10, 24, 100, 5.333333333, 'April 15', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Cinta Block out 3', 'Rack 2 A', NULL, 48, 'Pz', 10, 24, 100, 4.8, 'June 27', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Label 6x4', 'Rack 3 A', NULL, 82, 'Caja', 15, 15, 150, 5.466666667, 'July 2', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Label 3x1', 'Rack 3 A', NULL, 136, 'Pz', 24, 50, 200, 5.666666667, 'July 3', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Balas 3', 'Rack 3 A', NULL, 200000, 'Pz', 100000, 100000, 1000000, 2, 'June 8', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Balas 3 fina', 'Rack 3 A', 'Entregado a TRIM', 150000, 'Pz', 100000, 100000, 1000000, 1.5, 'June 4', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Balas 2 Koreana', 'Rack 3 A', NULL, 225000, 'Pz', 100000, 100000, 1000000, 2.25, 'June 9', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Balas 2 fina', 'Rack 3 A', NULL, 240000, 'Pz', 100000, 100000, 1000000, 2.4, 'June 10', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Balas 1', 'Rack 3 A', NULL, 80000, 'Pz', 100000, 100000, 1000000, NULL, 'May 25', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Balas 3/4', 'Rack 3 A', NULL, 100000, 'Pz', 100000, 100000, 1000000, NULL, 'May 25', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Resmas de hojas', 'Rack 3 A', NULL, 9, 'Pz', 10, 3, 10, 0.9, 'May 31', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Bolsas mixtas', 'Rack 3 A', NULL, 0, 'Pz', 0, 0, NULL, NULL, NULL, v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Sobres de envio Ful', 'Rack 3 A', NULL, 0, 'Caja', 0, 0, NULL, NULL, NULL, v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Cepillo', 'Rack 4 A', NULL, 312, 'Pz', 48, 72, 800, 6.5, 'July 9', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('OPEN SCREEN /BLAST', 'Rack 4 A', NULL, 8, 'Pz', 15, 12, 36, 0.5333333333, 'May 28', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('SILICONE RELEASE SPRAY 610', 'Rack 4 A', NULL, 30, 'Pz', 8, 12, 36, 3.75, 'June 20', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('OPEN SCREEN WATER BASED', 'Rack 4 A', NULL, 0, 'Pz', 1, 12, 36, NULL, NULL, v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('POWDER SPOT REMOVER', 'Rack 4 A', NULL, 132, 'Pz', 2, 12, 36, 66, 'August 30', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('FAST TACK 584', 'Rack 4 A', NULL, 36, 'Pz', 1, 12, 36, 36, 'February 1', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('FAST TACK 583', 'Rack 4 A', NULL, 0, 'Pz', 1, 12, 36, NULL, 'May 25', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('SPOT LIFTER', 'Rack 4 A', NULL, 75, 'Pz', 1, 12, 36, 75, 'November 1', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('MIST', 'Rack 4 A', NULL, 157, 'Pz', 1, 12, 36, 157, 'May 28', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('FLASH ADHESIVO', 'Rack 4 A', NULL, 50, 'Pz', 1, 12, 36, 50, 'May 10', v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Botella para goma', 'Rack 5 A', NULL, 25, 'Pz', 0, 0, NULL, NULL, NULL, v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Agua destilada', 'Rack 5 A', NULL, 1, 'Pz', 0, 0, NULL, NULL, NULL, v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Pre tratamiento brother', 'Rack 5 A', NULL, 3, 'Pz', 0, 0, NULL, NULL, NULL, v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Tinta para korni', 'Rack 5 A', NULL, 8, 'Pz', 0, 0, NULL, NULL, NULL, v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Cartucho ploter', 'Rack 5 A', NULL, 0, 'Pz', 0, 0, NULL, NULL, NULL, v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Kit unlabeled screen', 'Rack 5 A', NULL, 6, 'Caja', 0, 0, NULL, NULL, NULL, v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Pegamento Rino', 'Rack 5 A', NULL, 3, 'Caja', 0, 0, NULL, NULL, NULL, v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Contenedor en bote y tapa', 'Rack 5 A', NULL, 6, 'Caja', 0, 0, NULL, NULL, NULL, v_produccion_id);
    INSERT INTO public.inventory (name, location, extra_info, stock_current, unit, weekly_usage, stock_min, stock_max, estimated_duration, estimated_date, inventory_id)
    VALUES ('Carrito de aluminio', 'Rack 5 A', NULL, 6, 'Pz', 0, 0, NULL, NULL, NULL, v_produccion_id);
END;
$$;
