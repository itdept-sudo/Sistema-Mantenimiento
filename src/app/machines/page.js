'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Cpu, 
  Truck, 
  Search, 
  Plus, 
  MapPin, 
  Activity, 
  MoreHorizontal,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Filter,
  RefreshCw,
  Box,
  Database,
  BookOpen,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MachineModal from '@/components/inventory/MachineModal';
import MachineModelCatalog from '@/components/inventory/MachineModelCatalog';

export default function MachinesPage() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);

  const fetchMachines = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setMachines(data || []);
    } catch (err) {
      console.error("Error fetching machines:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!supabase) return;
    fetchMachines();

    const channel = supabase.channel('machines-sync')
      .on('postgres_changes', { event: '*', table: 'machines' }, () => fetchMachines())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const filteredMachines = machines.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (m.alias && m.alias.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (m.serial_number && m.serial_number.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'All' || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: machines.length,
    operational: machines.filter(m => m.status === 'operational').length,
    failure: machines.filter(m => m.status === 'failure').length,
    maintenance: machines.filter(m => m.status === 'maintenance').length,
  };

  const categories = ['All', 'Producción', 'Montacargas', 'Servicios'];

  return (
    <div className="p-4 md:p-8 min-h-screen bg-slate-950 flex flex-col gap-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-900/20">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Gestión de Equipos</h1>
              <p className="text-slate-400 text-sm">Inventario de maquinaria fija y equipos móviles.</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setIsCatalogOpen(true)}
            className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-300 px-6 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <Database className="w-5 h-5 text-indigo-400" /> Catálogo Modelos
          </button>
          <button 
            onClick={() => { setSelectedMachine(null); setIsModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Agregar Equipo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Total Equipos', value: stats.total, icon: Box, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Operativos', value: stats.operational, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
          { label: 'En Falla', value: stats.failure, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
          { label: 'Mantenimiento', value: stats.maintenance, icon: RefreshCw, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
        ].map((s, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={s.label} 
            className="p-4 md:p-6 bg-slate-900/50 border border-slate-800 rounded-3xl"
          >
            <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-4`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
            <h3 className="text-xl md:text-2xl font-bold text-white mt-1">{s.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/50 border border-slate-800 p-4 md:p-6 rounded-[2rem]">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar por nombre, alias o serie..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto scrollbar-hide pb-2 md:pb-0">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                categoryFilter === cat ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-950 text-slate-500 border border-slate-800 hover:text-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredMachines.map((m) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={m.id}
              onClick={() => { setSelectedMachine(m); setIsModalOpen(true); }}
              className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 hover:border-blue-500/50 transition-all group cursor-pointer flex flex-col h-full shadow-lg hover:shadow-blue-900/10"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950/50 border border-slate-800 flex items-center justify-center">
                  {m.image_url ? (
                    <img src={m.image_url} alt={m.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className={`p-4 rounded-2xl ${
                      m.category === 'Montacargas' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {m.category === 'Montacargas' ? <Truck className="w-10 h-10" /> : <Cpu className="w-10 h-10" />}
                    </div>
                  )}
                  
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md ${
                    m.status === 'operational' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                    m.status === 'failure' ? 'bg-red-500/20 text-red-500 border-red-500/30' :
                    'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                  }`}>
                    {m.status === 'operational' ? 'Operativo' : m.status === 'failure' ? 'En Paro' : 'Mantenimiento'}
                  </div>

                  {m.manual_url && (
                    <div className="absolute bottom-3 right-3 p-2 bg-slate-900/80 rounded-xl text-blue-400 border border-blue-500/30 shadow-lg backdrop-blur-sm" title="Manual Técnico Disponible">
                      <FileText className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors leading-tight">
                      {m.name}
                    </h3>
                    {m.alias && (
                      <p className="text-indigo-400 text-sm font-bold italic">
                        "{m.alias}"
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700/50">{m.category || 'Equipo'}</span>
                  <span className="text-slate-700">•</span>
                  <span className="text-[10px] text-slate-500 font-mono uppercase truncate max-w-[150px]">{m.brand || 'Marca'} {m.serial_number || 'S/N'}</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800/50 flex justify-between items-center">
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="w-4 h-4 text-slate-600" />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">
                    {m.x_pos > 0 ? 'Ubicado en Planta' : 'Sin Ubicación'}
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 group-hover:bg-blue-600 group-hover:text-white rounded-xl text-slate-500 transition-all">
                  <Settings className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <MachineModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        machine={selectedMachine}
        onSuccess={fetchMachines}
      />

      <MachineModelCatalog 
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
      />
    </div>
  );
}
