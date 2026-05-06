'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { ClipboardCheck, Clock, AlertCircle, CheckCircle2, Eye, CheckCircle } from 'lucide-react';
import TaskDetailModal from '@/components/orders/TaskDetailModal';

export default function MyTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchMyTasks = async () => {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    
    setLoading(true);
    try {
      const { data } = await supabase
        .from('work_orders')
        .select(`*, machine:machines(name)`)
        .eq('technician_id', session.user.id)
        .order('created_at', { ascending: false });

      if (data) setTasks(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
  }, [user]);

  const updateTaskStatus = async (taskId, newStatus, machineId) => {
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (!error && machineId) {
        let newMachineStatus = 'operational';
        if (newStatus === 'in_progress') newMachineStatus = 'maintenance';
        if (newStatus === 'open') newMachineStatus = 'failure';
        // Si se cierra o resuelve, vuelve a operativa (verde)
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

  if (loading && tasks.length === 0) return (
    <div className="p-8 flex justify-center">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Mis Tareas</h2>
          <p className="text-slate-400 mt-1">Gestión de órdenes asignadas.</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-3xl flex flex-col items-center justify-center p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-4">
            <ClipboardCheck className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">¡Sin pendientes!</h3>
          <p className="text-slate-500">No tienes órdenes de trabajo activas en este momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.filter(t => t.status !== 'closed').map((task) => (
            <div key={task.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all shadow-xl flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                  task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                  task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {task.priority}
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
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                  >
                    <Clock className="w-4 h-4" /> Iniciar Reparación
                  </button>
                )}
                
                {(task.status === 'in_progress' || task.status === 'resolved') && (
                  <button 
                    onClick={() => {
                      if (confirm("¿Estás seguro de cerrar esta orden definitivamente?")) {
                        updateTaskStatus(task.id, 'closed', task.machine_id);
                      }
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                  >
                    <CheckCircle className="w-4 h-4" /> Finalizar y Cerrar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskDetailModal 
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        task={selectedTask}
      />
    </div>
  );
}
