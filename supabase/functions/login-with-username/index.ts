import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return new Response(
        JSON.stringify({ error: 'Identifier and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    let emailToUse = identifier;

    // If not an email, resolve username to email server-side
    if (!identifier.includes('@')) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', identifier)
        .maybeSingle();

      if (profileError) {
        console.error('Profile lookup error');
        return new Response(
          JSON.stringify({ error: 'Invalid login credentials' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!profile) {
        // Return same generic error to prevent username enumeration
        return new Response(
          JSON.stringify({ error: 'Invalid login credentials' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id);

      if (authError || !authUser?.user?.email) {
        return new Response(
          JSON.stringify({ error: 'Invalid login credentials' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      emailToUse = authUser.user.email;
    }

    // Perform the actual login server-side using anon key client (to get proper session tokens)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: signInData, error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email: emailToUse,
      password,
    });

    if (signInError || !signInData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid login credentials' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if account is suspended
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('is_suspended, suspended_reason')
      .eq('id', signInData.user.id)
      .maybeSingle();

    if (profileData?.is_suspended) {
      return new Response(
        JSON.stringify({
          error: 'account_suspended',
          message: 'A tua conta foi suspensa.',
          reason: profileData.suspended_reason || null,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return session tokens — never the email
    return new Response(
      JSON.stringify({
        access_token: signInData.session?.access_token,
        refresh_token: signInData.session?.refresh_token,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Login function error');
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
