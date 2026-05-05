'use client';

import { 
  Package, 
  Search, 
  Plus, 
  ArrowUpDown, 
  MoreHorizontal,
  AlertCircle,
  Truck
} from 'lucide-react';

const inventoryItems = [
  { id: 1, code: 'SKU-8821', name: 'Rodamiento Gauntlet 4x', stock: 2, min: 5, unit: 'pza', price: '$450.00', status: 'critical' },
  { id: 2, code: 'SKU-1022', name: 'Aceite Industrial SAE 40', stock: 12, min: 10, unit: 'galón', price: '$1,200.00', status: 'ok' },
  { id: 3, code: 'SKU-0941', name: 'Correa Dentada XL-200', stock: 1, min: 3, unit: 'pza', price: '$320.00', status: 'low' },
  { id: 4, code: 'SKU-5521', name: 'Sensor Proximidad M12', stock: 8, min: 5, unit: 'pza', price: '$890.00', status: 'ok' },
  { id: 5, code: 'SKU-3321', name: 'Filtro de Aire Compresor', stock: 4, min: 4, unit: 'pza', price: '$210.00', status: 'low' },
];

export default function InventoryPage() {
  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Inventario de Repuestos</h2>
          <p className="text-slate-400 mt-1">Control de stock y suministros.</p>
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
          <h3 className="text-2xl font-bold text-white mt-2">1,240</h3>
        </div>
        <div className="p-6 bg-orange-500/5 border border-orange-500/20 rounded-2xl">
          <p className="text-orange-400 text-xs font-bold uppercase tracking-wider">Stock Bajo</p>
          <h3 className="text-2xl font-bold text-white mt-2">18</h3>
        </div>
        <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl">
          <p className="text-red-400 text-xs font-bold uppercase tracking-wider">Sin Stock / Crítico</p>
          <h3 className="text-2xl font-bold text-white mt-2">5</h3>
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
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Código</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Stock</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Precio Unit.</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {inventoryItems.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400 border border-slate-700">
                        <Package className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-slate-200 group-hover:text-white transition-colors">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-mono">{item.code}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      item.status === 'critical' ? 'bg-red-500/20 text-red-400' :
                      item.status === 'low' ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {item.status === 'critical' && <AlertCircle className="w-3 h-3" />}
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`text-sm font-bold ${item.stock <= item.min ? 'text-orange-400' : 'text-white'}`}>
                        {item.stock} {item.unit}
                      </span>
                      <span className="text-[10px] text-slate-500">Min: {item.min}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400 font-medium">{item.price}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-600 hover:text-white transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
