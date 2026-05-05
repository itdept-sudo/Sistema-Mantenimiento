'use client';

import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Activity,
  ArrowUpRight,
  User
} from 'lucide-react';

const stats = [
  { name: 'Órdenes Abiertas', value: '12', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { name: 'Urgentes', value: '3', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
  { name: 'Completadas (semana)', value: '45', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { name: 'Disponibilidad Planta', value: '94.2%', icon: Activity, color: 'text-purple-400', bg: 'bg-purple-400/10' },
];

const recentActivity = [
  { id: 1, type: 'status_change', machine: 'Gauntlet III - #04', tech: 'Juan Pérez', action: 'Inició reparación', time: 'hace 10 min' },
  { id: 2, type: 'order_closed', machine: 'Omnibagger A', tech: 'Carlos Ruiz', action: 'Orden cerrada (Engrase)', time: 'hace 45 min' },
  { id: 3, type: 'new_order', machine: 'Gauntlet III - #12', tech: 'Sistema', action: 'Alerta: Stock bajo en Rodamiento 4x', time: 'hace 2 horas' },
  { id: 4, type: 'status_change', machine: 'Compresor Central', tech: 'Juan Pérez', action: 'Mantenimiento preventivo completado', time: 'hace 4 horas' },
];

export default function Dashboard() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Dashboard General</h2>
          <p className="text-slate-400 mt-1">Bienvenido de nuevo, Encargado.</p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm font-medium flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Real-time Sync Active
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-slate-700 transition-colors group">
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
            </div>
            <div className="mt-4">
              <p className="text-slate-400 text-sm font-medium">{stat.name}</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">Actividad Reciente</h3>
            <button className="text-sm text-blue-400 hover:text-blue-300 font-medium">Ver todo</button>
          </div>
          <div className="space-y-6">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-start gap-4 p-3 hover:bg-white/5 rounded-xl transition-colors">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200">
                    <span className="font-bold text-white">{item.tech}</span> {item.action} en <span className="font-bold text-white">{item.machine}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory Alerts */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Alertas de Inventario</h3>
          <div className="space-y-4">
            {[
              { name: 'Rodamiento Gauntlet', stock: 2, min: 5 },
              { name: 'Aceite Industrial 20L', stock: 1, min: 3 },
              { name: 'Correa dentada XL', stock: 0, min: 2 },
            ].map((item) => (
              <div key={item.name} className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-slate-200">{item.name}</p>
                  <span className="px-2 py-1 bg-red-500/20 text-red-400 text-[10px] font-bold rounded uppercase">Crítico</span>
                </div>
                <div className="mt-3 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-red-500 h-full transition-all duration-500" 
                    style={{ width: `${(item.stock / item.min) * 100}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Stock: {item.stock} / Min: {item.min}</p>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors">
            Gestionar Stock
          </button>
        </div>
      </div>
    </div>
  );
}
