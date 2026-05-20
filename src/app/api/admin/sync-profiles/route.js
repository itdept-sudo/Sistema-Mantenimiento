import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    // Get the authorization header (user's access token)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // Create a Supabase client with the user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: { headers: { Authorization: `Bearer ${token}` } }
      }
    );

    // 1. Verify the caller is an admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!callerProfile || callerProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden ejecutar esta acción' }, { status: 403 });
    }

    // 2. Get all profiles and pre_approved_users
    const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*');
    const { data: preApproved, error: preApprovedError } = await supabase.from('pre_approved_users').select('*');

    if (profilesError) {
      return NextResponse.json({ error: 'Error leyendo perfiles', details: profilesError.message }, { status: 500 });
    }

    const results = {
      profilesWithNullEmail: [],
      preApprovedCleaned: [],
      errors: []
    };

    // 3. Find profiles with NULL/empty email - these are the root cause
    const nullEmailProfiles = (profiles || []).filter(p => !p.email || p.email.trim() === '');
    results.profilesWithNullEmail = nullEmailProfiles.map(p => ({ id: p.id, full_name: p.full_name }));

    // 4. Build a set of active emails (only non-null)
    const activeEmails = new Set(
      (profiles || [])
        .filter(p => p.email && p.email.trim() !== '')
        .map(p => p.email.toLowerCase().trim())
    );

    // 5. Clean up pre_approved_users whose emails match an active profile
    if (preApproved && preApproved.length > 0) {
      for (const pending of preApproved) {
        if (pending.email && activeEmails.has(pending.email.toLowerCase().trim())) {
          const { error: deleteError } = await supabase
            .from('pre_approved_users')
            .delete()
            .eq('email', pending.email);

          if (!deleteError) {
            results.preApprovedCleaned.push(pending.email);
          } else {
            results.errors.push(`No se pudo eliminar ${pending.email}: ${deleteError.message}`);
          }
        }
      }
    }

    // 6. For profiles with NULL email, try to match them with pre_approved by name
    // and then directly update the profile email using admin RLS policy
    // This requires the admin UPDATE policy we'll add
    for (const nullProfile of nullEmailProfiles) {
      // Try to find a matching pre_approved user by name similarity
      const nameToMatch = nullProfile.full_name?.toLowerCase().trim();
      
      if (preApproved && nameToMatch) {
        // Try to match by extracting name from email (e.g., miguel.miranda from miguel.miranda@prosper-mfg.com)
        const matchingPreApproved = preApproved.find(p => {
          if (!p.email) return false;
          const emailPrefix = p.email.split('@')[0].toLowerCase().replace(/[._-]/g, ' ');
          const profileName = nameToMatch.toLowerCase().replace(/[._-]/g, ' ');
          // Check if the email prefix words are contained in the profile name or vice versa
          const emailWords = emailPrefix.split(' ').filter(Boolean);
          const nameWords = profileName.split(' ').filter(Boolean);
          // Match if at least 2 words overlap, or if the first name matches
          const matchingWords = emailWords.filter(w => nameWords.some(nw => nw.includes(w) || w.includes(nw)));
          return matchingWords.length >= 1;
        });

        if (matchingPreApproved) {
          // Try to update the profile email
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ email: matchingPreApproved.email.toLowerCase().trim() })
            .eq('id', nullProfile.id);

          if (!updateError) {
            results.preApprovedCleaned.push(`Perfil ${nullProfile.full_name} reparado con email ${matchingPreApproved.email}`);
            
            // Now also clean up the pre_approved entry
            await supabase
              .from('pre_approved_users')
              .delete()
              .eq('email', matchingPreApproved.email);

            results.preApprovedCleaned.push(`Invitación ${matchingPreApproved.email} limpiada`);
          } else {
            results.errors.push(`No se pudo actualizar perfil ${nullProfile.full_name}: ${updateError.message}. NECESITAS ejecutar: CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: results.errors.length > 0 
        ? 'Sincronización parcial - algunos errores requieren acción adicional' 
        : 'Sincronización completada exitosamente',
      results
    });

  } catch (error) {
    console.error('Error en sync-profiles:', error);
    return NextResponse.json({ error: 'Error interno', details: error.message }, { status: 500 });
  }
}
