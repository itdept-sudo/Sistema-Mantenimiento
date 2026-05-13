'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Plus, Trash2, Save, Image as ImageIcon, Upload, Search, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MachineModelCatalog({ isOpen, onClose }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    brand: '',
    model_name: '',
    category: 'Producción',
    image_url: ''
  });

  const fetchModels = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('machine_models')
      .select('*')
      .order('brand', { ascending: true });
    setModels(data || []);
  };

  useEffect(() => {
    if (isOpen) fetchModels();
  }, [isOpen]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `catalog/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('machines').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('machines').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, image_url: publicUrl }));
    } catch (err) {
      alert('Error al subir imagen: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('machine_models').insert([formData]);
      if (error) throw error;
      setFormData({ brand: '', model_name: '', category: 'Producción', image_url: '' });
      setIsAdding(false);
      fetchModels();
    } catch (err) {
      alert('Error al guardar modelo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este modelo del catálogo?')) return;
    await supabase.from('machine_models').delete().eq('id', id);
    fetchModels();
  };

  const filteredModels = models.filter(m => 
    m.brand.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.model_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-[85vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-2xl">
              <Briefcase className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Catálogo de Modelos Maestros</h3>
              <p className="text-sm text-slate-500">Define las especificaciones base para tus equipos.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-800 rounded-2xl text-slate-400 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* List Section */}
          <div className="flex-1 p-8 overflow-y-auto border-r border-slate-800 space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text"
                placeholder="Buscar modelo o marca..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-white focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredModels.map(model => (
                <div key={model.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex gap-4 group hover:border-indigo-500/50 transition-all">
                  <div className="w-16 h-16 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-800">
                    {model.image_url ? (
                      <img src={model.image_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-700">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-indigo-400 uppercase tracking-tighter">{model.brand}</p>
                    <h4 className="text-sm font-bold text-white truncate">{model.model_name}</h4>
                    <p className="text-[10px] text-slate-500 mt-1">{model.category}</p>
                  </div>
                  <button 
                    onClick={() => handleDelete(model.id)}
                    className="p-2 self-start text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Form Section */}
          <div className="w-full md:w-80 p-8 bg-slate-900/30">
            <h4 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" /> Nuevo Modelo
            </h4>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div 
                onClick={() => fileInputRef.current.click()}
                className="aspect-square rounded-3xl border-2 border-dashed border-slate-800 bg-slate-950 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/50 transition-all overflow-hidden group relative"
              >
                {formData.image_url ? (
                  <img src={formData.image_url} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <Upload className="w-8 h-8 text-slate-700 mx-auto mb-2 group-hover:text-indigo-400" />
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Foto Master</p>
                  </div>
                )}
                {uploading && <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageUpload} accept="image/*" />
              </div>

              <input 
                required
                placeholder="Marca (Ej: Krauss Maffei)"
                value={formData.brand}
                onChange={e => setFormData({...formData, brand: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:border-indigo-500"
              />
              <input 
                required
                placeholder="Modelo (Ej: KM-500)"
                value={formData.model_name}
                onChange={e => setFormData({...formData, model_name: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:border-indigo-500"
              />
              <select 
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:border-indigo-500"
              >
                <option value="Producción">Producción</option>
                <option value="Montacargas">Montacargas</option>
                <option value="Servicios">Servicios</option>
              </select>

              <button 
                type="submit"
                disabled={loading || uploading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Guardar Modelo</>}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
