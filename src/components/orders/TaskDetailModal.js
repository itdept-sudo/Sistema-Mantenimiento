'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { X, Calendar, User, Tag, AlertCircle, CheckCircle2, UserPlus, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TaskDetailModal({ isOpen, onClose, task, onSuccess }) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'manager' || profile?.role === 'admin' || profile?.role === 'supervisor';
  
  const [technicians, setTechnicians] = useState([]);
  const [assignedTechs, setAssignedTechs] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchAssignedTechs = async () => {
    const { data } = await supabase
      .from('work_order_technicians')
      .select('profiles(id, full_name)')
      .eq('work_order_id', task.id);
    if (data) setAssignedTechs(data.map(d => d.profiles));
  };

  useEffect(() => {
    if (isOpen) {
      fetchAssignedTechs();
      if (isAdmin) {
        const fetchTechnicians = async () => {
          // Fetch technicians
          const { data: techs } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'technician');
          
          if (techs) {
            // Fetch active counts for all technicians in one go
            const { data: counts } = await supabase
              .from('work_orders')
              .select('technician_id')
              .not('status', 'in', '("closed","resolved")');
            
            const techWithCounts = techs.map(t => {
              const activeCount = counts?.filter(c => c.technician_id === t.id).length || 0;
              return { ...t, activeCount };
            });

            setTechnicians(techWithCounts);
          }
        };
        fetchTechnicians();
      }
    }
  }, [isOpen, isAdmin, task?.id]);

  if (!isOpen || !task) return null;

  const handleAddTech = async (techId) => {
    if (!techId || assignedTechs.find(t => t.id === techId)) return;
    setIsAssigning(true);
    const { error } = await supabase
      .from('work_order_technicians')
      .insert({ work_order_id: task.id, technician_id: techId });
    
    if (error) {
      alert("Error al asignar: " + error.message);
    } else {
      fetchAssignedTechs();
      onSuccess?.();
    }
    setIsAssigning(false);
  };

  const handleRemoveTech = async (techId) => {
    setIsAssigning(true);
    const { error } = await supabase
      .from('work_order_technicians')
      .delete()
      .eq('work_order_id', task.id)
      .eq('technician_id', techId);
    
    if (error) {
      alert("Error al desasignar: " + error.message);
    } else {
      fetchAssignedTechs();
      onSuccess?.();
    }
    setIsAssigning(false);
  };

  const statusColors = {
    open: 'bg-blue-500/20 text-blue-400',
    in_progress: 'bg-orange-500/20 text-orange-400',
    resolved: 'bg-emerald-500/20 text-emerald-400',
    closed: 'bg-slate-500/20 text-slate-400',
  };

  const priorityColors = {
    low: 'bg-slate-500/20 text-slate-400',
    medium: 'bg-blue-500/20 text-blue-400',
    high: 'bg-orange-500/20 text-orange-400',
    urgent: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusColors[task.status]}`}>
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Detalles de Orden</h3>
              <p className="text-xs text-slate-500">ID: {task.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Tag className="w-3 h-3" /> Máquina
              </span>
              <p className="text-white font-bold text-lg">{task.machines?.name || 'N/A'}</p>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 justify-end">
                <Calendar className="w-3 h-3" /> Fecha Reporte
              </span>
              <p className="text-white text-sm">{new Date(task.created_at).toLocaleDateString()} {new Date(task.created_at).toLocaleTimeString()}</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tighter ${priorityColors[task.priority]}`}>
              Prioridad: {task.priority}
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-bold uppercase tracking-tighter">
              Tipo: {task.maintenance_type}
            </div>
          </div>

          {/* Sección de Asignación Múltiple (Solo para Admins/Managers) */}
          <div className="bg-blue-600/5 border border-blue-600/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-blue-400">
              <UserPlus className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-widest">Técnicos Asignados</h4>
            </div>
            
            {/* Lista de técnicos actualmente asignados */}
            <div className="flex flex-wrap gap-2">
              {assignedTechs.map(tech => (
                <div key={tech.id} className="flex items-center gap-2 bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-xl border border-blue-500/30 text-xs font-bold">
                  {tech.full_name}
                  {isAdmin && (
                    <button 
                      onClick={() => handleRemoveTech(tech.id)}
                      className="hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              {assignedTechs.length === 0 && (
                <p className="text-xs text-slate-500 italic">No hay técnicos asignados aún.</p>
              )}
            </div>

            {isAdmin && (
              <select 
                value=""
                disabled={isAssigning}
                onChange={(e) => handleAddTech(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500 transition-all text-sm"
              >
                <option value="">+ Añadir Técnico al Equipo...</option>
                {technicians
                  .filter(t => !assignedTechs.find(at => at.id === t.id))
                  .map(tech => (
                    <option key={tech.id} value={tech.id}>
                      {tech.full_name} ({tech.activeCount} tareas activas)
                    </option>
                  ))
                }
              </select>
            )}
          </div>

          <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-800 space-y-5">
            {task.reporter_name && (
              <div className="pb-4 border-b border-slate-800/50">
                <h4 className="text-[10px] font-bold text-emerald-500 uppercase mb-2 tracking-widest">Reportado por Producción</h4>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  <p className="text-white font-medium">{task.reporter_name} <span className="text-slate-500 text-sm font-mono">#{task.reporter_emp_num}</span></p>
                </div>
              </div>
            )}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-widest">Descripción del Reporte</h4>
              <p className="text-slate-300 leading-relaxed italic">"{task.description}"</p>
              
              {task.machines?.manual_url && (
                <div className="mt-6 p-4 bg-blue-600/10 border border-blue-600/20 rounded-2xl flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white uppercase tracking-tighter">Manual Técnico Disponible</p>
                      <p className="text-[10px] text-slate-500">Consultar especificaciones y diagramas.</p>
                    </div>
                  </div>
                  <a 
                    href={task.machines.manual_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Abrir Manual
                  </a>
                </div>
              )}
            </div>
            {task.photo_urls && task.photo_urls.length > 0 && (
              <div className="pt-4 border-t border-slate-800/50">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-widest">Evidencia Fotográfica</h4>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {task.photo_urls.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="relative h-40 w-40 rounded-xl overflow-hidden border border-slate-700 block flex-shrink-0 hover:border-blue-500 transition-colors shadow-lg">
                      <img src={url} alt={`Evidencia ${idx + 1}`} className="object-cover w-full h-full" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {task.status === 'resolved' && (
            <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">Esta tarea ha sido marcada como resuelta. Listo para el cierre definitivo.</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-900/50 border-t border-slate-800">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
          >
            Cerrar Ventana
          </button>
        </div>
      </motion.div>
    </div>
  );
}
