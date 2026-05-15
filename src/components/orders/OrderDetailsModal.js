'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Calendar, User, Clock, AlertCircle, CheckCircle2, Hammer, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OrderDetailsModal({ isOpen, onClose, orderId }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId || !isOpen) return;
      
      try {
        setLoading(true);
        console.log("Cargando detalles de orden:", orderId);
        
        const { data, error } = await supabase
          .from('work_orders')
          .select(`
            *,
            technician:technician_id(full_name),
            machine:machine_id(name, alias)
          `)
          .eq('id', orderId)
          .single();

        if (error) throw error;
        if (data) setOrder(data);
      } catch (err) {
        console.error("Error al cargar detalles de la orden:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              order?.status === 'closed' ? 'bg-emerald-500/10 text-emerald-500' : 
              order?.status === 'in_progress' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'
            }`}>
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                Orden #{orderId ? orderId.toString().slice(0, 8) : '...'}
              </h3>
              <p className="text-xs text-slate-500">Detalles técnicos de la intervención.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm">Cargando detalles...</p>
          </div>
        ) : order ? (
          <div className="p-6 space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Estado</label>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    order.status === 'closed' ? 'bg-emerald-500' : 
                    order.status === 'in_progress' ? 'bg-orange-500' : 'bg-blue-500'
                  }`} />
                  <span className="text-sm font-bold text-white uppercase">{order.status}</span>
                </div>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Prioridad</label>
                <span className={`text-sm font-bold uppercase ${
                  order.priority === 'urgent' || order.priority === 'high' ? 'text-red-400' : 'text-blue-400'
                }`}>{order.priority}</span>
              </div>
            </div>

            {/* Machine & Technician */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
                  <Hammer className="w-5 h-5" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Equipo</label>
                  <p className="text-sm font-bold text-white">{order.machine?.name} <span className="text-indigo-400 italic">"{order.machine?.alias}"</span></p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Técnico Asignado</label>
                  <p className="text-sm font-bold text-white">{order.technician?.full_name || 'Sin asignar'}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Descripción del Reporte</label>
              <p className="text-sm text-slate-300 leading-relaxed italic">
                "{order.description}"
              </p>
            </div>

            {/* Footer Dates */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800 text-[10px] text-slate-500 font-bold uppercase">
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                Creada: {new Date(order.created_at).toLocaleString()}
              </div>
              {order.closed_at && (
                <div className="flex items-center gap-2 text-emerald-500">
                  <CheckCircle2 className="w-3 h-3" />
                  Cerrada: {new Date(order.closed_at).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-10 text-center text-slate-500">No se encontró la orden.</div>
        )}
      </motion.div>
    </div>
  );
}
