import { useState, useEffect } from "react";
import { Coins, Check, X, Loader2, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOffers, Offer } from "@/hooks/useOffers";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  accepted: "Aceite",
  rejected: "Recusada",
};

const statusColors: Record<string, string> = {
  pending: "bg-lego-yellow/10 text-lego-yellow border-lego-yellow/30",
  accepted: "bg-lego-green/10 text-lego-green border-lego-green/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

const OffersSection = () => {
  const { fetchReceivedOffers, fetchSentOffers, updateOfferStatus, loading } = useOffers();
  const [received, setReceived] = useState<Offer[]>([]);
  const [sent, setSent] = useState<Offer[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoadingData(true);
      const [r, s] = await Promise.all([fetchReceivedOffers(), fetchSentOffers()]);
      setReceived(r);
      setSent(s);
      setLoadingData(false);
    };
    load();
  }, [fetchReceivedOffers, fetchSentOffers]);

  const handleAction = async (offerId: string, status: 'accepted' | 'rejected') => {
    const success = await updateOfferStatus(offerId, status);
    if (success) {
      setReceived(prev => prev.map(o => o.id === offerId ? { ...o, status } : o));
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const renderOffer = (offer: Offer, isReceived: boolean) => {
    const name = isReceived
      ? (offer.buyer?.full_name || offer.buyer?.username || 'Utilizador')
      : (offer.listing?.title || 'Artigo');

    return (
      <Card key={offer.id}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {isReceived && (
              <Avatar className="w-10 h-10">
                <AvatarImage src={offer.buyer?.avatar_url || undefined} />
                <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            )}
            {!isReceived && offer.listing?.images?.[0] && (
              <img src={offer.listing.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm truncate">{isReceived ? name : offer.listing?.title}</p>
                <Badge variant="outline" className={statusColors[offer.status] || ''}>
                  {statusLabels[offer.status] || offer.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-semibold text-primary flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-lego-yellow" />
                  {offer.amount_swapcoins} SC
                </span>
                {offer.listing?.price_swap_coins && (
                  <span className="text-xs text-muted-foreground">/ {offer.listing.price_swap_coins} SC</span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {format(new Date(offer.created_at), "d MMM", { locale: pt })}
                </span>
              </div>
              {offer.seller_message && (
                <p className="text-xs text-muted-foreground mt-1 italic">"{offer.seller_message}"</p>
              )}
            </div>
          </div>
          {isReceived && offer.status === 'pending' && (
            <div className="flex gap-2 mt-3 justify-end">
              <Button size="sm" variant="outline" onClick={() => handleAction(offer.id, 'rejected')} disabled={loading}>
                <X className="w-3.5 h-3.5 mr-1" />Recusar
              </Button>
              <Button size="sm" onClick={() => handleAction(offer.id, 'accepted')} disabled={loading}>
                <Check className="w-3.5 h-3.5 mr-1" />Aceitar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Tabs defaultValue="received" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="received" className="flex-1">
          Recebidas {received.filter(o => o.status === 'pending').length > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">{received.filter(o => o.status === 'pending').length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="sent" className="flex-1">Enviadas</TabsTrigger>
      </TabsList>
      <TabsContent value="received" className="mt-4 space-y-3">
        {received.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <Coins className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Ainda não recebeste ofertas</p>
            </CardContent>
          </Card>
        ) : received.map(o => renderOffer(o, true))}
      </TabsContent>
      <TabsContent value="sent" className="mt-4 space-y-3">
        {sent.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <Coins className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Ainda não enviaste ofertas</p>
            </CardContent>
          </Card>
        ) : sent.map(o => renderOffer(o, false))}
      </TabsContent>
    </Tabs>
  );
};

export default OffersSection;
