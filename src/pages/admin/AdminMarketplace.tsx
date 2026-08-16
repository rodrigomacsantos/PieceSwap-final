import { useState, useEffect } from "react";
import { Search, RefreshCw, Eye, Undo2, CheckCircle, Package, Truck, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import StatCard from "@/components/admin/StatCard";

interface Order {
  id: string;
  listing_id: string;
  seller_id: string;
  buyer_id: string;
  amount_swapcoins: number;
  shipping_address: any;
  status: string;
  created_at: string;
  updated_at: string;
  listing_title?: string;
  seller_name?: string;
  buyer_name?: string;
}

const AdminMarketplace = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const { logAction } = useAuditLog();
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching orders:", error);
        setOrders([]);
        return;
      }

      // Fetch related data
      const enriched = await Promise.all(
        (data || []).map(async (order) => {
          const [listingRes, sellerRes, buyerRes] = await Promise.all([
            supabase.from("listings").select("title").eq("id", order.listing_id).maybeSingle(),
            supabase.from("profiles").select("username, full_name").eq("id", order.seller_id).maybeSingle(),
            supabase.from("profiles").select("username, full_name").eq("id", order.buyer_id).maybeSingle(),
          ]);

          return {
            ...order,
            listing_title: listingRes.data?.title,
            seller_name: sellerRes.data?.username || sellerRes.data?.full_name,
            buyer_name: buyerRes.data?.username || buyerRes.data?.full_name,
          };
        })
      );

      setOrders(enriched);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.id.toLowerCase().includes(s) ||
      o.listing_title?.toLowerCase().includes(s) ||
      o.seller_name?.toLowerCase().includes(s) ||
      o.buyer_name?.toLowerCase().includes(s)
    );
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pendente" },
      shipped: { variant: "outline", label: "Enviada" },
      completed: { variant: "default", label: "Concluída" },
      cancelled: { variant: "destructive", label: "Cancelada" },
    };
    const c = config[status] || { variant: "outline", label: status };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    completed: orders.filter((o) => o.status === "completed").length,
    totalSC: orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + o.amount_swapcoins, 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketplace</h1>
        <p className="text-muted-foreground">Gerir encomendas do marketplace</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Encomendas" value={stats.total} icon={ShoppingBag} />
        <StatCard title="Pendentes" value={stats.pending} icon={Package} />
        <StatCard title="Enviadas" value={stats.shipped} icon={Truck} />
        <StatCard title="Concluídas" value={stats.completed} icon={CheckCircle} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Volume Total (SC)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalSC.toLocaleString()} SC</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por ID, artigo, utilizador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="shipped">Enviada</SelectItem>
            <SelectItem value="completed">Concluída</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchOrders}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Artigo</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Comprador</TableHead>
                <TableHead>Valor (SC)</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    A carregar...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma encomenda encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}...</TableCell>
                    <TableCell>{order.listing_title || "-"}</TableCell>
                    <TableCell>{order.seller_name || "-"}</TableCell>
                    <TableCell>{order.buyer_name || "-"}</TableCell>
                    <TableCell className="font-medium">{order.amount_swapcoins.toLocaleString()} SC</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleDateString("pt-PT")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedOrder(order); setDetailOpen(true); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {order.status !== "cancelled" && order.status !== "completed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedOrder(order); setCancelDialogOpen(true); }}
                            className="text-destructive"
                          >
                            <Undo2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Encomenda</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">ID</p>
                  <p className="font-mono text-xs">{selectedOrder.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estado</p>
                  <div>{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div>
                  <p className="text-muted-foreground">Artigo</p>
                  <p>{selectedOrder.listing_title || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data</p>
                  <p>{new Date(selectedOrder.created_at).toLocaleString("pt-PT")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vendedor</p>
                  <p>{selectedOrder.seller_name || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Comprador</p>
                  <p>{selectedOrder.buyer_name || "-"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Valor</p>
                  <p className="text-lg font-bold">{selectedOrder.amount_swapcoins.toLocaleString()} SwapCoins</p>
                </div>
                {selectedOrder.shipping_address && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-1">Morada de Envio</p>
                    <div className="bg-muted rounded-lg p-3 text-sm">
                      <p>{selectedOrder.shipping_address.street}</p>
                      <p>{selectedOrder.shipping_address.zip} {selectedOrder.shipping_address.city}</p>
                      <p>{selectedOrder.shipping_address.country}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Encomenda</DialogTitle>
            <DialogDescription>
              Esta ação irá cancelar a encomenda e devolver os SwapCoins ao comprador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Motivo do cancelamento (obrigatório)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                Voltar
              </Button>
              <Button
                variant="destructive"
                disabled={!cancelReason.trim()}
                onClick={async () => {
                  if (!selectedOrder || !cancelReason.trim()) return;
                  
                  try {
                    const { error } = await supabase.rpc("cancel_order", {
                      p_order_id: selectedOrder.id,
                      p_user_id: selectedOrder.buyer_id,
                    });

                    if (error) throw error;

                    await logAction({
                      action: "admin_cancel_order",
                      entity_type: "order",
                      entity_id: selectedOrder.id,
                      old_value: { status: selectedOrder.status },
                      new_value: { status: "cancelled" },
                      reason: cancelReason,
                    });

                    toast({ title: "Encomenda cancelada", description: "SwapCoins devolvidos ao comprador." });
                    setCancelDialogOpen(false);
                    setCancelReason("");
                    setSelectedOrder(null);
                    fetchOrders();
                  } catch (err: any) {
                    toast({ title: "Erro", description: err.message || "Não foi possível cancelar", variant: "destructive" });
                  }
                }}
              >
                Confirmar Cancelamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMarketplace;
