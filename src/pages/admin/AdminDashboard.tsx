import { useState, useEffect } from "react";
import { Users, Package, Heart, ShoppingCart, Flag, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/admin/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DashboardStats {
  totalUsers: number;
  activeListings: number;
  totalMatches: number;
  pendingReports: number;
  totalTransactions: number;
  premiumUsers: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeListings: 0,
    totalMatches: 0,
    pendingReports: 0,
    totalTransactions: 0,
    premiumUsers: 0,
  });
  const [period, setPeriod] = useState("30");
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchRecentActivity();
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(period));

      // Fetch users count
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch active listings
      const { count: listingsCount } = await supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Fetch matches
      const { count: matchesCount } = await supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .gte("created_at", daysAgo.toISOString());

      // Fetch pending reports
      const { count: reportsCount } = await (supabase
        .from("reports" as any) as any)
        .select("*", { count: "exact", head: true })
        .eq("status", "new");

      // Fetch sales commissions (transactions)
      const { count: transactionsCount } = await supabase
        .from("sales_commissions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", daysAgo.toISOString());

      // Fetch premium subscriptions
      const { count: premiumCount } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("plan", "premium")
        .eq("status", "active");

      setStats({
        totalUsers: usersCount || 0,
        activeListings: listingsCount || 0,
        totalMatches: matchesCount || 0,
        pendingReports: reportsCount || 0,
        totalTransactions: transactionsCount || 0,
        premiumUsers: premiumCount || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data: logs } = await (supabase
        .from("audit_logs" as any) as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      setRecentActivity(logs || []);
    } catch (error) {
      console.error("Error fetching activity:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da plataforma</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Utilizadores Registados"
          value={loading ? "..." : stats.totalUsers}
          icon={Users}
        />
        <StatCard
          title="Anúncios Ativos"
          value={loading ? "..." : stats.activeListings}
          icon={Package}
        />
        <StatCard
          title="Matches Criados"
          value={loading ? "..." : stats.totalMatches}
          icon={Heart}
        />
        <StatCard
          title="Transações"
          value={loading ? "..." : stats.totalTransactions}
          icon={ShoppingCart}
        />
        <StatCard
          title="Reports Pendentes"
          value={loading ? "..." : stats.pendingReports}
          icon={Flag}
          className={stats.pendingReports > 0 ? "border-destructive" : ""}
        />
        <StatCard
          title="Subscrições Premium"
          value={loading ? "..." : stats.premiumUsers}
          icon={Coins}
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Sem atividade registada
            </p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.entity_type} • {new Date(log.created_at).toLocaleString("pt-PT")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
