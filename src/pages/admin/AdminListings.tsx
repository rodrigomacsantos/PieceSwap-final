import { useState, useEffect } from "react";
import { Search, MoreHorizontal, Eye, EyeOff, Trash2, Check, Filter, Rocket, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ConfirmActionDialog from "@/components/admin/ConfirmActionDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Listing {
  id: string;
  title: string;
  category: string;
  condition: string;
  status: string;
  price_swap_coins: number | null;
  user_id: string;
  created_at: string;
  images: string[];
  boost_expires_at: string | null;
}

const AdminListings = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedListings, setSelectedListings] = useState<string[]>([]);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<{ type: string; listingId?: string } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editListing, setEditListing] = useState<any | null>(null);
  const [editReason, setEditReason] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { logAction } = useAuditLog();
  const { toast } = useToast();

  useEffect(() => {
    fetchListings();
  }, [page, search, statusFilter]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("listings")
        .select("id, title, category, condition, status, price_swap_coins, user_id, created_at, images, boost_expires_at")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (search) {
        query = query.ilike("title", `%${search}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (reason?: string) => {
    if (!currentAction) return;

    const listingIds = currentAction.listingId 
      ? [currentAction.listingId] 
      : selectedListings;

    try {
      let newStatus = "";
      switch (currentAction.type) {
        case "approve":
          newStatus = "active";
          break;
        case "hide":
          newStatus = "hidden";
          break;
        case "delete":
          newStatus = "deleted";
          break;
      }

      const { error } = await supabase
        .from("listings")
        .update({ status: newStatus })
        .in("id", listingIds);

      if (error) throw error;

      for (const id of listingIds) {
        await logAction({
          action: `listing_${currentAction.type}`,
          entity_type: "listing",
          entity_id: id,
          new_value: { status: newStatus },
          reason,
        });
      }

      toast({
        title: "Ação concluída",
        description: `${listingIds.length} anúncio(s) atualizado(s) com sucesso.`,
      });

      setSelectedListings([]);
      fetchListings();
    } catch (error) {
      console.error("Error updating listings:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os anúncios.",
        variant: "destructive",
      });
    }

    setActionDialogOpen(false);
    setCurrentAction(null);
  };

  const openEdit = async (listingId: string) => {
    const { data, error } = await supabase
      .from("listings")
      .select("id, title, description, category, condition, price_swap_coins, price_eur")
      .eq("id", listingId)
      .maybeSingle();
    if (error || !data) {
      toast({ title: "Erro", description: "Não foi possível carregar o anúncio.", variant: "destructive" });
      return;
    }
    setEditListing(data);
    setEditReason("");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editListing) return;
    if (!editReason.trim()) {
      toast({ title: "Motivo obrigatório", description: "Indica o motivo da edição.", variant: "destructive" });
      return;
    }
    setSavingEdit(true);
    try {
      const { data: before } = await supabase
        .from("listings")
        .select("title, description, category, condition, price_swap_coins, price_eur")
        .eq("id", editListing.id)
        .maybeSingle();

      const updates = {
        title: editListing.title?.trim() || null,
        description: editListing.description?.trim() || null,
        category: editListing.category?.trim() || null,
        condition: editListing.condition?.trim() || null,
        price_swap_coins: editListing.price_swap_coins === "" || editListing.price_swap_coins == null
          ? null : Number(editListing.price_swap_coins),
        price_eur: editListing.price_eur === "" || editListing.price_eur == null
          ? null : Number(editListing.price_eur),
      };

      const { error } = await supabase.from("listings").update(updates).eq("id", editListing.id);
      if (error) throw error;

      await logAction({
        action: "listing_edit",
        entity_type: "listing",
        entity_id: editListing.id,
        old_value: before || undefined,
        new_value: updates,
        reason: editReason,
      });

      toast({ title: "Anúncio atualizado", description: "As alterações foram guardadas." });
      setEditOpen(false);
      setEditListing(null);
      fetchListings();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Não foi possível guardar.", variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedListings.length === listings.length) {
      setSelectedListings([]);
    } else {
      setSelectedListings(listings.map(l => l.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedListings(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      pending: "secondary",
      hidden: "outline",
      deleted: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestão de Anúncios</h1>
        <p className="text-muted-foreground">Aprovar, ocultar ou remover anúncios</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar anúncios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="hidden">Ocultos</SelectItem>
            <SelectItem value="deleted">Removidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedListings.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selectedListings.length} selecionado(s)</span>
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCurrentAction({ type: "approve" });
                setActionDialogOpen(true);
              }}
            >
              <Check className="h-4 w-4 mr-1" />
              Aprovar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCurrentAction({ type: "hide" });
                setActionDialogOpen(true);
              }}
            >
              <EyeOff className="h-4 w-4 mr-1" />
              Ocultar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setCurrentAction({ type: "delete" });
                setActionDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remover
            </Button>
          </div>
        </div>
      )}

      {/* Listings Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedListings.length === listings.length && listings.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Anúncio</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Condição</TableHead>
              <TableHead>Preço (SC)</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Boost</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  A carregar...
                </TableCell>
              </TableRow>
            ) : listings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum anúncio encontrado
                </TableCell>
              </TableRow>
            ) : (
              listings.map((listing) => (
                <TableRow key={listing.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedListings.includes(listing.id)}
                      onCheckedChange={() => toggleSelect(listing.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {listing.images?.[0] && (
                        <img
                          src={listing.images[0]}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                      )}
                      <span className="font-medium line-clamp-1">{listing.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>{listing.category}</TableCell>
                  <TableCell>{listing.condition}</TableCell>
                  <TableCell>
                    {listing.price_swap_coins ? `${listing.price_swap_coins} SC` : "—"}
                  </TableCell>
                  <TableCell>{getStatusBadge(listing.status)}</TableCell>
                  <TableCell>
                    {listing.boost_expires_at && new Date(listing.boost_expires_at) > new Date() ? (
                      <Badge variant="default" className="gap-1 text-xs">
                        <Rocket className="w-3 h-3" />
                        Ativo
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(listing.created_at).toLocaleDateString("pt-PT")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <a href={`/product/${listing.id}`} target="_blank" rel="noopener">
                            <Eye className="h-4 w-4 mr-2" />
                            Ver anúncio
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(listing.id)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar campos
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setCurrentAction({ type: "approve", listingId: listing.id });
                            setActionDialogOpen(true);
                          }}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Aprovar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setCurrentAction({ type: "hide", listingId: listing.id });
                            setActionDialogOpen(true);
                          }}
                        >
                          <EyeOff className="h-4 w-4 mr-2" />
                          Ocultar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setCurrentAction({ type: "delete", listingId: listing.id });
                            setActionDialogOpen(true);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
        >
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">Página {page + 1}</span>
        <Button
          variant="outline"
          onClick={() => setPage(page + 1)}
          disabled={listings.length < pageSize}
        >
          Próxima
        </Button>
      </div>

      {/* Action Dialog */}
      <ConfirmActionDialog
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        title={
          currentAction?.type === "approve" ? "Aprovar Anúncio(s)" :
          currentAction?.type === "hide" ? "Ocultar Anúncio(s)" :
          "Remover Anúncio(s)"
        }
        description={
          currentAction?.type === "delete"
            ? "Esta ação vai marcar o(s) anúncio(s) como removido(s). Os utilizadores não poderão vê-los."
            : `Tens a certeza que queres ${currentAction?.type === "approve" ? "aprovar" : "ocultar"} o(s) anúncio(s) selecionado(s)?`
        }
        actionLabel={
          currentAction?.type === "approve" ? "Aprovar" :
          currentAction?.type === "hide" ? "Ocultar" :
          "Remover"
        }
        variant={currentAction?.type === "delete" ? "destructive" : "default"}
        requireReason={currentAction?.type !== "approve"}
        onConfirm={handleAction}
      />

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Anúncio</DialogTitle>
            <DialogDescription>
              Altera os campos essenciais. O motivo é obrigatório e fica registado no audit log.
            </DialogDescription>
          </DialogHeader>
          {editListing && (
            <div className="space-y-3">
              <div>
                <Label>Título</Label>
                <Input
                  value={editListing.title || ""}
                  onChange={(e) => setEditListing({ ...editListing, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Categoria</Label>
                  <Input
                    value={editListing.category || ""}
                    onChange={(e) => setEditListing({ ...editListing, category: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Condição</Label>
                  <Input
                    value={editListing.condition || ""}
                    onChange={(e) => setEditListing({ ...editListing, condition: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Preço (SC)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editListing.price_swap_coins ?? ""}
                    onChange={(e) => setEditListing({ ...editListing, price_swap_coins: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Preço (€)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={editListing.price_eur ?? ""}
                    onChange={(e) => setEditListing({ ...editListing, price_eur: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  rows={4}
                  value={editListing.description || ""}
                  onChange={(e) => setEditListing({ ...editListing, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Motivo da edição *</Label>
                <Textarea
                  rows={2}
                  placeholder="Ex.: corrigir título enganador, ajustar categoria errada..."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingEdit}>
              Cancelar
            </Button>
            <Button onClick={saveEdit} disabled={savingEdit || !editReason.trim()}>
              {savingEdit ? "A guardar..." : "Guardar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminListings;
