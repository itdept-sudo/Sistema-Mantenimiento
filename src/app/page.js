'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
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
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState([
    { name: 'Órdenes Abiertas', value: '...', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { name: 'Urgentes', value: '...', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
    { name: 'Completadas (semana)', value: '...', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { name: 'Disponibilidad Planta', value: '...', icon: Activity, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [inventoryAlerts, setInventoryAlerts] = useState([]);
  const [techRanking, setTechRanking] = useState([]);
  const [rankingPeriod, setRankingPeriod] = useState('week'); // 'today', 'week', 'month', 'all'
  const [timeThresholds, setTimeThresholds] = useState({ warning: 2, critical: 4 });
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Redirección de seguridad para Técnicos y Empleados
  useEffect(() => {
    if (!authLoading && profile) {
      if (profile.role === 'technician') {
        router.push('/my-tasks');
      } else if (profile.role === 'employee' || profile.role === 'viewer') {
        router.push('/orders');
      }
    }
  }, [profile, authLoading, router]);

  const fetchTimeSettings = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'time_thresholds')
        .maybeSingle();
      if (data) setTimeThresholds(data.value);
    } catch (err) {
      console.warn("Thresholds table error:", err);
    }
  };

  const handleSaveThresholds = async (e) => {
    e.preventDefault();
    try {
      await supabase
        .from('system_settings')
        .upsert({ 
          key: 'time_thresholds', 
          value: timeThresholds, 
          updated_at: new Date().toISOString() 
        });
      setIsConfigOpen(false);
    } catch (err) {
      alert("Error al guardar umbrales.");
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Work Orders for Stats and Ranking
      let allOrders = [];
      try {
        const { data, error } = await supabase
          .from('work_orders')
          .select(`
            *, 
            profiles!technician_id(full_name),
            work_order_technicians(profiles(full_name))
          `);
        if (error) throw error;
        allOrders = data || [];
        console.log("Dashboard Orders Loaded:", allOrders.length);
      } catch (err) {
        console.error("Orders Fetch Error:", err);
      }

      // 2. Fetch Machines for Availability
      let allMachines = [];
      try {
        const { data, error } = await supabase.from('machines').select('status');
        if (error) throw error;
        allMachines = data || [];
      } catch (err) {
        console.error("Machines Fetch Error:", err);
      }
      
      // 3. Fetch Inventory for Alerts
      try {
        const { data, error } = await supabase
          .from('inventory')
          .select('name, stock_current, stock_min')
          .filter('stock_current', 'lte', 'stock_min')
          .order('stock_current', { ascending: true })
          .limit(3);
        if (error) throw error;
        if (data) setInventoryAlerts(data);
      } catch (err) {
        console.error("Inventory Fetch Error:", err);
      }

      // 4. Fetch Recent Activity
      try {
        const { data, error } = await supabase
          .from('work_orders')
          .select('id, description, status, created_at, machines(name), profiles!technician_id(full_name), reporter_name')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        if (data) {
          const formatted = data.map(act => ({
            id: act.id,
            tech: act.profiles?.full_name || act.reporter_name || 'Sistema',
            action: act.status === 'open' ? 'reportó falla' : act.status === 'in_progress' ? 'en reparación' : 'actualizó',
            machine: act.machines?.name || 'Máquina desconocida',
            time: new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date(act.created_at).toLocaleDateString(),
            raw_date: act.created_at,
            status: act.status
          }));
          setRecentActivity(formatted);
        }
      } catch (err) {
        console.error("Activity Fetch Error:", err);
      }

      // Update Stats
      const openOrders = allOrders.filter(o => o.status === 'open').length;
      const urgentOrders = allOrders.filter(o => o.priority === 'urgent' && (o.status !== 'closed' && o.status !== 'resolved')).length;
      
      const now = new Date();
      const oneWeekAgo = new Date(); oneWeekAgo.setDate(now.getDate() - 7);
      const weeklyCompleted = allOrders.filter(o => (o.status === 'closed' || o.status === 'resolved') && new Date(o.created_at) >= oneWeekAgo).length;

      const totalMachines = allMachines.length;
      const operatingMachines = allMachines.filter(m => m.status === 'operating' || m.status === 'operational').length;
      const availability = totalMachines > 0 ? ((operatingMachines / totalMachines) * 100).toFixed(1) : '100';

      setStats([
        { name: 'Órdenes Abiertas', value: openOrders.toString(), icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { name: 'Urgentes', value: urgentOrders.toString(), icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
        { name: 'Completadas (semana)', value: weeklyCompleted.toString(), icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        { name: 'Disponibilidad Planta', value: `${availability}%`, icon: Activity, color: 'text-purple-400', bg: 'bg-purple-400/10' },
      ]);

      // Calculate Tech Ranking
      let filteredForRanking = allOrders.filter(o => o.status === 'closed' || o.status === 'resolved');
      if (rankingPeriod !== 'all') {
        const limitDate = new Date();
        filteredForRanking = filteredForRanking.filter(o => {
          const completionDate = o.closed_at ? new Date(o.closed_at) : new Date(o.updated_at);
          
          if (rankingPeriod === 'today') {
            return completionDate.toDateString() === limitDate.toDateString();
          }
          if (rankingPeriod === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return completionDate >= weekAgo;
          }
          if (rankingPeriod === 'month') {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return completionDate >= monthAgo;
          }
          return true;
        });
      }

      const rankingMap = {};
      filteredForRanking.forEach(o => {
        // Obtenemos todos los técnicos asignados (nueva tabla)
        const teamTechs = o.work_order_technicians?.map(wt => wt.profiles?.full_name).filter(Boolean) || [];
        
        // Obtenemos el técnico legacy
        const legacyTech = o.profiles?.full_name;

        // Combinamos y quitamos duplicados
        let allTechNames = [...new Set([...teamTechs, legacyTech].filter(Boolean))];

        if (allTechNames.length === 0) {
          allTechNames = ['Sin asignar'];
        }

        allTechNames.forEach(techName => {
          rankingMap[techName] = (rankingMap[techName] || 0) + 1;
        });
      });

      const rankingArray = Object.entries(rankingMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      setTechRanking(rankingArray);

      // The activity and inventory states are already updated above in the try blocks.
      
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchTimeSettings();
      
      // Suscripción a cambios en la DB (Requiere habilitar Replication en Supabase)
      const channel = supabase.channel('dashboard-sync')
        .on('postgres_changes', { event: '*', table: 'work_orders' }, () => fetchDashboardData())
        .on('postgres_changes', { event: '*', table: 'machines' }, () => fetchDashboardData())
        .on('postgres_changes', { event: '*', table: 'inventory' }, () => fetchDashboardData())
        .on('postgres_changes', { event: '*', table: 'system_settings' }, () => fetchTimeSettings())
        .subscribe();

      // Fallback: Refrescar datos cada 60 segundos por si falla la suscripción
      const dataInterval = setInterval(() => {
        fetchDashboardData();
      }, 60000);

      // Timer: Actualizar el 'ahora' cada minuto para que los colores del SLA cambien solos
      const clockInterval = setInterval(() => {
        setNow(new Date());
      }, 60000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(dataInterval);
        clearInterval(clockInterval);
      };
    }
  }, [user, rankingPeriod]);

  const getSLAColor = (createdAt) => {
    const hours = (now - new Date(createdAt)) / (1000 * 60 * 60);
    if (hours >= timeThresholds.critical) return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (hours >= timeThresholds.warning) return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
    return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  };

  return (
    <div className="p-8 space-y-8">
      {/* Config Modal para Umbrales */}
      <AnimatePresence>
        {isConfigOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-4">Configurar Umbrales (Horas)</h3>
              <form onSubmit={handleSaveThresholds} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Advertencia (Amarillo)</label>
                  <input type="number" value={timeThresholds.warning} onChange={e => setTimeThresholds({...timeThresholds, warning: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-4 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Crítico (Rojo)</label>
                  <input type="number" value={timeThresholds.critical} onChange={e => setTimeThresholds({...timeThresholds, critical: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-4 text-white" />
                </div>
                <div className="flex gap-2 pt-4">
                  <button type="button" onClick={() => setIsConfigOpen(false)} className="flex-1 py-2 bg-slate-800 text-white rounded-xl font-bold">Cancelar</button>
                  <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold">Guardar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">Dashboard Overview</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live Sync</span>
            </div>
          </div>
          <p className="text-slate-400 mt-2 text-sm md:text-base">Monitoreo de mantenimiento y métricas operativas en tiempo real.</p>
        </div>
        <div className="flex gap-2 md:gap-3">
          <button onClick={() => setIsConfigOpen(true)} title="Configurar SLA" className="p-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors group">
            <Clock className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          </button>
          <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${loading ? 'bg-orange-500 animate-spin border-2 border-slate-800' : 'bg-emerald-500 animate-pulse'}`}></span>
            <span className="text-slate-300 font-mono text-xs">{loading ? 'SYNCING...' : 'REAL-TIME ACTIVE'}</span>
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
        {/* Monitoreo de Respuesta (SLA) */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Monitoreo de Respuesta (SLA)</h3>
            </div>
          </div>
          <div className="space-y-4">
            {recentActivity.filter(a => a.status === 'open' || a.status === 'in_progress').map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-white font-bold text-xs">
                    {item.machine.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{item.machine}</h4>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">{item.tech}</p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-lg border text-xs font-bold ${getSLAColor(item.raw_date)}`}>
                  {Math.floor((new Date() - new Date(item.raw_date)) / (1000 * 60 * 60))}h {Math.floor(((new Date() - new Date(item.raw_date)) / (1000 * 60)) % 60)}m abierto
                </div>
              </div>
            ))}
            {recentActivity.filter(a => a.status === 'open' || a.status === 'in_progress').length === 0 && (
              <p className="text-center py-10 text-slate-500 text-sm italic">No hay órdenes abiertas actualmente.</p>
            )}
          </div>
        </div>

        {/* Tech Ranking */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className="text-lg font-semibold text-white">Ranking</h3>
            </div>
            <select 
              value={rankingPeriod}
              onChange={(e) => setRankingPeriod(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold py-1 px-2 rounded-lg focus:outline-none focus:border-orange-500 uppercase tracking-tighter"
            >
              <option value="today">Hoy</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
              <option value="all">Todo</option>
            </select>
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

