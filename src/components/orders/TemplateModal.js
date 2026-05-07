'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Save, BookOpen, Clock, AlignLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TemplateModal({ isOpen, onClose, onSuccess, editData = null }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    default_frequency: 'monthly'
  });

  useEffect(() => {
    if (editData) {
      setFormData({
        name: editData.name,
        description: editData.description,
        default_frequency: editData.default_frequency || 'monthly'
      });
    } else {
      setFormData({ name: '', description: '', default_frequency: 'monthly' });
    }
  }, [editData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let error;
      if (editData) {
        const { error: err } = await supabase
          .from('maintenance_templates')
          .update(formData)
          .eq('id', editData.id);
        error = err;
      } else {
        const { error: err } = await supabase
          .from('maintenance_templates')
          .insert([formData]);
        error = err;
      }

      if (error) throw error;
      onSuccess?.();
      onClose();
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{editData ? 'Editar Plantilla' : 'Nueva Plantilla'}</h3>
              <p className="text-xs text-slate-500">Define un estándar de actividad.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre del Procedimiento</label>
            <input 
              required
              type="text"
              placeholder="Ej: Engrase de Rodamientos Superior"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Frecuencia Recomendada
            </label>
            <select 
              value={formData.default_frequency}
              onChange={(e) => setFormData({...formData, default_frequency: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="daily">Diaria</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
              <option value="bimonthly">Bimestral</option>
              <option value="annually">Anual</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <AlignLeft className="w-3.5 h-3.5" /> Descripción / Pasos Técnicos
            </label>
            <textarea 
              required
              rows="4"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe detalladamente los pasos a seguir..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 resize-none"
            ></textarea>
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
              disabled={loading}
              className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {loading ? "Guardando..." : "Guardar Plantilla"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
