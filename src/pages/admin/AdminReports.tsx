import { useState, useEffect } from "react";
import { Filter, MessageSquare, User, Package, ExternalLink, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_listing_id: string | null;
  report_type: string;
  reason: string;
  description: string | null;
  status: string;
  assigned_to: string | null;
  resolution: string | null;
  created_at: string;
}

interface ListingPreview {
  id: string;
  title: string;
  images: string[];
  status: string;
  user_id: string;
}

const AdminReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("new");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resolution, setResolution] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;
  
  // Listing preview and delete states
  const [listingPreview, setListingPreview] = useState<ListingPreview | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const { toast } = useToast();

  useEffect(() => {
    fetchReports();
  }, [page, statusFilter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let query = (supabase.from("reports" as any) as any)
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchListingPreview = async (listingId: string) => {
    try {
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, images, status, user_id")
        .eq("id", listingId)
        .single();

      if (error) throw error;
      setListingPreview(data);
    } catch (error) {
      console.error("Error fetching listing:", error);
      setListingPreview(null);
    }
  };

  const handleOpenReport = async (report: Report) => {
    setSelectedReport(report);
    setNewStatus(report.status);
    setResolution(report.resolution || "");
    
    if (report.reported_listing_id) {
      await fetchListingPreview(report.reported_listing_id);
    } else {
      setListingPreview(null);
    }
    
    setDialogOpen(true);
  };

  const handleUpdateReport = async () => {
    if (!selectedReport || !user) return;

    try {
      const updates: Record<string, any> = {
        status: newStatus,
        assigned_to: user.id,
      };

      if (newStatus === "resolved") {
        updates.resolution = resolution;
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await (supabase.from("reports" as any) as any)
        .update(updates)
        .eq("id", selectedReport.id);

      if (error) throw error;

      await logAction({
        action: "update_report",
        entity_type: "report",
        entity_id: selectedReport.id,
        old_value: { status: selectedReport.status },
        new_value: updates,
      });

      toast({
        title: "Report atualizado",
        description: "O report foi atualizado com sucesso.",
      });

      setDialogOpen(false);
      setResolution("");
      setNewStatus("");
      setSelectedReport(null);
      setListingPreview(null);
      fetchReports();
    } catch (error) {
      console.error("Error updating report:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o report.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteListing = async () => {
    if (!listingPreview || !selectedReport || !user) return;

    setDeleting(true);
    try {
      // Soft delete - mark listing as deleted
      const { error: listingError } = await supabase
        .from("listings")
        .update({ status: "deleted" })
        .eq("id", listingPreview.id);

      if (listingError) throw listingError;

      // Send notification to the listing owner
      await supabase.from("notifications").insert({
        user_id: listingPreview.user_id,
        title: "Anúncio removido",
        message: `O teu anúncio "${listingPreview.title}" foi removido por violar as regras da plataforma. Motivo: ${deleteReason}`,
        type: "warning",
        data: { listing_id: listingPreview.id, reason: deleteReason },
      });

      // Log the action
      await logAction({
        action: "delete_listing_from_report",
        entity_type: "listing",
        entity_id: listingPreview.id,
        old_value: { status: listingPreview.status },
        new_value: { status: "deleted" },
        reason: deleteReason,
      });

      // Auto-resolve the report
      const reportUpdates = {
        status: "resolved",
        resolution: `Anúncio removido. Motivo: ${deleteReason}`,
        resolved_at: new Date().toISOString(),
        assigned_to: user.id,
      };

      await (supabase.from("reports" as any) as any)
        .update(reportUpdates)
        .eq("id", selectedReport.id);

      await logAction({
        action: "resolve_report_with_deletion",
        entity_type: "report",
        entity_id: selectedReport.id,
        old_value: { status: selectedReport.status },
        new_value: reportUpdates,
      });

      toast({
        title: "Anúncio removido",
        description: "O anúncio foi marcado como removido e o utilizador foi notificado.",
      });

      setDeleteDialogOpen(false);
      setDeleteReason("");
      setDialogOpen(false);
      setSelectedReport(null);
      setListingPreview(null);
      fetchReports();
    } catch (error) {
      console.error("Error deleting listing:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o anúncio.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
      new: { variant: "default", label: "Novo" },
      in_analysis: { variant: "secondary", label: "Em análise" },
      resolved: { variant: "outline", label: "Resolvido" },
    };
    const { variant, label } = config[status] || { variant: "outline", label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getTypeIcon = (report: Report) => {
    if (report.reported_listing_id) {
      return <Package className="h-4 w-4" />;
    }
    if (report.reported_user_id) {
      return <User className="h-4 w-4" />;
    }
    return <MessageSquare className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports / Denúncias</h1>
        <p className="text-muted-foreground">Gerir tickets de denúncias e reportes</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="new">Novos</SelectItem>
            <SelectItem value="in_analysis">Em análise</SelectItem>
            <SelectItem value="resolved">Resolvidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  A carregar...
                </TableCell>
              </TableRow>
            ) : reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum report encontrado
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(report)}
                      <span className="capitalize">{report.report_type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{report.reason}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {report.description || "—"}
                  </TableCell>
                  <TableCell>{getStatusBadge(report.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(report.created_at).toLocaleDateString("pt-PT")}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenReport(report)}
                    >
                      Gerir
                    </Button>
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
          disabled={reports.length < pageSize}
        >
          Próxima
        </Button>
      </div>

      {/* Manage Report Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerir Report</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              {/* Report Info */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  {getTypeIcon(selectedReport)}
                  <span className="font-medium capitalize">{selectedReport.report_type}</span>
                </div>
                <p className="text-sm"><strong>Motivo:</strong> {selectedReport.reason}</p>
                {selectedReport.description && (
                  <p className="text-sm"><strong>Descrição:</strong> {selectedReport.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Reportado em {new Date(selectedReport.created_at).toLocaleString("pt-PT")}
                </p>
              </div>

              {/* Listing Preview (if it's a listing report) */}
              {listingPreview && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Anúncio Reportado</Label>
                    <div className="flex gap-4 p-4 border rounded-lg">
                      {listingPreview.images?.[0] && (
                        <img
                          src={listingPreview.images[0]}
                          alt=""
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{listingPreview.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Estado: <Badge variant="outline" className="ml-1">{listingPreview.status}</Badge>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ID: {listingPreview.id.slice(0, 8)}...
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a
                            href={`/product/${listingPreview.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Ver anúncio
                          </a>
                        </Button>
                        {listingPreview.status !== "deleted" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteDialogOpen(true)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remover
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Status Update */}
              <div className="space-y-2">
                <Label>Estado do Report</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Novo</SelectItem>
                    <SelectItem value="in_analysis">Em análise</SelectItem>
                    <SelectItem value="resolved">Resolvido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newStatus === "resolved" && (
                <div className="space-y-2">
                  <Label>Resolução</Label>
                  <Textarea
                    placeholder="Descreve como o report foi resolvido..."
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateReport}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Listing Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Remover Anúncio
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação vai marcar o anúncio como removido. O utilizador não poderá vê-lo e o report será automaticamente resolvido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Motivo da remoção *</Label>
            <Textarea
              placeholder="Explica porque o anúncio está a ser removido..."
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteListing}
              disabled={deleting || !deleteReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "A remover..." : "Remover Anúncio"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminReports;
