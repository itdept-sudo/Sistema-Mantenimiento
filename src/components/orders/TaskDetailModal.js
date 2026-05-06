'use client';

import { X, Calendar, User, Tag, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TaskDetailModal({ isOpen, onClose, task }) {
  if (!isOpen || !task) return null;

  const statusColors = {
    open: 'bg-blue-500/20 text-blue-400',
    in_progress: 'bg-orange-500/20 text-orange-400',
    resolved: 'bg-emerald-500/20 text-emerald-400',
    closed: 'bg-slate-500/20 text-slate-400',
  };

  const priorityColors = {
    low: 'bg-slate-500/20 text-slate-400',
    medium: 'bg-blue-500/20 text-blue-400',
    high: 'bg-orange-500/20 text-orange-400',
    urgent: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusColors[task.status]}`}>
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Detalles de Orden</h3>
              <p className="text-xs text-slate-500">ID: {task.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Tag className="w-3 h-3" /> Máquina
              </span>
              <p className="text-white font-bold text-lg">{task.machine?.name || 'N/A'}</p>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 justify-end">
                <Calendar className="w-3 h-3" /> Fecha Reporte
              </span>
              <p className="text-white">{new Date(task.created_at).toLocaleDateString()} {new Date(task.created_at).toLocaleTimeString()}</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tighter ${priorityColors[task.priority]}`}>
              Prioridad: {task.priority}
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-bold uppercase tracking-tighter">
              Tipo: {task.maintenance_type}
            </div>
          </div>

          <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-800">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-widest">Descripción del Reporte</h4>
            <p className="text-slate-300 leading-relaxed italic">"{task.description}"</p>
          </div>

          {task.status === 'resolved' && (
            <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">Esta tarea ha sido marcada como resuelta. Listo para el cierre definitivo.</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-900/50 border-t border-slate-800">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
          >
            Cerrar Ventana
          </button>
        </div>
      </motion.div>
    </div>
  );
}
