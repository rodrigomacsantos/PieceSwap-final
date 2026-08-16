import { useState } from "react";
import { Sparkles, Loader2, MessageCircle, CheckCircle2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ExtractedData {
  title?: string;
  description?: string;
  category?: string;
  condition?: string;
  swapCoins?: number;
  quantity?: number;
  setNumber?: string;
  acceptsTrades?: boolean;
  allowsOffers?: boolean;
  listingType?: "sale" | "trade_only";
}

interface AIAutoFillProps {
  onAutoFill: (data: ExtractedData) => void;
}

const fieldLabels: Record<string, string> = {
  title: "Título",
  description: "Descrição",
  category: "Categoria",
  condition: "Condição",
  swapCoins: "Preço",
  acceptsTrades: "Disponível para trocas",
};

const AIAutoFill = ({ onAutoFill }: AIAutoFillProps) => {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [previousData, setPreviousData] = useState<ExtractedData | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const handleAutoFill = async () => {
    if (text.trim().length < 5) {
      toast({ title: "Escreve um pouco mais", description: "Descreve o teu artigo para a IA conseguir preencher.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-autofill-listing", {
        body: { text, previousData },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { _missingFields, _followUpQuestion, _photosReminder, ...extracted } = data;

      onAutoFill(extracted);
      setPreviousData(extracted);

      if (_missingFields && _missingFields.length > 0) {
        setMissingFields(_missingFields);
        setFollowUp(_followUpQuestion);
        setText("");
        setIsComplete(false);
      } else {
        setFollowUp(null);
        setMissingFields([]);
        setIsComplete(true);
        toast({ title: "Campos preenchidos! ✨", description: "Todos os campos foram preenchidos. Revê abaixo." });
      }
    } catch (err: any) {
      toast({ title: "Erro ao processar", description: err?.message || "Tenta novamente.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setText("");
    setFollowUp(null);
    setMissingFields([]);
    setPreviousData(null);
    setIsComplete(false);
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Preenchimento com IA
        </CardTitle>
        <CardDescription>
          Descreve o teu artigo de forma natural e a IA preenche os campos automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Follow-up question from AI */}
        {followUp && (
          <div className="flex gap-3 p-4 bg-muted/50 rounded-xl border border-border">
            <MessageCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">{followUp}</p>
              <div className="flex flex-wrap gap-1.5">
                {missingFields.map((field) => (
                  <Badge key={field} variant="secondary" className="text-xs">
                    {fieldLabels[field] || field}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Success state */}
        {isComplete && (
          <div className="space-y-3">
            <div className="flex gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20">
              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Tudo preenchido! ✨</p>
                <p className="text-xs text-muted-foreground mt-1">Revê os campos abaixo e ajusta o que precisares.</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={handleReset} className="text-xs">
                Recomeçar
              </Button>
            </div>
            <div className="flex gap-3 p-3 bg-muted/40 rounded-xl border border-border">
              <Camera className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Não te esqueças de adicionar <span className="font-medium text-foreground">fotografias do produto</span> abaixo! 📸
              </p>
            </div>
          </div>
        )}

        {!isComplete && (
          <>
            <Textarea
              placeholder={followUp 
                ? 'Ex: "É usado mas está em bom estado, quero 150 SwapCoins"' 
                : 'Ex: "Tenho uma minifigura do Darth Vader em bom estado, quero vender por 200 SwapCoins e também aceito trocas"'
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="resize-none bg-background"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleAutoFill}
                disabled={isLoading || text.trim().length < 5}
                className="flex-1 sm:flex-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A processar...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {followUp ? "Completar" : "Preencher com IA"}
                  </>
                )}
              </Button>
              {previousData && (
                <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
                  Recomeçar
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AIAutoFill;
