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
  FileDown
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
  
  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchInventory = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      if (data) setItems(data);
    } catch (err) {
      console.error("Error fetching inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();

    // Real-time subscription
    const channel = supabase.channel('inventory-sync')
      .on('postgres_changes', { event: '*', table: 'inventory' }, () => fetchInventory())
      .on('postgres_changes', { event: '*', table: 'inventory_logs' }, () => fetchInventory())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const categories = ['All', ...new Set(items.map(i => i.category || 'General'))];

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.part_number && item.part_number.toLowerCase().includes(searchTerm.toLowerCase()));
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
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Inventario de Repuestos</h1>
              <p className="text-slate-400 text-sm">Gestión de stock, suministros y costos operativos.</p>
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
              placeholder="Buscar por código, nombre..." 
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
                <th className="px-6 py-5 text-center">Stock</th>
                <th className="px-6 py-5">Precio</th>
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
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all shadow-inner ${
                          isCritical ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          isLow ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                          'bg-slate-800 text-blue-400 border-slate-700'
                        }`}>
                          <Package className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-200 group-hover:text-white transition-colors">{item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-500 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{item.part_number || 'N/C'}</span>
                            <span className="text-[10px] text-slate-600">•</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{item.category || 'General'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300 font-medium">{item.location || 'N/A'}</span>
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
                          {item.stock_current}
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold">MIN: {item.stock_min}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-white font-bold">${item.unit_price?.toFixed(2)}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">USD UNIT</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedItem(item); setIsHistoryModalOpen(true); }}
                          className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-blue-400 rounded-xl transition-all shadow-sm"
                          title="Ver Historial"
                        >
                          <History className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => { setSelectedItem(item); setIsStockModalOpen(true); }}
                          className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-emerald-400 rounded-xl transition-all shadow-sm"
                          title="Ajustar Stock"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => { setSelectedItem(item); setIsItemModalOpen(true); }}
                          className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all shadow-sm"
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

      {/* Modals */}
      <InventoryModal 
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        item={selectedItem}
        onSuccess={fetchInventory}
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
    </div>
  );
}
