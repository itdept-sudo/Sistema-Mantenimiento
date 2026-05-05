'use client';

import { useState } from 'react';
import { 
  MoreVertical, 
  Plus, 
  Search, 
  Filter,
  User,
  Clock,
  AlertCircle
} from 'lucide-react';

const initialOrders = [
  { id: 'WO-1024', machine: 'Gauntlet III - 04', status: 'open', priority: 'urgent', tech: 'Pendiente', desc: 'Fuga de aceite en manguera principal' },
  { id: 'WO-1025', machine: 'Omnibagger A', status: 'in_progress', priority: 'medium', tech: 'Juan Pérez', desc: 'Ajuste de sensores de proximidad' },
  { id: 'WO-1026', machine: 'Gauntlet III - 12', status: 'resolved', priority: 'high', tech: 'Carlos Ruiz', desc: 'Cambio de rodamiento' },
  { id: 'WO-1027', machine: 'Cafetera Industrial', status: 'closed', priority: 'low', tech: 'Juan Pérez', desc: 'Limpieza trimestral' },
];

const columns = [
  { id: 'open', name: 'Abiertas', color: 'bg-blue-500' },
  { id: 'in_progress', name: 'En Progreso', color: 'bg-orange-500' },
  { id: 'resolved', name: 'Resueltas', color: 'bg-emerald-500' },
  { id: 'closed', name: 'Cerradas', color: 'bg-slate-600' },
];

export default function KanbanBoard() {
  const [orders, setOrders] = useState(initialOrders);

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Órdenes de Soporte</h2>
          <p className="text-slate-400 mt-1">Gestión de actividades y reparaciones.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/40 flex items-center gap-2 transition-all active:scale-95">
          <Plus className="w-5 h-5" /> Nueva Orden
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar por ID, máquina o técnico..." 
            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <button className="px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-400 hover:text-white flex items-center gap-2">
          <Filter className="w-4 h-4" /> Filtros
        </button>
      </div>

      {/* Columns */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div key={column.id} className="flex flex-col gap-4 w-full min-w-[280px]">
            <div className="flex justify-between items-center px-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${column.color}`}></span>
                <h3 className="font-bold text-slate-300 text-sm uppercase tracking-wider">{column.name}</h3>
                <span className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                  {orders.filter(o => o.status === column.id).length}
                </span>
              </div>
              <button className="text-slate-600 hover:text-slate-400">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 bg-slate-900/30 border border-slate-800/50 rounded-2xl p-4 space-y-4">
              {orders.filter(o => o.status === column.id).map((order) => (
                <div 
                  key={order.id} 
                  className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded uppercase tracking-wider">
                      {order.id}
                    </span>
                    {order.priority === 'urgent' && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <h4 className="text-white font-bold mb-1">{order.machine}</h4>
                  <p className="text-slate-500 text-sm line-clamp-2 mb-4 leading-relaxed">
                    {order.desc}
                  </p>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                    <div className="flex items-center gap-2 text-slate-400">
                      <User className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">{order.tech}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[10px]">2h</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {orders.filter(o => o.status === column.id).length === 0 && (
                <div className="h-24 border-2 border-dashed border-slate-800 rounded-xl flex items-center justify-center text-slate-600 text-sm italic">
                  No hay órdenes
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
