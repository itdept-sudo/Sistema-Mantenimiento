'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Función para cerrar sesión (Indestructible)
  const logout = async () => {
    console.log("Iniciando cierre de sesión...");
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error("Error en signOut:", e);
    }
    // Pase lo que pase, limpiamos y sacamos al usuario
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  const loginWithGoogle = () => {
    if (!supabase) return;
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  };

  useEffect(() => {
    if (!supabase) return;

    // 1. Cargar sesión inicial
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        setProfile(data);
      }
      setLoading(false);
    };

    checkSession();

    // 2. Escuchar cambios de estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        setProfile(data);
      } else {
        setProfile(null);
      }
    });

    // 3. Escuchar cambios en el PERFIL (Tiempo real para roles)
    const profileSubscription = supabase
      .channel('profile-changes')
      .on('postgres_changes', { event: 'UPDATE', table: 'profiles' }, (payload) => {
        if (payload.new.id === user?.id) {
          setProfile(payload.new);
        }
      })
      .subscribe();

    // 4. Fail-safe: Forzar el fin de la carga tras 3 segundos pase lo que pase
    const failSafe = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(profileSubscription);
      clearTimeout(failSafe);
    };
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
