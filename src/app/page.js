'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Activity,
  ArrowUpRight,
  User,
  PackageSearch
} from 'lucide-react';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState([
    { name: 'Órdenes Abiertas', value: '...', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { name: 'Urgentes', value: '...', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
    { name: 'Completadas (semana)', value: '...', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { name: 'Disponibilidad Planta', value: '...', icon: Activity, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [inventoryAlerts, setInventoryAlerts] = useState([]);
  const [techRanking, setTechRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Work Orders for Stats and Ranking
      const { data: orders } = await supabase
        .from('work_orders')
        .select('*, profiles:technician_id(full_name)');
      
      // 2. Fetch Machines for Availability
      const { data: machines } = await supabase.from('machines').select('status');
      
      // 3. Fetch Inventory for Alerts
      const { data: inventory } = await supabase
        .from('inventory')
        .select('name, stock_current, stock_min')
        .filter('stock_current', 'lte', 'stock_min')
        .order('stock_current', { ascending: true })
        .limit(3);

      // 4. Fetch Recent Activity
      const { data: activities } = await supabase
        .from('work_orders')
        .select('id, description, status, created_at, machines(name), profiles:technician_id(full_name), reporter_name')
        .order('created_at', { ascending: false })
        .limit(5);

      if (orders && machines) {
        const openOrders = orders.filter(o => o.status === 'open').length;
        const urgentOrders = orders.filter(o => o.priority === 'urgent' && o.status !== 'closed').length;
        
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const weeklyCompleted = orders.filter(o => (o.status === 'closed' || o.status === 'resolved') && new Date(o.created_at) >= oneWeekAgo).length;

        const totalMachines = machines.length;
        const operatingMachines = machines.filter(m => m.status === 'operating' || m.status === 'operational').length;
        const availability = totalMachines > 0 ? ((operatingMachines / totalMachines) * 100).toFixed(1) : '100';

        setStats([
          { name: 'Órdenes Abiertas', value: openOrders.toString(), icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { name: 'Urgentes', value: urgentOrders.toString(), icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
          { name: 'Completadas (semana)', value: weeklyCompleted.toString(), icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
          { name: 'Disponibilidad Planta', value: `${availability}%`, icon: Activity, color: 'text-purple-400', bg: 'bg-purple-400/10' },
        ]);

        // Calculate Tech Ranking
        const closedOrders = orders.filter(o => o.status === 'closed' || o.status === 'resolved');
        const rankingMap = {};
        closedOrders.forEach(o => {
          const techName = o.profiles?.full_name || 'Sin nombre';
          if (o.technician_id) {
            rankingMap[techName] = (rankingMap[techName] || 0) + 1;
          }
        });

        const rankingArray = Object.entries(rankingMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        setTechRanking(rankingArray);
      }

      if (activities) {
        const formatted = activities.map(act => ({
          id: act.id,
          tech: act.profiles?.full_name || act.reporter_name || 'Sistema',
          action: act.status === 'open' ? 'reportó falla en' : act.status === 'in_progress' ? 'inició reparación en' : 'actualizó',
          machine: act.machines?.name || 'Máquina desconocida',
          time: new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date(act.created_at).toLocaleDateString()
        }));
        setRecentActivity(formatted);
      }

      if (inventory) {
        setInventoryAlerts(inventory);
      }

    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      
      const channel = supabase.channel('dashboard-sync')
        .on('postgres_changes', { event: '*', table: 'work_orders' }, () => fetchDashboardData())
        .on('postgres_changes', { event: '*', table: 'machines' }, () => fetchDashboardData())
        .on('postgres_changes', { event: '*', table: 'inventory' }, () => fetchDashboardData())
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
  }, [user]);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Dashboard General</h2>
          <p className="text-slate-400 mt-1">Bienvenido de nuevo, {profile?.full_name || 'Encargado'}.</p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm font-medium flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full animate-pulse ${loading ? 'bg-orange-500' : 'bg-emerald-500'}`}></span>
            {loading ? 'Sincronizando...' : 'Real-time Sync Active'}
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
            <button 
              onClick={() => window.location.href = '/orders'}
              className="text-sm text-blue-400 hover:text-blue-300 font-medium"
            >
              Ver Kanban
            </button>
          </div>
          <div className="space-y-6">
            {recentActivity.length > 0 ? (
              recentActivity.map((item) => (
                <div key={item.id} className="flex items-start gap-4 p-3 hover:bg-white/5 rounded-xl transition-colors">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200">
                      <span className="font-bold text-white">{item.tech}</span> {item.action} <span className="font-bold text-white">{item.machine}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{item.date} a las {item.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-center py-10">Sin actividad reciente registrada.</p>
            )}
          </div>
        </div>

        {/* Tech Ranking */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold text-white">Ranking de Técnicos</h3>
          </div>
          <div className="flex-1 space-y-6">
            {techRanking.length > 0 ? (
              techRanking.map((tech, index) => (
                <div key={tech.name} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <p className="text-sm font-medium text-slate-200 flex items-center gap-2">
                      <span className="text-[10px] w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-400">
                        {index + 1}
                      </span>
                      {tech.name}
                    </p>
                    <span className="text-xs font-bold text-orange-400">{tech.count} resueltas</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-orange-600 to-orange-400 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${(tech.count / (techRanking[0]?.count || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 opacity-30">
                <User className="w-12 h-12 mb-2" />
                <p className="text-sm">Sin datos de resolución</p>
              </div>
            )}
          </div>
        </div>

        {/* Inventory Alerts */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 lg:col-span-3">
          <div className="flex items-center gap-2 mb-6">
            <PackageSearch className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Alertas de Inventario Crítico</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {inventoryAlerts.length > 0 ? (
              inventoryAlerts.map((item) => (
                <div key={item.name} className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-slate-200">{item.name}</p>
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-[10px] font-bold rounded uppercase">Crítico</span>
                  </div>
                  <div className="mt-3 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-red-500 h-full transition-all duration-500" 
                      style={{ width: `${Math.max(5, (item.stock_current / (item.stock_min || 1)) * 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">Stock: {item.stock_current} / Min: {item.stock_min}</p>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-20" />
                <p className="text-slate-500 text-xs">Inventario saludable</p>
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end">
            <button 
              onClick={() => window.location.href = '/inventory'}
              className="py-3 px-8 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Gestionar Stock
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

