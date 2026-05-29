'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false); // Por defecto no bloqueamos

  const logout = async () => {
    localStorage.clear();
    if (supabase) await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const loginWithGoogle = () => {
    if (!supabase) return;
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  };

  const refreshProfile = async (userId, sessionUser = null) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error || !data) {
        // If we are currently on the auth callback page, bypass the logout revocation.
        // The callback page is responsible for initializing the profile.
        if (typeof window !== 'undefined' && window.location.pathname === '/auth/callback') {
          console.log("Auth callback page detected. Bypassing instant logout.");
          return;
        }
        
        console.warn("No active profile found for authenticated user. Revoking access.");
        logout();
        return;
      }

      // Self-healing: Ensure email and full_name are correctly populated in the profiles table in the database
      let currentProfileData = data;
      if (sessionUser) {
        const updates = {};
        if (!data.email || data.email.toLowerCase().trim() !== sessionUser.email.toLowerCase().trim()) {
          updates.email = sessionUser.email.toLowerCase().trim();
        }
        if (!data.full_name) {
          updates.full_name = sessionUser.user_metadata?.full_name || sessionUser.email.split('@')[0];
        }

        if (Object.keys(updates).length > 0) {
          console.log("Self-healing profile for user:", sessionUser.email, updates);
          const { data: updatedData, error: updateError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .maybeSingle();

          if (!updateError && updatedData) {
            currentProfileData = updatedData;
          }
        }
      }

      // Check if user is a responsible of any inventory
      let isResponsible = false;
      let assignedInventories = [];
      try {
        const { data: invs } = await supabase
          .from('inventories')
          .select('id, name')
          .eq('responsable_id', userId);
        if (invs && invs.length > 0) {
          isResponsible = true;
          assignedInventories = invs;
        }
      } catch (invErr) {
        console.warn("Error checking responsible inventories:", invErr);
      }

      const profileWithResponsible = {
        ...currentProfileData,
        is_responsible: isResponsible,
        assigned_inventories: assignedInventories
      };

      setProfile(profileWithResponsible);
      localStorage.setItem('user_role', currentProfileData.role);
    } catch (err) {
      console.error("Error refreshing profile:", err);
    }
  };

  useEffect(() => {
    if (!supabase) return;

    // Check session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) refreshProfile(u.id, u);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) refreshProfile(u.id, u);
      else {
        setProfile(null);
        localStorage.removeItem('user_role');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
