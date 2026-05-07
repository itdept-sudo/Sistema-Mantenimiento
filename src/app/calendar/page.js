'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Box, 
  Clock,
  LayoutGrid,
  List,
  Settings as SettingsIcon,
  Plus,
  Info,
  X,
  CheckCircle2,
  BookOpen,
  Edit2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ScheduleModal from '@/components/orders/ScheduleModal';
import TemplateModal from '@/components/orders/TemplateModal';

export default function CalendarPage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [machines, setMachines] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Estados de navegación
  const [view, setView] = useState('month'); 
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTech, setSelectedTech] = useState('all');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sData, tData, mData, tempData] = await Promise.all([
        supabase.from('maintenance_schedules').select('*, technician:profiles(full_name)').eq('is_active', true),
        supabase.from('profiles').select('id, full_name').eq('role', 'technician'),
        supabase.from('machines').select('id, name'),
        supabase.from('maintenance_templates').select('*')
      ]);
      
      if (sData.data) setSchedules(sData.data);
      if (tData.data) setTechnicians(tData.data);
      if (mData.data) setMachines(mData.data);
      if (tempData.data) setTemplates(tempData.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE PROYECCIÓN ---
  // Esta función genera eventos virtuales para el calendario basados en la frecuencia
  const getProjectedEvents = (date) => {
    if (!date) return [];
    const results = [];
    
    schedules.forEach(s => {
      // Filtro por técnico
      if (selectedTech !== 'all' && s.technician_id !== selectedTech) return;

      const startDate = new Date(s.next_due);
      startDate.setHours(0,0,0,0);
      const targetDate = new Date(date);
      targetDate.setHours(0,0,0,0);

      // Si la fecha es menor a la de inicio, no hay evento
      if (targetDate < startDate) return;

      const diffTime = Math.abs(targetDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let isMatch = false;
      if (s.frequency === 'daily') isMatch = true;
      if (s.frequency === 'weekly' && diffDays % 7 === 0) isMatch = true;
      if (s.frequency === 'monthly' && targetDate.getDate() === startDate.getDate()) isMatch = true;
      if (s.frequency === 'bimonthly' && targetDate.getDate() === startDate.getDate() && (targetDate.getMonth() - startDate.getMonth()) % 2 === 0) isMatch = true;
      if (s.frequency === 'annually' && targetDate.getDate() === startDate.getDate() && targetDate.getMonth() === startDate.getMonth()) isMatch = true;

      if (isMatch) {
        results.push(s);
      }
    });
    return results;
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push({ day: null, date: null });
    for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, date: new Date(year, month, i) });
    return days;
  };

  const navigateDate = (direction) => {
    const next = new Date(currentDate);
    if (view === 'month') next.setMonth(currentDate.getMonth() + direction);
    if (view === 'week') next.setDate(currentDate.getDate() + (direction * 7));
    if (view === 'day') next.setDate(currentDate.getDate() + direction);
    setCurrentDate(next);
  };

  return (
    <div className="p-8 h-full flex flex-col bg-slate-950 overflow-hidden relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <CalendarIcon className="text-blue-500" /> Plan Maestro Preventivo
          </h2>
          <p className="text-slate-400 mt-1">Automatización y control de actividades recurrentes.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => { 
              if (view === 'templates') {
                setSelectedTemplate(null);
                setIsTemplateModalOpen(true);
              } else {
                setSelectedActivity(null); 
                setIsScheduleModalOpen(true); 
              }
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" /> {view === 'templates' ? 'Nueva Plantilla' : 'Programar Actividad'}
          </button>
          
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button onClick={() => setView('month')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'month' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}>Mes</button>
            <button onClick={() => setView('week')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'week' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}>Semana</button>
            <button onClick={() => setView('day')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'day' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}>Día</button>
            <button onClick={() => setView('manage')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'manage' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400 hover:bg-blue-500/10'}`}><SettingsIcon className="w-3.5 h-3.5" /> Gestionar</button>
            <button onClick={() => setView('templates')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'templates' ? 'bg-emerald-600 text-white shadow-lg' : 'text-emerald-400 hover:bg-emerald-500/10'}`}>
              <BookOpen className="w-3.5 h-3.5" /> Plantillas
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar - Ocultar si estamos en gestión o plantillas */}
      {view !== 'manage' && view !== 'templates' && (
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-4">
            <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ChevronLeft className="w-6 h-6" /></button>
            <h3 className="text-xl font-bold text-white min-w-[200px] text-center capitalize">
              {currentDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric', day: view === 'month' ? undefined : 'numeric' })}
            </h3>
            <button onClick={() => navigateDate(1)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ChevronRight className="w-6 h-6" /></button>
            <button onClick={() => setCurrentDate(new Date())} className="ml-4 text-xs font-bold text-blue-500 hover:underline">Hoy</button>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
            <User className="w-4 h-4 text-slate-500" />
            <select value={selectedTech} onChange={(e) => setSelectedTech(e.target.value)} className="bg-transparent text-sm text-white focus:outline-none min-w-[150px]">
              <option value="all">Todos los Técnicos</option>
              {technicians.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-auto bg-slate-900/30 rounded-3xl border border-slate-800 p-2 relative">
        <AnimatePresence mode="wait">
          {view === 'month' && (
            <motion.div key="month" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-7 h-full min-h-[600px]">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                <div key={day} className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">{day}</div>
              ))}
              {getDaysInMonth(currentDate).map((d, i) => {
                const events = getProjectedEvents(d.date);
                const isToday = d.date?.toDateString() === new Date().toDateString();

                return (
                  <div key={i} className={`min-h-[120px] border-r border-b border-slate-800 p-2 transition-colors ${d.day ? 'hover:bg-slate-800/30' : 'bg-slate-950/20'}`}>
                    {d.day && (
                      <>
                        <div className={`text-sm font-bold mb-2 ${isToday ? 'bg-blue-600 text-white w-7 h-7 flex items-center justify-center rounded-full' : 'text-slate-500'}`}>{d.day}</div>
                        <div className="space-y-1">
                          {events.map(event => (
                            <div 
                              key={event.id} 
                              onClick={() => setSelectedActivity(event)}
                              className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] text-blue-400 hover:bg-blue-500/20 transition-all cursor-pointer flex items-center justify-between"
                            >
                              <span className="font-bold truncate">{event.title}</span>
                              <span className="text-[8px] bg-blue-500/20 px-1 rounded">{event.machine_ids?.length} máquinas</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}

          {view === 'manage' && (
            <motion.div key="manage" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-5xl mx-auto h-full">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-white">Gestión de Programas Recurrentes</h3>
                <span className="text-slate-500 text-sm">{schedules.length} programas activos</span>
              </div>
              
              <div className="space-y-4">
                {schedules.length === 0 ? (
                  <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-dashed border-slate-800">
                    <CalendarIcon className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No hay programaciones activas.</p>
                    <button 
                      onClick={() => setIsScheduleModalOpen(true)}
                      className="mt-4 text-blue-500 hover:underline text-sm font-bold"
                    >
                      + Crear mi primera programación
                    </button>
                  </div>
                ) : (
                  schedules.map(s => (
                    <div key={s.id} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex justify-between items-center group hover:border-slate-700 transition-all">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500"><LayoutGrid className="w-6 h-6" /></div>
                        <div>
                          <h4 className="text-lg font-bold text-white">{s.title}</h4>
                          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {s.frequency}</span>
                            <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {s.technician?.full_name || 'Sin asignar'}</span>
                            <span className="flex items-center gap-1.5"><Box className="w-4 h-4" /> {s.machine_ids?.length} máquinas</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { setSelectedActivity(s); setIsScheduleModalOpen(true); }}
                          className="px-4 py-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl text-sm font-bold transition-all"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm('¿Eliminar esta programación?')) {
                              await supabase.from('maintenance_schedules').delete().eq('id', s.id);
                              fetchData();
                            }
                          }}
                          className="px-4 py-2 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white rounded-xl text-sm font-bold transition-all"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {view === 'templates' && (
            <motion.div key="templates" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-5xl mx-auto h-full">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-white">Plantillas de Procedimientos</h3>
                <span className="text-slate-500 text-sm">{templates.length} estándares creados</span>
              </div>
              
              <div className="space-y-4">
                {templates.length === 0 ? (
                  <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-dashed border-slate-800">
                    <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Aún no tienes procedimientos estándar.</p>
                    <button 
                      onClick={() => setIsTemplateModalOpen(true)}
                      className="mt-4 text-emerald-500 hover:underline text-sm font-bold"
                    >
                      + Crear mi primera plantilla
                    </button>
                  </div>
                ) : (
                  templates.map(t => (
                    <div key={t.id} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex justify-between items-center group hover:border-slate-700 transition-all">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><BookOpen className="w-6 h-6" /></div>
                        <div>
                          <h4 className="text-lg font-bold text-white">{t.name}</h4>
                          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {t.default_frequency}</span>
                            <span className="line-clamp-1 max-w-md">{t.description}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { setSelectedTemplate(t); setIsTemplateModalOpen(true); }}
                          className="px-4 py-2 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm('¿Eliminar esta plantilla? Las actividades programadas no se verán afectadas.')) {
                              await supabase.from('maintenance_templates').delete().eq('id', t.id);
                              fetchData();
                            }
                          }}
                          className="px-4 py-2 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {view === 'day' && (
            <div className="p-8 max-w-3xl mx-auto space-y-4">
              {getProjectedEvents(currentDate).map(event => (
                <div key={event.id} onClick={() => setSelectedActivity(event)} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl hover:border-blue-500 transition-all cursor-pointer flex justify-between items-center">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500"><Box className="w-6 h-6" /></div>
                    <div>
                      <h5 className="text-lg font-bold text-white">{event.title}</h5>
                      <p className="text-sm text-slate-400">{event.machine_ids?.length} máquinas asignadas</p>
                    </div>
                  </div>
                  <ChevronRight className="text-slate-600" />
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* MODAL DE DETALLES */}
      <AnimatePresence>
        {selectedActivity && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Info className="w-5 h-5 text-blue-500" /> Detalle de Actividad</h3>
                <button onClick={() => setSelectedActivity(null)} className="text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <h4 className="text-2xl font-black text-white mb-2">{selectedActivity.title}</h4>
                  <p className="text-slate-400 leading-relaxed">{selectedActivity.task_description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Frecuencia</p>
                    <div className="flex items-center gap-2 text-blue-400 font-bold capitalize"><Clock className="w-4 h-4" /> {selectedActivity.frequency}</div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Responsable</p>
                    <div className="flex items-center gap-2 text-white font-bold"><User className="w-4 h-4 text-slate-500" /> {selectedActivity.technician?.full_name || 'Sin asignar'}</div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-3">Máquinas Involucradas ({selectedActivity.machine_ids?.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedActivity.machine_ids?.map(mId => {
                      const m = machines.find(x => x.id === mId);
                      return (
                        <div key={mId} className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg flex items-center gap-2 border border-slate-700">
                          <Box className="w-3 h-3 text-blue-500" /> {m?.name || 'Desconocida'}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4">
                   <div className="flex items-center gap-2 text-emerald-500 text-sm font-bold bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
                     <CheckCircle2 className="w-5 h-5" />
                     Próxima fecha programada: {new Date(selectedActivity.next_due).toLocaleDateString()}
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Programación */}
      <ScheduleModal 
        isOpen={isScheduleModalOpen}
        onClose={() => { setIsScheduleModalOpen(false); setSelectedActivity(null); }}
        machines={machines}
        editData={selectedActivity}
        onSuccess={() => {
          fetchData();
        }}
      />

      {/* Modal de Plantillas */}
      <TemplateModal 
        isOpen={isTemplateModalOpen}
        onClose={() => { setIsTemplateModalOpen(false); setSelectedTemplate(null); }}
        editData={selectedTemplate}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
}
