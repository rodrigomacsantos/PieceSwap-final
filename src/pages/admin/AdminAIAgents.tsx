import { useEffect, useState } from "react";
import {
  Bot, Save, Trash2, ThumbsUp, ThumbsDown, Star, StarOff, Loader2,
  Pencil, Sparkles, MessageSquare, Wand2, ShieldCheck, Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";

type Agent = {
  id: string;
  agent_key: string;
  name: string;
  description: string | null;
  model: string;
  temperature: number;
  system_prompt: string;
  is_active: boolean;
  updated_at: string;
};

type Feedback = {
  id: string;
  agent_key: string;
  user_id: string | null;
  user_message: string;
  assistant_message: string;
  rating: number;
  comment: string | null;
  promoted_as_example: boolean;
  created_at: string;
};

const MODELS: { value: string; label: string; hint: string }[] = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (Rápido)", hint: "Rápido e barato — recomendado" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", hint: "Equilíbrio custo/qualidade" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", hint: "Mais barato, tarefas simples" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", hint: "Raciocínio complexo, multimodal" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini", hint: "Boa relação custo/qualidade" },
  { value: "openai/gpt-5", label: "GPT-5", hint: "Máxima qualidade, mais caro" },
];

const AGENT_ICONS: Record<string, { icon: React.ElementType; tone: string }> = {
  swapbot: { icon: MessageSquare, tone: "text-blue-500 bg-blue-500/10" },
  ai_autofill: { icon: Wand2, tone: "text-purple-500 bg-purple-500/10" },
  admin_assistant: { icon: ShieldCheck, tone: "text-amber-500 bg-amber-500/10" },
};

