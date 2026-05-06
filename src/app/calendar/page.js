'use client';

import { Calendar as CalendarIcon, Clock, Info } from 'lucide-react';

export default function CalendarPage() {
  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">Calendario de Mantenimiento</h2>
        <p className="text-slate-400 mt-1">Programación de actividades preventivas y correctivas.</p>
      </div>

      <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-3xl flex flex-col items-center justify-center p-12 text-center">
        <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6">
          <CalendarIcon className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Módulo en Desarrollo</h3>
        <p className="text-slate-400 max-w-md mx-auto mb-8">
          Estamos integrando las órdenes de trabajo con la vista de calendario para que puedas ver la carga de trabajo semanal.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
          <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800/50">
            <Clock className="w-6 h-6 text-orange-400 mb-3 mx-auto" />
            <h4 className="text-sm font-bold text-slate-200">Próximos</h4>
            <p className="text-xs text-slate-500 mt-1">Ver tareas pendientes por fecha.</p>
          </div>
          <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800/50">
            <CheckCircle className="w-6 h-6 text-emerald-400 mb-3 mx-auto" />
            <h4 className="text-sm font-bold text-slate-200">Completados</h4>
            <p className="text-xs text-slate-500 mt-1">Historial de cierres de órdenes.</p>
          </div>
          <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800/50">
            <Info className="w-6 h-6 text-blue-400 mb-3 mx-auto" />
            <h4 className="text-sm font-bold text-slate-200">Alertas</h4>
            <p className="text-xs text-slate-500 mt-1">Notificaciones de retrasos.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckCircle({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  );
}
