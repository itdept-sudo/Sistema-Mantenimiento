'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Package, 
  Search, 
  Plus, 
  ArrowUpDown, 
  MoreHorizontal,
  AlertCircle,
  Truck,
  Edit,
  History,
  Filter,
  RefreshCw,
  Box,
  FileDown,
  X,
  Save,
  Calendar,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import InventoryModal from '@/components/inventory/InventoryModal';
import StockAdjustmentModal from '@/components/inventory/StockAdjustmentModal';
import InventoryHistoryModal from '@/components/inventory/InventoryHistoryModal';
import InventoryReportModal from '@/components/inventory/InventoryReportModal';

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Multiple Inventories State
  const [inventories, setInventories] = useState([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState(null);
  const [selectedInventoryName, setSelectedInventoryName] = useState('');
  
  // New Inventory Modal State
  const [isNewInvModalOpen, setIsNewInvModalOpen] = useState(false);
  const [newInvName, setNewInvName] = useState('');
  const [newInvDesc, setNewInvDesc] = useState('');
  const [creatingInv, setCreatingInv] = useState(false);

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState(null);

  const fetchInventories = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('inventories')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      if (data) {
        setInventories(data);
        // Default to Repuestos if found, otherwise first available
        const repuestos = data.find(i => i.name === 'Repuestos');
        if (repuestos && !selectedInventoryId) {
          setSelectedInventoryId(repuestos.id);
          setSelectedInventoryName(repuestos.name);
        } else if (data.length > 0 && !selectedInventoryId) {
          setSelectedInventoryId(data[0].id);
          setSelectedInventoryName(data[0].name);
        }
      }
    } catch (err) {
      console.error("Error fetching inventories:", err);
    }
  };

  const fetchInventory = async () => {
    if (!supabase || !selectedInventoryId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('inventory_id', selectedInventoryId)
        .order('name', { ascending: true });
      
      if (error) throw error;
      if (data) setItems(data);
    } catch (err) {
      console.error("Error fetching inventory items:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load inventories list on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInventories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch items whenever the selected inventory changes
  useEffect(() => {
    if (selectedInventoryId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchInventory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInventoryId]);

  // Real-time synchronization
  useEffect(() => {
    if (!supabase) return;
    
    const channel = supabase.channel('inventory-sync-all')
      .on('postgres_changes', { event: '*', table: 'inventory' }, () => fetchInventory())
      .on('postgres_changes', { event: '*', table: 'inventory_logs' }, () => fetchInventory())
      .on('postgres_changes', { event: '*', table: 'inventories' }, () => fetchInventories())
      .subscribe();

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInventoryId]);

  const handleCreateInventory = async (e) => {
    e.preventDefault();
    if (!newInvName.trim() || !supabase) return;
    setCreatingInv(true);
    try {
      const { data, error } = await supabase
        .from('inventories')
        .insert([{ name: newInvName, description: newInvDesc }])
        .select()
        .single();
      
      if (error) throw error;
      if (data) {
        setSelectedInventoryId(data.id);
        setSelectedInventoryName(data.name);
        setNewInvName('');
        setNewInvDesc('');
        setIsNewInvModalOpen(false);
        await fetchInventories();
      }
    } catch (err) {
      console.error("Error creating inventory:", err);
      alert("Error al crear el inventario. Verifica que el nombre sea único.");
    } finally {
      setCreatingInv(false);
    }
  };

  const categories = ['All', ...new Set(items.map(i => i.category || 'General'))];

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.part_number && item.part_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: items.length,
    low: items.filter(i => i.stock_current > 0 && i.stock_current <= i.stock_min).length,
    critical: items.filter(i => i.stock_current === 0).length,
    totalValue: items.reduce((acc, item) => acc + (item.stock_current * (item.unit_price || 0)), 0)
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-slate-950 flex flex-col gap-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-900/20">
              <Box className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Inventario: {selectedInventoryName || 'Cargando...'}
              </h1>
              <p className="text-slate-400 text-sm">Gestión de stock, suministros y consumos de material.</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsReportModalOpen(true)}
            className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-6 py-3 rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <FileDown className="w-5 h-5 text-blue-500" /> Exportar PDF
          </button>

          <button 
            onClick={() => { setSelectedItem(null); setIsItemModalOpen(true); }}
            className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Nuevo Item
          </button>
        </div>
      </div>

      {/* Inventory Tabs / Selector */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/40 p-2 rounded-3xl border border-slate-800/80 backdrop-blur-md">
        {inventories.map((inv) => {
          const isActive = selectedInventoryId === inv.id;
          return (
            <button
              key={inv.id}
              onClick={() => {
                setSelectedInventoryId(inv.id);
                setSelectedInventoryName(inv.name);
                setCategoryFilter('All');
              }}
              className={`relative px-5 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap active:scale-95 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {inv.name}
            </button>
          );
        })}
        <button
          onClick={() => setIsNewInvModalOpen(true)}
          className="px-5 py-3 rounded-2xl font-bold text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 border border-dashed border-blue-500/20 hover:border-blue-500/40 transition-all flex items-center gap-1.5 active:scale-95 ml-auto"
        >
          <Plus className="w-4 h-4" /> Nuevo Almacén
        </button>
      </div>

      {/* Quick Stats Container */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Total Items', value: stats.total, icon: Package, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Stock Bajo', value: stats.low, icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-400/10' },
          { label: 'Crítico / Zero', value: stats.critical, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
          { label: 'Valor Total', value: `$${stats.totalValue.toLocaleString()}`, icon: Truck, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        ].map((s, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={s.label} 
            className="p-4 md:p-6 bg-slate-900/50 border border-slate-800 rounded-3xl"
          >
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-xl ${s.bg} ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
            <h3 className="text-lg md:text-2xl font-bold text-white mt-1">{s.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Main Controls Card */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, ubicación, código..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-600"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-1.5 overflow-x-auto scrollbar-hide">
              <Filter className="w-4 h-4 text-slate-500 shrink-0" />
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    categoryFilter === cat ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <button onClick={fetchInventory} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-400 transition-all">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table/List View */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-950/30 text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] border-b border-slate-800/50">
                <th className="px-6 py-5">Item Detalle</th>
                <th className="px-6 py-5">Ubicación</th>
                <th className="px-6 py-5 text-center">Stock / Límite</th>
                <th className="px-6 py-5">Precio / Gasto</th>
                <th className="px-6 py-5">Abasto Est.</th>
                <th className="px-6 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredItems.map((item) => {
                const isLow = item.stock_current > 0 && item.stock_current <= item.stock_min;
                const isCritical = item.stock_current === 0;

                return (
                  <tr key={item.id} className="group hover:bg-white/[0.02] transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div 
                          onClick={() => item.image_url && setSelectedImagePreview(item.image_url)}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all shadow-inner overflow-hidden relative group/img ${
                            item.image_url ? 'cursor-zoom-in border-slate-750 bg-slate-900 hover:border-blue-500/40' :
                            isCritical ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            isLow ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                            'bg-slate-800 text-blue-400 border-slate-700'
                          }`}
                          title={item.image_url ? "Ver foto en tamaño completo" : undefined}
                        >
                          {item.image_url ? (
                            <img 
                              src={item.image_url} 
                              alt={item.name} 
                              className="w-full h-full object-cover transition-transform duration-555 group-hover/img:scale-115"
                            />
                          ) : (
                            <Package className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-200 group-hover:text-white transition-colors">{item.name}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {item.part_number && (
                              <span className="text-[10px] text-slate-500 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{item.part_number}</span>
                            )}
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-slate-900/60 px-2 py-0.5 rounded">{item.unit || 'Piezas'}</span>
                            {item.category && (
                              <>
                                <span className="text-[10px] text-slate-600">•</span>
                                <span className="text-[10px] text-slate-500 italic">{item.category}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300 font-medium">{item.location || 'Sin Ubicación'}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">{item.provider || 'Genérico'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`px-4 py-1.5 rounded-full text-sm font-black border ${
                          isCritical ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                          isLow ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                          'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        }`}>
                          {item.stock_current.toLocaleString()} {item.stock_max ? `/ ${item.stock_max.toLocaleString()}` : ''}
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold">MIN: {item.stock_min}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.unit_price > 0 ? (
                        <>
                          <p className="text-sm text-white font-bold">${item.unit_price?.toFixed(2)}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">USD UNIT</p>
                        </>
                      ) : item.weekly_usage > 0 ? (
                        <>
                          <p className="text-sm text-slate-300 font-bold">{item.weekly_usage} {item.unit || 'Pz'}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Consumo Semanal</p>
                        </>
                      ) : (
                        <span className="text-slate-600 text-xs italic">Sin registrar</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {item.estimated_date ? (
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-300 font-semibold">{item.estimated_date}</span>
                          {item.estimated_duration !== null && (
                            <span className="text-[10px] text-slate-500 font-bold">Dura ~{item.estimated_duration} sem</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs italic">Estable</span>
                      )}
                      {item.extra_info && (
                        <span className="text-[9px] text-slate-450 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded mt-1 block w-max max-w-[150px] truncate" title={item.extra_info}>
                          {item.extra_info}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedItem(item); setIsHistoryModalOpen(true); }}
                          className="p-3 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-blue-400 rounded-xl transition-all shadow-sm"
                          title="Ver Historial"
                        >
                          <History className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => { setSelectedItem(item); setIsStockModalOpen(true); }}
                          className="p-3 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-emerald-400 rounded-xl transition-all shadow-sm"
                          title="Ajustar Stock"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => { setSelectedItem(item); setIsItemModalOpen(true); }}
                          className="p-3 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white rounded-xl transition-all shadow-sm"
                          title="Editar Detalle"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredItems.length === 0 && !loading && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-4">
              <Package className="w-16 h-16 opacity-10" />
              <p className="italic font-medium text-lg">No se encontraron items en esta categoría.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Inventory Modal */}
      <AnimatePresence>
        {isNewInvModalOpen && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-400" />
                  Nuevo Almacén / Inventario
                </h3>
                <button 
                  onClick={() => setIsNewInvModalOpen(false)}
                  className="p-2 hover:bg-slate-800 rounded-xl text-slate-400"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateInventory} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Nombre del Inventario</label>
                  <input
                    required
                    type="text"
                    value={newInvName}
                    onChange={e => setNewInvName(e.target.value)}
                    placeholder="Ej: Materiales de Oficina, Herramientas"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Descripción / Notas</label>
                  <textarea
                    value={newInvDesc}
                    onChange={e => setNewInvDesc(e.target.value)}
                    placeholder="Describe el propósito de este inventario..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 h-24 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsNewInvModalOpen(false)}
                    className="flex-1 py-3 bg-slate-850 hover:bg-slate-800 text-slate-350 rounded-xl font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingInv}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2"
                  >
                    {creatingInv ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><Save className="w-4 h-4" /> Guardar</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <InventoryModal 
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        item={selectedItem}
        onSuccess={fetchInventory}
        selectedInventoryId={selectedInventoryId}
      />
      
      <StockAdjustmentModal 
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        item={selectedItem}
        onSuccess={fetchInventory}
      />

      <InventoryHistoryModal 
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        item={selectedItem}
      />

      <InventoryReportModal 
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        items={items}
      />

      {/* Lightbox / Previsualizador de Imagen */}
      <AnimatePresence>
        {selectedImagePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImagePreview(null)}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-2 animate-none"
            >
              {/* Botón de cerrar */}
              <button 
                onClick={() => setSelectedImagePreview(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-slate-950/80 hover:bg-slate-900 rounded-full text-slate-400 hover:text-white transition-all shadow-lg border border-slate-800/50"
              >
                <X className="w-5 h-5" />
              </button>

              <img 
                src={selectedImagePreview} 
                className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-inner" 
                alt="Vista ampliada del artículo"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
