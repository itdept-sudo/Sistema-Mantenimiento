'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { ClipboardCheck, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function MyTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

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

  if (loading && tasks.length === 0) return (
    <div className="p-8 flex justify-center">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">Mis Tareas</h2>
        <p className="text-slate-400 mt-1">Órdenes de trabajo asignadas a tu cuenta.</p>
      </div>

      {tasks.length === 0 ? (
        <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-3xl flex flex-col items-center justify-center p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-4">
            <ClipboardCheck className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">¡Todo al día!</h3>
          <p className="text-slate-500">No tienes tareas pendientes asignadas en este momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <div key={task.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                  task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                  task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {task.priority}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">#{task.id.slice(0, 8)}</span>
              </div>

              <h4 className="text-lg font-bold text-white mb-1">{task.machine?.name}</h4>
              <p className="text-sm text-slate-400 line-clamp-2 mb-6">{task.description}</p>

              <div className="space-y-3">
                {task.status === 'open' && (
                  <button 
                    onClick={() => updateTaskStatus(task.id, 'in_progress')}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Clock className="w-4 h-4" /> Iniciar Reparación
                  </button>
                )}
                {task.status === 'in_progress' && (
                  <button 
                    onClick={() => updateTaskStatus(task.id, 'resolved')}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Marcar como Resuelta
                  </button>
                )}
                {task.status === 'resolved' && (
                  <div className="flex items-center justify-center gap-2 text-emerald-400 py-2.5 bg-emerald-400/10 rounded-xl text-sm font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Pendiente de Cierre (Admin)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