const AdminAIAgents = () => {
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [feedbackAgent, setFeedbackAgent] = useState<Agent | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: a }, { data: f }] = await Promise.all([
      supabase.from("ai_agents" as any).select("*").order("name"),
      supabase.from("ai_agent_feedback" as any).select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setAgents((a as any) ?? []);
    setFeedback((f as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const saveAgent = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("ai_agents" as any)
      .update({
        name: editing.name,
        description: editing.description,
        model: editing.model,
        temperature: editing.temperature,
        system_prompt: editing.system_prompt,
        is_active: editing.is_active,
      })
      .eq("id", editing.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Guardado", description: `${editing.name} atualizado` });
      logAction({ action: "update", entity_type: "ai_agent", entity_id: editing.id, new_value: { agent_key: editing.agent_key } });
      setAgents((prev) => prev.map((a) => (a.id === editing.id ? editing : a)));
      setEditing(null);
    }
  };

  const toggleActive = async (agent: Agent, v: boolean) => {
    const { error } = await supabase.from("ai_agents" as any).update({ is_active: v }).eq("id", agent.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setAgents((prev) => prev.map((a) => (a.id === agent.id ? { ...a, is_active: v } : a)));
  };

  const togglePromote = async (fb: Feedback) => {
    const { error } = await supabase
      .from("ai_agent_feedback" as any)
      .update({ promoted_as_example: !fb.promoted_as_example })
      .eq("id", fb.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setFeedback((prev) => prev.map((x) => (x.id === fb.id ? { ...x, promoted_as_example: !x.promoted_as_example } : x)));
  };

  const deleteFeedback = async (id: string) => {
    const { error } = await supabase.from("ai_agent_feedback" as any).delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setFeedback((prev) => prev.filter((x) => x.id !== id));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const agentFb = feedbackAgent ? feedback.filter((f) => f.agent_key === feedbackAgent.agent_key) : [];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Agentes IA</h1>
            <p className="text-sm text-muted-foreground">Gere prompts, modelos e o aprendizado de cada agente da plataforma.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map((agent) => {
            const meta = AGENT_ICONS[agent.agent_key] ?? { icon: Sparkles, tone: "text-primary bg-primary/10" };
            const Icon = meta.icon;
            const fb = feedback.filter((f) => f.agent_key === agent.agent_key);
            const positive = fb.filter((f) => f.rating === 1).length;
            const negative = fb.filter((f) => f.rating === -1).length;
            const promoted = fb.filter((f) => f.promoted_as_example).length;

            return (
              <Card key={agent.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${meta.tone}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{agent.name}</CardTitle>
                        <p className="text-xs text-muted-foreground font-mono truncate">{agent.agent_key}</p>
                      </div>
                    </div>
                    <Switch checked={agent.is_active} onCheckedChange={(v) => toggleActive(agent, v)} />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                    {agent.description || "Sem descrição."}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md border border-border p-2">
                      <div className="text-muted-foreground">Modelo</div>
                      <div className="font-medium truncate">{MODELS.find((m) => m.value === agent.model)?.label ?? agent.model}</div>
                    </div>
                    <div className="rounded-md border border-border p-2">
                      <div className="text-muted-foreground">Temperatura</div>
                      <div className="font-medium">{agent.temperature.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={agent.is_active ? "default" : "outline"} className="text-xs">
                      {agent.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    <Badge variant="secondary" className="gap-1 text-xs"><ThumbsUp className="w-3 h-3" />{positive}</Badge>
                    <Badge variant="secondary" className="gap-1 text-xs"><ThumbsDown className="w-3 h-3" />{negative}</Badge>
                    <Badge className="gap-1 text-xs"><Star className="w-3 h-3" />{promoted}</Badge>
                  </div>

                  <div className="flex gap-2 mt-auto pt-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setFeedbackAgent(agent)}>
                      Feedback
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => setEditing({ ...agent })}>
                      <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ========== EDIT MODAL ========== */}
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                Editar Agente IA
              </DialogTitle>
              <DialogDescription>
                Configura o agente e o seu contexto de IA.
              </DialogDescription>
            </DialogHeader>

            {editing && (
              <div className="space-y-5 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Código do Agente</Label>
                    <Input value={editing.agent_key} disabled className="font-mono text-xs bg-muted" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome</Label>
                    <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Descrição</Label>
                  <Textarea
                    rows={2}
                    value={editing.description ?? ""}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    placeholder="Resume o propósito deste agente..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Estado</Label>
                    <Select
                      value={editing.is_active ? "active" : "inactive"}
                      onValueChange={(v) => setEditing({ ...editing, is_active: v === "active" })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Modelo de IA</Label>
                    <Select value={editing.model} onValueChange={(v) => setEditing({ ...editing, model: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MODELS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            <div className="flex flex-col">
                              <span>{m.label}</span>
                              <span className="text-xs text-muted-foreground">{m.hint}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <Label className="text-xs font-semibold">System Prompt (Contexto IA)</Label>
                    </div>
                  </div>
                  <Textarea
                    value={editing.system_prompt}
                    onChange={(e) => setEditing({ ...editing, system_prompt: e.target.value })}
                    rows={12}
                    className="font-mono text-xs bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Este prompt define o contexto IA do agente. Determina como interpreta e responde aos pedidos.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs">Temperatura</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">
                            Controla a criatividade da IA. <strong>Baixa (0–0.3)</strong>: respostas
                            consistentes e factuais. <strong>Média (0.4–0.8)</strong>: equilíbrio
                            ideal para conversação. <strong>Alta (0.9–2)</strong>: muito criativo
                            e imprevisível.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span className="text-sm font-mono font-semibold">{editing.temperature.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[editing.temperature]}
                    min={0} max={2} step={0.05}
                    onValueChange={([v]) => setEditing({ ...editing, temperature: v })}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Preciso</span>
                    <span>Equilibrado</span>
                    <span>Criativo</span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={saveAgent} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ========== FEEDBACK MODAL ========== */}
        <Dialog open={!!feedbackAgent} onOpenChange={(o) => !o && setFeedbackAgent(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Aprendizagem & Feedback — {feedbackAgent?.name}
              </DialogTitle>
              <DialogDescription>
                Respostas com 👍 são automaticamente promovidas a exemplos e injetadas no prompt nas próximas conversas.
              </DialogDescription>
            </DialogHeader>

            {agentFb.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                Ainda sem feedback para este agente.
              </p>
            ) : (
              <div className="space-y-3">
                {agentFb.map((fb) => (
                  <div key={fb.id} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {fb.rating === 1
                          ? <ThumbsUp className="w-4 h-4 text-green-600" />
                          : <ThumbsDown className="w-4 h-4 text-destructive" />}
                        {fb.promoted_as_example && (
                          <Badge variant="secondary" className="gap-1"><Star className="w-3 h-3" />exemplo</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(fb.created_at).toLocaleString("pt-PT")}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => togglePromote(fb)}
                          title={fb.promoted_as_example ? "Despromover" : "Promover a exemplo"}>
                          {fb.promoted_as_example ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteFeedback(fb.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm space-y-1">
                      <div><span className="text-muted-foreground text-xs">Utilizador:</span> <span className="whitespace-pre-wrap">{fb.user_message}</span></div>
                      <div><span className="text-muted-foreground text-xs">Agente:</span> <span className="whitespace-pre-wrap">{fb.assistant_message}</span></div>
                      {fb.comment && <div className="text-xs italic text-muted-foreground">"{fb.comment}"</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default AdminAIAgents;
