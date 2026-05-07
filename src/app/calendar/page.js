'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  User, 
  Box, 
  Clock,
  LayoutGrid,
  List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CalendarPage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de navegación
  const [view, setView] = useState('month'); // 'month', 'week', 'day'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTech, setSelectedTech] = useState('all');

  useEffect(() => {
    fetchSchedules();
    fetchTechnicians();
  }, [user]);

  const fetchTechnicians = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name').eq('role', 'technician');
    if (data) setTechnicians(data);
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('maintenance_schedules')
        .select(`
          *,
          machine:machines(name),
          technician:profiles(full_name)
        `)
        .eq('is_active', true);
      
      if (data) setSchedules(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Helper para generar los días del mes
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Espacios en blanco para el inicio del mes
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, date: null });
    }
    // Días del mes
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, date: new Date(year, month, i) });
    }
    return days;
  };

  const navigateDate = (direction) => {
    const next = new Date(currentDate);
    if (view === 'month') next.setMonth(currentDate.getMonth() + direction);
    if (view === 'week') next.setDate(currentDate.getDate() + (direction * 7));
    if (view === 'day') next.setDate(currentDate.getDate() + direction);
    setCurrentDate(next);
  };

  const filteredSchedules = schedules.filter(s => {
    const matchesTech = selectedTech === 'all' || s.technician_id === selectedTech;
    return matchesTech;
  });

  const getEventsForDate = (date) => {
    if (!date) return [];
    return filteredSchedules.filter(s => {
      const scheduleDate = new Date(s.next_due);
      return scheduleDate.toDateString() === date.toDateString();
    });
  };

  return (
    <div className="p-8 h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <CalendarIcon className="text-blue-500" /> Calendario Preventivo
          </h2>
          <p className="text-slate-400 mt-1">Visualiza y gestiona el futuro de tu mantenimiento.</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button 
            onClick={() => setView('month')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'month' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            Mes
          </button>
          <button 
            onClick={() => setView('week')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'week' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            Semana
          </button>
          <button 
            onClick={() => setView('day')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'day' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            Día
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigateDate(-1)}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h3 className="text-xl font-bold text-white min-w-[200px] text-center">
            {currentDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric', day: view === 'month' ? undefined : 'numeric' })}
          </h3>
          <button 
            onClick={() => navigateDate(1)}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="ml-4 text-xs font-bold text-blue-500 hover:underline"
          >
            Hoy
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
            <User className="w-4 h-4 text-slate-500" />
            <select 
              value={selectedTech}
              onChange={(e) => setSelectedTech(e.target.value)}
              className="bg-transparent text-sm text-white focus:outline-none min-w-[150px]"
            >
              <option value="all">Todos los Técnicos</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto bg-slate-900/30 rounded-3xl border border-slate-800 p-2 relative">
        <AnimatePresence mode="wait">
          {view === 'month' && (
            <motion.div 
              key="month"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-7 h-full min-h-[600px]"
            >
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                <div key={day} className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">
                  {day}
                </div>
              ))}
              {getDaysInMonth(currentDate).map((d, i) => {
                const events = getEventsForDate(d.date);
                const isToday = d.date?.toDateString() === new Date().toDateString();

                return (
                  <div key={i} className={`min-h-[120px] border-r border-b border-slate-800 p-2 transition-colors ${d.day ? 'hover:bg-slate-800/30' : 'bg-slate-950/20'}`}>
                    {d.day && (
                      <>
                        <div className={`text-sm font-bold mb-2 ${isToday ? 'bg-blue-600 text-white w-7 h-7 flex items-center justify-center rounded-full shadow-lg shadow-blue-900/40' : 'text-slate-500'}`}>
                          {d.day}
                        </div>
                        <div className="space-y-1">
                          {events.map(event => (
                            <div key={event.id} className="group relative p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] text-blue-400 hover:bg-blue-500/20 transition-all cursor-pointer">
                              <div className="font-bold truncate">{event.title}</div>
                              <div className="flex items-center gap-1 opacity-60">
                                <Box className="w-2 h-2" /> {event.machine?.name}
                              </div>
                              {/* Tooltip simple */}
                              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-2xl w-48 pointer-events-none">
                                <p className="font-bold text-white mb-1">{event.title}</p>
                                <p className="text-slate-400 text-[10px] mb-2">{event.task_description}</p>
                                <div className="flex items-center gap-2 text-blue-400">
                                  <User className="w-3 h-3" /> {event.technician?.full_name || 'Sin asignar'}
                                </div>
                              </div>
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

          {view === 'day' && (
            <motion.div 
              key="day"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-8 max-w-3xl mx-auto"
            >
              <div className="flex items-center gap-6 mb-8 bg-slate-900 p-6 rounded-3xl border border-slate-800">
                <div className="w-20 h-20 bg-blue-600 rounded-2xl flex flex-col items-center justify-center text-white shadow-xl shadow-blue-900/20">
                  <span className="text-xs font-bold uppercase">{currentDate.toLocaleDateString('es-MX', { month: 'short' })}</span>
                  <span className="text-3xl font-black">{currentDate.getDate()}</span>
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-white capitalize">{currentDate.toLocaleDateString('es-MX', { weekday: 'long' })}</h4>
                  <p className="text-slate-400">Programación detallada para hoy.</p>
                </div>
              </div>

              <div className="space-y-4">
                {getEventsForDate(currentDate).length === 0 ? (
                  <div className="text-center py-20 bg-slate-950/50 rounded-3xl border border-dashed border-slate-800">
                    <Clock className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No hay actividades programadas para este día.</p>
                  </div>
                ) : (
                  getEventsForDate(currentDate).map(event => (
                    <div key={event.id} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl hover:border-blue-500/50 transition-all flex justify-between items-center group">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                          <Box className="w-6 h-6" />
                        </div>
                        <div>
                          <h5 className="text-lg font-bold text-white">{event.title}</h5>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-slate-400 flex items-center gap-1.5">
                              <Box className="w-4 h-4" /> {event.machine?.name}
                            </span>
                            <span className="text-sm text-slate-400 flex items-center gap-1.5">
                              <User className="w-4 h-4" /> {event.technician?.full_name || 'Sin asignar'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full uppercase tracking-tighter">
                          {event.frequency}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {(view === 'week') && (
            <motion.div 
              key="week"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-8 max-w-4xl mx-auto"
            >
              <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-blue-500" /> Actividades de la Semana
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {[0, 1, 2, 3, 4, 5, 6].map(offset => {
                  const dayDate = new Date(currentDate);
                  // Ajustar al inicio de la semana (Domingo) y sumar el offset
                  const dayOfWeek = currentDate.getDay();
                  dayDate.setDate(currentDate.getDate() - dayOfWeek + offset);
                  
                  const dayEvents = getEventsForDate(dayDate);
                  const isToday = dayDate.toDateString() === new Date().toDateString();

                  return (
                    <div key={offset} className={`flex flex-col gap-3 p-3 rounded-2xl border ${isToday ? 'bg-blue-600/10 border-blue-500/50' : 'bg-slate-900 border-slate-800'}`}>
                      <div className="text-center pb-2 border-b border-slate-800/50">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase">{dayDate.toLocaleDateString('es-MX', { weekday: 'short' })}</span>
                        <span className={`text-lg font-black ${isToday ? 'text-blue-400' : 'text-white'}`}>{dayDate.getDate()}</span>
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        {dayEvents.length === 0 ? (
                          <div className="h-full flex items-center justify-center opacity-20 py-8 text-[10px] text-center italic">Vacío</div>
                        ) : (
                          dayEvents.map(event => (
                            <div key={event.id} className="p-2 bg-slate-800 rounded-lg border border-slate-700 text-[9px] text-slate-300">
                              <p className="font-bold text-blue-400 truncate">{event.title}</p>
                              <p className="opacity-60 truncate">{event.machine?.name}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
