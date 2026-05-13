'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Package, Hash, MapPin, DollarSign, Truck, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InventoryModal({ isOpen, onClose, item = null, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    part_number: '',
    description: '',
    stock_current: 0,
    stock_min: 5,
    location: '',
    unit_price: 0,
    provider: '',
    category: 'General'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        part_number: item.part_number || '',
        description: item.description || '',
        stock_current: item.stock_current || 0,
        stock_min: item.stock_min || 0,
        location: item.location || '',
        unit_price: item.unit_price || 0,
        provider: item.provider || '',
        category: item.category || 'General'
      });
    } else {
      setFormData({
        name: '',
        part_number: '',
        description: '',
        stock_current: 0,
        stock_min: 5,
        location: '',
        unit_price: 0,
        provider: '',
        category: 'General'
      });
    }
  }, [item, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (item) {
        const { error } = await supabase
          .from('inventory')
          .update(formData)
          .eq('id', item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inventory')
          .insert([formData]);
        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving inventory item:', error);
      alert('Error al guardar el item');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <Package className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {item ? 'Editar Item' : 'Nuevo Item de Inventario'}
                </h3>
                <p className="text-xs text-slate-500">Completa la información del repuesto o suministro.</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Información Básica */}
              <div className="md:col-span-2 space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Hash className="w-3 h-3" /> Información Principal
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Nombre del Item</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500 transition-colors"
                      placeholder="Ej: Rodamiento SKF 6204"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Número de Parte / Código</label>
                    <input 
                      type="text" 
                      value={formData.part_number}
                      onChange={e => setFormData({...formData, part_number: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500 transition-colors font-mono"
                      placeholder="Ej: PN-99234-A"
                    />
                  </div>
                </div>
              </div>

              {/* Stock y Precios */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" /> Stock y Costos
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Stock Actual</label>
                    <input 
                      required
                      type="number" 
                      value={formData.stock_current}
                      onChange={e => setFormData({...formData, stock_current: parseInt(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Stock Mínimo</label>
                    <input 
                      required
                      type="number" 
                      value={formData.stock_min}
                      onChange={e => setFormData({...formData, stock_min: parseInt(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <DollarSign className="w-3 h-3" /> Precio Unitario (USD)
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.unit_price}
                    onChange={e => setFormData({...formData, unit_price: parseFloat(e.target.value)})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Logística */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Truck className="w-3 h-3" /> Logística
                </h4>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <MapPin className="w-3 h-3" /> Ubicación en Almacén
                  </label>
                  <input 
                    type="text" 
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500"
                    placeholder="Ej: Pasillo A, Estante 4"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Proveedor</label>
                  <input 
                    type="text" 
                    value={formData.provider}
                    onChange={e => setFormData({...formData, provider: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500"
                    placeholder="Ej: Grainger Inc."
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-slate-400">Notas / Descripción</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500 min-h-[80px]"
                  placeholder="Especificaciones técnicas o detalles adicionales..."
                />
              </div>
            </div>

            <div className="flex gap-4 pt-8">
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
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  item ? 'Guardar Cambios' : 'Crear Item'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
