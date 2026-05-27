'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Trash2, RotateCcw, Clock, User, Calendar, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DeletedItemsModal({ isOpen, onClose, selectedInventoryId, onRestoreSuccess }) {
  const [deletedItems, setDeletedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    if (isOpen && selectedInventoryId) {
      fetchDeletedItems();
    }
  }, [isOpen, selectedInventoryId]);

  const fetchDeletedItems = async () => {
    setLoading(true);
    try {
      // 1. Fetch items where is_deleted is true
      const { data: items, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('inventory_id', selectedInventoryId)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false });

      if (error) throw error;

      if (items && items.length > 0) {
        // 2. Fetch profiles separately to map deleted_by authors in memory
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name');
        
        const profilesMap = {};
        (profiles || []).forEach(p => { profilesMap[p.id] = p.full_name; });

        const itemsWithAuthors = items.map(item => ({
          ...item,
          deleted_by_name: profilesMap[item.deleted_by] || 'Usuario'
        }));

        setDeletedItems(itemsWithAuthors);
      } else {
        setDeletedItems([]);
      }
    } catch (err) {
      console.error("Error fetching deleted items:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item) => {
    setRestoringId(item.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Update is_deleted to false
      const { error: restoreError } = await supabase
        .from('inventory')
        .update({
          is_deleted: false,
          deleted_at: null,
          deleted_by: null
        })
        .eq('id', item.id);

      if (restoreError) throw restoreError;

      // 2. Log restoration in inventory_logs
      try {
        await supabase.from('inventory_logs').insert([{
          item_id: item.id,
          type: 'entry',
          quantity: item.stock_current,
          previous_stock: 0,
          new_stock: item.stock_current,
          reason: `Artículo restaurado en el inventario por el usuario`,
          user_id: user?.id
        }]);
      } catch (logErr) {
        console.warn("Error logging restoration:", logErr);
      }

      // 3. Update local state and trigger parent refresh
      setDeletedItems(prev => prev.filter(i => i.id !== item.id));
      onRestoreSuccess();
    } catch (err) {
      console.error("Error restoring item:", err);
      alert("Error al restaurar el artículo.");
    } finally {
      setRestoringId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
        >
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Artículos Eliminados</h3>
                <p className="text-xs text-slate-500">Historial de ítems desactivados de este almacén.</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 text-sm animate-pulse">Cargando eliminados...</p>
              </div>
            ) : deletedItems.length > 0 ? (
              <div className="space-y-3">
                {deletedItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="p-4 bg-slate-950/30 border border-slate-850 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-800 hover:bg-slate-950/50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Thumbnail preview */}
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-slate-800 bg-slate-950/60 overflow-hidden shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Box className="w-5 h-5 text-slate-650" />
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{item.name}</p>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                          {item.part_number && (
                            <span className="font-mono bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-850">{item.part_number}</span>
                          )}
                          <span>Stock: <strong className="text-slate-400">{item.stock_current} {item.unit || 'Piezas'}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end gap-2 text-right">
                      <div className="text-[10px] text-slate-500 space-y-0.5">
                        <div className="flex items-center sm:justify-end gap-1">
                          <Calendar className="w-3 h-3 text-slate-600" />
                          <span>{item.deleted_at ? new Date(item.deleted_at).toLocaleString() : 'Fecha desconocida'}</span>
                        </div>
                        <div className="flex items-center sm:justify-end gap-1">
                          <User className="w-3 h-3 text-slate-600" />
                          <span>Eliminado por: <strong className="text-slate-400">{item.deleted_by_name}</strong></span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRestore(item)}
                        disabled={restoringId !== null}
                        className="py-1.5 px-3 bg-slate-800 hover:bg-blue-600/10 text-slate-350 hover:text-blue-400 border border-slate-750 hover:border-blue-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                      >
                        {restoringId === item.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        Restaurar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-slate-600 gap-3">
                <Trash2 className="w-12 h-12 opacity-10" />
                <p className="italic text-sm font-medium">No hay ningún artículo eliminado en este almacén.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
