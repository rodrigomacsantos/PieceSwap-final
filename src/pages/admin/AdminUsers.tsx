import { useState, useEffect } from "react";
import { Search, MoreHorizontal, UserX, UserCheck, Eye, Trash2, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmActionDialog from "@/components/admin/ConfirmActionDialog";

interface User {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  swap_coins: number;
  is_suspended: boolean;
  is_verified: boolean;
  suspended_reason: string | null;
  created_at: string;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "verified" | "unverified">("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { logAction } = useAuditLog();
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, [page, search, statusFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, swap_coins, created_at, is_suspended, suspended_reason, is_verified")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (search) {
        query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`);
      }

      if (statusFilter === "active") query = query.eq("is_suspended", false);
      else if (statusFilter === "suspended") query = query.eq("is_suspended", true);
      else if (statusFilter === "verified") query = query.eq("is_verified", true);
      else if (statusFilter === "unverified") query = query.eq("is_verified", false);

      const { data, error } = await query;

      if (error) throw error;
      setUsers((data || []).map((u: any) => ({ 
        ...u, 
        is_suspended: u.is_suspended || false,
        is_verified: u.is_verified || false,
        suspended_reason: u.suspended_reason || null
      })));
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async (reason?: string) => {
    if (!selectedUser) return;

    try {
      const newStatus = !selectedUser.is_suspended;

      // Update the profile in the database
      const { error } = await supabase
        .from("profiles")
        .update({
          is_suspended: newStatus,
          suspended_at: newStatus ? new Date().toISOString() : null,
          suspended_reason: newStatus ? (reason || null) : null,
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      await logAction({
        action: newStatus ? "suspend_user" : "reactivate_user",
        entity_type: "user",
        entity_id: selectedUser.id,
        old_value: { is_suspended: selectedUser.is_suspended },
        new_value: { is_suspended: newStatus, suspended_reason: reason },
        reason,
      });

      toast({
        title: newStatus ? "Utilizador suspenso" : "Utilizador reativado",
        description: newStatus 
          ? "O utilizador foi suspenso com sucesso." 
          : "O utilizador foi reativado com sucesso.",
      });

      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o utilizador.",
        variant: "destructive",
      });
    }

    setSuspendDialogOpen(false);
    setSelectedUser(null);
  };

  const handleDeleteUser = async (reason?: string) => {
    if (!selectedUser) return;

    try {
      // Anonymize user data instead of deleting
      const { error } = await supabase
        .from("profiles")
        .update({
          username: `deleted_${selectedUser.id.slice(0, 8)}`,
          full_name: "Utilizador Removido",
          avatar_url: null,
          bio: null,
          location: null,
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      await logAction({
        action: "anonymize_user",
        entity_type: "user",
        entity_id: selectedUser.id,
        old_value: { username: selectedUser.username, full_name: selectedUser.full_name },
        new_value: { username: `deleted_${selectedUser.id.slice(0, 8)}`, full_name: "Utilizador Removido" },
        reason,
      });

      toast({
        title: "Utilizador anonimizado",
        description: "Os dados do utilizador foram anonimizados.",
      });

      fetchUsers();
    } catch (error) {
      console.error("Error anonymizing user:", error);
      toast({
        title: "Erro",
        description: "Não foi possível anonimizar o utilizador.",
        variant: "destructive",
      });
    }

    setDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestão de Utilizadores</h1>
        <p className="text-muted-foreground">Gerir e moderar utilizadores da plataforma</p>
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou username..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(0); }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="suspended">Suspensos</SelectItem>
            <SelectItem value="verified">Verificados</SelectItem>
            <SelectItem value="unverified">Não verificados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilizador</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>SwapCoins</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Registado em</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  A carregar...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum utilizador encontrado
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {user.full_name?.charAt(0) || user.username?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                       <span className="font-medium flex items-center gap-1">
                         {user.full_name || "Sem nome"}
                         {user.is_verified && <BadgeCheck className="w-4 h-4 text-accent" />}
                       </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    @{user.username || "—"}
                  </TableCell>
                  <TableCell>{user.swap_coins}</TableCell>
                  <TableCell>
                    <Badge variant={user.is_suspended ? "destructive" : "outline"}>
                      {user.is_suspended ? "Suspenso" : "Ativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString("pt-PT")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalhes
                        </DropdownMenuItem>
                         <DropdownMenuSeparator />
                         <DropdownMenuItem
                           onClick={async () => {
                             const newVerified = !user.is_verified;
                             await supabase.from("profiles").update({ is_verified: newVerified }).eq("id", user.id);
                             await logAction({
                               action: newVerified ? "verify_user" : "unverify_user",
                               entity_type: "user",
                               entity_id: user.id,
                               old_value: { is_verified: user.is_verified },
                               new_value: { is_verified: newVerified },
                             });
                             toast({ title: newVerified ? "Utilizador verificado" : "Verificação removida" });
                             fetchUsers();
                           }}
                         >
                           <BadgeCheck className="h-4 w-4 mr-2" />
                           {user.is_verified ? "Remover verificação" : "Verificar utilizador"}
                         </DropdownMenuItem>
                         <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setSuspendDialogOpen(true);
                          }}
                        >
                          {user.is_suspended ? (
                            <>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Reativar conta
                            </>
                          ) : (
                            <>
                              <UserX className="h-4 w-4 mr-2" />
                              Suspender conta
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Anonimizar dados
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
          disabled={users.length < pageSize}
        >
          Próxima
        </Button>
      </div>

      {/* View User Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Utilizador</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback className="text-xl">
                    {selectedUser.full_name?.charAt(0) || selectedUser.username?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{selectedUser.full_name || "Sem nome"}</h3>
                  <p className="text-muted-foreground">@{selectedUser.username || "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">SwapCoins</p>
                  <p className="font-medium">{selectedUser.swap_coins}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge variant={selectedUser.is_suspended ? "destructive" : "outline"}>
                    {selectedUser.is_suspended ? "Suspenso" : "Ativo"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-mono text-xs">{selectedUser.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Registado em</p>
                  <p className="font-medium">
                    {new Date(selectedUser.created_at).toLocaleDateString("pt-PT")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Suspend User Dialog */}
      <ConfirmActionDialog
        open={suspendDialogOpen}
        onOpenChange={setSuspendDialogOpen}
        title={selectedUser?.is_suspended ? "Reativar Utilizador" : "Suspender Utilizador"}
        description={
          selectedUser?.is_suspended
            ? `Tens a certeza que queres reativar a conta de ${selectedUser?.full_name || selectedUser?.username}?`
            : `Tens a certeza que queres suspender a conta de ${selectedUser?.full_name || selectedUser?.username}? O utilizador não poderá fazer login.`
        }
        actionLabel={selectedUser?.is_suspended ? "Reativar" : "Suspender"}
        variant={selectedUser?.is_suspended ? "default" : "destructive"}
        requireReason={!selectedUser?.is_suspended}
        onConfirm={handleSuspendUser}
      />

      {/* Delete User Dialog */}
      <ConfirmActionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Anonimizar Utilizador"
        description={`Esta ação vai anonimizar todos os dados pessoais de ${selectedUser?.full_name || selectedUser?.username}. Esta ação não pode ser revertida.`}
        actionLabel="Anonimizar"
        variant="destructive"
        requireReason
        onConfirm={handleDeleteUser}
      />
    </div>
  );
};

export default AdminUsers;
