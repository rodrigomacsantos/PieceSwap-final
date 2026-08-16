import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const categories = [
  "minifiguras", "peças básicas", "peças técnicas", "sets completos",
  "sets incompletos", "peças raras", "acessórios", "placas base"
];
const conditions = ["new", "like-new", "good", "fair"];

const REQUIRED_FIELDS = ["title", "description", "category", "condition", "swapCoins"] as const;

const fieldLabels: Record<string, string> = {
  title: "título",
  description: "descrição",
  category: "categoria",
  condition: "condição",
  swapCoins: "preço em SwapCoins",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require authentication to prevent anonymous abuse of LOVABLE_API_KEY credits.
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Autenticação necessária" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, previousData } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 5 || text.length > 5000) {
      return new Response(JSON.stringify({ error: "Texto inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Load agent config from DB (with fallback)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: agent } = await supabase
      .from("ai_agents")
      .select("system_prompt, model, temperature, is_active")
      .eq("agent_key", "ai_autofill")
      .maybeSingle();

    if (agent && agent.is_active === false) {
      return new Response(JSON.stringify({ error: "AI autofill está desativado pelo admin." }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const basePrompt = agent?.system_prompt ?? `Extrai informação de um anúncio de peças LEGO escrito em linguagem natural. Usa tool calling para devolver os campos estruturados. Se não conseguires inferir um campo, omite-o.`;
    let systemPrompt = `${basePrompt}\n\nCategorias válidas (lowercase): ${categories.join(", ")}. Condições válidas: ${conditions.join(", ")}.`;


    let userMessage = text;

    // If we have previous data, tell the AI to merge
    if (previousData && typeof previousData === "object") {
      const existingFields = Object.entries(previousData)
        .filter(([_, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      
      systemPrompt += `\n\nO utilizador já forneceu estes dados anteriormente: ${existingFields}. Agora está a fornecer informação adicional. Devolve TODOS os campos (os anteriores + os novos/atualizados). Os novos valores sobrepõem os anteriores.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: agent?.model ?? "google/gemini-2.5-flash",
        temperature: typeof agent?.temperature === "number" ? agent.temperature : 0.3,

        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_listing",
              description: "Extrai campos de um anúncio LEGO a partir de texto livre",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Título curto e descritivo do anúncio" },
                  description: { type: "string", description: "Descrição detalhada do artigo" },
                  category: { type: "string", enum: categories, description: "Categoria do artigo" },
                  condition: { type: "string", enum: conditions, description: "Condição do artigo" },
                  swapCoins: { type: "number", description: "Preço em SwapCoins (número inteiro)" },
                  quantity: { type: "number", description: "Quantidade" },
                  setNumber: { type: "string", description: "Número do set LEGO se mencionado" },
                  acceptsTrades: { type: "boolean", description: "Se aceita trocas" },
                  allowsOffers: { type: "boolean", description: "Se permite ofertas" },
                  listingType: { type: "string", enum: ["sale", "trade_only"], description: "Tipo: venda ou apenas troca" },
                },
                required: ["title", "description"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_listing" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiados pedidos, tenta novamente em breve." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const extracted = JSON.parse(toolCall.function.arguments);

    // Merge with previous data if present
    const merged = previousData ? { ...previousData, ...extracted } : extracted;

    // Check for missing required fields
    const missingFields: string[] = [];
    for (const field of REQUIRED_FIELDS) {
      const val = merged[field];
      if (val === undefined || val === null || val === "") {
        missingFields.push(field);
      }
    }

    // For trade_only listings, swapCoins is not required
    if (merged.listingType === "trade_only") {
      const idx = missingFields.indexOf("swapCoins");
      if (idx !== -1) missingFields.splice(idx, 1);
    }

    // Check if sale listing hasn't specified acceptsTrades
    const needsTradeQuestion = merged.listingType !== "trade_only" && merged.acceptsTrades === undefined;

    // Generate a friendly follow-up question if fields are missing
    let followUpQuestion: string | null = null;
    if (missingFields.length > 0) {
      const missingLabels = missingFields.map(f => fieldLabels[f] || f);
      if (missingLabels.length === 1) {
        followUpQuestion = `Só falta o ${missingLabels[0]}! Podes indicar?`;
      } else {
        const last = missingLabels.pop();
        followUpQuestion = `Ainda falta ${missingLabels.join(", ")} e ${last}. Podes completar?`;
      }
      if (needsTradeQuestion) {
        followUpQuestion += ` E queres que o anúncio também esteja disponível para trocas?`;
        missingFields.push("acceptsTrades");
      }
    } else if (needsTradeQuestion) {
      followUpQuestion = `Queres que o anúncio também esteja disponível para trocas no Swipe to Match?`;
      missingFields.push("acceptsTrades");
    }

    // If everything is filled, remind about photos
    let photosReminder: string | null = null;
    if (missingFields.length === 0) {
      photosReminder = "Não te esqueças de adicionar fotografias do produto! 📸";
    }

    return new Response(JSON.stringify({
      ...merged,
      _missingFields: missingFields,
      _followUpQuestion: followUpQuestion,
      _photosReminder: photosReminder,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-autofill-listing error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
