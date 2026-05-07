'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { ClipboardCheck, Clock, CheckCircle, Eye, History, LayoutList, RotateCcw } from 'lucide-react';
import TaskDetailModal from '@/components/orders/TaskDetailModal';

export default function MyTasksPage() {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'supervisor';
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // 'active' o 'history'

  const fetchMyTasks = async (forceAll = false) => {
    if (!supabase) return;
    
    let currentUserId = user?.id;
    if (!currentUserId) {
      const { data: { session } } = await supabase.auth.getSession();
      currentUserId = session?.user?.id;
    }

    if (!currentUserId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      let query = supabase.from('work_orders').select(`*, machine:machines(name)`);
      
      // Si no es un escaneo forzado, filtramos por el técnico actual
      if (!forceAll) {
        query = query.eq('technician_id', currentUserId);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setTasks(data);
        if (forceAll) alert(`Escaneo completado. Se encontraron ${data.length} órdenes en total en la base de datos.`);
      }
    } catch (error) {
      console.error("MyTasks Error:", error);
      alert("Error de conexión: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
    
    // Suscribirse a cambios en TIEMPO REAL para que aparezcan las órdenes sin refrescar
    const channel = supabase
      .channel('technician-orders')
      .on('postgres_changes', 
          { event: '*', table: 'work_orders', filter: `technician_id=eq.${user?.id}` }, 
          () => fetchMyTasks())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const updateTaskStatus = async (taskId, newStatus, machineId) => {
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', taskId);

      if (!error && machineId) {
        let newMachineStatus = 'operational';
        if (newStatus === 'in_progress') newMachineStatus = 'maintenance';
        if (newStatus === 'open') newMachineStatus = 'failure';
        if (newStatus === 'resolved' || newStatus === 'closed') newMachineStatus = 'operational';

        await supabase
          .from('machines')
          .update({ status: newMachineStatus })
          .eq('id', machineId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      fetchMyTasks();
    }
  };

  const activeTasks = tasks.filter(t => t.status !== 'closed');
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
          {/* DEBUG INFO - Solo para diagnóstico */}
          <div className="mt-2 flex items-center gap-4">
            <div className="text-[10px] font-mono text-slate-600 bg-slate-900 px-2 py-1 rounded w-fit">
              DEBUG: ID {user?.id || 'No Detectado'} | Rol: {profile?.role || 'Buscando...'}
            </div>
            <button 
              onClick={() => fetchMyTasks(true)}
              className="text-[10px] font-bold text-blue-500 hover:text-blue-400 bg-blue-500/10 px-2 py-1 rounded transition-all border border-blue-500/20"
            >
              Forzar Escaneo Base de Datos
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 h-fit">
          <button 
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'active' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <LayoutList className="w-4 h-4" /> Activas ({activeTasks.length})
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
        {(activeTab === 'active' ? activeTasks : historyTasks).length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-4">
              <ClipboardCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">
              {activeTab === 'active' ? '¡Todo al día!' : 'Sin historial'}
            </h3>
            <p className="text-slate-500 max-w-sm">
              {activeTab === 'active' 
                ? 'Si tienes órdenes asignadas pero no aparecen aquí, verifica que tu ID de usuario coincida con la asignación en el panel de Admin.' 
                : 'Aún no has cerrado ninguna orden.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(activeTab === 'active' ? activeTasks : historyTasks).map((task) => (
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
