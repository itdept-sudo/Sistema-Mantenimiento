'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Hammer,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Camera
} from 'lucide-react';

const STATUS_CONFIG = {
  open:        { label: 'Abierta',     color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20',    dot: 'bg-blue-400' },
  in_progress: { label: 'En Progreso', color: 'text-orange-400',  bg: 'bg-orange-400/10',  border: 'border-orange-400/20',  dot: 'bg-orange-400' },
  resolved:    { label: 'Resuelta',    color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', dot: 'bg-emerald-400' },
  closed:      { label: 'Cerrada',     color: 'text-slate-400',   bg: 'bg-slate-800',      border: 'border-slate-700',      dot: 'bg-slate-500' },
};

const PRIORITY_CONFIG = {
  low:    { label: 'Baja',    color: 'text-slate-400',  bg: 'bg-slate-800' },
  medium: { label: 'Media',   color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  high:   { label: 'Alta',    color: 'text-orange-400', bg: 'bg-orange-400/10' },
  urgent: { label: 'Urgente', color: 'text-red-400',    bg: 'bg-red-400/10' },
};

export default function EmployeePortal() {
  const { user, profile } = useAuth();

  const [orders, setOrders]         = useState([]);
  const [machines, setMachines]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    machine_id: '',
    description: '',
    priority: 'medium',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchMyOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Filter orders where reporter_emp_num matches user's email
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          machines (name),
          profiles!technician_id (full_name)
        `)
        .eq('reporter_emp_num', user.email)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching employee orders:', error);
        // Fallback: try to get all and filter client-side by email
        const { data: allData } = await supabase
          .from('work_orders')
          .select(`*, machines (name), profiles!technician_id (full_name)`)
          .order('created_at', { ascending: false });

        const myOrders = (allData || []).filter(o =>
          o.reporter_emp_num?.toLowerCase() === user.email?.toLowerCase()
        );
        setOrders(myOrders);
      } else {
        setOrders(data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMachines = async () => {
    const { data } = await supabase.from('machines').select('id, name, alias');
    if (data) setMachines(data);
  };

  useEffect(() => {
    if (user) {
      fetchMyOrders();
      fetchMachines();

      const channel = supabase
        .channel('employee-orders')
        .on('postgres_changes', { event: '*', table: 'work_orders' }, fetchMyOrders)
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
  }, [user]);

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const findBestTechnician = async () => {
    try {
      const { data: techs } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'technician');
      
      if (!techs || techs.length === 0) return null;

      const { data: orders } = await supabase
        .from('work_orders')
        .select('technician_id')
        .not('status', 'in', '("closed","resolved")');
      
      const counts = techs.map(t => ({
        ...t,
        count: orders?.filter(o => o.technician_id === t.id).length || 0
      }));

      counts.sort((a, b) => a.count - b.count);
      return counts[0];
    } catch (err) {
      console.error("Error in findBestTechnician:", err);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

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
      console.warn("Auto-assign check failed in EmployeePortal:", err);
    }

    let photoUrls = [];
    if (photoFile) {
      try {
        const fileName = `report-${Date.now()}.${photoFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('maintenance-photos').upload(fileName, photoFile);
        let bucket = uploadError ? 'floor-plans' : 'maintenance-photos';
        if (uploadError) {
          const { error: fallbackError } = await supabase.storage.from(bucket).upload(fileName, photoFile);
          if (fallbackError) throw fallbackError;
        }
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
        photoUrls.push(publicUrl);
      } catch (uploadErr) {
        console.error("Image upload failed:", uploadErr);
      }
    }

    const { data: newOrder, error } = await supabase
      .from('work_orders')
      .insert([{
        machine_id:       formData.machine_id,
        description:      formData.description,
        priority:         formData.priority,
        maintenance_type: 'corrective',
        status:           'open',
        reporter_name:    profile?.full_name || user?.email?.split('@')[0],
        reporter_emp_num: user?.email,
        photo_urls:       photoUrls.length > 0 ? photoUrls : null,
        technician_id:    assignedTech?.id || null
      }])
      .select('id')
      .single();

    if (error) {
      alert('Error al crear la orden: ' + error.message);
    } else {
      if (newOrder && assignedTech?.id) {
        // Registrar al técnico en la tabla de equipos
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

      // Mark machine as failure
      if (formData.machine_id) {
        await supabase
          .from('machines')
          .update({ status: 'failure' })
          .eq('id', formData.machine_id);
      }
      setSubmitSuccess(true);
      setFormData({ machine_id: '', description: '', priority: 'medium' });
      setPhotoFile(null);
      setPhotoPreview(null);
      fetchMyOrders();
      setTimeout(() => {
        setSubmitSuccess(false);
        setIsModalOpen(false);
      }, 2000);
    }
    setSubmitting(false);
  };

  // Stats for employee
  const openCount     = orders.filter(o => o.status === 'open').length;
  const progressCount = orders.filter(o => o.status === 'in_progress').length;
  const resolvedCount = orders.filter(o => o.status === 'resolved' || o.status === 'closed').length;

  return (
    <div className="p-6 md:p-8 min-h-full flex flex-col gap-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Mis Solicitudes
          </h2>
          <p className="text-slate-400 mt-1">
            Bienvenido, <span className="text-white font-semibold">{profile?.full_name || user?.email}</span>. Aquí puedes ver y reportar incidencias.
          </p>
        </div>
        <button
          onClick={() => {
            setPhotoFile(null);
            setPhotoPreview(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-5 h-5" />
          Nueva Solicitud de Soporte
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Abiertas',       value: openCount,     icon: Clock,         color: 'text-blue-400',    bg: 'bg-blue-400/10' },
          { label: 'En Progreso',    value: progressCount, icon: AlertCircle,   color: 'text-orange-400',  bg: 'bg-orange-400/10' },
          { label: 'Completadas',    value: resolvedCount, icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        ].map(stat => (
          <div key={stat.label} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
            <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-slate-400 text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Orders List */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden flex-1">
        <div className="p-5 border-b border-slate-800 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-400" />
          <h3 className="font-bold text-white">Historial de Solicitudes</h3>
          <span className="ml-auto text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{orders.length} total</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mr-3" />
            Cargando...
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <ClipboardList className="w-12 h-12 text-slate-700 mb-4" />
            <p className="text-slate-400 font-medium">No tienes solicitudes registradas</p>
            <p className="text-slate-600 text-sm mt-1">Usa el botón de arriba para reportar una incidencia.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {orders.map(order => {
              const st = STATUS_CONFIG[order.status] || STATUS_CONFIG.open;
              const pr = PRIORITY_CONFIG[order.priority] || PRIORITY_CONFIG.medium;
              return (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="w-full text-left px-5 py-4 hover:bg-slate-800/50 transition-colors flex items-center gap-4 group"
                >
                  {/* Status dot */}
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${st.dot}`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold text-blue-400">#{String(order.id).substring(0, 8).toUpperCase()}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pr.bg} ${pr.color}`}>{pr.label}</span>
                    </div>
                    <p className="text-white font-semibold text-sm truncate">{order.machines?.name || 'Máquina'}</p>
                    <p className="text-slate-500 text-xs truncate">{order.description}</p>
                  </div>

                  {/* Meta */}
                  <div className="text-right shrink-0">
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.bg} ${st.color} ${st.border}`}>
                      {st.label}
                    </span>
                    <p className="text-slate-600 text-[10px] mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ---- New Order Modal ---- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              {submitSuccess ? (
                <div className="p-12 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">¡Solicitud enviada!</h3>
                  <p className="text-slate-400 mt-2 text-sm">Tu reporte fue registrado. Un técnico lo atenderá pronto.</p>
                </div>
              ) : (
                <>
                  <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Nueva Solicitud de Soporte</h3>
                      <p className="text-xs text-slate-500">Reporta una falla o incidencia.</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsModalOpen(false);
                        setPhotoFile(null);
                        setPhotoPreview(null);
                      }}
                      className="ml-auto text-slate-500 hover:text-white transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Machine */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Máquina / Área Afectada
                      </label>
                      <select
                        required
                        value={formData.machine_id}
                        onChange={e => setFormData({ ...formData, machine_id: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                      >
                        <option value="">Selecciona una máquina...</option>
                        {machines.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name}{m.alias ? ` "${m.alias}"` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Urgencia
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {['low', 'medium', 'high', 'urgent'].map(p => {
                          const pc = PRIORITY_CONFIG[p];
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setFormData({ ...formData, priority: p })}
                              className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                                formData.priority === p
                                  ? `${pc.bg} ${pc.color} border-current`
                                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-600'
                              }`}
                            >
                              {pc.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Descripción del problema
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe con detalle la falla, cuándo ocurrió, qué comportamiento observaste..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none placeholder:text-slate-600"
                      />
                    </div>

                    {/* Photo Upload */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Adjuntar Imagen (Opcional)
                      </label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handlePhotoSelect} 
                      />
                      {!photoPreview ? (
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()} 
                          className="w-full border-2 border-dashed border-slate-800 bg-slate-950 hover:bg-slate-900/40 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500 hover:text-slate-450 transition-colors gap-1.5"
                        >
                          <Camera className="w-5 h-5 text-slate-500" />
                          <span className="text-xs font-bold">Adjuntar foto de la falla</span>
                        </button>
                      ) : (
                        <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center">
                          <img src={photoPreview} alt="Vista previa" className="object-contain h-full w-full" />
                          <button 
                            type="button" 
                            onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} 
                            className="absolute top-2 right-2 p-1.5 bg-red-650 hover:bg-red-500 text-white rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Hammer className="w-5 h-5" />
                          Enviar Solicitud
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---- Order Detail Modal ---- */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              {(() => {
                const st = STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.open;
                const pr = PRIORITY_CONFIG[selectedOrder.priority] || PRIORITY_CONFIG.medium;
                return (
                  <>
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-blue-400">
                          #{String(selectedOrder.id).substring(0, 8).toUpperCase()}
                        </span>
                        <h3 className="text-xl font-bold text-white mt-0.5">
                          {selectedOrder.machines?.name || 'Máquina'}
                        </h3>
                      </div>
                      <button
                        onClick={() => setSelectedOrder(null)}
                        className="text-slate-500 hover:text-white transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="p-6 space-y-4">
                      <div className="flex gap-3">
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${st.bg} ${st.color} ${st.border}`}>
                          {st.label}
                        </span>
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${pr.bg} ${pr.color}`}>
                          {pr.label}
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Descripción</p>
                        <p className="text-slate-300 text-sm leading-relaxed">{selectedOrder.description}</p>
                      </div>

                      {selectedOrder.profiles?.full_name && (
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Técnico Asignado</p>
                          <p className="text-white font-semibold text-sm">{selectedOrder.profiles.full_name}</p>
                        </div>
                      )}

                      {selectedOrder.photo_urls && selectedOrder.photo_urls.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase mb-2">Evidencia Fotográfica</p>
                          <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center">
                            <img src={selectedOrder.photo_urls[0]} alt="Evidencia de la falla" className="object-contain h-full w-full" />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                        <div>
                          <p className="text-xs text-slate-500">Fecha de reporte</p>
                          <p className="text-white text-sm font-medium mt-0.5">
                            {new Date(selectedOrder.created_at).toLocaleString()}
                          </p>
                        </div>
                        {selectedOrder.updated_at && (
                          <div>
                            <p className="text-xs text-slate-500">Última actualización</p>
                            <p className="text-white text-sm font-medium mt-0.5">
                              {new Date(selectedOrder.updated_at).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="px-6 pb-6">
                      <button
                        onClick={() => setSelectedOrder(null)}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
                      >
                        Cerrar
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
