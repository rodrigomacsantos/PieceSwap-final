import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Coins, Loader2, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface PurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productTitle: string;
  amount: number;
  buyerBalance: number;
  savedAddress?: {
    street: string;
    city: string;
    zip: string;
    country: string;
  } | null;
  onConfirm: (address: { street: string; city: string; zip: string; country: string }, saveAddress: boolean) => Promise<void>;
}

const PurchaseModal = ({
  open,
  onOpenChange,
  productTitle,
  amount,
  buyerBalance,
  savedAddress,
  onConfirm,
}: PurchaseModalProps) => {
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("Portugal");
  const [saveAddress, setSaveAddress] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && savedAddress) {
      setStreet(savedAddress.street || "");
      setCity(savedAddress.city || "");
      setZip(savedAddress.zip || "");
      setCountry(savedAddress.country || "Portugal");
    }
  }, [open, savedAddress]);

  const isValid = street.trim() && city.trim() && zip.trim();

  const handleConfirm = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await onConfirm({ street: street.trim(), city: city.trim(), zip: zip.trim(), country: country.trim() }, saveAddress);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar Compra</DialogTitle>
          <DialogDescription>
            Estás prestes a comprar <strong>{productTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <div className="flex items-center gap-1.5 text-lg font-bold">
            <Coins className="w-5 h-5 text-lego-yellow" />
            {amount} SwapCoins
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-right">
          Saldo atual: {buyerBalance} SC → Saldo após: {buyerBalance - amount} SC
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="w-4 h-4" />
            Morada de Envio
          </div>
          <div className="space-y-2">
            <div>
              <Label htmlFor="street">Rua</Label>
              <Input id="street" value={street} onChange={e => setStreet(e.target.value)} placeholder="Rua e número" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" value={city} onChange={e => setCity(e.target.value)} placeholder="Cidade" />
              </div>
              <div>
                <Label htmlFor="zip">Código Postal</Label>
                <Input id="zip" value={zip} onChange={e => setZip(e.target.value)} placeholder="1000-001" />
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="save-address" checked={saveAddress} onCheckedChange={(v) => setSaveAddress(v === true)} />
            <label htmlFor="save-address" className="text-sm text-muted-foreground cursor-pointer">
              Guardar esta morada no meu perfil
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid || submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Coins className="w-4 h-4 mr-2" />}
            Confirmar Compra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseModal;
