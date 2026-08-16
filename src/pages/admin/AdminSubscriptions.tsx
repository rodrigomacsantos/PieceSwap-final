import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";
import AdminAIAssistant from "@/components/admin/AdminAIAssistant";

interface StructuredPlan {
  name: string;
  price: number;
  daily_superlike_limit: number;
  daily_swipe_limit: number;
  can_highlight: boolean;
  priority_boost: number;
  active: boolean;
}

interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  price_eur: number | null;
  started_at: string;
  expires_at: string | null;
  user?: { username: string | null; full_name: string | null } | null;
}

const AdminSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<StructuredPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    price: 14.99,
    daily_superlike_limit: 1,
    daily_swipe_limit: 0,
    can_highlight: true,
    priority_boost: 2,
  });
  const { logAction } = useAuditLog();
  const { toast } = useToast();

  const [plans, setPlans] = useState<StructuredPlan[]>([]);

  useEffect(() => {
    fetchSubscriptions();
    fetchPlans();
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const subsWithUsers = await Promise.all(
        (data || []).map(async (sub) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, full_name")
            .eq("id", sub.user_id)
            .single();
          return { ...sub, user: profile };
        })
      );

      setSubscriptions(subsWithUsers);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data } = await supabase
        .from("site_config")
        .select("value")
        .eq("key", "subscription_plans")
        .single();

      if (data?.value && Array.isArray(data.value)) {
        setPlans(data.value as unknown as StructuredPlan[]);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  const savePlans = async (newPlans: StructuredPlan[]) => {
    try {
      const { error } = await supabase
        .from("site_config")
        .upsert({
          key: "subscription_plans",
          value: newPlans as unknown as Json,
          description: "Planos de subscrição disponíveis"
        }, { onConflict: "key" });

      if (error) throw error;
      setPlans(newPlans);
      toast({ title: "Sucesso", description: "Planos atualizados" });
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível guardar os planos", variant: "destructive" });
    }
  };

  const handleAddPlan = () => {
    setEditingPlan(null);
    setPlanForm({ name: "", price: 14.99, daily_superlike_limit: 1, daily_swipe_limit: 0, can_highlight: true, priority_boost: 2 });
    setPlanDialogOpen(true);
  };

  const handleEditPlan = (plan: StructuredPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      price: plan.price,
      daily_superlike_limit: plan.daily_superlike_limit,
      daily_swipe_limit: plan.daily_swipe_limit,
      can_highlight: plan.can_highlight,
      priority_boost: plan.priority_boost,
    });
    setPlanDialogOpen(true);
  };

  const handleSavePlan = async () => {
    if (!planForm.name.trim()) {
      toast({ title: "Erro", description: "Nome do plano obrigatório", variant: "destructive" });
      return;
    }

    const newPlan: StructuredPlan = {
      name: planForm.name.trim(),
      price: planForm.price,
      daily_superlike_limit: planForm.daily_superlike_limit,
      daily_swipe_limit: planForm.daily_swipe_limit,
      can_highlight: planForm.can_highlight,
      priority_boost: planForm.priority_boost,
      active: true,
    };

    let newPlans: StructuredPlan[];
    if (editingPlan) {
      newPlans = plans.map(p => p.name === editingPlan.name ? newPlan : p);
    } else {
      newPlans = [...plans, newPlan];
    }

    await savePlans(newPlans);
    await logAction({
      action: editingPlan ? "update_plan" : "create_plan",
      entity_type: "subscription_plan",
      entity_id: newPlan.name,
      old_value: editingPlan as unknown as Record<string, unknown> || undefined,
      new_value: newPlan as unknown as Record<string, unknown>,
    });
    setPlanDialogOpen(false);
  };

  const handleTogglePlan = async (plan: StructuredPlan) => {
    const newPlans = plans.map(p => p.name === plan.name ? { ...p, active: !p.active } : p);
    await savePlans(newPlans);
    await logAction({ action: "toggle_plan", entity_type: "subscription_plan", entity_id: plan.name });
  };

  const handleDeletePlan = async (plan: StructuredPlan) => {
    const newPlans = plans.filter(p => p.name !== plan.name);
    await savePlans(newPlans);
    await logAction({ action: "delete_plan", entity_type: "subscription_plan", entity_id: plan.name });
  };

  const handleCancelSubscription = async (sub: Subscription) => {
    const { error } = await supabase.from("subscriptions").update({ status: "cancelled" }).eq("id", sub.id);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível cancelar a subscrição", variant: "destructive" });
      return;
    }
    await logAction({
      action: "cancel_subscription",
      entity_type: "subscription",
      entity_id: sub.id,
      old_value: { status: sub.status },
      new_value: { status: "cancelled" },
    });
    toast({ title: "Sucesso", description: "Subscrição cancelada" });
    fetchSubscriptions();
  };

  // AI assistant handler
  const handleAIAction = async (action: any) => {
    if (action.type === 'create_plan' || action.type === 'update_plan') {
      const plan: StructuredPlan = {
        name: action.data.name,
        price: action.data.price,
        daily_superlike_limit: action.data.daily_superlike_limit ?? 1,
        daily_swipe_limit: action.data.daily_swipe_limit ?? 0,
        can_highlight: action.data.can_highlight ?? true,
        priority_boost: action.data.priority_boost ?? 2,
        active: true,
      };

      let newPlans: StructuredPlan[];
      if (action.type === 'update_plan') {
        const targetName = action.data.original_name || action.data.name;
        newPlans = plans.map(p => p.name === targetName ? plan : p);
      } else {
        newPlans = [...plans, plan];
      }

      await savePlans(newPlans);
      await logAction({
        action: action.type,
        entity_type: "subscription_plan",
        entity_id: plan.name,
        new_value: plan as unknown as Record<string, unknown>,
      });
    }
  };

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === "active" && s.plan !== "free").length,
    revenue: subscriptions
      .filter(s => s.status === "active" && s.plan !== "free")
      .reduce((sum, s) => sum + (s.price_eur || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscrições Premium</h1>
        <p className="text-muted-foreground">Gerir planos e subscrições</p>
      </div>

      {/* AI Assistant */}
      <AdminAIAssistant
        context="subscription_plans"
        currentData={plans}
        onAction={handleAIAction}
        placeholder="Ex: Cria um plano Premium+ a €24.99 com 5 superlikes e swipes ilimitados"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Subscrições</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats.total}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Premium Ativos</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">{stats.active}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Mensal</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">€{stats.revenue.toFixed(2)}</p></CardContent>
        </Card>
      </div>

      {/* Plans Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Planos Disponíveis</CardTitle>
          <Button onClick={handleAddPlan}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Plano
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <Card key={plan.name} className={!plan.active ? "opacity-50" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <Badge variant={plan.active ? "default" : "secondary"}>
                      {plan.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold">€{plan.price.toFixed(2)}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Swipes/dia</span>
                      <span className="font-medium">{plan.daily_swipe_limit === 0 ? "Ilimitados" : plan.daily_swipe_limit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Superlikes/dia</span>
                      <span className="font-medium">{plan.daily_superlike_limit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Destaque</span>
                      <span className="font-medium">{plan.can_highlight ? "Sim" : "Não"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Boost prioridade</span>
                      <span className="font-medium">{plan.priority_boost > 0 ? `${plan.priority_boost}x` : "Não"}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditPlan(plan)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleTogglePlan(plan)}>
                      {plan.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeletePlan(plan)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Subscrições Ativas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilizador</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">A carregar...</TableCell>
                </TableRow>
              ) : subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma subscrição encontrada</TableCell>
                </TableRow>
              ) : (
                subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>{sub.user?.username || sub.user?.full_name || sub.user_id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <Badge variant={sub.plan !== "free" ? "default" : "secondary"}>{sub.plan}</Badge>
                    </TableCell>
                    <TableCell>{sub.price_eur ? `€${sub.price_eur.toFixed(2)}` : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                        {sub.status === "active" ? "Ativo" : sub.status === "cancelled" ? "Cancelado" : sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(sub.started_at).toLocaleDateString("pt-PT")}</TableCell>
                    <TableCell>{sub.expires_at ? new Date(sub.expires_at).toLocaleDateString("pt-PT") : "-"}</TableCell>
                    <TableCell className="text-right">
                      {sub.status === "active" && (
                        <Button variant="ghost" size="sm" onClick={() => handleCancelSubscription(sub)} className="text-destructive">
                          Cancelar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Plan Dialog */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Editar Plano" : "Novo Plano"}</DialogTitle>
            <DialogDescription>Defina as capacidades do plano de subscrição.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Plano</Label>
              <Input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} placeholder="Ex: Premium, Premium+" />
            </div>
            <div>
              <Label>Preço Mensal (€)</Label>
              <Input type="number" step="0.01" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Superlikes/dia</Label>
                <Input type="number" min="0" value={planForm.daily_superlike_limit} onChange={(e) => setPlanForm({ ...planForm, daily_superlike_limit: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Swipes/dia (0=ilimitado)</Label>
                <Input type="number" min="0" value={planForm.daily_swipe_limit} onChange={(e) => setPlanForm({ ...planForm, daily_swipe_limit: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label>Destaque de anúncios</Label>
                <Switch checked={planForm.can_highlight} onCheckedChange={(v) => setPlanForm({ ...planForm, can_highlight: v })} />
              </div>
              <div>
                <Label>Boost prioridade</Label>
                <Input type="number" min="0" value={planForm.priority_boost} onChange={(e) => setPlanForm({ ...planForm, priority_boost: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSavePlan}>{editingPlan ? "Guardar" : "Criar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptions;
