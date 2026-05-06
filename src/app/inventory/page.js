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
  Truck
} from 'lucide-react';

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchInventory = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('name', { ascending: true });
    
    if (data) setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.part_number && item.part_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = {
    total: items.length,
    low: items.filter(i => i.stock_current > 0 && i.stock_current <= i.stock_min).length,
    critical: items.filter(i => i.stock_current === 0).length
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Inventario de Repuestos</h2>
          <p className="text-slate-400 mt-1">Control de stock y suministros en tiempo real.</p>
        </div>
        <div className="flex gap-4">
          <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 border border-slate-700 transition-colors">
            <Truck className="w-4 h-4" /> Proveedores
          </button>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/40 flex items-center gap-2 transition-all active:scale-95">
            <Plus className="w-5 h-5" /> Agregar Item
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Items</p>
          <h3 className="text-2xl font-bold text-white mt-2">{stats.total}</h3>
        </div>
        <div className="p-6 bg-orange-500/5 border border-orange-500/20 rounded-2xl">
          <p className="text-orange-400 text-xs font-bold uppercase tracking-wider">Stock Bajo</p>
          <h3 className="text-2xl font-bold text-white mt-2">{stats.low}</h3>
        </div>
        <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl">
          <p className="text-red-400 text-xs font-bold uppercase tracking-wider">Sin Stock / Crítico</p>
          <h3 className="text-2xl font-bold text-white mt-2">{stats.critical}</h3>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar por código o nombre..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={fetchInventory} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Stock</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ubicación</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Precio Unit.</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Proveedor</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredItems.map((item) => {
                  const isLow = item.stock_current > 0 && item.stock_current <= item.stock_min;
                  const isCritical = item.stock_current === 0;

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-colors ${
                            isCritical ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            isLow ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                            'bg-slate-800 text-blue-400 border-slate-700'
                          }`}>
                            <Package className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-200 group-hover:text-white transition-colors">{item.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{item.part_number || 'SIN-CODE'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-sm font-bold ${isCritical ? 'text-red-400' : isLow ? 'text-orange-400' : 'text-emerald-400'}`}>
                            {item.stock_current}
                          </span>
                          <span className="text-[10px] text-slate-500">Min: {item.stock_min}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400 font-medium">
                        {item.location || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300 font-bold">
                        ${item.unit_price?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {item.provider || 'Genérico'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-600 hover:text-white transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500 italic">
                      No se encontraron resultados en el inventario.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
