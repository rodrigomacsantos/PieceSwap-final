import { useState } from "react";
import { Bot, Send, Check, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AdminAIAssistantProps {
  context: string; // "subscription_plans" | "swapcoins_packages" | "site_config"
  currentData: any;
  onAction: (action: any) => Promise<void>;
  placeholder?: string;
}

interface PendingAction {
  type: string;
  description: string;
  data: any;
}

const AdminAIAssistant = ({ context, currentData, onAction, placeholder }: AdminAIAssistantProps) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [aiResponse, setAiResponse] = useState("");
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setAiResponse("");
    setPendingAction(null);

    try {
      const { data, error } = await supabase.functions.invoke("admin-ai-assistant", {
        body: { message: input, context, currentData },
      });

      if (error) throw error;

      if (data?.action) {
        setPendingAction(data.action);
        setAiResponse(data.message || "Ação proposta:");
      } else {
        setAiResponse(data?.message || "Não consegui interpretar o pedido.");
      }
    } catch (error: any) {
      console.error("AI assistant error:", error);
      toast({ title: "Erro", description: "Erro ao comunicar com o assistente AI", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!pendingAction) return;
    setLoading(true);
    try {
      await onAction(pendingAction);
      toast({ title: "Sucesso", description: "Ação aplicada com sucesso!" });
      setPendingAction(null);
      setAiResponse("");
      setInput("");
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao aplicar ação", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = () => {
    setPendingAction(null);
    setAiResponse("");
  };

  const renderActionPreview = () => {
    if (!pendingAction) return null;
    const { data } = pendingAction;

    return (
      <div className="mt-3 p-3 bg-muted rounded-lg border space-y-2">
        <p className="text-sm font-medium text-foreground">{pendingAction.description}</p>
        <div className="text-sm space-y-1">
          {data.name && <div><span className="text-muted-foreground">Nome:</span> <span className="font-medium">{data.name}</span></div>}
          {data.price != null && <div><span className="text-muted-foreground">Preço:</span> <span className="font-medium">€{data.price}</span></div>}
          {data.daily_superlike_limit != null && <div><span className="text-muted-foreground">Superlikes/dia:</span> <span className="font-medium">{data.daily_superlike_limit}</span></div>}
          {data.daily_swipe_limit != null && <div><span className="text-muted-foreground">Swipes/dia:</span> <span className="font-medium">{data.daily_swipe_limit === 0 ? "Ilimitados" : data.daily_swipe_limit}</span></div>}
          {data.can_highlight != null && <div><span className="text-muted-foreground">Destaque:</span> <span className="font-medium">{data.can_highlight ? "Sim" : "Não"}</span></div>}
          {data.priority_boost != null && <div><span className="text-muted-foreground">Boost:</span> <span className="font-medium">{data.priority_boost > 0 ? `${data.priority_boost}x` : "Não"}</span></div>}
          {data.coins != null && <div><span className="text-muted-foreground">Moedas:</span> <span className="font-medium">{data.coins} SC</span></div>}
          {data.bonus_coins != null && <div><span className="text-muted-foreground">Bónus:</span> <span className="font-medium">{data.bonus_coins} SC</span></div>}
          {data.price_eur != null && <div><span className="text-muted-foreground">Preço:</span> <span className="font-medium">€{data.price_eur}</span></div>}
        </div>
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={handleConfirm} disabled={loading}>
            <Check className="w-4 h-4 mr-1" />
            Confirmar
          </Button>
          <Button size="sm" variant="outline" onClick={handleReject}>
            <X className="w-4 h-4 mr-1" />
            Cancelar
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          Assistente AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder || "Descreve o que queres fazer..."}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            disabled={loading}
          />
          <Button onClick={handleSubmit} disabled={loading || !input.trim()} size="icon">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        {aiResponse && (
          <p className="text-sm text-muted-foreground">{aiResponse}</p>
        )}
        {renderActionPreview()}
      </CardContent>
    </Card>
  );
};

export default AdminAIAssistant;
