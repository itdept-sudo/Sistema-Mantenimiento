-- Script para agregar la columna image_url a la tabla de inventario
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Opcional: Si deseas que los usuarios de inventario/administración tengan permisos de actualización
-- (Ya están configuradas las políticas generales en public.inventory, pero esto asegura la disponibilidad de la columna)
COMMENT ON COLUMN public.inventory.image_url IS 'URL pública de la imagen del item de inventario';
