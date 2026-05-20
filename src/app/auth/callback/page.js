'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);

  useEffect(() => {
    const handleAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        setErrorMsg("Error al obtener sesión de autenticación.");
        setErrorDetails(error.message);
        return;
      }

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
          // 1. Check if the user is in pre_approved_users (trim & case-insensitive match in JS)
          const { data: preApprovedList, error: preApprovedError } = await supabase
            .from('pre_approved_users')
            .select('*');

          if (preApprovedError) {
            console.error("Error checking pre-approved users:", preApprovedError);
          }

          const preApproved = preApprovedList?.find(
            p => p.email && p.email.toLowerCase().trim() === userEmail.toLowerCase().trim()
          );

          // 2. Check their current profile
          const { data: currentProfile, error: profileFetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .maybeSingle();

          if (profileFetchError) {
            setErrorMsg("Error al conectar con la tabla de perfiles en la base de datos.");
            setErrorDetails(profileFetchError.message);
            return;
          }

          let targetRole = 'employee'; // Default role if not pre-approved
          if (preApproved) {
            targetRole = preApproved.role;
          } else if (currentProfile) {
            // Keep admin, supervisor, and inventory roles to avoid downgrades
            if (['admin', 'supervisor', 'inventory'].includes(currentProfile.role)) {
              targetRole = currentProfile.role;
            }
          }

          // 3. Update or create profile — IMPORTANT: separate email/name updates from role updates
          // so that a CHECK constraint failure on role doesn't block email self-healing
          if (currentProfile) {
            // Step A: Always fix email and full_name first (independent operation)
            const identityUpdates = {};
            if (!currentProfile.email || currentProfile.email.toLowerCase().trim() !== userEmail.toLowerCase().trim()) {
              identityUpdates.email = userEmail.toLowerCase().trim();
            }
            if (!currentProfile.full_name) {
              identityUpdates.full_name = data.session.user.user_metadata?.full_name || userEmail.split('@')[0];
            }

            if (Object.keys(identityUpdates).length > 0) {
              const { error: identityError } = await supabase
                .from('profiles')
                .update(identityUpdates)
                .eq('id', data.session.user.id);
              
              if (identityError) {
                console.error("Error updating profile identity (email/name):", identityError);
              } else {
                console.log("Profile identity updated successfully:", identityUpdates);
              }
            }

            // Step B: Try to update role separately (may fail due to CHECK constraint)
            if (currentProfile.role !== targetRole) {
              const { error: roleError } = await supabase
                .from('profiles')
                .update({ role: targetRole })
                .eq('id', data.session.user.id);
              
              if (roleError) {
                console.error("Error updating role (CHECK constraint?):", roleError);
                // Role update failed but email was already fixed above
              }
            }
          } else {
            // New profile - try insert with target role, fallback to 'technician' if CHECK fails
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: data.session.user.id,
                email: userEmail.toLowerCase().trim(),
                full_name: data.session.user.user_metadata?.full_name || userEmail.split('@')[0],
                role: targetRole
              });

            if (insertError) {
              console.error("Error inserting profile with role", targetRole, ":", insertError);
              // Retry with default 'technician' role in case CHECK constraint blocks the custom role
              const { error: retryError } = await supabase
                .from('profiles')
                .insert({
                  id: data.session.user.id,
                  email: userEmail.toLowerCase().trim(),
                  full_name: data.session.user.user_metadata?.full_name || userEmail.split('@')[0],
                  role: 'technician'
                });
              if (retryError) {
                console.error("Retry insert also failed:", retryError);
                setErrorMsg("No se pudo inicializar tu perfil de usuario en la base de datos.");
                setErrorDetails(`Intento 1: ${insertError.message} | Intento 2: ${retryError.message}`);
                return;
              }
            }
          }

          // 4. Clean up pre_approved_users once successfully logged in (case & space insensitive)
          if (preApproved) {
            const { error: deleteError } = await supabase
              .from('pre_approved_users')
              .delete()
              .eq('email', preApproved.email);
            
            if (deleteError) {
              console.error("Error cleaning up pre_approved entry:", deleteError);
            }
          }
        } catch (err) {
          console.error("Error setting user role:", err);
          setErrorMsg("Excepción interna al procesar tu rol.");
          setErrorDetails(err.message);
          return;
        }

        router.push('/');
      } else {
        router.push('/login');
      }
    };

    handleAuth();
  }, [router]);

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-500 text-2xl mx-auto">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-white">Error de Acceso</h2>
          <p className="text-slate-400 text-sm">{errorMsg}</p>
          {errorDetails && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-red-400 text-left overflow-x-auto max-h-36">
              {errorDetails}
            </div>
          )}
          <button 
            onClick={() => {
              supabase.auth.signOut();
              router.push('/login');
            }}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl font-bold transition-colors"
          >
            Volver a Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400 font-medium">Verificando sesión...</p>
      </div>
    </div>
  );
}
