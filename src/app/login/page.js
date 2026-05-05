'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LayoutDashboard } from 'lucide-react';

export default function LoginPage() {
  const { user, loginWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.push('/');
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/40">
            <LayoutDashboard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">MaintOps Pro</h1>
          <p className="text-slate-400 mt-2">Plataforma de Mantenimiento y Operaciones</p>
        </div>

        <button 
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 py-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Iniciar sesión con Google
        </button>

        <p className="text-center text-xs text-slate-500 mt-8 leading-relaxed">
          Al iniciar sesión, aceptas nuestros términos de servicio y políticas de seguridad industrial.
        </p>
      </div>
    </div>
  );
}
