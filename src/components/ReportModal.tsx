import { useState } from "react";
import { Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: "listing" | "user";
  reportedListingId?: string;
  reportedUserId?: string;
  reportedItemName?: string;
}

const REPORT_REASONS = {
  listing: [
    { value: "fake_listing", label: "Anúncio falso ou fraudulento" },
    { value: "wrong_category", label: "Categoria incorreta" },
    { value: "inappropriate_content", label: "Conteúdo inapropriado" },
    { value: "counterfeit", label: "Produto contrafeito" },
    { value: "price_gouging", label: "Preço abusivo" },
    { value: "duplicate", label: "Anúncio duplicado" },
    { value: "other", label: "Outro motivo" },
  ],
  user: [
    { value: "harassment", label: "Assédio ou comportamento abusivo" },
    { value: "scam", label: "Tentativa de fraude" },
    { value: "fake_profile", label: "Perfil falso" },
    { value: "spam", label: "Spam" },
    { value: "inappropriate_behavior", label: "Comportamento inapropriado" },
    { value: "other", label: "Outro motivo" },
  ],
};

const ReportModal = ({
  open,
  onOpenChange,
  reportType,
  reportedListingId,
  reportedUserId,
  reportedItemName,
}: ReportModalProps) => {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Precisas de iniciar sessão para reportar.",
        variant: "destructive",
      });
      return;
    }

    if (!reason) {
      toast({
        title: "Erro",
        description: "Por favor, seleciona um motivo.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        report_type: reportType,
        reported_listing_id: reportType === "listing" ? reportedListingId : null,
        reported_user_id: reportType === "user" ? reportedUserId : null,
        reason,
        description: description.trim() || null,
        status: "new",
      });

      if (error) throw error;

      toast({
        title: "Report enviado",
        description: "Obrigado pelo teu feedback. Vamos analisar a tua denúncia.",
      });

      // Reset form and close
      setReason("");
      setDescription("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting report:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o report. Tenta novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const reasons = REPORT_REASONS[reportType];
  const title = reportType === "listing" ? "Reportar Anúncio" : "Reportar Utilizador";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {reportedItemName && (
              <span className="font-medium text-foreground">{reportedItemName}</span>
            )}
            {reportedItemName && <br />}
            Ajuda-nos a manter a comunidade segura reportando conteúdo inadequado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo do report *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Seleciona um motivo..." />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreve o problema com mais detalhe..."
              className="min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !reason}>
            {submitting ? "A enviar..." : "Enviar Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportModal;
