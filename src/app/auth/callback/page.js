'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (data?.session) {
        const userEmail = data.session.user.email;
        const domain = userEmail.split('@')[1];

        if (domain !== 'prosper-mfg.com') {
          await supabase.auth.signOut();
          router.push('/login?error=domain');
          return;
        }

        // Determine the role for the user
        try {
          // 1. Check if the user is in pre_approved_users
          const { data: preApproved } = await supabase
            .from('pre_approved_users')
            .select('role')
            .eq('email', userEmail)
            .maybeSingle();

          // 2. Check their current profile
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .maybeSingle();

          let targetRole = 'employee'; // Default role if not pre-approved
          if (preApproved) {
            targetRole = preApproved.role;
          } else if (currentProfile) {
            // Keep admin, supervisor, and inventory roles to avoid downgrades
            if (['admin', 'supervisor', 'inventory'].includes(currentProfile.role)) {
              targetRole = currentProfile.role;
            }
          }

          // 3. Upsert or update profile with the target role
          if (currentProfile) {
            if (currentProfile.role !== targetRole) {
              await supabase
                .from('profiles')
                .update({ role: targetRole })
                .eq('id', data.session.user.id);
            }
          } else {
            await supabase
              .from('profiles')
              .insert({
                id: data.session.user.id,
                email: userEmail,
                full_name: data.session.user.user_metadata?.full_name || userEmail.split('@')[0],
                role: targetRole
              });
          }

          // 4. Clean up pre_approved_users once successfully logged in
          if (preApproved) {
            await supabase
              .from('pre_approved_users')
              .delete()
              .eq('email', userEmail);
          }
        } catch (err) {
          console.error("Error setting user role:", err);
        }

        router.push('/');
      } else {
        router.push('/login');
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400 font-medium">Verificando sesión...</p>
      </div>
    </div>
  );
}
