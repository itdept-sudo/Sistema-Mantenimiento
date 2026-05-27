'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Package, Hash, MapPin, DollarSign, Truck, AlertTriangle, Calendar, RefreshCw, Image as ImageIcon, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InventoryModal({ isOpen, onClose, item = null, onSuccess, selectedInventoryId }) {
  const [formData, setFormData] = useState({
    name: '',
    part_number: '',
    description: '',
    stock_current: 0,
    stock_min: 5,
    stock_max: '',
    location: '',
    unit_price: 0,
    provider: '',
    unit: 'Piezas',
    weekly_usage: '',
    estimated_duration: '',
    estimated_date: '',
    extra_info: '',
    image_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `inventory/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('machines')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('machines')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
    } catch (error) {
      console.error('Error al subir archivo:', error);
      alert('Error al subir la imagen: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (item) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        name: item.name || '',
        part_number: item.part_number || '',
        description: item.description || '',
        stock_current: item.stock_current || 0,
        stock_min: item.stock_min || 0,
        stock_max: item.stock_max !== null && item.stock_max !== undefined ? item.stock_max : '',
        location: item.location || '',
        unit_price: item.unit_price || 0,
        provider: item.provider || '',
        unit: item.unit || 'Piezas',
        weekly_usage: item.weekly_usage !== null && item.weekly_usage !== undefined ? item.weekly_usage : '',
        estimated_duration: item.estimated_duration !== null && item.estimated_duration !== undefined ? item.estimated_duration : '',
        estimated_date: item.estimated_date || '',
        extra_info: item.extra_info || '',
        image_url: item.image_url || ''
      });
    } else {
      setFormData({
        name: '',
        part_number: '',
        description: '',
        stock_current: 0,
        stock_min: 5,
        stock_max: '',
        location: '',
        unit_price: 0,
        provider: '',
        unit: 'Piezas',
        weekly_usage: '',
        estimated_duration: '',
        estimated_date: '',
        extra_info: '',
        image_url: ''
      });
    }
  }, [item, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name: formData.name,
      part_number: formData.part_number || null,
      description: formData.description || null,
      stock_current: parseInt(formData.stock_current) || 0,
      stock_min: parseInt(formData.stock_min) || 0,
      stock_max: formData.stock_max === '' || formData.stock_max === null ? null : parseInt(formData.stock_max),
      location: formData.location || null,
      unit_price: formData.unit_price === '' || formData.unit_price === null ? 0 : parseFloat(formData.unit_price),
      provider: formData.provider || null,
      unit: formData.unit || 'Piezas',
      weekly_usage: formData.weekly_usage === '' || formData.weekly_usage === null ? 0 : parseFloat(formData.weekly_usage),
      estimated_duration: formData.estimated_duration === '' || formData.estimated_duration === null ? null : parseFloat(formData.estimated_duration),
      estimated_date: formData.estimated_date || null,
      extra_info: formData.extra_info || null,
      image_url: formData.image_url || null
    };

    if (!item) {
      payload.inventory_id = selectedInventoryId;
    }

    try {
      if (item) {
        const { error } = await supabase
          .from('inventory')
          .update(payload)
          .eq('id', item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inventory')
          .insert([payload]);
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
                <p className="text-xs text-slate-500">Completa la información del suministro o repuesto.</p>
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
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Inputs Principales (2/3 de ancho) */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">Nombre del Item</label>
                      <input 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500 transition-colors"
                        placeholder="Ej: Rodamiento SKF 6204 o Cloro"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Número de Parte / Código (Opcional)</label>
                        <input 
                          type="text" 
                          value={formData.part_number}
                          onChange={e => setFormData({...formData, part_number: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500 transition-colors font-mono"
                          placeholder="Ej: PN-99234-A"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Unidad de Medida</label>
                        <select
                          value={formData.unit}
                          onChange={e => setFormData({...formData, unit: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500 transition-colors"
                        >
                          <option value="Piezas">Piezas (Pz)</option>
                          <option value="Caja">Caja</option>
                          <option value="Rollo">Rollo</option>
                          <option value="COSTAL">Costal</option>
                          <option value="Paquetes">Paquetes</option>
                          <option value="Litros">Litros</option>
                          <option value="Metros">Metros</option>
                          <option value="Galones">Galones</option>
                          <option value="Cubeta 1 Galon">Cubeta 1 Galón</option>
                          <option value="Cubeta 5 Galones">Cubeta 5 Galones</option>
                          <option value="Tibor 25 Galones">Tibor 25 Galones</option>
                          <option value="Tibor 50 Galones">Tibor 50 Galones</option>
                          <option value="Costal 10 LB">Costal 10 LB</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Carga de Imagen Premium (1/3 de ancho) */}
                  <div className="space-y-2 flex flex-col justify-end">
                    <label className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-slate-500" /> Imagen del Item
                    </label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 min-h-[140px] rounded-2xl border-2 border-dashed border-slate-800 bg-slate-950 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-all overflow-hidden group relative"
                    >
                      {formData.image_url ? (
                        <>
                          <img src={formData.image_url} className="w-full h-full object-cover" alt="Previsualización" />
                          <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all">
                            <Upload className="w-6 h-6 text-white mb-1 drop-shadow" />
                            <span className="text-[10px] text-white bg-slate-900/90 px-2.5 py-1 rounded-full font-bold">Cambiar Imagen</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-3">
                          <Upload className="w-7 h-7 text-slate-700 mx-auto mb-1.5 group-hover:text-blue-500 transition-colors" />
                          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Cargar Foto</p>
                          <p className="text-[9px] text-slate-600 mt-0.5">Formatos: JPG, PNG, WEBP</p>
                        </div>
                      )}
                      
                      {uploading && (
                        <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
                          <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                        </div>
                      )}
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileUpload} 
                        accept="image/*" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Stock y Precios */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" /> Stock y Costos
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">Stock Min</label>
                    <input 
                      required
                      type="number" 
                      value={formData.stock_min}
                      onChange={e => setFormData({...formData, stock_min: parseInt(e.target.value) || 0})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-3 text-white focus:border-blue-500 text-center"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">Stock Actual</label>
                    <input 
                      required
                      type="number" 
                      value={formData.stock_current}
                      onChange={e => setFormData({...formData, stock_current: parseInt(e.target.value) || 0})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-3 text-white focus:border-blue-500 text-center font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">Stock Max</label>
                    <input 
                      type="number" 
                      value={formData.stock_max}
                      onChange={e => setFormData({...formData, stock_max: e.target.value === '' ? '' : parseInt(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-3 text-white focus:border-blue-500 text-center"
                      placeholder="N/A"
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
                    onChange={e => setFormData({...formData, unit_price: parseFloat(e.target.value) || 0})}
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
                    placeholder="Ej: Pasillo A, Rack 2 A"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Proveedor / Fabricante</label>
                  <input 
                    type="text" 
                    value={formData.provider}
                    onChange={e => setFormData({...formData, provider: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500"
                    placeholder="Ej: Grainger Inc."
                  />
                </div>
              </div>

              {/* Consumo y Abasto (Opcional) */}
              <div className="md:col-span-2 space-y-4 bg-slate-950/20 p-5 border border-slate-850 rounded-2xl">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Métricas de Consumo (Opcional)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">Gasto por Semana</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={formData.weekly_usage}
                      onChange={e => setFormData({...formData, weekly_usage: e.target.value === '' ? '' : parseFloat(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500"
                      placeholder="Ej: 5"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">Duración Est. (Semanas)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={formData.estimated_duration}
                      onChange={e => setFormData({...formData, estimated_duration: e.target.value === '' ? '' : parseFloat(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500"
                      placeholder="Ej: 12.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">Fecha Límite Est.</label>
                    <input 
                      type="text" 
                      value={formData.estimated_date}
                      onChange={e => setFormData({...formData, estimated_date: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500"
                      placeholder="Ej: June 29"
                    />
                  </div>
                </div>
                <div className="space-y-2 mt-2">
                  <label className="text-xs font-medium text-slate-400">Información Adicional / Nota de Columna</label>
                  <input 
                    type="text" 
                    value={formData.extra_info}
                    onChange={e => setFormData({...formData, extra_info: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500"
                    placeholder="Ej: Costales de bolsa, Entregado a TRIM..."
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-slate-400">Notas / Descripción General</label>
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

