import { useState, useEffect } from "react";
import { Euro, Crown, Coins, TrendingUp, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from "@/components/admin/StatCard";

interface SubscriptionRecord {
  id: string;
  user_id: string;
  plan: string;
  price_eur: number | null;
  status: string;
  started_at: string;
  expires_at: string | null;
  username?: string;
}

interface PackagePurchase {
  id: string;
  user_id: string;
  package_name: string;
  coins: number;
  bonus_coins: number;
  price_eur: number;
  created_at: string;
  username?: string;
}

const AdminRevenue = () => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all paid subscriptions (not free)
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("*")
        .neq("plan", "free")
        .order("started_at", { ascending: false });

      // Enrich with usernames
      const enrichedSubs = await Promise.all(
        (subs || []).map(async (sub) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, full_name")
            .eq("id", sub.user_id)
            .maybeSingle();
          return {
            ...sub,
            username: profile?.username || profile?.full_name || "—",
          };
        })
      );

      setSubscriptions(enrichedSubs);
    } catch (err) {
      console.error("Error fetching revenue data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Revenue calculations
  const activeSubscriptions = subscriptions.filter((s) => s.status === "active");
  const totalSubscriptionRevenue = subscriptions.reduce((sum, s) => sum + (s.price_eur || 0), 0);
  const activeSubscriptionRevenue = activeSubscriptions.reduce((sum, s) => sum + (s.price_eur || 0), 0);

  // Monthly breakdown
  const monthlyRevenue = subscriptions.reduce((acc, sub) => {
    const month = new Date(sub.started_at).toLocaleDateString("pt-PT", { year: "numeric", month: "short" });
    acc[month] = (acc[month] || 0) + (sub.price_eur || 0);
    return acc;
  }, {} as Record<string, number>);

  const monthlyEntries = Object.entries(monthlyRevenue).slice(0, 12);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Receitas</h1>
          <p className="text-muted-foreground">Resumo financeiro da plataforma</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Receita Total"
          value={`€${totalSubscriptionRevenue.toFixed(2)}`}
          icon={Euro}
        />
        <StatCard
          title="Subscrições Ativas"
          value={activeSubscriptions.length}
          icon={Crown}
        />
        <StatCard
          title="Receita Recorrente (MRR)"
          value={`€${activeSubscriptionRevenue.toFixed(2)}`}
          icon={TrendingUp}
        />
        <StatCard
          title="Total Subscrições"
          value={subscriptions.length}
          icon={Coins}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscrições</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Monthly Revenue */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receita Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados de receita</p>
              ) : (
                <div className="space-y-3">
                  {monthlyEntries.map(([month, amount]) => (
                    <div key={month} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{month}</span>
                      <div className="flex items-center gap-3">
                        <div className="h-2 bg-primary/20 rounded-full w-48 overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{
                              width: `${Math.min((amount / Math.max(...Object.values(monthlyRevenue))) * 100, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold w-20 text-right">€{amount.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revenue by Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receita por Plano</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const planRevenue = subscriptions.reduce((acc, sub) => {
                  const plan = sub.plan;
                  if (!acc[plan]) acc[plan] = { count: 0, revenue: 0 };
                  acc[plan].count++;
                  acc[plan].revenue += sub.price_eur || 0;
                  return acc;
                }, {} as Record<string, { count: number; revenue: number }>);

                const entries = Object.entries(planRevenue);
                if (entries.length === 0) {
                  return <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>;
                }

                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plano</TableHead>
                        <TableHead className="text-center">Vendas</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map(([plan, data]) => (
                        <TableRow key={plan}>
                          <TableCell className="font-medium capitalize">{plan}</TableCell>
                          <TableCell className="text-center">{data.count}</TableCell>
                          <TableCell className="text-right font-bold">€{data.revenue.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilizador</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Expira</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">A carregar...</TableCell>
                    </TableRow>
                  ) : subscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma subscrição encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell>{sub.username}</TableCell>
                        <TableCell className="capitalize">{sub.plan}</TableCell>
                        <TableCell className="font-medium">€{(sub.price_eur || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                            {sub.status === "active" ? "Ativa" : sub.status === "cancelled" ? "Cancelada" : sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(sub.started_at).toLocaleDateString("pt-PT")}</TableCell>
                        <TableCell>
                          {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString("pt-PT") : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminRevenue;
