'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle2, Hammer, Plus, Map as MapIcon, Trash2, Upload, Settings, Maximize, Minimize } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import OrderModal from '@/components/orders/OrderModal';
import { useAuth } from '@/lib/AuthContext';

export default function FloorPlan() {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'supervisor';
  
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [isMappingMode, setIsMappingMode] = useState(false);
  const [mappingMachineId, setMappingMachineId] = useState(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [machineOrders, setMachineOrders] = useState([]);
  const [planImage, setPlanImage] = useState('/floorplan.png');
  const [isUploading, setIsUploading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  const fetchData = async () => {
    if (!supabase || !user) return;
    
    try {
      const { data: machinesData, error: mError } = await supabase
        .from('machines')
        .select('*')
        .order('id', { ascending: true });
      
      if (mError) throw mError;
      if (machinesData) setMachines(machinesData);

      const { data: settings } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'floor_plan_image')
        .single();
      if (settings) setPlanImage(settings.value);
    } catch (error) {
      console.error("FloorPlan Error:", error);
    }
  };

  useEffect(() => {
    fetchData();

    // SUSCRIPCIÓN REFORZADA EN TIEMPO REAL
    const channel = supabase
      .channel('floor-updates-realtime')
      .on('postgres_changes', 
        { event: '*', table: 'machines', schema: 'public' }, 
        (payload) => {
          console.log("PLAN: Cambio en máquina detectado!", payload);
          fetchData();
        }
      )
      .on('postgres_changes', 
        { event: '*', table: 'settings', schema: 'public' }, 
        (payload) => {
          console.log("PLAN: Configuración actualizada!", payload);
          fetchData();
        }
      )
      .subscribe((status) => {
        console.log("PLAN: Estado de conexión Realtime:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (selectedMachine && supabase) {
      const fetchMachineOrders = async () => {
        const { data } = await supabase
          .from('work_orders')
          .select('*')
          .eq('machine_id', selectedMachine.id)
          .order('created_at', { ascending: false })
          .limit(5);
        setMachineOrders(data || []);
      };
      fetchMachineOrders();
    }
  }, [selectedMachine]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !supabase) return;

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `floorplan-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('floor-plans')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('floor-plans')
        .getPublicUrl(filePath);

      const { error: settingsError } = await supabase
        .from('settings')
        .upsert({ key: 'floor_plan_image', value: publicUrl });

      if (settingsError) throw settingsError;

      setPlanImage(publicUrl);
      alert("Plano actualizado correctamente.");
    } catch (error) {
      alert("Error al subir el archivo.");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFloorClick = async (e) => {
    if (!isMappingMode || !mappingMachineId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const { error } = await supabase
      .from('machines')
      .update({ x_pos: x, y_pos: y })
      .eq('id', mappingMachineId);

    if (!error) setMappingMachineId(null);
  };

  const handleResetPosition = async (machineId) => {
    if (!confirm("¿Quitar esta máquina del plano?")) return;
    const { error } = await supabase
      .from('machines')
      .update({ x_pos: 0, y_pos: 0 })
      .eq('id', machineId);
    
    if (error) {
      alert("No se pudo quitar la máquina: " + error.message);
    } else {
      setSelectedMachine(null);
      fetchData();
    }
  };

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleZoom = (delta) => {
    setScale(prev => Math.min(Math.max(prev + delta, 0.5), 5));
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        alert(`Error al intentar pantalla completa: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (isFull) resetZoom();
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const unmappedMachines = machines.filter(m => !m.x_pos || m.x_pos === 0);

  return (
    <div 
      ref={containerRef} 
      className={`flex flex-col bg-slate-950 transition-all duration-300 ${
        isFullscreen ? 'h-screen w-screen p-0 overflow-hidden' : 'p-8 h-full min-h-[600px]'
      }`}
    >
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />

      {!isFullscreen && (
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Plano Interactivo</h2>
            <p className="text-slate-400 mt-1">Gestión visual de planta en tiempo real.</p>
          </div>

          <div className="flex gap-4 items-center">
            {isAdmin && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700 flex items-center gap-2"
              >
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span className="text-xs font-semibold">Cargar Plano</span>
                  </>
                )}
              </button>
            )}

            {isMappingMode && isAdmin && (
              <select 
                className="bg-slate-800 text-white px-3 py-2 rounded-lg text-sm border border-slate-700"
                onChange={(e) => setMappingMachineId(e.target.value)}
                value={mappingMachineId || ''}
              >
                <option value="">Ubicar máquina...</option>
                {unmappedMachines.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.alias ? `"${m.alias}"` : ''}
                  </option>
                ))}
              </select>
            )}
            
            {isAdmin && (
              <button 
                onClick={() => {
                  setIsMappingMode(!isMappingMode);
                  if (isMappingMode) setMappingMachineId(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                  isMappingMode ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-800 text-slate-300'
                }`}
              >
                <MapIcon className="w-4 h-4" />
                {isMappingMode ? 'Listo' : 'Mapear'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Controls Overlay */}
      <div className={`absolute z-50 flex flex-col gap-4 ${isFullscreen ? 'top-6 left-6' : 'top-32 right-12'}`}>
        {/* Zoom Controls */}
        <div className="flex flex-col bg-slate-900/80 backdrop-blur-md border border-slate-700 p-1.5 rounded-2xl shadow-2xl">
          <button onClick={() => handleZoom(0.2)} className="p-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all" title="Zoom +">
            <Plus className="w-5 h-5" />
          </button>
          <button onClick={() => handleZoom(-0.2)} className="p-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all" title="Zoom -">
            <Minimize className="w-5 h-5" />
          </button>
          <button onClick={resetZoom} className="p-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all border-t border-slate-800" title="Restablecer">
            <Maximize className="w-5 h-5" />
          </button>
        </div>

        {/* Fullscreen Button */}
        <button 
          onClick={toggleFullscreen}
          className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl hover:bg-blue-500 transition-all active:scale-95"
        >
          {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
        </button>
      </div>

      {/* Legend - Floating bottom */}
      <div className={`absolute z-40 bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-2xl ${isFullscreen ? 'bottom-6 left-6' : 'bottom-12 left-12'}`}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Operativa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Falla</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Manto</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative overflow-hidden bg-slate-950 rounded-[2.5rem] border border-slate-800/50 shadow-inner">
        <motion.div 
          drag
          dragMomentum={false}
          className="relative inline-block origin-center cursor-grab active:cursor-grabbing"
          animate={{ scale, x: position.x, y: position.y }}
          style={{ 
            backgroundImage: `url('${planImage}')`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            width: isFullscreen ? '100vw' : '100%',
            height: isFullscreen ? '100vh' : '100%',
            minWidth: '1000px',
            minHeight: '600px',
            aspectRatio: '1440/900'
          }}
          onClick={handleFloorClick}
        >
          {machines.filter(m => m.x_pos > 0).map((machine) => (
            <motion.button
              key={machine.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.2 }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMachine(machine);
              }}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
              style={{ left: `${machine.x_pos}%`, top: `${machine.y_pos}%` }}
            >
              <div className={`relative w-6 h-6 rounded-full border-2 border-white shadow-lg ${
                machine.status === 'failure' ? 'bg-red-500' : 
                machine.status === 'maintenance' ? 'bg-yellow-500' : 'bg-emerald-500'
              }`}>
                {machine.status === 'failure' && <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-50"></div>}
              </div>
            </motion.button>
          ))}
        </motion.div>

        {/* Machine Sidebar */}
        <AnimatePresence>
          {selectedMachine && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900/90 backdrop-blur-xl border-l border-slate-800 p-6 z-[60] shadow-2xl overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-6 text-white">
                <div>
                  <h3 className="text-xl font-bold">{selectedMachine.name}</h3>
                  {selectedMachine.alias && (
                    <p className="text-indigo-400 text-sm font-bold italic">"{selectedMachine.alias}"</p>
                  )}
                  <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded mt-2 inline-block ${
                    selectedMachine.status === 'failure' ? 'bg-red-500/20 text-red-400' : 
                    selectedMachine.status === 'maintenance' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {selectedMachine.status}
                  </span>
                  
                  {isAdmin && (
                    <div className="mt-4 space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Estado Manual</label>
                      <select 
                        value={selectedMachine.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          const { error } = await supabase
                            .from('machines')
                            .update({ status: newStatus })
                            .eq('id', selectedMachine.id);
                          if (!error) {
                            setSelectedMachine({ ...selectedMachine, status: newStatus });
                            fetchData();
                          }
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="operational">Operativa (Verde)</option>
                        <option value="failure">Falla / Paro (Rojo)</option>
                        <option value="maintenance">Mantenimiento (Amarillo)</option>
                      </select>
                    </div>
                  )}
                </div>
                <button onClick={() => setSelectedMachine(null)} className="p-2 hover:bg-slate-800 rounded-lg">✕</button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Historial Reciente</h4>
                  <div className="space-y-4">
                    {machineOrders.length > 0 ? machineOrders.map((order) => (
                      <div key={order.id} className="flex gap-3 text-sm border-b border-slate-800/50 pb-3 last:border-0 text-slate-300">
                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                          order.status === 'open' ? 'bg-blue-500' :
                          order.status === 'in_progress' ? 'bg-orange-500' : 'bg-emerald-500'
                        }`}></div>
                        <div>
                          <p className="line-clamp-2">{order.description}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )) : <p className="text-xs text-slate-600 italic">Sin historial reciente.</p>}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800 space-y-3">
                  <button 
                    onClick={() => setIsOrderModalOpen(true)}
                    className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Hammer className="w-5 h-5" /> Reportar Falla
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={() => handleResetPosition(selectedMachine.id)}
                      className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-slate-700"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" /> Quitar del Mapa
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <OrderModal 
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        initialMachineId={selectedMachine?.id}
        machines={machines}
        onSuccess={() => { fetchData(); setSelectedMachine(null); }}
      />
    </div>
  );
}
