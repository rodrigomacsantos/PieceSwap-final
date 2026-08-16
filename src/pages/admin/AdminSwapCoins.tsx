import { useState, useEffect } from "react";
import { Search, Plus, Edit, Coins, Trash2, Eye, EyeOff } from "lucide-react";
import AdminAIAssistant from "@/components/admin/AdminAIAssistant";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import ConfirmActionDialog from "@/components/admin/ConfirmActionDialog";

interface SwapCoinsPackage {
  id: string;
  name: string;
  coins: number;
  bonus_coins: number;
  price_eur: number;
  is_active: boolean;
}

const AdminSwapCoins = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [packages, setPackages] = useState<SwapCoinsPackage[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [confirmAdjustOpen, setConfirmAdjustOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState(0);

  // Package editing state
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SwapCoinsPackage | null>(null);
  const [packageForm, setPackageForm] = useState({ name: "", coins: 0, bonus_coins: 0, price_eur: 0 });
  const [savingPackage, setSavingPackage] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<SwapCoinsPackage | null>(null);

  const { logAction } = useAuditLog();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase.from("profiles").select("id, username, full_name, swap_coins").order("swap_coins", { ascending: false }).limit(50);
      if (search) query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`);
      const { data: usersData } = await query;
      setUsers(usersData || []);

      const { data: packagesData } = await supabase.from("swapcoins_packages").select("*").order("coins", { ascending: true });
      setPackages((packagesData as SwapCoinsPackage[]) || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async (reason?: string) => {
    if (!selectedUser || !reason) return;
    try {
      const newBalance = selectedUser.swap_coins + adjustAmount;
      if (newBalance < 0) {
        toast({ title: "Erro", description: "O saldo não pode ficar negativo.", variant: "destructive" });
        return;
      }

      await supabase.from("profiles").update({ swap_coins: newBalance }).eq("id", selectedUser.id);
      await logAction({
        action: "adjust_swapcoins",
        entity_type: "user",
        entity_id: selectedUser.id,
        old_value: { swap_coins: selectedUser.swap_coins },
        new_value: { swap_coins: newBalance },
        reason,
      });

      toast({ title: "Saldo ajustado", description: `Novo saldo: ${newBalance} SwapCoins` });
      setConfirmAdjustOpen(false);
      setAdjustDialogOpen(false);
      setSelectedUser(null);
      setAdjustAmount(0);
      fetchData();
      fetchData();
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível ajustar o saldo.", variant: "destructive" });
    }
  };

  const openCreatePackage = () => {
    setEditingPackage(null);
    setPackageForm({ name: "", coins: 0, bonus_coins: 0, price_eur: 0 });
    setPackageDialogOpen(true);
  };

  const openEditPackage = (pkg: SwapCoinsPackage) => {
    setEditingPackage(pkg);
    setPackageForm({ name: pkg.name, coins: pkg.coins, bonus_coins: pkg.bonus_coins || 0, price_eur: pkg.price_eur });
    setPackageDialogOpen(true);
  };

  const handleSavePackage = async () => {
    if (!packageForm.name || packageForm.coins <= 0 || packageForm.price_eur <= 0) {
      toast({ title: "Erro", description: "Preenche todos os campos obrigatórios.", variant: "destructive" });
      return;
    }

    setSavingPackage(true);
    try {
      if (editingPackage) {
        const { error } = await supabase
          .from("swapcoins_packages")
          .update({
            name: packageForm.name,
            coins: packageForm.coins,
            bonus_coins: packageForm.bonus_coins,
            price_eur: packageForm.price_eur,
          })
          .eq("id", editingPackage.id);

        if (error) throw error;

        await logAction({
          action: "update_swapcoins_package",
          entity_type: "swapcoins_package",
          entity_id: editingPackage.id,
          old_value: { name: editingPackage.name, coins: editingPackage.coins, price_eur: editingPackage.price_eur },
          new_value: packageForm,
        });

        toast({ title: "Pacote atualizado", description: `"${packageForm.name}" foi guardado.` });
      } else {
        const { error } = await supabase
          .from("swapcoins_packages")
          .insert({
            name: packageForm.name,
            coins: packageForm.coins,
            bonus_coins: packageForm.bonus_coins,
            price_eur: packageForm.price_eur,
          });

        if (error) throw error;

        await logAction({
          action: "create_swapcoins_package",
          entity_type: "swapcoins_package",
          new_value: packageForm,
        });

        toast({ title: "Pacote criado", description: `"${packageForm.name}" foi adicionado.` });
      }

      setPackageDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível guardar o pacote.", variant: "destructive" });
    } finally {
      setSavingPackage(false);
    }
  };

  const handleToggleActive = async (pkg: SwapCoinsPackage) => {
    try {
      const { error } = await supabase
        .from("swapcoins_packages")
        .update({ is_active: !pkg.is_active })
        .eq("id", pkg.id);

      if (error) throw error;

      await logAction({
        action: pkg.is_active ? "deactivate_swapcoins_package" : "activate_swapcoins_package",
        entity_type: "swapcoins_package",
        entity_id: pkg.id,
      });

      toast({ title: pkg.is_active ? "Pacote desativado" : "Pacote ativado" });
      fetchData();
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível alterar o estado.", variant: "destructive" });
    }
  };

  const handleDeletePackage = async (reason?: string) => {
    if (!packageToDelete) return;
    if (!reason?.trim()) {
      toast({ title: "Motivo obrigatório", description: "Indica um motivo para eliminar o pacote.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase
        .from("swapcoins_packages")
        .delete()
        .eq("id", packageToDelete.id);

      if (error) throw error;

      await logAction({
        action: "delete_swapcoins_package",
        entity_type: "swapcoins_package",
        entity_id: packageToDelete.id,
        old_value: { name: packageToDelete.name },
        reason,
      });

      toast({ title: "Pacote eliminado", description: `"${packageToDelete.name}" foi removido.` });
      setDeleteDialogOpen(false);
      setPackageToDelete(null);
      fetchData();
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível eliminar o pacote.", variant: "destructive" });
    }
  };

  const handleAIAction = async (action: any) => {
    if (action.type === 'create_package') {
      const { error } = await supabase.from("swapcoins_packages").insert({
        name: action.data.name,
        coins: action.data.coins,
        bonus_coins: action.data.bonus_coins || 0,
        price_eur: action.data.price_eur,
      });
      if (!error) {
        await logAction({ action: "create_swapcoins_package", entity_type: "swapcoins_package", new_value: action.data });
        fetchData();
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SwapCoins</h1>
        <p className="text-muted-foreground">Gerir saldos e pacotes de SwapCoins</p>
      </div>

      <AdminAIAssistant
        context="swapcoins_packages"
        currentData={packages}
        onAction={handleAIAction}
        placeholder="Ex: Cria um pacote de 500 moedas a €4.99 com 50 bónus"
      />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Users balances */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Coins className="h-5 w-5" />Saldos de Utilizadores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="border rounded-lg max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilizador</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.full_name || user.username || "—"}</TableCell>
                      <TableCell className="font-medium">{user.swap_coins}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedUser(user); setAdjustDialogOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Packages */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pacotes de SwapCoins</CardTitle>
            <Button size="sm" onClick={openCreatePackage}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Pacote
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {packages.map((pkg) => (
                <div key={pkg.id} className={`flex items-center justify-between p-3 border rounded-lg ${!pkg.is_active ? 'opacity-50' : ''}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{pkg.name}</p>
                      <Badge variant={pkg.is_active ? "default" : "secondary"} className="text-xs">
                        {pkg.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pkg.coins} coins{pkg.bonus_coins > 0 && ` (+${pkg.bonus_coins} bónus)`} — €{Number(pkg.price_eur).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleToggleActive(pkg)} title={pkg.is_active ? "Desativar" : "Ativar"}>
                      {pkg.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEditPackage(pkg)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setPackageToDelete(pkg); setDeleteDialogOpen(true); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {packages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum pacote criado.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Adjust balance dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Saldo</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <p>Utilizador: <strong>{selectedUser.full_name || selectedUser.username}</strong></p>
              <p>Saldo atual: <strong>{selectedUser.swap_coins}</strong></p>
              <div className="space-y-2">
                <Label>Ajuste (positivo ou negativo)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="-?[0-9]*"
                  value={adjustAmount === 0 ? "" : String(adjustAmount)}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    if (v === "" || v === "-") { setAdjustAmount(0); return; }
                    if (/^-?\d+$/.test(v)) setAdjustAmount(parseInt(v, 10));
                  }}
                  placeholder="Ex: 1000 ou -500"
                />
              </div>
              <p className="text-sm text-muted-foreground">Novo saldo: {selectedUser.swap_coins + adjustAmount}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => setConfirmAdjustOpen(true)} disabled={adjustAmount === 0}>Ajustar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={confirmAdjustOpen}
        onOpenChange={setConfirmAdjustOpen}
        title="Confirmar Ajuste"
        description={`Ajustar ${adjustAmount > 0 ? '+' : ''}${adjustAmount} SwapCoins para ${selectedUser?.full_name || selectedUser?.username}.`}
        actionLabel="Confirmar"
        requireReason
        onConfirm={handleAdjust}
      />

      {/* Create/Edit package dialog */}
      <Dialog open={packageDialogOpen} onOpenChange={setPackageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPackage ? "Editar Pacote" : "Criar Pacote"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={packageForm.name} onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })} placeholder="Ex: Pacote Starter" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Coins</Label>
                <Input type="number" min="1" value={packageForm.coins} onChange={(e) => setPackageForm({ ...packageForm, coins: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Bónus</Label>
                <Input type="number" min="0" value={packageForm.bonus_coins} onChange={(e) => setPackageForm({ ...packageForm, bonus_coins: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Preço (€)</Label>
              <Input type="number" min="0.01" step="0.01" value={packageForm.price_eur} onChange={(e) => setPackageForm({ ...packageForm, price_eur: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPackageDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSavePackage} disabled={savingPackage}>
              {savingPackage ? "A guardar..." : editingPackage ? "Guardar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmActionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar Pacote"
        description={`Tens a certeza que queres eliminar o pacote "${packageToDelete?.name}"? Esta ação é irreversível.`}
        actionLabel="Eliminar"
        variant="destructive"
        requireReason
        onConfirm={handleDeletePackage}
      />
    </div>
  );
};

export default AdminSwapCoins;
