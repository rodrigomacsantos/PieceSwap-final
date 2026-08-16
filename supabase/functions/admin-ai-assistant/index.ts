import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ====== AUTHN + AUTHZ: admin only ======
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Não autenticado" }, 401);
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData.user) return jsonResponse({ error: "Não autenticado" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: isAdmin, error: roleErr } = await supabaseAdmin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return jsonResponse({ error: "Acesso negado" }, 403);
    }
    // =======================================

    const body = await req.json().catch(() => ({}));
    const { message, context, currentData } = body ?? {};
    if (typeof message !== "string" || message.trim().length === 0 || message.length > 4000) {
      return jsonResponse({ error: "Mensagem inválida" }, 400);
    }
    if (context !== undefined && (typeof context !== "string" || context.length > 100)) {
      return jsonResponse({ error: "Contexto inválido" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { data: agent } = await supabaseAdmin
      .from("ai_agents")
      .select("system_prompt, model, temperature, is_active")
      .eq("agent_key", "admin_assistant")
      .maybeSingle();

    if (agent && agent.is_active === false) {
      return jsonResponse({ message: "O Admin AI Assistant está desativado.", action: null });
    }

    const basePrompt = agent?.system_prompt ?? `Tu és um assistente de administração para a plataforma PieceSwap.
O admin vai descrever o que quer em linguagem natural e tu deves interpretar e devolver uma ação estruturada em JSON.

IMPORTANTE: Responde SEMPRE em JSON válido com esta estrutura:
{
  "message": "descrição amigável do que vais fazer",
  "action": {
    "type": "tipo_da_acao",
    "description": "descrição curta da ação",
    "data": { ... dados estruturados ... }
  }
}

Se não conseguires interpretar o pedido, responde:
{ "message": "explicação do que não percebi", "action": null }`;

    let systemPrompt = basePrompt + "\n";

    if (context === "subscription_plans") {
      systemPrompt += `
Contexto: Gestão de planos de subscrição premium.
Planos existentes: ${JSON.stringify(currentData)}

Cada plano tem estes campos:
- name: nome do plano (string)
- price: preço mensal em EUR (number)
- daily_superlike_limit: número de superlikes por dia (number)
- daily_swipe_limit: número de swipes por dia, 0 = ilimitado (number)
- can_highlight: pode destacar anúncios (boolean)
- priority_boost: nível de boost de prioridade, 0 = sem boost (number)

Tipos de ação possíveis:
- "create_plan": criar novo plano
- "update_plan": editar plano existente (inclui "original_name" no data se o nome mudar)
`;
    } else if (context === "swapcoins_packages") {
      systemPrompt += `
Contexto: Gestão de pacotes de SwapCoins.
Pacotes existentes: ${JSON.stringify(currentData)}

Cada pacote tem:
- name: nome do pacote (string)
- coins: número de moedas (number)
- price_eur: preço em EUR (number)
- bonus_coins: moedas bónus (number, default 0)

Tipos de ação:
- "create_package": criar pacote
- "update_package": editar pacote (inclui "original_name" no data)
`;
    } else if (context === "site_config") {
      systemPrompt += `
Contexto: Configurações gerais do site.
Configurações atuais: ${JSON.stringify(currentData)}

Tipos de ação:
- "update_config": atualizar configuração (data inclui key e value)
`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: agent?.model ?? "google/gemini-3-flash-preview",
        temperature: typeof agent?.temperature === "number" ? agent.temperature : 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return jsonResponse({ error: "Rate limit exceeded" }, 429);
      if (response.status === 402) return jsonResponse({ error: "Payment required" }, 402);
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { message: content, action: null };
    }

    return jsonResponse(parsed);
  } catch (e) {
    console.error("admin-ai-assistant error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
