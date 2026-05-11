'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { 
  MoreVertical, 
  Plus, 
  Search, 
  Filter,
  User,
  Clock,
  AlertCircle
} from 'lucide-react';
import OrderModal from './OrderModal';
import ScheduleModal from './ScheduleModal';
import { Calendar as CalendarIcon } from 'lucide-react';

const columns = [
  { id: 'open', name: 'Abiertas', color: 'bg-blue-500' },
  { id: 'in_progress', name: 'En Progreso', color: 'bg-orange-500' },
  { id: 'resolved', name: 'Resueltas', color: 'bg-emerald-500' },
  { id: 'closed', name: 'Cerradas', color: 'bg-slate-600' },
];

export default function KanbanBoard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week', 'month'

  const fetchMachines = async () => {
    const { data } = await supabase.from('machines').select('id, name');
    if (data) setMachines(data);
  };

  const checkAndGenerateSchedules = async () => {
    if (!supabase) return;
    
    try {
      const now = new Date().toISOString();
      const { data: pendingSchedules } = await supabase
        .from('maintenance_schedules')
        .select('*')
        .eq('is_active', true)
        .lte('next_due', now);

      if (pendingSchedules && pendingSchedules.length > 0) {
        console.log(`Procesando ${pendingSchedules.length} mantenimientos preventivos...`);
        
        for (const schedule of pendingSchedules) {
          const newOrders = (schedule.machine_ids || []).map(mId => ({
            machine_id: mId,
            technician_id: schedule.technician_id,
            description: `[PREVENTIVO] ${schedule.title}: ${schedule.task_description}`,
            priority: 'medium',
            maintenance_type: 'preventive',
            status: 'open'
          }));

          if (newOrders.length > 0) {
            const { error: orderError } = await supabase
              .from('work_orders')
              .insert(newOrders);

            if (!orderError) {
              const nextDate = new Date(schedule.next_due);
              nextDate.setDate(nextDate.getDate() + schedule.interval_days);

              await supabase
                .from('maintenance_schedules')
                .update({ 
                  last_performed: now,
                  next_due: nextDate.toISOString()
                })
                .eq('id', schedule.id);
            } else {
              console.error("Error creating scheduled orders:", orderError);
            }
          }
        }
        fetchOrders();
      }
    } catch (error) {
      console.error("Error al procesar preventivos:", error);
    }
  };

  const fetchOrders = async () => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const { data } = await supabase
        .from('work_orders')
        .select(`
          *,
          machines (name),
          profiles (full_name)
        `)
        .order('created_at', { ascending: false });
      
      if (data) setOrders(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchMachines();
      checkAndGenerateSchedules(); // Revisar preventivos al entrar

      const channel = supabase
        .channel('orders-updates')
        .on('postgres_changes', { event: '*', table: 'work_orders' }, () => fetchOrders())
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
  }, [user]);

  const handleUpdateStatus = async (orderId, newStatus, machineId) => {
    const { error } = await supabase
      .from('work_orders')
      .update({ status: newStatus })
      .eq('id', orderId);
    
    if (!error && machineId) {
      let newMachineStatus = 'operational';
      if (newStatus === 'in_progress') newMachineStatus = 'maintenance';
      if (newStatus === 'open') newMachineStatus = 'failure';

      await supabase
        .from('machines')
        .update({ status: newMachineStatus })
        .eq('id', machineId);
    }

    if (error) alert("Error al actualizar: " + error.message);
    else fetchOrders();
  };

  // Lógica de filtrado reactivo
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      String(order.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.machines?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.description?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (dateFilter === 'all') return true;

    const orderDate = new Date(order.created_at);
    const now = new Date();
    
    if (dateFilter === 'today') {
      return orderDate.toDateString() === now.toDateString();
    }
    
    if (dateFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return orderDate >= weekAgo;
    }
    
    if (dateFilter === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(now.getMonth() - 1);
      return orderDate >= monthAgo;
    }

    return true;
  });

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Órdenes de Soporte</h2>
          <p className="text-slate-400 mt-1">Gestión de actividades y reparaciones en tiempo real.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsOrderModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" /> Nueva Orden
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar por ID, máquina o técnico..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        
        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800">
          {[
            { id: 'all', label: 'Todo' },
            { id: 'today', label: 'Hoy' },
            { id: 'week', label: 'Semana' },
            { id: 'month', label: 'Mes' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                dateFilter === f.id ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div key={column.id} className="flex flex-col gap-4 w-full min-w-[280px]">
            <div className="flex justify-between items-center px-2">
              <div className="flex items-center gap-2 text-slate-300">
                <span className={`w-2 h-2 rounded-full ${column.color}`}></span>
                <h3 className="font-bold text-sm uppercase tracking-wider">{column.name}</h3>
                <span className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                  {filteredOrders.filter(o => o.status === column.id).length}
                </span>
              </div>
            </div>

            <div className="flex-1 bg-slate-900/30 border border-slate-800/50 rounded-2xl p-4 space-y-4">
              {filteredOrders.filter(o => o.status === column.id).map((order) => (
                <div key={order.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded uppercase tracking-wider">
                      ID: {String(order.id).substring(0, 5)}
                    </span>
                    {order.priority === 'urgent' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  </div>
                  <h4 className="text-white font-bold mb-1">{order.machines?.name || 'Máquina'}</h4>
                  {order.reporter_name && (
                    <div className="text-[10px] text-emerald-400 mb-1 font-medium bg-emerald-500/10 w-fit px-1.5 py-0.5 rounded">
                      Operador: {order.reporter_name} ({order.reporter_emp_num})
                    </div>
                  )}
                  <p className="text-slate-500 text-sm line-clamp-2 mb-4 leading-relaxed">{order.description}</p>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                    <div className="flex items-center gap-2 text-slate-400">
                      <User className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">{order.profiles?.full_name || 'Sin asignar'}</span>
                    </div>
                    <div className="text-slate-500 text-[10px]">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-1 flex-wrap">
                    {columns.filter(c => c.id !== order.status).map(c => (
                      <button
                        key={c.id}
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order.id, c.id, order.machine_id); }}
                        className="text-[8px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded transition-colors"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <OrderModal 
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        machines={machines}
        onSuccess={() => fetchOrders()}
      />

      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        machines={machines}
        onSuccess={() => {
          checkAndGenerateSchedules();
          fetchOrders();
        }}
      />
    </div>
  );
}
