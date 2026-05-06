'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Shield, UserCog, Mail, Calendar, CheckCircle } from 'lucide-react';

export default function UsersPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');
    if (data) setProfiles(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      alert("No tienes permisos para cambiar roles (Solo Admins).");
    } else {
      fetchUsers();
    }
  };

  const roles = [
    { id: 'admin', name: 'Administrador', color: 'text-red-400 bg-red-400/10' },
    { id: 'supervisor', name: 'Encargado', color: 'text-orange-400 bg-orange-400/10' },
    { id: 'inventory', name: 'Inventario', color: 'text-emerald-400 bg-emerald-400/10' },
    { id: 'technician', name: 'Técnico', color: 'text-blue-400 bg-blue-400/10' },
  ];

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">Gestión de Personal</h2>
        <p className="text-slate-400 mt-1">Control de roles y accesos al sistema.</p>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 border-b border-slate-800">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuario</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Rol Actual</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cambiar Rol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {profiles.map((profile) => (
              <tr key={profile.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700 uppercase font-bold">
                      {profile.full_name?.charAt(0) || 'U'}
                    </div>
                    <span className="font-medium text-slate-200">{profile.full_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">{profile.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    roles.find(r => r.id === profile.role)?.color || 'bg-slate-800 text-slate-500'
                  }`}>
                    {roles.find(r => r.id === profile.role)?.name || profile.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <select 
                    value={profile.role}
                    disabled={profile.id === currentUser?.id} // No se puede cambiar a sí mismo
                    onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-3">
        <Shield className="w-5 h-5 text-blue-400 flex-shrink-0" />
        <p className="text-sm text-blue-300/80">
          <strong>Nota de Seguridad:</strong> Los técnicos solo podrán ver el plano y sus órdenes. Solo los Administradores pueden acceder a esta pantalla para gestionar el personal.
        </p>
      </div>
    </div>
  );
}
