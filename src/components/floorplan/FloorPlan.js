'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle2, Hammer, Plus, Map as MapIcon, Trash2, Image as ImageIcon, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import OrderModal from '@/components/orders/OrderModal';

export default function FloorPlan() {
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [isMappingMode, setIsMappingMode] = useState(false);
  const [mappingMachineId, setMappingMachineId] = useState(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [machineOrders, setMachineOrders] = useState([]);
  const [planImage, setPlanImage] = useState('/floorplan.png');

  const fetchData = async () => {
    if (!supabase) return;
    
    // Cargar Máquinas
    const { data: machinesData } = await supabase
      .from('machines')
      .select('*')
      .order('id', { ascending: true });
    if (machinesData) setMachines(machinesData);

    // Cargar Configuración de Imagen
    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'floor_plan_image')
      .single();
    if (settings) setPlanImage(settings.value);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('floor-updates')
      .on('postgres_changes', { event: '*', table: 'machines' }, () => fetchData())
      .on('postgres_changes', { event: '*', table: 'settings' }, () => fetchData())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

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

  const handleUpdateImage = async () => {
    const newUrl = prompt("Pega la URL de la nueva imagen o nombre del archivo en public (ej: /nuevo-plano.png):", planImage);
    if (newUrl && newUrl !== planImage) {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'floor_plan_image', value: newUrl });
      
      if (error) alert("Error al guardar la imagen.");
      else setPlanImage(newUrl);
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
    if (!error) setSelectedMachine(null);
  };

  const unmappedMachines = machines.filter(m => !m.x_pos || m.x_pos === 0);

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Plano Interactivo</h2>
          <p className="text-slate-400 mt-1">Gestión visual de planta en tiempo real.</p>
        </div>

        <div className="flex gap-4 items-center">
          <button 
            onClick={handleUpdateImage}
            className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700"
            title="Cambiar imagen de fondo"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {isMappingMode && (
            <select 
              className="bg-slate-800 text-white px-3 py-2 rounded-lg text-sm border border-slate-700"
              onChange={(e) => setMappingMachineId(e.target.value)}
              value={mappingMachineId || ''}
            >
              <option value="">Selecciona máquina...</option>
              {unmappedMachines.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
          
          <button 
            onClick={() => {
              setIsMappingMode(!isMappingMode);
              if (isMappingMode) setMappingMachineId(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              isMappingMode ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/40' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            {isMappingMode ? 'Listo' : 'Editar Mapa'}
          </button>
        </div>
      </div>

      <div className="flex-1 relative bg-slate-950 rounded-3xl border border-slate-800 overflow-auto group p-4">
        <div 
          className="relative mx-auto bg-slate-900 shadow-2xl transition-all duration-700 overflow-hidden rounded-xl"
          onClick={handleFloorClick}
          style={{ 
            backgroundImage: `url('${planImage}')`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            width: '100%',
            minWidth: '1000px',
            aspectRatio: '1440/900',
            cursor: isMappingMode && mappingMachineId ? 'crosshair' : 'default'
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

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
                machine.status === 'failure' ? 'bg-red-500 animate-pulse' : 
                machine.status === 'maintenance' ? 'bg-yellow-500' : 'bg-emerald-500'
              }`}>
                {machine.status === 'failure' && (
                  <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></div>
                )}
              </div>
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {selectedMachine && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 p-6 z-20 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedMachine.name}</h3>
                  <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded mt-2 inline-block ${
                    selectedMachine.status === 'failure' ? 'bg-red-500/20 text-red-400' : 
                    selectedMachine.status === 'maintenance' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {selectedMachine.status}
                  </span>
                </div>
                <button onClick={() => setSelectedMachine(null)} className="text-slate-500 hover:text-white">✕</button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Historial</h4>
                  <div className="space-y-4">
                    {machineOrders.length > 0 ? machineOrders.map((order) => (
                      <div key={order.id} className="flex gap-3 text-sm border-b border-slate-800/50 pb-3 last:border-0">
                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                          order.status === 'open' ? 'bg-blue-500' :
                          order.status === 'in_progress' ? 'bg-orange-500' :
                          'bg-emerald-500'
                        }`}></div>
                        <div>
                          <p className="text-slate-300 line-clamp-2">{order.description}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )) : (
                      <p className="text-xs text-slate-600 italic">Sin historial.</p>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800 space-y-3">
                  <button 
                    onClick={() => setIsOrderModalOpen(true)}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Hammer className="w-4 h-4" /> Reportar Falla
                  </button>
                  <button 
                    onClick={() => handleResetPosition(selectedMachine.id)}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" /> Quitar del Mapa
                  </button>
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
        onSuccess={() => alert("Orden creada")}
      />
    </div>
  );
}
