'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { itamSupabase } from '@/lib/itamSupabase';
import { AlertCircle, CheckCircle2, ChevronRight, HardHat, Camera, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ReportPage() {
  const [step, setStep] = useState(1);
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [machines, setMachines] = useState([]);
  const [formData, setFormData] = useState({
    machine_id: '',
    description: '',
    priority: 'high'
  });
  
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Cargar las máquinas operativas
    const fetchMachines = async () => {
      const { data } = await supabase
        .from('machines')
        .select('id, name')
        .order('name');
      if (data) setMachines(data);
    };
    fetchMachines();
  }, []);

  const handleVerifyEmployee = async (e) => {
    e.preventDefault();
    if (!employeeNumber) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Buscar en la base de datos de ITAM Desk
      const { data, error: itamError } = await itamSupabase
        .from('profiles')
        .select('full_name, employee_number')
        .eq('employee_number', employeeNumber)
        .maybeSingle();

      if (itamError) throw itamError;

      if (data) {
        setEmployeeInfo(data);
        setStep(2);
      } else {
        setError('Número de empleado no encontrado en el sistema.');
      }
    } catch (err) {
      console.error(err);
      setError('Error al conectar con la base de datos de empleados.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let photoUrls = [];

      // Si hay foto, subirla al bucket "maintenance-photos"
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `report-${Date.now()}.${fileExt}`;
        
        // Intentar subir a un bucket llamado 'maintenance-photos' (o 'floor-plans' si falla)
        let { error: uploadError } = await supabase.storage
          .from('maintenance-photos')
          .upload(fileName, photoFile);
          
        let bucketName = 'maintenance-photos';

        if (uploadError) {
          console.warn("Bucket maintenance-photos no encontrado, intentando usar floor-plans");
          bucketName = 'floor-plans';
          const { error: fallbackError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, photoFile);
          
          if (fallbackError) throw fallbackError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName);
          
        photoUrls.push(publicUrl);
      }

      // Crear la orden de soporte
      const { error: orderError } = await supabase
        .from('work_orders')
        .insert([{
          machine_id: formData.machine_id,
          description: formData.description,
          priority: formData.priority,
          maintenance_type: 'corrective',
          status: 'open',
          reporter_emp_num: employeeInfo.employee_number,
          reporter_name: employeeInfo.full_name,
          photo_urls: photoUrls.length > 0 ? photoUrls : null
        }]);

      if (orderError) throw orderError;

      // Actualizar el estado de la máquina
      await supabase
        .from('machines')
        .update({ status: 'failure' })
        .eq('id', formData.machine_id);

      setStep(3); // Pantalla de éxito
    } catch (err) {
      console.error(err);
      setError('Error al enviar el reporte: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setEmployeeNumber('');
    setEmployeeInfo(null);
    setFormData({ machine_id: '', description: '', priority: 'high' });
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Kiosk Container */}
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-blue-600 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <HardHat className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">Portal de Soporte MaintOps</h1>
              <p className="text-blue-200 text-sm">Reporte rápido de incidentes en piso</p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {/* PANTALLA 1: IDENTIFICACIÓN */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">Identificación</h2>
                  <p className="text-slate-400">Ingresa tu número de empleado para continuar.</p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}

                <form onSubmit={handleVerifyEmployee} className="space-y-6">
                  <div>
                    <input
                      type="number"
                      required
                      value={employeeNumber}
                      onChange={(e) => setEmployeeNumber(e.target.value)}
                      placeholder="Ej. 10452"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-white text-2xl text-center focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-700"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !employeeNumber}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl py-4 font-bold text-lg transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>Continuar <ChevronRight className="w-5 h-5" /></>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* PANTALLA 2: REPORTE */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-800">
                  <div>
                    <p className="text-slate-400 text-sm">Operador identificado:</p>
                    <p className="text-white font-bold text-lg">{employeeInfo?.full_name}</p>
                  </div>
                  <button onClick={() => setStep(1)} className="text-slate-500 hover:text-white text-sm font-medium">
                    Cambiar
                  </button>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmitReport} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">1. Máquina que presenta la falla</label>
                    <select 
                      required
                      value={formData.machine_id}
                      onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition-colors text-lg"
                    >
                      <option value="">Selecciona la máquina...</option>
                      {machines.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">2. Descripción del problema</label>
                    <textarea 
                      required
                      rows="3"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="¿Qué ocurrió? ¿Hace un ruido extraño? ¿Se detuvo?"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">3. Evidencia Fotográfica (Opcional)</label>
                    <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handlePhotoSelect} />
                    
                    {!photoPreview ? (
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-xl p-6 flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        <Camera className="w-8 h-8 mb-2" />
                        <span className="font-medium">Tomar Foto o Subir Imagen</span>
                      </button>
                    ) : (
                      <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-video flex items-center justify-center">
                        <img src={photoPreview} alt="Evidencia" className="object-contain h-full w-full" />
                        <button 
                          type="button"
                          onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !formData.machine_id || !formData.description}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-4 font-bold text-lg transition-all mt-4"
                  >
                    {loading ? 'Enviando Reporte...' : 'Enviar Reporte de Falla'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* PANTALLA 3: ÉXITO */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-6"
              >
                <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-bold text-white">¡Reporte Enviado!</h2>
                <p className="text-slate-400 text-lg">El equipo de mantenimiento ha sido notificado y la orden ya está en el tablero.</p>
                
                <button
                  onClick={handleReset}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-4 font-bold transition-all mt-8"
                >
                  Realizar otro reporte
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
