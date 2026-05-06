'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { X, AlertTriangle, Hammer, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OrderModal({ isOpen, onClose, initialMachineId, machines, onSuccess }) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'supervisor';

  const [formData, setFormData] = useState({
    machine_id: '',
    description: '',
    priority: 'medium',
    maintenance_type: 'corrective',
    technician_id: ''
  });
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialMachineId) {
      setFormData(prev => ({ ...prev, machine_id: initialMachineId }));
    }
    
    const fetchTechnicians = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'technician');
      if (data) setTechnicians(data);
    };

    if (isOpen) fetchTechnicians();
  }, [initialMachineId, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error: orderError } = await supabase
      .from('work_orders')
      .insert([formData]);

    if (!orderError && formData.maintenance_type === 'corrective') {
      // Forzar que la máquina se ponga en rojo
      await supabase
        .from('machines')
        .update({ status: 'failure' })
        .eq('id', formData.machine_id);
    }

    if (orderError) {
      alert("Error al crear la orden: " + orderError.message);
    } else {
      onSuccess?.();
      onClose();
      setFormData({ machine_id: '', description: '', priority: 'medium', maintenance_type: 'corrective', technician_id: '' });
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Generar Orden</h3>
              <p className="text-xs text-slate-500">Reporte técnico y asignación.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Selección de Máquina */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Máquina Afectada</label>
            <select 
              required
              value={formData.machine_id}
              onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Selecciona una máquina...</option>
              {machines?.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Prioridad</label>
              <select 
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categoría</label>
              <select 
                value={formData.maintenance_type}
                onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="corrective">Correctivo</option>
                <option value="preventive">Preventivo</option>
              </select>
            </div>
          </div>

          {/* Asignación de Técnico (Solo Admin/Supervisor) */}
          {isAdmin && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Asignar a Técnico</label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                <select 
                  value={formData.technician_id}
                  onChange={(e) => setFormData({ ...formData, technician_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Sin asignar (Pendiente)</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Descripción */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descripción del problema</label>
            <textarea 
              required
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalles de la falla..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
            ></textarea>
          </div>

          <div className="pt-2">
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Hammer className="w-5 h-5" /> Crear Orden de Trabajo
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
