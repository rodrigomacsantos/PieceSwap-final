
-- AI agents config table
CREATE TABLE public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  model text NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  temperature numeric NOT NULL DEFAULT 0.7,
  system_prompt text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_agents TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ai_agents TO authenticated;
GRANT ALL ON public.ai_agents TO service_role;

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active agents config"
  ON public.ai_agents FOR SELECT
  USING (true);

CREATE POLICY "Admins manage agents"
  ON public.ai_agents FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER ai_agents_updated_at
  BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Feedback table
CREATE TABLE public.ai_agent_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key text NOT NULL,
  user_id uuid,
  user_message text NOT NULL,
  assistant_message text NOT NULL,
  rating smallint NOT NULL CHECK (rating IN (-1, 1)),
  comment text,
  promoted_as_example boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_agent_feedback_agent_idx ON public.ai_agent_feedback(agent_key, promoted_as_example, created_at DESC);

GRANT SELECT, INSERT ON public.ai_agent_feedback TO anon, authenticated;
GRANT UPDATE, DELETE ON public.ai_agent_feedback TO authenticated;
GRANT ALL ON public.ai_agent_feedback TO service_role;

ALTER TABLE public.ai_agent_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback"
  ON public.ai_agent_feedback FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can see own feedback"
  ON public.ai_agent_feedback FOR SELECT
  USING (auth.uid() = user_id OR is_admin_user(auth.uid()));

CREATE POLICY "Admins manage feedback"
  ON public.ai_agent_feedback FOR UPDATE
  TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Admins delete feedback"
  ON public.ai_agent_feedback FOR DELETE
  TO authenticated
  USING (is_admin_user(auth.uid()));

-- Auto-promote positive feedback to examples
CREATE OR REPLACE FUNCTION public.auto_promote_positive_feedback()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.rating = 1 THEN
    NEW.promoted_as_example := true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ai_feedback_auto_promote
  BEFORE INSERT ON public.ai_agent_feedback
  FOR EACH ROW EXECUTE FUNCTION public.auto_promote_positive_feedback();

-- Seed 3 agents
INSERT INTO public.ai_agents (agent_key, name, description, model, temperature, system_prompt) VALUES
('swapbot', 'SwapBot', 'Assistente conversacional para utilizadores no site', 'google/gemini-3-flash-preview', 0.7,
'Tu és o SwapBot, o assistente virtual do PieceSwap — uma plataforma de compra, venda e troca de peças e sets LEGO entre colecionadores em Portugal.

O teu papel é ajudar os utilizadores de forma simpática, clara e concisa. Responde SEMPRE em português de Portugal.

## O que sabes sobre a plataforma:

### Páginas principais:
- **Página Inicial** (/): Landing page com visão geral da plataforma
- **Marketplace** (/marketplace): Comprar e vender sets e peças LEGO com SwapCoins
- **Swipe** (/swap): Sistema tipo Tinder para encontrar trocas — desliza para a direita se queres trocar, esquerda se não
- **Vender** (/sell): Criar um novo anúncio para vender ou trocar
- **Perfil** (/profile): Ver e editar o teu perfil, ver os teus anúncios
- **Chat** (/chats): Mensagens com outros utilizadores
- **Carteira** (/wallet): Ver saldo de SwapCoins e comprar mais
- **Premium** (/premium): Planos de subscrição com benefícios extra

### Conceitos importantes:
- **SwapCoins (SC)**: Moeda virtual da plataforma usada para comprar artigos no marketplace
- **Swipe to Match**: Sistema onde utilizadores deslizam em anúncios de outros — se ambos gostam, é match e podem trocar
- **Premium**: Plano pago que desbloqueia filtros avançados no swipe e outros benefícios

## Como responder:
1. Sê breve e direto (máximo 2-3 frases quando possível)
2. Quando relevante, sugere a página certa usando o formato: [nome da página](/caminho)
3. Se não sabes a resposta, sugere contactar o suporte em /contact
4. Nunca inventes funcionalidades que não existem
5. Usa emojis com moderação 🧱'),
('ai_autofill', 'AI Autofill (Anúncios)', 'Extrai dados estruturados de anúncios LEGO a partir de texto livre', 'google/gemini-2.5-flash', 0.3,
'Extrai informação de um anúncio de peças LEGO escrito em linguagem natural. Usa tool calling para devolver os campos estruturados. Se não conseguires inferir um campo, omite-o.'),
('admin_assistant', 'Admin AI Assistant', 'Assistente de admin para gerir planos, pacotes e configurações em linguagem natural', 'google/gemini-3-flash-preview', 0.3,
'Tu és um assistente de administração para a plataforma PieceSwap. O admin vai descrever o que quer em linguagem natural e tu deves interpretar e devolver uma ação estruturada em JSON.

IMPORTANTE: Responde SEMPRE em JSON válido com esta estrutura:
{
  "message": "descrição amigável do que vais fazer",
  "action": { "type": "tipo_da_acao", "description": "descrição curta", "data": { ... } }
}

Se não conseguires interpretar, responde: { "message": "explicação", "action": null }');
