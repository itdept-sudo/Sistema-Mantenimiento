'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { ClipboardCheck, Clock, CheckCircle, Eye, History, LayoutList, RotateCcw } from 'lucide-react';
import TaskDetailModal from '@/components/orders/TaskDetailModal';
import { checkAndGenerateSchedules } from '@/lib/scheduleWorker';

export default function MyTasksPage() {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'supervisor';
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('corrective'); // 'corrective', 'preventive' o 'history'

  const fetchMyTasks = async () => {
    if (!supabase || !user?.id) return;
    
    setLoading(true);
    try {
      checkAndGenerateSchedules(); // Correr en segundo plano sin bloquear
      
      // 1. Obtener IDs de las órdenes donde el usuario está asignado en la nueva tabla
      const { data: teamAssignments } = await supabase
        .from('work_order_technicians')
        .select('work_order_id')
        .eq('technician_id', user.id);
      
      const teamOrderIds = teamAssignments?.map(a => a.work_order_id) || [];

      // 2. Obtener tareas (legacy o equipo)
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *, 
          machine:machines(name)
        `)
        .or(`technician_id.eq.${user.id},id.in.(${teamOrderIds.length > 0 ? teamOrderIds.join(',') : '-1'})`)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setTasks(data);
      }
    } catch (error) {
      console.error("MyTasks Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchMyTasks();
    
    // Suscribirse a cambios en TIEMPO REAL
    const channel = supabase
      .channel('technician-orders')
      .on('postgres_changes', 
          { event: '*', table: 'work_orders' }, 
          () => fetchMyTasks())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const updateTaskStatus = async (taskId, newStatus, machineId) => {
    try {
      // 1. Actualizar la orden
      const { error: orderError } = await supabase
        .from('work_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', taskId);

      if (orderError) throw orderError;

      // 2. Actualizar el LED de la máquina
      if (machineId) {
        let newMachineStatus = 'operational';
        if (newStatus === 'in_progress') newMachineStatus = 'maintenance';
        if (newStatus === 'open') newMachineStatus = 'failure';
        
        const { error: machineError } = await supabase
          .from('machines')
          .update({ status: newMachineStatus })
          .eq('id', machineId);
        
        if (machineError) throw machineError;
      }
    } catch (error) {
      console.error("Error al actualizar tarea:", error);
      alert("No se pudo actualizar el estado. Por favor, intenta de nuevo.");
    } finally {
      fetchMyTasks();
    }
  };

  const activeCorrective = tasks.filter(t => t.status !== 'closed' && (t.maintenance_type === 'corrective' || !t.maintenance_type));
  const activePreventive = tasks.filter(t => t.status !== 'closed' && t.maintenance_type === 'preventive');
  const historyTasks = tasks.filter(t => t.status === 'closed');

  if (loading && tasks.length === 0) return (
    <div className="p-8 flex justify-center">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Mis Tareas</h2>
          <p className="text-slate-400 mt-1">Gestión de órdenes asignadas.</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 h-fit">
          <button 
            onClick={() => setActiveTab('corrective')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'corrective' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <LayoutList className="w-4 h-4" /> Soporte ({activeCorrective.length})
          </button>
          <button 
            onClick={() => setActiveTab('preventive')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'preventive' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" /> Preventivos ({activePreventive.length})
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'history' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <History className="w-4 h-4" /> Historial ({historyTasks.length})
          </button>
        </div>
      </div>

      <div className="flex-1">
        {(activeTab === 'corrective' ? activeCorrective : activeTab === 'preventive' ? activePreventive : historyTasks).length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-4">
              <ClipboardCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">
              {activeTab === 'corrective' || activeTab === 'preventive' ? '¡Todo al día!' : 'Sin historial'}
            </h3>
            <p className="text-slate-500 max-w-sm">
              {activeTab === 'corrective' || activeTab === 'preventive' 
                ? 'Si tienes órdenes asignadas pero no aparecen aquí, verifica que tu ID de usuario coincida con la asignación en el panel de Admin.' 
                : 'Aún no has cerrado ninguna orden.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(activeTab === 'corrective' ? activeCorrective : activeTab === 'preventive' ? activePreventive : historyTasks).map((task) => (
              <div key={task.id} className={`bg-slate-900 border border-slate-800 rounded-2xl p-6 transition-all shadow-xl flex flex-col ${
                task.status === 'closed' ? 'opacity-75 grayscale-[0.5]' : 'hover:border-slate-700'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                    task.status === 'closed' ? 'bg-slate-800 text-slate-500' :
                    task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                    task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {task.status === 'closed' ? 'Cerrada' : task.priority}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">ID: {String(task.id).substring(0, 8)}</span>
                </div>

                <h4 className="text-lg font-bold text-white mb-1">{task.machine?.name || 'Máquina'}</h4>
                <p className="text-sm text-slate-400 line-clamp-2 mb-6 flex-1">{task.description}</p>

                <div className="space-y-2 mt-auto">
                  <button 
                    onClick={() => { setSelectedTask(task); setIsDetailModalOpen(true); }}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 mb-2"
                  >
                    <Eye className="w-3.5 h-3.5" /> Ver Detalles
                  </button>

                  {task.status === 'open' && (
                    <button 
                      onClick={() => updateTaskStatus(task.id, 'in_progress', task.machine_id)}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Clock className="w-4 h-4" /> Iniciar Reparación
                    </button>
                  )}
                  
                  {(task.status === 'in_progress' || task.status === 'resolved') && (
                    <button 
                      onClick={() => {
                        if (confirm("¿Confirmas el cierre definitivo de esta orden?")) {
                          updateTaskStatus(task.id, 'closed', task.machine_id);
                        }
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" /> Finalizar y Cerrar
                    </button>
                  )}

                  {task.status === 'closed' && isAdmin && (
                    <button 
                      onClick={() => {
                        if (confirm("¿Deseas reabrir esta orden para mantenimiento adicional?")) {
                          updateTaskStatus(task.id, 'open', task.machine_id);
                        }
                      }}
                      className="w-full py-2.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 border border-orange-500/20"
                    >
                      <RotateCcw className="w-4 h-4" /> Reabrir Orden (Admin)
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TaskDetailModal 
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        task={selectedTask}
      />
    </div>
  );
}
