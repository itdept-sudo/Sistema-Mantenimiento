'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Cpu, Hash, Activity, Truck, Trash2, Save, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MachineModal({ isOpen, onClose, machine = null, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    status: 'operational',
    category: 'Producción', // Fixed asset
    serial_number: '',
    description: '',
    brand: '',
    model: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (machine) {
      setFormData({
        name: machine.name || '',
        status: machine.status || 'operational',
        category: machine.category || 'Producción',
        serial_number: machine.serial_number || '',
        description: machine.description || '',
        brand: machine.brand || '',
        model: machine.model || ''
      });
    } else {
      setFormData({
        name: '',
        status: 'operational',
        category: 'Producción',
        serial_number: '',
        description: '',
        brand: '',
        model: ''
      });
    }
  }, [machine, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (machine) {
        const { error } = await supabase
          .from('machines')
          .update(formData)
          .eq('id', machine.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('machines')
          .insert([formData]);
        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving machine:', error);
      alert('Error al guardar el equipo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!machine) return;
    if (!confirm('¿Estás seguro de eliminar este equipo? Esto podría afectar órdenes de trabajo asociadas.')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('machines')
        .delete()
        .eq('id', machine.id);
      if (error) throw error;
      onSuccess();
      onClose();
    } catch (error) {
      alert('Error al eliminar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                {formData.category === 'Montacargas' ? <Truck className="w-6 h-6 text-blue-400" /> : <Cpu className="w-6 h-6 text-blue-400" />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {machine ? 'Editar Equipo' : 'Nuevo Equipo / Máquina'}
                </h3>
                <p className="text-xs text-slate-500">Gestión de activos de producción y equipos móviles.</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Hash className="w-3 h-3" /> Nombre del Equipo
                </label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500"
                  placeholder="Ej: Inyectora 04, Montacargas Yale 1"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Activity className="w-3 h-3" /> Categoría
                </label>
                <select 
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500"
                >
                  <option value="Producción">Maquinaria Producción (Fija)</option>
                  <option value="Montacargas">Montacargas / Equipo Móvil</option>
                  <option value="Servicios">Servicios (Compresores, HVAC)</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Marca</label>
                <input 
                  type="text" 
                  value={formData.brand}
                  onChange={e => setFormData({...formData, brand: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500"
                  placeholder="Ej: Krauss Maffei"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Modelo / S/N</label>
                <input 
                  type="text" 
                  value={formData.serial_number}
                  onChange={e => setFormData({...formData, serial_number: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500 font-mono"
                  placeholder="Ej: KM-500-2023"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Info className="w-3 h-3" /> Descripción / Notas Técnicas
                </label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500 min-h-[100px]"
                  placeholder="Detalles sobre capacidad, manuales o especificaciones..."
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              {machine && (
                <button 
                  type="button"
                  onClick={handleDelete}
                  className="p-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all"
                  title="Eliminar Equipo"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
              )}
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-750 text-white rounded-2xl font-bold transition-all"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Save className="w-5 h-5" /> {machine ? 'Guardar Cambios' : 'Crear Equipo'}</>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
