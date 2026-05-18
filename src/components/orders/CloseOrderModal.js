'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Camera, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CloseOrderModal({ isOpen, onClose, task, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen || !task) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setError('La imagen no debe superar los 5MB.');
        return;
      }
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setError('');
    }
  };

  const handleClearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!notes.trim() || !file) {
      setError('Debes proporcionar una descripción y evidencia fotográfica.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Upload photo to Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${task.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('work-order-resolutions')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('work-order-resolutions')
        .getPublicUrl(filePath);

      // 3. Update Work Order
      const { error: orderError } = await supabase
        .from('work_orders')
        .update({ 
          status: 'closed', 
          resolution_notes: notes,
          resolution_photo_url: publicUrl,
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq('id', task.id);

      if (orderError) throw orderError;

      // 4. Update Machine Status (If applicable)
      if (task.machine_id) {
        const { error: machineError } = await supabase
          .from('machines')
          .update({ status: 'operational' }) // Asume que si se cierra, la máquina queda operativa
          .eq('id', task.machine_id);
        
        if (machineError) console.warn("Error updating machine status:", machineError);
      }

      onSuccess?.();
      onClose();
      // Limpiar estado
      setNotes('');
      setFile(null);
      setPreview(null);
    } catch (err) {
      console.error("Error cerrando orden:", err);
      setError(err.message || 'Error al procesar el cierre de la orden.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-emerald-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Cerrar Orden</h3>
              <p className="text-xs text-slate-400">ID: {String(task.id).slice(0,8)} • {task.machine?.name}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Evidencia Fotográfica <span className="text-red-500">*</span>
            </label>
            
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-700 border-dashed rounded-2xl hover:border-blue-500 transition-colors bg-slate-950 relative overflow-hidden group">
              {preview ? (
                <div className="absolute inset-0">
                  <img src={preview} alt="Vista previa" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <button 
                      type="button" 
                      onClick={handleClearFile}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-sm transition-colors"
                    >
                      Cambiar Foto
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="text-sm text-slate-400">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-slate-900 rounded-md font-bold text-blue-500 hover:text-blue-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 px-2 py-1">
                      <span>Subir archivo</span>
                      <input 
                        id="file-upload" 
                        name="file-upload" 
                        type="file" 
                        className="sr-only" 
                        accept="image/*"
                        capture="environment"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1 inline">o tomar foto</p>
                  </div>
                  <p className="text-xs text-slate-500">PNG, JPG, GIF hasta 5MB</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Descripción de Actividades Realizadas <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalla la reparación, piezas cambiadas o mantenimiento efectuado..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Upload className="w-5 h-5" /> Subir Evidencia y Cerrar Orden
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
