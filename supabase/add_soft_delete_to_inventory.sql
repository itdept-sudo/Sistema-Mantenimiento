-- Script para agregar soporte de borrado lógico (soft delete) a la tabla de inventario
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

COMMENT ON COLUMN public.inventory.is_deleted IS 'Indica si el artículo ha sido eliminado lógicamente (soft deleted)';
COMMENT ON COLUMN public.inventory.deleted_at IS 'Fecha y hora en que se eliminó lógicamente el artículo';
COMMENT ON COLUMN public.inventory.deleted_by IS 'Referencia al perfil de usuario que eliminó el artículo';
