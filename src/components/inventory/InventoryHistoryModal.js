'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, ArrowUpRight, ArrowDownRight, Clock, User, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InventoryHistoryModal({ isOpen, onClose, item }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && item) {
      fetchLogs();
    }
  }, [isOpen, item]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_logs')
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .eq('item_id', item.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
        >
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Historial de Movimientos
              </h3>
              <p className="text-xs text-slate-500 mt-1">{item.name} • {item.part_number}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 text-sm animate-pulse">Cargando historial...</p>
              </div>
            ) : logs.length > 0 ? (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl flex gap-4 hover:border-slate-700 transition-colors">
                    <div className={`mt-1 p-2 rounded-xl h-fit ${
                      log.type === 'entry' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {log.type === 'entry' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-white">
                            {log.type === 'entry' ? 'Entrada de Almacén' : 'Salida / Consumo'}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-black ${
                            log.type === 'entry' ? 'text-emerald-500' : 'text-red-500'
                          }`}>
                            {log.type === 'entry' ? '+' : '-'}{log.quantity}
                          </p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                            Saldo: {log.new_stock}
                          </p>
                        </div>
                      </div>

                      {log.reason && (
                        <div className="flex items-start gap-2 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/50">
                          <MessageSquare className="w-3 h-3 text-slate-600 mt-1 shrink-0" />
                          <p className="text-xs text-slate-400 italic">"{log.reason}"</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                          {log.profiles?.full_name?.charAt(0) || 'U'}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          {log.profiles?.full_name || 'Usuario desconocido'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-4 opacity-30">
                <Clock className="w-16 h-16" />
                <p className="italic font-medium text-lg text-center">No hay registros de movimientos para este item.</p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-800 bg-slate-900/50">
            <button onClick={onClose} className="w-full py-4 bg-slate-800 hover:bg-slate-750 text-white rounded-2xl font-bold transition-all">
              Cerrar Historial
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
