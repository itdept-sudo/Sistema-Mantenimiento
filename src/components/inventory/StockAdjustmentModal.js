'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, ArrowUpRight, ArrowDownRight, Clipboard, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StockAdjustmentModal({ isOpen, onClose, item, onSuccess }) {
  const [type, setType] = useState('entry'); // 'entry' or 'exit'
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!item) return;
    setLoading(true);

    try {
      const newStock = type === 'entry' 
        ? item.stock_current + quantity 
        : item.stock_current - quantity;

      if (newStock < 0) {
        alert('El stock no puede ser negativo');
        setLoading(false);
        return;
      }

      // 1. Update Inventory
      const { error: invError } = await supabase
        .from('inventory')
        .update({ stock_current: newStock })
        .eq('id', item.id);
      
      if (invError) throw invError;

      // 2. Log History (Assuming we have an inventory_logs table)
      // If table doesn't exist, this will fail but inventory update is done
      try {
        await supabase.from('inventory_logs').insert([{
          item_id: item.id,
          type,
          quantity,
          previous_stock: item.stock_current,
          new_stock: newStock,
          reason,
          user_id: (await supabase.auth.getUser()).data.user?.id
        }]);
      } catch (logErr) {
        console.warn("Log table not found or error:", logErr);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert('Error al ajustar el stock');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Clipboard className="w-5 h-5 text-blue-400" />
              Ajustar Stock
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 bg-slate-950/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-blue-400 font-bold">
                {item.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{item.name}</p>
                <p className="text-xs text-slate-500">Stock Actual: <span className="text-slate-300 font-mono">{item.stock_current}</span></p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => setType('entry')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
                  type === 'entry' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-transparent'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" /> Entrada
              </button>
              <button 
                type="button"
                onClick={() => setType('exit')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
                  type === 'exit' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-400 border border-transparent'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" /> Salida
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Cantidad</label>
              <input 
                required
                type="number" 
                min="1"
                value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-2xl font-bold text-center text-white focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Motivo / Referencia</label>
              <input 
                required
                type="text" 
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500"
                placeholder="Ej: Orden #123, Compra mensual..."
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-bold shadow-xl transition-all flex items-center justify-center gap-2 ${
                type === 'entry' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-red-600 hover:bg-red-500 shadow-red-900/20'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Save className="w-5 h-5" /> Confirmar Ajuste</>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
