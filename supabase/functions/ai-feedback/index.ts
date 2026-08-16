import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_AGENTS = new Set(["swapbot", "ai_autofill", "admin_assistant"]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require authentication — prevents anonymous prompt-poisoning of agent few-shot examples.
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Autenticação necessária" }, 401);
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Sessão inválida" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const { agent_key, user_message, assistant_message, rating, comment } = body ?? {};

    if (typeof agent_key !== "string" || !ALLOWED_AGENTS.has(agent_key)) {
      return json({ error: "agent_key inválido" }, 400);
    }
    if (typeof user_message !== "string" || typeof assistant_message !== "string") {
      return json({ error: "mensagens inválidas" }, 400);
    }
    if (user_message.length === 0 || assistant_message.length === 0) {
      return json({ error: "mensagens vazias" }, 400);
    }
    if (rating !== 1 && rating !== -1) {
      return json({ error: "rating deve ser 1 ou -1" }, 400);
    }
    if (comment !== undefined && comment !== null && typeof comment !== "string") {
      return json({ error: "comment inválido" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Basic anti-spam: cap feedback to 30 per user per day
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("ai_agent_feedback")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);
    if ((count ?? 0) >= 30) {
      return json({ error: "Limite diário de feedback atingido" }, 429);
    }

    const { error } = await supabase.from("ai_agent_feedback").insert({
      agent_key,
      user_id: userId,
      user_message: user_message.slice(0, 4000),
      assistant_message: assistant_message.slice(0, 8000),
      rating,
      comment: typeof comment === "string" && comment.trim() ? comment.trim().slice(0, 1000) : null,
    });

    if (error) {
      console.error("insert feedback error:", error);
      return json({ error: "Erro ao guardar feedback" }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("ai-feedback error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
