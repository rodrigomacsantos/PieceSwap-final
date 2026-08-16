import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Coins, Package, Truck, CheckCircle, XCircle, Loader2, ShoppingBag, LifeBuoy, Star } from "lucide-react";
import { useOrders, Order } from "@/hooks/useOrders";
import { useReviews } from "@/hooks/useReviews";
import { useAuth } from "@/hooks/useAuth";
import ReviewModal from "@/components/ReviewModal";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pendente", color: "bg-lego-yellow text-foreground", icon: <Package className="w-3.5 h-3.5" /> },
  shipped: { label: "Enviado", color: "bg-lego-blue text-white", icon: <Truck className="w-3.5 h-3.5" /> },
  completed: { label: "Concluído", color: "bg-lego-green text-white", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  cancelled: { label: "Cancelado", color: "bg-destructive text-destructive-foreground", icon: <XCircle className="w-3.5 h-3.5" /> },
};

const OrderCard = ({
  order,
  role,
  onAction,
  actionLoading,
  onSupport,
  onReview,
  reviewedOrders,
}: {
  order: Order;
  role: "buyer" | "seller";
  onAction: (orderId: string, action: string) => void;
  actionLoading: string | null;
  onSupport: (order: Order) => void;
  onReview: (order: Order) => void;
  reviewedOrders: Set<string>;
}) => {
  const status = statusConfig[order.status] || statusConfig.pending;
  const otherProfile = role === "buyer" ? order.seller_profile : order.buyer_profile;
  const otherName = otherProfile?.full_name || otherProfile?.username || "Utilizador";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            <img
              src={order.listing?.images?.[0] || "/placeholder.svg"}
              alt={order.listing?.title || "Produto"}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-medium text-sm line-clamp-1">{order.listing?.title || "Produto"}</h4>
              <Badge className={`${status.color} flex items-center gap-1 text-xs flex-shrink-0`}>
                {status.icon}
                {status.label}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
              <Coins className="w-3.5 h-3.5 text-lego-yellow" />
              {role === "seller" ? (
                <span>
                  <span className="font-medium text-foreground">+{Math.round(order.amount_swapcoins * 0.95)} SC</span>
                  <span className="text-xs ml-1">(5% comissão de {order.amount_swapcoins} SC)</span>
                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 ml-1">• pendente</span>
                  )}
                </span>
              ) : (
                <span>{order.amount_swapcoins} SwapCoins</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar className="w-4 h-4">
                <AvatarImage src={otherProfile?.avatar_url || undefined} />
                <AvatarFallback className="text-[8px]">{otherName[0]}</AvatarFallback>
              </Avatar>
              {role === "buyer" ? "Vendedor" : "Comprador"}: {otherName}
              <span>•</span>
              {format(new Date(order.created_at), "d MMM yyyy", { locale: pt })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3 justify-end flex-wrap">
          {role === "seller" && order.status === "pending" && (
            <Button
              size="sm"
              onClick={() => onAction(order.id, "shipped")}
              disabled={actionLoading === order.id}
            >
              {actionLoading === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Truck className="w-3.5 h-3.5 mr-1" />}
              Marcar como Enviado
            </Button>
          )}
          {order.status === "pending" && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onAction(order.id, "cancel")}
              disabled={actionLoading === order.id}
            >
              {actionLoading === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
              {role === "buyer" ? "Cancelar Compra" : "Cancelar Venda"}
            </Button>
          )}
          {role === "buyer" && order.status === "shipped" && (
            <Button
              size="sm"
              onClick={() => onAction(order.id, "completed")}
              disabled={actionLoading === order.id}
            >
              {actionLoading === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle className="w-3.5 h-3.5 mr-1" />}
              Confirmar Receção
            </Button>
          )}
          {(order.status === "shipped" || order.status === "pending") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSupport(order)}
            >
              <LifeBuoy className="w-3.5 h-3.5 mr-1" />
              Suporte
            </Button>
          )}
          {order.status === "completed" && !reviewedOrders.has(order.id) && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onReview(order)}
            >
              <Star className="w-3.5 h-3.5 mr-1" />
              Avaliar
            </Button>
          )}
          {order.status === "completed" && reviewedOrders.has(order.id) && (
            <Badge variant="outline" className="text-xs gap-1">
              <Star className="w-3 h-3 fill-lego-yellow text-lego-yellow" />
              Avaliado
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <Card className="border-dashed">
    <CardContent className="py-12 text-center">
      <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </CardContent>
  </Card>
);

const OrdersSection = () => {
  const { purchases, sales, loading, cancelOrder, updateOrderStatus } = useOrders();
  const { hasReviewedOrder, submitReview, loading: reviewLoading } = useReviews();
  const { user } = useAuth();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewedOrders, setReviewedOrders] = useState<Set<string>>(new Set());
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const navigate = useNavigate();

  // Check which completed orders have been reviewed
  useEffect(() => {
    const checkReviews = async () => {
      const allOrders = [...purchases, ...sales].filter(o => o.status === 'completed');
      const reviewed = new Set<string>();
      for (const order of allOrders) {
        if (await hasReviewedOrder(order.id)) {
          reviewed.add(order.id);
        }
      }
      setReviewedOrders(reviewed);
    };
    if (purchases.length > 0 || sales.length > 0) {
      checkReviews();
    }
  }, [purchases, sales]);

  const handleAction = async (orderId: string, action: string) => {
    setActionLoading(orderId);
    try {
      if (action === "cancel") {
        await cancelOrder(orderId);
      } else {
        await updateOrderStatus(orderId, action);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleSupport = (order: Order) => {
    const params = new URLSearchParams({
      subject: "order",
      order_id: order.id,
      listing: order.listing?.title || "",
    });
    navigate(`/contact?${params.toString()}`);
  };

  const handleReview = (order: Order) => {
    setReviewOrder(order);
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async (rating: number, comment: string) => {
    if (!reviewOrder || !user) return false;
    const reviewedId = reviewOrder.buyer_id === user.id ? reviewOrder.seller_id : reviewOrder.buyer_id;
    const success = await submitReview(reviewOrder.id, reviewedId, rating, comment);
    if (success) {
      setReviewedOrders(prev => new Set([...prev, reviewOrder.id]));
    }
    return success;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
    <Tabs defaultValue="purchases">
      <TabsList className="grid grid-cols-2 mb-6 h-auto p-1 bg-muted">
        <TabsTrigger value="purchases" className="py-2.5 data-[state=active]:bg-card">
          Minhas Compras ({purchases.length})
        </TabsTrigger>
        <TabsTrigger value="sales" className="py-2.5 data-[state=active]:bg-card">
          Minhas Vendas ({sales.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="purchases">
        {purchases.length === 0 ? (
          <EmptyState message="Ainda não fizeste nenhuma compra." />
        ) : (
          <div className="space-y-4">
            {purchases.map(order => (
              <OrderCard key={order.id} order={order} role="buyer" onAction={handleAction} actionLoading={actionLoading} onSupport={handleSupport} onReview={handleReview} reviewedOrders={reviewedOrders} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="sales">
        {sales.length === 0 ? (
          <EmptyState message="Ainda não vendeste nenhum artigo." />
        ) : (
          <div className="space-y-4">
            {sales.map(order => (
              <OrderCard key={order.id} order={order} role="seller" onAction={handleAction} actionLoading={actionLoading} onSupport={handleSupport} onReview={handleReview} reviewedOrders={reviewedOrders} />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>

    {/* Review Modal */}
    <ReviewModal
      open={reviewModalOpen}
      onOpenChange={setReviewModalOpen}
      productTitle={reviewOrder?.listing?.title || "Artigo"}
      onSubmit={handleSubmitReview}
      loading={reviewLoading}
    />
    </>
  );
};

export default OrdersSection;
