import { useState } from "react";
import { Coins, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOffers } from "@/hooks/useOffers";
import { useMessages } from "@/hooks/useMessages";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface OfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  sellerId: string;
  listingTitle: string;
  askingPrice: number;
}

const OfferModal = ({ open, onOpenChange, listingId, sellerId, listingTitle, askingPrice }: OfferModalProps) => {
  const [amount, setAmount] = useState("");
  const { createOffer, loading } = useOffers();
  const { createConversation, sendMessage } = useMessages();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  const balance = profile?.swap_coins ?? 0;
  const parsedAmount = parseInt(amount) || 0;
  const insufficientBalance = parsedAmount > balance;

  const handleSubmit = async () => {
    const value = parseInt(amount);
    if (!value || value <= 0) return;
    if (value > balance) {
      toast({ title: 'Saldo insuficiente', description: `Tens apenas ${balance} SC. Carrega a tua carteira primeiro.`, variant: 'destructive' });
      return;
    }
    const offerId = await createOffer(listingId, sellerId, value);
    if (offerId) {
      // Create or find chat conversation and send offer message
      const conv = await createConversation(sellerId, listingId);
      if (conv) {
        const offerContent = `[OFFER:${offerId}:${value}:${askingPrice}:pending] Fiz uma oferta de ${value} SC para "${listingTitle}" (preço pedido: ${askingPrice} SC)`;
        await sendMessage(conv.id, offerContent);
        setAmount("");
        onOpenChange(false);
        navigate(`/chats?conversation=${conv.id}`);
      } else {
        setAmount("");
        onOpenChange(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-lego-yellow" />
            Fazer Oferta
          </DialogTitle>
          <DialogDescription>
            Propõe um valor para <span className="font-medium text-foreground">"{listingTitle}"</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Preço pedido: <span className="font-semibold text-foreground">{askingPrice} SC</span></span>
            <span className="text-muted-foreground">Teu saldo: <span className="font-semibold text-foreground">{balance} SC</span></span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="offer-amount">A tua oferta (SwapCoins)</Label>
            <div className="relative">
              <Input
                id="offer-amount"
                type="number"
                min="1"
                max={balance}
                placeholder="Ex: 80"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`h-12 pr-16 ${insufficientBalance ? 'border-destructive' : ''}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">SC</span>
            </div>
            {insufficientBalance && (
              <p className="text-xs text-destructive">Saldo insuficiente. Tens apenas {balance} SC.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || !amount || parsedAmount <= 0 || insufficientBalance}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />A enviar...</> : "Enviar Oferta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OfferModal;
