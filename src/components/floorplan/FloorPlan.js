'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle2, Hammer, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FloorPlan() {
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [isMappingMode, setIsMappingMode] = useState(false);
  const [mappingMachineId, setMappingMachineId] = useState(null);

  // Cargar máquinas desde Supabase
  const fetchMachines = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .order('id', { ascending: true });
    
    if (data) setMachines(data);
  };

  useEffect(() => {
    fetchMachines();

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('machine-status')
      .on('postgres_changes', { event: '*', table: 'machines' }, (payload) => {
        fetchMachines();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const handleFloorClick = async (e) => {
    if (!isMappingMode || !mappingMachineId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Guardar en Supabase
    const { error } = await supabase
      .from('machines')
      .update({ x_pos: x, y_pos: y })
      .eq('id', mappingMachineId);

    if (error) {
      alert("Error de permisos: Asegúrate de tener el rol de 'manager' en tu perfil de Supabase.");
      console.error(error);
    } else {
      // Opcional: Feedback visual de éxito
      console.log("Posición guardada");
    }
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Plano Interactivo</h2>
          <p className="text-slate-400 mt-1">Mapa en tiempo real del taller de producción.</p>
        </div>
        <div className="flex gap-4 items-center">
          {isMappingMode && (
            <select 
              className="bg-slate-800 text-white px-3 py-2 rounded-lg text-sm border border-slate-700"
              onChange={(e) => setMappingMachineId(e.target.value)}
              value={mappingMachineId || ''}
            >
              <option value="">Selecciona máquina...</option>
              {machines.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
          <button 
            onClick={() => {
              setIsMappingMode(!isMappingMode);
              if (isMappingMode) setMappingMachineId(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              isMappingMode ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/40' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {isMappingMode ? 'Terminar Mapeo' : 'Modo Mapeo'}
          </button>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-blue-900/40 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nueva Máquina
          </button>
        </div>
      </div>

      <div className="flex-1 relative bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden group">
        {/* Placeholder for the image */}
        <div 
          className="absolute inset-0 bg-[url('/floorplan.png')] bg-cover bg-center opacity-40 grayscale group-hover:grayscale-0 transition-all duration-700"
          onClick={handleFloorClick}
          style={{ cursor: isMappingMode ? 'crosshair' : 'default' }}
        >
          {/* Overlay grid for design */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        </div>

        {/* Machine Points */}
        {machines.map((machine) => (
          <motion.button
            key={machine.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.2 }}
            onClick={() => setSelectedMachine(machine)}
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

        {/* Machine Details Panel (Slide-in) */}
        <AnimatePresence>
          {selectedMachine && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900 border-l border-slate-800 p-6 z-20 shadow-2xl"
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
                <button 
                  onClick={() => setSelectedMachine(null)}
                  className="text-slate-500 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Últimas Actividades</h4>
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <div className="mt-1 w-2 h-2 rounded-full bg-blue-500"></div>
                        <div>
                          <p className="text-slate-300">Cambio de rodillo superior</p>
                          <p className="text-[10px] text-slate-500">12 Mayo, 2024 - Tech: Carlos</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <button className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2">
                    <Hammer className="w-4 h-4" /> Reportar Falla / Crear Orden
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!selectedMachine && (
        <div className="mt-6 flex gap-8 items-center text-xs text-slate-500 font-medium px-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Operando
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div> En Mantenimiento
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div> Falla / Urgente
          </div>
        </div>
      )}
    </div>
  );
}
