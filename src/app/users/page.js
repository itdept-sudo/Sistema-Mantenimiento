'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Shield, UserCog, Mail, Calendar, CheckCircle } from 'lucide-react';

export default function UsersPage() {
  const [profiles, setProfiles] = useState([]);
  const [preApprovedUsers, setPreApprovedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Modal states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [isInviting, setIsInviting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Fetch active profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      if (profilesData) setProfiles(profilesData);

      // Fetch pending pre-approved users (silently catch error if table doesn't exist yet)
      const { data: preApprovedData, error: preApprovedError } = await supabase
        .from('pre_approved_users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!preApprovedError && preApprovedData) {
        setPreApprovedUsers(preApprovedData);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) {
        console.error("Error al actualizar rol:", error);
        alert(`Error: ${error.message}. Asegúrate de tener permisos de Administrador y que el rol esté permitido en la base de datos.`);
      } else {
        fetchUsers();
      }
    } catch (err) {
      alert("Error de conexión al intentar cambiar el rol.");
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    
    setIsInviting(true);
    try {
      // 1. Check if user already exists in profiles
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', inviteEmail)
        .maybeSingle();
      
      if (existingUser) {
        alert('Este usuario ya inició sesión anteriormente y está activo. Por favor búscalo en la lista superior para cambiar su rol.');
        setIsInviting(false);
        return;
      }

      // 2. Insert into pre_approved_users
      const { error } = await supabase
        .from('pre_approved_users')
        .upsert({ email: inviteEmail, role: inviteRole });

      if (error) {
        if (error.code === '42P01') {
          alert("Error: La tabla pre_approved_users no existe. Debes ejecutar el script SQL proporcionado.");
        } else {
          throw error;
        }
      } else {
        setInviteEmail('');
        setInviteRole('employee');
        setIsInviteModalOpen(false);
        fetchUsers();
      }
    } catch (err) {
      console.error("Error al invitar:", err);
      alert("Error al dar de alta el usuario: " + err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleCancelInvite = async (email) => {
    if (!confirm(`¿Estás seguro de cancelar la invitación para ${email}?`)) return;
    try {
      const { error } = await supabase
        .from('pre_approved_users')
        .delete()
        .eq('email', email);
      
      if (error) throw error;
      fetchUsers();
    } catch (err) {
      console.error("Error cancelando invitación:", err);
      alert("Error al cancelar la invitación: " + err.message);
    }
  };

  const roles = [
    { id: 'admin', name: 'Administrador', color: 'text-red-400 bg-red-400/10' },
    { id: 'supervisor', name: 'Encargado', color: 'text-orange-400 bg-orange-400/10' },
    { id: 'inventory', name: 'Inventario', color: 'text-emerald-400 bg-emerald-400/10' },
    { id: 'technician', name: 'Técnico', color: 'text-blue-400 bg-blue-400/10' },
    { id: 'employee', name: 'Empleado (Solo Reportar)', color: 'text-slate-400 bg-slate-800' }
  ];

  return (
    <div className="p-8 h-full flex flex-col space-y-8 overflow-y-auto">
      <div className="flex justify-between items-end flex-shrink-0">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Gestión de Personal</h2>
          <p className="text-slate-400 mt-1">Control de roles y accesos al sistema.</p>
        </div>
        <button 
          onClick={() => setIsInviteModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
        >
          <Mail className="w-5 h-5" />
          Dar de Alta Usuario
        </button>
      </div>

      {/* Usuarios Activos */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden flex-shrink-0">
        <div className="p-6 border-b border-slate-800 bg-slate-900">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            Usuarios Activos (Ya iniciaron sesión)
          </h3>
        </div>
        <div className="overflow-x-auto">
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
      </div>

      {/* Invitaciones Pendientes */}
      {preApprovedUsers.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden flex-shrink-0">
          <div className="p-6 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              Altas Pendientes (Aún no inician sesión)
            </h3>
            <span className="bg-orange-500/10 text-orange-400 text-xs font-bold px-3 py-1 rounded-full border border-orange-500/20">
              Recibirán su rol automáticamente al entrar
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50 border-b border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email Registrado</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Rol a Asignar</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {preApprovedUsers.map((user) => (
                  <tr key={user.email} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-200 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-500 border border-dashed border-slate-700 uppercase font-bold">
                        ?
                      </div>
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider opacity-80 ${
                        roles.find(r => r.id === user.role)?.color || 'bg-slate-800 text-slate-500'
                      }`}>
                        {roles.find(r => r.id === user.role)?.name || user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleCancelInvite(user.email)}
                        className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-4 py-2 rounded-lg transition-colors border border-red-500/20"
                      >
                        Cancelar Alta
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Añadir Usuario */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Dar de Alta Usuario</h3>
            <p className="text-slate-400 text-sm mb-6">Este correo quedará pre-aprobado. Cuando la persona inicie sesión con su cuenta de Google, recibirá el rol de forma automática.</p>
            
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Correo Electrónico (Google)</label>
                <input 
                  type="email" 
                  value={inviteEmail} 
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="ejemplo@prosper-mfg.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Rol Asignado</label>
                <select 
                  value={inviteRole} 
                  onChange={e => setInviteRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsInviteModalOpen(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isInviting}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl font-bold transition-colors"
                >
                  {isInviting ? 'Guardando...' : 'Dar de Alta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
