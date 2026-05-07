'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Calendar, Clock, User, Box, ListChecks } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ScheduleModal({ isOpen, onClose, machines, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [technicians, setTechnicians] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    machine_ids: [], // Multi-selección
    technician_id: '',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchTechnicians = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'technician');
      if (data) setTechnicians(data);
    };
    if (isOpen) fetchTechnicians();
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calculamos los días del intervalo
      const intervals = {
        daily: 1,
        weekly: 7,
        monthly: 30,
        bimonthly: 60,
        annually: 365
      };

      // Creamos un solo registro con el array de máquinas
      const schedule = {
        title: formData.title,
        task_description: formData.description,
        machine_ids: formData.machine_ids.map(id => parseInt(id)),
        technician_id: formData.technician_id || null,
        frequency: formData.frequency,
        interval_days: intervals[formData.frequency],
        next_due: new Date(formData.start_date).toISOString(),
        is_active: true
      };

      const { error } = await supabase
        .from('maintenance_schedules')
        .insert([schedule]);

      if (error) throw error;

      alert(`¡Éxito! Actividad programada correctamente.`);
      onSuccess?.();
      onClose();
    } catch (error) {
      alert("Error al programar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMachine = (id) => {
    setFormData(prev => ({
      ...prev,
      machine_ids: prev.machine_ids.includes(id)
        ? prev.machine_ids.filter(m => m !== id)
        : [...prev.machine_ids, id]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Programar Preventivo</h3>
              <p className="text-xs text-slate-500">Automatiza la creación de órdenes.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Título de la actividad */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre de la Actividad</label>
              <input 
                required
                type="text"
                placeholder="Ej: Cambio de aceite, Limpieza de filtros..."
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Frecuencia */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Frecuencia / Ciclo
              </label>
              <select 
                value={formData.frequency}
                onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="daily">Diaria</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
                <option value="bimonthly">Bimestral</option>
                <option value="annually">Anual</option>
              </select>
            </div>

            {/* Fecha de Inicio */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Primera Ejecución</label>
              <input 
                required
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Responsable */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> Responsable Predeterminado
              </label>
              <select 
                value={formData.technician_id}
                onChange={(e) => setFormData({...formData, technician_id: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Cualquier técnico (Sin asignar)</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </div>

            {/* Selección de Máquinas */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex justify-between items-center">
                <span>Seleccionar Máquinas ({formData.machine_ids.length})</span>
                <button 
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, machine_ids: machines.map(m => m.id) }))}
                  className="text-blue-500 hover:underline normal-case font-normal"
                >
                  Seleccionar todas
                </button>
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-950 border border-slate-800 rounded-xl">
                {machines.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMachine(m.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                      formData.machine_ids.includes(m.id) 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" /> {m.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Descripción */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <ListChecks className="w-3.5 h-3.5" /> Instrucciones / Checklist
              </label>
              <textarea 
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe los pasos a seguir para esta actividad..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 resize-none"
              ></textarea>
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading || formData.machine_ids.length === 0}
              className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
            >
              {loading ? "Programando..." : "Guardar Programación"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
