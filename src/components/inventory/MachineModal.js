'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, itamSupabase } from '@/lib/supabase';
import { X, Cpu, Hash, Activity, Truck, Trash2, Save, Info, Upload, Image as ImageIcon, RefreshCw, FileText, BookOpen, Database, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MachineModal({ isOpen, onClose, machine = null, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    status: 'operational',
    category: 'Producción',
    serial_number: '',
    description: '',
    brand: '',
    model: '',
    image_url: '',
    model_id: '',
    manual_url: '',
    alias: '',
    area_id: ''
  });

  const [models, setModels] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingManual, setUploadingManual] = useState(false);
  const fileInputRef = useRef(null);
  const manualInputRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) return;
      
      // Fetch models from MaintOps
      const { data: mData } = await supabase.from('machine_models').select('*').order('brand');
      setModels(mData || []);

      // Fetch areas from ITAM Desk
      if (itamSupabase) {
        const { data: aData } = await itamSupabase.from('areas').select('id, name').order('name');
        setAreas(aData || []);
      }
    };
    if (isOpen) fetchData();
  }, [isOpen]);

  useEffect(() => {
    if (machine) {
      setFormData({
        name: machine.name || '',
        status: machine.status || 'operational',
        category: machine.category || 'Producción',
        serial_number: machine.serial_number || '',
        description: machine.description || '',
        brand: machine.brand || '',
        model: machine.model || '',
        image_url: machine.image_url || '',
        model_id: machine.model_id || '',
        manual_url: machine.manual_url || '',
        alias: machine.alias || '',
        area_id: machine.area_id || ''
      });
    } else {
      setFormData({
        name: '',
        status: 'operational',
        category: 'Producción',
        serial_number: '',
        description: '',
        brand: '',
        model: '',
        image_url: '',
        model_id: '',
        manual_url: '',
        alias: '',
        area_id: ''
      });
    }
  }, [machine, isOpen]);

  const handleModelChange = (modelId) => {
    if (!modelId) {
      setFormData(prev => ({ ...prev, model_id: '', brand: '', model: '', image_url: '', category: 'Producción' }));
      return;
    }
    const selected = models.find(m => m.id === modelId);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        model_id: selected.id,
        brand: selected.brand,
        model: selected.model_name,
        image_url: selected.image_url,
        category: selected.category
      }));
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'image') setUploading(true);
    else setUploadingManual(true);

    try {
      const fileExt = file.name.split('.').pop();
      const folder = type === 'image' ? 'machines' : 'manuals';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('machines')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('machines')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, [type === 'image' ? 'image_url' : 'manual_url']: publicUrl }));
    } catch (error) {
      alert('Error al subir archivo: ' + error.message);
    } finally {
      if (type === 'image') setUploading(false);
      else setUploadingManual(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Limpiar datos para evitar errores de tipo UUID en Postgres
    const submissionData = {
      ...formData,
      model_id: formData.model_id === '' ? null : formData.model_id
    };

    try {
      if (machine) {
        const { error } = await supabase.from('machines').update(submissionData).eq('id', machine.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('machines').insert([submissionData]);
        if (error) throw error;
      }
      onSuccess();
      onClose();
    } catch (error) {
      alert('Error al guardar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este equipo?')) return;
    setLoading(true);
    await supabase.from('machines').delete().eq('id', machine.id);
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl"
        >
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                {formData.category === 'Montacargas' ? <Truck className="w-6 h-6 text-blue-400" /> : <Cpu className="w-6 h-6 text-blue-400" />}
              </div>
              <h3 className="text-xl font-bold text-white">{machine ? 'Editar Equipo' : 'Nuevo Registro de Equipo'}</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400"><X className="w-6 h-6" /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
            
            {/* Template Selection */}
            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 mb-6">
              <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                <Database className="w-3 h-3" /> {machine ? 'Vincular a un modelo del catálogo' : '¿Usar un modelo del catálogo?'}
              </label>
              <select 
                value={formData.model_id}
                onChange={e => handleModelChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white focus:border-indigo-500 outline-none"
              >
                <option value="">-- Sin plantilla / Personalizado --</option>
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.brand} - {m.model_name}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-2 italic">
                {machine 
                  ? 'Al cambiar el modelo, se actualizarán la marca, categoría y fotografía del equipo.' 
                  : 'Seleccionar un modelo auto-rellenará marca, categoría y fotografía.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left: Media & Docs */}
              <div className="space-y-6">
                <div 
                  onClick={() => fileInputRef.current.click()}
                  className="aspect-video rounded-3xl border-2 border-dashed border-slate-800 bg-slate-950 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-all overflow-hidden group relative"
                >
                  {formData.image_url ? (
                    <img src={formData.image_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <ImageIcon className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-bold uppercase">Foto del Equipo</p>
                    </div>
                  )}
                  {uploading && <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-blue-400" /></div>}
                  <input type="file" ref={fileInputRef} className="hidden" onChange={e => handleFileUpload(e, 'image')} accept="image/*" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <BookOpen className="w-3 h-3" /> Manual Técnico (PDF)
                  </label>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => manualInputRef.current.click()}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 hover:text-white hover:border-blue-500 transition-all flex items-center justify-center gap-2"
                    >
                      {uploadingManual ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {formData.manual_url ? 'Cambiar Manual' : 'Subir Manual PDF'}
                    </button>
                    {formData.manual_url && (
                      <a href={formData.manual_url} target="_blank" rel="noreferrer" className="p-3 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500/20">
                        <FileText className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                  <input type="file" ref={manualInputRef} className="hidden" onChange={e => handleFileUpload(e, 'manual')} accept=".pdf" />
                </div>
              </div>

              {/* Right: Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre Técnico / ID</label>
                    <input 
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:border-blue-500"
                      placeholder="Ej: Gauntlen III"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Alias / Apodo (Planta)</label>
                    <input 
                      value={formData.alias || ''}
                      onChange={e => setFormData({...formData, alias: e.target.value})}
                      className="w-full bg-slate-950 border border-indigo-500/30 rounded-xl py-3 px-4 text-sm text-white focus:border-indigo-500 placeholder:text-slate-700"
                      placeholder="Ej: Pulpo"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Número de Serie</label>
                  <input 
                    required
                    value={formData.serial_number}
                    onChange={e => setFormData({...formData, serial_number: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:border-blue-500 font-mono"
                    placeholder="S/N: 2023-KM-001"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Marca</label>
                    <input 
                      readOnly={!!formData.model_id}
                      value={formData.brand}
                      onChange={e => setFormData({...formData, brand: e.target.value})}
                      className={`w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white ${formData.model_id ? 'opacity-50' : 'focus:border-blue-500'}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Categoría</label>
                    <select 
                      disabled={!!formData.model_id}
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className={`w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white ${formData.model_id ? 'opacity-50' : 'focus:border-blue-500'}`}
                    >
                      <option value="Producción">Producción</option>
                      <option value="Montacargas">Montacargas</option>
                      <option value="Servicios">Servicios</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                    <MapPin className="w-3 h-3" /> Área de Producción (ITAM)
                  </label>
                  <select 
                    value={formData.area_id || ''}
                    onChange={e => setFormData({...formData, area_id: e.target.value})}
                    className="w-full bg-slate-950 border border-emerald-500/20 rounded-xl py-3 px-4 text-sm text-white focus:border-emerald-500 outline-none"
                  >
                    <option value="">Selecciona área...</option>
                    {areas.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Notas Técnicas</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white focus:border-blue-500 min-h-[100px]"
                    placeholder="Especificaciones, frecuencia de lubricación, etc."
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-slate-800">
              {machine && (
                <button type="button" onClick={handleDelete} className="p-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all"><Trash2 className="w-6 h-6" /></button>
              )}
              <button type="button" onClick={onClose} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-bold">Cancelar</button>
              <button type="submit" disabled={loading || uploading || uploadingManual} className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-5 h-5" /> {machine ? 'Guardar Cambios' : 'Registrar Equipo'}</>}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
