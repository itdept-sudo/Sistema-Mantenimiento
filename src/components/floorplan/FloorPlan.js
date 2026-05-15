'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, itamSupabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle2, Hammer, Plus, Map as MapIcon, Trash2, Upload, Settings, Maximize, Minimize, Activity as ActivityIcon, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import OrderModal from '@/components/orders/OrderModal';
import OrderDetailsModal from '@/components/orders/OrderDetailsModal';
import { useAuth } from '@/lib/AuthContext';

export default function FloorPlan() {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'supervisor';
  
  const [machines, setMachines] = useState([]);
  const [areaIndicators, setAreaIndicators] = useState([]);
  const [itamAreas, setItamAreas] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  
  const [selectedArea, setSelectedArea] = useState(null);
  
  const [isMappingMode, setIsMappingMode] = useState(false);
  const [mappingType, setMappingType] = useState('machine'); // 'machine' or 'area'
  const [mappingMachineId, setMappingMachineId] = useState(null);
  const [mappingAreaId, setMappingAreaId] = useState(null);

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [viewingOrderId, setViewingOrderId] = useState(null);
  
  const [machineOrders, setMachineOrders] = useState([]);
  const [planImage, setPlanImage] = useState('/floorplan.png');
  const [isUploading, setIsUploading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  const fetchData = async () => {
    if (!supabase || !user) return;
    
    try {
      // 1. Fetch Machines
      const { data: machinesData } = await supabase
        .from('machines')
        .select('*')
        .order('id', { ascending: true });
      if (machinesData) setMachines(machinesData);

      // 2. Fetch Area Indicators (Positions)
      const { data: indicators } = await supabase
        .from('area_indicators')
        .select('*');
      if (indicators) setAreaIndicators(indicators);

      // 3. Fetch ITAM Areas (Names)
      if (itamSupabase) {
        const { data: areas } = await itamSupabase.from('areas').select('id, name');
        setItamAreas(areas || []);
      }

      // 4. Plan Image from settings
      const { data: settings } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'floor_plan_image')
        .maybeSingle();
      if (settings) setPlanImage(settings.value);

    } catch (error) {
      console.error("FloorPlan Error:", error);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('floor-updates-all')
      .on('postgres_changes', { event: '*', table: 'machines' }, () => fetchData())
      .on('postgres_changes', { event: '*', table: 'area_indicators' }, () => fetchData())
      .on('postgres_changes', { event: '*', table: 'settings' }, () => fetchData())
      .subscribe();

    return () => supabase.removeChannel(channel);
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

  // Logic to determine Area LED Status (Aggregated)
  const getAreaStatus = (areaId) => {
    const machinesInArea = machines.filter(m => m.area_id === areaId);
    if (machinesInArea.length === 0) return 'operational';
    if (machinesInArea.some(m => m.status === 'failure')) return 'failure';
    if (machinesInArea.some(m => m.status === 'maintenance')) return 'maintenance';
    return 'operational';
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !supabase) return;

    setIsUploading(true);
    const fileName = `floorplan-${Math.random()}.png`;

    try {
      const { error: uploadError } = await supabase.storage.from('floor-plans').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('floor-plans').getPublicUrl(fileName);
      await supabase.from('settings').upsert({ key: 'floor_plan_image', value: publicUrl });
      setPlanImage(publicUrl);
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFloorClick = async (e) => {
    if (!isMappingMode) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (mappingType === 'machine' && mappingMachineId) {
      const { error } = await supabase.from('machines').update({ x_pos: x, y_pos: y }).eq('id', mappingMachineId);
      if (!error) {
        setMappingMachineId(null);
        fetchData();
      }
    } else if (mappingType === 'area' && mappingAreaId) {
      const areaName = itamAreas.find(a => a.id === mappingAreaId)?.name || 'Área';
      const { error } = await supabase.from('area_indicators').upsert({ 
        area_id: mappingAreaId, 
        area_name: areaName,
        x_pos: x, 
        y_pos: y 
      });
      if (!error) {
        setMappingAreaId(null);
        fetchData();
      }
    }
  };

  const handleResetPosition = async (machineId) => {
    if (!confirm("¿Quitar esta máquina del plano?")) return;
    await supabase.from('machines').update({ x_pos: 0, y_pos: 0 }).eq('id', machineId);
    setSelectedMachine(null);
    fetchData();
  };

  const handleResetArea = async (areaId) => {
    if (!confirm("¿Quitar este indicador de área?")) return;
    await supabase.from('area_indicators').delete().eq('area_id', areaId);
    setSelectedArea(null);
    fetchData();
  };

  const handleZoom = (delta) => setScale(prev => Math.min(Math.max(prev + delta, 0.5), 5));
  const resetZoom = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  useEffect(() => {
    const cb = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', cb);
    return () => document.removeEventListener('fullscreenchange', cb);
  }, []);

  const unmappedMachines = machines.filter(m => !m.x_pos || m.x_pos === 0);
  const unmappedAreas = itamAreas.filter(a => !areaIndicators.find(i => i.area_id === a.id));

  return (
    <div 
      ref={containerRef} 
      className={`flex flex-col bg-slate-950 transition-all duration-300 ${
        isFullscreen ? 'h-screen w-screen p-0 overflow-hidden' : 'p-8 h-full min-h-[600px]'
      }`}
    >
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />

      {!isFullscreen && (
        <div className="flex justify-between items-center mb-8 text-white">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              Plano Interactivo <Layers className="w-6 h-6 text-blue-500" />
            </h2>
            <p className="text-slate-400 mt-1">Monitoreo visual de máquinas y áreas en tiempo real.</p>
          </div>

          <div className="flex gap-4 items-center">
            {isMappingMode && isAdmin && (
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
                <button 
                  onClick={() => setMappingType('machine')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mappingType === 'machine' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Máquinas
                </button>
                <button 
                  onClick={() => setMappingType('area')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mappingType === 'area' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Áreas LED
                </button>
              </div>
            )}

            {isMappingMode && isAdmin && (
              <select 
                className="bg-slate-800 text-white px-3 py-2 rounded-lg text-sm border border-slate-700 outline-none"
                onChange={(e) => mappingType === 'machine' ? setMappingMachineId(e.target.value) : setMappingAreaId(e.target.value)}
                value={(mappingType === 'machine' ? mappingMachineId : mappingAreaId) || ''}
              >
                <option value="">{mappingType === 'machine' ? 'Ubicar máquina...' : 'Ubicar indicador de área...'}</option>
                {mappingType === 'machine' 
                  ? unmappedMachines.map(m => <option key={m.id} value={m.id}>{m.name} {m.alias ? `"${m.alias}"` : ''}</option>)
                  : unmappedAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)
                }
              </select>
            )}
            
            {isAdmin && (
              <button 
                onClick={() => {
                  setIsMappingMode(!isMappingMode);
                  if (isMappingMode) { setMappingMachineId(null); setMappingAreaId(null); }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                  isMappingMode ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-800 text-slate-300 border border-slate-700'
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

        <button 
          onClick={toggleFullscreen}
          className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl hover:bg-blue-500 transition-all active:scale-95"
        >
          {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
        </button>
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
          {/* Render Area LEDs */}
          {areaIndicators.map((indicator) => {
            const status = getAreaStatus(indicator.area_id);
            return (
              <motion.button
                key={indicator.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedArea(indicator);
                  setSelectedMachine(null);
                }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-0 group"
                style={{ left: `${indicator.x_pos}%`, top: `${indicator.y_pos}%` }}
              >
                <div className="flex flex-col items-center">
                  <div className={`relative w-6 h-6 rounded-full border-2 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-500 ${
                    status === 'failure' ? 'bg-red-500' : 
                    status === 'maintenance' ? 'bg-yellow-500' : 'bg-emerald-500/80'
                  }`}>
                    {status === 'failure' && <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40"></div>}
                  </div>
                  <div className="mt-1 px-2 py-0.5 bg-slate-900 border border-blue-500/50 rounded shadow-lg group-hover:bg-blue-600 group-hover:border-blue-400 transition-all">
                    <span className="text-[7px] font-black text-blue-400 group-hover:text-white uppercase tracking-tighter whitespace-nowrap">
                      {indicator.area_name}
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}

          {/* Render Machines */}
          {machines.filter(m => m.x_pos > 0).map((machine) => (
            <motion.button
              key={machine.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.2 }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMachine(machine);
                setSelectedArea(null);
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

        {/* Sidebar (Unified for Machine and Area) */}
        <AnimatePresence>
          {(selectedMachine || selectedArea) && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900/90 backdrop-blur-xl border-l border-slate-800 p-6 z-[60] shadow-2xl overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-6 text-white">
                {selectedMachine ? (
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
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Layers className="w-5 h-5 text-emerald-400" /> {selectedArea.area_name}
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">Detalle de Departamento</p>
                  </div>
                )}
                <button onClick={() => { setSelectedMachine(null); setSelectedArea(null); }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">✕</button>
              </div>

              {selectedMachine ? (
                <div className="space-y-6">
                  {isAdmin && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Estado Manual</label>
                      <select 
                        value={selectedMachine.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          const { error } = await supabase.from('machines').update({ status: newStatus }).eq('id', selectedMachine.id);
                          if (!error) { setSelectedMachine({ ...selectedMachine, status: newStatus }); fetchData(); }
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white focus:outline-none"
                      >
                        <option value="operational">Operativa (Verde)</option>
                        <option value="failure">Falla / Paro (Rojo)</option>
                        <option value="maintenance">Mantenimiento (Amarillo)</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Historial Reciente</h4>
                    <div className="space-y-4">
                      {machineOrders.length > 0 ? machineOrders.map((order) => (
                        <button 
                          key={order.id} 
                          onClick={() => { setViewingOrderId(order.id); setIsDetailsModalOpen(true); }}
                          className="w-full flex gap-3 text-sm border-b border-slate-800/50 pb-3 last:border-0 text-slate-300 hover:bg-slate-800/50 transition-all rounded-lg p-2 text-left"
                        >
                          <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${order.status === 'closed' ? 'bg-emerald-500' : order.status === 'in_progress' ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                          <div>
                            <p className="line-clamp-2 font-medium">{order.description}</p>
                            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-2">
                              {new Date(order.created_at).toLocaleDateString()}
                              <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Ver Detalles</span>
                            </p>
                          </div>
                        </button>
                      )) : <p className="text-xs text-slate-600 italic">Sin historial reciente.</p>}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-800 space-y-3">
                    <button onClick={() => setIsOrderModalOpen(true)} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2">
                      <Hammer className="w-5 h-5" /> Reportar Falla
                    </button>
                    {isAdmin && (
                      <button onClick={() => handleResetPosition(selectedMachine.id)} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-700">
                        <Trash2 className="w-4 h-4 text-red-500" /> Quitar del Mapa
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Maquinaria en esta Área</h4>
                    <div className="space-y-2">
                      {machines.filter(m => m.area_id === selectedArea.area_id).length > 0 ? (
                        machines.filter(m => m.area_id === selectedArea.area_id).map((m) => (
                          <button 
                            key={m.id}
                            onClick={() => { setSelectedMachine(m); setSelectedArea(null); }}
                            className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 transition-all text-left"
                          >
                            <div>
                              <p className="text-sm font-bold text-white">{m.name}</p>
                              {m.alias && <p className="text-[10px] text-indigo-400 font-bold italic">"{m.alias}"</p>}
                            </div>
                            <div className={`w-3 h-3 rounded-full ${
                              m.status === 'failure' ? 'bg-red-500 animate-pulse' : 
                              m.status === 'maintenance' ? 'bg-yellow-500' : 'bg-emerald-500'
                            }`} />
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-slate-600 italic py-4">No hay maquinaria asignada a esta área aún.</p>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="pt-6 border-t border-slate-800">
                      <button 
                        onClick={() => handleResetArea(selectedArea.area_id)}
                        className="w-full py-3 bg-slate-800 hover:bg-red-900/20 hover:text-red-400 text-slate-400 rounded-xl text-[10px] font-bold transition-all border border-slate-700 flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-3 h-3" /> Eliminar LED de Área
                      </button>
                    </div>
                  )}
                </div>
              )}
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

      <OrderDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        orderId={viewingOrderId}
      />
    </div>
  );
}
   </div>
  );
}

