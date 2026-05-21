'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { itamSupabase } from '@/lib/itamSupabase';
import { LayoutDashboard, AlertCircle, CheckCircle2, ChevronRight, HardHat, Camera, X, ArrowLeft, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function LoginContent() {
  const { user, loginWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const domainError = searchParams.get('error') === 'domain';
  
  // Auth state
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [view, setView] = useState('login'); // 'login' or 'report'

  // IP Restriction State
  const [userIP, setUserIP] = useState(null);
  const [isIPAuthorized, setIsIPAuthorized] = useState(false);
  const AUTHORIZED_IP = '187.249.0.68';

  // Guest Report State
  const [step, setStep] = useState(1);
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [machines, setMachines] = useState([]);
  const [formData, setFormData] = useState({ machine_id: '', description: '', priority: 'high' });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      const result = await loginWithGoogle();
      if (!result) {
        alert("Error: El cliente de Supabase no se ha inicializado correctamente.");
        setIsLoggingIn(false);
        return;
      }
      if (result.error) {
        alert("Error de autenticación: " + result.error.message);
        setIsLoggingIn(false);
      }
    } catch (err) {
      console.error(err);
      alert("No se pudo iniciar la conexión con Google.");
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    if (user) {
      router.push('/');
      return;
    }
    
    // Auto-login flow when clicking invitation email
    const auto = searchParams.get('auto') === 'true' || searchParams.get('provider') === 'google';
    const errorParam = searchParams.get('error');
    if (auto && !errorParam && !isLoggingIn) {
      handleLogin();
    }
    
    // Verificar IP para el reporte de producción
    const checkIP = async () => {
      try {
        const res = await fetch('https://api64.ipify.org?format=json');
        const data = await res.json();
        setUserIP(data.ip);
        setIsIPAuthorized(data.ip === AUTHORIZED_IP);
      } catch (err) {
        console.error("Error al verificar IP:", err);
      }
    };
    checkIP();
  }, [user, router, searchParams, isLoggingIn]);

  useEffect(() => {
    if (view === 'report') {
      const fetchMachines = async () => {
        const { data } = await supabase.from('machines').select('id, name').order('name');
        if (data) setMachines(data);
      };
      fetchMachines();
    }
  }, [view]);

  const handleVerifyEmployee = async (e) => {
    e.preventDefault();
    if (!employeeNumber) return;
    setLoading(true);
    setError(null);
    try {
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
        setError('Número de empleado no encontrado en ITAM Desk.');
      }
    } catch (err) {
      console.error(err);
      setError('Error al validar empleado. Verifica conexión o RLS en ITAM.');
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

  const findBestTechnician = async () => {
    try {
      // Fetch technicians
      const { data: techs } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'technician');
      
      if (!techs || techs.length === 0) return null;

      // Fetch active counts
      const { data: orders } = await supabase
        .from('work_orders')
        .select('technician_id')
        .not('status', 'in', '("closed","resolved")');
      
      const counts = techs.map(t => ({
        ...t,
        count: orders?.filter(o => o.technician_id === t.id).length || 0
      }));

      // Sort by count and pick the best one
      counts.sort((a, b) => a.count - b.count);
      return counts[0];
    } catch (err) {
      console.error("Error in findBestTechnician:", err);
      return null;
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // 1. Check Auto-Assign Setting
      let assignedTech = null;
      try {
        const { data: setting } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'auto_assign')
          .maybeSingle();
        
        if (setting?.value?.enabled) {
          assignedTech = await findBestTechnician();
        }
      } catch (err) {
        console.warn("Auto-assign setting check failed:", err);
      }

      // 2. Upload Photo
      let photoUrls = [];
      if (photoFile) {
        const fileName = `report-${Date.now()}.${photoFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('maintenance-photos').upload(fileName, photoFile);
        let bucket = uploadError ? 'floor-plans' : 'maintenance-photos';
        if (uploadError) await supabase.storage.from(bucket).upload(fileName, photoFile);
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
        photoUrls.push(publicUrl);
      }

      // 3. Insert Order
      const { data: newOrder, error: orderError } = await supabase
        .from('work_orders')
        .insert([{
          machine_id: formData.machine_id,
          technician_id: assignedTech?.id || null,
          description: formData.description,
          priority: formData.priority,
          maintenance_type: 'corrective',
          status: 'open',
          reporter_emp_num: employeeInfo.employee_number,
          reporter_name: employeeInfo.full_name,
          photo_urls: photoUrls.length > 0 ? photoUrls : null
        }])
        .select('id')
        .single();

      if (orderError) throw orderError;

      if (newOrder && assignedTech?.id) {
        // Registrar en work_order_technicians
        await supabase
          .from('work_order_technicians')
          .insert({ work_order_id: newOrder.id, technician_id: assignedTech.id });

        // Enviar notificación por correo
        const machineName = machines?.find(m => String(m.id) === String(formData.machine_id))?.name || 'Máquina';
        fetch('/api/notify-tech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: newOrder.id,
            machineName: machineName,
            priority: formData.priority,
            description: formData.description,
            maintenanceType: 'corrective',
            techEmail: assignedTech.email,
            techName: assignedTech.full_name
          })
        }).catch(err => console.error("Error trigger email:", err));
      }

      await supabase.from('machines').update({ status: 'failure' }).eq('id', formData.machine_id);
      setStep(3);
    } catch (err) {
      setError('Error al enviar reporte: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {view === 'login' ? (
        <motion.div 
          key="login"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl"
        >
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/40">
              <LayoutDashboard className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">MaintOps Pro</h1>
            <p className="text-slate-400 mt-2">Plataforma de Mantenimiento y Operaciones</p>
          </div>

          {domainError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-500 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>Acceso restringido. Solo se permiten correos de <strong>@prosper-mfg.com</strong></p>
            </div>
          )}

          <button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 py-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg disabled:opacity-50"
          >
            {!isLoggingIn && <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="G" />}
            {isLoggingIn ? 'Conectando...' : 'Iniciar sesión con Google'}
          </button>

          {isIPAuthorized && (
            <>
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-4 bg-slate-900 text-slate-500">O ingresa como invitado</span></div>
              </div>

              <button 
                onClick={() => setView('report')}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold transition-all border shadow-lg bg-slate-800 hover:bg-slate-700 text-white border-slate-700 active:scale-95"
              >
                Reportar Falla (Producción)
              </button>
            </>
          )}

          <p className="text-center text-xs text-slate-500 mt-8 leading-relaxed">
            Al iniciar sesión, aceptas nuestros términos de servicio y políticas de seguridad industrial.
          </p>
        </motion.div>
      ) : (
        <motion.div 
          key="report"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="bg-blue-600 p-6 flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <HardHat className="w-8 h-8" />
              <div>
                <h1 className="text-xl font-bold">Reporte de Incidentes</h1>
                <p className="text-blue-100 text-xs">Piso de Producción</p>
              </div>
            </div>
            <button onClick={() => setView('login')} className="text-white/70 hover:text-white p-2">
              <ArrowLeft className="w-6 h-6" />
            </button>
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="text-center mb-8">
                    <h2 className="text-xl font-bold text-white mb-2">Identificación</h2>
                    <p className="text-slate-400 text-sm">Ingresa tu número de empleado de ITAM Desk.</p>
                  </div>
                  {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl mb-6 text-sm text-center">{error}</div>}
                  <form onSubmit={handleVerifyEmployee} className="space-y-4">
                    <input type="number" required value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} placeholder="Número de Empleado" className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-white text-2xl text-center focus:border-blue-500" />
                    <button type="submit" disabled={loading} className="w-full bg-blue-600 py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2">
                      {loading ? 'Verificando...' : <>Continuar <ChevronRight className="w-5 h-5" /></>}
                    </button>
                  </form>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                    <div><p className="text-slate-500 text-xs uppercase font-bold">Empleado</p><p className="text-white font-bold">{employeeInfo?.full_name}</p></div>
                    <button onClick={() => setStep(1)} className="text-blue-400 text-xs font-bold underline">Cambiar</button>
                  </div>
                  {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl mb-4 text-sm">{error}</div>}
                  <form onSubmit={handleSubmitReport} className="space-y-4">
                    <select required value={formData.machine_id} onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white">
                      <option value="">Selecciona la máquina...</option>
                      {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <textarea required rows="3" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe la falla..." className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white resize-none"></textarea>
                    <div className="relative">
                      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handlePhotoSelect} />
                      {!photoPreview ? (
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-800 rounded-xl p-4 flex flex-col items-center text-slate-500 hover:text-slate-400">
                          <Camera className="w-6 h-6 mb-1" /><span className="text-xs font-bold">Adjuntar Foto (Opcional)</span>
                        </button>
                      ) : (
                        <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center">
                          <img src={photoPreview} alt="P" className="object-contain h-full w-full" />
                          <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg"><X className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-emerald-600 py-4 rounded-xl font-bold text-white transition-all hover:bg-emerald-500">
                      {loading ? 'Enviando...' : 'Enviar Reporte de Falla'}
                    </button>
                  </form>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6 space-y-4">
                  <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="w-10 h-10" /></div>
                  <h2 className="text-2xl font-bold text-white">¡Reporte Enviado!</h2>
                  <p className="text-slate-400">Mantenimiento ha sido notificado.</p>
                  <button onClick={() => { setView('login'); setStep(1); setEmployeeNumber(''); setPhotoPreview(null); }} className="w-full bg-slate-800 py-4 rounded-xl font-bold text-white">Volver al Inicio</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Suspense fallback={<div className="text-white">Cargando...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
